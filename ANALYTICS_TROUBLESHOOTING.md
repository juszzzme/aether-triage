# Aether Analytics Troubleshooting Guide

## Problem: Analytics Page Shows "Loading..." with No Data

### Root Causes

1. **Wrong Backend Running** ⚠️ **MOST COMMON**
   - Symptom: `http://localhost:8000/health` returns data but Analytics shows loading
   - Cause: A different application is running on port 8000 (not Aether)
   - How to check:
     ```powershell
     curl http://localhost:8000/api/cache/stats
     ```
     If you get `{"detail":"Not Found"}`, wrong backend is running!

2. **No Cache Data Yet**
   - Symptom: Backend responds correctly but cache is empty
   - Cause: No analysis requests submitted yet
   - Fix: Submit a test query via Brain Test page first

3. **Backend Not Running**
   - Symptom: Frontend shows "Backend Offline" indicator
   - Cause: Port 8000 not listening
   - Fix: Start backend manually or with Docker

---

## Quick Fixes

### ✅ Fix 1: Kill Wrong Backend & Start Aether

```powershell
# Step 1: Find process on port 8000
netstat -ano | findstr :8000

# Step 2: Kill the process (replace <PID> with actual Process ID)
taskkill /PID <PID> /F

# Step 3: Start correct Aether backend
cd C:\Triage\aether-dashboard\backend
C:\Triage\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

# Step 4: In another terminal, start frontend
cd C:\Triage\aether-dashboard
npm run dev
```

### ✅ Fix 2: Verify Backend is Aether

Test the correct endpoints:

```powershell
# Should return Aether cache stats
Invoke-WebRequest http://localhost:8000/api/cache/stats -UseBasicParsing

# Should return Aether system info
Invoke-WebRequest http://localhost:8000/ -UseBasicParsing
```

**Expected Response:**
```json
{
    "name": "Aether API",
    "version": "1.0.0",
    "status": "operational",
    "environment": "development",
    "modules": {
        "pii_masker": "active",
        "vertical_classifier": "active",
        "intent_detector": "active",
        "resolution_engine": "active"
    }
}
```

### ✅ Fix 3: Generate Test Data

Run diagnostic script to create cache data:

```powershell
# Run automated diagnostic
.\diagnose-analytics.bat

# OR manually submit test requests
curl -X POST http://localhost:8000/api/analyze `
  -H "Content-Type: application/json" `
  -d '{\"text\":\"My payment failed\",\"language\":\"auto\"}'
```

---

## Verification Checklist

After fixing, verify these:

- [ ] `http://localhost:8000/` returns `"name": "Aether API"`
- [ ] `http://localhost:8000/api/cache/stats` returns cache statistics
- [ ] `http://localhost:5173/brain-test` can submit analysis
- [ ] `http://localhost:5173/analytics` shows live metrics
- [ ] Analytics updates every 5 seconds (watch "Last Update" timestamp)

---

## Backend Port Conflict Resolution

If you consistently have port conflicts:

**Option 1: Change Aether Backend Port**
```javascript
// vite.config.js - Change proxy target
proxy: {
    '/api': {
        target: 'http://127.0.0.1:8001',  // Changed from 8000
        // ...
    }
}
```

```powershell
# Start backend on different port
uvicorn main:app --reload --port 8001
```

**Option 2: Stop Conflicting Service**
```powershell
# Find what's using port 8000
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess

# Stop the service or change its port
```

---

## Analytics Data Flow

Understanding how analytics works:

```
1. User submits complaint → POST /api/analyze
2. Backend processes → Caches result
3. Cache stats updated → hits, misses, size
4. Analytics page polls → GET /api/cache/stats (every 5s)
5. Charts update → Real-time metrics displayed
```

**First-time Setup:**
1. Backend starts with empty cache: `{hits: 0, misses: 0, size: 0}`
2. First analysis request → Cache miss (now: `{hits: 0, misses: 1, size: 1}`)
3. Same request again → Cache hit (now: `{hits: 1, misses: 1, size: 1}`)
4. Analytics shows: **50% hit rate**

---

## Common Error Messages

### Error: "Unable to connect to backend"
**Cause:** Backend not running or wrong port  
**Fix:** Check `http://localhost:8000/health`

### Error: "Backend health check failed"
**Cause:** Backend crashed or timeout  
**Fix:** Check backend terminal for errors

### Error: Stats showing "—" placeholders
**Cause:** `/api/cache/stats` endpoint failing  
**Fix:** Ensure correct Aether backend is running

### Error: Charts not updating
**Cause:** Polling interval stopped  
**Fix:** Refresh page or check browser console for errors

---

## Advanced Debugging

### Enable Detailed Logging

**Backend:**
```powershell
# Set environment variable
$env:LOG_LEVEL="DEBUG"
uvicorn main:app --reload --port 8000
```

**Frontend (Browser Console):**
```javascript
// In browser console
localStorage.setItem('debug', 'aether:*')
```

### Monitor Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "cache" or "analyze"
4. Check:
   - Request URL
   - Response status (should be 200)
   - Response body (should have valid JSON)

### Check Backend Logs

Look for these log entries:
```
INFO     | aether | Logging initialized
INFO     | aether | All modules initialized successfully
INFO     | aether | Response cache initialized
INFO     | uvicorn.error | Application startup complete.
```

If you see errors like:
```
ERROR    | aether | Failed to initialize modules
```
Then modules aren't loading correctly.

---

## Still Not Working?

1. **Delete cache and restart:**
   ```powershell
   curl -X POST http://localhost:8000/api/cache/clear
   ```

2. **Rebuild virtual environment:**
   ```powershell
   cd aether-dashboard\backend
   rm -rf .venv
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Check Python version:**
   ```powershell
   python --version  # Should be 3.13+
   ```

4. **Try Docker (isolates environment):**
   ```powershell
   docker-compose down -v
   docker-compose up --build
   ```

---

## Success Indicators

✅ **Analytics is working correctly when you see:**

- Green "System Operational" badge
- Cache hit rate updating (e.g., "45.2%")
- Total requests incrementing
- "Last Update" timestamp refreshing every 5 seconds
- Backend status showing all services as "ACTIVE"
- Memory usage bar showing progress

📊 **Example Healthy Dashboard:**
```
Total Requests: 127
Cache Hit Rate: 73.2%
Avg Latency: 8ms
Memory Usage: 85/1000
```

---

## Quick Reference Commands

```powershell
# Check if correct backend is running
curl http://localhost:8000/ | findstr "Aether API"

# View current cache stats
curl http://localhost:8000/api/cache/stats

# Submit test analysis
curl -X POST http://localhost:8000/api/analyze -H "Content-Type: application/json" -d "{\"text\":\"test\",\"language\":\"auto\"}"

# Clear cache
curl -X POST http://localhost:8000/api/cache/clear

# Check frontend connection
curl http://localhost:5173

# Find process on port 8000
netstat -ano | findstr :8000

# Docker status
docker-compose ps
```
