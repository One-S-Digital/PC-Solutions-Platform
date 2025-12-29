# API Endpoints Map

Complete mapping of all API endpoints organized by feature area.

**Base URL:** `/api` (global prefix)

**Last Updated:** Based on codebase analysis

---

## Authentication & User Management

### Users (`/users`)

- `POST /users/complete-profile` - Complete user profile (allows pending users)
- `POST /users` - Create user (SUPER_ADMIN only)
- `POST /users/invite` - Invite user by email (ADMIN, SUPER_ADMIN)
- `GET /users` - Get all users (ADMIN, SUPER_ADMIN)
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user (SUPER_ADMIN only)
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update current user profile
- `GET /users/me/organizations` - Get user's organizations

**Files:**
- `api/src/users/users.controller.ts`

---

## Profiles

### Profiles (`/profiles`)

- `GET /profiles/organization/:id` - Get organization profile
- `GET /profiles/educator/:id` - Get educator profile
- `PATCH /profiles/organization/:id` - Update organization profile
- `PATCH /profiles/educator/:id` - Update educator profile

**Files:**
- `api/src/profiles/profiles.controller.ts`

---

## Dashboard

### Dashboard (`/dashboard`)

#### Foundation
- `GET /dashboard/foundation/quick-stats` - Foundation quick stats
- `GET /dashboard/foundation/activities` - Recent activities
- `GET /dashboard/foundation/calendar` - Calendar events
- `POST /dashboard/foundation/calendar` - Create calendar event
- `DELETE /dashboard/foundation/calendar/:eventId` - Delete calendar event
- `GET /dashboard/foundation/weather` - Weather information
- `GET /leads/parent-leads` - Get all parent leads (use to calculate statistics)
- `GET /dashboard/foundation/quick-stats` - Dashboard quick stats (includes lead counts)
- `GET /dashboard/foundation/applications/stats` - Application statistics

#### Supplier
- `GET /dashboard/supplier/stats` - Supplier statistics
- `GET /dashboard/supplier/products` - Product statistics
- `GET /dashboard/supplier/orders` - Order statistics
- `GET /dashboard/supplier/inquiries` - Inquiry statistics

#### Service Provider
- `GET /dashboard/service-provider/stats` - Service provider statistics
- `GET /dashboard/service-provider/requests` - Request statistics

#### Educator
- `GET /dashboard/educator/stats` - Educator statistics
- `GET /dashboard/educator/jobs` - Job opportunities

#### Parent
- `GET /dashboard/parent/stats` - Parent statistics
- `GET /dashboard/parent/enquiries` - Enquiry status

**Files:**
- `api/src/dashboard/dashboard.controller.ts`

---

## Marketplace

### Products (`/marketplace/products`)

- `POST /marketplace/products` - Create product (PRODUCT_SUPPLIER, ADMIN, SUPER_ADMIN)
- `GET /marketplace/products` - Get all products (with filters)
- `GET /marketplace/products/:id` - Get product by ID
- `PATCH /marketplace/products/:id` - Update product (PRODUCT_SUPPLIER, ADMIN, SUPER_ADMIN)
- `DELETE /marketplace/products/:id` - Delete product (PRODUCT_SUPPLIER, ADMIN, SUPER_ADMIN)

### Services (`/marketplace/services`)

- `POST /marketplace/services` - Create service (SERVICE_PROVIDER, ADMIN, SUPER_ADMIN)
- `GET /marketplace/services` - Get all services (with filters)
- `GET /marketplace/services/:id` - Get service by ID
- `PATCH /marketplace/services/:id` - Update service (SERVICE_PROVIDER, ADMIN, SUPER_ADMIN)
- `DELETE /marketplace/services/:id` - Delete service (SERVICE_PROVIDER, ADMIN, SUPER_ADMIN)

### Orders (`/marketplace/orders`)

- `POST /marketplace/orders` - Create order
- `GET /marketplace/orders` - Get orders
- `GET /marketplace/orders/:id` - Get order by ID
- `PATCH /marketplace/orders/:id` - Update order status

### Service Requests (`/marketplace/service-requests`)

- `POST /marketplace/service-requests` - Create service request
- `GET /marketplace/service-requests` - Get service requests
- `GET /marketplace/service-requests/:id` - Get service request by ID
- `PATCH /marketplace/service-requests/:id` - Update service request

### Catalogs (`/marketplace/catalogs`)

- `POST /marketplace/catalogs` - Upload catalog (PRODUCT_SUPPLIER)
- `GET /marketplace/catalogs` - Get catalogs
- `GET /marketplace/catalogs/:id` - Get catalog by ID
- `PATCH /marketplace/catalogs/:id` - Update catalog
- `DELETE /marketplace/catalogs/:id` - Delete catalog

### Inquiries (`/marketplace/inquiries`)

- `POST /marketplace/inquiries` - Create inquiry (FOUNDATION)
- `GET /marketplace/inquiries` - Get inquiries (filtered by role)
- `GET /marketplace/inquiries/:id` - Get inquiry by ID
- `PATCH /marketplace/inquiries/:id` - Update inquiry
- `PATCH /marketplace/inquiries/:id/status` - Update inquiry status
- `POST /marketplace/inquiries/:id/respond` - Respond to inquiry (SUPPLIER)

**Files:**
- `api/src/marketplace/marketplace.controller.ts`

---

## Recruitment

### Job Listings (`/recruitment/job-listings`)

- `POST /recruitment/job-listings` - Create job listing (FOUNDATION, ADMIN, SUPER_ADMIN)
- `GET /recruitment/job-listings` - Get job listings (with filters)
- `GET /recruitment/job-listings/:id` - Get job listing by ID
- `PATCH /recruitment/job-listings/:id` - Update job listing (FOUNDATION, ADMIN, SUPER_ADMIN)
- `DELETE /recruitment/job-listings/:id` - Delete job listing (FOUNDATION, ADMIN, SUPER_ADMIN)
- `GET /recruitment/job-listings/:id/applications` - Get applications for job (FOUNDATION, ADMIN, SUPER_ADMIN)

### Job Applications (`/recruitment/job-applications`)

- `POST /recruitment/job-applications` - Apply to job (EDUCATOR)
- `GET /recruitment/job-applications` - Get applications (filtered by role)
- `GET /recruitment/job-applications/:id` - Get application by ID
- `PATCH /recruitment/job-applications/:id` - Update application status (FOUNDATION, ADMIN, SUPER_ADMIN)
- `DELETE /recruitment/job-applications/:id` - Delete application

### Candidates (`/recruitment/candidates`)

- `GET /recruitment/candidates` - Get candidate pool (FOUNDATION, ADMIN, SUPER_ADMIN)
- `GET /recruitment/candidates/:id` - Get candidate profile

**Files:**
- `api/src/recruitment/recruitment.controller.ts`

---

## Lead Management

### Parent Leads (`/leads/parent-leads`)

- `POST /leads/parent-leads` - Create parent lead (PARENT, ADMIN, SUPER_ADMIN)
- `GET /leads/parent-leads` - Get parent leads (with filters)
- `GET /leads/parent-leads/:id` - Get parent lead by ID
- `PATCH /leads/parent-leads/:id` - Update parent lead (FOUNDATION, ADMIN, SUPER_ADMIN)
- `DELETE /leads/parent-leads/:id` - Delete parent lead (ADMIN, SUPER_ADMIN)
- `GET /leads/parent-leads/:id/matching-foundations` - Find matching foundations
- `POST /leads/parent-leads/:id/assign` - Assign lead to foundation

### Lead Responses (`/leads/responses`)

- `POST /leads/responses` - Create lead response (FOUNDATION)
- `GET /leads/responses` - Get lead responses
- `GET /leads/responses/:id` - Get response by ID
- `PATCH /leads/responses/:id` - Update response status

**Files:**
- `api/src/leads/leads.controller.ts`

---

## Messaging

### Conversations (`/messaging/conversations`)

- `POST /messaging/conversations` - Create conversation
- `GET /messaging/conversations` - Get user conversations
- `GET /messaging/conversations/:id` - Get conversation by ID
- `POST /messaging/conversations/:id/participants` - Add participant
- `DELETE /messaging/conversations/:id/participants/:userId` - Remove participant

### Messages (`/messaging/messages`)

- `POST /messaging/messages` - Create message
- `PATCH /messaging/messages/:id` - Update message
- `DELETE /messaging/messages/:id` - Delete message
- `GET /messaging/conversations/:id/messages` - Get conversation messages
- `POST /messaging/conversations/:id/read` - Mark messages as read
- `GET /messaging/unread-count` - Get unread message count

### Direct Messages (`/messaging/direct-messages`)

- `POST /messaging/direct-messages` - Create direct message (legacy support)

### Search (`/messaging/search`)

- `GET /messaging/search` - Search messages

### Recipients (`/messaging/recipients`)

- `GET /messaging/recipients` - Get available recipients (for user picker)

### Analytics (`/messaging/stats`)

- `GET /messaging/stats` - Get messaging statistics (ADMIN, SUPER_ADMIN)

**Files:**
- `api/src/messaging/messaging.controller.ts`
- `api/src/messaging/messaging.gateway.ts` (WebSocket)

---

## Support Tickets

### User Endpoints (`/support/tickets`)

- `POST /support/tickets` - Create support ticket
- `GET /support/tickets` - Get user's tickets
- `GET /support/tickets/:id` - Get ticket by ID
- `POST /support/tickets/:id/respond` - Add response to ticket

### Admin Endpoints (`/support/admin/tickets`)

- `GET /support/admin/tickets` - Get all tickets (ADMIN, SUPER_ADMIN)
- `PATCH /support/admin/tickets/:id/status` - Update ticket status (ADMIN, SUPER_ADMIN)
- `PATCH /support/admin/tickets/:id/assign` - Assign ticket (ADMIN, SUPER_ADMIN)
- `GET /support/admin/stats` - Get ticket statistics (ADMIN, SUPER_ADMIN)

**Files:**
- `api/src/support/support.controller.ts`

---

## E-Learning

### Courses (`/elearning/courses`)

- `POST /elearning/courses` - Create course
- `GET /elearning/courses` - Get courses
- `GET /elearning/courses/:id` - Get course by ID
- `PATCH /elearning/courses/:id` - Update course
- `DELETE /elearning/courses/:id` - Delete course

### Modules (`/elearning/courses/:courseId/modules`)

- `POST /elearning/courses/:courseId/modules` - Create module
- `GET /elearning/courses/:courseId/modules` - Get modules
- `PATCH /elearning/modules/:id` - Update module
- `DELETE /elearning/modules/:id` - Delete module

### Lessons (`/elearning/modules/:moduleId/lessons`)

- `POST /elearning/modules/:moduleId/lessons` - Create lesson
- `GET /elearning/modules/:moduleId/lessons` - Get lessons
- `PATCH /elearning/lessons/:id` - Update lesson
- `DELETE /elearning/lessons/:id` - Delete lesson

### Enrollments (`/elearning/enrollments`)

- `POST /elearning/enrollments` - Enroll in course
- `GET /elearning/enrollments` - Get user enrollments
- `GET /elearning/enrollments/:id` - Get enrollment by ID
- `PATCH /elearning/enrollments/:id/progress` - Update progress

### Quizzes (`/elearning/quizzes`)

- `POST /elearning/quizzes` - Create quiz
- `GET /elearning/quizzes/:id` - Get quiz by ID
- `POST /elearning/quizzes/:id/attempt` - Submit quiz attempt

### Certificates (`/elearning/certificates`)

- `GET /elearning/certificates` - Get user certificates
- `GET /elearning/certificates/:id` - Get certificate by ID

**Files:**
- `api/src/elearning/elearning.controller.ts`

---

## Content Management

### Content (`/content`)

- `GET /content` - Get content items
- `POST /content` - Create content item
- `GET /content/:id` - Get content by ID
- `PATCH /content/:id` - Update content
- `DELETE /content/:id` - Delete content

### HR Procedures (`/content/hr-procedures`)

- `GET /content/hr-procedures` - Get HR procedures
- `POST /content/hr-procedures` - Upload HR procedure

### State Policies (`/content/state-policies`)

- `GET /content/state-policies` - Get state policies
- `GET /content/state-policies/:canton` - Get policies by canton

**Files:**
- `api/src/content/content.controller.ts`
- `api/src/content-management/content-management.controller.ts`

---

## File Upload

### Upload (`/upload`)

- `POST /upload` - Upload file
- `POST /upload/presigned` - Get presigned upload URL
- `GET /upload/assets` - Get user assets
- `GET /upload/assets/:id` - Get asset by ID
- `DELETE /upload/assets/:id` - Delete asset

**Files:**
- `api/src/upload/upload.controller.ts`

---

## Subscription Management

### User Endpoints (`/subscriptions`)

- `GET /subscriptions/me` - Get current user's subscription
- `POST /subscriptions/request` - Request subscription
- `POST /subscriptions/cancel-request` - Request cancellation
- `GET /subscriptions/requests` - Get user's subscription requests
- `DELETE /subscriptions/requests/:id` - Cancel subscription request
- `GET /subscriptions/feature/:featureKey` - Check feature access
- `GET /subscriptions/plans` - Get active plans (public)
- `GET /subscriptions/plans/:id` - Get plan by ID (public)

### Admin Endpoints (`/admin/subscription-management`)

#### Plans
- `POST /admin/subscription-management/plans` - Create plan
- `GET /admin/subscription-management/plans` - Get all plans
- `GET /admin/subscription-management/plans/active` - Get active plans
- `GET /admin/subscription-management/plans/:id` - Get plan by ID
- `PUT /admin/subscription-management/plans/:id` - Update plan
- `DELETE /admin/subscription-management/plans/:id` - Delete plan

#### Subscriptions
- `POST /admin/subscription-management/subscriptions` - Create subscription
- `GET /admin/subscription-management/subscriptions` - Get all subscriptions
- `GET /admin/subscription-management/subscriptions/expiring` - Get expiring subscriptions
- `GET /admin/subscription-management/subscriptions/user/:userId` - Get user subscription
- `GET /admin/subscription-management/subscriptions/organization/:organizationId` - Get org subscription
- `GET /admin/subscription-management/subscriptions/:id` - Get subscription by ID
- `PUT /admin/subscription-management/subscriptions/:id` - Update subscription
- `DELETE /admin/subscription-management/subscriptions/:id` - Delete subscription

#### Subscription Actions
- `POST /admin/subscription-management/subscriptions/:id/activate` - Activate subscription
- `POST /admin/subscription-management/subscriptions/:id/pause` - Pause subscription
- `POST /admin/subscription-management/subscriptions/:id/resume` - Resume subscription
- `POST /admin/subscription-management/subscriptions/:id/cancel` - Cancel subscription
- `POST /admin/subscription-management/subscriptions/:id/renew` - Renew subscription
- `POST /admin/subscription-management/subscriptions/:id/extend` - Extend subscription
- `POST /admin/subscription-management/subscriptions/:id/upgrade` - Upgrade subscription
- `POST /admin/subscription-management/subscriptions/:id/downgrade` - Downgrade subscription
- `PUT /admin/subscription-management/subscriptions/:id/status` - Update status

#### Subscription Requests
- `GET /admin/subscription-management/requests` - Get all requests
- `GET /admin/subscription-management/requests/:id` - Get request by ID
- `POST /admin/subscription-management/requests/:id/review` - Review request
- `POST /admin/subscription-management/requests/:id/send-invoice` - Send invoice
- `POST /admin/subscription-management/requests/:id/confirm-payment` - Confirm payment
- `POST /admin/subscription-management/requests/:id/activate` - Activate from request
- `POST /admin/subscription-management/requests/:id/decline` - Decline request
- `POST /admin/subscription-management/requests/:id/notes` - Add note

#### Cancellation Requests
- `GET /admin/subscription-management/cancellation-requests` - Get all cancellation requests
- `POST /admin/subscription-management/cancellation-requests/:id/approve` - Approve cancellation
- `POST /admin/subscription-management/cancellation-requests/:id/decline` - Decline cancellation

**Files:**
- `api/src/subscription-management/subscription-management.controller.ts`

---

## Analytics

### Admin Analytics (`/admin/analytics`)

- `GET /admin/analytics/overview` - Dashboard overview
- `GET /admin/analytics/users` - User growth metrics
- `GET /admin/analytics/organizations` - Organization activity
- `GET /admin/analytics/products` - Product performance
- `GET /admin/analytics/jobs` - Job metrics
- `GET /admin/analytics/revenue` - Revenue metrics

### Foundation Analytics (`/analytics/foundation`)

- `GET /analytics/foundation/overview` - Foundation overview
- `GET /analytics/foundation/leads` - Lead analytics
- `GET /analytics/foundation/applications` - Application analytics

**Files:**
- `api/src/analytics/analytics.controller.ts`
- `api/src/analytics/foundation-analytics.controller.ts`

---

## Admin Management

### Admin (`/admin`)

- `GET /admin/stats` - Admin statistics
- `GET /admin/users` - User management
- `GET /admin/organizations` - Organization management

**Files:**
- `api/src/admin/admin.controller.ts`

---

## System Monitoring

### System (`/admin/system-monitoring`)

- `GET /admin/system-monitoring/health` - System health
- `GET /admin/system-monitoring/metrics` - System metrics
- `GET /admin/system-monitoring/alerts` - System alerts
- `GET /admin/system-monitoring/logs` - System logs

**Files:**
- `api/src/system-monitoring/system-monitoring.controller.ts`

---

## Partners

### Partners (`/partners`)

- `GET /partners` - Get all partners
- `GET /partners/:id` - Get partner by ID
- `POST /partners` - Create partner (ADMIN, SUPER_ADMIN)
- `PATCH /partners/:id` - Update partner (ADMIN, SUPER_ADMIN)
- `DELETE /partners/:id` - Delete partner (ADMIN, SUPER_ADMIN)

**Files:**
- `api/src/partners/partners.controller.ts`

---

## Health & Status

### Health (`/health`, `/healthz`)

- `GET /health` - Health check (public)
- `GET /healthz` - Health check (public)

**Files:**
- `api/src/app.controller.ts`

---

## Webhooks

### Clerk Webhook (`/webhooks/clerk`)

- `POST /webhooks/clerk` - Clerk webhook handler (public, verified via Svix)

**Files:**
- `api/src/webhooks/clerk-webhook.controller.ts`

---

## Notes

- All endpoints require authentication unless marked as "public"
- Role requirements are enforced via `@Roles()` decorator
- Subscription-gated features check subscription status
- Most endpoints return wrapped responses: `{ success: boolean, data: any, message?: string }`
- WebSocket endpoints available for real-time messaging
- File uploads use Cloudflare R2 storage
- All timestamps are in ISO 8601 format

