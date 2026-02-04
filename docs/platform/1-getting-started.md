# Getting Started

Welcome to ProCrèche Solutions! This guide will help you set up your account and get started with the platform.

---

## Table of Contents

1. [Creating Your Account](#creating-your-account)
2. [Completing Your Profile](#completing-your-profile)
3. [Understanding Your Dashboard](#understanding-your-dashboard)
4. [Navigation Basics](#navigation-basics)
5. [Getting Help](#getting-help)

---

## Creating Your Account

### Step 1: Access the Signup Page

1. Navigate to the platform URL
2. Click **"Sign Up"** or **"Create Account"**
3. You'll be redirected to `/signup`

**File Reference:**
- `frontend/pages/SignupPage.tsx`

### Step 2: Choose Your Authentication Method

You can sign up using:

- **Email and Password** - Traditional email/password account
- **OAuth Providers** - Sign in with Google or other providers (if configured)

**Note:** The platform uses Clerk for authentication. Your account is created in Clerk first, then synced to the platform database.

**File Reference:**
- `api/src/webhooks/clerk-webhook.controller.ts` - Handles user sync

### Step 3: Verify Your Email

1. Check your email inbox
2. Click the verification link
3. You'll be redirected back to the platform

---

## Completing Your Profile

After signing up, you must complete your profile to access platform features.

### What Happens After Signup

1. **Account Created** - Your account is created in Clerk
2. **Webhook Processing** - A webhook syncs your account to the platform database
3. **Profile Completion Required** - If the webhook hasn't processed yet, you'll see a profile completion screen

### Profile Completion Screen

If you see a message like "Welcome! Please complete your profile":

1. Click **"Complete Your Profile"**
2. You'll be redirected to `/signup` with profile completion form

**File Reference:**
- `frontend/App.tsx` - ProtectedLayout handles pending users
- `api/src/users/users.controller.ts` - `POST /users/complete-profile`

### Required Information

The information you need to provide depends on your role:

#### For Foundations (Daycares)
- Organization name
- Organization type (Foundation)
- Contact information
- Region/Canton
- Languages offered
- Capacity (number of children)
- Pedagogy approaches

#### For Product Suppliers
- Organization name
- Organization type (Product Supplier)
- Contact information
- Product categories
- VAT number
- Regions served

#### For Service Providers
- Organization name
- Organization type (Service Provider)
- Contact information
- Service categories
- Delivery type (On-site, Remote, Hybrid)
- Regions served

#### For Educators
- First name, Last name
- Phone number
- Work experience
- Education
- Certifications
- Skills
- Availability
- CV upload (optional)

#### For Parents
- First name, Last name
- Phone number (optional)
- Contact preferences

### Completing Your Profile

1. Fill in all required fields
2. Upload any required documents (CV, logo, etc.)
3. Click **"Complete Profile"**
4. Your role will be assigned
5. You'll be redirected to your role-specific dashboard

**File Reference:**
- `frontend/pages/SignupPage.tsx`

---

## Understanding Your Dashboard

After completing your profile, you'll be redirected to your role-specific dashboard.

### Dashboard Access

- **Foundations:** `/foundation/dashboard`
- **Product Suppliers:** `/supplier/dashboard`
- **Service Providers:** `/service-provider/dashboard`
- **Educators:** `/educator/dashboard`
- **Parents:** `/parent/dashboard`
- **Admins:** `/admin/content-dashboard` (admin dashboard)

**File Reference:**
- `frontend/App.tsx` - RoleBasedDashboardRedirect component

### Dashboard Features

Your dashboard shows:

- **Quick Stats** - Key metrics for your role
- **Recent Activities** - Latest actions and updates
- **Calendar Events** - Upcoming events (Foundations)
- **Notifications** - Important alerts

**File Reference:**
- `frontend/pages/*/DashboardPage.tsx`

---

## Navigation Basics

### Main Navigation Menu

The main navigation includes:

- **Dashboard** - Your role-specific dashboard
- **Marketplace** - Products and services (if applicable)
- **Recruitment** - Job listings and candidates (Foundations)
- **Messages** - Messaging system
- **Settings** - Account and profile settings
- **Support** - Support tickets

### Role-Specific Navigation

#### Foundations
- Dashboard
- Orders & Appointments
- Leads (Parent leads)
- Analytics
- Organization Profile
- Support

#### Product Suppliers
- Dashboard
- Orders
- Product Listings
- Analytics
- Organization Profile
- Support

#### Service Providers
- Dashboard
- Service Requests
- Service Listings
- Analytics
- Organization Profile
- Support

#### Educators
- Dashboard
- Job Board
- Applications
- Profile
- Support

#### Parents
- Dashboard
- Enquiries
- Support

### Profile Menu

Click your profile icon to access:

- **Profile** - View/edit your profile
- **Settings** - Account settings
- **Notifications** - Notification center
- **Sign Out** - Log out of the platform

---

## Getting Help

### Support Tickets

You can create support tickets for:

- Technical issues
- Billing questions
- Feature requests
- General inquiries

**How to Create a Support Ticket:**

1. Navigate to **Support** in the main menu
2. Click **"Create Ticket"**
3. Fill in the form:
   - Subject
   - Category (GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST)
   - Priority (LOW, MEDIUM, HIGH, URGENT)
   - Message
   - Attachments (optional)
4. Click **"Submit"**

**API Endpoint:**
- `POST /support/tickets`

**File Reference:**
- `api/src/support/support.controller.ts`
- `frontend/pages/*/SupportPage.tsx`

### Documentation

- Check the [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md) guide
- Review your role-specific guide for detailed instructions

### Contact Information

Support contact information is available in the Support section of the platform.

---

## Next Steps

1. **Complete Your Profile** - Ensure all information is up to date
2. **Read Your Role Guide** - Check your role-specific guide for detailed instructions
3. **Explore Features** - Familiarize yourself with available features
4. **Set Up Subscription** - If your role requires a subscription, review [Billing & Subscriptions](./9-billing-and-subscriptions.md)

---

## Under the Hood

### Authentication Flow

1. User signs up via Clerk (`/signup`)
2. Clerk creates user account
3. Webhook (`/webhooks/clerk`) syncs user to platform database
4. User completes profile (`POST /users/complete-profile`)
5. Role is assigned
6. User gains access to role-specific features

**Files:**
- `api/src/webhooks/clerk-webhook.controller.ts` - Webhook handler
- `api/src/users/users.controller.ts` - Profile completion
- `frontend/App.tsx` - Route protection and redirects

### Pending User Handling

If a user signs up but the webhook hasn't processed yet:

- User has `PENDING` role status
- Can only access routes marked with `@AllowPending()`
- Redirected to profile completion page
- Cannot access protected features until role is assigned

**Files:**
- `api/src/auth/guards/clerk-auth.guard.ts` - Pending user context
- `api/src/auth/decorators/allow-pending.decorator.ts` - Allow pending decorator

---

## Common Issues

### "Profile Not Complete" Message

**Solution:** Complete your profile by providing all required information.

### "Access Denied" Error

**Solution:** Ensure your role is correctly assigned. Contact support if the issue persists.

### Cannot Access Dashboard

**Solution:** 
1. Verify you've completed your profile
2. Check that your role is assigned
3. Clear browser cache and try again
4. Contact support if the issue persists

For more troubleshooting, see [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md).

---

**Next:** Read your role-specific guide:
- [Foundation Guide](./2-foundation-daycare-guide.md)
- [Product Supplier Guide](./3-product-supplier-guide.md)
- [Service Provider Guide](./4-service-provider-guide.md)
- [Educator Guide](./5-educator-candidate-guide.md)
- [Parent Guide](./6-parent-guide.md)

