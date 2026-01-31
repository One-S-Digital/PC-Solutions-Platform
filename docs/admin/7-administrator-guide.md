# Administrator User Guide

Complete guide for administrators using the admin dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
3. [Dashboard](#dashboard)
4. [User Management](#user-management)
5. [Organization Management](#organization-management)
6. [Content Management](#content-management)
7. [Subscription Management](#subscription-management)
8. [Support Ticket Management](#support-ticket-management)
9. [System Monitoring](#system-monitoring)
10. [Platform Settings](#platform-settings)
11. [Translation Management](#translation-management)
12. [Analytics](#analytics)

---

## Overview

The admin dashboard provides comprehensive tools for managing the platform, users, content, subscriptions, and system operations.

**Access:** Requires `ADMIN` or `SUPER_ADMIN` role.

**Dashboard URL:** Separate admin dashboard application

**File Reference:**
- `admin/src/App.tsx`

---

## Accessing the Admin Dashboard

### Login

1. Navigate to admin dashboard URL
2. Click **Login**
3. Enter admin credentials
4. You'll be redirected to dashboard

**File Reference:**
- `admin/src/components/auth/AdminAuthComponents.tsx`

### Access Control

- **ADMIN:** Standard admin access
- **SUPER_ADMIN:** Full system access (some features restricted to SUPER_ADMIN only)

**File Reference:**
- `api/src/auth/guards/roles.guard.ts`

---

## Dashboard

### Admin Dashboard Overview

Navigate to `/dashboard` in admin dashboard.

**File Reference:**
- `admin/src/pages/Dashboard.tsx`

### Dashboard Features

- User statistics
- Organization statistics
- Product/Service statistics
- Job listing statistics
- Revenue metrics
- System health

**API Endpoints:**
- `GET /admin/analytics/overview`
- `GET /admin/analytics/users`
- `GET /admin/analytics/organizations`
- `GET /admin/analytics/products`
- `GET /admin/analytics/jobs`
- `GET /admin/analytics/revenue`

**File Reference:**
- `api/src/analytics/analytics.controller.ts`

---

## User Management

### Accessing User Management

Navigate to `/users` in admin dashboard.

**File Reference:**
- `admin/src/pages/Users.tsx`

### Viewing Users

1. Go to **Users**
2. View all users
3. Filter by:
   - Role
   - Search term
   - Status
4. Click user to view details

**API Endpoint:**
- `GET /users` (admin endpoint)

**File Reference:**
- `api/src/user-management/user-management.controller.ts`

### Managing User Roles

1. Open user details
2. Edit user role
3. Save changes
4. User's access updates immediately

**Note:** Only SUPER_ADMIN can assign SUPER_ADMIN role.

**API Endpoint:**
- `PATCH /users/:id`

**File Reference:**
- `api/src/users/users.controller.ts`

### Inviting Users

1. Go to **Users** → **Invite User**
2. Enter email
3. Select role
4. Add redirect URL (optional)
5. Send invitation

**API Endpoint:**
- `POST /users/invite`

---

## Organization Management

### Accessing Organizations

Navigate to `/organizations` in admin dashboard.

**File Reference:**
- `admin/src/pages/Organizations.tsx`

### Viewing Organizations

1. Go to **Organizations**
2. View all organizations
3. Filter by type, region, search
4. Click organization to view details

**API Endpoint:**
- `GET /admin/organizations`

### Managing Organizations

1. Open organization details
2. Edit organization information
3. Manage organization members
4. View organization subscriptions
5. Save changes

---

## Content Management

### Accessing Content

Navigate to `/content` in admin dashboard.

**File Reference:**
- `admin/src/pages/Content.tsx`

### Managing Content

1. View all content items
2. Filter by category, status
3. Edit content
4. Publish/archive content
5. Delete content

**API Endpoints:**
- `GET /admin/content-management/content`
- `POST /admin/content-management/content`
- `PATCH /admin/content-management/content/:id`
- `DELETE /admin/content-management/content/:id`

**File Reference:**
- `api/src/content-management/content-management.controller.ts`

### Content Categories

- HR Documents
- E-Learning content
- State Policies
- Other content types

---

## Subscription Management

### Accessing Subscriptions

Navigate to `/subscriptions` in admin dashboard.

**File Reference:**
- `admin/src/pages/Subscriptions.tsx`

### Viewing Subscriptions

1. Go to **Subscriptions**
2. View all subscriptions
3. Filter by:
   - Status
   - Plan
   - User/Organization
   - Expiry date
4. Click subscription to view details

**API Endpoint:**
- `GET /admin/subscription-management/subscriptions`

**File Reference:**
- `api/src/subscription-management/subscription-management.controller.ts`

### Managing Subscription Requests

1. Go to **Subscriptions** → **Requests**
2. View pending requests
3. Review request details
4. Process request:
   - Mark as under review
   - Send invoice
   - Confirm payment
   - Activate subscription
   - Decline request
5. Add notes

**API Endpoints:**
- `GET /admin/subscription-management/requests`
- `POST /admin/subscription-management/requests/:id/review`
- `POST /admin/subscription-management/requests/:id/send-invoice`
- `POST /admin/subscription-management/requests/:id/confirm-payment`
- `POST /admin/subscription-management/requests/:id/activate`
- `POST /admin/subscription-management/requests/:id/decline`

### Managing Subscriptions

1. Open subscription details
2. View subscription history
3. Perform actions:
   - Activate
   - Pause
   - Resume
   - Cancel
   - Renew
   - Extend
   - Upgrade/Downgrade
4. Add notes
5. Schedule actions

**API Endpoints:**
- `POST /admin/subscription-management/subscriptions/:id/activate`
- `POST /admin/subscription-management/subscriptions/:id/pause`
- `POST /admin/subscription-management/subscriptions/:id/cancel`
- `POST /admin/subscription-management/subscriptions/:id/upgrade`

### Managing Cancellation Requests

1. Go to **Subscriptions** → **Cancellation Requests**
2. View pending cancellations
3. Review cancellation reason
4. Approve or decline cancellation
5. Add notes

**API Endpoints:**
- `GET /admin/subscription-management/cancellation-requests`
- `POST /admin/subscription-management/cancellation-requests/:id/approve`
- `POST /admin/subscription-management/cancellation-requests/:id/decline`

### Subscription Plans

1. Go to **Subscriptions** → **Plans**
2. View all subscription plans
3. Create new plan
4. Edit plan details
5. Activate/deactivate plans

**API Endpoints:**
- `GET /admin/subscription-management/plans`
- `POST /admin/subscription-management/plans`
- `PUT /admin/subscription-management/plans/:id`

---

## Support Ticket Management

### Accessing Support

Navigate to `/support` in admin dashboard.

**File Reference:**
- `admin/src/pages/Support.tsx`

### Viewing Tickets

1. Go to **Support**
2. View all tickets
3. Filter by:
   - Status
   - Priority
   - Category
   - Search term
4. Click ticket to view details

**API Endpoint:**
- `GET /support/admin/tickets`

**File Reference:**
- `api/src/support/support.controller.ts`

### Managing Tickets

1. Open ticket
2. View ticket details and history
3. Update status:
   - OPEN → IN_PROGRESS
   - IN_PROGRESS → RESOLVED
   - RESOLVED → CLOSED
4. Assign to admin
5. Add response
6. Add attachments

**API Endpoints:**
- `PATCH /support/admin/tickets/:id/status`
- `PATCH /support/admin/tickets/:id/assign`
- `POST /support/tickets/:id/respond`

### Ticket Statistics

View ticket statistics:
- Total tickets
- Tickets by status
- Tickets by priority
- Average response time

**API Endpoint:**
- `GET /support/admin/stats`

---

## System Monitoring

### Accessing System Monitor

Navigate to `/system` in admin dashboard.

**File Reference:**
- `admin/src/pages/SystemMonitor.tsx`

### System Health

1. View system health status
2. Check service status
3. View response times
4. Monitor errors

**API Endpoint:**
- `GET /admin/system-monitoring/health`

**File Reference:**
- `api/src/system-monitoring/system-monitoring.controller.ts`

### System Metrics

- CPU usage
- Memory usage
- Database performance
- API response times
- Error rates

**API Endpoint:**
- `GET /admin/system-monitoring/metrics`

### System Alerts

1. View system alerts
2. Filter by severity
3. Resolve alerts
4. View alert history

**API Endpoint:**
- `GET /admin/system-monitoring/alerts`

---

## Platform Settings

### Accessing Settings

Navigate to `/settings` in admin dashboard.

**File Reference:**
- `admin/src/pages/Settings.tsx`

### Frontend Settings

1. Go to **Settings** → **Frontend**
2. Configure:
   - Site name, description
   - Logo, favicon
   - Colors
   - Contact information
   - Social media links
   - SEO settings
3. Save

**API Endpoint:**
- `PUT /admin/frontend-settings`

**File Reference:**
- `api/src/frontend-settings/frontend-settings.controller.ts`

### Admin Settings

1. Go to **Settings** → **Admin**
2. Configure admin dashboard branding
3. Set admin logo, favicon
4. Configure colors

### Platform Configuration

1. Go to **Settings** → **Platform**
2. Configure:
   - Registration settings
   - Email verification
   - File upload limits
   - Session timeout
   - Password requirements
   - Maintenance mode
3. Save

**API Endpoint:**
- `PUT /admin/platform-settings`

**File Reference:**
- `api/src/platform-settings/platform-settings.controller.ts`

---

## Translation Management

### Accessing Translations

Navigate to `/translations` in admin dashboard.

**File Reference:**
- `admin/src/pages/Translations.tsx`

### Managing Translations

1. Go to **Translations**
2. Browse translation namespaces
3. View translations by language
4. Edit translations
5. Review translation status
6. Approve translations

**API Endpoints:**
- `GET /admin/static-translations`
- `PUT /admin/static-translations/:namespace/:key/:lang`

**File Reference:**
- `api/src/static-translation/static-translation.controller.ts`

### Translation Status

- **PENDING** - Awaiting translation
- **MT_DONE** - Machine translated
- **REVIEWED** - Human reviewed
- **APPROVED** - Approved for use

---

## Analytics

### Accessing Analytics

Navigate to **Dashboard** or **Analytics** section.

### Available Analytics

- User growth metrics
- Organization activity
- Product performance
- Job metrics
- Revenue metrics
- Subscription analytics

**API Endpoints:**
- `GET /admin/analytics/overview`
- `GET /admin/analytics/users?timeRange=30d`
- `GET /admin/analytics/organizations?timeRange=30d`
- `GET /admin/analytics/products?timeRange=30d`
- `GET /admin/analytics/jobs?timeRange=30d`
- `GET /admin/analytics/revenue?timeRange=30d`

**Time Ranges:** `7d`, `30d`, `90d`, `1y`

**File Reference:**
- `api/src/analytics/analytics.controller.ts`

---

## Additional Admin Features

### Content Moderation

1. Go to **Content** → **Moderation**
2. View moderation queue
3. Review flagged content
4. Approve/reject content
5. Take moderation actions

**File Reference:**
- `api/src/content-moderation/content-moderation.controller.ts`

### Discount Terminations

1. Go to **Discount Terminations**
2. View vendor-client relationships
3. Manage active client status
4. Process discount terminations

**File Reference:**
- `admin/src/pages/DiscountTerminations.tsx`
- `api/src/vendor-clients/vendor-clients.controller.ts`

### Policy Review

1. Go to **Policies** → **Review**
2. View crawled policies
3. Review policy changes
4. Approve/reject policies

**File Reference:**
- `admin/src/pages/PolicyReview.tsx`

### Canton Management

1. Go to **Cantons**
2. View all cantons
3. Manage canton sources
4. Configure crawler settings

**File Reference:**
- `admin/src/pages/Cantons.tsx`
- `admin/src/pages/CantonDetail.tsx`

### Policy Crawler (Setup & Enablement)

The Admin UI pages are always visible, but the crawler is **disabled by default** on the API.

**Enable the crawler (API):**

- Set:
  - `CRAWLER_ENABLED=true` (enables `/api/admin/crawler/*` endpoints and crawling)
  - `CRAWLER_SCHEDULER_ENABLED=true` (enables scheduled crawls at 03:00 + stale checks at 06:00)
- These variables live in `api/.env` (local) or your production environment.
  - See `api/.env.example` for the full list.

**Database setup:**

- Run migrations (must include the canton crawler migration):

  - `pnpm -C api db:migrate`

- Seed cantons (creates `cantons` records; required for the UI):

  - `pnpm -C api db:seed:cantons`

**Add sources (Admin UI):**

- Go to **Policy Crawler** → **Cantons** → select a canton → **Add Source**
- Each source URL must be **HTTPS** and on an **allowlisted domain** (SSRF protection in `api/src/crawler/crawler.service.ts`).
- Prefer `renderType=static`. `renderType=dynamic` is best-effort and only fully works if Playwright is installed/configured.

**Run it:**

- Manual: in the canton detail page click **Crawl now** (calls `POST /api/admin/crawler/trigger/:sourceId`)
- Scheduled: daily at **03:00** (requires `CRAWLER_SCHEDULER_ENABLED=true` and an always-on API process)

**Review results:**

- New/changed documents are created/flagged as `crawlStatus=pending_review`
- Review in **Policy Crawler** → **Policy Review**

---

## Under the Hood

### API Endpoints

**User Management:**
- `GET /users` (admin)
- `PATCH /users/:id`
- `POST /users/invite`

**Subscription Management:**
- `GET /admin/subscription-management/subscriptions`
- `POST /admin/subscription-management/subscriptions/:id/activate`
- `GET /admin/subscription-management/requests`

**Support:**
- `GET /support/admin/tickets`
- `PATCH /support/admin/tickets/:id/status`

**Files:**
- `api/src/admin/admin.controller.ts`
- `api/src/user-management/user-management.controller.ts`
- `api/src/subscription-management/subscription-management.controller.ts`

### Database Models

**Key Models:**
- `User` - User accounts
- `Organization` - Organizations
- `Subscription` - Subscriptions
- `SubscriptionRequest` - Subscription requests
- `SupportTicket` - Support tickets
- `ContentItem` - Content items
- `AuditLog` - Audit logs

**File Reference:**
- `api/prisma/schema.prisma`

---

## Security Notes

- Admin actions are logged in audit logs
- Role changes are tracked
- Sensitive operations require confirmation
- All admin endpoints require authentication and admin role

**File Reference:**
- `api/src/admin/audit-logs.controller.ts`

---

## Next Steps

- Review [Feature Inventory](../_inventory/FEATURE_INVENTORY.md) for complete feature list
- Check [API Endpoints Map](../_inventory/API_ENDPOINTS_MAP.md) for API reference

