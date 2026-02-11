# Mailing List Feature — Development Plan

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Audit & Reuse Analysis](#2-codebase-audit--reuse-analysis)
3. [Architecture Overview](#3-architecture-overview)
4. [Email Transport Abstraction](#4-email-transport-abstraction)
5. [Data Model Changes](#5-data-model-changes)
6. [API Endpoints](#6-api-endpoints)
7. [Shared Filter Query Builder](#7-shared-filter-query-builder)
8. [Admin Frontend Screens](#8-admin-frontend-screens)
9. [Implementation Phases](#9-implementation-phases)
10. [Compliance & Safeguards](#10-compliance--safeguards)
11. [Testing Strategy](#11-testing-strategy)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [File-by-File Change Map](#13-file-by-file-change-map)

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

**Email transport**: Campaign emails are sent through a new `MailingTransportService` abstraction that supports three providers in priority order: **SMTP** (your own mail server, e.g. `mail@procrechesolutions.com`), **Mailgun**, and **SendGrid** (fallback). This is independent of the existing transactional email pipeline — campaign emails use their own sender identity and transport configuration.

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
| `EmailNotificationService` | SendGrid integration, `sendNotification()`, `sendBulkNotification()`, template processing, email logging | Reuse `logEmail()` for campaign logging; reference `processTemplate()` pattern for personalization tokens. **Campaign sends use the new `MailingTransportService` instead** (see Section 4) to support SMTP / own mail server |
| `EmailTemplateService` | Template management | Reuse for campaign templates, or allow raw HTML in campaigns |
| `MailgunService` | Mailgun integration, `sendEmail()` | Reference implementation for the Mailgun transport adapter in `MailingTransportService` |
| `UserManagementService` | `getUsers()` with filters, `exportUsers()` | Reference the filter pattern; **do not duplicate** — the mailing filter builder is more advanced but follows same Prisma `where` construction |
| `PrismaService` | Database access | Standard usage |
| `AuditLog` model | Existing audit logging | Reuse for export/send audit entries |

### 2.2.1 Existing Email Provider Audit

The codebase currently has **three** email-related configurations. The mailing feature introduces a transport abstraction to unify them for campaigns:

| Provider | Package | Current Usage | Env Vars |
|----------|---------|---------------|----------|
| **SendGrid** | `@sendgrid/mail` | Transactional notifications via `EmailNotificationService` | `SENDGRID_API_KEY` |
| **Mailgun** | `mailgun.js` | Support ticket emails via `MailgunService` | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` |
| **SMTP** | *(not installed yet)* | Placeholder env vars exist but no code uses them | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

All three share a common sender identity via `FROM_EMAIL` / `FROM_NAME` env vars (defaulting to `noreply@procreche.ch` / `Pro Crèche Solutions`).

For **mailing campaigns**, we introduce separate sender configuration so campaigns can use a dedicated address like `mail@procrechesolutions.com` without affecting transactional emails.

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
| Email provider integration | Existing `EmailNotificationService` (SendGrid) and `MailgunService` provide reference implementations. Campaign sends use a new `MailingTransportService` abstraction that adds SMTP support. |
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
│  ┌──────┴─┐   ┌──────┴──────────────────────────┐       │
│  │ Prisma │   │  MailingTransportService          │       │
│  │Service │   │  (NEW — email transport           │       │
│  │        │   │   abstraction layer)              │       │
│  └────────┘   └──────┬──────────────────────────┘       │
│                      │ selects provider at startup        │
│              ┌───────┼───────────────┐                   │
│              │       │               │                    │
│        ┌─────┴──┐ ┌──┴─────┐ ┌──────┴────┐              │
│        │  SMTP  │ │Mailgun │ │ SendGrid  │              │
│        │(nodema-│ │(exist- │ │ (exist-   │              │
│        │ iler)  │ │ ing)   │ │  ing)     │              │
│        │ ★ NEW  │ │        │ │           │              │
│        └────────┘ └────────┘ └───────────┘              │
│         Priority 1  Priority 2  Priority 3 (fallback)    │
│                                                           │
│  Campaign sender:   mail@procrechesolutions.com           │
│  (configurable via  MAILING_FROM_EMAIL env var)           │
│                                                           │
│  Existing tables:          New tables:                    │
│  users, organizations,     mailing_segments,              │
│  user_organizations,       mailing_campaigns              │
│  subscriptions,                                           │
│  user_notification_prefs,                                 │
│  email_logs, audit_logs                                   │
└──────────────────────────────────────────────────────────┘
```

**Transport selection logic**: At startup, `MailingTransportService` checks environment variables in order. The first fully-configured provider wins:

1. **SMTP** — if `MAILING_SMTP_HOST` is set (your own mail server)
2. **Mailgun** — if `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` are set
3. **SendGrid** — if `SENDGRID_API_KEY` is set
4. **None** — logs a warning; send endpoints return 503

This keeps transactional emails (password resets, notifications) on their existing SendGrid pipeline, while campaign/mailing emails go through your own server.

---

## 4. Email Transport Abstraction

### 4.1 Why a Separate Transport for Campaigns

The existing email infrastructure serves **transactional** purposes (password resets, subscription confirmations, support ticket replies). Campaign/mailing emails have different requirements:

| Concern | Transactional Emails | Campaign Emails |
|---------|---------------------|-----------------|
| Sender identity | `noreply@procreche.ch` | `mail@procrechesolutions.com` (or custom) |
| Provider | SendGrid (existing) | Own SMTP server preferred, with Mailgun/SendGrid as fallback |
| Volume | Low (1-at-a-time, event-driven) | Bulk (batches of 100-200) |
| Personalization | Template-based with event payload | Freeform HTML with `{{token}}` replacement |
| Unsubscribe link | Not always required | **Always required** (compliance) |
| Rate limiting | Handled by provider | Must be managed by batch logic |

Mixing campaign sends into the existing `EmailNotificationService` would risk deliverability (bulk sends can affect sender reputation for transactional emails) and would not allow a different sender address/server.

### 4.2 MailingTransportService Design

**File:** `api/src/mailing/mailing-transport.service.ts`

```typescript
// Interface that all transport adapters implement
interface MailingTransportAdapter {
  sendEmail(options: MailingSendOptions): Promise<MailingSendResult>;
  isConfigured(): boolean;
  getProviderName(): string;
}

interface MailingSendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: { email: string; name: string };   // Override per-email (rare)
  replyTo?: string;
  tags?: string[];                           // For provider-level categorization
  metadata?: Record<string, string>;         // Custom headers / tracking
}

interface MailingSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}
```

### 4.3 SMTP Adapter (Priority 1 — Your Own Mail Server)

**File:** `api/src/mailing/transports/smtp.transport.ts`

Uses `nodemailer` (new dependency) to connect to your SMTP server.

```typescript
// Configured via environment variables:
//   MAILING_SMTP_HOST    — e.g., mail.procrechesolutions.com
//   MAILING_SMTP_PORT    — e.g., 587 (STARTTLS) or 465 (SSL)
//   MAILING_SMTP_USER    — e.g., mail@procrechesolutions.com
//   MAILING_SMTP_PASS    — SMTP password or app-specific password
//   MAILING_SMTP_SECURE  — 'true' for port 465, 'false' for STARTTLS (default: false)
//
// The from address defaults to MAILING_SMTP_USER if MAILING_FROM_EMAIL is not set.

import * as nodemailer from 'nodemailer';

class SmtpTransport implements MailingTransportAdapter {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILING_SMTP_HOST,
      port: parseInt(process.env.MAILING_SMTP_PORT || '587'),
      secure: process.env.MAILING_SMTP_SECURE === 'true',
      auth: {
        user: process.env.MAILING_SMTP_USER,
        pass: process.env.MAILING_SMTP_PASS,
      },
      // Connection pooling for bulk sends
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Timeouts
      connectionTimeout: 10000,   // 10s to establish connection
      greetingTimeout: 10000,     // 10s for server greeting
      socketTimeout: 30000,       // 30s for socket inactivity
    });
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    const from = options.from || {
      email: process.env.MAILING_FROM_EMAIL || process.env.MAILING_SMTP_USER,
      name: process.env.MAILING_FROM_NAME || 'ProCreche Solutions',
    };

    const info = await this.transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      headers: options.metadata ? { 'X-Campaign-Metadata': JSON.stringify(options.metadata) } : undefined,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp',
    };
  }

  isConfigured(): boolean {
    return !!(process.env.MAILING_SMTP_HOST && process.env.MAILING_SMTP_USER && process.env.MAILING_SMTP_PASS);
  }

  getProviderName(): string { return 'smtp'; }
}
```

### 4.4 Mailgun Adapter (Priority 2)

**File:** `api/src/mailing/transports/mailgun.transport.ts`

Wraps the existing `mailgun.js` package (already installed). Uses the same `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` env vars as the existing `MailgunService`, but with the campaign-specific from address.

### 4.5 SendGrid Adapter (Priority 3 — Fallback)

**File:** `api/src/mailing/transports/sendgrid.transport.ts`

Wraps the existing `@sendgrid/mail` package (already installed). Uses `SENDGRID_API_KEY`. This is the last-resort fallback if SMTP and Mailgun are not configured.

### 4.6 Transport Orchestrator

**File:** `api/src/mailing/mailing-transport.service.ts`

```typescript
@Injectable()
export class MailingTransportService {
  private adapter: MailingTransportAdapter;
  private readonly logger = new Logger(MailingTransportService.name);

  constructor() {
    // Select provider in priority order
    const smtp = new SmtpTransport();
    const mailgun = new MailgunTransport();
    const sendgrid = new SendGridTransport();

    if (smtp.isConfigured()) {
      this.adapter = smtp;
    } else if (mailgun.isConfigured()) {
      this.adapter = mailgun;
    } else if (sendgrid.isConfigured()) {
      this.adapter = sendgrid;
    } else {
      this.logger.warn('No mailing transport configured. Campaign sends will fail.');
      this.adapter = null;
    }

    if (this.adapter) {
      this.logger.log(`Mailing transport initialized: ${this.adapter.getProviderName()}`);
    }
  }

  /** The from address used for all campaign emails */
  getFromAddress(): { email: string; name: string } {
    return {
      email: process.env.MAILING_FROM_EMAIL
          || process.env.MAILING_SMTP_USER
          || process.env.FROM_EMAIL
          || 'noreply@procreche.ch',
      name: process.env.MAILING_FROM_NAME
          || process.env.FROM_NAME
          || 'ProCreche Solutions',
    };
  }

  async sendEmail(options: MailingSendOptions): Promise<MailingSendResult> {
    if (!this.adapter) {
      return { success: false, error: 'No mailing transport configured', provider: 'none' };
    }
    // Inject default from address if not overridden
    if (!options.from) {
      options.from = this.getFromAddress();
    }
    return this.adapter.sendEmail(options);
  }

  isConfigured(): boolean {
    return this.adapter !== null;
  }

  getProviderName(): string {
    return this.adapter?.getProviderName() || 'none';
  }
}
```

### 4.7 Environment Variables

Add these to `.env.example`:

```env
# =============================================
# Mailing List Feature — Campaign Email Config
# =============================================
# Campaign emails use a separate transport from transactional emails.
# Configure ONE of the following (checked in priority order):

# Option 1: Your own SMTP mail server (RECOMMENDED)
# Example: mail@procrechesolutions.com via your hosting provider
MAILING_SMTP_HOST=mail.procrechesolutions.com
MAILING_SMTP_PORT=587
MAILING_SMTP_USER=mail@procrechesolutions.com
MAILING_SMTP_PASS=your_smtp_password
MAILING_SMTP_SECURE=false

# Option 2: Mailgun (uses existing MAILGUN_API_KEY / MAILGUN_DOMAIN)
# No additional config needed — if SMTP is not set, Mailgun is used.

# Option 3: SendGrid fallback (uses existing SENDGRID_API_KEY)
# No additional config needed — used if neither SMTP nor Mailgun is set.

# Campaign sender identity (applies to ALL providers)
MAILING_FROM_EMAIL=mail@procrechesolutions.com
MAILING_FROM_NAME=ProCreche Solutions
```

### 4.8 How It Integrates with MailingService.sendBatch()

```typescript
// Inside MailingService.sendBatch() — simplified
for (const recipient of batch) {
  const html = this.personalizeHtml(campaign.bodyHtml, recipient);
  const text = this.personalizeText(campaign.bodyText, recipient);

  const result = await this.transportService.sendEmail({
    to: recipient.email,
    subject: campaign.subject,
    html,
    text,
    tags: ['campaign', campaign.id],
    metadata: { campaignId: campaign.id, userId: recipient.id },
  });

  // Log to existing EmailLog table
  await this.prisma.emailLog.create({
    data: {
      userId: recipient.id,
      event: `campaign:${campaign.id}`,
      recipient: recipient.email,
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId,
      error: result.error,
      payload: { campaignId: campaign.id, provider: result.provider },
    },
  });

  if (result.success) sentCount++;
  else failedCount++;

  // Inter-email delay (protects SMTP rate limits)
  await sleep(INTER_EMAIL_DELAY_MS);
}
```

### 4.9 SMTP-Specific Considerations

| Concern | Detail |
|---------|--------|
| **Connection pooling** | `nodemailer` pool mode reuses SMTP connections across emails in a batch — avoids reconnecting per email |
| **Rate limits** | Most SMTP servers have per-minute/hour send limits. The inter-email delay (default 100ms = ~600/min) and batch cap (200 per API call) stay well within typical limits. Configurable via `MAILING_SMTP_RATE_LIMIT_MS` env var. |
| **TLS/SSL** | Port 587 with STARTTLS (default). Port 465 for implicit SSL (`MAILING_SMTP_SECURE=true`). |
| **Authentication** | Standard PLAIN/LOGIN auth. For providers requiring OAuth2 (e.g., Google Workspace), extend the SMTP adapter later. |
| **Bounce handling** | SMTP does not provide webhook-based bounce notifications like SendGrid/Mailgun. For MVP, bounces are detected as send failures (SMTP error codes 550, 552, etc.) and logged. Full bounce processing via mailbox polling is deferred to a future phase. |
| **SPF / DKIM / DMARC** | For `mail@procrechesolutions.com` to deliver reliably, the DNS records for `procrechesolutions.com` must include SPF, DKIM, and DMARC entries pointing to the mail server. This is a server-admin task, not a code task. |

---

## 5. Data Model Changes

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

## 6. API Endpoints

All endpoints live under the `/admin/mailing` prefix, guarded by `@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)`.

### 6.1 Preview Recipients

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

### 6.2 Segments CRUD

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

### 6.3 Export

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

### 6.4 Campaigns

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

## 7. Shared Filter Query Builder

The `buildRecipientQuery(filters)` function is the **single source of truth** used by preview, export, and send.

### 7.1 MailingFilters Schema

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

### 7.2 Query Construction Logic

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

### 7.3 Filter Logic Rules

- **AND across filter groups**: Roles AND Status AND Subscription AND Location AND Communication preferences
- **OR within a filter group**: e.g., role IN ('FOUNDATION', 'PRODUCT_SUPPLIER')
- **Exclude toggles**: `excludeRoles` removes specific roles; `excludeUnsubscribed` (default ON) removes marketing opt-outs
- **Hard exclusions**: Always exclude `SUPER_ADMIN`/`ADMIN` from mailings; always exclude `email IS NULL`

---

## 8. Admin Frontend Screens

### 8.1 Routing

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

### 8.2 Screen A — Mailing Lists / Segments (`/mailing`)

**Layout:** Tabs at top: "Segments" | "Campaigns" | "Build a List"

**Segments Tab:**
- Table with columns: Name, Type (Dynamic), Estimated Size, Last Updated, Created By, Actions
- Actions: Use (go to Build List with segment loaded), Export, Edit, Delete
- "New Segment" button → opens Build a List tab

**Campaigns Tab:**
- Table with columns: Subject, Status (badge), Recipients, Sent/Failed, Segment, Created, Sent At
- Status badges: Draft (gray), Sending (blue pulse), Sent (green), Failed (red), Cancelled (yellow)
- Click row → Campaign detail page

### 8.3 Screen B — Build a List (`/mailing?tab=build` or via segment)

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

### 8.4 Screen C — Campaign Detail (`/mailing/campaigns/:id`)

**Layout:**
- Header: Subject, Status badge, Created date
- Metrics cards: Estimated | Sent | Failed | Completion %
- Progress bar (during sending)
- Action buttons: Resume Sending (if paused/interrupted), Cancel (if sending)
- Section: Campaign content preview (HTML rendered)
- Section: Filter/segment info

### 8.5 New Components

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

### 8.6 Frontend Batch Sending Flow

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

## 9. Implementation Phases

### Phase 1 — Foundation & Email Transport (Est. 4-5 days)

**Goal:** Database schema, API module scaffolding, email transport abstraction, shared filter query builder, preview endpoint

| Task | Files | Est. |
|------|-------|------|
| 1.1 Add Prisma models + migration | `api/prisma/schema.prisma`, `api/prisma/migrations/20260210000000_add_mailing_list_feature/migration.sql` | 1h |
| 1.2 Create `MailingModule` scaffold | `api/src/mailing/mailing.module.ts`, `mailing.controller.ts`, `mailing.service.ts` | 1h |
| 1.3 Register module in `AppModule` | `api/src/app.module.ts` | 15m |
| 1.4 Install `nodemailer` + `@types/nodemailer` | `api/package.json` | 15m |
| 1.5 Implement `MailingTransportService` | `api/src/mailing/mailing-transport.service.ts` | 1.5h |
| 1.6 Implement SMTP transport adapter | `api/src/mailing/transports/smtp.transport.ts` | 2h |
| 1.7 Implement Mailgun transport adapter | `api/src/mailing/transports/mailgun.transport.ts` | 1h |
| 1.8 Implement SendGrid transport adapter | `api/src/mailing/transports/sendgrid.transport.ts` | 1h |
| 1.9 Add env vars to `.env.example` | `api/.env.example` | 15m |
| 1.10 Define DTOs | `api/src/mailing/dto/mailing-filters.dto.ts`, `preview.dto.ts`, `segment.dto.ts`, `campaign.dto.ts`, `export.dto.ts` | 1h |
| 1.11 Implement `buildRecipientQuery()` | `api/src/mailing/mailing.service.ts` | 3h |
| 1.12 Implement preview endpoint | `api/src/mailing/mailing.controller.ts`, `mailing.service.ts` | 2h |
| 1.13 Unit test filter query builder + transport selection | `api/src/mailing/mailing.service.spec.ts`, `mailing-transport.service.spec.ts` | 2h |

**Deliverable:** POST `/admin/mailing/preview` returns filtered, paginated user data. `MailingTransportService` selects SMTP/Mailgun/SendGrid based on config.

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

**Goal:** Campaign creation, cursor-based batch sending via `MailingTransportService`, basic tracking

| Task | Files | Est. |
|------|-------|------|
| 3.1 Implement campaign creation | `mailing.service.ts`, `mailing.controller.ts` | 1.5h |
| 3.2 Implement `send-batch` endpoint | `mailing.service.ts` — cursor logic, batch sending via `MailingTransportService` (SMTP/Mailgun/SendGrid) | 4h |
| 3.3 Implement campaign list/detail | `mailing.controller.ts`, `mailing.service.ts` | 1.5h |
| 3.4 Implement campaign cancel | `mailing.service.ts` | 30m |
| 3.5 Add campaign audit logging | `mailing.service.ts` (uses existing `AuditLog`) | 30m |
| 3.6 Add unsubscribe link injection | `mailing.service.ts` — appends unsubscribe link to `bodyHtml` | 1h |
| 3.7 Enforce max recipients per campaign | `mailing.service.ts` — hard cap at 2,000 | 30m |
| 3.8 Add send rate limiting / delay | `mailing.service.ts` — configurable delay between emails in batch (default 100ms, override via `MAILING_SMTP_RATE_LIMIT_MS`) | 1h |
| 3.9 Add company footer injection | `mailing.service.ts` — appends mandatory footer with company identity + unsubscribe link | 30m |

**Deliverable:** Full campaign lifecycle working via API. Emails sent through configured transport (SMTP by default if `MAILING_SMTP_HOST` is set).

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

## 10. Compliance & Safeguards

### 10.1 Suppression / Opt-out Enforcement

- `buildRecipientQuery()` **always** adds `excludeUnsubscribed: true` by default
- This filters out users with `UserNotificationPreferences.marketing = false`
- Admin can see a warning but cannot bypass suppression for marketing emails
- Transactional emails (if needed) would use a different code path

### 10.2 Unsubscribe Link

- Every campaign email has an unsubscribe link appended to `bodyHtml`
- Link points to: `{FRONTEND_URL}/unsubscribe?token={jwt_token}`
- Token encodes: `{ userId, campaignId, email }` with 30-day expiry
- Unsubscribe endpoint updates `UserNotificationPreferences.marketing = false`

### 10.3 Company Footer

- Every campaign email includes a mandatory footer:
  - Company name: From `FrontendSettings.siteName` or fallback "ProCreche Solutions"
  - Contact email: From `FrontendSettings.contactEmail`
  - Unsubscribe link

### 10.4 Permission Gating

- All mailing endpoints require `SUPER_ADMIN` or `ADMIN` role
- Export + Send actions create `AuditLog` entries
- Campaign creation logs the admin who created it

### 10.5 Rate Limiting & Batching

- Batch size: 50-200 emails per API call (default 100)
- Inter-email delay: 100ms within a batch (configurable)
- Max recipients per campaign: 2,000 (hard cap in MVP)
- If list exceeds 2,000: API returns error, admin must narrow filters
- API route timeout: Ensure NestJS timeout >= 30s for batch endpoint

### 10.6 Data Minimization

- Export: Admin explicitly selects which columns to include
- Preview: Shows only essential columns
- Campaign emails: Only the fields needed for personalization tokens are loaded

### 10.7 Audit Trail

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

## 11. Testing Strategy

### 11.1 Unit Tests

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
| Transport selection — SMTP priority | `mailing-transport.service.spec.ts` | SMTP selected when all three configured |
| Transport selection — Mailgun fallback | `mailing-transport.service.spec.ts` | Mailgun selected when SMTP not configured |
| Transport selection — SendGrid fallback | `mailing-transport.service.spec.ts` | SendGrid selected when SMTP+Mailgun not configured |
| Transport selection — none configured | `mailing-transport.service.spec.ts` | Graceful warning, send returns error |
| SMTP adapter — connection pooling | `smtp.transport.spec.ts` | Pool mode enabled, max connections set |
| From address resolution | `mailing-transport.service.spec.ts` | `MAILING_FROM_EMAIL` > `MAILING_SMTP_USER` > `FROM_EMAIL` > default |

### 11.2 Integration Tests

| Test | Location | Coverage |
|------|----------|----------|
| Preview endpoint returns correct count | `mailing.e2e-spec.ts` | With seed data, verify counts |
| Segment CRUD lifecycle | `mailing.e2e-spec.ts` | Create, read, update, delete |
| Export produces valid CSV | `mailing.e2e-spec.ts` | Download and parse CSV |
| Campaign batch sending | `mailing.e2e-spec.ts` | Create campaign, send batches, verify completion |
| Auth guard enforcement | `mailing.e2e-spec.ts` | Non-admin users get 403 |

### 11.3 Frontend Tests

| Test | What | How |
|------|------|-----|
| Filter panel renders all groups | Component test | Render `MailingFilterPanel`, verify sections |
| Filter changes trigger preview | Component test | Simulate filter change, verify API call |
| Save segment flow | Component test | Fill modal, submit, verify API call |
| Batch sending progress | Component test | Mock API responses, verify progress bar updates |

---

## 12. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large user lists cause slow preview queries | Medium | Index on `users.role`, `users.isActive`, `users.email`; add DB indexes if needed. Pagination limits preview to 20 rows. Count query is separate. |
| Provider rate limits hit during batch | Medium | Inter-email delay (default 100ms, configurable via `MAILING_SMTP_RATE_LIMIT_MS`); batch size capped at 200; total campaign capped at 2,000. Admin can retry failed batches. |
| Browser closes during batch sending | Medium | Campaign tracks `cursor` and `sentCount` in DB. Admin can reopen campaign and resume. |
| Export of large datasets causes memory issues | Low | Stream CSV directly to response (no in-memory buffering for CSV). For XLSX, limit to 10,000 rows. |
| Admin accidentally emails unsubscribed users | High | `buildRecipientQuery` enforces suppression by default. UI shows clear warning. Cannot be bypassed in API. |
| Email content has no HTML sanitization | Medium | Server-side: sanitize `bodyHtml` with DOMPurify before storing. Client-side: preview uses sandboxed iframe. |
| No email verification field exists | Low | Noted in filter audit (Section 2.5). Filter hidden in UI. Can be added later if field is added to User model. |
| SMTP server rejects emails (bad DNS/auth) | Medium | `MailingTransportService` verifies connection at startup and logs warnings. Send-batch returns per-email errors. Admin sees failure count in real-time progress. |
| SMTP deliverability poor (no SPF/DKIM) | Medium | Document DNS setup requirements (SPF, DKIM, DMARC) for `procrechesolutions.com`. Provide verification checklist in admin guide. |
| SMTP bounces not tracked automatically | Low | For MVP, SMTP send errors (550, 552) are logged as failures. Full bounce-mailbox polling deferred to future phase. Mailgun/SendGrid adapters have webhook-based bounce tracking. |
| Wrong transport selected in production | Low | `MailingTransportService` logs selected provider at startup. Admin campaign detail page shows which provider was used. |

---

## 13. File-by-File Change Map

### New Files

| File | Purpose |
|------|---------|
| `api/prisma/migrations/20260210000000_add_mailing_list_feature/migration.sql` | Database migration |
| `api/src/mailing/mailing.module.ts` | NestJS module |
| `api/src/mailing/mailing.controller.ts` | REST controller |
| `api/src/mailing/mailing.service.ts` | Business logic + filter query builder |
| `api/src/mailing/mailing-transport.service.ts` | Email transport abstraction (selects SMTP/Mailgun/SendGrid) |
| `api/src/mailing/transports/smtp.transport.ts` | SMTP adapter via nodemailer (for own mail server) |
| `api/src/mailing/transports/mailgun.transport.ts` | Mailgun adapter (wraps existing mailgun.js) |
| `api/src/mailing/transports/sendgrid.transport.ts` | SendGrid adapter (wraps existing @sendgrid/mail) |
| `api/src/mailing/transports/transport.interface.ts` | Shared `MailingTransportAdapter` interface + types |
| `api/src/mailing/dto/mailing-filters.dto.ts` | Filter DTO with validation |
| `api/src/mailing/dto/preview.dto.ts` | Preview request/response DTOs |
| `api/src/mailing/dto/segment.dto.ts` | Segment CRUD DTOs |
| `api/src/mailing/dto/campaign.dto.ts` | Campaign DTOs |
| `api/src/mailing/dto/export.dto.ts` | Export DTOs |
| `api/src/mailing/mailing.service.spec.ts` | Unit tests for filter query builder |
| `api/src/mailing/mailing-transport.service.spec.ts` | Unit tests for transport selection + adapters |
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
| `api/package.json` | Add `nodemailer`, `@types/nodemailer`, `exceljs` dependencies |
| `api/.env.example` | Add `MAILING_SMTP_*`, `MAILING_FROM_EMAIL`, `MAILING_FROM_NAME` env vars |
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
| `api/src/email-notification/email-notification.service.ts` | `logEmail()` pattern reused; `processTemplate()` pattern referenced. Campaign sends go through `MailingTransportService` instead. |
| `api/src/email-notification/email-template.service.ts` | Template processing pattern |
| `api/src/support/mailgun.service.ts` | Reference implementation for Mailgun adapter (not directly called by mailing feature) |
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
| Phase 1 | Foundation + Email Transport (DB, API scaffold, SMTP/Mailgun/SendGrid abstraction, filter builder, preview) | 4-5 days |
| Phase 2 | Segments & Export | 2-3 days |
| Phase 3 | Campaigns & Batch Sending (via transport layer) | 3-4 days |
| Phase 4 | Frontend: Build List & Segments | 4-5 days |
| Phase 5 | Frontend: Export & Campaigns | 3-4 days |
| Phase 6 | Polish & Hardening | 1-2 days |
| **Total** | | **17-23 days** |

This estimate assumes a single developer working full-time. Phases 1-3 (backend) and Phases 4-5 (frontend) can be parallelized if two developers are available, reducing wall-clock time to approximately 11-15 days.

---

## Appendix D: SMTP Setup Checklist for `mail@procrechesolutions.com`

Before campaign emails will deliver reliably from your own mail server, ensure:

- [ ] **SMTP server accessible**: `mail.procrechesolutions.com` (or your provider's SMTP host) is reachable from the API server on port 587 or 465
- [ ] **Authentication working**: The `mail@procrechesolutions.com` account credentials are valid for SMTP AUTH
- [ ] **SPF record**: Add an SPF TXT record to `procrechesolutions.com` DNS that includes your mail server IP
- [ ] **DKIM signing**: Configure DKIM on your mail server and publish the public key in DNS
- [ ] **DMARC policy**: Add a DMARC TXT record (start with `p=none` for monitoring, then tighten)
- [ ] **Reverse DNS (PTR)**: The mail server IP has a valid PTR record pointing back to the mail hostname
- [ ] **Environment variables set**: `MAILING_SMTP_HOST`, `MAILING_SMTP_PORT`, `MAILING_SMTP_USER`, `MAILING_SMTP_PASS`, `MAILING_FROM_EMAIL`, `MAILING_FROM_NAME`
- [ ] **Test email**: Use the "Send test" feature in the campaign compose UI to verify delivery before launching

If any of these are missing, emails may land in spam or be rejected. The Mailgun/SendGrid fallback options handle deliverability infrastructure automatically but require their own domain verification.
