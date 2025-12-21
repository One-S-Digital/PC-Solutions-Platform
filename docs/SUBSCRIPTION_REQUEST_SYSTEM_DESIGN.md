# Subscription Request System Design

## Executive Summary

This document outlines a comprehensive subscription request system that enables manual invoice-based subscriptions while being future-ready for Stripe or other payment gateway integrations.

## Current State Analysis

### What Exists Today

1. **Database Infrastructure** (Excellent Foundation)
   - `SubscriptionPlan` model with pricing, features, limits, trial days
   - `Subscription` model with full lifecycle management (PENDING, ACTIVE, TRIAL, PAUSED, CANCELLED, EXPIRED, PAST_DUE, GRACE_PERIOD)
   - `isManual` flag to distinguish manual subscriptions from automated (Stripe) ones
   - `SubscriptionAction` model for audit trail
   - `SubscriptionNote` model for admin notes
   - `SubscriptionSchedule` model for future actions
   - `BillingTransaction` model ready for payment tracking

2. **API Infrastructure** (Comprehensive)
   - `/subscriptions/request` endpoint for users to request subscriptions (creates PENDING status)
   - `/subscriptions/me` endpoint for checking own subscription status
   - `/admin/subscription-management/*` endpoints for full admin management
   - Activate, pause, resume, cancel, renew, extend, upgrade, downgrade operations

3. **Frontend Infrastructure** (Partially Implemented)
   - `SubscriptionContext` with `requestSubscription()` method
   - `SubscriptionPaywall` component showing appropriate messages per status
   - `PricingPage` with plans display
   - Admin `Subscriptions.tsx` page for managing user subscriptions

### Current Gaps

1. **User-Facing Subscription Request Form**
   - The "Subscribe" button on pricing page just shows an alert
   - No actual subscription request form with plan selection
   - No confirmation flow

2. **Admin Subscription Request Management**
   - No dedicated "Pending Requests" queue in admin
   - No email notification when new request comes in
   - No workflow for processing requests (review → send invoice → activate)

3. **Email Integration**
   - No email notifications for subscription lifecycle events
   - No configurable email for receiving subscription requests

4. **Invoice Tracking**
   - No invoice reference field on subscriptions
   - No payment tracking for manual invoices

---

## Proposed Design Options

### Option A: Subscription Request Queue (Recommended)

Create a dedicated `SubscriptionRequest` model for managing the request lifecycle.

**Pros:**
- Clear separation between requests (inquiry) and subscriptions (contract)
- Better audit trail and workflow management
- Can track multiple requests per user/org
- Easy to add approval workflow

**Cons:**
- New table to maintain
- Slightly more complex data model

### Option B: Enhanced Subscription Model

Use the existing Subscription model with PENDING status as the request mechanism.

**Pros:**
- Uses existing infrastructure
- Simpler data model
- Already partially implemented

**Cons:**
- Mixes inquiry data with subscription data
- Harder to track request history if subscription is deleted
- Less clear separation of concerns

### Recommendation: **Option A with Option B fallback**

Implement Option A (SubscriptionRequest) for the complete workflow, while leveraging the existing Subscription PENDING status as a lightweight alternative for MVP.

---

## Detailed Design

### 1. Database Schema Enhancements

#### New: SubscriptionRequest Model

```prisma
model SubscriptionRequest {
  id                String   @id @default(uuid())
  
  // Requester (one must be set)
  userId            String?
  organizationId    String?
  
  // Request Details
  planId            String
  tier              SubscriptionTier
  billingPeriod     String   @default("monthly") // monthly, quarterly, yearly
  
  // Contact Information (for reaching out)
  contactName       String?
  contactEmail      String
  contactPhone      String?
  preferredContact  String?  @default("email") // email, phone
  
  // Additional Context
  message           String?  @db.Text
  notes             String?  @db.Text  // Admin notes
  
  // Status Workflow
  status            SubscriptionRequestStatus @default(PENDING)
  
  // Invoice/Payment Tracking
  invoiceNumber     String?
  invoiceSentAt     DateTime?
  invoiceAmount     Float?
  invoiceCurrency   String?  @default("CHF")
  paymentReceivedAt DateTime?
  paymentReference  String?
  
  // Subscription Link (when activated)
  subscriptionId    String?  @unique
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  reviewedAt        DateTime?
  reviewedBy        String?
  processedAt       DateTime?
  processedBy       String?
  
  // Relations
  user              User?         @relation(fields: [userId], references: [id])
  organization      Organization? @relation(fields: [organizationId], references: [id])
  plan              SubscriptionPlan @relation(fields: [planId], references: [id])
  subscription      Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([status])
  @@index([createdAt])
  @@index([userId])
  @@index([organizationId])
  @@map("subscription_requests")
}

enum SubscriptionRequestStatus {
  PENDING          // Just submitted, awaiting review
  UNDER_REVIEW     // Admin is reviewing
  INVOICE_SENT     // Invoice has been sent to customer
  PAYMENT_PENDING  // Waiting for payment confirmation
  PAYMENT_RECEIVED // Payment confirmed
  ACTIVATED        // Subscription created and activated
  DECLINED         // Request was declined
  CANCELLED        // Customer cancelled the request
}
```

#### Enhanced: System Settings for Email Notifications

```prisma
// Add to existing SystemSettings or create dedicated model
model SubscriptionSettings {
  id                        String   @id @default(uuid())
  
  // Admin Notification Settings
  notificationEmail         String?  // Email to receive new request notifications
  enableEmailNotifications  Boolean  @default(true)
  
  // Default Settings
  defaultTrialDays          Int      @default(14)
  defaultGracePeriodDays    Int      @default(7)
  
  // Invoice Settings
  invoicePrefix             String   @default("INV-")
  invoiceNextNumber         Int      @default(1001)
  
  // Payment Terms
  paymentTermsDays          Int      @default(30)
  
  // Email Templates
  requestReceivedTemplate   String?
  invoiceSentTemplate       String?
  activationTemplate        String?
  
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@map("subscription_settings")
}
```

### 2. API Endpoints

#### User-Facing Endpoints

```typescript
// Enhanced subscription request endpoint
POST /subscriptions/request
Body: {
  planId: string;
  tier?: SubscriptionTier;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContact?: 'email' | 'phone';
  message?: string;
}
Response: {
  success: boolean;
  data: {
    requestId: string;
    status: 'PENDING';
    message: string;
    estimatedResponseTime: string; // e.g., "1-2 business days"
  }
}

// Get user's subscription requests
GET /subscriptions/requests
Response: {
  success: boolean;
  data: SubscriptionRequest[];
}

// Cancel a pending request
DELETE /subscriptions/requests/:id
```

#### Admin Endpoints

```typescript
// Get all subscription requests with filters
GET /admin/subscription-management/requests
Query: {
  status?: SubscriptionRequestStatus;
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Get single request details
GET /admin/subscription-management/requests/:id

// Update request status (workflow actions)
POST /admin/subscription-management/requests/:id/review
Body: { notes?: string }

POST /admin/subscription-management/requests/:id/send-invoice
Body: { 
  invoiceNumber: string;
  invoiceAmount: number;
  invoiceCurrency?: string;
  notes?: string;
}

POST /admin/subscription-management/requests/:id/confirm-payment
Body: {
  paymentReference?: string;
  notes?: string;
}

POST /admin/subscription-management/requests/:id/activate
Body: {
  startDate?: string;
  periodMonths?: number;
  notes?: string;
}

POST /admin/subscription-management/requests/:id/decline
Body: {
  reason: string;
  notes?: string;
}

// Add note to request
POST /admin/subscription-management/requests/:id/notes
Body: { note: string; isInternal?: boolean }

// Get request analytics
GET /admin/subscription-management/requests/analytics

// Subscription settings
GET /admin/subscription-management/settings
PUT /admin/subscription-management/settings
Body: {
  notificationEmail?: string;
  enableEmailNotifications?: boolean;
  defaultTrialDays?: number;
  paymentTermsDays?: number;
  ...
}
```

### 3. Email Notification System

#### Email Triggers

1. **New Request Received** (to admin)
   - Triggered: When user submits subscription request
   - Recipients: Configured admin email(s)
   - Content: Request details, user info, plan selected

2. **Request Confirmation** (to user)
   - Triggered: When request is submitted
   - Recipients: User's email
   - Content: Confirmation, expected timeline, contact info

3. **Invoice Sent** (to user)
   - Triggered: When admin sends invoice
   - Recipients: User's email
   - Content: Invoice details, payment instructions

4. **Payment Confirmed** (to user)
   - Triggered: When admin confirms payment
   - Recipients: User's email
   - Content: Payment confirmation, next steps

5. **Subscription Activated** (to user)
   - Triggered: When subscription is activated
   - Recipients: User's email
   - Content: Welcome message, access instructions

6. **Request Declined** (to user)
   - Triggered: When admin declines request
   - Recipients: User's email
   - Content: Reason, alternative options

### 4. Frontend User Flow

#### A. Subscription Request Form

```
User Journey:
1. User clicks "Subscribe" on pricing page or in-app prompt
2. Opens modal/page with:
   - Plan selection (pre-filled if coming from specific plan)
   - Billing period toggle (monthly/yearly)
   - Contact details (pre-filled from profile)
   - Optional message field
   - Terms acceptance checkbox
3. Submit → Confirmation screen with:
   - "Thank you! We'll be in touch within 1-2 business days"
   - Email confirmation sent
   - Link to check request status
```

#### B. Subscription Status Page

Add a new section in Settings or dedicated page showing:
- Current subscription status (if any)
- Pending requests with status
- Request history
- Quick action buttons

### 5. Admin Dashboard Enhancements

#### A. New "Subscription Requests" Tab/Section

```
┌─────────────────────────────────────────────────────────────┐
│ Subscription Requests                           [Settings]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Filters: [All Status ▼] [Date Range] [Search...     ] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Quick Stats:                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Pending  │ │ Invoice  │ │ Payment  │ │ This     │        │
│ │    12    │ │ Sent: 5  │ │ Recv: 3  │ │ Month: 8 │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ Request Queue:                                               │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ User/Org      │ Plan      │ Status    │ Date    │ Action ││
│ ├───────────────┼───────────┼───────────┼─────────┼────────┤│
│ │ ABC Daycare   │ Essential │ PENDING   │ 2 hrs   │ Review ││
│ │ XYZ Foundation│ Pro       │ INV_SENT  │ 3 days  │ Track  ││
│ │ Demo Supplier │ Supplier  │ PAYMENT   │ 1 day   │ Confirm││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### B. Request Detail Panel/Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Request Details                                   [Close X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Requester: ABC Daycare Foundation                           │
│ Contact: John Doe (john@abc.ch) | +41 79 123 45 67         │
│ Requested: December 21, 2025 at 10:30 AM                   │
│                                                              │
│ Plan: Essential (Foundation)                                 │
│ Billing: Monthly - CHF 299/month                            │
│                                                              │
│ Message:                                                     │
│ "We are a new daycare center looking to start with..."      │
│                                                              │
│ ─────────────────────────────────────────────────           │
│                                                              │
│ Status: PENDING                                              │
│                                                              │
│ Actions:                                                     │
│ [Mark Under Review] [Send Invoice] [Decline] [Add Note]     │
│                                                              │
│ ─────────────────────────────────────────────────           │
│                                                              │
│ History:                                                     │
│ • Dec 21: Request submitted by user                         │
│ • Dec 21: Email confirmation sent                           │
│                                                              │
│ Notes:                                                       │
│ [Add a note about this request...]           [Add Note]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### C. Workflow Action Modals

1. **Send Invoice Modal**
   ```
   Invoice Number: [INV-1001     ] (auto-generated)
   Amount: CHF [299.00    ]
   Notes: [                                    ]
   
   [ ] Send email notification to customer
   
   [Cancel] [Send Invoice]
   ```

2. **Confirm Payment Modal**
   ```
   Payment Reference: [                       ]
   Payment Date: [Today          ▼]
   Notes: [                                    ]
   
   [ ] Automatically activate subscription
   
   [Cancel] [Confirm Payment]
   ```

3. **Activate Subscription Modal**
   ```
   Start Date: [Today          ▼]
   Duration: [1 month    ▼] / [Custom: ___ months]
   
   [ ] Send welcome email
   [ ] Include trial period (14 days)
   
   [Cancel] [Activate Subscription]
   ```

### 6. Settings Configuration

Add to Admin Settings → Subscriptions:

```
Subscription Request Settings
─────────────────────────────────

Notification Email
[subscriptions@procreche.ch          ]
Email to receive new subscription request notifications

□ Enable email notifications for new requests
□ Enable email notifications for subscription lifecycle

Default Settings
─────────────────────────────────
Default Trial Days: [14] days
Default Grace Period: [7] days
Payment Terms: [30] days

Invoice Settings
─────────────────────────────────
Invoice Prefix: [INV-        ]
Next Invoice Number: [1001      ]
Default Currency: [CHF ▼]

[Save Settings]
```

---

## Future Stripe Integration Points

The design is prepared for Stripe integration:

1. **SubscriptionRequest → Stripe Checkout**
   - When request is approved, instead of manual invoice:
   - Generate Stripe Checkout Session
   - Send checkout link to customer
   - Webhook handles payment completion

2. **Automatic Subscription Creation**
   - Stripe webhook creates Subscription automatically
   - Links request to subscription
   - Updates status to ACTIVATED

3. **Hybrid Support**
   - `isManual` flag on both Request and Subscription
   - Admin can choose manual or Stripe flow per request
   - Supports mixed customer base

---

## Implementation Phases

### Phase 1: MVP (Current Sprint)
1. ✅ Use existing Subscription with PENDING status
2. Add subscription request form to frontend
3. Add "Pending Subscriptions" view in admin
4. Add basic email notification (new request)
5. Improve activate subscription workflow

### Phase 2: Enhanced Workflow
1. Create SubscriptionRequest model
2. Implement full status workflow
3. Add invoice tracking fields
4. Implement all email notifications
5. Add admin settings configuration

### Phase 3: Stripe Ready
1. Add Stripe Checkout integration
2. Implement webhook handlers
3. Add Stripe Customer Portal link
4. Support hybrid manual/Stripe flow

---

## Alternative Approaches Considered

### 1. Form-to-Email Only
**Approach:** Simple form that sends email to admin
**Pros:** Very simple to implement
**Cons:** No tracking, no status visibility for users, manual everything

### 2. Third-Party Form Service
**Approach:** Use Typeform, Google Forms, etc.
**Pros:** Quick setup, good UX
**Cons:** No integration with system, data silos, extra cost

### 3. Full Stripe from Day 1
**Approach:** Implement Stripe immediately
**Pros:** Automated payments, professional
**Cons:** More complex, requires Stripe account setup, may not suit all customers (some prefer invoices)

### Recommendation
The proposed phased approach (MVP → Enhanced → Stripe) provides the best balance of quick value delivery while building toward a robust automated system.

---

## Files to Create/Modify

### New Files
- `api/prisma/migrations/YYYYMMDD_add_subscription_request/migration.sql`
- `api/src/subscription-management/subscription-request.service.ts`
- `api/src/subscription-management/dto/subscription-request.dto.ts`
- `frontend/components/subscription/SubscriptionRequestModal.tsx`
- `frontend/components/subscription/SubscriptionRequestForm.tsx`
- `admin/src/components/subscriptions/SubscriptionRequestsTab.tsx`
- `admin/src/components/subscriptions/RequestDetailModal.tsx`
- `admin/src/components/subscriptions/RequestWorkflowActions.tsx`

### Modified Files
- `api/src/subscription-management/subscription-management.controller.ts`
- `api/src/subscription-management/subscription-management.module.ts`
- `api/prisma/schema.prisma`
- `frontend/pages/PricingPage.tsx`
- `frontend/contexts/SubscriptionContext.tsx`
- `frontend/components/settings/sections/BillingSubscriptionSettings.tsx`
- `admin/src/pages/Subscriptions.tsx`
- `admin/src/services/subscriptionService.ts`
- `packages/translations/locales/*/subscription.json`

---

## Conclusion

This design provides a comprehensive solution for manual subscription management that:

1. **Solves the immediate problem** - Users can request subscriptions, admins can process them
2. **Provides visibility** - Both users and admins can track request status
3. **Supports manual workflow** - Invoice-based payment process
4. **Is future-ready** - Easy path to Stripe integration
5. **Is configurable** - Admin can customize notifications and settings

The phased implementation approach allows for quick wins while building toward a fully automated system.
