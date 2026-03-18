# Aether Backend - Logging & Error Handling Guide

## Overview

The Aether backend implements production-grade structured logging using Python's `logging` module with JSON formatting, correlation IDs, and comprehensive error handling.

## Features

### 1. **Structured Logging**
- **JSON Format**: All logs are structured in JSON for easy parsing and aggregation
- **Multiple Handlers**: Console output (development) and rotating file handlers (production)
- **Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Rotating Files**: 10MB max size, 5 backup files

### 2. **Correlation ID Tracking**
- Every request gets a unique UUID correlation ID
- IDs are propagated through all log messages
- Included in response headers as `X-Correlation-ID`
- Enables tracing requests across the entire pipeline

### 3. **Request/Response Logging**
- Automatic logging of all HTTP requests
- Captures: method, path, client IP, user agent
- Logs response status code and processing time
- Adds `X-Process-Time` header to responses

### 4. **Error Handling**
- All modules wrapped in try-except blocks
- Graceful degradation (partial results instead of crashes)
- Detailed error logging with stack traces
- Safe error messages (never expose internals to clients)

## File Structure

```
backend/
├── utils/
│   ├── __init__.py
│   └── logger.py              # Logging configuration & utilities
├── middleware/
│   ├── __init__.py
│   └── request_logger.py      # FastAPI request logging middleware
├── logs/
│   ├── .gitkeep
│   ├── aether.log             # All logs (rotated)
│   ├── error.log              # ERROR and above only
│   ├── aether.log.1           # Backup files
│   └── ...
└── main.py                    # Integrated logging and exception handlers
```

## Configuration

### Environment Variables

- `LOG_LEVEL`: Set logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Default: `DEBUG` (development), `INFO` (production)
- `ENVIRONMENT`: Set environment (development, production)
  - Default: `development`

### Example
```bash
# Development (verbose logging to console)
ENVIRONMENT=development LOG_LEVEL=DEBUG python main.py

# Production (JSON logs to file)
ENVIRONMENT=production LOG_LEVEL=INFO python main.py
```

## Log Output Formats

### Development (Console)
```
2026-02-17 10:30:45 | INFO     | aether.main | Processing ticket analysis request
```

### Production (JSON)
```json
{
  "timestamp": "2026-02-17T10:30:45.123Z",
  "level": "INFO",
  "logger": "aether.main",
  "message": "Processing ticket analysis request",
  "module": "main",
  "function": "analyze_ticket",
  "line": 142,
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "text_length": 127,
  "language": "auto"
}
```

## Usage in Code

### Getting a Logger
```python
from utils.logger import get_logger

logger = get_logger(__name__)
```

### Logging Messages
```python
# Simple message
logger.info("Starting PII masking")

# With extra context
logger.info(
    "PII masking completed",
    extra={"extra_fields": {
        "redaction_count": 5,
        "language": "hinglish"
    }}
)

# Error with stack trace
try:
    risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {str(e)}", exc_info=True)
```

### Error Handling Pattern
```python
try:
    result = process_data(input_data)
    logger.info("Processing completed successfully")
    return result
except ValueError as e:
    logger.error(f"Invalid data: {str(e)}", exc_info=True)
    # Return safe fallback
    return default_result
except Exception as e:
    logger.critical(f"Unexpected error: {str(e)}", exc_info=True)
    raise HTTPException(status_code=500, detail="Processing failed")
```

## Module-Specific Error Handling

### PII Masker (`pii_masker.py`)
- **Handles**: `re.error` (malformed regex), `TimeoutError` (expensive patterns)
- **Behavior**: Continues processing other patterns, returns partial results
- **Logs**: Failed patterns with details

### Vertical Classifier (`vertical_classifier.py`)
- **Handles**: Empty input, zero-division in confidence calculation
- **Behavior**: Returns "GENERAL" vertical with 0.0 confidence
- **Logs**: Classification failures with fallback reason

### Intent Detector (`intent_detector.py`)
- **Handles**: Empty input, regex failures, amount parsing errors
- **Behavior**: Returns "General_Help" intent with low confidence
- **Logs**: Entity extraction failures per field

### Resolution Engine (`resolution_engine.py`)
- **Handles**: Missing templates, placeholder substitution errors
- **Behavior**: Uses generic fallback template
- **Logs**: Template lookup failures with fallback decision

## Exception Handlers

### 1. Validation Error (422)
Triggered by invalid request payloads (missing fields, wrong types)

### 2. HTTP Exception (400, 404, etc.)
Application-raised exceptions with specific status codes

### 3. Generic Exception (500)
Catches all unhandled errors, logs stack trace, returns safe message

## Monitoring & Debugging

### View Logs
```bash
# Tail all logs
tail -f backend/logs/aether.log

# Tail errors only
tail -f backend/logs/error.log

# Search by correlation ID
grep "a1b2c3d4-e5f6-7890" backend/logs/aether.log
```

### Parse JSON Logs
```bash
# Pretty-print JSON logs
cat backend/logs/aether.log | jq

# Filter by level
cat backend/logs/aether.log | jq 'select(.level == "ERROR")'

# Filter by module
cat backend/logs/aether.log | jq 'select(.logger == "aether.modules.pii_masker")'
```

### Log Aggregation
For production, integrate with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **CloudWatch** (AWS)

## Best Practices

1. **Always use structured logging with extra fields**
   ```python
   logger.info("Action completed", extra={"extra_fields": {"key": "value"}})
   ```

2. **Never log sensitive data**
   - No PII, passwords, API keys, tokens
   - Redact before logging if necessary

3. **Use appropriate log levels**
   - `DEBUG`: Detailed diagnostic information
   - `INFO`: General informational messages
   - `WARNING`: Something unexpected but handled
   - `ERROR`: Error that needs attention
   - `CRITICAL`: System-critical failure

4. **Include context in error logs**
   ```python
   logger.error("Processing failed", exc_info=True, extra={"extra_fields": {"input_id": id}})
   ```

5. **Set correlation ID for request context**
   - Automatically handled by middleware
   - Available in all logs during request processing

## Testing

### Test Logging Configuration
```python
from utils.logger import setup_logging, get_logger

# Initialize
setup_logging(environment="development")
logger = get_logger("test")

# Test levels
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical message")
```

### Test Correlation IDs
```bash
# Make a request and capture correlation ID
curl -v http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Test ticket"}'

# Look for X-Correlation-ID in response headers
# Search logs using that ID
```

## Performance

- **Minimal Overhead**: Logging adds <5ms per request
- **Async-Safe**: Works with FastAPI's async handlers
- **Thread-Safe**: Safe for multi-threaded deployments
- **Rotation**: Automatic log rotation prevents disk fill

## Troubleshooting

### Issue: Logs not appearing
- Check `LOG_LEVEL` environment variable
- Verify `backend/logs/` directory exists and is writable
- Check console for initialization errors

### Issue: Correlation IDs missing
- Ensure `RequestLoggingMiddleware` is registered before other middleware
- Check `X-Correlation-ID` in response headers

### Issue: Large log files
- Logs rotate automatically at 10MB
- Keep 5 backups by default
- Adjust in `utils/logger.py` if needed

### Issue: Performance degradation
- Reduce log level (INFO instead of DEBUG)
- Disable console handler in production
- Use log aggregation systems for analysis

## Future Enhancements

1. **Metrics Integration**: Add Prometheus metrics
2. **Distributed Tracing**: OpenTelemetry integration
3. **Log Sampling**: Sample verbose logs in high traffic
4. **Custom Formatters**: Add team-specific log formats
5. **Alert Integration**: Auto-alert on critical errors

## Support

For issues or questions about logging:
1. Check this guide
2. Review `utils/logger.py` implementation
3. Check logs for initialization errors
4. Review FastAPI middleware documentation
