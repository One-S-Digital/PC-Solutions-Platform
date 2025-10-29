# E2E Webhook Debug Guide

## Overview
This guide provides comprehensive debugging for webhook delivery issues. The webhook controller has been enhanced with extensive E2E debugging logs to identify the root cause of webhook failures.

## Debug Features Added

### 1. **Comprehensive Request Logging**
- All request details (method, URL, headers, body)
- Complete header analysis including Svix headers
- Body analysis (type, length, content preview)
- IP address and user agent tracking

### 2. **Webhook Secret Analysis**
- Secret configuration verification
- Environment variable checking
- Secret format validation (whsec_ prefix)
- Length and character analysis

### 3. **Svix Headers Analysis**
- Header presence validation
- Timestamp parsing and age calculation
- Signature format analysis
- Missing headers detection

### 4. **Signature Verification Debugging**
- Detailed verification input analysis
- Error analysis with specific failure reasons
- Request modification detection
- Timestamp validation

### 5. **Event Processing Debugging**
- Complete event data logging
- Role resolution analysis
- User details extraction
- Database operation tracking

### 6. **Database Operations Debugging**
- AppUser upsert operations
- User upsert operations
- Error handling and stack traces
- Success confirmation

### 7. **Clerk API Sync Debugging**
- User fetching from Clerk API
- Metadata comparison
- Role synchronization
- Error handling

## Debug Endpoints

### Health Check
```bash
curl https://pc-solutions-v2.onrender.com/api/webhooks/clerk/health
```

### Test Endpoint
```bash
curl https://pc-solutions-v2.onrender.com/api/webhooks/clerk/test
```

## Debug Log Format

All debug logs follow this format:
```
🚨 [E2E DEBUG {requestId}] {ACTION} - {DESCRIPTION}
```

### Log Categories:
- `🔍` - Request Analysis
- `📋` - Headers Analysis
- `📦` - Body Analysis
- `🔑` - Secret Analysis
- `🔄` - Processing
- `💾` - Database Operations
- `✅` - Success
- `❌` - Error
- `⚠️` - Warning

## Common Issues and Solutions

### 1. **Missing Svix Headers**
**Symptoms:** `❌ [E2E DEBUG] MISSING SVIX HEADERS`
**Causes:**
- Clerk webhook not properly configured
- Proxy/middleware stripping headers
- Incorrect webhook URL

**Solutions:**
- Verify webhook URL in Clerk Dashboard
- Check proxy configuration
- Ensure webhook is enabled

### 2. **Signature Verification Failed**
**Symptoms:** `❌ [E2E DEBUG] SIGNATURE VERIFICATION FAILED`
**Causes:**
- Webhook secret mismatch
- Body parsing issues
- Request modification
- Timestamp issues

**Solutions:**
- Verify `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard
- Check body parser middleware
- Verify request integrity
- Check server time sync

### 3. **Database Operation Failed**
**Symptoms:** `❌ [E2E DEBUG] FAILED TO UPSERT APPUSER/USER`
**Causes:**
- Database connection issues
- Constraint violations
- Invalid data format

**Solutions:**
- Check database connectivity
- Verify data format
- Check unique constraints

### 4. **Clerk API Sync Failed**
**Symptoms:** `❌ [E2E DEBUG] FAILED TO SYNC WITH CLERK API`
**Causes:**
- Invalid Clerk secret key
- Network issues
- API rate limits

**Solutions:**
- Verify `CLERK_SECRET_KEY`
- Check network connectivity
- Monitor API usage

## Testing Webhook

### 1. **Test with Clerk Dashboard**
- Go to Clerk Dashboard → Webhooks
- Click "Send Example" or "Test Webhook"
- Check delivery attempts for detailed error messages

### 2. **Test with curl**
```bash
curl -X POST https://pc-solutions-v2.onrender.com/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test-$(date +%s)" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: test-signature" \
  -d '{"type": "user.created", "data": {"id": "test-user", "email_addresses": [{"email_address": "test@example.com"}]}}'
```

### 3. **Check Render Logs**
- Go to Render Dashboard → pc-solutions-v2 service
- Click "Logs" tab
- Look for `[E2E DEBUG]` entries

## Debug Checklist

- [ ] Webhook URL is correct in Clerk Dashboard
- [ ] `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard signing secret
- [ ] `CLERK_SECRET_KEY` is valid
- [ ] Database is accessible
- [ ] Webhook endpoint is responding
- [ ] No proxy/middleware interference
- [ ] Server time is synchronized

## Monitoring

### Key Metrics to Watch:
- Webhook delivery success rate
- Signature verification success rate
- Database operation success rate
- Clerk API sync success rate
- Response times

### Log Patterns to Monitor:
- `✅ [E2E DEBUG] EVENT PROCESSED SUCCESSFULLY`
- `❌ [E2E DEBUG] SIGNATURE VERIFICATION FAILED`
- `❌ [E2E DEBUG] FAILED TO UPSERT`
- `❌ [E2E DEBUG] MISSING SVIX HEADERS`

## Troubleshooting Steps

1. **Check Health Endpoint**
   ```bash
   curl https://pc-solutions-v2.onrender.com/api/webhooks/clerk/health
   ```

2. **Test Webhook Endpoint**
   ```bash
   curl https://pc-solutions-v2.onrender.com/api/webhooks/clerk/test
   ```

3. **Check Render Logs**
   - Look for initialization logs
   - Check for webhook request logs
   - Monitor error patterns

4. **Verify Clerk Configuration**
   - Webhook URL matches exactly
   - Signing secret matches environment variable
   - Webhook is enabled and active

5. **Test with Real Webhook**
   - Create a test user in your application
   - Monitor logs for webhook delivery
   - Check database for user creation

## Support

If issues persist after following this guide:
1. Collect all `[E2E DEBUG]` logs from Render
2. Check Clerk Dashboard → Webhooks → Delivery Attempts
3. Verify all environment variables
4. Test with the provided curl commands