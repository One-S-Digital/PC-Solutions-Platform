# Authentication System Investigation

## Table of Contents
1. [System Overview](#system-overview)
2. [Signup Flow](#signup-flow)
3. [Login Flow](#login-flow)
4. [Role Management](#role-management)
5. [Source of Truth](#source-of-truth)
6. [Backend Authentication Pipeline](#backend-authentication-pipeline)
7. [Security Analysis](#security-analysis)

---

## System Overview

The platform uses a **multi-layered authentication system** with Clerk as the identity provider and a custom role-based access control (RBAC) system.

### Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Frontend   │     │    Admin     │     │   Backend    │   │
│  │  (React +    │────▶│  (React +    │────▶│  (NestJS +   │   │
│  │   Clerk UI)  │     │  Clerk Hooks)│     │   Prisma)    │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                     │                     │           │
│         └─────────────────────┴─────────────────────┘           │
│                               │                                 │
│                               ▼                                 │
│                     ┌──────────────────┐                        │
│                     │  Clerk Service   │                        │
│                     │  (Identity SaaS) │                        │
│                     └──────────────────┘                        │
│                               │                                 │
│                               ▼                                 │
│                    ┌────────────────────┐                       │
│                    │   PostgreSQL DB    │                       │
│                    │  (Source of Truth) │                       │
│                    └────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Layers

1. **Identity Layer** - Clerk handles authentication
2. **Application Layer** - Frontend/Admin manage sessions
3. **Authorization Layer** - Backend validates tokens and roles
4. **Data Layer** - Database stores user roles and metadata

---

## Signup Flow

### Frontend Signup Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND SIGNUP JOURNEY                          │
└────────────────────────────────────────────────────────────────────┘

User                Frontend              Clerk               Backend
  │                    │                    │                    │
  │  Visit /signup     │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │                    │                    │
  │  SignUp Component  │                    │                    │
  │◀───────────────────│                    │                    │
  │  (Clerk UI)        │                    │                    │
  │                    │                    │                    │
  │  Fill Form +       │                    │                    │
  │  Submit            │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │  Create User       │                    │
  │                    ├───────────────────▶│                    │
  │                    │  (Email, Password) │                    │
  │                    │                    │                    │
  │                    │   User Created +   │                    │
  │                    │   Session Token    │                    │
  │                    │◀───────────────────┤                    │
  │                    │                    │                    │
  │                    │                    │  Webhook:          │
  │                    │                    │  user.created      │
  │                    │                    ├───────────────────▶│
  │                    │                    │  {                 │
  │                    │                    │    clerkId,        │
  │                    │                    │    email,          │
  │                    │                    │    firstName,      │
  │                    │                    │    lastName        │
  │                    │                    │  }                 │
  │                    │                    │                    │
  │                    │                    │  Create AppUser    │
  │                    │                    │  role: PARENT      │
  │                    │                    │  (default)         │
  │                    │                    │◀───────────────────┤
  │                    │                    │                    │
  │                    │                    │  Sync to Clerk     │
  │                    │                    │  publicMetadata    │
  │                    │                    │◀───────────────────┤
  │                    │                    │  {role: "PARENT"}  │
  │                    │                    │                    │
  │  Redirect to       │                    │                    │
  │  /dashboard        │                    │                    │
  │◀───────────────────│                    │                    │
  │                    │                    │                    │
```

### Admin Signup Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     ADMIN SIGNUP JOURNEY                            │
└────────────────────────────────────────────────────────────────────┘

Admin User         Admin UI           Clerk Hooks         Backend
  │                    │                    │                    │
  │  Visit /signup     │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │                    │                    │
  │  Custom Form       │                    │                    │
  │  (Step 1: Info)    │                    │                    │
  │◀───────────────────│                    │                    │
  │                    │                    │                    │
  │  Submit Step 1     │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │                    │                    │
  │  Step 2: Account   │                    │                    │
  │◀───────────────────│                    │                    │
  │                    │                    │                    │
  │  Submit Form       │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │  signUp.create()   │                    │
  │                    ├───────────────────▶│                    │
  │                    │  {                 │                    │
  │                    │    email,          │                    │
  │                    │    password,       │                    │
  │                    │    firstName,      │                    │
  │                    │    lastName        │                    │
  │                    │  }                 │                    │
  │                    │                    │                    │
  │                    │  Session Created   │                    │
  │                    │◀───────────────────┤                    │
  │                    │                    │                    │
  │                    │                    │  Webhook           │
  │                    │                    ├───────────────────▶│
  │                    │                    │                    │
  │                    │                    │  Create AppUser    │
  │                    │                    │  role: PARENT      │
  │                    │                    │  (initial)         │
  │                    │                    │◀───────────────────┤
  │                    │                    │                    │
  │  ⚠️ Note: Admin must manually update role via Clerk Dashboard │
  │     or role management API to SUPER_ADMIN or ADMIN           │
  │                    │                    │                    │
```

### Key Signup Details

**Frontend:**
- Uses Clerk's `<SignUp />` component
- Fully managed by Clerk (no custom form logic)
- Supports email/password and OAuth (Google, Facebook)
- After signup URL: `/dashboard`

**Admin:**
- Uses custom forms with `useSignUp()` hook
- 2-step process (personal info → account creation)
- Admin role must be set manually after account creation
- Initial role: `PARENT` (default for all new users)

**Backend Webhook Handler:**
```typescript
// api/src/webhooks/clerk-webhook.controller.ts

async handleUserCreated(data: any) {
  const clerkId = data.id;
  const intendedRole = data.unsafe_metadata?.role || 'PARENT';
  
  // Create in database
  const appUser = await prisma.appUser.create({
    clerkId,
    email: data.email_addresses[0]?.email_address,
    role: validRole, // Always PARENT unless specified
  });
  
  // Sync role back to Clerk publicMetadata
  await clerk.users.updateUser(clerkId, {
    publicMetadata: { role: appUser.role }
  });
}
```

---

## Login Flow

### Frontend Login Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      FRONTEND LOGIN JOURNEY                         │
└────────────────────────────────────────────────────────────────────┘

User               Frontend              Clerk              Backend
  │                    │                    │                    │
  │  Visit /login      │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │                    │                    │
  │  SignIn Component  │                    │                    │
  │◀───────────────────│                    │                    │
  │  (Clerk UI)        │                    │                    │
  │                    │                    │                    │
  │  Enter Email +     │                    │                    │
  │  Password          │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │  Authenticate      │                    │
  │                    ├───────────────────▶│                    │
  │                    │                    │                    │
  │                    │  ✅ Valid          │                    │
  │                    │  JWT Token         │                    │
  │                    │◀───────────────────┤                    │
  │                    │  {                 │                    │
  │                    │    sub: clerkId,   │                    │
  │                    │    email,          │                    │
  │                    │    ...metadata     │                    │
  │                    │  }                 │                    │
  │                    │                    │                    │
  │  Store Token       │                    │                    │
  │  in localStorage   │                    │                    │
  │◀───────────────────│                    │                    │
  │                    │                    │                    │
  │  Sync User Data    │                    │                    │
  │  (AuthProvider)    │                    │                    │
  │                    │  GET /users/me     │                    │
  │                    │  (with JWT)        │                    │
  │                    ├────────────────────┼───────────────────▶│
  │                    │                    │                    │
  │                    │                    │  Verify JWT        │
  │                    │                    │  Extract clerkId   │
  │                    │                    │  Load AppUser      │
  │                    │                    │◀───────────────────┤
  │                    │                    │                    │
  │                    │  User Data         │                    │
  │                    │  {                 │                    │
  │                    │    id, email,      │                    │
  │                    │    role, ...       │                    │
  │                    │  }                 │                    │
  │                    │◀────────────────────────────────────────┤
  │                    │                    │                    │
  │  Redirect to       │                    │                    │
  │  Role-Based        │                    │                    │
  │  Dashboard         │                    │                    │
  │◀───────────────────│                    │                    │
```

### Admin Login Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                       ADMIN LOGIN JOURNEY                           │
└────────────────────────────────────────────────────────────────────┘

Admin              Admin UI           Clerk Hooks         Backend
  │                    │                    │                    │
  │  Visit /login      │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │                    │                    │
  │  Custom Login Form │                    │                    │
  │◀───────────────────│                    │                    │
  │                    │                    │                    │
  │  Enter Credentials │                    │                    │
  ├───────────────────▶│                    │                    │
  │                    │  signIn.create()   │                    │
  │                    ├───────────────────▶│                    │
  │                    │  {                 │                    │
  │                    │    identifier:     │                    │
  │                    │      email,        │                    │
  │                    │    password        │                    │
  │                    │  }                 │                    │
  │                    │                    │                    │
  │                    │  Session + Token   │                    │
  │                    │◀───────────────────┤                    │
  │                    │                    │                    │
  │  Check Role        │                    │                    │
  │  (AdminProtected   │                    │                    │
  │   Route)           │                    │                    │
  │                    │                    │                    │
  │  user.publicMeta   │                    │                    │
  │  data.role         │                    │                    │
  │                    │                    │                    │
  │  ✅ SUPER_ADMIN    │                    │                    │
  │  or ADMIN?         │                    │                    │
  │◀───────────────────│                    │                    │
  │   YES              │                    │                    │
  │  ────────▶         │                    │                    │
  │  Allow Access      │                    │                    │
  │                    │                    │                    │
  │  Redirect /dashboard                    │                    │
  │◀───────────────────│                    │                    │
  │                    │                    │                    │
  │   NO               │                    │                    │
  │  ────────▶         │                    │                    │
  │  Redirect to       │                    │                    │
  │  /access-denied    │                    │                    │
  │◀───────────────────│                    │                    │
```

### Key Login Details

**Frontend:**
- Uses Clerk's `<SignIn />` component
- Token stored in Clerk's session (managed automatically)
- `AuthProvider` syncs user data from backend on load
- Role-based dashboard redirect

**Admin:**
- Custom login form with `useSignIn()` hook
- Role check via `user.publicMetadata.role`
- Only `SUPER_ADMIN` and `ADMIN` roles allowed
- Non-admins redirected to `/access-denied`

**Session Management:**
```typescript
// Frontend: frontend/providers/AuthProvider.tsx

useEffect(() => {
  const syncUser = async () => {
    if (!clerkUser) {
      setCurrentUser(null);
      return;
    }

    try {
      // Fetch from backend
      const backendUser = await userService.getCurrentUser();
      setCurrentUser(backendUser);
    } catch (error) {
      // Fallback to Clerk data
      const fallbackUser = {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: UserRole.PARENT,
        ...
      };
      setCurrentUser(fallbackUser);
    }
  };

  syncUser();
}, [clerkUser]);
```

---

## Role Management

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      ROLE HIERARCHY                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SUPER_ADMIN (Highest)                                      │
│       │                                                      │
│       ├─ Full system access                                 │
│       ├─ User management                                    │
│       ├─ Role assignment                                    │
│       └─ Platform configuration                             │
│                                                              │
│  ADMIN                                                       │
│       │                                                      │
│       ├─ Content moderation                                 │
│       ├─ User support                                       │
│       └─ Limited configuration                              │
│                                                              │
│  FOUNDATION (Daycare Organization)                          │
│       │                                                      │
│       ├─ Post job listings                                  │
│       ├─ Manage parent leads                                │
│       ├─ Order products/services                            │
│       └─ Access learning resources                          │
│                                                              │
│  PRODUCT_SUPPLIER                                            │
│       │                                                      │
│       ├─ Manage product catalog                             │
│       ├─ View/process orders                                │
│       └─ Analytics dashboard                                │
│                                                              │
│  SERVICE_PROVIDER                                            │
│       │                                                      │
│       ├─ Manage service offerings                           │
│       ├─ View/process requests                              │
│       └─ Booking management                                 │
│                                                              │
│  EDUCATOR                                                    │
│       │                                                      │
│       ├─ Browse job listings                                │
│       ├─ Apply for positions                                │
│       └─ Manage profile/documents                           │
│                                                              │
│  PARENT (Lowest privilege)                                  │
│       │                                                      │
│       ├─ Submit child enrollment leads                      │
│       ├─ View responses from daycares                       │
│       └─ Basic profile management                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Role Definition

**Database Schema:**
```prisma
// api/prisma/schema.prisma

enum UserRole {
  SUPER_ADMIN       // Full platform control
  ADMIN             // Platform management
  FOUNDATION        // Daycare/Crèche
  PRODUCT_SUPPLIER  // Supplies vendor
  SERVICE_PROVIDER  // Service vendor
  EDUCATOR          // Job seeker/educator
  PARENT            // Parent seeking daycare
}

model AppUser {
  id        String   @id @default(uuid())
  clerkId   String   @unique
  email     String?  
  role      UserRole @default(PARENT)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**TypeScript Enum:**
```typescript
// frontend/types.ts & api types

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}
```

### How Roles Are Set

```
┌─────────────────────────────────────────────────────────────┐
│                  ROLE ASSIGNMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

Method 1: Default Assignment (Signup)
──────────────────────────────────────
  New User Signup
       │
       ▼
  Clerk Webhook (user.created)
       │
       ▼
  Create AppUser with role: PARENT
       │
       ▼
  Sync to Clerk publicMetadata
       │
       ▼
  {publicMetadata: {role: "PARENT"}}


Method 2: Manual Assignment (Admin Dashboard)
──────────────────────────────────────────────
  Admin Access
       │
       ▼
  Navigate to Users Management
       │
       ▼
  Select User → Change Role
       │
       ▼
  POST /admin/role-management/change-role
       │
       ▼
  Backend validates admin permissions
       │
       ▼
  Update AppUser.role in database
       │
       ▼
  Sync to Clerk publicMetadata
       │
       ▼
  Create audit log entry
       │
       ▼
  Role changed successfully


Method 3: Clerk Dashboard (Manual Override)
────────────────────────────────────────────
  Super Admin Access
       │
       ▼
  Clerk Dashboard → Users
       │
       ▼
  Select User → Edit Metadata
       │
       ▼
  Update publicMetadata.role
       │
       ▼
  Clerk Webhook (user.updated)
       │
       ▼
  Backend syncs DB with Clerk
       │
       ▼
  If roles differ, DB takes precedence
       │
       ▼
  Revert unauthorized changes


Method 4: API Role Management Endpoint
───────────────────────────────────────
  Authorized Request
       │
       ▼
  POST /admin/role-management/:clerkId/role
  Body: {role: "FOUNDATION"}
       │
       ▼
  Validate requester is SUPER_ADMIN
       │
       ▼
  Update database first
       │
       ▼
  Sync to Clerk
       │
       ▼
  Create audit trail
```

### Role Assignment API

```typescript
// api/src/admin/role-management/role-management.controller.ts

@Controller('admin/role-management')
@UseGuards(AuthPipelineGuard)
export class RoleManagementController {
  
  @Post(':clerkId/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async changeUserRole(
    @Param('clerkId') clerkId: string,
    @Body() dto: { role: UserRole },
    @Req() req: any
  ) {
    // Prevent admins from creating super admins
    if (req.context.role === UserRole.ADMIN 
        && dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Admins cannot assign SUPER_ADMIN role'
      );
    }

    // Update in database (source of truth)
    const appUser = await this.prisma.appUser.update({
      where: { clerkId },
      data: { role: dto.role },
    });

    // Sync to Clerk
    await this.clerk.users.updateUser(clerkId, {
      publicMetadata: { role: dto.role }
    });

    // Create audit log
    await this.prisma.appUserRoleHistory.create({
      data: {
        userId: appUser.id,
        previousRole: appUser.role,
        newRole: dto.role,
        changedBy: req.context.userId,
        reason: dto.reason,
      },
    });

    return { success: true };
  }
}
```

---

## Source of Truth

### Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                      SOURCE OF TRUTH HIERARCHY                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  1. PostgreSQL Database (AppUser table)                     │   │
│  │     ✓ Primary source of truth for user roles               │   │
│  │     ✓ Authoritative for permissions                        │   │
│  │     ✓ Enforced by backend API                              │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  2. Clerk publicMetadata                                    │   │
│  │     ✓ Synced FROM database                                 │   │
│  │     ✓ Included in JWT tokens                               │   │
│  │     ✓ Used for client-side role display                    │   │
│  │     ✓ NOT authoritative (read-only for clients)            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  3. Frontend State (currentUser)                            │   │
│  │     ✓ Derived from backend API                             │   │
│  │     ✓ UI display purposes only                             │   │
│  │     ✓ Never trusted for authorization                      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Truth Enforcement

**Backend Guard Flow:**
```typescript
// api/src/auth/guards/clerk-auth.guard.ts

async canActivate(context: ExecutionContext): Promise<boolean> {
  // 1. Verify JWT token with Clerk
  const payload = await verifyToken(token);
  
  // 2. Fetch AppUser from DATABASE (source of truth)
  let appUser = await this.prisma.appUser.findUnique({ 
    where: { clerkId: payload.sub } 
  });
  
  // 3. Use database role, NOT token role
  request.context = {
    userId: payload.sub,
    role: appUser.role,  // ← Database is authoritative
    appUserId: appUser.id,
  };
  
  return true;
}
```

**Role Verification Hierarchy:**
```
Request → ClerkAuthGuard → RolesGuard → Controller
            │                  │
            ▼                  ▼
    Verify JWT Token    Check DB Role
            │                  │
            ▼                  ▼
    Extract clerkId     Compare with
            │           Required Roles
            ▼                  │
    Load AppUser              ▼
      from DB          Allow/Deny Access
            │
            ▼
    Set req.context
    {role: DB.role}
```

### Synchronization Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                   ROLE SYNCHRONIZATION MECHANISM                    │
└────────────────────────────────────────────────────────────────────┘

Database          Clerk           Frontend
   │                │                 │
   │  Role Changed  │                 │
   │  (API Update)  │                 │
   │                │                 │
   ├───────────────▶│                 │
   │  Sync to       │                 │
   │  publicMetadata│                 │
   │                │                 │
   │                │  Webhook        │
   │                │  user.updated   │
   │◀───────────────┤                 │
   │  Verify &      │                 │
   │  Reconcile     │                 │
   │                │                 │
   │                │  User Logs In   │
   │                │◀────────────────┤
   │                │                 │
   │                │  JWT Token      │
   │                │  (with metadata)│
   │                ├────────────────▶│
   │                │                 │
   │  API Request   │                 │
   │  GET /users/me │                 │
   │◀────────────────────────────────┤
   │  (with JWT)    │                 │
   │                │                 │
   │  Return User   │                 │
   │  {role: DB}    │                 │
   ├─────────────────────────────────▶│
   │                │                 │
   │                │  Display        │
   │                │  Role-Based UI  │
   │                │◀────────────────┤
```

### Conflict Resolution

**Scenario: Roles Mismatch**

```typescript
// Webhook handler detects mismatch
async handleUserUpdated(data: any) {
  const publicRole = data.public_metadata?.role;
  const appUser = await this.prisma.appUser.findUnique({
    where: { clerkId: data.id }
  });

  // Database role differs from Clerk metadata
  if (publicRole && publicRole !== appUser.role) {
    this.logger.warn(
      `Reverting unauthorized role change: ${publicRole} -> ${appUser.role}`
    );

    // DATABASE WINS - revert Clerk to match DB
    await this.clerk.users.updateUser(data.id, {
      publicMetadata: {
        ...data.public_metadata,
        role: appUser.role  // ← Enforce DB truth
      },
    });
  }
}
```

**Key Principle:**
> **Database is ALWAYS the source of truth. Clerk metadata is a cached copy for JWT inclusion.**

---

## Backend Authentication Pipeline

### Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                  BACKEND REQUEST AUTHENTICATION FLOW                  │
└──────────────────────────────────────────────────────────────────────┘

Client Request
     │
     │  Authorization: Bearer <JWT>
     │
     ▼
┌────────────────────────────────────┐
│   1. ClerkAuthGuard                │
│   ───────────────────────────────  │
│   • Extract JWT from header        │
│   • Verify signature with Clerk    │
│   • Check issuer & authorized      │
│     parties (azp)                  │
│   • Validate expiration            │
│   • Decode payload                 │
└────────────────────────────────────┘
     │
     │  ✅ Token Valid
     │  payload.sub = clerkId
     │
     ▼
┌────────────────────────────────────┐
│   2. Load User from Database       │
│   ───────────────────────────────  │
│   • Query AppUser by clerkId       │
│   • Get user role from DB          │
│   • Set request.context:           │
│     {                              │
│       userId: clerkId,             │
│       role: dbUser.role,           │
│       appUserId: dbUser.id         │
│     }                              │
└────────────────────────────────────┘
     │
     │  request.context populated
     │
     ▼
┌────────────────────────────────────┐
│   3. RolesGuard                    │
│   ───────────────────────────────  │
│   • Read @Roles() decorator        │
│   • Extract request.context.role   │
│   • Check if role in allowed list  │
│   • Allow/Deny access              │
└────────────────────────────────────┘
     │
     │  ✅ Authorized
     │
     ▼
┌────────────────────────────────────┐
│   4. Controller Method             │
│   ───────────────────────────────  │
│   • Business logic executes        │
│   • Access to req.context          │
│   • Return response                │
└────────────────────────────────────┘
     │
     ▼
Response to Client
```

### Guard Implementation Details

**1. ClerkAuthGuard**
```typescript
// Location: api/src/auth/guards/clerk-auth.guard.ts

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.slice(7); // Remove "Bearer "
    
    // Verify JWT with Clerk
    const payload = await verifyToken(token, {
      authorizedParties: this.authorizedParties,
      issuer: this.issuer,
      jwtKey: this.jwtKey, // Optional offline verification
    });
    
    // Load user from database
    let appUser = await this.prisma.appUser.findUnique({
      where: { clerkId: payload.sub }
    });
    
    // Create if missing (auto-provision)
    if (!appUser) {
      appUser = await this.prisma.appUser.create({
        data: { clerkId: payload.sub, role: 'PARENT' }
      });
    }
    
    // Populate request context
    request.context = {
      userId: payload.sub,
      role: appUser.role,      // ← Database role
      appUserId: appUser.id,
    };
    
    return true;
  }
}
```

**2. RolesGuard**
```typescript
// Location: api/src/auth/guards/roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    
    // No roles required = allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const userContext = request.context;
    
    // Check if user has required role
    const hasRole = requiredRoles.includes(userContext.role);
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
```

**3. Usage in Controllers**
```typescript
// Example: Admin controller

@Controller('admin')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AdminController {
  
  @Get('users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getAllUsers(@Req() req: any) {
    // Only SUPER_ADMIN and ADMIN can access
    const { userId, role, appUserId } = req.context;
    
    // Business logic
    return this.userService.findAll();
  }
  
  @Post('content')
  @Roles(UserRole.SUPER_ADMIN)
  async createContent(@Req() req: any, @Body() dto: any) {
    // Only SUPER_ADMIN can create content
    return this.contentService.create(dto);
  }
}
```

### JWT Token Structure

**Clerk JWT Payload:**
```json
{
  "azp": "https://your-frontend.com",
  "exp": 1735689600,
  "iat": 1735603200,
  "iss": "https://your-instance.clerk.accounts.dev",
  "nbf": 1735603190,
  "sid": "sess_abc123...",
  "sub": "user_xyz789...",
  
  "publicMetadata": {
    "role": "FOUNDATION"
  },
  
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

**Token Verification:**
```typescript
// Clerk verifies:
// 1. Signature (RSA/HMAC with Clerk's keys)
// 2. Expiration (exp claim)
// 3. Not before (nbf claim)
// 4. Issuer (iss claim)
// 5. Authorized party (azp claim)
```

### API Request Flow Example

```
┌──────────────────────────────────────────────────────────────────┐
│  Example: GET /marketplace/products (Foundation User)            │
└──────────────────────────────────────────────────────────────────┘

1. Request:
   GET /marketplace/products
   Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

2. ClerkAuthGuard:
   ✓ Token signature valid
   ✓ Issuer: https://instance.clerk.accounts.dev
   ✓ Not expired
   ✓ clerkId extracted: user_2abc123xyz

3. Load User:
   AppUser.findUnique({ where: { clerkId: 'user_2abc123xyz' }})
   → role: FOUNDATION

4. Set Context:
   request.context = {
     userId: 'user_2abc123xyz',
     role: 'FOUNDATION',
     appUserId: 'uuid-456'
   }

5. RolesGuard:
   @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
   ✓ FOUNDATION in allowed roles
   ✓ Access granted

6. Controller:
   async getProducts(@Req() req) {
     // req.context.role === 'FOUNDATION'
     return this.marketplaceService.getProducts();
   }

7. Response:
   200 OK
   [{ id: 1, title: "Product A", ... }, ...]
```

---

## Security Analysis

### Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Transport Security                                   │
│  ─────────────────────────────────────────────────────────────│
│  ✓ HTTPS/TLS encryption                                       │
│  ✓ Secure cookie flags (HttpOnly, Secure, SameSite)          │
│  ✓ CORS policies                                              │
│                                                                 │
│  Layer 2: Identity & Authentication                            │
│  ─────────────────────────────────────────────────────────────│
│  ✓ Clerk handles password hashing (bcrypt)                    │
│  ✓ Email verification                                          │
│  ✓ OAuth 2.0 for social logins                                │
│  ✓ Multi-factor authentication (MFA) available                │
│  ✓ Session management                                          │
│                                                                 │
│  Layer 3: Token Security                                       │
│  ─────────────────────────────────────────────────────────────│
│  ✓ JWT signed with RS256 (RSA + SHA-256)                      │
│  ✓ Short-lived tokens (configurable expiry)                   │
│  ✓ Token rotation on refresh                                  │
│  ✓ Signature verification on every request                    │
│  ✓ Issuer & audience validation                               │
│                                                                 │
│  Layer 4: Authorization                                        │
│  ─────────────────────────────────────────────────────────────│
│  ✓ Role-based access control (RBAC)                           │
│  ✓ Database as source of truth                                │
│  ✓ Guard-based route protection                               │
│  ✓ Server-side role enforcement                               │
│                                                                 │
│  Layer 5: Data Protection                                      │
│  ─────────────────────────────────────────────────────────────│
│  ✓ Input validation & sanitization                            │
│  ✓ SQL injection prevention (Prisma ORM)                      │
│  ✓ XSS protection (React auto-escaping)                       │
│  ✓ CSRF tokens (where applicable)                             │
│                                                                 │
│  Layer 6: Audit & Monitoring                                   │
│  ─────────────────────────────────────────────────────────────│
│  ✓ Role change audit logs                                     │
│  ✓ Webhook event tracking                                     │
│  ✓ Failed auth attempt logging                                │
│  ✓ Security event monitoring                                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Attack Prevention

**1. Token Theft Prevention:**
- Tokens stored in Clerk session (not localStorage for sensitive data)
- Short expiration times
- Refresh token rotation
- Device fingerprinting (Clerk feature)

**2. Role Escalation Prevention:**
```typescript
// Guards enforce database roles
// Client cannot modify their own role

// Admin creating super admin is blocked
if (req.context.role === UserRole.ADMIN 
    && dto.role === UserRole.SUPER_ADMIN) {
  throw new ForbiddenException(
    'Admins cannot assign SUPER_ADMIN role'
  );
}

// Database reverts unauthorized Clerk changes
if (publicRole !== appUser.role) {
  await clerk.users.updateUser(clerkId, {
    publicMetadata: { role: appUser.role }
  });
}
```

**3. Replay Attack Prevention:**
- Token expiration (exp claim)
- Not-before validation (nbf claim)
- Webhook idempotency tracking
```typescript
const processedEvents = new Set<string>();

if (processedEvents.has(svixId)) {
  return res.status(204).end(); // Already processed
}
```

**4. Man-in-the-Middle (MITM) Prevention:**
- TLS 1.3 encryption
- Certificate pinning (optional)
- HSTS headers
- Secure token transmission

### Audit Trail

```typescript
// Role change tracking
model AppUserRoleHistory {
  id           String   @id @default(uuid())
  userId       String
  previousRole UserRole
  newRole      UserRole
  changedBy    String   // Admin who made the change
  reason       String?  // Optional reason for change
  createdAt    DateTime @default(now())
  
  user AppUser @relation(fields: [userId], references: [id])
}

// Every role change is logged
await prisma.appUserRoleHistory.create({
  data: {
    userId: appUser.id,
    previousRole: currentRole,
    newRole: newRole,
    changedBy: req.context.userId,
    reason: dto.reason,
  },
});
```

### Recommendations

✅ **Already Implemented:**
- JWT-based authentication
- Role-based access control
- Database as source of truth
- Webhook signature verification
- Audit logging for role changes

⚠️ **Recommended Additions:**
1. **Rate Limiting**: Prevent brute force attacks
2. **MFA Enforcement**: For admin accounts
3. **IP Whitelisting**: For admin panel (optional)
4. **Session Timeout**: Configurable idle timeouts
5. **Redis for Event Tracking**: Replace in-memory Set
6. **Security Headers**: Helmet middleware
7. **API Key Rotation**: Regular rotation policy
8. **Penetration Testing**: Regular security audits

---

## Summary

### Key Takeaways

1. **Clerk = Identity Provider** - Handles authentication, not authorization
2. **Database = Source of Truth** - All roles stored and enforced here
3. **Metadata = Cache** - Clerk publicMetadata is a synced copy
4. **Guards = Gatekeepers** - Backend validates every request
5. **Audit = Accountability** - All role changes tracked

### Authentication Flow (Simplified)

```
User Signs Up/In
    ↓
Clerk Authenticates
    ↓
JWT Token Issued
    ↓
Backend Verifies Token
    ↓
Loads Role from Database
    ↓
Checks Against Required Roles
    ↓
Grants/Denies Access
```

### Role Assignment (Simplified)

```
New User → Default: PARENT
    ↓
Admin Changes Role → Database Updated
    ↓
Synced to Clerk Metadata
    ↓
JWT Includes Role (cached)
    ↓
Backend ALWAYS checks Database
```

This architecture ensures:
- ✅ Secure authentication via industry-standard provider
- ✅ Flexible role management
- ✅ Clear separation of concerns
- ✅ Single source of truth (database)
- ✅ Comprehensive audit trail
- ✅ Defense in depth security
