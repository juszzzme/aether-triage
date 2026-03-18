# 🌉 Frontend-Backend Integration Guide

## Quick Start

### 1️⃣ Start the Backend (FastAPI)

```bash
# Navigate to backend directory
cd aether-dashboard/backend

# Activate Python environment (if using virtualenv)
# source venv/bin/activate  # Linux/Mac
# .\venv\Scripts\activate   # Windows

# Start the FastAPI server
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Verify Backend is Running:**
```bash
curl http://localhost:8000/health
# Should return: {"status": "ok"}
```

---

### 2️⃣ Start the Frontend (Vite + React)

```bash
# Navigate to project root
cd aether-dashboard

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
VITE v7.3.1  ready in 421 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Access the App:**
- Open browser: http://localhost:5173
- Navigate to: **"The Brain"** page (Brain Test)

---

## 🧪 Testing the Integration

### Test Case 1: Payment Failure
**Input:**
```
My UPI payment of Rs 500 failed. Transaction ID: UPI2024123456. 
Contact: 9876543210
```

**Expected Backend Response:**
- **Vertical:** PAYMENTS
- **Intent:** Payment_Failed or Refund_Request
- **Confidence:** ~85%+
- **PII Detected:** Phone Number (9876543210)
- **Routing:** Customer Support Tier 1

---

### Test Case 2: Fraud Report
**Input:**
```
I see unauthorized transactions on my credit card ending in 4532. 
Someone hacked my account. Email: victim@example.com
```

**Expected Backend Response:**
- **Vertical:** FRAUD
- **Intent:** Fraud_Report or Unauthorized_Transaction
- **Confidence:** ~90%+
- **PII Detected:** Credit Card, Email
- **Routing:** Fraud Prevention Unit
- **Category:** CRITICAL THREAT (red badge)

---

### Test Case 3: Hinglish Query
**Input:**
```
Mera loan EMI kat gaya lekin paisa nahi mila. Account number: 1234567890
```

**Expected Backend Response:**
- **Vertical:** LENDING
- **Intent:** EMI_Query or Payment_Issue
- **Language Detected:** Hinglish
- **PII Detected:** Account Number

---

## 🔍 Debugging

### Check Vite Proxy Logs
Open browser DevTools (F12) → Network tab:
- Should see POST requests to `/api/analyze`
- Status should be **200 OK**
- Response should contain JSON with `vertical`, `intent`, etc.

### Check Backend Logs
Backend terminal should show:
```
INFO:     127.0.0.1:5173 - "POST /api/analyze HTTP/1.1" 200 OK
INFO:     Correlation-ID: abc-123-def-456
INFO:     Vertical: PAYMENTS, Intent: Refund_Request
```

### Common Issues

#### 1. **"Failed to analyze text. Please check if the backend is running."**
**Cause:** Backend not started or running on wrong port

**Fix:**
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check if port 8000 is in use
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/Mac
```

#### 2. **CORS Error in Browser Console**
**Cause:** Backend not configured to accept frontend origin

**Fix:** Check `backend/main.py` for CORS middleware:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 3. **Proxy Not Working (404 Error)**
**Cause:** Vite proxy misconfigured

**Fix:** Verify `vite.config.js`:
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

#### 4. **Empty PII Array**
**Cause:** No PII patterns detected in input

**Test with:** Phone numbers, emails, credit cards, Aadhaar numbers

---

## 📊 Cache Performance Testing

### Check Cache Stats
```bash
curl http://localhost:8000/api/cache/stats
```

**Response:**
```json
{
  "size": 5,
  "max_size": 1000,
  "hits": 12,
  "misses": 5,
  "hit_rate_pct": 70.6,
  "ttl_hours": 24
}
```

### Test Cache Behavior
1. **First Request:** Submit identical text → Should take ~150-300ms
2. **Second Request:** Submit same text again → Should take ~5-10ms (cache hit)
3. **Check Console:** Look for `X-Cache-Status: HIT` in response headers

---

## 🚀 Production Deployment

### Environment Variables

**Frontend (`.env.production`):**
```bash
VITE_API_URL=https://api.aether-triage.com
```

**Backend (`.env`):**
```bash
LOG_LEVEL=INFO
ENVIRONMENT=production
MAX_WORKERS=10
CACHE_SIZE=10000
CACHE_TTL_HOURS=48
```

### Build Commands

**Frontend:**
```bash
npm run build
# Output: dist/ folder (upload to Netlify/Vercel/S3)
```

**Backend:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# Or use Gunicorn:
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## 📝 API Response Schema

### Full Backend Response
```json
{
  "masked_text": "My UPI payment of Rs 500 failed. Transaction ID: UPI2024123456. Contact: [PHONE_REDACTED]",
  "vertical": "PAYMENTS",
  "vertical_confidence": 0.92,
  "subcategory": "UPI_Failure",
  "intent": "Refund_Request",
  "intent_confidence": 0.88,
  "risk_level": "medium",
  "urgency": "high",
  "sentiment": {
    "score": -0.6,
    "label": "Negative"
  },
  "pii_entities": [
    {
      "type": "PHONE",
      "value": "9876543210",
      "masked": "[PHONE_REDACTED]",
      "position": [45, 55]
    }
  ],
  "pii_redaction_count": 1,
  "redacted_types": ["PHONE"],
  "entities": {
    "amount": "500",
    "transaction_id": "UPI2024123456",
    "payment_method": "UPI"
  },
  "routing_decision": "Customer Support Tier 1 - Payments Specialist",
  "auto_resolve": false,
  "suggested_actions": [
    "Verify transaction status in banking system",
    "Initiate refund within 24 hours",
    "Send confirmation SMS to customer"
  ],
  "draft_response": "Dear Customer, we have identified your UPI transaction...",
  "correlation_id": "abc-123-def-456",
  "processing_time_ms": 245
}
```

### Frontend Mapping
```javascript
{
  category: "PAYMENT ISSUE",          // Derived from vertical + intent
  confidence: 92,                      // vertical_confidence * 100
  sentiment_score: 0.2,                // Normalized from -0.6 to [0, 1]
  pii_detected: [                      // pii_entities array
    { type: "Phone Number", value: "[PHONE_REDACTED]" }
  ],
  routing: "Customer Support Tier 1",  // routing_decision
  vertical: "PAYMENTS",                // Direct mapping
  intent: "Refund_Request",            // Direct mapping
  risk_level: "medium",                // Direct mapping
  timestamp: "10:32:45 AM"             // Client-side timestamp
}
```

---

## 🎯 Success Criteria

✅ **Backend Integration Complete When:**
- [ ] `curl http://localhost:8000/health` returns 200 OK
- [ ] Frontend shows "Live Neural Interface" (green pulse)
- [ ] Analyze button triggers real API call (not setTimeout)
- [ ] Network tab shows `/api/analyze` request
- [ ] Result card displays backend data (vertical, intent, confidence)
- [ ] PII entities are masked and toggleable
- [ ] Error messages appear if backend is down
- [ ] Cache statistics are accessible at `/api/cache/stats`

---

**Last Updated:** February 17, 2026  
**Status:** ✅ Production Ready
