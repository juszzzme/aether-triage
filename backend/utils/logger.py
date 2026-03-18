"""
Structured Logging Configuration for Aether Backend
Implements production-grade logging with JSON formatting, correlation IDs, and rotating file handlers.
"""

import logging
import logging.handlers
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_data["correlation_id"] = record.correlation_id
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add custom fields from extra parameter
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)


class CorrelationIDFilter(logging.Filter):
    """Filter to inject correlation ID into log records."""
    
    def __init__(self):
        super().__init__()
        self.correlation_id = None
    
    def set_correlation_id(self, correlation_id: str):
        """Set the correlation ID for the current request context."""
        self.correlation_id = correlation_id
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add correlation ID to the log record."""
        if self.correlation_id:
            record.correlation_id = self.correlation_id
        return True


# Global correlation ID filter instance
correlation_filter = CorrelationIDFilter()


def setup_logging(log_level: str = None, environment: str = "development") -> logging.Logger:
    """
    Configure structured logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        environment: Environment name (development, production)
    
    Returns:
        Configured logger instance
    """
    # Determine log level from environment or parameter
    if log_level is None:
        log_level = os.getenv("LOG_LEVEL", "INFO" if environment == "production" else "DEBUG")
    
    # Create logs directory if it doesn't exist
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    # Define log file paths
    log_file = log_dir / "aether.log"
    error_log_file = log_dir / "error.log"
    
    # Logging configuration dictionary
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": JSONFormatter,
            },
            "console": {
                "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "filters": {
            "correlation": {
                "()": lambda: correlation_filter,
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "console" if environment == "development" else "json",
                "stream": "ext://sys.stdout",
                "filters": ["correlation"],
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "json",
                "filename": str(log_file),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8",
                "filters": ["correlation"],
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "json",
                "filename": str(error_log_file),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8",
                "filters": ["correlation"],
            },
        },
        "loggers": {
            "aether": {
                "level": log_level,
                "handlers": ["console", "file", "error_file"],
                "propagate": False,
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
        },
        "root": {
            "level": log_level,
            "handlers": ["console", "file"],
        },
    }
    
    # Apply configuration
    from logging.config import dictConfig
    dictConfig(logging_config)
    
    # Return the main application logger
    logger = logging.getLogger("aether")
    logger.info(
        f"Logging initialized",
        extra={"extra_fields": {
            "environment": environment,
            "log_level": log_level,
            "log_dir": str(log_dir)
        }}
    )
    
    return logger


def get_logger(name: str = "aether") -> logging.Logger:
    """
    Get a logger instance for a specific module.
    
    Args:
        name: Logger name (typically __name__ of the module)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(f"aether.{name}")


def set_correlation_id(correlation_id: str):
    """
    Set correlation ID for the current request context.
    
    Args:
        correlation_id: Unique identifier for the request
    """
    correlation_filter.set_correlation_id(correlation_id)


def clear_correlation_id():
    """Clear the correlation ID from the current context."""
    correlation_filter.set_correlation_id(None)
