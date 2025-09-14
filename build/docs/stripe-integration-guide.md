# Stripe Integration Guide

## Overview

This guide outlines the implementation of Stripe payment integration for the PC Solutions Platform, supporting both monthly recurring subscriptions and annual options (recurring or one-time payments).

## Key Principles

* **Monthly** = **subscription only** (recurring)
* **Annual** = user can choose **one-time** *or* **recurring subscription**

---

## 1) Products & Prices (Stripe Catalog)

Create one Product per plan. Attach **three** Prices:

* `PRICE_MONTHLY_RECURRING` → `type: recurring`, `interval: month`, `currency: CHF`
* `PRICE_ANNUAL_RECURRING`  → `type: recurring`, `interval: year`,  `currency: CHF`
* `PRICE_ANNUAL_ONETIME`    → `type: one_time`,                    `currency: CHF`

> Tip: Keep separate product/price IDs for each app plan (Basic/Pro/Enterprise), but the structure above applies to each.

---

## 2) Checkout UX (Stripe Checkout = safest)

Pricing page shows:

* **Monthly (recurring)** button
* **Annual** with a **toggle**:
  * Annual **Subscription (recurring)**
  * Annual **One-Time (no auto-renew)**

Routes (examples):

* `POST /api/billing/checkout/monthly` → **mode: 'subscription'**, `PRICE_MONTHLY_RECURRING`
* `POST /api/billing/checkout/annual/recurring` → **mode: 'subscription'**, `PRICE_ANNUAL_RECURRING`
* `POST /api/billing/checkout/annual/onetime` → **mode: 'payment'**, `PRICE_ANNUAL_ONETIME`

**Guards**: each endpoint must **reject** incorrect price types (e.g., monthly endpoint cannot accept annual prices).

---

## 3) Backend patterns (NestJS)

**Monthly (subscription):**

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: stripeCustomerId,
  line_items: [{ price: process.env.PRICE_MONTHLY_RECURRING, quantity: 1 }],
  success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/billing/cancel`,
}, { idempotencyKey: `sub-monthly-${user.id}-${Date.now()}` });
```

**Annual (recurring subscription):**

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: stripeCustomerId,
  line_items: [{ price: process.env.PRICE_ANNUAL_RECURRING, quantity: 1 }],
  success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/billing/cancel`,
}, { idempotencyKey: `sub-annual-${user.id}-${Date.now()}` });
```

**Annual (one-time):**

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: stripeCustomerId,
  line_items: [{ price: process.env.PRICE_ANNUAL_ONETIME, quantity: 1 }],
  success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${APP_URL}/billing/cancel`,
}, { idempotencyKey: `annual-onetime-${user.id}-${Date.now()}` });
```

> Keep using **Stripe Checkout** to stay PCI SAQ-A and have Stripe handle SCA/3DS.

---

## 4) Webhooks (source of truth)

Endpoint: `POST /webhooks/stripe` (raw body + signature verify).

**Handle (subscriptions – monthly & annual recurring):**

* `checkout.session.completed` (mode=subscription) → create local subscription (pending)
* `invoice.paid` → mark subscription **active**; set `current_period_end`
* `invoice.payment_failed` → **past_due** + dunning
* `customer.subscription.updated|deleted` → sync status (active, canceled, incomplete, past_due)

**Handle (annual one-time):**

* `checkout.session.completed` (mode=payment) → create **license** (pending)
* `payment_intent.succeeded` → mark **active**; set `access_expires_at = paid_at + 365 days`
* (Optional) `charge.refunded` → revoke/adjust access

**Rule**: Grant/revoke access **only** from webhook-confirmed events; never from client redirects.

---

## 5) Data Model

```sql
users(id, email, stripe_customer_id, ...)

plans(id, code, name, ...)

plan_prices(               -- optional if you host IDs
  id, plan_id, cadence enum('monthly','annual'),
  kind enum('recurring','one_time'),
  stripe_price_id
)

subscriptions(             -- for monthly & annual recurring
  id, user_id, plan_id,
  cadence enum('monthly','annual'),
  stripe_subscription_id,
  status enum('active','trialing','past_due','canceled','incomplete'),
  current_period_end timestamp,
  created_at, updated_at
)

licenses(                  -- for annual one-time
  id, user_id, plan_id,
  stripe_payment_intent_id,
  status enum('active','revoked','expired'),
  access_expires_at timestamp,
  created_at, updated_at
)
```

---

## 6) Entitlements (RBAC/paywall)

A user is **entitled** if:

* They have a **subscription** with `status in ('active','trialing')` (monthly **or** annual recurring), **OR**
* They have an **active license** with `now() < access_expires_at` (annual one-time)

If not entitled → show paywall with three options:

* Monthly (recurring)
* Annual (recurring)
* Annual (one-time)

---

## 7) Dunning & Grace

Applies only to **subscriptions** (monthly & annual recurring):

* On `invoice.payment_failed`:
  * Start **grace period** (e.g., 7 days)
  * Send portal link for payment method update
* If remains failed after retries → mark **past_due/canceled** and remove entitlement at period end (or immediately, per policy)

Annual one-time: **no dunning**. Optionally email renewal offer near `access_expires_at`. (Do **not** auto-renew the one-time product.)

---

## 8) Security Hardening

* Use **Checkout** (hosted). No raw card fields
* Store secrets server-side only: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
* **Verify webhook signatures**; process idempotently
* Tight **CSP/CORS** (allow `https://js.stripe.com`)
* Log only Stripe IDs + minimal metadata
* Map each user to **one Stripe customer**

---

## 9) Swiss Specifics

* Prices in **CHF**
* SCA handled by Stripe
* Optionally enable **TWINT** (still via Stripe) in Checkout for both subscription and one-time flows
* VAT via **Stripe Tax** or your own calc

---

## 10) Admin & Support

* Admin view shows:
  * Current entitlement source: **Subscription (monthly/annual)** or **License (annual one-time)**
  * Renewal/expiry dates, invoices/charges
* Support override: "grant access until DATE"

---

## 11) Tests (Playwright + Stripe test clocks)

* **Monthly** (recurring): buy, fail & recover, cancel at period end
* **Annual recurring**: buy, verify renewal at T+1 year (test clock), cancel → access until `current_period_end`
* **Annual one-time**: buy, entitlement for 365 days, refund → revoke
* **Guards**: monthly endpoint rejects annual prices; annual endpoints enforce their modes; idempotency

---

## 12) Migration & Rollout

* Add envs: `PRICE_MONTHLY_RECURRING`, `PRICE_ANNUAL_RECURRING`, `PRICE_ANNUAL_ONETIME`
* Ship behind feature flag; test keys first + webhooks
* Update pricing UI with annual toggle (recurring vs one-time)
* Announce policy clearly on checkout

---

## Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (set these in Stripe Dashboard)
PRICE_MONTHLY_RECURRING=price_...
PRICE_ANNUAL_RECURRING=price_...
PRICE_ANNUAL_ONETIME=price_...

# App URLs
APP_URL=http://localhost:3000
WEBHOOK_URL=http://localhost:3001/webhooks/stripe
```

---

## Implementation Checklist

- [ ] Install Stripe SDK (`stripe` package)
- [ ] Create Stripe products and prices in dashboard
- [ ] Update Prisma schema with subscription/license models
- [ ] Implement billing controller with checkout endpoints
- [ ] Create webhook handler for Stripe events
- [ ] Add entitlement middleware for feature gating
- [ ] Create pricing page with monthly/annual toggle
- [ ] Implement admin subscription management
- [ ] Add tests for all payment flows
- [ ] Configure environment variables
- [ ] Deploy with webhook endpoints

---

### Bottom Line

You now support:

* **Monthly**: subscription only
* **Annual**: user chooses **recurring** **or** **one-time**

Stripe Checkout + webhooks remain the safest foundation, and your entitlement logic cleanly handles all three cases.