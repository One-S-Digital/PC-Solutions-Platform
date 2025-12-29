# Roles and Permissions

This document details the actual roles, permissions, and access control implemented in the system.

**Last Updated:** Based on codebase analysis

---

## User Roles

The system uses the following roles defined in `api/prisma/schema.prisma`:

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  FOUNDATION
  PRODUCT_SUPPLIER
  SERVICE_PROVIDER
  EDUCATOR
  PARENT
}
```

---

## Role Definitions

### SUPER_ADMIN
**Description:** Highest level administrator with full system access.

**Access:**
- All admin features
- System configuration
- User management (all roles)
- Organization management
- Content moderation
- Subscription management
- System monitoring
- Platform settings
- Audit logs
- All analytics

**Routes (Frontend):**
- `/admin/content-dashboard`
- `/admin/discount-terminations`
- `/admin/system-monitoring`
- `/admin/support`
- `/design-system`

**Routes (Admin Dashboard):**
- All admin routes

**Files:**
- `api/src/auth/guards/roles.guard.ts`
- `api/src/admin/admin.controller.ts`

---

### ADMIN
**Description:** Standard administrator with most administrative privileges.

**Access:**
- User management (except SUPER_ADMIN)
- Organization management
- Content moderation
- Subscription management
- System monitoring (read-only for some features)
- Support ticket management
- Analytics
- Translation management

**Routes (Frontend):**
- `/admin/content-dashboard`
- `/admin/discount-terminations`
- `/admin/system-monitoring`
- `/admin/support`
- `/design-system`

**Routes (Admin Dashboard):**
- Most admin routes (some restricted)

**Files:**
- `api/src/auth/guards/roles.guard.ts`
- `api/src/admin/admin.controller.ts`

---

### FOUNDATION
**Description:** Daycare/childcare organization users.

**Subscription Required:** Yes (BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE tiers)

**Access:**
- Foundation dashboard
- Marketplace (products and services)
- Recruitment (post jobs, view candidates)
- Lead management (parent leads)
- E-Learning (based on subscription tier)
- HR Procedures
- State Policies
- Messaging
- Support tickets
- Calendar events
- Analytics (based on subscription tier)
- Organization profile management

**Routes (Frontend):**
- `/foundation/dashboard`
- `/foundation/orders-appointments`
- `/foundation/leads`
- `/foundation/analytics`
- `/foundation/organisation-profile`
- `/foundation/support`
- `/marketplace`
- `/recruitment`
- `/messages`
- `/hr-procedures`
- `/state-policies`
- `/e-learning` (subscription-gated)
- `/settings`

**Subscription Features:**
- **BASIC:** Marketplace, State Policies, Orders
- **ESSENTIAL:** + Parent Leads (limited), HR Documents
- **PROFESSIONAL:** + Unlimited Parent Leads, Recruitment, E-Learning, Analytics, Team Management
- **ENTERPRISE:** Custom features

**Files:**
- `api/src/dashboard/dashboard.controller.ts`
- `api/src/recruitment/recruitment.controller.ts`
- `api/src/leads/leads.controller.ts`
- `frontend/pages/foundation/`

---

### PRODUCT_SUPPLIER
**Description:** Product suppliers/vendors.

**Subscription Required:** Yes

**Access:**
- Supplier dashboard
- Product management (CRUD)
- Order management
- Inquiry management
- Analytics
- Organization profile management
- Catalog management
- Promo code management
- Messaging
- Support tickets

**Routes (Frontend):**
- `/supplier/dashboard` (subscription-gated)
- `/supplier/orders` (subscription-gated)
- `/supplier/product-listings` (subscription-gated)
- `/supplier/analytics` (subscription-gated)
- `/supplier/organisation-profile`
- `/supplier/support`
- `/marketplace`
- `/messages`
- `/settings`

**Files:**
- `api/src/marketplace/marketplace.controller.ts`
- `api/src/dashboard/dashboard.controller.ts`
- `frontend/pages/supplier/`

---

### SERVICE_PROVIDER
**Description:** Service providers (IT, legal, accounting, training, etc.).

**Subscription Required:** Yes

**Access:**
- Service provider dashboard
- Service management (CRUD)
- Service request management
- Analytics
- Organization profile management
- Messaging
- Support tickets

**Routes (Frontend):**
- `/service-provider/dashboard` (subscription-gated)
- `/service-provider/requests` (subscription-gated)
- `/service-provider/service-listings` (subscription-gated)
- `/service-provider/analytics` (subscription-gated)
- `/service-provider/organisation-profile`
- `/service-provider/support`
- `/settings/service-provider`
- `/messages`
- `/settings`

**Files:**
- `api/src/marketplace/marketplace.controller.ts`
- `api/src/dashboard/dashboard.controller.ts`
- `frontend/pages/service-provider/`

---

### EDUCATOR
**Description:** Educator candidates looking for jobs.

**Subscription Required:** No (free role)

**Access:**
- Educator dashboard
- Job board (view job listings)
- Job applications (apply to jobs)
- Application tracking
- Profile management
- Messaging
- Support tickets
- Public profile viewing

**Routes (Frontend):**
- `/educator/dashboard`
- `/educator/job-board`
- `/educator/applications`
- `/educator/profile`
- `/educator/support`
- `/recruitment`
- `/messages`
- `/settings`

**Files:**
- `api/src/recruitment/recruitment.controller.ts`
- `frontend/pages/educator/`

---

### PARENT
**Description:** Parents looking for childcare.

**Subscription Required:** No (free role)

**Access:**
- Parent dashboard
- Lead submission (requires authenticated parent)
- Enquiry tracking
- Messaging
- Support tickets
- Public organization profile viewing

**Routes (Frontend):**
- `/parent/dashboard`
- `/parent/enquiries`
- `/parent/support`
- `/parent-lead-form`
- `/messages`
- `/settings`

**Files:**
- `api/src/leads/leads.controller.ts`
- `frontend/pages/parent/`
- `frontend/pages/ParentLeadFormPage.tsx`

---

## Authentication Guards

### ClerkAuthGuard
**Purpose:** Validates JWT tokens from Clerk authentication service.

**Implementation:**
- Verifies JWT signature
- Extracts user ID from token
- Loads user context from database
- Sets `req.context` with user information

**Files:**
- `api/src/auth/guards/clerk-auth.guard.ts`

---

### RolesGuard
**Purpose:** Enforces role-based access control.

**Behavior:**
- Checks if route is marked as `@Public()` (bypasses auth)
- Checks if route allows `@AllowPending()` (allows pending users)
- Validates user has required role(s) from `@Roles()` decorator
- Throws `ForbiddenException` if role check fails

**Usage:**
```typescript
@UseGuards(RolesGuard)
@Roles(UserRole.FOUNDATION, UserRole.ADMIN)
@Get('endpoint')
```

**Files:**
- `api/src/auth/guards/roles.guard.ts`

---

### AuthPipelineGuard
**Purpose:** Composite guard that chains Clerk authentication and role authorization.

**Usage:**
```typescript
@UseGuards(AuthPipelineGuard)
@Roles(UserRole.ADMIN)
@Get('endpoint')
```

**Files:**
- `api/src/auth/guards/auth-pipeline.guard.ts`

---

## Permission Decorators

### @Public()
**Purpose:** Marks route as publicly accessible (no authentication required).

**Usage:**
```typescript
@Public()
@Get('health')
```

**Files:**
- `api/src/auth/decorators/public.decorator.ts`

---

### @AllowPending()
**Purpose:** Allows access for users with pending profile (not yet assigned a role).

**Usage:**
```typescript
@AllowPending()
@Post('complete-profile')
```

**Files:**
- `api/src/auth/decorators/allow-pending.decorator.ts`

---

### @Roles(...roles)
**Purpose:** Specifies which roles can access the route.

**Usage:**
```typescript
@Roles(UserRole.FOUNDATION, UserRole.ADMIN)
@Get('dashboard')
```

**Files:**
- `api/src/auth/decorators/roles.decorator.ts`

---

## CASL Policy System

**Purpose:** Fine-grained permission checking using CASL (isomorphic authorization library).

**Implementation:**
- Ability factory creates user abilities based on role
- Policies defined via `@CheckPolicies()` decorator
- PoliciesGuard enforces policy checks

**Files:**
- `api/src/auth/ability/ability.factory.ts`
- `api/src/auth/guards/policies.guard.ts`

---

## Subscription-Based Access Control

**Roles Requiring Subscription:**
- `FOUNDATION`
- `PRODUCT_SUPPLIER`
- `SERVICE_PROVIDER`

**Roles Not Requiring Subscription:**
- `EDUCATOR` (free)
- `PARENT` (free)
- `ADMIN` (system access)
- `SUPER_ADMIN` (system access)

**Implementation:**
- `SubscriptionPaywall` component checks subscription status
- `SubscriptionGatedRoute` wrapper for protected routes
- Feature access checked via `GET /subscriptions/feature/:featureKey`

**Files:**
- `frontend/components/shared/SubscriptionPaywall.tsx`
- `frontend/App.tsx` (SubscriptionGatedRoute)
- `api/src/subscription-management/subscription-management.controller.ts`

---

## Frontend Route Protection

### ProtectedRoute Component
**Purpose:** Wraps routes that require authentication and specific roles.

**Usage:**
```typescript
<ProtectedRoute roles={[UserRole.FOUNDATION]}>
  <FoundationDashboardPage />
</ProtectedRoute>
```

**Files:**
- `frontend/App.tsx`

---

### SubscriptionGatedRoute Component
**Purpose:** Wraps routes that require active subscription.

**Usage:**
```typescript
<SubscriptionGatedRoute roles={[UserRole.FOUNDATION]}>
  <FoundationDashboardPage />
</SubscriptionGatedRoute>
```

**Files:**
- `frontend/App.tsx`

---

## Admin Dashboard Route Protection

### AdminProtectedRoute Component
**Purpose:** Protects admin dashboard routes.

**Access:**
- Requires ADMIN or SUPER_ADMIN role
- Redirects to `/access-denied` if unauthorized

**Files:**
- `admin/src/components/auth/AdminAuthComponents.tsx`

---

## Pending User Handling

**Scenario:** User signs up via Clerk but profile is not yet completed.

**Behavior:**
- User has `PENDING` role status
- Can only access routes marked with `@AllowPending()`
- Redirected to complete profile page
- Cannot access protected features until role is assigned

**Files:**
- `api/src/auth/guards/clerk-auth.guard.ts` (pending user context)
- `frontend/App.tsx` (profile completion flow)

---

## Organization-Based Access

**Implementation:**
- Users can belong to multiple organizations via `UserOrganization` table
- Organization ID stored in request context
- Some features are organization-scoped (e.g., foundation leads)

**Files:**
- `api/prisma/schema.prisma` (UserOrganization model)
- Various controllers check `req.user.organizationId`

---

## Notes

- All role checks are enforced at both API and frontend levels
- Frontend route protection provides UX (redirects), but API is the source of truth
- Subscription checks are additional layer on top of role checks
- Pending users have limited access until profile completion
- Admin routes require both authentication and ADMIN/SUPER_ADMIN role

