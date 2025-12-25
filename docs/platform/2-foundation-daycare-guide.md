# Foundation (Daycare) User Guide

Complete guide for daycare organizations (Foundations) using the ProCrèche Solutions platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Subscription Requirements](#subscription-requirements)
3. [Dashboard](#dashboard)
4. [Marketplace](#marketplace)
5. [Recruitment](#recruitment)
6. [Lead Management](#lead-management)
7. [E-Learning](#e-learning)
8. [HR Procedures & State Policies](#hr-procedures--state-policies)
9. [Calendar & Events](#calendar--events)
10. [Organization Profile](#organization-profile)
11. [Analytics](#analytics)
12. [Support](#support)

---

## Overview

Foundations (daycare organizations) have access to a comprehensive platform for managing operations, recruiting staff, sourcing products and services, and managing parent leads.

**Subscription Required:** Yes - Foundations must have an active subscription to access most features.

**Available Plans:**
- **BASIC** - Marketplace and State Policies
- **ESSENTIAL** - + Parent Leads (limited), HR Documents
- **PROFESSIONAL** - + Unlimited Leads, Recruitment, E-Learning, Analytics
- **ENTERPRISE** - Custom features

---

## Subscription Requirements

### Subscription Status

Foundations require an active subscription to access:
- Dashboard
- Marketplace
- Recruitment (Professional+)
- Lead Management (Essential+)
- E-Learning (Professional+)
- Analytics (Professional+)

**Always Available (No Subscription Required):**
- Settings
- Profile management
- Support tickets

### Checking Subscription Status

1. Navigate to **Settings** → **Billing & Subscription**
2. View your current plan and status
3. See subscription expiry date
4. Request subscription changes if needed

**API Endpoint:**
- `GET /subscriptions/me`

**File Reference:**
- `frontend/components/shared/SubscriptionPaywall.tsx`
- `api/src/subscription-management/subscription-management.controller.ts`

---

## Dashboard

### Accessing Your Dashboard

Navigate to `/foundation/dashboard` or click **Dashboard** in the main menu.

**File Reference:**
- `frontend/pages/foundation/FoundationDashboardPage.tsx`

### Dashboard Features

#### Quick Stats

The dashboard displays key metrics:

- **Total Job Listings** - Number of published job listings
- **Pending Applications** - Applications awaiting review
- **Total Applications** - All applications received
- **Total Orders** - Orders placed
- **Total Service Requests** - Service requests made
- **Active Job Listings** - Currently published jobs

**API Endpoint:**
- `GET /dashboard/foundation/quick-stats`

**File Reference:**
- `api/src/dashboard/dashboard.controller.ts`

#### Recent Activities

View your latest activities:

- New parent leads
- Job applications
- Orders
- Service requests
- Messages
- Job listings

**API Endpoint:**
- `GET /dashboard/foundation/activities?limit=10`

#### Calendar Events

View and manage calendar events:

- Upcoming appointments
- Interviews
- Service appointments
- Meetings
- Reminders

**API Endpoints:**
- `GET /dashboard/foundation/calendar?date=YYYY-MM-DD`
- `POST /dashboard/foundation/calendar` - Create event
- `DELETE /dashboard/foundation/calendar/:eventId` - Delete event

**File Reference:**
- `api/src/dashboard/dashboard.controller.ts`

#### Weather Information

View current weather for your location (if configured).

**API Endpoint:**
- `GET /dashboard/foundation/weather`

---

## Marketplace

### Accessing the Marketplace

Navigate to `/marketplace` or click **Marketplace** in the main menu.

**File Reference:**
- `frontend/pages/MarketplacePage.tsx`

### Browsing Products

1. Go to **Marketplace** → **Products**
2. Use filters:
   - Category
   - Supplier
   - Search term
3. Click a product to view details
4. Add to cart or place order

**API Endpoints:**
- `GET /marketplace/products` - List products
- `GET /marketplace/products/:id` - Product details

**File Reference:**
- `api/src/marketplace/marketplace.controller.ts`

### Browsing Services

1. Go to **Marketplace** → **Services**
2. Use filters:
   - Category
   - Service Provider
   - Search term
3. Click a service to view details
4. Request service

**API Endpoints:**
- `GET /marketplace/services` - List services
- `GET /marketplace/services/:id` - Service details

### Placing Orders

1. Browse products in the marketplace
2. Add products to cart
3. Review cart
4. Place order
5. Track order status

**API Endpoints:**
- `POST /marketplace/orders` - Create order
- `GET /marketplace/orders` - List orders
- `GET /marketplace/orders/:id` - Order details

**File Reference:**
- `frontend/contexts/CartContext.tsx`

### Requesting Services

1. Browse services in the marketplace
2. Click **Request Service**
3. Fill in service request details
4. Submit request
5. Track request status

**API Endpoints:**
- `POST /marketplace/service-requests` - Create service request
- `GET /marketplace/service-requests` - List requests
- `PATCH /marketplace/service-requests/:id` - Update request

### Sending Inquiries

For suppliers who don't sell directly on the platform:

1. Find supplier in marketplace
2. Click **Send Inquiry**
3. Fill in inquiry form:
   - Subject
   - Message
   - Product interest (optional)
   - Quantity (optional)
   - Budget (optional)
   - Urgency
   - Contact preferences
4. Submit inquiry
5. Track inquiry status

**API Endpoints:**
- `POST /marketplace/inquiries` - Create inquiry
- `GET /marketplace/inquiries` - List inquiries
- `PATCH /marketplace/inquiries/:id/status` - Update status

**Inquiry Status:**
- NEW - Just created
- PENDING - Awaiting supplier response
- CONTACTED - Supplier has responded
- QUOTED - Supplier provided quote
- FULFILLED - Inquiry completed
- DECLINED - Supplier declined
- CANCELLED - Inquiry cancelled

**File Reference:**
- `api/src/marketplace/inquiry.service.ts`

---

## Recruitment

### Subscription Requirement

Recruitment features require **PROFESSIONAL** or **ENTERPRISE** subscription tier.

### Accessing Recruitment

Navigate to `/recruitment` or click **Recruitment** in the main menu.

**File Reference:**
- `frontend/pages/RecruitmentPage.tsx`

### Creating Job Listings

1. Go to **Recruitment** → **Job Listings**
2. Click **Create Job Listing**
3. Fill in job details:
   - Title
   - Description
   - Requirements (array)
   - Benefits (array)
   - Responsibilities (array)
   - Qualifications (array)
   - Location
   - Salary/Salary Range
   - Contract Type (FULL_TIME, PART_TIME, CDI, CDD, INTERNSHIP, REPLACEMENT, TEMPORARY, FREELANCE)
   - Start Date
4. Set status:
   - **DRAFT** - Not visible to candidates
   - **PUBLISHED** - Visible on job board
5. Click **Save**

**API Endpoints:**
- `POST /recruitment/job-listings` - Create listing
- `PATCH /recruitment/job-listings/:id` - Update listing
- `DELETE /recruitment/job-listings/:id` - Delete listing

**File Reference:**
- `api/src/recruitment/recruitment.controller.ts`

### Managing Job Listings

1. Go to **Recruitment** → **Job Listings**
2. View all listings with status filters
3. Click a listing to view details
4. Edit or delete as needed
5. Change status (DRAFT → PUBLISHED → CLOSED → FILLED)

**Job Status:**
- **DRAFT** - Not published
- **PUBLISHED** - Visible to candidates
- **CLOSED** - No longer accepting applications
- **FILLED** - Position filled

**API Endpoint:**
- `GET /recruitment/job-listings` - List all listings

### Viewing Applications

1. Go to **Recruitment** → **Job Listings**
2. Click a job listing
3. View applications for that job
4. Or go to **Recruitment** → **Candidate Pool** to view all candidates

**API Endpoints:**
- `GET /recruitment/job-listings/:id/applications` - Applications for job
- `GET /recruitment/job-applications` - All applications

### Managing Applications

1. View application details:
   - Candidate profile
   - Cover letter
   - CV
   - Application date
2. Update application status:
   - **PENDING** - Awaiting review
   - **REVIEWED** - Under consideration
   - **ACCEPTED** - Offer extended
   - **REJECTED** - Not selected
3. Add notes (internal)

**API Endpoint:**
- `PATCH /recruitment/job-applications/:id` - Update status

### Candidate Pool

View all candidates who have applied:

1. Go to **Recruitment** → **Candidate Pool**
2. Browse candidate profiles
3. Search and filter candidates
4. View candidate details
5. Contact candidates via messaging

**API Endpoint:**
- `GET /recruitment/candidates` - List candidates
- `GET /recruitment/candidates/:id` - Candidate profile

**File Reference:**
- `frontend/pages/candidate/CandidateProfilePage.tsx`

---

## Lead Management

### Subscription Requirement

Lead management requires **ESSENTIAL** or higher subscription tier.

- **ESSENTIAL:** Limited parent leads (e.g., 15 per month)
- **PROFESSIONAL+:** Unlimited parent leads

### Accessing Leads

Navigate to `/foundation/leads` or click **Leads** in the foundation menu.

**File Reference:**
- `frontend/pages/foundation/FoundationLeadsPage.tsx`

### Viewing Parent Leads

1. Go to **Leads** in the foundation menu
2. View all assigned leads
3. Filter by:
   - Status
   - Location
   - Child age
   - Search term
4. Click a lead to view details

**API Endpoints:**
- `GET /leads/parent-leads` - List leads
- `GET /leads/parent-leads/:id` - Lead details

**File Reference:**
- `api/src/leads/leads.controller.ts`

### Responding to Leads

1. Open a parent lead
2. Review lead information:
   - Parent name, email, phone
   - Child name, age
   - Preferred location
   - Preferred languages
   - Special requirements
   - Message
3. Click **Respond**
4. Choose response status:
   - **INTERESTED** - Foundation is interested
   - **NOT_INTERESTED** - Not a fit
   - **NEEDS_MORE_INFO** - Need more information
   - **ENROLLED** - Child enrolled
5. Add message (optional)
6. Submit response

**API Endpoint:**
- `POST /leads/parent-leads/:id/respond` - Create response

**Lead Response Status:**
- **INTERESTED** - Foundation wants to proceed
- **NOT_INTERESTED** - Not interested
- **NEEDS_MORE_INFO** - Requires more information
- **ENROLLED** - Child successfully enrolled

### Lead Statistics

View lead statistics on the dashboard:

- Total leads
- Leads by status
- Response rate
- Enrollment rate

**Note:** Lead statistics are calculated from lead data. Use the lead management endpoints to retrieve lead data and calculate statistics client-side, or view statistics on the dashboard which aggregates this information.

**API Endpoints:**
- `GET /leads/parent-leads` - Get all leads (use to calculate statistics)
- `GET /dashboard/foundation/quick-stats` - Dashboard quick stats (includes lead counts)

---

## E-Learning

### Subscription Requirement

E-Learning requires **PROFESSIONAL** or **ENTERPRISE** subscription tier.

### Accessing E-Learning

Navigate to `/e-learning` or click **E-Learning** in the main menu.

**File Reference:**
- `frontend/pages/ELearningPage.tsx`

### Browsing Courses

1. Go to **E-Learning**
2. Browse available courses
3. Filter by:
   - Category
   - Difficulty level
   - Search term
4. View course details:
   - Description
   - Duration
   - Modules and lessons
   - Prerequisites

**API Endpoints:**
- `GET /elearning/courses` - List courses
- `GET /elearning/courses/:id` - Course details

**File Reference:**
- `api/src/elearning/elearning.controller.ts`

### Enrolling in Courses

1. Browse courses
2. Click a course to view details
3. Click **Enroll**
4. Start learning

**API Endpoint:**
- `POST /elearning/courses/:id/enroll` - Enroll in course

### Taking Courses

1. Open enrolled course
2. Navigate through modules
3. Complete lessons:
   - Watch videos
   - Read documents
   - Complete quizzes
4. Track progress
5. Earn certificate upon completion

**API Endpoints:**
- `GET /elearning/my-enrollments` - Your enrollments
- `POST /elearning/lessons/:id/progress` - Update lesson progress

### Course Content Types

- **VIDEO** - Video lessons
- **DOCUMENT** - PDF or document content
- **QUIZ** - Assessment quizzes
- **TEXT** - Text-based content
- **IMAGE** - Image content

### Quizzes

1. Complete lesson quizzes
2. Answer questions:
   - Multiple choice
   - True/False
   - Essay
   - Matching
3. Submit quiz
4. View results and passing score

**API Endpoint:**
- `POST /elearning/quizzes/:id/attempt` - Submit quiz attempt

### Certificates

Upon course completion:

1. Certificate is automatically generated
2. View certificate in your profile
3. Download certificate PDF
4. Share verification code

**API Endpoints:**
- `GET /elearning/certificates` - Your certificates
- `GET /elearning/certificates/:id` - Certificate details

---

## HR Procedures & State Policies

### HR Procedures

Access HR document library:

1. Navigate to `/hr-procedures` or click **HR Procedures** in the main menu
2. Browse documents by category
3. Search documents
4. View and download documents
5. Track document versions

**File Reference:**
- `frontend/pages/HRProceduresPage.tsx`

**Note:** HR Procedures access requires **ESSENTIAL** or higher subscription tier.

### State Policies

Access state policies by canton:

1. Navigate to `/state-policies` or click **State Policies** in the main menu
2. Select canton/region
3. Browse policies:
   - Regulations
   - Guidelines
   - Standards
   - Directives
   - Laws
4. View policy details
5. Download policy documents
6. Track policy changes

**File Reference:**
- `frontend/pages/StatePoliciesPage.tsx`

**Policy Types:**
- Regulation
- Guideline
- Standard
- Directive
- Law

**Policy Status:**
- Critical policies are highlighted
- Expiration dates shown
- External links to official sources

**Note:** State Policies are available to all subscription tiers.

---

## Calendar & Events

### Viewing Calendar

1. Go to your **Dashboard**
2. View calendar events section
3. Or navigate to calendar view
4. Filter by date

**API Endpoint:**
- `GET /dashboard/foundation/calendar?date=YYYY-MM-DD`

### Creating Events

1. Go to **Dashboard** → Calendar section
2. Click **Create Event**
3. Fill in event details:
   - Title
   - Description
   - Event Type (appointment, interview, service, meeting, reminder, custom)
   - Start Time
   - End Time (optional)
   - All Day (checkbox)
   - Location (optional)
   - Related Entity (optional - link to job application, service request, etc.)
4. Click **Save**

**API Endpoint:**
- `POST /dashboard/foundation/calendar`

**Event Types:**
- appointment
- interview
- service
- meeting
- reminder
- custom

### Managing Events

1. View events in calendar
2. Click event to view details
3. Edit or delete event
4. Link events to related entities (job applications, service requests, etc.)

**API Endpoint:**
- `DELETE /dashboard/foundation/calendar/:eventId`

---

## Organization Profile

### Accessing Profile

Navigate to `/foundation/organisation-profile` or go to **Settings** → **Profile**.

**File Reference:**
- `frontend/pages/foundation/FoundationOrganisationProfilePage.tsx`

### Editing Profile

1. Go to **Organization Profile**
2. Edit information:
   - Organization name
   - Description
   - Contact person
   - Phone number
   - Contact email (separate from auth email)
   - VAT number
   - Canton/Region
   - Regions served (multiple)
   - Languages offered
   - Capacity (number of children)
   - Pedagogy approaches
3. Upload/update:
   - Logo
   - Cover image
4. Click **Save**

**API Endpoint:**
- `PATCH /profiles/organization/:id`

**File Reference:**
- `api/src/profiles/profiles.controller.ts`

### Public Profile

Your organization profile is visible to:
- Parents (when browsing daycares)
- Educators (when viewing job listings)
- Other organizations

---

## Analytics

### Subscription Requirement

Analytics requires **PROFESSIONAL** or **ENTERPRISE** subscription tier.

### Accessing Analytics

Navigate to `/foundation/analytics` or click **Analytics** in the foundation menu.

**File Reference:**
- `frontend/pages/foundation/FoundationAnalyticsPage.tsx`

### Available Analytics

#### Lead Analytics
- Total leads received
- Leads by status
- Response rate
- Enrollment rate
- Leads by source

**API Endpoint:**
- `GET /analytics/foundation/leads`

#### Application Analytics
- Total applications
- Applications by status
- Applications by job listing
- Time to fill positions
- Candidate sources

**API Endpoint:**
- `GET /analytics/foundation/applications`

#### Overview Analytics
- Combined metrics
- Trends over time
- Performance indicators

**API Endpoint:**
- `GET /analytics/foundation/overview`

**File Reference:**
- `api/src/analytics/foundation-analytics.controller.ts`

---

## Support

### Creating Support Tickets

1. Navigate to `/foundation/support` or click **Support** in the menu
2. Click **Create Ticket**
3. Fill in form:
   - Subject
   - Category (GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST)
   - Priority (LOW, MEDIUM, HIGH, URGENT)
   - Message
   - Attachments (optional)
4. Submit ticket

**API Endpoint:**
- `POST /support/tickets`

**File Reference:**
- `frontend/pages/foundation/FoundationSupportPage.tsx`

### Managing Tickets

1. View all your tickets
2. Click ticket to view details
3. Add responses
4. Track ticket status:
   - **OPEN** - New ticket
   - **IN_PROGRESS** - Being worked on
   - **RESOLVED** - Issue resolved
   - **CLOSED** - Ticket closed

**API Endpoints:**
- `GET /support/tickets` - Your tickets
- `GET /support/tickets/:id` - Ticket details
- `POST /support/tickets/:id/respond` - Add response

---

## Under the Hood

### API Endpoints

**Dashboard:**
- `GET /dashboard/foundation/quick-stats`
- `GET /dashboard/foundation/activities`
- `GET /dashboard/foundation/calendar`
- `POST /dashboard/foundation/calendar`
- `DELETE /dashboard/foundation/calendar/:eventId`

**Marketplace:**
- `GET /marketplace/products`
- `GET /marketplace/services`
- `POST /marketplace/orders`
- `POST /marketplace/service-requests`
- `POST /marketplace/inquiries`

**Recruitment:**
- `POST /recruitment/job-listings`
- `GET /recruitment/job-listings`
- `GET /recruitment/job-listings/:id/applications`
- `PATCH /recruitment/job-applications/:id`

**Leads:**
- `GET /leads/parent-leads`
- `POST /leads/responses`

**E-Learning:**
- `GET /elearning/courses`
- `POST /elearning/enrollments`

**Files:**
- `api/src/dashboard/dashboard.controller.ts`
- `api/src/marketplace/marketplace.controller.ts`
- `api/src/recruitment/recruitment.controller.ts`
- `api/src/leads/leads.controller.ts`
- `api/src/elearning/elearning.controller.ts`

### Database Models

**Key Models:**
- `Organization` - Organization profile
- `JobListing` - Job postings
- `JobApplication` - Applications received
- `ParentLead` - Parent leads
- `FoundationLeadResponse` - Responses to leads
- `Order` - Product orders
- `ServiceRequest` - Service requests
- `Inquiry` - Supplier inquiries
- `CourseEnrollment` - E-Learning enrollments
- `CalendarEvent` - Calendar events

**File Reference:**
- `api/prisma/schema.prisma`

---

## Next Steps

- Review [Common Features](./8-common-features-all-users.md) for messaging, notifications, etc.
- Check [Billing & Subscriptions](./9-billing-and-subscriptions.md) for subscription management
- See [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md) for common issues

