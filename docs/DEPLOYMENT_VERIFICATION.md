# Deployment Verification Guide

## 1. Environment Variables Check

### Required Variables on Render:
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `CLERK_SECRET_KEY` - From Clerk Dashboard → API Keys
- [ ] `CLERK_WEBHOOK_SECRET` - From Clerk Dashboard → Webhooks
- [ ] `CLERK_PUBLISHABLE_KEY` - From Clerk Dashboard → API Keys
- [ ] `NODE_ENV` - Set to `production`

### Optional but Recommended:
- [ ] `CLERK_ISSUER` - Your Clerk instance URL (e.g., https://your-app.clerk.accounts.dev)
- [ ] `PORT` - Usually auto-set by Render

## 2. Database Verification

### Check if new tables exist:
```sql
-- Run these queries in your database
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('AppUser', 'AppUserRoleHistory', 'Outbox');

-- Check existing users
SELECT COUNT(*) as total_users FROM users;

-- Check migrated users
SELECT COUNT(*) as app_users FROM "AppUser";

-- Check role distribution
SELECT role, COUNT(*) as count 
FROM "AppUser" 
GROUP BY role;
```

## 3. Clerk Configuration

### Webhook Setup:
1. Go to Clerk Dashboard → Webhooks
2. Create/Update webhook endpoint:
   - URL: `https://api.procrechesolutions.com/api/webhooks/clerk`
   - Events to enable:
     - [x] user.created
     - [x] user.updated
     - [x] user.deleted
3. Copy the Signing Secret to `CLERK_WEBHOOK_SECRET` in Render

### Test Webhook:
1. Create a test user in Clerk
2. Check if AppUser record is created
3. Check Render logs for webhook processing

## 4. API Health Checks

### Basic Health:
```bash
curl https://api.procrechesolutions.com/api/health
# Expected: {"status":"ok"}
```

### Database Health:
```bash
curl https://api.procrechesolutions.com/api/health/database
# Expected: {"status":"ok","database":"connected"}
```

### Ready Check:
```bash
curl https://api.procrechesolutions.com/api/health/ready
# Expected: {"status":"ok","database":"connected","migrations":"up-to-date"}
```

## 5. Authentication Test

### Get a Clerk Token:
1. Login to your frontend app
2. Open browser console
3. Run: `await window.Clerk.session.getToken()`
4. Copy the token

### Test Authentication:
```bash
# Replace YOUR_TOKEN with actual token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.procrechesolutions.com/api/users/me

# Expected: {"userId":"user_xxx","role":"YOUR_ROLE","appUserId":"uuid"}
```

## 6. Role Authorization Test

### Test Admin Endpoint:
```bash
# With admin/super_admin token
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://api.procrechesolutions.com/api/admin/frontend-settings

# Should return settings if authorized
# Should return 403 if not admin
```

## 7. Common Issues & Solutions

### Issue: 401 Unauthorized
**Symptoms**: All API calls return 401
**Solutions**:
- Check CLERK_SECRET_KEY is set correctly
- Verify token is being sent in Authorization header
- Check CLERK_ISSUER matches your Clerk instance

### Issue: 403 Forbidden (Role Issues)
**Symptoms**: Authenticated but no access to admin endpoints
**Solutions**:
1. Check if user exists in AppUser table
2. Verify user has correct role in database
3. Run reconciliation manually (see script below)

### Issue: Webhook Not Working
**Symptoms**: New users don't get AppUser records
**Solutions**:
- Verify webhook URL is correct
- Check CLERK_WEBHOOK_SECRET matches
- Look for webhook errors in Render logs
- Test webhook manually from Clerk dashboard

### Issue: Database Connection
**Symptoms**: 500 errors, "database not connected"
**Solutions**:
- Verify DATABASE_URL is correct
- Check database is accessible from Render
- Ensure migrations have run

## 8. Manual Fixes

### Migrate Existing Users:
```sql
-- Insert missing users from users table to AppUser
INSERT INTO "AppUser" ("id", "clerkId", "role", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  u."clerkId",
  u."role",
  u."createdAt",
  u."updatedAt"
FROM users u
LEFT JOIN "AppUser" au ON au."clerkId" = u."clerkId"
WHERE au.id IS NULL;
```

### Force Role Sync to Clerk:
```sql
-- Create outbox entries for all users to sync roles
INSERT INTO "Outbox" ("topic", "payload", "createdAt")
SELECT 
  'mirror.role',
  jsonb_build_object('clerkId', "clerkId", 'role', "role"),
  NOW()
FROM "AppUser";
```

## 9. Monitoring Commands

### Check Outbox Queue:
```sql
SELECT id, topic, attempts, "nextRunAt", "lastError"
FROM "Outbox"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Recent Role Changes:
```sql
SELECT 
  h.*,
  au."clerkId"
FROM "AppUserRoleHistory" h
JOIN "AppUser" au ON au.id = h."userId"
ORDER BY h."changedAt" DESC
LIMIT 10;
```

### Check for Drift:
```sql
-- Users in old table not in new
SELECT COUNT(*) as missing_migrations
FROM users u
LEFT JOIN "AppUser" au ON au."clerkId" = u."clerkId"
WHERE au.id IS NULL;
```

## 10. Quick Diagnostic Script

Save and run this SQL to get a full diagnostic:
```sql
-- Diagnostic Report
SELECT 'Total Users' as metric, COUNT(*)::text as value FROM users
UNION ALL
SELECT 'AppUsers', COUNT(*)::text FROM "AppUser"
UNION ALL
SELECT 'Pending Outbox', COUNT(*)::text FROM "Outbox"
UNION ALL
SELECT 'Role Changes', COUNT(*)::text FROM "AppUserRoleHistory"
UNION ALL
SELECT 'Missing Migrations', COUNT(*)::text FROM (
  SELECT 1 FROM users u 
  LEFT JOIN "AppUser" au ON au."clerkId" = u."clerkId"
  WHERE au.id IS NULL
) as missing;
```