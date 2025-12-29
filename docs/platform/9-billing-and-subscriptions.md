# Billing & Subscriptions

Complete guide to subscription plans, billing, and subscription management.

---

## Table of Contents

1. [Overview](#overview)
2. [Subscription Plans](#subscription-plans)
3. [Requesting a Subscription](#requesting-a-subscription)
4. [Managing Your Subscription](#managing-your-subscription)
5. [Cancellation](#cancellation)
6. [Billing Information](#billing-information)

---

## Overview

Certain user roles require an active subscription to access platform features.

**Roles Requiring Subscription:**
- Foundations (Daycares)
- Product Suppliers
- Service Providers

**Free Roles:**
- Educators
- Parents
- Admins (system access)

---

## Subscription Plans

### Foundation Plans

#### BASIC Plan
**Features:**
- Marketplace access (products & services)
- State policies hub
- Unlimited orders & service requests
- Multilingual interface (EN/FR/DE)
- Email support

#### ESSENTIAL Plan
**Features:**
- Everything in Basic
- Parent leads inbox + auto-matching
- HR & compliance document library
- Parent enquiry tracker
- Limited parent enquiries (e.g., 15/month)

#### PROFESSIONAL Plan
**Features:**
- Everything in Essential
- Unlimited parent enquiries
- Recruitment module (post jobs, view candidates)
- E-Learning platform access
- Analytics dashboard
- Team management
- Priority support

#### ENTERPRISE Plan
**Features:**
- Custom features
- Dedicated support
- Custom integrations

### Product Supplier Plan
**Features:**
- Full product management
- Order management
- Inquiry management
- Analytics
- Catalog management
- Promo codes
- Team management

### Service Provider Plan
**Features:**
- Full service management
- Service request management
- Analytics
- Booking link integration
- Promo codes
- Team management

---

## Requesting a Subscription

### Subscription Request Flow

1. Navigate to **Settings** → **Billing & Subscription**
2. Click **Request Subscription**
3. Select plan
4. Choose billing period (monthly, quarterly, yearly)
5. Fill in contact information
6. Add message (optional)
7. Submit request

**API Endpoint:**
- `POST /subscriptions/request`

**File Reference:**
- `api/src/subscription-management/subscription-management.controller.ts`

### Request Status

Your subscription request goes through these stages:

1. **PENDING** - Request submitted, awaiting admin review
2. **UNDER_REVIEW** - Admin is reviewing your request
3. **INVOICE_SENT** - Invoice has been sent
4. **PAYMENT_PENDING** - Waiting for payment confirmation
5. **PAYMENT_RECEIVED** - Payment confirmed
6. **ACTIVATED** - Subscription created and activated
7. **DECLINED** - Request was declined

### Tracking Your Request

1. Go to **Settings** → **Billing & Subscription**
2. View request status
3. See estimated response time
4. Check for admin notes

**API Endpoint:**
- `GET /subscriptions/requests`

---

## Managing Your Subscription

### Viewing Subscription Status

1. Navigate to **Settings** → **Billing & Subscription**
2. View:
   - Current plan
   - Subscription status
   - Expiry date
   - Days until expiry
   - Trial status (if applicable)
   - Features included
   - Usage limits

**API Endpoint:**
- `GET /subscriptions/me`

**File Reference:**
- `frontend/components/settings/sections/BillingSubscriptionSettings.tsx`

### Subscription Status

- **ACTIVE** - Subscription is active
- **INACTIVE** - Subscription not started or expired
- **PAUSED** - Temporarily paused
- **CANCELLED** - Cancelled
- **EXPIRED** - Period ended
- **TRIAL** - In trial period
- **PAST_DUE** - Payment overdue
- **PENDING** - Awaiting activation
- **GRACE_PERIOD** - In grace period

### Feature Access

The platform checks your subscription to determine feature access:

- Features are gated based on your plan
- Usage limits are enforced
- Paywall shown if subscription inactive

**API Endpoint:**
- `GET /subscriptions/feature/:featureKey`

---

## Cancellation

### Requesting Cancellation

1. Go to **Settings** → **Billing & Subscription**
2. Click **Request Cancellation**
3. Provide reason (optional)
4. Submit cancellation request

**API Endpoint:**
- `POST /subscriptions/cancel-request`

### Cancellation Status

- **PENDING** - Request submitted, awaiting admin processing
- **APPROVED** - Cancellation approved and processed
- **DECLINED** - Cancellation declined

### Cancellation Processing

- Admin reviews cancellation request
- Subscription may be cancelled immediately or at period end
- You'll receive confirmation when processed

---

## Billing Information

### Payment Methods

Currently, subscriptions use **manual billing**:
- Invoice sent after subscription request approval
- Payment via bank transfer or other methods
- Payment confirmation by admin

**Future:** Stripe integration planned for automated payments.

### Billing Periods

- **Monthly** - Billed monthly
- **Quarterly** - Billed every 3 months
- **Yearly** - Billed annually (may include discount)

### Invoices

- Invoices sent via email
- Invoice number provided
- Payment reference for tracking

**API Endpoint:**
- `GET /admin/subscription-management/requests/:id` (admin view)

---

## Under the Hood

### Subscription Models

**SubscriptionPlan:**
- Plan details (name, code, description)
- Pricing (price, currency, billing period)
- Features (array of feature codes)
- Limits (JSON object with usage limits)
- Allowed roles

**Subscription:**
- Links to user or organization
- Plan reference
- Status tracking
- Period management (start, end, trial)
- Cancellation tracking
- Stripe integration fields (prepared for future)

**SubscriptionRequest:**
- Request workflow
- Invoice tracking
- Payment confirmation
- Admin notes

**File Reference:**
- `api/prisma/schema.prisma`

### Feature Gating

Features are gated via:
- `SubscriptionPaywall` component (frontend)
- `SubscriptionGatedRoute` wrapper (frontend)
- Feature access checks (API)

**Files:**
- `frontend/components/shared/SubscriptionPaywall.tsx`
- `frontend/App.tsx` (SubscriptionGatedRoute)
- `api/src/subscription-management/subscription-management.controller.ts`

---

## Next Steps

- See [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md) for subscription issues
- Contact support for billing questions

