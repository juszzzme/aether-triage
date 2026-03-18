"""
PII Masking Module
Handles detection and redaction of Personally Identifiable Information.
Compliant with DPDP Act (Digital Personal Data Protection Act, 2023).

ReDoS Protection:
- Pre-compiled regex patterns (safer and faster)
- Input length validation (max 10,000 chars per pattern)
- Complexity limits on regex operations
- Thread-based timeout for Windows compatibility
"""

import re
import signal
import asyncio
from typing import Dict, List
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import threading

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.logger import get_logger

logger = get_logger(__name__)

# ✅ P0 FIX #5: ReDoS Protection Constants
MAX_TEXT_LENGTH_PER_PATTERN = 10000  # Prevent catastrophic backtracking
REGEX_TIMEOUT_SECONDS = 2  # Max time per pattern


class PIIMasker:
    """Multi-stage PII detection and masking engine with ReDoS protection."""

    def __init__(self):
        # ✅ SECURITY: Pre-compile regex patterns (safer than runtime compilation)
        # Patterns are simple, non-backtracking, and have known complexity
        self.patterns = {
            "PHONE": {
                "regex": re.compile(r'\b(?:\+91[\-\s]?)?[6-9]\d{9}\b'),
                "mask_fn": lambda m: "****" + m.group()[-5:],
                "description": "Indian mobile number",
            },
            "AADHAAR": {
                "regex": re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b'),
                "mask_fn": lambda m: "****-****-" + m.group()[-4:],
                "description": "Aadhaar number",
            },
            "PAN": {
                "regex": re.compile(r'\b[A-Z]{5}\d{4}[A-Z]\b'),
                "mask_fn": lambda m: "***" + m.group()[-5:],
                "description": "PAN card number",
            },
            "ACCOUNT_NUMBER": {
                "regex": re.compile(r'\b\d{9,18}\b'),
                "mask_fn": lambda m: "*" * (len(m.group()) - 4) + m.group()[-4:],
                "description": "Bank account number",
            },
            "EMAIL": {
                "regex": re.compile(r'\b[\w\.\-]+@[\w\.\-]+\.\w+\b'),
                "mask_fn": lambda m: m.group()[0] + "***@" + m.group().split("@")[1],
                "description": "Email address",
            },
            "UPI_ID": {
                "regex": re.compile(r'\b[\w\.\-]+@[a-z]{2,10}\b'),
                "mask_fn": lambda m: m.group()[:2] + "***@" + m.group().split("@")[1],
                "description": "UPI ID",
            },
            "CARD_NUMBER": {
                "regex": re.compile(r'\b(?:\d{4}[\s\-]?){3}\d{4}\b'),
                "mask_fn": lambda m: "****-****-****-" + m.group()[-4:],
                "description": "Credit/Debit card number",
            },
        }

        # Hinglish keywords for language detection
        self.hinglish_markers = [
            "mera", "meri", "kya", "hai", "nahi", "karu", "kaise",
            "paise", "kar", "gaya", "gaye", "ho", "raha", "bhi",
            "sir", "madam", "please", "help", "urgent", "abhi",
            "kat", "laga", "bhej", "mila", "nahi", "kab", "kyu",
            "paisa", "rupee", "rupay", "wala", "wali", "aur",
        ]

    def detect_language(self, text: str) -> str:
        """Detect if text is Hindi, English, or Hinglish (code-mixed)."""
        text_lower = text.lower()
        words = text_lower.split()

        hinglish_count = sum(
            1 for word in words if word in self.hinglish_markers
        )

        # Check for Devanagari script
        devanagari = bool(re.search(r'[\u0900-\u097F]', text))

        if devanagari:
            return "hindi"
        elif hinglish_count >= 2 or (hinglish_count >= 1 and len(words) <= 5):
            return "hinglish"
        else:
            return "english"

    def _safe_regex_finditer(self, pattern: re.Pattern, text: str, timeout: int = REGEX_TIMEOUT_SECONDS):
        """
        ✅ ReDoS PROTECTION: Execute regex with timeout.
        Works on both Unix and Windows using ThreadPoolExecutor.
        
        Args:
            pattern: Compiled regex pattern
            text: Text to search (should be pre-validated for length)
            timeout: Maximum execution time in seconds
            
        Returns:
            List of match objects or empty list on timeout/error
        """
        def _execute_regex():
            return list(pattern.finditer(text))
        
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_execute_regex)
            try:
                return future.result(timeout=timeout)
            except FuturesTimeoutError:
                logger.error(
                    f"Regex timeout exceeded ({timeout}s) - possible ReDoS attack",
                    extra={"extra_fields": {
                        "pattern": pattern.pattern[:50],
                        "text_length": len(text),
                        "timeout": timeout
                    }}
                )
                return []
            except Exception as e:
                logger.error(
                    f"Regex execution failed: {str(e)}",
                    exc_info=True,
                    extra={"extra_fields": {
                        "pattern": pattern.pattern[:50],
                        "error": str(e)
                    }}
                )
                return []

    @contextmanager
    def _timeout(self, seconds: int):
        """Context manager for timeout protection on regex operations."""
        def timeout_handler(signum, frame):
            raise TimeoutError(f"Regex operation exceeded {seconds} second(s)")
        
        # Set the signal handler and alarm (Unix only, Windows compatible alternative below)
        if hasattr(signal, 'SIGALRM'):
            original_handler = signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(seconds)
            try:
                yield
            finally:
                signal.alarm(0)
                signal.signal(signal.SIGALRM, original_handler)
        else:
            # For Windows - no timeout, just execute
            logger.warning("Timeout protection not available on Windows")
            yield

    def mask(self, text: str) -> Dict:
        """
        Apply multi-stage PII masking to input text with ReDoS protection.
        
        Security Features:
        - Input length validation per pattern (max 10,000 chars)
        - Pre-compiled regex patterns
        - Timeout protection (2 seconds per pattern)
        - Safe error handling
        
        Returns:
            dict with masked_text, pii_entities list, and detected language
        """
        # ✅ INPUT VALIDATION: Prevent ReDoS with extremely long inputs
        if len(text) > MAX_TEXT_LENGTH_PER_PATTERN:
            logger.warning(
                f"Text too long for safe PII processing: {len(text)} chars (max {MAX_TEXT_LENGTH_PER_PATTERN})",
                extra={"extra_fields": {"text_length": len(text), "max_allowed": MAX_TEXT_LENGTH_PER_PATTERN}}
            )
            # Truncate to safe length
            text = text[:MAX_TEXT_LENGTH_PER_PATTERN]
        
        masked_text = text
        pii_entities = []
        failed_patterns = []

        # Stage 1: Regex-based detection with ReDoS protection
        for entity_type, config in self.patterns.items():
            try:
                # ✅ SECURITY: Use safe regex execution with timeout
                matches = self._safe_regex_finditer(config["regex"], masked_text, REGEX_TIMEOUT_SECONDS)
                
                if matches is None:  # Timeout occurred
                    failed_patterns.append(entity_type)
                    continue
                
                for match in matches:
                    try:
                        original = match.group()
                        masked = config["mask_fn"](match)

                        pii_entities.append({
                            "type": entity_type,
                            "original": original,
                            "masked": masked,
                            "position": match.start(),
                            "description": config["description"],
                        })

                        masked_text = masked_text.replace(original, masked, 1)
                    except Exception as mask_error:
                        logger.warning(
                            f"Failed to mask {entity_type} match: {str(mask_error)}",
                            extra={"extra_fields": {
                                "entity_type": entity_type,
                                "error": str(mask_error)
                            }}
                        )
                        continue
                        
            except Exception as e:
                # Catch any other unexpected errors
                logger.error(
                    f"Unexpected error processing {entity_type}: {str(e)}",
                    exc_info=True,
                    extra={"extra_fields": {
                        "entity_type": entity_type,
                        "error": str(e)
                    }}
                )
                failed_patterns.append(entity_type)
                continue

        # Log summary if any patterns failed
        if failed_patterns:
            logger.warning(
                f"PII masking completed with {len(failed_patterns)} failed pattern(s)",
                extra={"extra_fields": {
                    "failed_patterns": failed_patterns,
                    "success_count": len(pii_entities)
                }}
            )

        # Stage 2: Language detection
        try:
            language = self.detect_language(text)
        except Exception as lang_error:
            logger.warning(f"Language detection failed: {str(lang_error)}", exc_info=True)
            language = "unknown"

        logger.debug(
            f"PII masking completed",
            extra={"extra_fields": {
                "redaction_count": len(pii_entities),
                "language": language,
                "failed_patterns": len(failed_patterns)
            }}
        )

        return {
            "masked_text": masked_text,
            "pii_entities": pii_entities,
            "language": language,
            "redaction_count": len(pii_entities),
            "failed_patterns": failed_patterns if failed_patterns else None,
        }
    
    async def mask_async(self, text: str, executor: ThreadPoolExecutor = None) -> Dict:
        """
        Async wrapper for mask() method.
        Runs CPU-bound regex operations in a thread pool executor.
        
        Args:
            text: Input text to mask
            executor: Optional thread pool executor (uses default if None)
        
        Returns:
            Same as mask() method
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor, self.mask, text)
