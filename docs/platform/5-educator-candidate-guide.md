# Educator (Candidate) User Guide

Complete guide for educator candidates using the ProCrèche Solutions platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Dashboard](#dashboard)
3. [Job Board](#job-board)
4. [Applications](#applications)
5. [Profile Management](#profile-management)
6. [Support](#support)

---

## Overview

Educators can browse job listings, apply to positions, manage applications, and maintain their professional profile.

**Subscription Required:** No - Educators have free access to the platform.

---

## Dashboard

### Accessing Dashboard

Navigate to `/educator/dashboard`.

**File Reference:**
- `frontend/pages/educator/EducatorDashboardPage.tsx`

### Dashboard Features

- Applications sent
- Interviews scheduled
- Job offers received
- Profile completion status
- Skills and certifications

---

## Job Board

### Accessing Job Board

Navigate to `/educator/job-board` or click **Job Board** in the menu.

**File Reference:**
- `frontend/pages/educator/EducatorJobBoardPage.tsx`

### Browsing Jobs

1. Go to **Job Board**
2. Browse published job listings
3. Filter by:
   - Location
   - Contract type
   - Search term
4. Click job to view details

### Job Details

View:
- Job title and description
- Requirements
- Benefits
- Responsibilities
- Qualifications
- Location
- Salary/Salary range
- Contract type
- Foundation information
- Start date

### Contract Types

- FULL_TIME
- PART_TIME
- CDI (Indefinite contract)
- CDD (Fixed-term contract)
- INTERNSHIP
- REPLACEMENT
- TEMPORARY
- FREELANCE

---

## Applications

### Accessing Applications

Navigate to `/educator/applications` or click **Applications** in the menu.

**File Reference:**
- `frontend/pages/educator/EducatorApplicationsPage.tsx`

### Applying to Jobs

1. Browse job board
2. Click job listing
3. Click **Apply**
4. Fill in application:
   - Cover letter (optional)
   - Upload CV (optional, or use existing CV)
5. Submit application

### Application Status

- **PENDING** - Application submitted, awaiting review
- **REVIEWED** - Under consideration
- **ACCEPTED** - Offer extended
- **REJECTED** - Not selected

### Tracking Applications

1. Go to **Applications**
2. View all your applications
3. See status for each
4. View application details
5. Withdraw application (if needed)

---

## Profile Management

### Accessing Profile

Navigate to `/educator/profile` or go to **Settings** → **Profile**.

**File Reference:**
- `frontend/pages/educator/EducatorProfilePage.tsx`

### Editing Profile

1. Go to **Profile**
2. Edit information:
   - First name, Last name
   - Phone number
   - Short bio
   - Work experience
   - Education
   - Certifications (array)
   - Skills (array)
   - Availability (text or structured schedule)
   - CV upload
3. Upload/update:
   - Avatar
   - Cover image
4. Save

### Public Profile

Your profile is visible to:
- Foundations viewing job applications
- Foundations browsing candidate pool

**File Reference:**
- `frontend/pages/profile/EducatorProfileViewPage.tsx`

---

## Support

### Creating Support Tickets

Navigate to `/educator/support`.

**File Reference:**
- `frontend/pages/educator/EducatorSupportPage.tsx`

---

## Under the Hood

### Database Models

**Key Models:**
- `User` - Educator profile
- `JobListing` - Job postings
- `JobApplication` - Applications submitted

**File Reference:**
- `api/prisma/schema.prisma`

---

## Next Steps

- Review [Common Features](./8-common-features-all-users.md)
- See [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md)

