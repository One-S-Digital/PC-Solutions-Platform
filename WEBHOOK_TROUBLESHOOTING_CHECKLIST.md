# Webhook Not Reaching Backend - Troubleshooting Checklist

## 🚨 Issue: No Logs on Render Backend

When Clerk sends a webhook but nothing appears in Render logs, follow these steps:

---

## ✅ Step 1: Verify Webhook URL in Clerk Dashboard

### Check Your Webhook Endpoint URL

1. **Go to Clerk Dashboard**
   - Navigate to: Webhooks section
   - Find your webhook configuration

2. **Verify the URL is EXACTLY:**
   ```
   https://YOUR-RENDER-DOMAIN.onrender.com/api/webhooks/clerk
   ```

3. **Common Mistakes:**
   - ❌ `https://YOUR-DOMAIN.com/webhooks/clerk` (missing `/api`)
   - ❌ `https://YOUR-DOMAIN.com/api/webhook/clerk` (singular)
   - ❌ `http://YOUR-DOMAIN.com/api/webhooks/clerk` (http instead of https)
   - ❌ `https://YOUR-DOMAIN.com/clerk/webhooks` (wrong order)

4. **To Find Your Render Domain:**
   - Go to Render Dashboard
   - Click on your API service
   - Look for the URL at the top (e.g., `pc-solutions-api.onrender.com`)

---

## ✅ Step 2: Test Render Service is Running

### Quick Health Check

Run these commands to verify your service is up:

```bash
# Replace with your actual Render domain
export RENDER_DOMAIN="your-service.onrender.com"

# Test main API health
curl https://$RENDER_DOMAIN/health

# Test webhook health endpoint
curl https://$RENDER_DOMAIN/api/webhooks/clerk/health

# Test webhook debug endpoint
curl https://$RENDER_DOMAIN/api/webhooks/clerk/debug
```

### Expected Responses

**Main Health:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T..."
}
```

**Webhook Health:**
```json
{
  "status": "ok",
  "webhookConfigured": true,
  "clerkClientConfigured": true,
  "message": "Webhook is properly configured"
}
```

**If ANY of these fail:**
- Your service isn't running properly
- Check Render logs for startup errors
- Verify environment variables are set

---

## ✅ Step 3: Check Render Service Status

1. **Go to Render Dashboard**
2. **Click on your API service**
3. **Check:**
   - [ ] Service status shows "Live" (green)
   - [ ] No deployment errors
   - [ ] Last deployment succeeded
   - [ ] Environment variables are set:
     - `CLERK_SECRET_KEY`
     - `CLERK_WEBHOOK_SECRET`
     - `DATABASE_URL`

4. **If service is NOT live:**
   - Check the "Events" tab for errors
   - Check the "Logs" tab for startup failures
   - Verify all environment variables are set

---

## ✅ Step 4: Verify Migrations Were Applied

The previous errors (`stripeCustomerId`, `lastActiveAt` missing) indicate migrations haven't been applied yet.

### Check Migration Status

**Option A: Via Render Shell**
```bash
# In Render Shell
cd api
npx prisma migrate status
```

**Option B: Check Build Logs**
Look for these lines in Render build logs:
```
🔄 Deploying database migrations...
Migration `20251030_add_stripe_customer_id_if_missing` applied
Migration `20251030_comprehensive_schema_audit_fix` applied
✅ Build preparation complete!
```

**If migrations weren't applied:**
```bash
# In Render Shell
cd api
npx prisma migrate deploy
```

---

## ✅ Step 5: Check Webhook Secret Configuration

### Verify Webhook Secret is Set Correctly

1. **In Clerk Dashboard:**
   - Go to Webhooks
   - Click on your webhook
   - Copy the "Signing Secret" (starts with `whsec_`)

2. **In Render Dashboard:**
   - Go to your API service
   - Click "Environment"
   - Find `CLERK_WEBHOOK_SECRET`
   - Verify it matches EXACTLY (no extra spaces, quotes, or characters)

3. **Common Issues:**
   - ❌ Extra quotes: `"whsec_..."` (should be: `whsec_...`)
   - ❌ Extra spaces: ` whsec_...` or `whsec_... `
   - ❌ Wrong secret (from different environment)
   - ❌ Old secret after regenerating

---

## ✅ Step 6: Test Webhook Endpoint Manually

### Send a Test Request

```bash
# Replace with your domain
export RENDER_DOMAIN="your-service.onrender.com"

# Test POST endpoint (will fail signature but should log)
curl -X POST https://$RENDER_DOMAIN/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test-123" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,test-signature" \
  -d '{"type":"user.created","data":{"id":"test"}}'
```

### Expected Behavior

Even though signature verification will fail, you should see logs like:
```
🚨🚨🚨 WEBHOOK POST ENDPOINT CALLED
RAW REQUEST RECEIVED - If you see this, the endpoint is being hit!
❌ SIGNATURE VERIFICATION FAILED
```

**If you see NOTHING in logs:**
- The endpoint isn't registered properly
- The route is broken
- The service crashed

---

## ✅ Step 7: Check for Application Errors

### Look for These in Render Logs

1. **Startup errors:**
   ```
   Error: CLERK_SECRET_KEY is not configured
   Error: CLERK_WEBHOOK_SECRET is not configured
   ```

2. **Route errors:**
   ```
   Cannot POST /api/webhooks/clerk
   404 Not Found
   ```

3. **Crash logs:**
   ```
   Application crashed
   Process exited with code 1
   ```

---

## ✅ Step 8: Verify Branch is Deployed

### Check Which Code is Running

1. **In Render Dashboard:**
   - Go to your API service
   - Check "Deployments" tab
   - Verify the latest deployment matches your branch

2. **If wrong branch is deployed:**
   - Trigger manual deploy from correct branch
   - Or merge your branch to the branch Render watches (usually `main`)

---

## 🔧 Quick Fixes

### Fix 1: Redeploy Service

Sometimes a simple redeploy fixes issues:

1. Go to Render Dashboard
2. Click your API service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete
5. Test webhook again

### Fix 2: Apply Migrations Manually

If migrations haven't been applied:

1. Go to Render Dashboard → Your API service → Shell
2. Run:
   ```bash
   cd api
   npx prisma migrate deploy
   npx prisma generate
   exit
   ```
3. Click "Manual Deploy" to restart service
4. Test webhook again

### Fix 3: Verify Environment Variables

Check all required variables are set:

```bash
# In Render Shell
printenv | grep CLERK
printenv | grep DATABASE_URL
```

Should show:
```
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
```

---

## 📊 Diagnostic Summary

Fill this out to diagnose the issue:

- [ ] Webhook URL in Clerk is correct
- [ ] Render service status is "Live"
- [ ] Health endpoint responds: `/health`
- [ ] Webhook health responds: `/api/webhooks/clerk/health`
- [ ] Environment variables are set
- [ ] Migrations have been applied
- [ ] Webhook secret matches Clerk
- [ ] Latest code is deployed
- [ ] No errors in Render logs

**If ALL checked but still failing:**
- Check Clerk Dashboard webhook logs for delivery errors
- Verify firewall/network isn't blocking Clerk IPs
- Contact Render support for routing issues

---

## 🆘 Emergency Contact

### Still Not Working?

1. **Share these details:**
   - Render domain URL
   - Webhook URL from Clerk Dashboard
   - Output of health check: `curl https://YOUR-DOMAIN/api/webhooks/clerk/health`
   - Last 50 lines of Render logs
   - Clerk webhook delivery attempt logs

2. **Temporary Bypass (for testing only):**
   - Create a real test user through your app's signup page
   - This will send a real webhook with proper data
   - Helps isolate if issue is with Clerk test feature

---

## ✅ Success Indicators

When working correctly, you'll see:

### In Clerk Dashboard:
- ✅ Webhook shows as "Delivered" (green checkmark)
- ✅ Response code: 204

### In Render Logs:
- ✅ `🚨🚨🚨 WEBHOOK POST ENDPOINT CALLED`
- ✅ `✅ SIGNATURE VERIFICATION SUCCESSFUL!`
- ✅ `✅ USER CREATION COMPLETE`

### In Database:
- ✅ New user appears in `users` table
- ✅ New user appears in `AppUser` table
- ✅ No error messages in logs
