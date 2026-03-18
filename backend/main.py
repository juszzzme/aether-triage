"""
Aether Backend - AI-Powered Banking Operations Intelligence
Main FastAPI application entry point.
"""

import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, status, Security, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ValidationError
from typing import Optional
import json
import traceback

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize logging FIRST before importing modules
from utils.logger import setup_logging, get_logger

# Setup logging with environment detection
environment = os.getenv("ENVIRONMENT", "development")
logger = setup_logging(environment=environment)

# Import cache
from utils.cache import get_cache

# Import middleware
from middleware.request_logger import RequestLoggingMiddleware

# Import modules
from modules.pii_masker import PIIMasker
from modules.vertical_classifier import VerticalClassifier
from modules.intent_detector import IntentDetector
from modules.resolution_engine import ResolutionEngine

# ─── Security Configuration ───────────────────────────────────
# API Key Authentication
API_KEY = os.getenv("AETHER_API_KEY", "aether-secret-key-123")  # Change in production!
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)

# Input Validation Constants
MAX_TEXT_LENGTH = 5000  # Prevent ReDoS attacks

async def get_api_key(api_key: str = Security(api_key_header)):
    """Validate API key from request header."""
    if api_key is None:
        logger.warning("Missing API key in request")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing API key. Include 'X-API-Key' header."
        )
    if api_key != API_KEY:
        logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return api_key

# ─── App Init ────────────────────────────────────────────────
app = FastAPI(
    title="Aether - AI Banking Operations Intelligence",
    description="Backend API for the Aether AIOps platform",
    version="1.0.0",
)

# Add rate limiting state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add GZip compression middleware (responses > 1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add request logging middleware (must be first for proper logging)
app.add_middleware(RequestLoggingMiddleware)

# Add CORS middleware (STRICT - only localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Strict origin control
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Only needed methods
    allow_headers=["Content-Type", "X-API-Key", "X-Client-ID"],
)

# ─── Exception Handlers ──────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors (422)."""
    logger.error(
        f"Validation error on {request.method} {request.url.path}",
        extra={"extra_fields": {
            "errors": exc.errors(),
            "body": str(exc.body)
        }}
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid request data",
            "details": exc.errors(),
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors."""
    logger.error(
        f"Pydantic validation error on {request.method} {request.url.path}",
        extra={"extra_fields": {"errors": exc.errors()}}
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid request data",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions (500)."""
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
        extra={"extra_fields": {
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)
        }}
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            # Never expose internal error details to clients in production
            "reference": "Check server logs for details",
        },
    )


# ─── Module Instances ────────────────────────────────────────
try:
    logger.info("Initializing AI modules...")
    pii_masker = PIIMasker()
    vertical_classifier = VerticalClassifier()
    intent_detector = IntentDetector()
    resolution_engine = ResolutionEngine()
    logger.info(
        "All modules initialized successfully",
        extra={"extra_fields": {
            "modules": ["pii_masker", "vertical_classifier", "intent_detector", "resolution_engine"]
        }}
    )
except Exception as init_error:
    logger.critical(f"Failed to initialize modules: {str(init_error)}", exc_info=True)
    raise

# ─── Thread Pool Executor ─────────────────────────────────────
try:
    # Initialize thread pool for CPU-bound operations
    max_workers = int(os.getenv("MAX_WORKERS", "10"))
    executor = ThreadPoolExecutor(max_workers=max_workers)
    logger.info(
        f"Thread pool executor initialized",
        extra={"extra_fields": {"max_workers": max_workers}}
    )
except Exception as executor_error:
    logger.error(f"Failed to initialize executor: {str(executor_error)}", exc_info=True)
    executor = None

# ─── Response Cache ────────────────────────────────────────────
try:
    # Initialize response cache
    cache_size = int(os.getenv("CACHE_SIZE", "1000"))
    cache_ttl = int(os.getenv("CACHE_TTL_HOURS", "24"))
    cache = get_cache(max_size=cache_size, ttl_hours=cache_ttl)
    logger.info(
        f"Response cache initialized",
        extra={"extra_fields": {
            "max_size": cache_size,
            "ttl_hours": cache_ttl
        }}
    )
except Exception as cache_error:
    logger.error(f"Failed to initialize cache: {str(cache_error)}", exc_info=True)
    cache = None


# ─── Request / Response Models ──────────────────────────────
class TicketRequest(BaseModel):
    text: str
    language: Optional[str] = "auto"


class TicketResponse(BaseModel):
    original_text: str
    masked_text: str
    pii_entities: list
    detected_language: str
    vertical: str
    vertical_confidence: float
    intent: str
    intent_confidence: float
    alternative_intents: list
    risk_level: str
    urgency: str
    extracted_entities: dict
    suggested_actions: list
    draft_response: str


# ─── Lifecycle Events ────────────────────────────────────────
@app.on_event("shutdown")
async def shutdown_event():
    """Graceful shutdown handler - cleanup resources."""
    logger.info("Application shutdown initiated...")
    
    # ✅ P0 FIX #3: Graceful thread pool shutdown
    if executor:
        logger.info(f"Shutting down thread pool executor (max_workers={executor._max_workers})")
        executor.shutdown(wait=True, cancel_futures=False)
        logger.info("Thread pool executor shutdown complete")
    
    # Clear cache on shutdown
    if cache:
        cleared = cache.clear()
        logger.info(f"Cache cleared: {cleared} entries")
    
    logger.info("Application shutdown complete")


# ─── Routes ──────────────────────────────────────────────────
@app.get("/")
async def root():
    """Root endpoint with system status."""
    logger.info("Root endpoint accessed")
    
    cache_stats = cache.get_stats() if cache else {"status": "disabled"}
    
    return {
        "name": "Aether API",
        "version": "1.0.0",
        "status": "operational",
        "environment": environment,
        "modules": {
            "pii_masker": "active",
            "vertical_classifier": "active",
            "intent_detector": "active",
            "resolution_engine": "active",
        },
        "cache": {
            "enabled": cache is not None,
            "hit_rate_pct": cache_stats.get("hit_rate_pct", 0) if cache else 0,
        },
        "async_execution": {
            "enabled": executor is not None,
            "max_workers": executor._max_workers if executor else 0,
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "environment": environment}


@app.get("/api/cache/stats")
async def cache_stats():
    """Get cache statistics for monitoring."""
    if cache is None:
        return {
            "enabled": False,
            "message": "Cache is not initialized"
        }
    
    stats = cache.get_stats()
    logger.info(
        "Cache stats retrieved",
        extra={"extra_fields": stats}
    )
    
    return {
        "enabled": True,
        **stats
    }


@app.post("/api/cache/clear")
async def clear_cache():
    """Clear the entire cache (admin endpoint)."""
    if cache is None:
        return {
            "success": False,
            "message": "Cache is not initialized"
        }
    
    cleared_count = cache.clear()
    logger.warning(
        f"Cache manually cleared",
        extra={"extra_fields": {"cleared_count": cleared_count}}
    )
    
    return {
        "success": True,
        "message": f"Cleared {cleared_count} cached entries"
    }


@app.post("/api/analyze", response_model=TicketResponse)
@limiter.limit("10/minute")  # Rate limit: 10 requests per minute per IP
async def analyze_ticket(
    request: Request, 
    ticket: TicketRequest,
    api_key: str = Depends(get_api_key)
):
    """
    Main analysis endpoint with async execution and response caching.
    
    Security:
    - API key authentication required (X-API-Key header)
    - Rate limited to 10 requests/minute per IP
    - Input validation (max 5000 chars)
    - GZip compression enabled
    
    Processes a customer complaint through the full AI pipeline:
    1. Check cache for existing analysis
    2. PII Masking (async)
    3. Language Detection
    4. Vertical Classification (async)
    5. Intent Detection (async)
    6. Entity Extraction (async)
    7. Resolution Recommendation (async)
    8. Cache the response
    
    Performance optimizations:
    - All CPU-bound operations run in thread pool (non-blocking)
    - Identical tickets return cached results (24hr TTL)
    - Cache key based on masked text (no PII in cache keys)
    """
    try:
        text = ticket.text
        
        # Log incoming request
        logger.info(
            "Processing ticket analysis request",
            extra={"extra_fields": {
                "text_length": len(text),
                "language": ticket.language
            }}
        )
        
        # Input validation - prevent ReDoS and resource exhaustion
        if not text or not text.strip():
            logger.warning("Empty text received in analyze request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        if len(text) > MAX_TEXT_LENGTH:
            logger.warning(f"Text too long: {len(text)} chars (max {MAX_TEXT_LENGTH})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Text too long. Maximum {MAX_TEXT_LENGTH} characters allowed."
            )

        # Step 1: PII Masking (always compute, needed for cache key)
        logger.debug("Step 1: Starting PII masking (async)")
        try:
            if executor:
                masking_result = await pii_masker.mask_async(text, executor)
            else:
                masking_result = pii_masker.mask(text)
            
            logger.info(
                f"PII masking completed: {masking_result['redaction_count']} entities found",
                extra={"extra_fields": {
                    "redaction_count": masking_result['redaction_count'],
                    "language": masking_result.get('language', 'unknown')
                }}
            )
        except Exception as masking_error:
            logger.error(f"PII masking failed: {str(masking_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PII masking failed"
            )

        # Check cache AFTER masking (cache key uses masked text)
        cache_key = None
        if cache:
            try:
                cache_key = cache.get_cache_key({
                    "masked_text": masking_result["masked_text"],
                    "language": ticket.language
                })
                
                cached_response = cache.get(cache_key)
                if cached_response:
                    logger.info(
                        "Cache hit - returning cached response",
                        extra={"extra_fields": {
                            "cache_key": cache_key[:16] + "...",
                            "hit_rate": cache.get_hit_rate()
                        }}
                    )
                    
                    # Return cached response with fresh PII entities and original text
                    cached_response["original_text"] = text
                    cached_response["pii_entities"] = masking_result["pii_entities"]
                    cached_response["masked_text"] = masking_result["masked_text"]
                    cached_response["detected_language"] = masking_result.get("language", "hinglish")
                    
                    return TicketResponse(**cached_response)
            except Exception as cache_error:
                logger.warning(f"Cache lookup failed: {str(cache_error)}", exc_info=True)

        # Cache miss - proceed with full pipeline
        logger.debug("Cache miss - executing full pipeline")

        # Step 2: Vertical Classification (async)
        logger.debug("Step 2: Starting vertical classification (async)")
        try:
            if executor:
                vertical_result = await vertical_classifier.classify_async(
                    masking_result["masked_text"],
                    executor
                )
            else:
                vertical_result = vertical_classifier.classify(masking_result["masked_text"])
            
            logger.info(
                f"Vertical classified: {vertical_result['vertical']}",
                extra={"extra_fields": {
                    "vertical": vertical_result['vertical'],
                    "confidence": vertical_result['confidence'],
                    "subcategory": vertical_result.get('subcategory')
                }}
            )
        except Exception as classification_error:
            logger.error(f"Vertical classification failed: {str(classification_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Vertical classification failed"
            )

        # Step 3: Intent Detection (async)
        logger.debug("Step 3: Starting intent detection (async)")
        try:
            if executor:
                intent_result = await intent_detector.detect_async(
                    masking_result["masked_text"],
                    vertical=vertical_result["vertical"],
                    executor=executor
                )
            else:
                intent_result = intent_detector.detect(
                    masking_result["masked_text"],
                    vertical=vertical_result["vertical"],
                )
            
            logger.info(
                f"Intent detected: {intent_result['intent']}",
                extra={"extra_fields": {
                    "intent": intent_result['intent'],
                    "confidence": intent_result['confidence'],
                    "risk_level": intent_result['risk_level'],
                    "urgency": intent_result['urgency']
                }}
            )
        except Exception as intent_error:
            logger.error(f"Intent detection failed: {str(intent_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Intent detection failed"
            )

        # Step 4: Entity Extraction (async, context-aware based on vertical)
        logger.debug("Step 4: Starting entity extraction (async)")
        try:
            if executor:
                entities = await intent_detector.extract_entities_async(
                    text,
                    vertical_result["vertical"],
                    executor=executor
                )
            else:
                entities = intent_detector.extract_entities(
                    text,
                    vertical_result["vertical"]
                )
            
            logger.info(
                f"Entity extraction completed: {len(entities)} entities found",
                extra={"extra_fields": {"entity_count": len(entities)}}
            )
        except Exception as entity_error:
            logger.error(f"Entity extraction failed: {str(entity_error)}", exc_info=True)
            # Continue with empty entities rather than failing
            entities = {}

        # Step 5: Resolution Recommendation (async)
        logger.debug("Step 5: Starting resolution recommendation (async)")
        try:
            if executor:
                resolution = await resolution_engine.resolve_async(
                    vertical=vertical_result["vertical"],
                    intent=intent_result["intent"],
                    risk_level=intent_result["risk_level"],
                    entities=entities,
                    executor=executor
                )
            else:
                resolution = resolution_engine.resolve(
                    vertical=vertical_result["vertical"],
                    intent=intent_result["intent"],
                    risk_level=intent_result["risk_level"],
                    entities=entities,
                )
            
            logger.info(
                f"Resolution generated: auto_resolve={resolution['auto_resolve']}",
                extra={"extra_fields": {
                    "auto_resolve": resolution['auto_resolve'],
                    "action_count": len(resolution['actions']),
                    "reference_id": resolution['reference_id']
                }}
            )
        except Exception as resolution_error:
            logger.error(f"Resolution generation failed: {str(resolution_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Resolution generation failed"
            )

        # Build response
        response_data = {
            "original_text": text,
            "masked_text": masking_result["masked_text"],
            "pii_entities": masking_result["pii_entities"],
            "detected_language": masking_result.get("language", "hinglish"),
            "vertical": vertical_result["vertical"],
            "vertical_confidence": vertical_result["confidence"],
            "intent": intent_result["intent"],
            "intent_confidence": intent_result["confidence"],
            "alternative_intents": intent_result.get("alternatives", []),
            "risk_level": intent_result["risk_level"],
            "urgency": intent_result["urgency"],
            "extracted_entities": entities,
            "suggested_actions": resolution["actions"],
            "draft_response": resolution["draft_response"],
        }
        
        # Cache the response (exclude PII entities and original text from cache)
        if cache and cache_key:
            try:
                cacheable_data = {k: v for k, v in response_data.items() 
                                if k not in ["original_text", "pii_entities"]}
                cache.set(cache_key, cacheable_data)
                logger.debug(
                    "Response cached successfully",
                    extra={"extra_fields": {
                        "cache_key": cache_key[:16] + "...",
                        "cache_size": len(cache)
                    }}
                )
            except Exception as cache_error:
                logger.warning(f"Failed to cache response: {str(cache_error)}", exc_info=True)
        
        response = TicketResponse(**response_data)
        
        logger.info(
            "Ticket analysis completed successfully",
            extra={"extra_fields": {
                "vertical": vertical_result["vertical"],
                "intent": intent_result["intent"],
                "risk_level": intent_result["risk_level"],
                "cached": False
            }}
        )
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (already logged)
        raise
    except Exception as e:
        # Catch any unexpected errors
        logger.error(
            f"Unexpected error in analyze_ticket: {str(e)}",
            exc_info=True,
            extra={"extra_fields": {
                "exception_type": type(e).__name__,
                "exception_message": str(e),
                "traceback": traceback.format_exc()
            }}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during ticket analysis"
        )


@app.post("/api/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    context: str = Form(default=""),
):
    """
    Analyze an uploaded screenshot/image.
    Extracts text via OCR and processes through the pipeline.
    """
    try:
        logger.info(
            f"Image upload received: {file.filename}",
            extra={"extra_fields": {"filename": file.filename, "content_type": file.content_type}}
        )
        
        contents = await file.read()
        
        logger.info(
            f"Image processed: {len(contents)} bytes",
            extra={"extra_fields": {"size_bytes": len(contents)}}
        )

        return {
            "status": "image_received",
            "filename": file.filename,
            "size_bytes": len(contents),
            "message": "OCR processing will be implemented with EasyOCR module",
        }
    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image upload failed"
        )
