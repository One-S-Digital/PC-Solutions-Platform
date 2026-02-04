# Feature Inventory

This document lists all features that are **actually implemented** in the codebase, verified by examining controllers, services, models, and UI components.

**Last Updated:** Based on codebase analysis as of current build

---

## Authentication & User Management

### ✅ Implemented

- **Clerk Authentication Integration**
  - JWT-based authentication via Clerk
  - User signup/signin flows
  - OAuth support (Google, etc.)
  - Email/password authentication
  - Webhook-based user sync (`api/src/webhooks/clerk-webhook.controller.ts`)
  - Pending user handling (users created but profile not completed)

- **User Profile Management**
  - Complete profile flow (`api/src/users/users.controller.ts`)
  - User roles: SUPER_ADMIN, ADMIN, FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, EDUCATOR, PARENT
  - Profile editing (`frontend/pages/ProfileEditPage.tsx`)
  - Avatar uploads
  - Contact info management (separate from auth email)

- **Role-Based Access Control (RBAC)**
  - Guards: `ClerkAuthGuard`, `RolesGuard`, `AuthPipelineGuard`
  - Role decorators: `@Roles()`, `@Public()`, `@AllowPending()`
  - CASL-based policy system (`api/src/auth/ability/ability.factory.ts`)

**Files:**
- `api/src/auth/guards/clerk-auth.guard.ts`
- `api/src/auth/guards/roles.guard.ts`
- `api/src/users/users.controller.ts`
- `frontend/pages/LoginPage.tsx`, `SignupPage.tsx`

---

## Marketplace

### ✅ Implemented

- **Product Management (Suppliers)**
  - Create, read, update, delete products
  - Product categories (flexible tags system)
  - Product images and galleries
  - Product status: ACTIVE, INACTIVE, DRAFT, OUT_OF_STOCK
  - Multi-language support
  - Product search and filtering
  - Catalog uploads (PDF/CSV)

- **Service Management (Service Providers)**
  - Create, read, update, delete services
  - Service categories
  - Service requests management
  - Booking links
  - Delivery types: On-site, Remote, Hybrid

- **Inquiry System**
  - Foundations can send inquiries to suppliers
  - Inquiry status: NEW, PENDING, CONTACTED, QUOTED, FULFILLED, DECLINED, CANCELLED
  - Supplier response workflow

- **Orders**
  - Order creation and management
  - Order items tracking
  - Order status tracking

**Files:**
- `api/src/marketplace/marketplace.controller.ts`
- `api/src/marketplace/marketplace.service.ts`
- `frontend/pages/MarketplacePage.tsx`
- `frontend/pages/supplier/SupplierProductListingsPage.tsx`
- `frontend/pages/service-provider/ServiceProviderListingsPage.tsx`

---

## Recruitment

### ✅ Implemented

- **Job Listings (Foundations)**
  - Create, read, update, delete job listings
  - Job status: DRAFT, PUBLISHED, CLOSED, FILLED
  - Contract types: FULL_TIME, PART_TIME, CDI, CDD, INTERNSHIP, REPLACEMENT, TEMPORARY, FREELANCE
  - Job search and filtering
  - Public job board for educators

- **Job Applications (Educators)**
  - Apply to job listings
  - Application status: PENDING, REVIEWED, ACCEPTED, REJECTED
  - CV upload support
  - Cover letter submission
  - Application tracking

- **Candidate Pool**
  - View candidate profiles
  - Search candidates
  - Candidate profile viewing (`frontend/pages/candidate/CandidateProfilePage.tsx`)

**Files:**
- `api/src/recruitment/recruitment.controller.ts`
- `frontend/pages/RecruitmentPage.tsx`
- `frontend/pages/educator/EducatorJobBoardPage.tsx`
- `frontend/pages/educator/EducatorApplicationsPage.tsx`

---

## Lead Management

### ✅ Implemented

- **Parent Leads**
  - Parents can submit lead forms
  - Lead information: parent name, email, phone, child name, age, preferences
  - Lead status tracking
  - Foundation matching system
  - Foundation responses to leads
  - Lead assignment to foundations

- **Foundation Lead Management**
  - View assigned leads
  - Respond to leads (INTERESTED, NOT_INTERESTED, NEEDS_MORE_INFO, ENROLLED)
  - Lead filtering and search

**Files:**
- `api/src/leads/leads.controller.ts`
- `frontend/pages/ParentLeadFormPage.tsx`
- `frontend/pages/parent/ParentEnquiriesPage.tsx`
- `frontend/pages/foundation/FoundationLeadsPage.tsx`

---

## Messaging System

### ✅ Implemented

- **Conversations**
  - Direct messages (1-on-1)
  - Group conversations
  - Support conversations
  - Conversation creation and management
  - Participant management

- **Messages**
  - Text messages
  - File attachments
  - Image messages
  - System messages
  - Message read/unread tracking
  - Message search
  - Message editing and deletion

- **Real-time Updates**
  - Socket.IO integration (`api/src/messaging/messaging.gateway.ts`)
  - Real-time message delivery
  - Unread count tracking

**Files:**
- `api/src/messaging/messaging.controller.ts`
- `api/src/messaging/messaging.gateway.ts`
- `frontend/pages/MessagesPage.tsx`
- `frontend/contexts/MessagingContext.tsx`

---

## Support Ticket System

### ✅ Implemented

- **Ticket Creation**
  - Users can create support tickets
  - Ticket categories: GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST
  - Priority levels: LOW, MEDIUM, HIGH, URGENT
  - File attachments support

- **Ticket Management**
  - Ticket status: OPEN, IN_PROGRESS, RESOLVED, CLOSED
  - Admin assignment
  - Ticket responses (user and staff)
  - Ticket filtering and search

- **Admin Features**
  - View all tickets
  - Update ticket status
  - Assign tickets to admins
  - Ticket statistics

**Files:**
- `api/src/support/support.controller.ts`
- `frontend/pages/foundation/FoundationSupportPage.tsx`
- `frontend/pages/supplier/SupplierSupportPage.tsx`
- `frontend/pages/service-provider/ServiceProviderSupportPage.tsx`
- `frontend/pages/educator/EducatorSupportPage.tsx`
- `frontend/pages/parent/ParentSupportPage.tsx`
- `admin/src/pages/Support.tsx`

---

## E-Learning Platform

### ✅ Implemented

- **Course Management**
  - Create, read, update courses
  - Course status: DRAFT, PUBLISHED, ARCHIVED
  - Course categories
  - Course modules and lessons
  - Content types: VIDEO, DOCUMENT, QUIZ, TEXT, IMAGE
  - Course enrollment

- **Learning Progress**
  - Lesson progress tracking
  - Lesson status: NOT_STARTED, IN_PROGRESS, COMPLETED
  - Course completion tracking
  - Progress percentage

- **Quizzes**
  - Quiz creation
  - Quiz types: MULTIPLE_CHOICE, TRUE_FALSE, ESSAY, MATCHING
  - Quiz attempts
  - Passing score tracking

- **Certificates**
  - Certificate generation
  - Certificate verification codes

- **Discussions**
  - Course discussions
  - Discussion replies
  - Pinned discussions

**Files:**
- `api/src/elearning/elearning.controller.ts`
- `frontend/pages/ELearningPage.tsx`

---

## Content Management

### ✅ Implemented

- **HR Procedures**
  - Document library
  - Document categories
  - Document versioning
  - Document access control

- **State Policies**
  - Policy documents by canton/region
  - Policy crawler system (`api/src/crawler/`)
  - Policy change tracking
  - Critical policy alerts

- **Content Items**
  - Upload documents, images, videos
  - Content categorization
  - Content status: draft, published, archived
  - Content access roles

**Files:**
- `api/src/content/content.controller.ts`
- `api/src/content-management/content-management.controller.ts`
- `frontend/pages/HRProceduresPage.tsx`
- `frontend/pages/StatePoliciesPage.tsx`

---

## Subscription & Billing

### ✅ Implemented

- **Subscription Plans**
  - Plan creation and management
  - Subscription tiers: BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE
  - Plan features and limits
  - Billing periods: monthly, quarterly, yearly

- **Subscription Management**
  - Subscription status: ACTIVE, INACTIVE, PAUSED, CANCELLED, EXPIRED, TRIAL, PAST_DUE, PENDING, GRACE_PERIOD
  - Manual subscription activation
  - Subscription requests workflow
  - Subscription cancellation requests
  - Subscription history and notes
  - Scheduled subscription actions

- **Subscription Requests**
  - Request submission by users
  - Request status: PENDING, UNDER_REVIEW, INVOICE_SENT, PAYMENT_PENDING, PAYMENT_RECEIVED, ACTIVATED, DECLINED, CANCELLED
  - Invoice management
  - Payment confirmation

- **Feature Gating**
  - Feature access checking
  - Feature flags system
  - Subscription-based feature access

- **Billing**
  - Billing transactions
  - Payment reminders
  - Failed payment processing
  - Refund processing

**Files:**
- `api/src/subscription-management/subscription-management.controller.ts`
- `api/src/billing/billing.controller.ts`
- `frontend/contexts/SubscriptionContext.tsx`
- `frontend/components/shared/SubscriptionPaywall.tsx`

---

## File Upload & Storage

### ✅ Implemented

- **Cloudflare R2 Storage**
  - File uploads to R2
  - Presigned upload URLs
  - File validation (MIME type, size)
  - Malware scanning (ClamAV integration, optional)
  - File checksum verification
  - Asset management

- **Asset Types**
  - AVATAR, LOGO, COVER_IMAGE, PRODUCT_IMAGE, DOCUMENT, CV, CATALOG_PDF, CATALOG_CSV
  - FRONTEND_LOGO, FRONTEND_FAVICON, FRONTEND_OG_IMAGE
  - ADMIN_LOGO, ADMIN_FAVICON, SIDEBAR_LOGO
  - ELEARNING, COMPANY_PROFILE_DOC

**Files:**
- `api/src/upload/upload.controller.ts`
- `api/src/upload/cloudflare-r2.service.ts`
- `api/src/security/antivirus-upload.controller.ts`

---

## Dashboard & Analytics

### ✅ Implemented

- **Foundation Dashboard**
  - Quick stats (leads, applications, orders, etc.)
  - Recent activities
  - Calendar events
  - Weather integration
  - Lead statistics
  - Application statistics

- **Supplier Dashboard**
  - Product statistics
  - Order statistics
  - Inquiry statistics

- **Service Provider Dashboard**
  - Service request statistics
  - Request analytics

- **Educator Dashboard**
  - Application status
  - Job board access

- **Parent Dashboard**
  - Enquiry status
  - Lead tracking

- **Admin Analytics**
  - User growth metrics
  - Organization activity
  - Product performance
  - Job metrics
  - Revenue metrics

**Files:**
- `api/src/dashboard/dashboard.controller.ts`
- `api/src/analytics/analytics.controller.ts`
- `frontend/pages/foundation/FoundationDashboardPage.tsx`
- `frontend/pages/supplier/SupplierDashboardPage.tsx`
- `frontend/pages/service-provider/ServiceProviderDashboardPage.tsx`

---

## Translation & i18n

### ✅ Implemented

- **Multi-language Support**
  - Languages: English (en), French (fr), German (de)
  - Static UI translations
  - Dynamic entity translations
  - Translation memory
  - Translation status: PENDING, MT_DONE, REVIEWED, APPROVED
  - Translation audit logs

- **Translation Management**
  - Admin translation UI
  - Translation review workflow
  - Translation cost tracking

**Files:**
- `api/src/translation/translation.controller.ts`
- `api/src/static-translation/static-translation.controller.ts`
- `frontend/i18n.ts`
- `admin/src/i18n/index.ts`
- `packages/translations/`

---

## Admin Features

### ✅ Implemented

- **User Management**
  - View all users
  - User role management
  - User profile management
  - User activity tracking

- **Organization Management**
  - View all organizations
  - Organization profile management
  - Organization type management

- **Content Moderation**
  - Content moderation queue
  - Moderation actions
  - Content reporting

- **System Monitoring**
  - System health checks
  - System metrics
  - System alerts
  - Audit logs

- **Platform Settings**
  - Frontend customization
  - Admin branding
  - Platform configuration
  - Maintenance mode

- **Subscription Management**
  - View all subscriptions
  - Manage subscription requests
  - Process cancellations
  - Billing management

- **Discount Terminations**
  - Vendor client management
  - Discount termination workflow
  - Active client tracking

**Files:**
- `api/src/admin/admin.controller.ts`
- `api/src/user-management/user-management.controller.ts`
- `api/src/system-monitoring/system-monitoring.controller.ts`
- `api/src/platform-settings/platform-settings.controller.ts`
- `admin/src/pages/`

---

## Partners

### ✅ Implemented

- **Partner Directory**
  - Partner listing
  - Partner types: ACADEMIC, CORPORATE, GOVERNMENTAL, NON_PROFIT, MEDIA, TECHNOLOGY
  - Partner profiles
  - Public partner page

**Files:**
- `api/src/partners/partners.controller.ts`
- `frontend/pages/PartnersPage.tsx`
- `frontend/pages/PublicPartnersPage.tsx`

---

## Promo Codes

### ✅ Implemented

- **Promo Code Management**
  - Create promo codes
  - Discount types: Percentage, FixedAmount, FreeMinutes
  - Usage limits
  - Expiry dates
  - Usage tracking

**Files:**
- `api/src/promo-codes/promo-codes.controller.ts`

---

## Calendar Events

### ✅ Implemented

- **Foundation Calendar**
  - Create calendar events
  - Event types: appointment, interview, service, meeting, reminder, custom
  - Event scheduling
  - Event deletion
  - Calendar view

**Files:**
- `api/src/dashboard/dashboard.controller.ts` (calendar endpoints)
- Frontend calendar integration in dashboard

---

## Not Implemented / Partially Implemented

### ⚠️ Partially Implemented

- **Stripe Payment Integration**
  - Models prepared (stripeCustomerId, stripeSubscriptionId fields exist)
  - Controllers mention Stripe but manual flow is primary
  - Webhook handlers exist but not fully integrated
  - **Status:** Infrastructure ready, manual billing is primary workflow

- **Real-time Notifications**
  - Socket.IO gateway exists
  - Notification context exists
  - **Status:** Basic implementation, may need enhancement

### ❌ Not Implemented

- **Automated Payment Processing**
  - Stripe Checkout integration
  - Automatic subscription renewals
  - Payment method management UI

- **Advanced Analytics**
  - Custom report generation
  - Export functionality
  - Advanced filtering

- **Mobile App**
  - No mobile app implementation found

---

## Notes

- All features listed above have been verified by examining:
  - API controllers (`api/src/*/controllers.ts`)
  - Services (`api/src/*/services.ts`)
  - Database models (`api/prisma/schema.prisma`)
  - Frontend pages (`frontend/pages/`)
  - Admin pages (`admin/src/pages/`)

- Features marked as "Partially Implemented" have infrastructure in place but may require additional work for full functionality.

- Features marked as "Not Implemented" are not present in the codebase.

