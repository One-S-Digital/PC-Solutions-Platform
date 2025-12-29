# Service Provider User Guide

Complete guide for service providers (IT, legal, accounting, training, etc.) using the ProCrèche Solutions platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Subscription Requirements](#subscription-requirements)
3. [Dashboard](#dashboard)
4. [Service Management](#service-management)
5. [Service Request Management](#service-request-management)
6. [Organization Profile](#organization-profile)
7. [Analytics](#analytics)
8. [Support](#support)

---

## Overview

Service providers can list services, manage service requests, schedule appointments, and track performance.

**Subscription Required:** Yes - Service providers must have an active subscription.

**Available Plans:**
- **Service Provider Plan** - Full access to service management, requests, and analytics

---

## Subscription Requirements

Service providers require an active subscription to access:
- Dashboard
- Service listings
- Service request management
- Analytics

**Always Available:**
- Settings
- Profile management
- Support tickets

---

## Dashboard

### Accessing Dashboard

Navigate to `/service-provider/dashboard`.

**File Reference:**
- `frontend/pages/service-provider/ServiceProviderDashboardPage.tsx`

### Dashboard Features

- Service request statistics
- Request trends
- Performance metrics

**API Endpoint:**
- `GET /dashboard/service-provider/stats`

**File Reference:**
- `api/src/dashboard/dashboard.controller.ts`

---

## Service Management

### Accessing Service Listings

Navigate to `/service-provider/service-listings`.

**File Reference:**
- `frontend/pages/service-provider/ServiceProviderListingsPage.tsx`

### Creating Services

1. Go to **Service Listings**
2. Click **Create Service**
3. Fill in details:
   - Title
   - Description
   - Category (primary and additional)
   - Price
   - Price info
   - Availability
   - Delivery Type (On-site, Remote, Hybrid)
   - Tags
   - Image
4. Set active status
5. Save

**API Endpoints:**
- `POST /marketplace/services`
- `PATCH /marketplace/services/:id`
- `DELETE /marketplace/services/:id`

**File Reference:**
- `api/src/marketplace/marketplace.controller.ts`

### Service Categories

- CLEANING
- IT_SUPPORT
- MAINTENANCE
- CONSULTING
- TRAINING
- OTHER
- Custom categories (flexible tags)

---

## Service Request Management

### Accessing Service Requests

Navigate to `/service-provider/requests`.

**File Reference:**
- `frontend/pages/service-provider/ServiceProviderRequestsPage.tsx`

### Viewing Requests

1. Go to **Service Requests**
2. View all requests from foundations
3. Filter by status
4. Click request to view details

**API Endpoint:**
- `GET /marketplace/service-requests`

### Managing Requests

1. Open service request
2. Review foundation's requirements
3. Update status:
   - **PENDING** - New request
   - **ACCEPTED** - Request accepted
   - **IN_PROGRESS** - Work in progress
   - **COMPLETED** - Service completed
   - **CANCELLED** - Request cancelled
4. Add notes
5. Schedule appointments (if applicable)
6. Save

**API Endpoint:**
- `PATCH /marketplace/service-requests/:id`

### Booking Links

Configure booking links (e.g., Calendly, Cal.com) in your service provider settings.

**File Reference:**
- `frontend/pages/ServiceProviderSettingsPage.tsx`

---

## Organization Profile

### Accessing Profile

Navigate to `/service-provider/organisation-profile`.

**File Reference:**
- `frontend/pages/service-provider/ServiceProviderOrganisationProfilePage.tsx`

### Editing Profile

1. Edit organization information
2. Set service categories
3. Configure delivery types
4. Add booking link
5. Upload logo and cover image
6. Save

**API Endpoint:**
- `PATCH /profiles/organization/:id`

---

## Analytics

### Accessing Analytics

Navigate to `/service-provider/analytics`.

**File Reference:**
- `frontend/pages/service-provider/ServiceProviderAnalyticsPage.tsx`

### Available Metrics

- Service request statistics
- Request trends
- Performance metrics
- Customer insights

**API Endpoint:**
- `GET /dashboard/service-provider/stats`

---

## Support

### Creating Support Tickets

Navigate to `/service-provider/support`.

**File Reference:**
- `frontend/pages/service-provider/ServiceProviderSupportPage.tsx`

---

## Under the Hood

### API Endpoints

**Services:**
- `POST /marketplace/services`
- `GET /marketplace/services`
- `PATCH /marketplace/services/:id`

**Service Requests:**
- `GET /marketplace/service-requests`
- `PATCH /marketplace/service-requests/:id`

**Files:**
- `api/src/marketplace/marketplace.controller.ts`

### Database Models

**Key Models:**
- `Organization` - Service provider organization
- `ServiceProvider` - Service provider details
- `Service` - Service listings
- `ServiceRequest` - Service requests from foundations

**File Reference:**
- `api/prisma/schema.prisma`

---

## Next Steps

- Review [Common Features](./8-common-features-all-users.md)
- Check [Billing & Subscriptions](./9-billing-and-subscriptions.md)

