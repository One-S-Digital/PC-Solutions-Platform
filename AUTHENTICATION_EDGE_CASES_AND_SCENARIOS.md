# Authentication Edge Cases & Advanced Scenarios

## Table of Contents
1. [User Creation Scenarios](#user-creation-scenarios)
2. [Role Change Scenarios](#role-change-scenarios)
3. [Edge Cases & Error Handling](#edge-cases--error-handling)
4. [Multi-Organization Support](#multi-organization-support)
5. [Testing Scenarios](#testing-scenarios)

---

## User Creation Scenarios

### Scenario 1: Normal Frontend Signup

```
Timeline: User signs up via frontend

T+0s   │  User submits signup form
       │  Email: user@example.com
       │  Password: ********
       │  
T+0.1s │  Clerk creates user
       │  clerkId: user_2abc123
       │  
T+0.2s │  Clerk webhook fires
       │  Event: user.created
       │  
T+0.3s │  Backend receives webhook
       │  Creates AppUser:
       │    clerkId: user_2abc123
       │    role: PARENT (default)
       │  
T+0.4s │  Backend syncs to Clerk
       │  Updates publicMetadata:
       │    {role: "PARENT"}
       │  
T+0.5s │  User redirected to /dashboard
       │  
T+1s   │  Frontend loads user data
       │  GET /users/me
       │  Returns: {role: "PARENT", ...}

Result: ✅ User created with PARENT role
```

### Scenario 2: Admin Signup (Needs Manual Role Upgrade)

```
Timeline: Admin signs up via admin panel

T+0s   │  Admin submits signup form
       │  Email: admin@company.com
       │  organizationName: "Company Inc"
       │  
T+0.1s │  Clerk creates user
       │  clerkId: user_2xyz789
       │  
T+0.2s │  Webhook creates AppUser
       │  role: PARENT (default)
       │  
T+0.3s │  Admin logs in
       │  Tries to access /dashboard
       │  
T+0.4s │  AdminProtectedRoute checks:
       │  user.publicMetadata.role === "PARENT"
       │  
T+0.5s │  ❌ Access Denied
       │  Redirect to /access-denied
       │  
       │  Manual Intervention Required:
       │  ================================
       │  
T+5min │  Super admin updates role:
       │  1. Via Clerk Dashboard:
       │     publicMetadata.role = "ADMIN"
       │  
       │  OR
       │  
       │  2. Via API:
       │     POST /admin/role-management/user_2xyz789/role
       │     Body: {role: "ADMIN"}
       │  
T+5.1m │  Database updated
       │  Clerk metadata synced
       │  
T+6min │  Admin logs in again
       │  ✅ Access granted to /dashboard

Result: ⚠️ Manual role upgrade required for admin access
```

### Scenario 3: Invited User (Future Implementation)

```
Timeline: User invited via admin panel

T+0s   │  Admin sends invitation
       │  Email: educator@school.com
       │  Intended role: EDUCATOR
       │  
T+0.1s │  Backend creates invitation
       │  Stores: privateMetadata.intendedRole = "EDUCATOR"
       │  
T+1h   │  User clicks invite link
       │  Redirected to Clerk signup
       │  
T+1h   │  User completes signup
       │  Clerk creates user
       │  
T+1h   │  Webhook reads privateMetadata
       │  Creates AppUser with role: EDUCATOR
       │  
T+1h   │  User auto-assigned correct role
       │  ✅ Can access educator features immediately

Result: ✅ Role pre-assigned via invitation metadata
```

---

## Role Change Scenarios

### Scenario 1: Super Admin Changes User Role

```
┌──────────────────────────────────────────────────────────────────┐
│  Actor: SUPER_ADMIN                                               │
│  Target: user_2abc123 (currently PARENT)                         │
│  Action: Promote to FOUNDATION                                    │
└──────────────────────────────────────────────────────────────────┘

Step 1: Admin makes request
────────────────────────────
  POST /admin/role-management/user_2abc123/role
  Authorization: Bearer <super_admin_jwt>
  Body: {
    "role": "FOUNDATION",
    "reason": "User operates a daycare"
  }

Step 2: Backend validates
──────────────────────────
  ✓ JWT valid
  ✓ Request context: {role: "SUPER_ADMIN"}
  ✓ RolesGuard passes
  ✓ Target user exists

Step 3: Database transaction
─────────────────────────────
  BEGIN TRANSACTION;
  
  -- Create audit log
  INSERT INTO app_user_role_history (
    userId, previousRole, newRole, changedBy, reason
  ) VALUES (
    'uuid-123', 'PARENT', 'FOUNDATION', 'user_2xyz789', 
    'User operates a daycare'
  );
  
  -- Update user role
  UPDATE app_user 
  SET role = 'FOUNDATION', updatedAt = NOW()
  WHERE clerkId = 'user_2abc123';
  
  COMMIT;

Step 4: Sync to Clerk
──────────────────────
  await clerk.users.updateUser('user_2abc123', {
    publicMetadata: {
      role: 'FOUNDATION'
    }
  });

Step 5: Trigger webhook
────────────────────────
  Clerk fires: user.updated
  Backend receives and validates
  Database role matches Clerk metadata
  ✓ No action needed

Step 6: User sees changes
──────────────────────────
  Next login:
    - JWT includes publicMetadata.role = "FOUNDATION"
    - Backend loads from DB: role = "FOUNDATION"
    - User sees foundation-specific UI
    - Can access foundation-only features

Result: ✅ Role successfully upgraded
```

### Scenario 2: Regular Admin Tries to Create Super Admin

```
┌──────────────────────────────────────────────────────────────────┐
│  Actor: ADMIN (not SUPER_ADMIN)                                  │
│  Target: user_2def456                                             │
│  Action: Try to promote to SUPER_ADMIN                           │
└──────────────────────────────────────────────────────────────────┘

Step 1: Admin makes request
────────────────────────────
  POST /admin/role-management/user_2def456/role
  Authorization: Bearer <admin_jwt>
  Body: {
    "role": "SUPER_ADMIN"
  }

Step 2: Backend validates
──────────────────────────
  ✓ JWT valid
  ✓ Request context: {role: "ADMIN"}
  ✓ RolesGuard passes (@Roles(ADMIN, SUPER_ADMIN))

Step 3: Business logic check
─────────────────────────────
  if (req.context.role === UserRole.ADMIN 
      && dto.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenException(
      'Admins cannot assign SUPER_ADMIN role'
    );
  }

Step 4: Request denied
──────────────────────
  403 Forbidden
  {
    "statusCode": 403,
    "message": "Admins cannot assign SUPER_ADMIN role",
    "error": "Forbidden"
  }

Result: ❌ Privilege escalation prevented
```

### Scenario 3: Unauthorized Clerk Metadata Modification

```
┌──────────────────────────────────────────────────────────────────┐
│  Actor: Malicious user                                            │
│  Action: Direct Clerk dashboard access (hypothetical)             │
└──────────────────────────────────────────────────────────────────┘

Step 1: Attacker modifies Clerk metadata
─────────────────────────────────────────
  Via Clerk Dashboard (if they had access):
  publicMetadata.role = "SUPER_ADMIN"

Step 2: Clerk fires webhook
────────────────────────────
  Event: user.updated
  Data: {
    clerkId: 'user_2abc123',
    public_metadata: {
      role: 'SUPER_ADMIN'
    }
  }

Step 3: Backend detects mismatch
─────────────────────────────────
  const publicRole = data.public_metadata?.role; // "SUPER_ADMIN"
  const appUser = await prisma.appUser.findUnique({
    where: { clerkId: 'user_2abc123' }
  });
  // appUser.role === "PARENT"

Step 4: Backend reverts change
───────────────────────────────
  this.logger.warn(
    `Reverting unauthorized role change for user_2abc123: ` +
    `SUPER_ADMIN -> PARENT`
  );

  await clerk.users.updateUser('user_2abc123', {
    publicMetadata: {
      role: appUser.role // "PARENT"
    }
  });

Step 5: User still has original role
─────────────────────────────────────
  Database role: PARENT (unchanged)
  Clerk metadata: PARENT (reverted)
  
  Next API request:
    - Backend loads from DB
    - Role is still PARENT
    - No unauthorized access granted

Result: ✅ Attack prevented by database authority
```

---

## Edge Cases & Error Handling

### Edge Case 1: User Created in Clerk But Webhook Fails

```
Scenario:
  - Clerk creates user successfully
  - Webhook endpoint is down or times out
  - No AppUser created in database

Timeline:
─────────
T+0s   │  User signs up
T+0.1s │  Clerk creates user (clerkId: user_2abc123)
T+0.2s │  Webhook call fails (backend offline)
T+1s   │  User redirected to /dashboard
T+1.1s │  Frontend calls GET /users/me

What happens:
─────────────
1. Backend receives API request
2. ClerkAuthGuard verifies JWT ✓
3. Tries to load AppUser from DB
4. User not found → Auto-provision

Code:
─────
let appUser = await this.prisma.appUser.findUnique({
  where: { clerkId: payload.sub }
});

if (!appUser) {
  // Auto-create with default role
  appUser = await this.prisma.appUser.create({
    data: { 
      clerkId: payload.sub, 
      role: 'PARENT' 
    }
  });
  
  // Sync to Clerk metadata
  await clerk.users.updateUser(payload.sub, {
    publicMetadata: { role: 'PARENT' }
  });
}

Result: ✅ Self-healing - user auto-created on first API call
```

### Edge Case 2: Database Connection Fails During Auth

```
Scenario:
  - User makes authenticated request
  - Database is temporarily unavailable
  - How does auth behave?

Timeline:
─────────
T+0s   │  User makes request
       │  GET /marketplace/products
       │  Authorization: Bearer <valid_jwt>
       │
T+0.1s │  ClerkAuthGuard verifies JWT ✓
       │
T+0.2s │  Tries to load AppUser from DB
       │  Database connection timeout
       │
T+0.3s │  Error thrown

Code:
─────
try {
  let appUser = await this.prisma.appUser.findUnique({
    where: { clerkId: payload.sub }
  });
  
  request.context = {
    userId: payload.sub,
    role: appUser.role,
    appUserId: appUser.id,
  };
} catch (e) {
  if (this.authDebug) {
    console.error('Failed to load AppUser', e);
  }
  // Don't set request.context
  // RolesGuard will deny access
}

Result:
───────
- request.context is undefined
- RolesGuard throws ForbiddenException
- User gets 403 Forbidden
- ⚠️ Service degradation (by design - fail secure)

Alternative (if you want graceful degradation):
────────────────────────────────────────────────
// Fallback to Clerk metadata (NOT RECOMMENDED)
request.context = {
  userId: payload.sub,
  role: payload.publicMetadata?.role || 'PARENT',
  appUserId: null,
};

⚠️ Risk: Stale roles if database was recently updated
```

### Edge Case 3: User Deleted in Clerk But Exists in DB

```
Scenario:
  - Admin deletes user in Clerk
  - Database still has AppUser record
  
Timeline:
─────────
T+0s   │  Admin deletes user in Clerk dashboard
T+0.1s │  Clerk webhook: user.deleted
T+0.2s │  Backend receives webhook

Current handling:
─────────────────
async handleUserDeleted(data: any) {
  const clerkId = data.id;
  
  const appUser = await this.prisma.appUser.findUnique({
    where: { clerkId }
  });
  
  if (appUser) {
    // Create audit log (soft delete)
    await this.prisma.appUserRoleHistory.create({
      data: {
        userId: appUser.id,
        previousRole: appUser.role,
        newRole: appUser.role,
        changedBy: 'system/webhook',
        reason: 'User deleted from Clerk',
      },
    });
    
    // Option 1: Soft delete (mark inactive)
    await this.prisma.appUser.update({
      where: { id: appUser.id },
      data: { isActive: false }
    });
    
    // Option 2: Hard delete (NOT RECOMMENDED - loses history)
    // await this.prisma.appUser.delete({
    //   where: { id: appUser.id }
    // });
  }
}

Result:
───────
- User marked as inactive
- Cannot authenticate (no Clerk account)
- Historical data preserved
- Audit trail maintained

✅ Recommended: Soft delete with isActive flag
```

### Edge Case 4: Concurrent Role Changes

```
Scenario:
  - Two admins try to change same user's role simultaneously
  
Timeline:
─────────
T+0s   │  Admin A: Change user_2abc123 to FOUNDATION
       │  Admin B: Change user_2abc123 to EDUCATOR
       │
T+0.1s │  Both requests hit backend simultaneously
       │
T+0.2s │  Database transaction isolation

With proper DB constraints:
───────────────────────────
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Admin A's transaction
UPDATE app_user 
SET role = 'FOUNDATION', version = version + 1
WHERE clerkId = 'user_2abc123' AND version = 5;
-- Returns 1 row updated

-- Admin B's transaction (runs after)
UPDATE app_user 
SET role = 'EDUCATOR', version = version + 1
WHERE clerkId = 'user_2abc123' AND version = 5;
-- Returns 0 rows (version already incremented)

COMMIT;

Result:
───────
- Admin A's change succeeds
- Admin B's change fails (optimistic locking)
- Admin B gets error: "User was modified by another admin"
- Last-write-wins OR retry required

Recommended: Add version field for optimistic locking
────────────────────────────────────────────────────
model AppUser {
  id        String   @id @default(uuid())
  clerkId   String   @unique
  role      UserRole
  version   Int      @default(1)  // ← Add this
  updatedAt DateTime @updatedAt
}
```

---

## Multi-Organization Support

### Organization Role Mapping

```
┌──────────────────────────────────────────────────────────────────┐
│  Complex Scenario: User has multiple roles in different orgs     │
└──────────────────────────────────────────────────────────────────┘

Example User: Jane Doe
──────────────────────

User Profile:
  clerkId: user_2jane123
  email: jane@example.com

Organization Memberships:
  1. Daycare A (ID: org_abc)
     - Role: FOUNDATION
     - Access: Job postings, leads, orders
  
  2. Product Co (ID: org_xyz)
     - Role: PRODUCT_SUPPLIER
     - Access: Product catalog, order management
  
  3. Platform Admin
     - Role: ADMIN
     - Access: Content moderation, user support

Current System Limitation:
──────────────────────────
AppUser {
  clerkId: "user_2jane123"
  role: UserRole      // ← Single role only!
}

⚠️ Problem: Cannot have multiple roles per user

Solution 1: Primary Role Only
──────────────────────────────
- User picks primary organization
- That organization's role is set as AppUser.role
- To switch, they must change primary org

Solution 2: Organization-Scoped Roles (Future)
───────────────────────────────────────────────
model OrganizationMember {
  id             String       @id @default(uuid())
  userId         String
  organizationId String
  role           UserRole
  isPrimary      Boolean      @default(false)
  
  user         AppUser      @relation(fields: [userId])
  organization Organization @relation(fields: [organizationId])
  
  @@unique([userId, organizationId])
}

// Request context includes orgId
request.context = {
  userId: clerkId,
  role: getOrgRole(clerkId, currentOrgId),
  organizationId: currentOrgId,
}

Implementation steps:
─────────────────────
1. Add OrganizationMember model
2. Update ClerkAuthGuard to detect current org
3. Load role based on org context
4. Frontend sends orgId with requests
5. Multi-tenancy support
```

---

## Testing Scenarios

### Test Case Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    AUTH TESTING MATRIX                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Test Category: User Creation                                  │
│  ─────────────────────────────────────────────────────────────│
│  ✓ T1.1: Frontend signup → PARENT role assigned               │
│  ✓ T1.2: Admin signup → PARENT role initially                 │
│  ✓ T1.3: Webhook failure → Auto-provision on first API call   │
│  ✓ T1.4: Duplicate webhook → Idempotent (no duplicate user)   │
│  ✓ T1.5: Invalid role in metadata → Defaults to PARENT        │
│                                                                 │
│  Test Category: Authentication                                 │
│  ─────────────────────────────────────────────────────────────│
│  ✓ T2.1: Valid JWT → Access granted                           │
│  ✓ T2.2: Expired JWT → 401 Unauthorized                       │
│  ✓ T2.3: Invalid signature → 401 Unauthorized                 │
│  ✓ T2.4: Missing token → 401 Unauthorized                     │
│  ✓ T2.5: Wrong issuer → 401 Unauthorized                      │
│  ✓ T2.6: Wrong audience → 401 Unauthorized                    │
│                                                                 │
│  Test Category: Role-Based Access                              │
│  ─────────────────────────────────────────────────────────────│
│  ✓ T3.1: SUPER_ADMIN can access all endpoints                 │
│  ✓ T3.2: ADMIN cannot access SUPER_ADMIN endpoints            │
│  ✓ T3.3: FOUNDATION can access foundation endpoints           │
│  ✓ T3.4: PARENT cannot access admin endpoints → 403           │
│  ✓ T3.5: Role check uses DB, not JWT metadata                 │
│                                                                 │
│  Test Category: Role Changes                                   │
│  ─────────────────────────────────────────────────────────────│
│  ✓ T4.1: SUPER_ADMIN can change any role                      │
│  ✓ T4.2: ADMIN can change roles except SUPER_ADMIN            │
│  ✓ T4.3: ADMIN cannot create SUPER_ADMIN → 403                │
│  ✓ T4.4: Role change creates audit log                        │
│  ✓ T4.5: Role change syncs to Clerk metadata                  │
│  ✓ T4.6: Unauthorized Clerk change reverted by webhook        │
│                                                                 │
│  Test Category: Edge Cases                                     │
│  ─────────────────────────────────────────────────────────────│
│  ✓ T5.1: DB offline → Requests fail securely (403)            │
│  ✓ T5.2: User deleted in Clerk → Cannot authenticate          │
│  ✓ T5.3: Concurrent role changes → Last-write-wins OR lock    │
│  ✓ T5.4: Missing AppUser → Auto-created with PARENT           │
│  ✓ T5.5: Webhook replay → Idempotent processing                │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Sample E2E Test

```typescript
describe('Authentication E2E', () => {
  
  test('User signup and role upgrade flow', async () => {
    // 1. User signs up
    const { user, token } = await clerkSignup({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    
    // 2. Verify default role
    const userProfile = await apiGet('/users/me', token);
    expect(userProfile.role).toBe('PARENT');
    
    // 3. Admin upgrades role
    const adminToken = await getAdminToken();
    await apiPost(
      `/admin/role-management/${user.id}/role`,
      { role: 'FOUNDATION' },
      adminToken
    );
    
    // 4. Verify role change
    const updatedProfile = await apiGet('/users/me', token);
    expect(updatedProfile.role).toBe('FOUNDATION');
    
    // 5. Verify audit log
    const auditLogs = await apiGet(
      `/admin/role-management/${user.id}/history`,
      adminToken
    );
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      previousRole: 'PARENT',
      newRole: 'FOUNDATION',
    });
  });
  
  test('Admin cannot escalate to super admin', async () => {
    const adminToken = await getAdminToken(); // Not super admin
    
    const response = await apiPost(
      '/admin/role-management/user_123/role',
      { role: 'SUPER_ADMIN' },
      adminToken
    );
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain(
      'cannot assign SUPER_ADMIN'
    );
  });
});
```

---

## Recommendations

### Production Readiness Checklist

- [x] JWT verification implemented
- [x] Role-based access control
- [x] Database as source of truth
- [x] Webhook signature verification
- [x] Audit logging for role changes
- [ ] **Rate limiting on auth endpoints**
- [ ] **MFA enforcement for admins**
- [ ] **Session timeout configuration**
- [ ] **Redis for webhook idempotency**
- [ ] **Optimistic locking for concurrent updates**
- [ ] **Multi-organization role support**
- [ ] **Comprehensive error monitoring**
- [ ] **Regular security audits**

### Immediate Actions

1. **Add rate limiting** to prevent brute force attacks
2. **Implement MFA** for all admin and super admin accounts
3. **Move webhook tracking** from in-memory Set to Redis
4. **Add version field** to AppUser for optimistic locking
5. **Set up monitoring** for failed auth attempts
6. **Create runbook** for common auth issues
7. **Document** role change procedures

### Future Enhancements

1. **Multi-organization support** - Users can have different roles per organization
2. **Permission-based access** - Fine-grained permissions beyond roles
3. **API key authentication** - For service-to-service communication
4. **Advanced audit** - Track all data access, not just role changes
5. **Self-service role requests** - Users can request role upgrades
6. **Temporary role elevation** - Time-limited role assignments
7. **Role hierarchy** - Inherited permissions from parent roles
