# Foundation Tier Subscription - Source of Truth Investigation

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: The subscription system has two different concepts that are causing confusion and preventing daycares from accessing the platform even after activation:

1. **SubscriptionPlan Table** (Backend - `subscription_plans` table) - Used for actual subscription management
2. **PricingTier Table** (Backend - `pricing_tiers` table) - Used for the admin pricing tier modal (Foundation-specific tier configuration)

**ROOT CAUSE**: The `getUserSubscription()` and `getOrganizationSubscription()` methods do NOT filter by subscription status, so they return ANY subscription (including PENDING, INACTIVE, CANCELLED) instead of only ACTIVE ones.

---

## System Architecture Analysis

### 1. Backend Subscription Plans (Source of Truth for Subscriptions)

**Location**: `subscription_plans` table in database  
**Service**: `SubscriptionManagementService` (`api/src/subscription-management/subscription-management.service.ts`)

**Schema**:
```typescript
model SubscriptionPlan {
  id            String   @id @default(uuid())
  name          String
  code          String?  @unique  // BASIC, ESSENTIAL, PROFESSIONAL, etc.
  description   String   @db.Text
  price         Float
  currency      String   @default("CHF")
  billingPeriod String   @default("monthly")
  features      String[]
  limits        Json
  allowedRoles  String[] @default([])
  trialDays     Int      @default(0)
  isActive      Boolean  @default(true)
  isPopular     Boolean  @default(false)
  displayOrder  Int      @default(0)
  stripePriceId   String?
  stripeProductId String?
  
  subscriptions          Subscription[]
  subscriptionRequests   SubscriptionRequest[]
}
```

**Default Plans** (Auto-seeded):
- Basic (FOUNDATION) - CHF 69/month
- Essential (FOUNDATION) - CHF 129/month  
- Professional (FOUNDATION) - CHF 259/month
- Suppliers (PRODUCT_SUPPLIER) - Enquiry-based
- Service Providers (SERVICE_PROVIDER) - Enquiry-based

**Purpose**: This is the ACTUAL subscription system. When users subscribe, records are created in the `subscriptions` table linking to these plans.

---

### 2. Pricing Tier Table (Admin Configuration - NOT Used for Subscription Logic)

**Location**: `pricing_tiers` table in database  
**Service**: `PricingService` (`api/src/subscription-management/pricing.service.ts`)

**Schema**:
```typescript
model PricingTier {
  id               String           @id @default(uuid())
  role             UserRole         @default(FOUNDATION)
  subscriptionTier SubscriptionTier @default(BASIC)  // BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE
  name             String
  basePrice        Float
  currency         String           @default("CHF")
  billingPeriod    String           @default("monthly")
  discounts        Json
  isActive         Boolean          @default(true)
  displayOrder     Int              @default(0)
  
  @@unique([role, subscriptionTier, billingPeriod])
}
```

**Purpose**: This table exists for:
- Dynamic pricing configuration by role and tier
- Volume discounts and yearly billing discounts
- Foundation-specific tier pricing customization

**Admin UI**: Located in `admin/src/pages/Subscriptions.tsx` - "Foundation Subscription Tier Configuration" modal (lines 662-933)

**IMPORTANT**: This table is NOT currently being used in the subscription status checking logic. It's a future-ready pricing configuration system.

---

### 3. Subscription Status Checking Logic (THE BUG)

**File**: `api/src/subscription-management/subscription-management.service.ts`

**Current Implementation (BUGGY)**:

```typescript
async getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },  // ❌ NO STATUS FILTER!
      include: {
        user: true,
        organization: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as unknown as Subscription | null;
  } catch (error) {
    this.logger.error(`Failed to get user subscription: ${(error as Error).message}`);
    throw error;
  }
}

async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
  try {
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId },  // ❌ NO STATUS FILTER!
      include: {
        user: true,
        organization: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as unknown as Subscription | null;
  } catch (error) {
    this.logger.error(`Failed to get organization subscription: ${(error as Error).message}`);
    throw error;
  }
}
```

**The Problem**:
- These methods return the MOST RECENT subscription regardless of status
- If a daycare has subscriptions: [PENDING (newest), CANCELLED (old), ACTIVE (older)]
- The query returns the PENDING one instead of the ACTIVE one
- The frontend checks `hasActiveSubscription` which evaluates `subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL'`
- Since the returned subscription is PENDING, `hasActiveSubscription` becomes `false`
- User sees the subscription paywall even though they have an ACTIVE subscription

---

### 4. Frontend Subscription Context

**File**: `frontend/contexts/SubscriptionContext.tsx`

**Status Check** (Line 964 in controller):
```typescript
const isActive = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL';
```

**This is correct**, but it receives the WRONG subscription from the backend.

---

## The Two Data Flows

### Flow 1: Pricing Page → Subscription Request → Activation

1. **Pricing Page** (`frontend/pages/PricingPage.tsx`)
   - Fetches plans from `/subscriptions/plans` (SubscriptionPlan table)
   - Displays pricing to users
   - Creates subscription request

2. **Subscription Request** (`subscription_requests` table)
   - Status: PENDING → UNDER_REVIEW → INVOICE_SENT → PAYMENT_RECEIVED → ACTIVATED
   - Links to SubscriptionPlan via `planId`

3. **Admin Activates** (`admin/src/pages/Subscriptions.tsx`)
   - Admin reviews request in "Subscription Requests" tab
   - Admin activates → creates record in `subscriptions` table
   - Status set to ACTIVE

### Flow 2: Admin Foundation Tier Configuration (Separate System)

1. **Tier Management** (`admin/src/pages/Subscriptions.tsx` - lines 662-933)
   - "Edit Foundation Subscription Tiers" modal
   - Manages `pricing_tiers` table
   - Configures pricing by tier (BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE)
   - **NOT connected to actual subscription status checking**

---

## Root Cause Analysis

### Why Daycares See Paywall After Activation

**Scenario**:
1. Daycare requests a subscription → Creates `subscription_requests` record (status: PENDING)
2. Admin activates request → Creates `subscriptions` record (status: ACTIVE)
3. System might create multiple subscription records during testing/troubleshooting
4. When frontend calls `/subscriptions/me`, backend calls `getUserSubscription(userId)` or `getOrganizationSubscription(organizationId)`
5. Query returns most recent subscription by `createdAt DESC` **without filtering by status**
6. If the most recent subscription is PENDING/INACTIVE, it's returned instead of the ACTIVE one
7. Frontend evaluates `isActive = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL'` → false
8. User sees paywall

---

## Solution

### Fix 1: Filter Subscriptions by Status (CRITICAL)

**File**: `api/src/subscription-management/subscription-management.service.ts`

**Update `getUserSubscription`**:
```typescript
async getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const subscription = await this.prisma.subscription.findFirst({
      where: { 
        userId,
        status: { in: ['ACTIVE', 'TRIAL'] }  // ✅ Only return active subscriptions
      },
      include: {
        user: true,
        organization: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as unknown as Subscription | null;
  } catch (error) {
    this.logger.error(`Failed to get user subscription: ${(error as Error).message}`);
    throw error;
  }
}
```

**Update `getOrganizationSubscription`**:
```typescript
async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
  try {
    const subscription = await this.prisma.subscription.findFirst({
      where: { 
        organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] }  // ✅ Only return active subscriptions
      },
      include: {
        user: true,
        organization: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as unknown as Subscription | null;
  } catch (error) {
    this.logger.error(`Failed to get organization subscription: ${(error as Error).message}`);
    throw error;
  }
}
```

### Fix 2: Data Cleanup

Check for orphaned/duplicate subscriptions:
```sql
-- Find organizations with multiple subscriptions
SELECT organizationId, status, COUNT(*) as count
FROM subscriptions
WHERE organizationId IS NOT NULL
GROUP BY organizationId, status
HAVING COUNT(*) > 1;

-- Find users with multiple subscriptions
SELECT userId, status, COUNT(*) as count
FROM subscriptions
WHERE userId IS NOT NULL
GROUP BY userId, status
HAVING COUNT(*) > 1;
```

---

## Source of Truth Clarification

### For Subscription Status (Current Active Subscription)
**Source of Truth**: `subscriptions` table
- Linked to `subscription_plans` table via `planId`
- Status field determines access: `ACTIVE` or `TRIAL` = has access
- Retrieved via `getUserSubscription()` or `getOrganizationSubscription()` (after fix)

### For Pricing Display (Pricing Page)
**Source of Truth**: `subscription_plans` table
- Contains plan names, features, prices
- Displayed on `/pricing` page
- Used for subscription requests

### For Foundation Tier Pricing Configuration (Admin)
**Data Source**: `pricing_tiers` table
- Future-ready for dynamic pricing
- Currently NOT integrated with subscription status checking
- Admin can configure but it doesn't affect current subscription logic
- **Recommendation**: Either integrate this with billing or remove the confusing UI

---

## Recommendations

### Immediate Actions (High Priority)

1. **Apply Fix 1** - Add status filter to `getUserSubscription()` and `getOrganizationSubscription()`
2. **Data Audit** - Check production database for multiple subscription records per user/organization
3. **Testing** - Verify daycares can access platform after fix

### Short-term Actions (Medium Priority)

4. **Clarify Admin UI** - Update "Foundation Subscription Tier Configuration" modal with clear explanation that it's for future pricing configuration, not current subscriptions
5. **Add Logging** - Log which subscription is being returned and why (for debugging)
6. **Status Transitions** - Ensure old subscriptions are properly marked as CANCELLED/EXPIRED when new ones are activated

### Long-term Actions (Low Priority)

7. **Integrate Pricing Tiers** - Connect `pricing_tiers` table to actual billing logic if needed
8. **Consolidate Systems** - Decide if `pricing_tiers` should be merged into `subscription_plans` or used separately
9. **Add Admin Warnings** - Show warning in admin if organization has multiple active subscriptions

---

## Testing Checklist

After applying fixes:

- [ ] Daycare with ACTIVE subscription can access platform (no paywall)
- [ ] Daycare with TRIAL subscription can access platform
- [ ] Daycare with PENDING subscription sees paywall
- [ ] Daycare with CANCELLED subscription sees paywall
- [ ] Daycare with EXPIRED subscription sees paywall
- [ ] Organization-based subscription works correctly
- [ ] User-based subscription works correctly
- [ ] Subscription request flow still works end-to-end
- [ ] Admin can view subscription status correctly
- [ ] No duplicate subscriptions created during activation

---

## Files to Modify

### Critical (Must Fix)
- `api/src/subscription-management/subscription-management.service.ts` (lines 1550-1586)

### Documentation (Should Update)
- `admin/src/pages/Subscriptions.tsx` (add comments explaining pricing tiers)
- This investigation document

---

## Conclusion

The issue is NOT a conflict between two sources of truth, but rather:

1. **Bug in subscription query**: Not filtering by status when fetching user/organization subscriptions
2. **Confusing UI**: Admin tier configuration modal suggests it affects active subscriptions when it doesn't

The fix is straightforward: Add status filtering to the subscription retrieval methods. This will ensure only ACTIVE or TRIAL subscriptions are returned, allowing daycares to access the platform after activation.
