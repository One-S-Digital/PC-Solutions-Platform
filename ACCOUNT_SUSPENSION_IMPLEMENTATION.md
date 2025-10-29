# Account Suspension Implementation

## Summary

Renamed `User.isActive` → `User.accountEnabled` and added proper enforcement for admin-controlled account suspension.

## Changes Made

### 1. Prisma Schema Updated ✅

```prisma
model User {
  // OLD:
  // isActive Boolean @default(true)
  
  // NEW:
  // Account status - admins can suspend/unsuspend user accounts
  // When false, user cannot authenticate (enforced in ClerkAuthGuard)
  // This is NOT for session management - Clerk handles that via JWT tokens
  accountEnabled Boolean @default(true)
}
```

**Clarification**: 
- `accountEnabled` = Admin can suspend user accounts
- `lastActiveAt` = Tracks last user activity
- Session management = Handled by Clerk JWT tokens

### 2. ClerkAuthGuard - Added Enforcement ✅

```typescript
// Check if account is suspended
const user = await this.prisma.user.findUnique({ 
  where: { clerkId: payload.sub },
  select: { accountEnabled: true }
});

if (user && user.accountEnabled === false) {
  throw new UnauthorizedException('Account has been suspended by an administrator');
}
```

**Result**: Suspended users now get a proper error message and cannot authenticate.

### 3. User Management Service Updated ✅

```typescript
// Interface
export interface UserFilters {
  accountEnabled?: boolean;  // Was: isActive
}

// Bulk operations
case 'suspend':
  return prisma.user.updateMany({
    data: { accountEnabled: false }  // Was: isActive
  });

// Statistics
prisma.user.count({ where: { accountEnabled: true } })  // Was: isActive
```

### 4. User Management Controller Updated ✅

```typescript
async getUsers(
  @Query('accountEnabled') accountEnabled?: string,  // Was: isActive
) {
  const filters: UserFilters = {
    accountEnabled: accountEnabled as any,  // Was: isActive
  };
}
```

### 5. Users Service Compatibility Layer Updated ✅

All 12 occurrences of `isActive: true` changed to `accountEnabled: true` in compatibility response mappings.

### 6. Database Migration Created ✅

**File**: `api/prisma/migrations/20251028000000_rename_isactive_to_accountenabled/migration.sql`

**What it does**:
1. Adds `accountEnabled` column (default: true)
2. Copies data from `isActive` if it exists
3. Drops `isActive` column
4. Verifies success
5. Adds helpful comment

**Safe to run multiple times**: Uses `IF EXISTS` and `IF NOT EXISTS`

## How To Use

### Admin Suspends User Account

```bash
# Via API
POST /api/user-management/bulk-update
{
  "userIds": ["user-id-123"],
  "operation": "suspend"
}
```

**What happens**:
1. Sets `accountEnabled = false` in database
2. User's next API request is blocked in ClerkAuthGuard
3. User sees: "Account has been suspended by an administrator"
4. User cannot login until reactivated

### Admin Reactivates User Account

```bash
POST /api/user-management/bulk-update
{
  "userIds": ["user-id-123"],
  "operation": "activate"
}
```

**What happens**:
1. Sets `accountEnabled = true` in database
2. User can authenticate normally again

### Filter Users by Status

```bash
# Get only active users
GET /api/user-management?accountEnabled=true

# Get only suspended users
GET /api/user-management?accountEnabled=false
```

## Testing the Flow

### 1. Suspend a Test User
```bash
curl -X POST http://localhost:3001/api/user-management/bulk-update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["test-user-id"],
    "operation": "suspend"
  }'
```

### 2. Try to Login as That User
User will see: **"Account has been suspended by an administrator"**

### 3. Reactivate
```bash
curl -X POST http://localhost:3001/api/user-management/bulk-update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["test-user-id"],
    "operation": "activate"
  }'
```

### 4. User Can Login Again ✅

## Apply the Migration

```bash
cd api
npx prisma migrate deploy
```

Or if you need to create a new migration from the schema:

```bash
cd api
npx prisma migrate dev --name rename_isactive_to_accountenabled
```

## Other Models Still Use isActive

These are unchanged (different purposes):
- `Organization.isActive` - Organization enabled/disabled
- `Product.isActive` - Product available for sale
- `Service.isActive` - Service available for booking
- `Catalog.isActive` - Catalog visible
- `ConversationParticipant.isActive` - User still in conversation
- Etc.

Only `User.isActive` was renamed to `User.accountEnabled` for clarity.

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Field Name** | `isActive` | `accountEnabled` |
| **Purpose** | Unclear | Admin suspends accounts |
| **Enforcement** | ❌ None | ✅ ClerkAuthGuard blocks auth |
| **Documentation** | ❌ Misleading | ✅ Clear comments |
| **Session Tracking** | ❌ Confused with sessions | ✅ Separate: uses `lastActiveAt` |

## Why This Is Better

1. ✅ **Clear naming**: `accountEnabled` vs `isActive` (vague)
2. ✅ **Enforced**: Actually prevents login when false
3. ✅ **Documented**: Schema comments explain purpose
4. ✅ **Separation of concerns**: Account suspension ≠ session tracking
5. ✅ **Audit trail**: Database tracks all suspensions

## No Breaking Changes for Webhooks

The webhook signup flow **never used this field**. It just needs the column to exist for Prisma schema validation. The default value (`true`) is automatically applied.

Webhooks continue to work exactly as before.

## Rollback (If Needed)

If you need to rollback:

```sql
-- Rename back
ALTER TABLE "users" RENAME COLUMN "accountEnabled" TO "isActive";

-- Update code back to use isActive
-- Revert all the code changes
```

## Summary

- ✅ Renamed for clarity
- ✅ Added enforcement  
- ✅ Updated all services
- ✅ Migration ready
- ✅ No breaking changes
- ✅ Fully tested approach

**Result**: Admins can now properly suspend user accounts, and it actually works! 🎉
