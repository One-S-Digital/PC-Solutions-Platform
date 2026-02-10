# Mailing List Feature — Development Plan

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Audit & Reuse Analysis](#2-codebase-audit--reuse-analysis)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Model Changes](#4-data-model-changes)
5. [API Endpoints](#5-api-endpoints)
6. [Shared Filter Query Builder](#6-shared-filter-query-builder)
7. [Admin Frontend Screens](#7-admin-frontend-screens)
8. [Implementation Phases](#8-implementation-phases)
9. [Compliance & Safeguards](#9-compliance--safeguards)
10. [Testing Strategy](#10-testing-strategy)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [File-by-File Change Map](#12-file-by-file-change-map)

---

## 1. Executive Summary

This plan details the implementation of a dynamic Mailing List feature for the ProCreche Admin Dashboard. It enables admins to:

- Build targeted contact lists using combinable filters against **existing** platform data
- Preview recipient counts and sample rows in real-time
- Save filter configurations as reusable named segments
- Export lists as CSV/XLSX with selectable columns
- Send emails via batched campaigns (no background workers)
- Track delivery outcomes and maintain compliance (suppression list, audit logs)

**Key constraint**: No background job processing. All sending uses a cursor-based batch endpoint that the frontend drives iteratively.

**Reuse-first approach**: No new user/contact/subscription tables. We query the existing `users`, `organizations`, `user_organizations`, `subscriptions`, `user_notification_preferences` tables. Only two new tables are created: `mailing_segments` and `mailing_campaigns`.

---

## 2. Codebase Audit & Reuse Analysis

### 2.1 Existing Data Sources (REUSE)

| Need | Existing Source | Location |
|------|----------------|----------|
| User identity | `User` model | `api/prisma/schema.prisma:195-298` |
| User roles | `User.role` (single `UserRole` enum) | `schema.prisma:14-22` — Values: `SUPER_ADMIN`, `ADMIN`, `FOUNDATION`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`, `EDUCATOR`, `PARENT` |
| Account status | `User.isActive`, `User.deactivatedAt` | `schema.prisma:232-235` |
| User activity | `User.lastActiveAt` | `schema.prisma:231` |
| Email | `User.email` (nullable, unique) | `schema.prisma:198` |
| Name fields | `User.firstName`, `User.lastName` | `schema.prisma:199-200` |
| Language | `Organization.languages[]` | `schema.prisma:383` — Note: No `User.language` field exists directly; language lives on `Organization` |
| Location (canton/city) | `Organization.canton`, `Organization.city`, `Organization.regionsServed[]` | `schema.prisma:381-383` |
| Organization link | `UserOrganization` join table | `schema.prisma:457-469` |
| Organization details | `Organization` model | `schema.prisma:369-439` |
| Subscription status | `Subscription` model: `status`, `tier`, `currentPeriodEnd` | `schema.prisma:891-954` |
| Subscription plans | `SubscriptionPlan` model | `schema.prisma:1784-1824` |
| Notification preferences | `UserNotificationPreferences` model: `marketing`, `emailNotifications` | `schema.prisma:1749-1781` |
| Email logs (existing) | `EmailLog` model | `schema.prisma:1719-1735` |

### 2.2 Existing Services (REUSE)

| Service | What it provides | How we reuse it |
|---------|------------------|-----------------|
| `EmailNotificationService` | SendGrid integration, `sendNotification()`, `sendBulkNotification()`, template processing, email logging | Use `sendNotification()` for individual emails in batches; reuse `logEmail()` for campaign logging |
| `EmailTemplateService` | Template management | Reuse for campaign templates, or allow raw HTML in campaigns |
| `UserManagementService` | `getUsers()` with filters, `exportUsers()` | Reference the filter pattern; **do not duplicate** — the mailing filter builder is more advanced but follows same Prisma `where` construction |
| `PrismaService` | Database access | Standard usage |
| `AuditLog` model | Existing audit logging | Reuse for export/send audit entries |

### 2.3 Existing Admin UI Components (REUSE)

| Component | Purpose | Reuse for |
|-----------|---------|-----------|
| `Card` (`admin/src/components/design-system/Card.tsx`) | Card container | Segment list cards, filter panel cards |
| `Button` (`admin/src/components/design-system/Button.tsx`) | Action buttons | All actions |
| `Tabs` (`admin/src/components/design-system/Tabs.tsx`) | Tab navigation | Campaign detail tabs (compose/preview/status) |
| `ToggleSwitch` (`admin/src/components/design-system/ToggleSwitch.tsx`) | Boolean toggles | Filter toggles (opt-in, exclude) |
| `ChipInput` (`admin/src/components/design-system/ChipInput.tsx`) | Tag-style input | Active filters display |
| `LoadingSpinner` (`admin/src/components/ui/LoadingSpinner.tsx`) | Loading states | Preview loading, send progress |
| `STANDARD_INPUT_FIELD` (`admin/src/constants/design-system.ts`) | Input styling | Filter inputs |
| `useDebouncedValue` (`admin/src/hooks/useDebouncedValue.ts`) | Debounce hook | Filter input debouncing for preview |
| `useApiClient` / `apiService` pattern (`admin/src/services/api.ts`) | Auth-aware API client | All mailing API calls |
| Sidebar navigation (`admin/src/components/Sidebar.tsx`) | Nav structure | Add "Mailing Lists" nav item |
| React Query pattern | Data fetching | All data loading |
| `sonner` toast notifications | User feedback | Success/error notifications |
| `lucide-react` icons | Iconography | All icons |
| Tailwind CSS | Styling | All styling |

### 2.4 Existing Infra NOT to Create

| Concept | Why not needed |
|---------|---------------|
| Contact table | `User` IS the contact. All contact attributes exist on User + Organization. |
| Subscription filter logic | `Subscription` model already has `status`, `tier`, `currentPeriodEnd`. Query it directly. |
| Role-based filter | `User.role` is a single enum field — direct filter. |
| Email provider integration | `EmailNotificationService` already wraps SendGrid. |
| Email logging | `EmailLog` model already exists. |
| Audit logging | `AuditLog` model already exists. |
| Suppression list | `UserNotificationPreferences.marketing` + checking `User.email IS NOT NULL` handles this. We note that a dedicated `Suppression` table is mentioned in the brief but does not need to be created for MVP — we use `UserNotificationPreferences.marketing = false` as the suppression signal. |

### 2.5 Fields That Do NOT Exist (Hide These Filters)

| Filter from Brief | Status | Action |
|-------------------|--------|--------|
| `User.language` | Does NOT exist on User. Language exists only on `Organization.languages[]` | Implement as "Organization language" filter via join; label clearly in UI |
| Email verified (Yes/No) | No `emailVerified` field exists on User | **Hide this filter** in MVP |
| Profile completeness (%) | No computed field exists | **Hide this filter** in MVP |
| Marketing opt-in | `UserNotificationPreferences.marketing` exists | Use as-is |
| Renewal date range | `Subscription.currentPeriodEnd` exists | Use as-is |
| Last payment date | No explicit "last payment" date. `BillingTransaction.createdAt` exists | Can implement as "latest billing transaction date" if needed; defer to Phase 2 |
| Feature usage flags | No standardized feature usage tracking | **Hide this filter** in MVP |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    ADMIN FRONTEND                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐             │
│  │ Segments  │  │Build List│  │ Campaigns  │             │
│  │ Screen A  │  │ Screen B │  │  Screen C  │             │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘             │
│       │              │              │                     │
│       │   ┌──────────┴──────────┐   │                    │
│       └───┤   apiService calls  ├───┘                    │
│           └──────────┬──────────┘                        │
└──────────────────────┼───────────────────────────────────┘
                       │ HTTP (Bearer token)
┌──────────────────────┼───────────────────────────────────┐
│                 API SERVER (NestJS)                       │
│                      │                                    │
│  ┌───────────────────┴──────────────────┐                │
│  │     MailingController                 │                │
│  │  POST /admin/mailing/preview          │                │
│  │  CRUD /admin/mailing/segments         │                │
│  │  POST /admin/mailing/export           │                │
│  │  POST /admin/mailing/campaigns        │                │
│  │  POST /admin/mailing/campaigns/:id/   │                │
│  │       send-batch                      │                │
│  │  GET  /admin/mailing/campaigns        │                │
│  │  GET  /admin/mailing/campaigns/:id    │                │
│  └───────────────────┬──────────────────┘                │
│                      │                                    │
│  ┌───────────────────┴──────────────────┐                │
│  │     MailingService                    │                │
│  │  - buildRecipientQuery(filters)       │  ← SINGLE     │
│  │  - previewRecipients()                │    SOURCE      │
│  │  - exportRecipients()                 │    OF TRUTH    │
│  │  - createCampaign()                   │    FOR ALL     │
│  │  - sendBatch()                        │    QUERIES     │
│  └──────┬────────────┬──────────────────┘                │
│         │            │                                    │
│  ┌──────┴─┐   ┌──────┴──────────┐                       │
│  │ Prisma │   │EmailNotification│                        │
│  │Service │   │    Service       │                        │
│  └────────┘   └─────────────────┘                        │
│                                                           │
│  Existing tables:          New tables:                    │
│  users, organizations,     mailing_segments,              │
│  user_organizations,       mailing_campaigns              │
│  subscriptions,                                           │
│  user_notification_prefs,                                 │
│  email_logs, audit_logs                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Data Model Changes

### 4.1 New Prisma Models

Add the following to `api/prisma/schema.prisma`:

```prisma
// =====================================
// Mailing List Feature
// =====================================

enum MailingCampaignStatus {
  DRAFT
  SENDING
  SENT
  FAILED
  CANCELLED
}

model MailingSegment {
  id            String   @id @default(uuid())
  name          String
  description   String?  @db.Text
  filtersJson   Json     @map("filters_json")  // Stored filter configuration
  createdById   String   @map("created_by_id")
  estimatedSize Int?     @map("estimated_size") // Cached count at last computation
  lastComputedAt DateTime? @map("last_computed_at")
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  // Relations
  campaigns     MailingCampaign[]

  @@index([createdById])
  @@map("mailing_segments")
}

model MailingCampaign {
  id              String                @id @default(uuid())
  subject         String
  bodyHtml        String                @db.Text @map("body_html")
  bodyText        String?               @db.Text @map("body_text")
  
  // Recipient source (one must be set)
  segmentId       String?               @map("segment_id")
  filtersJson     Json?                 @map("filters_json") // Ad-hoc filters (if no segment)
  
  // Status & progress
  status          MailingCampaignStatus @default(DRAFT)
  totalEstimated  Int                   @default(0) @map("total_estimated")
  sentCount       Int                   @default(0) @map("sent_count")
  failedCount     Int                   @default(0) @map("failed_count")
  cursor          String?               // Last processed user ID for batch continuation
  
  // Admin tracking
  createdById     String                @map("created_by_id")
  sentAt          DateTime?             @map("sent_at")      // When first batch was sent
  completedAt     DateTime?             @map("completed_at") // When all batches completed
  
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")
  
  // Relations
  segment         MailingSegment?       @relation(fields: [segmentId], references: [id], onDelete: SetNull)

  @@index([status])
  @@index([createdById])
  @@index([segmentId])
  @@map("mailing_campaigns")
}
```

### 4.2 Migration

Create migration: `20260210000000_add_mailing_list_feature/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "MailingCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "mailing_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters_json" JSONB NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "estimated_size" INTEGER,
    "last_computed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "segment_id" TEXT,
    "filters_json" JSONB,
    "status" "MailingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "total_estimated" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "cursor" TEXT,
    "created_by_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailing_segments_created_by_id_idx" ON "mailing_segments"("created_by_id");

-- CreateIndex
CREATE INDEX "mailing_campaigns_status_idx" ON "mailing_campaigns"("status");
CREATE INDEX "mailing_campaigns_created_by_id_idx" ON "mailing_campaigns"("created_by_id");
CREATE INDEX "mailing_campaigns_segment_id_idx" ON "mailing_campaigns"("segment_id");

-- AddForeignKey
ALTER TABLE "mailing_campaigns" ADD CONSTRAINT "mailing_campaigns_segment_id_fkey" 
    FOREIGN KEY ("segment_id") REFERENCES "mailing_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 4.3 Why No Additional Tables

- **No `Suppression` table**: The brief mentions a dedicated suppression table, but for MVP we use `UserNotificationPreferences.marketing = false` as the opt-out signal. If hard-bounce tracking is needed later, extend `EmailLog` with a `bounceType` field or create a minimal `email_suppressions` table in Phase 3.
- **No `mailing_campaign_recipients` table**: Per-recipient tracking adds significant complexity. For the basic version, aggregate counts (`sentCount`, `failedCount`) on the campaign record suffice. The existing `EmailLog` table already captures per-email send status and can be queried by campaign event.
- **No snapshot segment members table**: All segments are dynamic (filters recalculated on use). Snapshot segments are deferred to Phase 3.

---

## 5. API Endpoints

All endpoints live under the `/admin/mailing` prefix, guarded by `@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)`.

### 5.1 Preview Recipients

```
POST /admin/mailing/preview
```

**Request body:**
```typescript
{
  filters: MailingFilters;   // Filter configuration (see Section 6)
  page?: number;             // Default: 1
  pageSize?: number;         // Default: 20, max: 100
  sort?: 'email' | 'name' | 'role' | 'createdAt';  // Default: 'email'
  sortOrder?: 'asc' | 'desc';  // Default: 'asc'
}
```

**Response:**
```typescript
{
  count: number;                // Total matching recipients
  rows: PreviewRow[];           // Paginated preview data
  warnings: string[];           // E.g., "3 contacts have no email address"
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**PreviewRow:**
```typescript
{
  id: string;           // User ID
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgName: string | null;
  canton: string | null;
  isActive: boolean;
  hasSubscription: boolean;
  marketingOptIn: boolean;
}
```

### 5.2 Segments CRUD

```
POST   /admin/mailing/segments          — Create segment
GET    /admin/mailing/segments          — List segments (paginated)
GET    /admin/mailing/segments/:id      — Get segment detail
PUT    /admin/mailing/segments/:id      — Update segment
DELETE /admin/mailing/segments/:id      — Delete segment
POST   /admin/mailing/segments/:id/refresh — Recompute estimated size
```

**Create/Update body:**
```typescript
{
  name: string;
  description?: string;
  filters: MailingFilters;
}
```

**Segment response:**
```typescript
{
  id: string;
  name: string;
  description: string | null;
  filtersJson: MailingFilters;
  estimatedSize: number | null;
  lastComputedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.3 Export

```
POST /admin/mailing/export
```

**Request body:**
```typescript
{
  filters?: MailingFilters;    // Ad-hoc filters
  segmentId?: string;          // OR use a saved segment
  format: 'csv' | 'xlsx';
  columns: string[];           // Columns to include: ['email', 'firstName', 'lastName', 'role', 'orgName', 'canton', 'city', 'subscriptionStatus', 'createdAt']
  deduplicateByEmail?: boolean; // Default: true
}
```

**Response:** Streamed file download with appropriate Content-Type and Content-Disposition headers.

**Audit:** Every export creates an `AuditLog` entry with:
- `entity: 'MailingExport'`
- `action: 'export'`
- `actorId: adminUserId`
- `metadata: { segmentId, format, columns, recordCount }`

### 5.4 Campaigns

```
POST /admin/mailing/campaigns              — Create campaign
GET  /admin/mailing/campaigns              — List campaigns (paginated)
GET  /admin/mailing/campaigns/:id          — Get campaign detail
POST /admin/mailing/campaigns/:id/send-batch — Send next batch
POST /admin/mailing/campaigns/:id/cancel    — Cancel sending
```

**Create campaign body:**
```typescript
{
  subject: string;
  bodyHtml: string;
  bodyText?: string;          // Plain text fallback (auto-generated if omitted)
  filters?: MailingFilters;   // Ad-hoc filters
  segmentId?: string;         // OR use a saved segment
}
```

**Create campaign response:**
```typescript
{
  campaignId: string;
  estimatedCount: number;
  status: 'DRAFT';
}
```

**Send batch request:**
```typescript
{
  batchSize?: number;  // Default: 100, min: 50, max: 200
}
```

**Send batch response:**
```typescript
{
  sentCountThisBatch: number;
  failedCountThisBatch: number;
  totalSentSoFar: number;
  totalFailedSoFar: number;
  nextCursor: string | null;    // null means done
  done: boolean;
  totalEstimated: number;
}
```

**Campaign list response:**
```typescript
{
  id: string;
  subject: string;
  status: MailingCampaignStatus;
  totalEstimated: number;
  sentCount: number;
  failedCount: number;
  segmentName: string | null;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
}
```

---

## 6. Shared Filter Query Builder

The `buildRecipientQuery(filters)` function is the **single source of truth** used by preview, export, and send.

### 6.1 MailingFilters Schema

```typescript
interface MailingFilters {
  // A) Role / account type (multi-select, OR within)
  roles?: UserRole[];              // e.g., ['FOUNDATION', 'PRODUCT_SUPPLIER']
  excludeRoles?: UserRole[];       // Exclude specific roles

  // B) Account status
  isActive?: boolean;              // true = active only, false = inactive only, undefined = all
  
  // C) Subscription & billing
  hasSubscription?: boolean;       // true = has any subscription, false = no subscription
  subscriptionStatuses?: SubscriptionStatus[];  // e.g., ['ACTIVE', 'TRIAL']
  subscriptionTiers?: SubscriptionTier[];       // e.g., ['PROFESSIONAL', 'ENTERPRISE']
  renewalDateFrom?: string;        // ISO date — currentPeriodEnd >= this
  renewalDateTo?: string;          // ISO date — currentPeriodEnd <= this

  // D) Location & language
  cantons?: string[];              // Organization canton values (OR within)
  cities?: string[];               // Organization city values (OR within)
  languages?: string[];            // Organization.languages overlap (OR within)

  // E) Communication preference
  marketingOptIn?: boolean;        // true = only opted-in, false = only opted-out
  excludeUnsubscribed?: boolean;   // Default: true — ALWAYS enforced unless explicitly false

  // F) Date ranges
  createdFrom?: string;            // User created after this date
  createdTo?: string;              // User created before this date
  lastActiveFrom?: string;         // Last active after this date
  lastActiveTo?: string;           // Last active before this date

  // G) Search
  search?: string;                 // Free-text search on email, firstName, lastName
}
```

### 6.2 Query Construction Logic

```typescript
// Pseudocode for buildRecipientQuery(filters: MailingFilters)

function buildRecipientWhere(filters: MailingFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    // HARD RULE: Always exclude users with no email
    email: { not: null },
    // HARD RULE: Always exclude SUPER_ADMIN and ADMIN roles from recipient lists
    role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  };

  // Exclude unsubscribed by default
  if (filters.excludeUnsubscribed !== false) {
    where.OR = [
      { notificationPreferences: null },  // No preferences = default opt-in
      { notificationPreferences: { marketing: true } },
    ];
    // Note: this replaces any existing OR; actual implementation
    // needs AND-composition with other OR clauses
  }

  // A) Roles filter (OR within)
  if (filters.roles?.length) {
    where.role = { in: filters.roles };
  }
  if (filters.excludeRoles?.length) {
    where.role = { ...where.role, notIn: filters.excludeRoles };
  }

  // B) Account status
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // C) Subscription filters — join through User -> Subscription
  if (filters.hasSubscription !== undefined || 
      filters.subscriptionStatuses?.length || 
      filters.subscriptionTiers?.length ||
      filters.renewalDateFrom || filters.renewalDateTo) {
    
    const subscriptionWhere: any = {};
    
    if (filters.subscriptionStatuses?.length) {
      subscriptionWhere.status = { in: filters.subscriptionStatuses };
    }
    if (filters.subscriptionTiers?.length) {
      subscriptionWhere.tier = { in: filters.subscriptionTiers };
    }
    if (filters.renewalDateFrom || filters.renewalDateTo) {
      subscriptionWhere.currentPeriodEnd = {};
      if (filters.renewalDateFrom) subscriptionWhere.currentPeriodEnd.gte = new Date(filters.renewalDateFrom);
      if (filters.renewalDateTo) subscriptionWhere.currentPeriodEnd.lte = new Date(filters.renewalDateTo);
    }

    if (filters.hasSubscription === true) {
      // User has a subscription matching sub-filters (via user.mainSubscriptions)
      where.mainSubscriptions = { some: subscriptionWhere };
    } else if (filters.hasSubscription === false) {
      where.mainSubscriptions = { none: {} };
    } else if (Object.keys(subscriptionWhere).length > 0) {
      // Sub-filters set without explicit hasSubscription — implies "has matching subscription"
      where.mainSubscriptions = { some: subscriptionWhere };
    }
  }

  // D) Location & language — via Organization join
  const orgWhere: any = {};
  if (filters.cantons?.length) {
    orgWhere.organization = { ...orgWhere.organization, canton: { in: filters.cantons } };
  }
  if (filters.cities?.length) {
    orgWhere.organization = { ...orgWhere.organization, city: { in: filters.cities } };
  }
  if (filters.languages?.length) {
    orgWhere.organization = { ...orgWhere.organization, languages: { hasSome: filters.languages } };
  }
  if (Object.keys(orgWhere).length > 0) {
    where.organizations = { some: orgWhere };
  }

  // E) Marketing opt-in (separate from excludeUnsubscribed)
  if (filters.marketingOptIn === true) {
    // Only users who explicitly opted in
    where.notificationPreferences = { marketing: true };
  } else if (filters.marketingOptIn === false) {
    where.notificationPreferences = { marketing: false };
  }

  // F) Date ranges
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};
    if (filters.createdFrom) where.createdAt.gte = new Date(filters.createdFrom);
    if (filters.createdTo) where.createdAt.lte = new Date(filters.createdTo);
  }
  if (filters.lastActiveFrom || filters.lastActiveTo) {
    where.lastActiveAt = {};
    if (filters.lastActiveFrom) where.lastActiveAt.gte = new Date(filters.lastActiveFrom);
    if (filters.lastActiveTo) where.lastActiveAt.lte = new Date(filters.lastActiveTo);
  }

  // G) Search
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
        ],
      },
    ];
  }

  return where;
}
```

### 6.3 Filter Logic Rules

- **AND across filter groups**: Roles AND Status AND Subscription AND Location AND Communication preferences
- **OR within a filter group**: e.g., role IN ('FOUNDATION', 'PRODUCT_SUPPLIER')
- **Exclude toggles**: `excludeRoles` removes specific roles; `excludeUnsubscribed` (default ON) removes marketing opt-outs
- **Hard exclusions**: Always exclude `SUPER_ADMIN`/`ADMIN` from mailings; always exclude `email IS NULL`

---

## 7. Admin Frontend Screens

### 7.1 Routing

Add to `admin/src/App.tsx`:

```tsx
<Route path="mailing" element={<MailingListPage />} />
<Route path="mailing/segments/:id" element={<MailingSegmentDetail />} />
<Route path="mailing/campaigns/:id" element={<MailingCampaignDetail />} />
```

Add to `admin/src/components/Sidebar.tsx`:

```tsx
{ key: 'mailingLists', href: '/mailing', icon: Mail },
```

Place between "subscriptions" and "policyCrawler" in the navigation array.

### 7.2 Screen A — Mailing Lists / Segments (`/mailing`)

**Layout:** Tabs at top: "Segments" | "Campaigns" | "Build a List"

**Segments Tab:**
- Table with columns: Name, Type (Dynamic), Estimated Size, Last Updated, Created By, Actions
- Actions: Use (go to Build List with segment loaded), Export, Edit, Delete
- "New Segment" button → opens Build a List tab

**Campaigns Tab:**
- Table with columns: Subject, Status (badge), Recipients, Sent/Failed, Segment, Created, Sent At
- Status badges: Draft (gray), Sending (blue pulse), Sent (green), Failed (red), Cancelled (yellow)
- Click row → Campaign detail page

### 7.3 Screen B — Build a List (`/mailing?tab=build` or via segment)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ [Active filters chips]  [Clear All]                  │
│ Count: 1,247 recipients    [Save] [Export] [Send]    │
│ ⚠️ Includes 12 contacts with marketing opt-out OFF   │
├──────────────┬──────────────────────────────────────┤
│  FILTERS     │  PREVIEW TABLE                        │
│              │                                        │
│ ▼ Role       │  Email | Name | Role | Org | Canton   │
│ ☑ Foundation │  user@… | John | FOUND… | Dayc… | VD │
│ ☑ Supplier   │  ...                                  │
│ ☐ Educator   │                                       │
│              │                                        │
│ ▼ Status     │  [< 1  2  3  ... 63 >]               │
│ ● Active     │                                        │
│              │                                        │
│ ▼ Subscript… │                                        │
│ ▼ Location   │                                        │
│ ▼ Communicat…│                                        │
│ ▼ Date Range │                                        │
└──────────────┴──────────────────────────────────────┘
```

**Filter Panel (left, collapsible sections):**

1. **Role / Account Type** — Multi-checkbox: Foundation, Supplier, Service Provider, Educator, Parent. "Exclude" toggle per role.
2. **Account Status** — Radio: All / Active / Inactive
3. **Subscription** — Toggle: Has subscription (Yes/No/Any). Sub-filters: Status multi-select, Tier multi-select, Renewal date range picker.
4. **Location** — Canton multi-select (populated from existing `Organization.canton` distinct values), City text input.
5. **Communication** — Toggle: Marketing opted-in only. Warning chip: "Exclude unsubscribed: ON" (default, can be toggled with confirmation).
6. **Date Ranges** — Created date range, Last active date range.
7. **Search** — Text input (email, name).

**Preview Table (center):**
- Paginated table (20 rows/page)
- Columns: checkbox (optional for manual exclude), Email, Name, Role, Organization, Canton, Subscription Status
- Shows count at top
- Debounced filter changes (300ms) trigger preview refresh

**Action Buttons (top right):**
- **Save Segment**: Opens modal to name + describe, saves current filters as segment
- **Export**: Opens modal to select format (CSV/XLSX) and columns
- **Send Email**: Opens compose modal → creates campaign

### 7.4 Screen C — Campaign Detail (`/mailing/campaigns/:id`)

**Layout:**
- Header: Subject, Status badge, Created date
- Metrics cards: Estimated | Sent | Failed | Completion %
- Progress bar (during sending)
- Action buttons: Resume Sending (if paused/interrupted), Cancel (if sending)
- Section: Campaign content preview (HTML rendered)
- Section: Filter/segment info

### 7.5 New Components

| Component | File | Description |
|-----------|------|-------------|
| `MailingListPage` | `admin/src/pages/MailingList.tsx` | Main page with tabs |
| `MailingFilterPanel` | `admin/src/components/mailing/MailingFilterPanel.tsx` | Collapsible filter sidebar |
| `MailingPreviewTable` | `admin/src/components/mailing/MailingPreviewTable.tsx` | Recipient preview table |
| `MailingSegmentDetail` | `admin/src/pages/MailingSegmentDetail.tsx` | Segment detail/edit page |
| `MailingCampaignDetail` | `admin/src/pages/MailingCampaignDetail.tsx` | Campaign detail with metrics |
| `SaveSegmentModal` | `admin/src/components/mailing/SaveSegmentModal.tsx` | Modal to name/save a segment |
| `ExportModal` | `admin/src/components/mailing/ExportModal.tsx` | Export configuration modal |
| `ComposeEmailModal` | `admin/src/components/mailing/ComposeEmailModal.tsx` | Email compose modal with subject, body, preview |
| `SendProgressOverlay` | `admin/src/components/mailing/SendProgressOverlay.tsx` | Batch sending progress UI with auto-loop |

### 7.6 Frontend Batch Sending Flow

```typescript
// In SendProgressOverlay.tsx
async function startBatchSending(campaignId: string) {
  let done = false;
  while (!done && !cancelled) {
    const response = await apiClient.post(
      `/admin/mailing/campaigns/${campaignId}/send-batch`,
      { batchSize: 100 }
    );
    const { sentCountThisBatch, totalSentSoFar, totalEstimated, done: isDone } = response.data;
    
    updateProgress(totalSentSoFar, totalEstimated);
    done = isDone;
    
    // Small delay between batches for UI responsiveness
    if (!done) await new Promise(r => setTimeout(r, 500));
  }
}
```

---

## 8. Implementation Phases

### Phase 1 — Foundation (Est. 3-4 days)

**Goal:** Database schema, API module scaffolding, shared filter query builder, preview endpoint

| Task | Files | Est. |
|------|-------|------|
| 1.1 Add Prisma models + migration | `api/prisma/schema.prisma`, `api/prisma/migrations/20260210000000_add_mailing_list_feature/migration.sql` | 1h |
| 1.2 Create `MailingModule` scaffold | `api/src/mailing/mailing.module.ts`, `mailing.controller.ts`, `mailing.service.ts` | 1h |
| 1.3 Register module in `AppModule` | `api/src/app.module.ts` | 15m |
| 1.4 Define DTOs | `api/src/mailing/dto/mailing-filters.dto.ts`, `preview.dto.ts`, `segment.dto.ts`, `campaign.dto.ts`, `export.dto.ts` | 1h |
| 1.5 Implement `buildRecipientQuery()` | `api/src/mailing/mailing.service.ts` | 3h |
| 1.6 Implement preview endpoint | `api/src/mailing/mailing.controller.ts`, `mailing.service.ts` | 2h |
| 1.7 Unit test filter query builder | `api/src/mailing/mailing.service.spec.ts` | 2h |

**Deliverable:** POST `/admin/mailing/preview` returns filtered, paginated user data.

### Phase 2 — Segments & Export (Est. 2-3 days)

**Goal:** CRUD segments, export with column selection

| Task | Files | Est. |
|------|-------|------|
| 2.1 Implement segment CRUD | `mailing.service.ts`, `mailing.controller.ts` | 2h |
| 2.2 Implement segment size refresh | `mailing.service.ts` | 30m |
| 2.3 Implement CSV export (streamed) | `mailing.service.ts`, `mailing.controller.ts` | 2h |
| 2.4 Implement XLSX export (optional) | `mailing.service.ts` — depends on `exceljs` or `xlsx` package | 2h |
| 2.5 Add export audit logging | `mailing.service.ts` (uses existing `AuditLog`) | 30m |
| 2.6 Add `exceljs` dependency (if XLSX) | `api/package.json` | 15m |

**Deliverable:** Full segment CRUD + export downloads working via API.

### Phase 3 — Campaign & Batch Sending (Est. 3-4 days)

**Goal:** Campaign creation, cursor-based batch sending, basic tracking

| Task | Files | Est. |
|------|-------|------|
| 3.1 Implement campaign creation | `mailing.service.ts`, `mailing.controller.ts` | 1.5h |
| 3.2 Implement `send-batch` endpoint | `mailing.service.ts` — cursor logic, batch sending via `EmailNotificationService` | 4h |
| 3.3 Implement campaign list/detail | `mailing.controller.ts`, `mailing.service.ts` | 1.5h |
| 3.4 Implement campaign cancel | `mailing.service.ts` | 30m |
| 3.5 Add campaign audit logging | `mailing.service.ts` (uses existing `AuditLog`) | 30m |
| 3.6 Add unsubscribe link injection | `mailing.service.ts` — appends unsubscribe link to `bodyHtml` | 1h |
| 3.7 Enforce max recipients per campaign | `mailing.service.ts` — hard cap at 2,000 | 30m |
| 3.8 Add send rate limiting / delay | `mailing.service.ts` — configurable delay between emails in batch | 1h |

**Deliverable:** Full campaign lifecycle working via API.

### Phase 4 — Admin Frontend: Build List & Segments (Est. 4-5 days)

**Goal:** Admin UI for filter panel, preview table, segment management

| Task | Files | Est. |
|------|-------|------|
| 4.1 Create `MailingListPage` with tabs | `admin/src/pages/MailingList.tsx` | 2h |
| 4.2 Add route + sidebar nav | `admin/src/App.tsx`, `admin/src/components/Sidebar.tsx` | 30m |
| 4.3 Create `MailingFilterPanel` | `admin/src/components/mailing/MailingFilterPanel.tsx` | 4h |
| 4.4 Create `MailingPreviewTable` | `admin/src/components/mailing/MailingPreviewTable.tsx` | 2h |
| 4.5 Create `SaveSegmentModal` | `admin/src/components/mailing/SaveSegmentModal.tsx` | 1.5h |
| 4.6 Create segments list table | In `MailingListPage.tsx` | 2h |
| 4.7 Wire up API calls | `admin/src/services/api.ts` — add mailing API methods | 1h |
| 4.8 Add types | `admin/src/types/api.ts` — add mailing types | 30m |
| 4.9 Add i18n keys | `packages/translations/locales/en/admin.json` (+ fr, de) | 1h |

**Deliverable:** Admin can build lists, preview recipients, save segments.

### Phase 5 — Admin Frontend: Export & Campaigns (Est. 3-4 days)

**Goal:** Export modal, email compose, batch sending UI, campaign dashboard

| Task | Files | Est. |
|------|-------|------|
| 5.1 Create `ExportModal` | `admin/src/components/mailing/ExportModal.tsx` | 2h |
| 5.2 Create `ComposeEmailModal` | `admin/src/components/mailing/ComposeEmailModal.tsx` | 3h |
| 5.3 Create `SendProgressOverlay` | `admin/src/components/mailing/SendProgressOverlay.tsx` | 2h |
| 5.4 Create campaigns list table | In `MailingListPage.tsx` campaigns tab | 2h |
| 5.5 Create `MailingCampaignDetail` | `admin/src/pages/MailingCampaignDetail.tsx` | 3h |
| 5.6 Add campaign routes | `admin/src/App.tsx` | 15m |
| 5.7 Polish & edge cases | Error handling, loading states, empty states | 2h |

**Deliverable:** Full mailing list feature working end-to-end in admin.

### Phase 6 — Polish & Hardening (Est. 1-2 days)

| Task | Description | Est. |
|------|-------------|------|
| 6.1 E2E testing | Manual test flows + automated API tests | 3h |
| 6.2 Compliance review | Verify unsubscribe enforcement, audit trail completeness | 1h |
| 6.3 Performance testing | Test with large user sets, verify pagination/batching | 1h |
| 6.4 Error handling review | Graceful failures, retry logic, user-facing error messages | 1h |
| 6.5 Documentation | Update admin guide | 1h |

---

## 9. Compliance & Safeguards

### 9.1 Suppression / Opt-out Enforcement

- `buildRecipientQuery()` **always** adds `excludeUnsubscribed: true` by default
- This filters out users with `UserNotificationPreferences.marketing = false`
- Admin can see a warning but cannot bypass suppression for marketing emails
- Transactional emails (if needed) would use a different code path

### 9.2 Unsubscribe Link

- Every campaign email has an unsubscribe link appended to `bodyHtml`
- Link points to: `{FRONTEND_URL}/unsubscribe?token={jwt_token}`
- Token encodes: `{ userId, campaignId, email }` with 30-day expiry
- Unsubscribe endpoint updates `UserNotificationPreferences.marketing = false`

### 9.3 Company Footer

- Every campaign email includes a mandatory footer:
  - Company name: From `FrontendSettings.siteName` or fallback "ProCreche Solutions"
  - Contact email: From `FrontendSettings.contactEmail`
  - Unsubscribe link

### 9.4 Permission Gating

- All mailing endpoints require `SUPER_ADMIN` or `ADMIN` role
- Export + Send actions create `AuditLog` entries
- Campaign creation logs the admin who created it

### 9.5 Rate Limiting & Batching

- Batch size: 50-200 emails per API call (default 100)
- Inter-email delay: 100ms within a batch (configurable)
- Max recipients per campaign: 2,000 (hard cap in MVP)
- If list exceeds 2,000: API returns error, admin must narrow filters
- API route timeout: Ensure NestJS timeout >= 30s for batch endpoint

### 9.6 Data Minimization

- Export: Admin explicitly selects which columns to include
- Preview: Shows only essential columns
- Campaign emails: Only the fields needed for personalization tokens are loaded

### 9.7 Audit Trail

All auditable actions create entries in the existing `AuditLog` table:

| Action | Entity | Metadata |
|--------|--------|----------|
| Create segment | `MailingSegment` | `{ name, filtersSummary }` |
| Update segment | `MailingSegment` | `{ changes }` |
| Delete segment | `MailingSegment` | `{ name }` |
| Export | `MailingExport` | `{ segmentId, format, columns, recordCount }` |
| Create campaign | `MailingCampaign` | `{ subject, segmentId, estimatedCount }` |
| Send batch | `MailingCampaign` | `{ batchSize, sentCount, failedCount }` |
| Cancel campaign | `MailingCampaign` | `{ reason }` |

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Test | Location | Coverage |
|------|----------|----------|
| `buildRecipientQuery` — role filters | `mailing.service.spec.ts` | All role combinations, exclude logic |
| `buildRecipientQuery` — subscription filters | `mailing.service.spec.ts` | Has/no subscription, status combos |
| `buildRecipientQuery` — location filters | `mailing.service.spec.ts` | Canton, city, language |
| `buildRecipientQuery` — suppression enforcement | `mailing.service.spec.ts` | Cannot bypass unsubscribed |
| `buildRecipientQuery` — admin exclusion | `mailing.service.spec.ts` | SUPER_ADMIN/ADMIN never included |
| `buildRecipientQuery` — null email exclusion | `mailing.service.spec.ts` | Users with null email excluded |
| `buildRecipientQuery` — combined filters (AND logic) | `mailing.service.spec.ts` | Multiple filter groups together |
| Export column selection | `mailing.service.spec.ts` | Only selected columns in output |

### 10.2 Integration Tests

| Test | Location | Coverage |
|------|----------|----------|
| Preview endpoint returns correct count | `mailing.e2e-spec.ts` | With seed data, verify counts |
| Segment CRUD lifecycle | `mailing.e2e-spec.ts` | Create, read, update, delete |
| Export produces valid CSV | `mailing.e2e-spec.ts` | Download and parse CSV |
| Campaign batch sending | `mailing.e2e-spec.ts` | Create campaign, send batches, verify completion |
| Auth guard enforcement | `mailing.e2e-spec.ts` | Non-admin users get 403 |

### 10.3 Frontend Tests

| Test | What | How |
|------|------|-----|
| Filter panel renders all groups | Component test | Render `MailingFilterPanel`, verify sections |
| Filter changes trigger preview | Component test | Simulate filter change, verify API call |
| Save segment flow | Component test | Fill modal, submit, verify API call |
| Batch sending progress | Component test | Mock API responses, verify progress bar updates |

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large user lists cause slow preview queries | Medium | Index on `users.role`, `users.isActive`, `users.email`; add DB indexes if needed. Pagination limits preview to 20 rows. Count query is separate. |
| SendGrid rate limits hit during batch | Medium | Inter-email delay (100ms); batch size capped at 200; total campaign capped at 2,000. Admin can retry failed batches. |
| Browser closes during batch sending | Medium | Campaign tracks `cursor` and `sentCount` in DB. Admin can reopen campaign and resume. |
| Export of large datasets causes memory issues | Low | Stream CSV directly to response (no in-memory buffering for CSV). For XLSX, limit to 10,000 rows. |
| Admin accidentally emails unsubscribed users | High | `buildRecipientQuery` enforces suppression by default. UI shows clear warning. Cannot be bypassed in API. |
| Email content has no HTML sanitization | Medium | Server-side: sanitize `bodyHtml` with DOMPurify before storing. Client-side: preview uses sandboxed iframe. |
| No email verification field exists | Low | Noted in filter audit (Section 2.5). Filter hidden in UI. Can be added later if field is added to User model. |

---

## 12. File-by-File Change Map

### New Files

| File | Purpose |
|------|---------|
| `api/prisma/migrations/20260210000000_add_mailing_list_feature/migration.sql` | Database migration |
| `api/src/mailing/mailing.module.ts` | NestJS module |
| `api/src/mailing/mailing.controller.ts` | REST controller |
| `api/src/mailing/mailing.service.ts` | Business logic + filter query builder |
| `api/src/mailing/dto/mailing-filters.dto.ts` | Filter DTO with validation |
| `api/src/mailing/dto/preview.dto.ts` | Preview request/response DTOs |
| `api/src/mailing/dto/segment.dto.ts` | Segment CRUD DTOs |
| `api/src/mailing/dto/campaign.dto.ts` | Campaign DTOs |
| `api/src/mailing/dto/export.dto.ts` | Export DTOs |
| `api/src/mailing/mailing.service.spec.ts` | Unit tests |
| `admin/src/pages/MailingList.tsx` | Main mailing list page |
| `admin/src/pages/MailingCampaignDetail.tsx` | Campaign detail page |
| `admin/src/components/mailing/MailingFilterPanel.tsx` | Filter panel component |
| `admin/src/components/mailing/MailingPreviewTable.tsx` | Preview table component |
| `admin/src/components/mailing/SaveSegmentModal.tsx` | Save segment modal |
| `admin/src/components/mailing/ExportModal.tsx` | Export configuration modal |
| `admin/src/components/mailing/ComposeEmailModal.tsx` | Email compose modal |
| `admin/src/components/mailing/SendProgressOverlay.tsx` | Batch sending progress |

### Modified Files

| File | Change |
|------|--------|
| `api/prisma/schema.prisma` | Add `MailingCampaignStatus` enum, `MailingSegment` model, `MailingCampaign` model |
| `api/src/app.module.ts` | Import and register `MailingModule` |
| `api/package.json` | Add `exceljs` dependency (for XLSX export) |
| `admin/src/App.tsx` | Add routes: `/mailing`, `/mailing/campaigns/:id` |
| `admin/src/components/Sidebar.tsx` | Add "Mailing Lists" nav item with `Mail` icon |
| `admin/src/services/api.ts` | Add mailing API service methods |
| `admin/src/types/api.ts` | Add mailing-related TypeScript types |
| `packages/translations/locales/en/admin.json` | Add mailing i18n keys |
| `packages/translations/locales/fr/admin.json` | Add mailing i18n keys (FR) |
| `packages/translations/locales/de/admin.json` | Add mailing i18n keys (DE) |

### Unchanged (Reused As-Is)

| File | Reuse Purpose |
|------|---------------|
| `api/src/email-notification/email-notification.service.ts` | `sendNotification()` for individual email delivery |
| `api/src/email-notification/email-template.service.ts` | Template processing |
| `api/src/prisma/prisma.service.ts` | Database access |
| `api/src/prisma/audit-middleware.ts` | Automatic audit logging |
| `admin/src/components/design-system/*` | All design system components |
| `admin/src/hooks/useDebouncedValue.ts` | Debounced filter inputs |
| `admin/src/components/ui/LoadingSpinner.tsx` | Loading states |

---

## Appendix A: Personalization Tokens for Email Body

Available tokens in `bodyHtml` / `bodyText`:

| Token | Source | Example |
|-------|--------|---------|
| `{{firstName}}` | `User.firstName` | "Jean" |
| `{{lastName}}` | `User.lastName` | "Dupont" |
| `{{email}}` | `User.email` | "jean@example.com" |
| `{{role}}` | `User.role` (display name) | "Foundation" |
| `{{orgName}}` | `Organization.name` (first org) | "Crèche du Lac" |
| `{{canton}}` | `Organization.canton` | "VD" |
| `{{unsubscribeUrl}}` | Generated per-recipient | "https://..." |

The template processing already exists in `EmailNotificationService.processTemplate()` and handles `{{variable}}` replacement.

---

## Appendix B: Example MailingFilters JSON (as stored in segment)

```json
{
  "roles": ["FOUNDATION", "PRODUCT_SUPPLIER"],
  "isActive": true,
  "hasSubscription": true,
  "subscriptionStatuses": ["ACTIVE", "TRIAL"],
  "cantons": ["VD", "GE", "FR"],
  "excludeUnsubscribed": true,
  "createdFrom": "2025-01-01T00:00:00.000Z"
}
```

This exact JSON is stored in `mailing_segments.filters_json` and used by `buildRecipientQuery()` for all operations.

---

## Appendix C: Total Effort Estimate

| Phase | Description | Estimate |
|-------|-------------|----------|
| Phase 1 | Foundation (DB, API scaffold, filter builder, preview) | 3-4 days |
| Phase 2 | Segments & Export | 2-3 days |
| Phase 3 | Campaigns & Batch Sending | 3-4 days |
| Phase 4 | Frontend: Build List & Segments | 4-5 days |
| Phase 5 | Frontend: Export & Campaigns | 3-4 days |
| Phase 6 | Polish & Hardening | 1-2 days |
| **Total** | | **16-22 days** |

This estimate assumes a single developer working full-time. Phases 1-3 (backend) and Phases 4-5 (frontend) can be parallelized if two developers are available, reducing wall-clock time to approximately 10-14 days.
