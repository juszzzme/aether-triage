# Quick Start - Logging & Error Handling

## 🚀 5-Minute Setup

### 1. Run Tests
```powershell
cd backend
python test_logging.py
```

### 2. Start Server (Development)
```powershell
cd backend
uvicorn main:app --reload
```

### 3. Check Logs
```powershell
# Tail all logs
Get-Content logs\aether.log -Tail 50 -Wait

# Errors only
Get-Content logs\error.log -Tail 20 -Wait
```

### 4. Test API
```powershell
# Success case
curl -X POST http://localhost:8000/api/analyze `
  -H "Content-Type: application/json" `
  -d '{"text": "UPI payment failed"}'

# Error case
curl -X POST http://localhost:8000/api/analyze `
  -H "Content-Type: application/json" `
  -d '{"text": ""}'
```

---

## 📝 Common Tasks

### Import Logger
```python
from utils.logger import get_logger
logger = get_logger(__name__)
```

### Log Messages
```python
# Simple
logger.info("Task completed")

# With context
logger.info("Processing ticket", extra={"extra_fields": {
    "ticket_id": "123",
    "status": "success"
}})
```

### Handle Errors
```python
try:
    result = process_data()
    logger.info("Success")
    return result
except ValueError as e:
    logger.error(f"Validation failed: {e}", exc_info=True)
    return fallback_result
except Exception as e:
    logger.critical(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Processing failed")
```

---

## 🔍 Debugging

### Find Errors
```powershell
Select-String -Path "logs\aether.log" -Pattern '"level": "ERROR"'
```

### Trace Request
```powershell
# Get correlation ID from response header X-Correlation-ID
Select-String -Path "logs\aether.log" -Pattern "correlation-id-here"
```

### Monitor Live
```powershell
Get-Content logs\aether.log -Tail 100 -Wait | Where-Object { $_ -match "ERROR|CRITICAL" }
```

---

## ⚙️ Configuration

### Development
```powershell
$env:ENVIRONMENT="development"
$env:LOG_LEVEL="DEBUG"
```

### Production
```powershell
$env:ENVIRONMENT="production"
$env:LOG_LEVEL="INFO"
```

---

## ❌ Common Errors & Solutions

### Import Error: `No module named 'utils'`
**Solution**: Run from `backend/` directory or check sys.path

### Logs Not Created
**Solution**: Ensure `backend/logs/` directory exists (created automatically)

### Correlation ID Missing
**Solution**: Check that `RequestLoggingMiddleware` is registered in main.py

---

## 📚 Full Documentation
- **Complete Guide**: `LOGGING_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Test Suite**: `test_logging.py`

---

**Need Help?** Check the logs first: `backend/logs/aether.log`
