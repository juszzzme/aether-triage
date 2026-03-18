"""
Request Logging Middleware for FastAPI
Logs all incoming requests with correlation IDs, processing time, and response status.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from utils.logger import get_logger, set_correlation_id, clear_correlation_id


logger = get_logger("middleware.request_logger")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses.
    
    Features:
    - Generates unique correlation ID per request
    - Logs request method, path, client IP
    - Logs response status code and processing time
    - Adds correlation ID to response headers
    - Handles exceptions and logs stack traces
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process each request and log details.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware or route handler
        
        Returns:
            HTTP response with correlation ID header
        """
        # Generate unique correlation ID for this request
        correlation_id = str(uuid.uuid4())
        set_correlation_id(correlation_id)
        
        # Extract request details
        method = request.method
        path = request.url.path
        query_params = str(request.query_params) if request.query_params else None
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log incoming request
        logger.info(
            f"Incoming request: {method} {path}",
            extra={"extra_fields": {
                "method": method,
                "path": path,
                "query_params": query_params,
                "client_ip": client_ip,
                "user_agent": user_agent,
                "correlation_id": correlation_id,
            }}
        )
        
        # Record start time
        start_time = time.time()
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate processing time
            process_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
            
            # Log response
            logger.info(
                f"Request completed: {method} {path} - {response.status_code}",
                extra={"extra_fields": {
                    "method": method,
                    "path": path,
                    "status_code": response.status_code,
                    "process_time_ms": round(process_time, 2),
                    "correlation_id": correlation_id,
                }}
            )
            
            return response
        
        except Exception as e:
            # Calculate processing time even for errors
            process_time = (time.time() - start_time) * 1000
            
            # Log the exception with full stack trace
            logger.error(
                f"Request failed: {method} {path} - {type(e).__name__}: {str(e)}",
                exc_info=True,
                extra={"extra_fields": {
                    "method": method,
                    "path": path,
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "process_time_ms": round(process_time, 2),
                    "correlation_id": correlation_id,
                }}
            )
            
            # Re-raise the exception to be handled by FastAPI exception handlers
            raise
        
        finally:
            # Clear correlation ID from context
            clear_correlation_id()
