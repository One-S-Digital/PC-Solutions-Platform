# Marketplace Profile Visibility Requirements

This document outlines the requirements for different profile types to be visible on the marketplace page.

## Overview

The marketplace page (`/marketplace`) displays two types of organizations:
1. **Product Suppliers** - Organizations that sell products
2. **Service Providers** - Organizations that provide services

**Foundations are NOT listed on the marketplace** - they are the consumers who browse and interact with suppliers and service providers.

---

## Product Supplier & Service Provider Visibility Requirements

For a **Product Supplier** or **Service Provider** profile to be visible on the marketplace, the following conditions must ALL be met:

### 1. Organization Type

The organization must be of the correct type:
- `OrganizationType.PRODUCT_SUPPLIER` for the "Product Suppliers" tab
- `OrganizationType.SERVICE_PROVIDER` for the "Service Providers" tab

### 2. Active Status

The organization must have `isActive: true` in the database.

**Code reference:** The frontend marketplace service passes `isActive=true` when fetching organizations:
```typescript
// frontend/services/marketplaceService.ts
params.append('isActive', 'true');
```

### 3. Active Subscription (Required!)

**This is the most critical requirement.** The organization must have at least ONE active subscription that meets one of these conditions:

| Status | Requirement |
|--------|-------------|
| `ACTIVE` | `currentPeriodEnd` is null OR in the future (greater than current time) |
| `TRIAL` | `trialEnd` is null OR in the future (greater than current time) |
| `GRACE_PERIOD` | `gracePeriodEnd` is null OR in the future (greater than current time) |

**Code reference:** This is enforced in the `marketplaceActiveSubscriptionWhere` method:

```typescript
// api/src/compat/compat.controller.ts (lines 37-54)
private marketplaceActiveSubscriptionWhere(now: Date): Prisma.SubscriptionWhereInput {
  return {
    OR: [
      {
        status: SubscriptionStatus.ACTIVE,
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      {
        status: SubscriptionStatus.TRIAL,
        OR: [{ trialEnd: null }, { trialEnd: { gt: now } }],
      },
      {
        status: SubscriptionStatus.GRACE_PERIOD,
        OR: [{ gracePeriodEnd: null }, { gracePeriodEnd: { gt: now } }],
      },
    ],
  };
}
```

### Subscription Check for Marketplace Listing

When fetching organizations for the marketplace, the API enforces subscription requirements:

```typescript
// api/src/compat/compat.controller.ts (lines 437-446)
if (
  orgType === OrganizationType.PRODUCT_SUPPLIER ||
  orgType === OrganizationType.SERVICE_PROVIDER
) {
  const now = new Date();
  where.subscriptions = {
    some: this.marketplaceActiveSubscriptionWhere(now),
  };
}
```

---

## Individual Profile Viewing (Partner Detail Page)

When viewing a specific organization's profile (`/partner/:id`), the subscription requirement can be **bypassed** in these cases:

1. **Admin/Super Admin Users**: Users with `ADMIN` or `SUPER_ADMIN` role can view any profile
2. **Organization Members**: Users belonging to the organization can view their own profile

**Code reference:**
```typescript
// api/src/compat/compat.controller.ts (lines 56-63)
private canBypassMarketplaceSubscriptionGate(user: RequestUser | undefined, organizationId: string): boolean {
  const role = user?.role;
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return true;
  
  const userOrgId = user?.organizationId || user?.orgId;
  return Boolean(userOrgId && userOrgId === organizationId);
}
```

---

## Foundation Profile Visibility

**Foundations are NOT displayed on the marketplace page.**

Foundations are the **consumers** of the marketplace. They can:
- Browse the marketplace to view suppliers and service providers
- View individual supplier/service provider profiles
- Add products to their cart
- Submit service requests
- Send messages to suppliers/service providers
- Apply promo codes from suppliers

### Foundation Role on Marketplace

Foundations interact with the marketplace through:

1. **Product ordering**: Add products to cart from suppliers
2. **Service requests**: Request services from service providers
3. **Messaging**: Contact suppliers/service providers directly
4. **Promo codes**: Apply discount codes from vendors

---

## Products and Services Visibility

Within a visible organization profile, individual products and services also have their own visibility requirement:

### Products
- Must have `isActive: true` to be shown on the supplier's profile page

### Services
- Must have `isActive: true` to be shown on the service provider's profile page

---

## Summary Checklist

### For a Product Supplier to appear on the Marketplace:

- [ ] `organization.type` = `PRODUCT_SUPPLIER`
- [ ] `organization.isActive` = `true`
- [ ] Has at least one subscription with:
  - [ ] `status` = `ACTIVE`, `TRIAL`, or `GRACE_PERIOD`
  - [ ] Corresponding end date is null or in the future

### For a Service Provider to appear on the Marketplace:

- [ ] `organization.type` = `SERVICE_PROVIDER`
- [ ] `organization.isActive` = `true`
- [ ] Has at least one subscription with:
  - [ ] `status` = `ACTIVE`, `TRIAL`, or `GRACE_PERIOD`
  - [ ] Corresponding end date is null or in the future

### For Foundations:

- Foundations do NOT appear on the marketplace
- Foundations are the consumers who browse and purchase from the marketplace
- No special visibility requirements (they are viewers, not listed entities)

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /compat/organizations?type=PRODUCT_SUPPLIER&isActive=true` | Fetch product suppliers for marketplace |
| `GET /compat/organizations?type=SERVICE_PROVIDER&isActive=true` | Fetch service providers for marketplace |
| `GET /compat/organizations/:id` | Fetch individual organization profile |

---

## Related Files

- **Frontend Marketplace Page**: `frontend/pages/MarketplacePage.tsx`
- **Frontend Marketplace Service**: `frontend/services/marketplaceService.ts`
- **API Compat Controller**: `api/src/compat/compat.controller.ts`
- **Prisma Schema**: `api/prisma/schema.prisma` (Organization, Subscription models)

---

## Troubleshooting

### Organization not appearing on marketplace?

1. **Check organization type**: Must be `PRODUCT_SUPPLIER` or `SERVICE_PROVIDER`
2. **Check isActive flag**: Must be `true`
3. **Check subscription status**: Must have an active/trial/grace period subscription
4. **Check subscription dates**: End dates must be in the future or null

### Admin can see profile but public cannot?

- This is expected behavior - admins and organization members bypass the subscription gate for individual profile viewing
