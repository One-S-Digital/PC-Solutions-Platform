diff --git a/docs/SUBSCRIPTION_MANAGEMENT_SYSTEM_PLAN.md b/docs/SUBSCRIPTION_MANAGEMENT_SYSTEM_PLAN.md
new file mode 100644
index 000000000..c85ca788e
--- /dev/null
+++ b/docs/SUBSCRIPTION_MANAGEMENT_SYSTEM_PLAN.md
@@ -0,0 +1,1414 @@
+# Subscription Management System Plan
+
+## Executive Summary
+
+This document outlines the comprehensive plan for building and implementing a **Subscription Management System** for the admin dashboard. The system is designed to be **fully adaptable** for manual subscription management initially, with a clear path to **Stripe payment integration** in the future.
+
+### Key Design Principles
+1. **Manual-First Approach**: Complete admin control over subscriptions without payment integration
+2. **Stripe-Ready Architecture**: All data models and services prepared for seamless Stripe integration
+3. **Flexible Administration**: Full CRUD operations for plans, subscriptions, and billing
+4. **Audit Trail**: Complete history of all subscription actions for compliance
+5. **Multi-Entity Support**: Both user-level and organization-level subscriptions
+
+---
+
+## Table of Contents
+
+1. [Current State Analysis](#1-current-state-analysis)
+2. [Data Model Enhancements](#2-data-model-enhancements)
+3. [Backend API Implementation](#3-backend-api-implementation)
+4. [Admin Dashboard UI](#4-admin-dashboard-ui)
+5. [Manual Subscription Operations](#5-manual-subscription-operations)
+6. [Future Stripe Integration Path](#6-future-stripe-integration-path)
+7. [Implementation Phases](#7-implementation-phases)
+8. [Testing Strategy](#8-testing-strategy)
+
+---
+
+## 1. Current State Analysis
+
+### Existing Infrastructure
+
+The codebase already has foundational subscription-related models and services:
+
+#### Database Models (Prisma Schema)
+- `Subscription` - Main subscription model with Stripe fields prepared
+- `SubscriptionPlan` - Plan definitions with features and limits
+- `UserSubscription` - User-specific subscriptions (Stripe-focused)
+- `Plan` / `PlanPrice` - Plan pricing tiers
+- `License` - One-time purchase licenses
+- `BillingTransaction` - Transaction history
+- `FeatureFlag` - Feature access control
+- `PricingTier` / `DynamicPricingRule` - Pricing logic
+
+#### Existing Services
+- `SubscriptionManagementService` - Core CRUD operations
+- `BillingService` - Stripe integration (prepared)
+- `PricingService` - Pricing calculations
+- `FeatureFlagService` - Feature gating
+
+#### API Endpoints Already Available
+- `POST /admin/subscription-management/plans` - Create plans
+- `GET /admin/subscription-management/plans` - List plans
+- `PUT /admin/subscription-management/plans/:id` - Update plans
+- `DELETE /admin/subscription-management/plans/:id` - Delete plans
+- `POST /admin/subscription-management/subscriptions` - Create subscription
+- `GET /admin/subscription-management/subscriptions` - List subscriptions
+- `PUT /admin/subscription-management/subscriptions/:id/status` - Update status
+
+### Gaps to Address
+
+1. **Admin Dashboard UI**: No dedicated subscription management page
+2. **Manual Management Features**: Missing pause, resume, renewal scheduling
+3. **Subscription History**: Need detailed audit logging
+4. **Bulk Operations**: No bulk subscription management
+5. **Notification System**: Integration with email notifications
+6. **Trial Management**: Trial period handling
+7. **Grace Period Handling**: Manual grace period management
+
+---
+
+## 2. Data Model Enhancements
+
+### 2.1 Enhanced Subscription Status Enum
+
+```prisma
+enum SubscriptionStatus {
+  ACTIVE        // Subscription is active and valid
+  INACTIVE      // Subscription is inactive (not started or expired)
+  PAUSED        // Subscription is temporarily paused
+  CANCELLED     // Subscription has been cancelled
+  EXPIRED       // Subscription period has ended
+  TRIAL         // Subscription is in trial period
+  PAST_DUE      // Payment is past due (for future Stripe use)
+  PENDING       // Subscription is pending activation
+  GRACE_PERIOD  // In grace period after failed payment/expiry
+}
+```
+
+### 2.2 New Models to Add
+
+#### SubscriptionAction (Audit Log)
+
+```prisma
+model SubscriptionAction {
+  id              String   @id @default(uuid())
+  subscriptionId  String
+  action          String   // CREATE, ACTIVATE, PAUSE, RESUME, CANCEL, RENEW, UPGRADE, DOWNGRADE, EXPIRE
+  previousStatus  String?
+  newStatus       String
+  reason          String?
+  notes           String?  @db.Text
+  performedBy     String   // Admin user ID
+  performedAt     DateTime @default(now())
+  metadata        Json?    // Additional context data
+  
+  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
+  
+  @@index([subscriptionId])
+  @@index([performedAt])
+  @@map("subscription_actions")
+}
+```
+
+#### SubscriptionSchedule (Future Actions)
+
+```prisma
+model SubscriptionSchedule {
+  id              String    @id @default(uuid())
+  subscriptionId  String
+  scheduledAction String    // ACTIVATE, CANCEL, PAUSE, RESUME, UPGRADE, DOWNGRADE
+  scheduledDate   DateTime
+  targetPlanId    String?   // For upgrade/downgrade
+  isProcessed     Boolean   @default(false)
+  processedAt     DateTime?
+  createdBy       String
+  createdAt       DateTime  @default(now())
+  
+  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
+  
+  @@index([scheduledDate, isProcessed])
+  @@map("subscription_schedules")
+}
+```
+
+#### SubscriptionNote (Admin Notes)
+
+```prisma
+model SubscriptionNote {
+  id              String   @id @default(uuid())
+  subscriptionId  String
+  note            String   @db.Text
+  isInternal      Boolean  @default(true)  // Internal admin note vs customer-visible
+  createdBy       String
+  createdAt       DateTime @default(now())
+  
+  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
+  
+  @@index([subscriptionId])
+  @@map("subscription_notes")
+}
+```
+
+### 2.3 Enhanced Subscription Model
+
+```prisma
+model Subscription {
+  id                   String             @id @default(uuid())
+  
+  // Owner (one of these must be set)
+  userId               String?
+  organizationId       String?
+  
+  // Plan Details
+  planId               String
+  tier                 SubscriptionTier
+  
+  // Status
+  status               SubscriptionStatus @default(PENDING)
+  
+  // Period Management
+  currentPeriodStart   DateTime?
+  currentPeriodEnd     DateTime?
+  trialStart           DateTime?
+  trialEnd             DateTime?
+  pausedAt             DateTime?          // When paused
+  pausedUntil          DateTime?          // Resume date if set
+  
+  // Cancellation
+  cancelAtPeriodEnd    Boolean            @default(false)
+  canceledAt           DateTime?
+  cancellationReason   String?
+  
+  // Stripe Integration (prepared for future)
+  stripeSubscriptionId String?            @unique
+  stripeCustomerId     String?
+  
+  // Manual Management Fields
+  isManual             Boolean            @default(true)   // Manual vs Stripe-managed
+  activatedBy          String?            // Admin who activated
+  activatedAt          DateTime?
+  
+  // Grace Period
+  gracePeriodEnd       DateTime?          // End of grace period
+  
+  // Metadata
+  notes                String?            @db.Text
+  metadata             Json?
+  
+  createdAt            DateTime           @default(now())
+  updatedAt            DateTime           @updatedAt
+  
+  // Relations
+  user                 User?              @relation(fields: [userId], references: [id])
+  organization         Organization?      @relation(fields: [organizationId], references: [id])
+  plan                 SubscriptionPlan   @relation(fields: [planId], references: [id])
+  transactions         BillingTransaction[]
+  actions              SubscriptionAction[]
+  schedules            SubscriptionSchedule[]
+  subscriptionNotes    SubscriptionNote[]
+  
+  @@index([userId])
+  @@index([organizationId])
+  @@index([status])
+  @@index([currentPeriodEnd])
+  @@map("subscriptions")
+}
+```
+
+### 2.4 Enhanced SubscriptionPlan Model
+
+```prisma
+model SubscriptionPlan {
+  id                String   @id @default(uuid())
+  
+  // Basic Info
+  name              String
+  code              String   @unique  // BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE
+  description       String   @db.Text
+  
+  // Pricing
+  price             Float
+  currency          String   @default("CHF")
+  billingPeriod     String   @default("monthly")  // monthly, quarterly, yearly
+  
+  // Features
+  features          String[]
+  limits            Json     // { "parentEnquiries": 15, "teamMembers": 5, ... }
+  
+  // Access Control
+  allowedRoles      String[] // Which user roles can subscribe to this plan
+  
+  // Trial
+  trialDays         Int      @default(0)
+  
+  // Display
+  isActive          Boolean  @default(true)
+  isPopular         Boolean  @default(false)
+  displayOrder      Int      @default(0)
+  
+  // Stripe (prepared)
+  stripePriceId     String?
+  stripeProductId   String?
+  
+  createdAt         DateTime @default(now())
+  updatedAt         DateTime @updatedAt
+  
+  subscriptions     Subscription[]
+  
+  @@map("subscription_plans")
+}
+```
+
+---
+
+## 3. Backend API Implementation
+
+### 3.1 New API Endpoints
+
+#### Subscription Management Endpoints
+
+```typescript
+// Manual Subscription Operations
+POST   /admin/subscriptions                        // Create new subscription
+GET    /admin/subscriptions                        // List all subscriptions (with filters)
+GET    /admin/subscriptions/:id                    // Get subscription details
+PUT    /admin/subscriptions/:id                    // Update subscription
+DELETE /admin/subscriptions/:id                    // Delete subscription
+
+// Status Management
+POST   /admin/subscriptions/:id/activate           // Activate subscription
+POST   /admin/subscriptions/:id/pause              // Pause subscription
+POST   /admin/subscriptions/:id/resume             // Resume subscription
+POST   /admin/subscriptions/:id/cancel             // Cancel subscription
+POST   /admin/subscriptions/:id/renew              // Renew subscription
+POST   /admin/subscriptions/:id/extend             // Extend subscription period
+
+// Plan Management
+POST   /admin/subscriptions/:id/upgrade            // Upgrade to higher plan
+POST   /admin/subscriptions/:id/downgrade          // Downgrade to lower plan
+
+// Scheduling
+POST   /admin/subscriptions/:id/schedule           // Schedule future action
+GET    /admin/subscriptions/:id/schedules          // Get scheduled actions
+DELETE /admin/subscriptions/schedules/:scheduleId  // Cancel scheduled action
+
+// History & Notes
+GET    /admin/subscriptions/:id/history            // Get subscription action history
+POST   /admin/subscriptions/:id/notes              // Add note to subscription
+GET    /admin/subscriptions/:id/notes              // Get subscription notes
+
+// Bulk Operations
+POST   /admin/subscriptions/bulk/activate          // Bulk activate
+POST   /admin/subscriptions/bulk/pause             // Bulk pause
+POST   /admin/subscriptions/bulk/cancel            // Bulk cancel
+
+// Analytics
+GET    /admin/subscriptions/analytics              // Subscription analytics
+GET    /admin/subscriptions/expiring               // Subscriptions expiring soon
+GET    /admin/subscriptions/revenue                // Revenue projections
+```
+
+#### User/Organization Subscription Lookup
+
+```typescript
+GET    /admin/users/:userId/subscription           // Get user's subscription
+POST   /admin/users/:userId/subscription           // Create subscription for user
+GET    /admin/organizations/:orgId/subscription    // Get org's subscription
+POST   /admin/organizations/:orgId/subscription    // Create subscription for org
+```
+
+### 3.2 Service Implementation
+
+#### Enhanced SubscriptionManagementService
+
+```typescript
+// src/api/src/subscription-management/subscription-management.service.ts
+
+@Injectable()
+export class SubscriptionManagementService {
+  // Existing methods...
+
+  // New Manual Management Methods
+  
+  async pauseSubscription(
+    subscriptionId: string, 
+    pauseUntil: Date | null,
+    reason: string,
+    adminId: string
+  ): Promise<Subscription>;
+
+  async resumeSubscription(
+    subscriptionId: string,
+    adminId: string
+  ): Promise<Subscription>;
+
+  async renewSubscription(
+    subscriptionId: string,
+    periodMonths: number,
+    adminId: string
+  ): Promise<Subscription>;
+
+  async extendSubscription(
+    subscriptionId: string,
+    additionalDays: number,
+    reason: string,
+    adminId: string
+  ): Promise<Subscription>;
+
+  async upgradeSubscription(
+    subscriptionId: string,
+    newPlanId: string,
+    immediate: boolean,
+    adminId: string
+  ): Promise<Subscription>;
+
+  async downgradeSubscription(
+    subscriptionId: string,
+    newPlanId: string,
+    effectiveDate: Date,
+    adminId: string
+  ): Promise<Subscription>;
+
+  async scheduleAction(
+    subscriptionId: string,
+    action: ScheduledAction,
+    scheduledDate: Date,
+    adminId: string,
+    options?: ScheduleOptions
+  ): Promise<SubscriptionSchedule>;
+
+  async processScheduledActions(): Promise<void>;
+
+  async getSubscriptionHistory(
+    subscriptionId: string,
+    options?: PaginationOptions
+  ): Promise<SubscriptionAction[]>;
+
+  async addSubscriptionNote(
+    subscriptionId: string,
+    note: string,
+    isInternal: boolean,
+    adminId: string
+  ): Promise<SubscriptionNote>;
+
+  async getExpiringSubscriptions(
+    daysAhead: number
+  ): Promise<Subscription[]>;
+
+  async sendExpirationReminders(): Promise<void>;
+}
+```
+
+### 3.3 DTOs for Manual Management
+
+```typescript
+// src/api/src/subscription-management/dto/manual-subscription.dto.ts
+
+export class CreateManualSubscriptionDto {
+  @IsOptional()
+  @IsUUID()
+  userId?: string;
+
+  @IsOptional()
+  @IsUUID()
+  organizationId?: string;
+
+  @IsUUID()
+  planId: string;
+
+  @IsEnum(SubscriptionTier)
+  tier: SubscriptionTier;
+
+  @IsOptional()
+  @IsDate()
+  startDate?: Date;
+
+  @IsOptional()
+  @IsNumber()
+  durationMonths?: number;
+
+  @IsOptional()
+  @IsBoolean()
+  includeTrial?: boolean;
+
+  @IsOptional()
+  @IsString()
+  notes?: string;
+}
+
+export class PauseSubscriptionDto {
+  @IsOptional()
+  @IsDate()
+  pauseUntil?: Date;
+
+  @IsString()
+  reason: string;
+}
+
+export class RenewSubscriptionDto {
+  @IsNumber()
+  @Min(1)
+  @Max(36)
+  periodMonths: number;
+
+  @IsOptional()
+  @IsString()
+  notes?: string;
+}
+
+export class ExtendSubscriptionDto {
+  @IsNumber()
+  @Min(1)
+  additionalDays: number;
+
+  @IsString()
+  reason: string;
+}
+
+export class UpgradeDowngradeDto {
+  @IsUUID()
+  newPlanId: string;
+
+  @IsBoolean()
+  immediate: boolean;  // Apply now or at next billing cycle
+
+  @IsOptional()
+  @IsString()
+  notes?: string;
+}
+
+export class ScheduleActionDto {
+  @IsEnum(['ACTIVATE', 'CANCEL', 'PAUSE', 'RESUME', 'UPGRADE', 'DOWNGRADE'])
+  action: string;
+
+  @IsDate()
+  scheduledDate: Date;
+
+  @IsOptional()
+  @IsUUID()
+  targetPlanId?: string;
+
+  @IsOptional()
+  @IsString()
+  notes?: string;
+}
+
+export class BulkSubscriptionActionDto {
+  @IsArray()
+  @IsUUID('4', { each: true })
+  subscriptionIds: string[];
+
+  @IsOptional()
+  @IsString()
+  reason?: string;
+}
+```
+
+---
+
+## 4. Admin Dashboard UI
+
+### 4.1 New Subscriptions Page
+
+Create a new page at `admin/src/pages/Subscriptions.tsx`:
+
+#### Page Layout Structure
+
+```
+┌─────────────────────────────────────────────────────────────────────┐
+│  📊 Subscription Management                                          │
+│  Manage all subscriptions across the platform                        │
+├─────────────────────────────────────────────────────────────────────┤
+│  [Stats Cards Row]                                                   │
+│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
+│  │ Active  │ │ Paused  │ │ Trial   │ │Expiring │ │ Revenue │       │
+│  │   247   │ │   12    │ │   34    │ │   8     │ │ CHF 45K │       │
+│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
+├─────────────────────────────────────────────────────────────────────┤
+│  [Tabs: All | Active | Paused | Trial | Expiring | Cancelled]       │
+├─────────────────────────────────────────────────────────────────────┤
+│  [Filters Row]                                                       │
+│  [Search...]  [Plan ▼]  [Status ▼]  [Date Range]  [+ New Sub]       │
+├─────────────────────────────────────────────────────────────────────┤
+│  [Subscriptions Table]                                               │
+│  ┌───────────────────────────────────────────────────────────────┐  │
+│  │ User/Org    │ Plan    │ Status  │ Period      │ Actions ⋮   │  │
+│  ├───────────────────────────────────────────────────────────────┤  │
+│  │ Kita Zurich │ Pro     │ Active  │ Dec 1-31    │ ⋮           │  │
+│  │ ...         │ ...     │ ...     │ ...         │ ⋮           │  │
+│  └───────────────────────────────────────────────────────────────┘  │
+└─────────────────────────────────────────────────────────────────────┘
+```
+
+### 4.2 Subscription Management Modals
+
+#### Create Subscription Modal
+
+```
+┌─────────────────────────────────────────────────────┐
+│  ✚ Create New Subscription                     [×]  │
+├─────────────────────────────────────────────────────┤
+│                                                     │
+│  Subscription Type                                  │
+│  ○ User-based    ● Organization-based              │
+│                                                     │
+│  Select Organization *                              │
+│  [ Search organizations...              ▼ ]        │
+│                                                     │
+│  Select Plan *                                      │
+│  ┌─────────────────────────────────────────────┐   │
+│  │ ○ Basic - CHF 99/mo                         │   │
+│  │ ● Professional - CHF 199/mo    ⭐ Popular   │   │
+│  │ ○ Enterprise - CHF 499/mo                   │   │
+│  └─────────────────────────────────────────────┘   │
+│                                                     │
+│  Duration                                           │
+│  ○ Monthly  ○ Quarterly  ● Yearly                  │
+│                                                     │
+│  Start Date                                         │
+│  [ December 18, 2024        📅 ]                   │
+│                                                     │
+│  □ Include trial period (14 days)                   │
+│                                                     │
+│  Notes (optional)                                   │
+│  [ Internal notes about this subscription... ]      │
+│                                                     │
+├─────────────────────────────────────────────────────┤
+│                        [Cancel]  [Create Subscription]│
+└─────────────────────────────────────────────────────┘
+```
+
+#### Subscription Actions Modal (Context Menu)
+
+```
+┌──────────────────────────────┐
+│  ▶ Activate                  │
+│  ⏸ Pause Subscription        │
+│  ▶ Resume Subscription       │
+│  🔄 Renew                    │
+│  ⏱ Extend Period            │
+│  ⬆ Upgrade Plan             │
+│  ⬇ Downgrade Plan           │
+│  ❌ Cancel                   │
+│  ──────────────────────────  │
+│  📅 Schedule Action          │
+│  📝 Add Note                 │
+│  📜 View History             │
+│  👁 View Details             │
+└──────────────────────────────┘
+```
+
+#### Pause Subscription Modal
+
+```
+┌─────────────────────────────────────────────────────┐
+│  ⏸ Pause Subscription                          [×]  │
+├─────────────────────────────────────────────────────┤
+│                                                     │
+│  ⚠️ This will temporarily suspend access to all     │
+│  plan features.                                     │
+│                                                     │
+│  Pause Until                                        │
+│  ○ Indefinite (manual resume required)              │
+│  ● Specific date: [ January 15, 2025    📅 ]       │
+│                                                     │
+│  Reason *                                           │
+│  [ Customer requested temporary pause...    ]       │
+│                                                     │
+│  □ Notify customer via email                        │
+│  □ Extend subscription end date by pause duration   │
+│                                                     │
+├─────────────────────────────────────────────────────┤
+│                          [Cancel]  [Pause Subscription]│
+└─────────────────────────────────────────────────────┘
+```
+
+#### Subscription Detail View
+
+```
+┌─────────────────────────────────────────────────────────────────────┐
+│  📋 Subscription Details                                       [×]  │
+├─────────────────────────────────────────────────────────────────────┤
+│  [Overview] [History] [Notes] [Scheduled Actions]                   │
+├─────────────────────────────────────────────────────────────────────┤
+│                                                                     │
+│  ┌─────────────────────────────────────────────────────────────┐   │
+│  │ Subscriber                                                   │   │
+│  │ 🏢 Kita Sonnenschein AG                                     │   │
+│  │ Organization ID: org_abc123                                  │   │
+│  │ Contact: info@sonnenschein.ch                               │   │
+│  └─────────────────────────────────────────────────────────────┘   │
+│                                                                     │
+│  ┌────────────────────────┬────────────────────────────────────┐   │
+│  │ Plan                   │ Professional                       │   │
+│  │ Status                 │ 🟢 Active                          │   │
+│  │ Tier                   │ PROFESSIONAL                       │   │
+│  │ Billing Period         │ Yearly                             │   │
+│  │ Price                  │ CHF 199/mo (CHF 2,388/yr)         │   │
+│  ├────────────────────────┼────────────────────────────────────┤   │
+│  │ Current Period Start   │ December 1, 2024                   │   │
+│  │ Current Period End     │ November 30, 2025                  │   │
+│  │ Days Remaining         │ 348 days                           │   │
+│  ├────────────────────────┼────────────────────────────────────┤   │
+│  │ Created                │ December 1, 2024 by admin@pc.ch   │   │
+│  │ Last Modified          │ December 5, 2024                   │   │
+│  │ Management Type        │ 🔧 Manual                          │   │
+│  └────────────────────────┴────────────────────────────────────┘   │
+│                                                                     │
+│  Plan Features                                                      │
+│  ┌─────────────────────────────────────────────────────────────┐   │
+│  │ ✅ Unlimited Parent Enquiries                               │   │
+│  │ ✅ Recruitment & Job Posting                                │   │
+│  │ ✅ E-Learning Access                                        │   │
+│  │ ✅ Analytics Dashboard                                       │   │
+│  │ ✅ Team Management (up to 10 members)                       │   │
+│  │ ✅ Priority Support                                         │   │
+│  └─────────────────────────────────────────────────────────────┘   │
+│                                                                     │
+├─────────────────────────────────────────────────────────────────────┤
+│  [Edit] [Pause] [Cancel] [Renew]                              [Close]│
+└─────────────────────────────────────────────────────────────────────┘
+```
+
+### 4.3 Navigation Integration
+
+Update `admin/src/App.tsx` to add the Subscriptions route:
+
+```typescript
+import SubscriptionsPage from './pages/Subscriptions';
+
+// In Routes
+<Route path="subscriptions" element={<SubscriptionsPage />} />
+```
+
+Update `admin/src/components/Sidebar.tsx`:
+
+```typescript
+// Add to navigation items
+{
+  name: 'Subscriptions',
+  path: '/subscriptions',
+  icon: CreditCard, // from lucide-react
+}
+```
+
+### 4.4 Plans Management Page
+
+Create `admin/src/pages/SubscriptionPlans.tsx`:
+
+```
+┌─────────────────────────────────────────────────────────────────────┐
+│  📦 Subscription Plans                                               │
+│  Configure and manage subscription plans                             │
+├─────────────────────────────────────────────────────────────────────┤
+│  [+ Create New Plan]                                                 │
+├─────────────────────────────────────────────────────────────────────┤
+│                                                                     │
+│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
+│  │     BASIC       │  │    ESSENTIAL    │  │  PROFESSIONAL   │     │
+│  │   CHF 99/mo     │  │   CHF 149/mo    │  │   CHF 199/mo    │     │
+│  │                 │  │                 │  │    ⭐ Popular   │     │
+│  │ • Marketplace   │  │ • All Basic     │  │ • All Essential │     │
+│  │ • State Policies│  │ • 15 enquiries  │  │ • Unlimited     │     │
+│  │ • Unlimited     │  │ • HR Documents  │  │ • Recruitment   │     │
+│  │   orders        │  │                 │  │ • E-Learning    │     │
+│  │                 │  │                 │  │ • Analytics     │     │
+│  │ ───────────────│  │ ───────────────│  │ ───────────────│     │
+│  │ 45 Active      │  │ 87 Active      │  │ 115 Active     │     │
+│  │ [Edit] [View]  │  │ [Edit] [View]  │  │ [Edit] [View]  │     │
+│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
+│                                                                     │
+└─────────────────────────────────────────────────────────────────────┘
+```
+
+---
+
+## 5. Manual Subscription Operations
+
+### 5.1 Create Subscription Flow
+
+```mermaid
+flowchart TD
+    A[Admin clicks 'New Subscription'] --> B{Select Type}
+    B -->|User-based| C[Search & Select User]
+    B -->|Organization-based| D[Search & Select Organization]
+    C --> E[Select Plan]
+    D --> E
+    E --> F[Set Duration & Start Date]
+    F --> G{Include Trial?}
+    G -->|Yes| H[Set Trial Period]
+    G -->|No| I[Add Notes]
+    H --> I
+    I --> J[Create Subscription]
+    J --> K[Log Action to History]
+    K --> L{Send Notification?}
+    L -->|Yes| M[Send Email]
+    L -->|No| N[Done]
+    M --> N
+```
+
+### 5.2 Pause Subscription Flow
+
+```mermaid
+flowchart TD
+    A[Admin clicks 'Pause'] --> B{Already Paused?}
+    B -->|Yes| C[Show Error: Already Paused]
+    B -->|No| D[Open Pause Modal]
+    D --> E{Set Resume Date?}
+    E -->|Yes| F[Set pausedUntil date]
+    E -->|No| G[Leave pausedUntil null]
+    F --> H[Enter Reason]
+    G --> H
+    H --> I{Extend End Date?}
+    I -->|Yes| J[Calculate new end date]
+    I -->|No| K[Update Subscription]
+    J --> K
+    K --> L[Set status = PAUSED]
+    L --> M[Set pausedAt = now]
+    M --> N[Log Action to History]
+    N --> O{Notify Customer?}
+    O -->|Yes| P[Send Pause Email]
+    O -->|No| Q[Done]
+    P --> Q
+```
+
+### 5.3 Cancel Subscription Flow
+
+```mermaid
+flowchart TD
+    A[Admin clicks 'Cancel'] --> B{Cancellation Type}
+    B -->|Immediate| C[Cancel Now]
+    B -->|At Period End| D[Set cancelAtPeriodEnd = true]
+    C --> E[Set status = CANCELLED]
+    C --> F[Set canceledAt = now]
+    D --> G[Keep status = ACTIVE]
+    E --> H[Enter Reason]
+    F --> H
+    G --> H
+    H --> I[Log Action to History]
+    I --> J{Notify Customer?}
+    J -->|Yes| K[Send Cancellation Email]
+    J -->|No| L[Done]
+    K --> L
+```
+
+### 5.4 Renew Subscription Flow
+
+```mermaid
+flowchart TD
+    A[Admin clicks 'Renew'] --> B{Current Status}
+    B -->|Active| C[Extend from current end date]
+    B -->|Expired| D[Start new period from today]
+    B -->|Cancelled| E[Reactivate subscription]
+    C --> F[Select Duration]
+    D --> F
+    E --> F
+    F --> G[Calculate new end date]
+    G --> H[Set status = ACTIVE]
+    H --> I[Update period dates]
+    I --> J[Clear cancellation flags]
+    J --> K[Log Action to History]
+    K --> L{Notify Customer?}
+    L -->|Yes| M[Send Renewal Email]
+    L -->|No| N[Done]
+    M --> N
+```
+
+### 5.5 Scheduled Actions Processing
+
+Create a scheduled job (cron) to process pending actions:
+
+```typescript
+// Process scheduled actions daily
+@Cron('0 1 * * *')  // Run at 1 AM daily
+async processScheduledActions() {
+  const now = new Date();
+  
+  const pendingActions = await this.prisma.subscriptionSchedule.findMany({
+    where: {
+      scheduledDate: { lte: now },
+      isProcessed: false,
+    },
+    include: { subscription: true },
+  });
+
+  for (const scheduled of pendingActions) {
+    try {
+      switch (scheduled.scheduledAction) {
+        case 'CANCEL':
+          await this.cancelSubscription(scheduled.subscriptionId, 'system', 'Scheduled cancellation');
+          break;
+        case 'PAUSE':
+          await this.pauseSubscription(scheduled.subscriptionId, null, 'Scheduled pause', 'system');
+          break;
+        case 'RESUME':
+          await this.resumeSubscription(scheduled.subscriptionId, 'system');
+          break;
+        case 'UPGRADE':
+          await this.upgradeSubscription(scheduled.subscriptionId, scheduled.targetPlanId, true, 'system');
+          break;
+        // ... other actions
+      }
+
+      await this.prisma.subscriptionSchedule.update({
+        where: { id: scheduled.id },
+        data: { isProcessed: true, processedAt: now },
+      });
+    } catch (error) {
+      this.logger.error(`Failed to process scheduled action ${scheduled.id}: ${error.message}`);
+    }
+  }
+}
+```
+
+---
+
+## 6. Future Stripe Integration Path
+
+### 6.1 Stripe-Ready Architecture
+
+The current design ensures minimal changes when adding Stripe:
+
+| Manual Management | Stripe Integration |
+|-------------------|-------------------|
+| `isManual: true` | `isManual: false` |
+| No `stripeSubscriptionId` | Populated from Stripe |
+| Period managed manually | Synced from Stripe webhooks |
+| Status updated by admin | Status synced from Stripe |
+| No payment processing | Stripe Checkout/Portal |
+
+### 6.2 Integration Points
+
+```typescript
+// When Stripe is added, enhance the subscription service:
+
+@Injectable()
+export class SubscriptionManagementService {
+  
+  // Existing manual methods remain unchanged
+  
+  // New Stripe methods
+  async createStripeSubscription(
+    userId: string,
+    planId: string,
+    paymentMethodId?: string
+  ): Promise<Subscription> {
+    // Create Stripe subscription
+    // Store stripeSubscriptionId
+    // Set isManual = false
+  }
+
+  async syncStripeSubscription(
+    stripeSubscriptionId: string,
+    event: Stripe.Subscription
+  ): Promise<void> {
+    // Webhook handler to sync status
+  }
+
+  async switchToStripeManagement(
+    subscriptionId: string
+  ): Promise<Subscription> {
+    // Convert manual subscription to Stripe-managed
+  }
+}
+```
+
+### 6.3 Webhook Handlers (Prepared)
+
+The existing `BillingService` already has webhook handlers that can be activated:
+
+- `handleCheckoutSessionCompleted`
+- `handleInvoicePaid`
+- `handleInvoicePaymentFailed`
+- `handleSubscriptionUpdated`
+- `handleSubscriptionDeleted`
+- `handleChargeRefunded`
+
+### 6.4 Migration Path
+
+When ready to enable Stripe:
+
+1. Enable Stripe environment variables
+2. Create products/prices in Stripe Dashboard
+3. Map existing plans to Stripe price IDs
+4. Enable webhook endpoints
+5. Optionally migrate existing manual subscriptions:
+   - Keep as manual (for existing customers)
+   - OR create Stripe subscriptions for new period
+
+---
+
+## 7. Implementation Phases
+
+### Phase 1: Database & API Foundation (Week 1-2)
+
+**Deliverables:**
+- [ ] Prisma schema updates with new models
+- [ ] Run migrations
+- [ ] Enhanced SubscriptionManagementService
+- [ ] All manual operation endpoints
+- [ ] Unit tests for service methods
+
+**Files to Create/Modify:**
+- `api/prisma/schema.prisma` - Add new models
+- `api/src/subscription-management/subscription-management.service.ts` - Enhanced service
+- `api/src/subscription-management/dto/manual-subscription.dto.ts` - New DTOs
+- `api/src/subscription-management/subscription-management.controller.ts` - New endpoints
+
+### Phase 2: Admin Dashboard UI (Week 3-4)
+
+**Deliverables:**
+- [ ] Subscriptions page with table view
+- [ ] Create subscription modal
+- [ ] Subscription detail view
+- [ ] Action modals (pause, resume, cancel, renew, extend)
+- [ ] Subscription history view
+- [ ] Notes management
+
+**Files to Create:**
+- `admin/src/pages/Subscriptions.tsx`
+- `admin/src/pages/SubscriptionPlans.tsx`
+- `admin/src/components/subscriptions/CreateSubscriptionModal.tsx`
+- `admin/src/components/subscriptions/SubscriptionDetailModal.tsx`
+- `admin/src/components/subscriptions/PauseSubscriptionModal.tsx`
+- `admin/src/components/subscriptions/CancelSubscriptionModal.tsx`
+- `admin/src/components/subscriptions/RenewSubscriptionModal.tsx`
+- `admin/src/components/subscriptions/SubscriptionHistoryPanel.tsx`
+
+### Phase 3: Analytics & Scheduling (Week 5)
+
+**Deliverables:**
+- [ ] Subscription analytics dashboard
+- [ ] Revenue projections
+- [ ] Scheduled actions management
+- [ ] Expiration reminders (automated)
+- [ ] Bulk operations
+
+**Files to Create/Modify:**
+- `admin/src/pages/SubscriptionAnalytics.tsx`
+- `api/src/subscription-management/subscription-scheduler.service.ts`
+- Cron job configuration
+
+### Phase 4: Notifications & Polish (Week 6)
+
+**Deliverables:**
+- [ ] Email notification templates for subscription events
+- [ ] Email notification integration
+- [ ] Error handling improvements
+- [ ] Loading states and UX polish
+- [ ] Documentation updates
+
+**Files to Create/Modify:**
+- Email templates in `api/src/email-notification/templates/`
+- Update `docs/subscription-guide.md`
+
+### Phase 5: Future - Stripe Integration (When Ready)
+
+**Deliverables:**
+- [ ] Enable Stripe webhook endpoints
+- [ ] Payment checkout flow
+- [ ] Customer portal integration
+- [ ] Automatic billing sync
+- [ ] Payment failure handling
+
+---
+
+## 8. Testing Strategy
+
+### 8.1 Unit Tests
+
+```typescript
+// api/test/subscription-management.spec.ts
+
+describe('SubscriptionManagementService', () => {
+  describe('createSubscription', () => {
+    it('should create a manual subscription with correct dates');
+    it('should include trial period when specified');
+    it('should log creation action');
+  });
+
+  describe('pauseSubscription', () => {
+    it('should set status to PAUSED');
+    it('should set pausedAt timestamp');
+    it('should optionally set pausedUntil date');
+    it('should extend end date when option selected');
+    it('should log pause action');
+  });
+
+  describe('resumeSubscription', () => {
+    it('should set status back to ACTIVE');
+    it('should clear pause fields');
+    it('should fail if not currently paused');
+  });
+
+  describe('cancelSubscription', () => {
+    it('should immediately cancel when immediate=true');
+    it('should set cancelAtPeriodEnd when immediate=false');
+    it('should log cancellation with reason');
+  });
+
+  describe('renewSubscription', () => {
+    it('should extend period for active subscription');
+    it('should reactivate expired subscription');
+    it('should calculate correct new end date');
+  });
+
+  describe('processScheduledActions', () => {
+    it('should process pending scheduled actions');
+    it('should mark actions as processed');
+    it('should handle errors gracefully');
+  });
+});
+```
+
+### 8.2 E2E Tests
+
+```typescript
+// api/test/subscription-management.e2e-spec.ts
+
+describe('Subscription Management (e2e)', () => {
+  it('POST /admin/subscriptions - should create subscription');
+  it('GET /admin/subscriptions - should list with filters');
+  it('POST /admin/subscriptions/:id/pause - should pause');
+  it('POST /admin/subscriptions/:id/resume - should resume');
+  it('POST /admin/subscriptions/:id/cancel - should cancel');
+  it('POST /admin/subscriptions/:id/renew - should renew');
+  it('GET /admin/subscriptions/:id/history - should return action log');
+  it('POST /admin/subscriptions/bulk/pause - should bulk pause');
+});
+```
+
+### 8.3 Integration Tests
+
+```typescript
+// Test email notifications are sent
+// Test scheduled actions are processed
+// Test audit log is complete
+```
+
+---
+
+## 9. API Service Updates (Admin Frontend)
+
+Add these methods to `admin/src/services/api.ts`:
+
+```typescript
+// Subscription Management
+getSubscriptions: (apiClient: AxiosInstance, params?: {
+  page?: number;
+  limit?: number;
+  status?: string;
+  planId?: string;
+  search?: string;
+}) => apiClient.get<ApiResponse<{ subscriptions: Subscription[]; total: number }>>('/admin/subscriptions', { params }),
+
+getSubscription: (apiClient: AxiosInstance, id: string) => 
+  apiClient.get<ApiResponse<Subscription>>(`/admin/subscriptions/${id}`),
+
+createSubscription: (apiClient: AxiosInstance, data: CreateSubscriptionDto) =>
+  apiClient.post<ApiResponse<Subscription>>('/admin/subscriptions', data),
+
+pauseSubscription: (apiClient: AxiosInstance, id: string, data: PauseSubscriptionDto) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/pause`, data),
+
+resumeSubscription: (apiClient: AxiosInstance, id: string) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/resume`),
+
+cancelSubscription: (apiClient: AxiosInstance, id: string, data: { immediate: boolean; reason: string }) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/cancel`, data),
+
+renewSubscription: (apiClient: AxiosInstance, id: string, data: RenewSubscriptionDto) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/renew`, data),
+
+extendSubscription: (apiClient: AxiosInstance, id: string, data: ExtendSubscriptionDto) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/extend`, data),
+
+upgradeSubscription: (apiClient: AxiosInstance, id: string, data: UpgradeDowngradeDto) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/upgrade`, data),
+
+downgradeSubscription: (apiClient: AxiosInstance, id: string, data: UpgradeDowngradeDto) =>
+  apiClient.post<ApiResponse<Subscription>>(`/admin/subscriptions/${id}/downgrade`, data),
+
+getSubscriptionHistory: (apiClient: AxiosInstance, id: string) =>
+  apiClient.get<ApiResponse<SubscriptionAction[]>>(`/admin/subscriptions/${id}/history`),
+
+addSubscriptionNote: (apiClient: AxiosInstance, id: string, data: { note: string; isInternal?: boolean }) =>
+  apiClient.post<ApiResponse<SubscriptionNote>>(`/admin/subscriptions/${id}/notes`, data),
+
+getSubscriptionNotes: (apiClient: AxiosInstance, id: string) =>
+  apiClient.get<ApiResponse<SubscriptionNote[]>>(`/admin/subscriptions/${id}/notes`),
+
+scheduleSubscriptionAction: (apiClient: AxiosInstance, id: string, data: ScheduleActionDto) =>
+  apiClient.post<ApiResponse<SubscriptionSchedule>>(`/admin/subscriptions/${id}/schedule`, data),
+
+getSubscriptionSchedules: (apiClient: AxiosInstance, id: string) =>
+  apiClient.get<ApiResponse<SubscriptionSchedule[]>>(`/admin/subscriptions/${id}/schedules`),
+
+cancelScheduledAction: (apiClient: AxiosInstance, scheduleId: string) =>
+  apiClient.delete<ApiResponse<null>>(`/admin/subscriptions/schedules/${scheduleId}`),
+
+getSubscriptionAnalytics: (apiClient: AxiosInstance, timeRange?: string) =>
+  apiClient.get<ApiResponse<SubscriptionAnalytics>>('/admin/subscriptions/analytics', { params: { timeRange } }),
+
+getExpiringSubscriptions: (apiClient: AxiosInstance, daysAhead: number) =>
+  apiClient.get<ApiResponse<Subscription[]>>('/admin/subscriptions/expiring', { params: { daysAhead } }),
+
+bulkPauseSubscriptions: (apiClient: AxiosInstance, data: BulkSubscriptionActionDto) =>
+  apiClient.post<ApiResponse<{ success: boolean; count: number }>>('/admin/subscriptions/bulk/pause', data),
+
+bulkCancelSubscriptions: (apiClient: AxiosInstance, data: BulkSubscriptionActionDto) =>
+  apiClient.post<ApiResponse<{ success: boolean; count: number }>>('/admin/subscriptions/bulk/cancel', data),
+
+// Subscription Plans
+getSubscriptionPlans: (apiClient: AxiosInstance) =>
+  apiClient.get<ApiResponse<SubscriptionPlan[]>>('/admin/subscription-management/plans'),
+
+createSubscriptionPlan: (apiClient: AxiosInstance, data: CreatePlanDto) =>
+  apiClient.post<ApiResponse<SubscriptionPlan>>('/admin/subscription-management/plans', data),
+
+updateSubscriptionPlan: (apiClient: AxiosInstance, id: string, data: Partial<SubscriptionPlan>) =>
+  apiClient.put<ApiResponse<SubscriptionPlan>>(`/admin/subscription-management/plans/${id}`, data),
+
+deleteSubscriptionPlan: (apiClient: AxiosInstance, id: string) =>
+  apiClient.delete<ApiResponse<null>>(`/admin/subscription-management/plans/${id}`),
+```
+
+---
+
+## 10. TypeScript Types (Admin Frontend)
+
+Add to `admin/src/types/index.ts` or create `admin/src/types/subscription.ts`:
+
+```typescript
+export enum SubscriptionStatus {
+  ACTIVE = 'ACTIVE',
+  INACTIVE = 'INACTIVE',
+  PAUSED = 'PAUSED',
+  CANCELLED = 'CANCELLED',
+  EXPIRED = 'EXPIRED',
+  TRIAL = 'TRIAL',
+  PAST_DUE = 'PAST_DUE',
+  PENDING = 'PENDING',
+  GRACE_PERIOD = 'GRACE_PERIOD',
+}
+
+export enum SubscriptionTier {
+  BASIC = 'BASIC',
+  ESSENTIAL = 'ESSENTIAL',
+  PROFESSIONAL = 'PROFESSIONAL',
+  ENTERPRISE = 'ENTERPRISE',
+}
+
+export interface SubscriptionPlan {
+  id: string;
+  name: string;
+  code: string;
+  description: string;
+  price: number;
+  currency: string;
+  billingPeriod: string;
+  features: string[];
+  limits: Record<string, any>;
+  allowedRoles: string[];
+  trialDays: number;
+  isActive: boolean;
+  isPopular: boolean;
+  displayOrder: number;
+  stripePriceId?: string;
+  stripeProductId?: string;
+  createdAt: string;
+  updatedAt: string;
+}
+
+export interface Subscription {
+  id: string;
+  userId?: string;
+  organizationId?: string;
+  planId: string;
+  tier: SubscriptionTier;
+  status: SubscriptionStatus;
+  currentPeriodStart?: string;
+  currentPeriodEnd?: string;
+  trialStart?: string;
+  trialEnd?: string;
+  pausedAt?: string;
+  pausedUntil?: string;
+  cancelAtPeriodEnd: boolean;
+  canceledAt?: string;
+  cancellationReason?: string;
+  stripeSubscriptionId?: string;
+  stripeCustomerId?: string;
+  isManual: boolean;
+  activatedBy?: string;
+  activatedAt?: string;
+  gracePeriodEnd?: string;
+  notes?: string;
+  metadata?: Record<string, any>;
+  createdAt: string;
+  updatedAt: string;
+  user?: User;
+  organization?: Organization;
+  plan: SubscriptionPlan;
+}
+
+export interface SubscriptionAction {
+  id: string;
+  subscriptionId: string;
+  action: string;
+  previousStatus?: string;
+  newStatus: string;
+  reason?: string;
+  notes?: string;
+  performedBy: string;
+  performedAt: string;
+  metadata?: Record<string, any>;
+}
+
+export interface SubscriptionNote {
+  id: string;
+  subscriptionId: string;
+  note: string;
+  isInternal: boolean;
+  createdBy: string;
+  createdAt: string;
+}
+
+export interface SubscriptionSchedule {
+  id: string;
+  subscriptionId: string;
+  scheduledAction: string;
+  scheduledDate: string;
+  targetPlanId?: string;
+  isProcessed: boolean;
+  processedAt?: string;
+  createdBy: string;
+  createdAt: string;
+}
+
+export interface SubscriptionAnalytics {
+  totalSubscriptions: number;
+  activeSubscriptions: number;
+  pausedSubscriptions: number;
+  trialSubscriptions: number;
+  cancelledSubscriptions: number;
+  expiredSubscriptions: number;
+  expiringWithin30Days: number;
+  monthlyRecurringRevenue: number;
+  annualRecurringRevenue: number;
+  subscriptionsByPlan: Record<string, number>;
+  subscriptionsByStatus: Record<string, number>;
+  growthRate: number;
+  churnRate: number;
+  averageSubscriptionLength: number;
+}
+
+// DTOs
+export interface CreateSubscriptionDto {
+  userId?: string;
+  organizationId?: string;
+  planId: string;
+  tier: SubscriptionTier;
+  startDate?: string;
+  durationMonths?: number;
+  includeTrial?: boolean;
+  notes?: string;
+}
+
+export interface PauseSubscriptionDto {
+  pauseUntil?: string;
+  reason: string;
+  extendEndDate?: boolean;
+  notifyCustomer?: boolean;
+}
+
+export interface RenewSubscriptionDto {
+  periodMonths: number;
+  notes?: string;
+}
+
+export interface ExtendSubscriptionDto {
+  additionalDays: number;
+  reason: string;
+}
+
+export interface UpgradeDowngradeDto {
+  newPlanId: string;
+  immediate: boolean;
+  notes?: string;
+}
+
+export interface ScheduleActionDto {
+  action: 'ACTIVATE' | 'CANCEL' | 'PAUSE' | 'RESUME' | 'UPGRADE' | 'DOWNGRADE';
+  scheduledDate: string;
+  targetPlanId?: string;
+  notes?: string;
+}
+
+export interface BulkSubscriptionActionDto {
+  subscriptionIds: string[];
+  reason?: string;
+}
+```
+
+---
+
+## 11. Summary
+
+This plan provides a comprehensive blueprint for implementing a **Subscription Management System** that:
+
+✅ **Supports Full Manual Management** - Admins can create, pause, resume, cancel, and renew subscriptions without any payment integration
+
+✅ **Is Stripe-Ready** - All data models and services are designed to seamlessly integrate with Stripe when needed
+
+✅ **Provides Complete Audit Trail** - Every action is logged with timestamps, actors, and reasons
+
+✅ **Enables Scheduling** - Future actions can be scheduled and automatically processed
+
+✅ **Supports Bulk Operations** - Efficiently manage multiple subscriptions at once
+
+✅ **Integrates with Email Notifications** - Customers can be notified of subscription changes
+
+✅ **Follows Existing Patterns** - Uses the same UI components, API patterns, and code structure as the rest of the codebase
+
+---
+
+## Appendix: Quick Reference
+
+### Status Transition Diagram
+
+```
+PENDING ──────────────────► ACTIVE ◄──────────────── TRIAL
+    │                          │                        │
+    │                          ▼                        │
+    │                       PAUSED                      │
+    │                          │                        │
+    │                          ▼                        │
+    └────────────────────► CANCELLED ◄─────────────────┘
+                               │
+                               ▼
+                           EXPIRED
+```
+
+### API Endpoint Quick Reference
+
+| Action | Endpoint | Method |
+|--------|----------|--------|
+| List | `/admin/subscriptions` | GET |
+| Create | `/admin/subscriptions` | POST |
+| View | `/admin/subscriptions/:id` | GET |
+| Pause | `/admin/subscriptions/:id/pause` | POST |
+| Resume | `/admin/subscriptions/:id/resume` | POST |
+| Cancel | `/admin/subscriptions/:id/cancel` | POST |
+| Renew | `/admin/subscriptions/:id/renew` | POST |
+| Extend | `/admin/subscriptions/:id/extend` | POST |
+| Upgrade | `/admin/subscriptions/:id/upgrade` | POST |
+| Downgrade | `/admin/subscriptions/:id/downgrade` | POST |
+| Schedule | `/admin/subscriptions/:id/schedule` | POST |
+| History | `/admin/subscriptions/:id/history` | GET |
+| Notes | `/admin/subscriptions/:id/notes` | GET/POST |
+| Analytics | `/admin/subscriptions/analytics` | GET |
+| Expiring | `/admin/subscriptions/expiring` | GET |
+| Bulk Pause | `/admin/subscriptions/bulk/pause` | POST |
+| Bulk Cancel | `/admin/subscriptions/bulk/cancel` | POST |
