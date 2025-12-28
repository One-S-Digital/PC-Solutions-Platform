# Subscription System Verification

## Summary

The subscription system has been thoroughly verified to be **UNIFIED** and operates **identically** for all three subscription-required roles:

- ✅ **FOUNDATION** (Daycares)
- ✅ **PRODUCT_SUPPLIER** (Product Suppliers)
- ✅ **SERVICE_PROVIDER** (Service Providers)

---

## 1. Role Configuration

### Backend (`api/src/subscription-management/subscription-management.controller.ts`)
```typescript
const SUBSCRIPTION_REQUIRED_ROLES: UserRole[] = [
  UserRole.FOUNDATION,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
];
```

### Frontend (`frontend/contexts/SubscriptionContext.tsx`)
```typescript
const SUBSCRIPTION_REQUIRED_ROLES: UserRole[] = [
  UserRole.FOUNDATION,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
];
```

**Status**: ✅ IDENTICAL - Both frontend and backend use the exact same list

---

## 2. Authentication Context

### Auth Guard (`api/src/auth/guards/clerk-auth.guard.ts`)

The auth guard is **completely role-agnostic**:
- Fetches `profileUserId` (User.id) for ALL users
- Fetches `organizationId` for ALL users (via UserOrganization table)
- Sets the same context structure for all roles

```typescript
request.context = {
  userId: payload.sub,
  role: appUser.role,           // Any role
  appUserId: appUser.id,
  profileUserId: userProfile?.id || null,
  organizationId: primaryOrganizationId,  // Fetched for ALL users
  clerkUserId: payload.sub,
};
```

**Status**: ✅ UNIFIED - No role-specific logic in auth

---

## 3. Subscription Lookup

### Unified Method (`api/src/subscription-management/subscription-management.service.ts`)

```typescript
async getActiveSubscriptionForUser(
  userId?: string,
  organizationId?: string,
): Promise<Subscription | null>
```

This method is the **single source of truth** for all subscription checks:

1. First checks by `organizationId` (for organization-based subscriptions)
2. Then checks by `userId` (for user-based subscriptions)
3. Falls back to looking up user's organization if `organizationId` not provided

**Status**: ✅ UNIFIED - Same logic for all roles

---

## 4. API Endpoints

All subscription endpoints consistently include all three roles:

| Endpoint | Roles |
|----------|-------|
| `GET /subscriptions/me` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER + others |
| `POST /subscriptions/request` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |
| `POST /subscriptions/cancel-request` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |
| `GET /subscriptions/requests` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |
| `DELETE /subscriptions/requests/:id` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |
| `GET /subscriptions/feature/:featureKey` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER + others |
| `POST /billing/checkout/*` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |
| `GET /billing/subscription` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |
| `GET /billing/portal` | FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER |

**Status**: ✅ UNIFIED - All endpoints include all three roles

---

## 5. Subscription Plans

Each role has dedicated plans with role-specific features:

| Plan | Role | Price | Trial |
|------|------|-------|-------|
| Basic | FOUNDATION | CHF 69/mo | 14 days |
| Essential | FOUNDATION | CHF 129/mo | 14 days |
| Professional | FOUNDATION | CHF 259/mo | 14 days |
| Suppliers | PRODUCT_SUPPLIER | Enquiry-based | 0 days |
| Service Providers | SERVICE_PROVIDER | Enquiry-based | 0 days |

**Status**: ✅ CORRECT - Each role has its own plans with appropriate features

---

## 6. Admin Dashboard

### User Grouping (`admin/src/pages/Subscriptions.tsx`)
```typescript
const subscribableRoles = [
  UserRole.FOUNDATION, 
  UserRole.PRODUCT_SUPPLIER, 
  UserRole.SERVICE_PROVIDER, 
  UserRole.EDUCATOR, 
  UserRole.PARENT
];
```

### Subscription Creation
```typescript
const subscription = await subscriptionService.createSubscription(apiClient, {
  userId: subscriptionUserId,        // profileUserId (User.id)
  organizationId: subscriptionOrgId, // From user's orgId
  planId: data.planId,
  tier: data.tier,
  durationMonths: duration,
  notes: data.notes,
});
```

**Status**: ✅ UNIFIED - Same creation logic for all roles

### Subscription Lookup Helper
```typescript
const getSubscriptionForUser = (user: User): Subscription | undefined => {
  // Check profileUserId first
  // Then check id (AppUser.id) for backwards compatibility
  // Finally check orgId (organization-based subscription)
};
```

**Status**: ✅ UNIFIED - Same lookup logic for all roles

---

## 7. Frontend Paywall

### SubscriptionPaywall Component (`frontend/components/shared/SubscriptionPaywall.tsx`)

```typescript
// Role-agnostic check
if (!requiresSubscription) {
  return <>{children}</>;
}

if (hasActiveSubscription) {
  return <>{children}</>;
}

// Show paywall
return <PaywallContent ... />;
```

**Status**: ✅ UNIFIED - No role-specific logic in paywall

---

## 8. Billing Controller

All billing endpoints use the same roles:
```typescript
@Roles(UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
```

**Status**: ✅ UNIFIED - All three roles have identical billing access

---

## Key Fixes Applied

### Issue 1: Missing `organizationId` in Auth Context
**Fix**: Auth guard now fetches user's primary organization for ALL users

### Issue 2: ID Mismatch (AppUser.id vs User.id)
**Fix**: 
- API now returns `profileUserId` in users endpoint
- Admin now uses `profileUserId` + `orgId` when creating subscriptions

### Issue 3: Fragmented Subscription Lookup
**Fix**: New unified `getActiveSubscriptionForUser()` method that checks:
1. Organization-based subscription first
2. User-based subscription second
3. User's organization fallback third

---

## Verification Checklist

| Component | Foundation | Product Supplier | Service Provider |
|-----------|------------|------------------|------------------|
| Auth context populated | ✅ | ✅ | ✅ |
| organizationId in context | ✅ | ✅ | ✅ |
| profileUserId in context | ✅ | ✅ | ✅ |
| Unified subscription lookup | ✅ | ✅ | ✅ |
| /subscriptions/me endpoint | ✅ | ✅ | ✅ |
| Subscription request flow | ✅ | ✅ | ✅ |
| Admin subscription creation | ✅ | ✅ | ✅ |
| Frontend paywall | ✅ | ✅ | ✅ |
| Billing endpoints | ✅ | ✅ | ✅ |

---

---

## 9. Dashboard Gating

The entire dashboard is now gated. Users without an active subscription can ONLY access:

### Always Allowed Routes (no subscription required):
| Route | Description |
|-------|-------------|
| `/profile` | View/edit personal profile |
| `/settings/*` | All settings pages including billing |
| `/pricing` | View subscription plans |
| `/foundation/organisation-profile` | Foundation org profile |
| `/foundation/support` | Foundation support |
| `/supplier/organisation-profile` | Supplier org profile |
| `/supplier/support` | Supplier support |
| `/supplier/company-profile` | Supplier company profile → settings |
| `/service-provider/organisation-profile` | Service Provider org profile |
| `/service-provider/support` | Service Provider support |
| `/service-provider/company-profile` | Service Provider settings |

### Subscription-Gated Routes (require active subscription):
| Route Category | Foundation | Product Supplier | Service Provider |
|---------------|------------|------------------|------------------|
| Dashboard | ✅ | ✅ | ✅ |
| Orders/Requests | ✅ | ✅ | ✅ |
| Product/Service Listings | - | ✅ | ✅ |
| Leads | ✅ | - | - |
| Analytics | ✅ | ✅ | ✅ |
| Marketplace | ✅ | - | - |
| Recruitment | ✅ | - | - |
| HR Procedures | ✅ | - | - |
| State Policies | ✅ | - | - |
| E-Learning | ✅ | - | - |
| Partners Directory | ✅ | ✅ | ✅ |
| Messages | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |

---

## Conclusion

The subscription system is now **fully unified** across all three business roles. There is:

- **NO role-specific logic** in the core subscription flow
- **SAME authentication context** for all roles
- **SAME subscription lookup method** for all roles
- **SAME admin creation flow** for all roles
- **SAME frontend paywall behavior** for all roles
- **CONSISTENT route gating** - only profile, settings, and support are allowed without subscription

The only role-specific elements are:
1. Plan availability (each role has its own plans)
2. Foundation-specific "tier" selector in admin UI (cosmetic, for Foundation pricing tiers)
3. Role-specific feature routes (e.g., Foundation has recruitment, suppliers have product listings)
