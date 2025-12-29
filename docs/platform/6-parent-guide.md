# Parent User Guide

Complete guide for parents using the ProCrèche Solutions platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Dashboard](#dashboard)
3. [Submitting a Lead](#submitting-a-lead)
4. [Tracking Enquiries](#tracking-enquiries)
5. [Support](#support)

---

## Overview

Parents can submit leads to find childcare, track enquiry status, and communicate with daycares.

**Subscription Required:** No - Parents have free access.

---

## Dashboard

### Accessing Dashboard

Navigate to `/parent/dashboard`.

**File Reference:**
- `frontend/pages/parent/ParentDashboardPage.tsx`

### Dashboard Features

- Enquiry status
- Lead submission history
- Recent activity

**API Endpoint:**
- `GET /dashboard/parent/stats`

**File Reference:**
- `api/src/dashboard/dashboard.controller.ts`

---

## Submitting a Lead

### Public Lead Form

1. Navigate to `/parent-lead-form` (public, no login required)
2. Fill in form:
   - Parent name
   - Parent email
   - Parent phone (optional)
   - Child name
   - Child age
   - Preferred location
   - Preferred languages (array)
   - Special requirements (optional)
   - Message (optional)
3. Submit lead

**File Reference:**
- `frontend/pages/ParentLeadFormPage.tsx`

### Authenticated Lead Submission

1. Log in to your account
2. Go to **Dashboard** → **Submit Lead**
3. Fill in lead form
4. Submit

**API Endpoint:**
- `POST /leads/parent-leads`

**File Reference:**
- `api/src/leads/leads.controller.ts`

---

## Tracking Enquiries

### Accessing Enquiries

Navigate to `/parent/enquiries` or click **Enquiries** in the menu.

**File Reference:**
- `frontend/pages/parent/ParentEnquiriesPage.tsx`

### Viewing Enquiry Status

1. Go to **Enquiries**
2. View all your submitted leads
3. See status for each:
   - **NEW** - Just submitted
   - **ASSIGNED** - Assigned to foundation
   - **RESPONDED** - Foundation responded
   - **ENROLLED** - Child enrolled
4. View foundation responses

**API Endpoint:**
- `GET /leads/parent-leads` (your leads)

### Foundation Responses

When foundations respond to your lead, you'll see:
- Response status (INTERESTED, NOT_INTERESTED, NEEDS_MORE_INFO, ENROLLED)
- Foundation message
- Foundation contact information

---

## Support

### Creating Support Tickets

Navigate to `/parent/support`.

**File Reference:**
- `frontend/pages/parent/ParentSupportPage.tsx`

---

## Under the Hood

### API Endpoints

**Leads:**
- `POST /leads/parent-leads`
- `GET /leads/parent-leads` (your leads)
- `GET /leads/parent-leads/:id`

**Files:**
- `api/src/leads/leads.controller.ts`

### Database Models

**Key Models:**
- `ParentLead` - Lead submissions
- `FoundationLeadResponse` - Foundation responses

**File Reference:**
- `api/prisma/schema.prisma`

---

## Next Steps

- Review [Common Features](./8-common-features-all-users.md)
- See [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md)

