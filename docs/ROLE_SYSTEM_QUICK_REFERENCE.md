# Role System Quick Reference

## Setup Commands

```bash
# Install dependencies
cd /workspace && pnpm install

# Set up test environment
cd /workspace/api
cp .env.test.example .env.test  # Edit with your values
npm run test:setup

# Run tests
npm run test:auth
```

## Key Endpoints

### Authentication
- `GET /api/users/me` - Get current user info

### Role Management (Admin/Super Admin only)
- `GET /api/admin/role-management/users/:clerkId` - Get user role and history
- `PATCH /api/admin/role-management/users/:clerkId/role` - Change user role
- `GET /api/admin/role-management/history` - Get all role changes

### Health Checks (Public)
- `GET /api/health` - Basic health check
- `GET /api/health/database` - Database connection check
- `GET /api/health/ready` - Full readiness check

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Optional
CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_ISSUER="https://..."
```

## Role Hierarchy

1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Admin access (cannot promote to SUPER_ADMIN)
3. **FOUNDATION** - Foundation organization access
4. **PRODUCT_SUPPLIER** - Product supplier access
5. **SERVICE_PROVIDER** - Service provider access
6. **EDUCATOR** - Educator access
7. **PARENT** - Basic user access (default)

## Database Tables

### AppUser
- Primary role storage
- Links to Clerk user ID
- Source of truth for roles

### AppUserRoleHistory
- Audit trail of all role changes
- Tracks who made changes and why

### Outbox
- Queue for syncing changes to Clerk
- Handles retries on failure

## Testing Checklist

### Quick Smoke Test
1. Start server: `npm run start:test`
2. Get auth token from Clerk dashboard
3. Test `/api/users/me` endpoint
4. Verify role is loaded correctly

### Full Test Suite
1. Unit tests: `npm run test:unit`
2. Integration tests: `npm run test:integration`
3. All auth tests: `npm run test:auth`

## Common Issues

### "No token provided"
- Add `Authorization: Bearer <token>` header

### "User role not found"
- User exists in Clerk but not in AppUser table
- Run reconciliation or wait for auto-creation

### "Insufficient permissions"
- User role doesn't have access to endpoint
- Check required roles on controller

### Webhook failures
- Verify CLERK_WEBHOOK_SECRET is correct
- Check webhook URL in Clerk dashboard
- Ensure raw body parsing is enabled

## Monitoring

### Check Outbox Queue
```sql
SELECT * FROM "Outbox" ORDER BY "createdAt" DESC;
```

### Check Role History
```sql
SELECT * FROM "AppUserRoleHistory" 
ORDER BY "changedAt" DESC 
LIMIT 10;
```

### Check User Roles
```sql
SELECT au.*, COUNT(h.id) as changes
FROM "AppUser" au
LEFT JOIN "AppUserRoleHistory" h ON h."userId" = au.id
GROUP BY au.id;
```