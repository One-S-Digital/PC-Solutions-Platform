# Clerk Webhook Debug Logging - Quick Reference

## 🚀 What's New

Comprehensive debug logging has been added to help identify webhook issues. Every webhook request now generates detailed logs at each stage.

## 📍 Quick Checks

### 1. Verify Configuration (On Startup)
Look for these logs when the server starts:
```
✅ [WEBHOOK INIT] Clerk webhook controller initialized successfully
```

If you see errors, check your environment variables:
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

### 2. Test Webhook Health
```bash
curl https://your-api.com/api/webhooks/clerk/health
```

Should return:
```json
{
  "status": "ok",
  "webhookConfigured": true,
  "clerkClientConfigured": true
}
```

### 3. Monitor Webhook Requests
Each webhook request generates logs with a unique request ID:
```
🔔 [WEBHOOK abc123] NEW WEBHOOK REQUEST RECEIVED
```

Follow that request ID through the logs to see what happened.

## 🔍 Common Issues

| Issue | Log Pattern | Solution |
|-------|-------------|----------|
| **No logs at all** | Nothing appears | Check Clerk Dashboard delivery attempts, verify URL |
| **Missing secrets** | `❌ [WEBHOOK INIT]` | Set `CLERK_WEBHOOK_SECRET` in environment |
| **Signature fails** | `❌ SIGNATURE VERIFICATION FAILED` | Verify webhook secret matches Clerk Dashboard |
| **Body parsing issue** | `isBuffer: false` | Check Express middleware configuration |
| **Processing fails** | `❌ FAILED TO PROCESS` | Check database connectivity and user data |

## 📊 Log Emoji Guide

- 🔔 New webhook request received
- 🔍 Debug information
- 🔐 Signature verification
- 🔄 Processing event
- 💾 Database operation
- ✅ Success
- ❌ Error
- ⚠️ Warning
- ⏱️ Performance timing
- 👤 User operations

## 📚 Full Documentation

See `docs/clerk-webhook-debugging-guide.md` for comprehensive debugging instructions.

## 🧪 Testing

1. **Send test webhook from Clerk Dashboard:**
   - Webhooks > Select Event > Send Example

2. **Check logs for the request ID:**
   - Should see verification, processing, and completion
   - Performance metrics at the end

3. **Verify in database:**
   - Check if user was created/updated correctly

## 🔧 Quick Fixes

### Signature verification fails
```bash
# 1. Get correct secret from Clerk
#    Dashboard > Webhooks > Click your endpoint > Signing Secret

# 2. Update environment variable
export CLERK_WEBHOOK_SECRET="whsec_..."

# 3. Restart server
```

### Body parsing issues
Check logs for:
```
🔍 [WEBHOOK BODY DEBUG] After raw parser: {
  "isBuffer": true  ← Should be true
}
```

If `isBuffer: false`, the body is being parsed too early by another middleware.

## 📈 Performance Monitoring

Each webhook logs timing:
```
⏱️ [WEBHOOK abc123] Performance: {
  "processingTime": "234ms",
  "totalTime": "267ms"
}
```

If processing is slow (>1000ms), check:
- Database query performance
- Clerk API response time
- Network latency

## 🎯 Next Steps

1. Enable debug logging (already enabled in development)
2. Send a test webhook from Clerk Dashboard
3. Review the logs with the request ID
4. Use the comprehensive guide for specific issues

---

**Need help?** Check the full guide at `docs/clerk-webhook-debugging-guide.md`
