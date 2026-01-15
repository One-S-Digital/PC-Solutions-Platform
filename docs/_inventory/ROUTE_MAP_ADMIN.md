# Admin Dashboard Route Map

Complete mapping of all routes in the admin dashboard application (`admin/src/App.tsx`).

**Last Updated:** Based on codebase analysis

---

## Public Routes

### `/login`
- **Component:** `AdminLoginPage`
- **Auth:** Not required
- **Description:** Admin login page

### `/signup`
- **Component:** `AdminSignupPage`
- **Auth:** Not required
- **Description:** Admin signup page

### `/access-denied`
- **Component:** `AccessDeniedPage`
- **Auth:** Not required
- **Description:** Access denied page

---

## Protected Routes (Require Admin Authentication)

All routes below require `ADMIN` or `SUPER_ADMIN` role and are wrapped in `AdminProtectedRoute`.

### `/dashboard`
- **Component:** `Dashboard`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Admin dashboard with overview statistics

### `/users`
- **Component:** `UsersPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** User management (view, edit, manage roles)

### `/organizations`
- **Component:** `OrganizationsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Organization management

### `/partners`
- **Component:** `PartnersPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Partner management

### `/products`
- **Component:** `ProductsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Product management and moderation

### `/services`
- **Component:** `ServicesPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Service management and moderation

### `/job-listings`
- **Component:** `JobListingsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Job listing management

### `/candidates`
- **Component:** `CandidatesPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Candidate pool management

### `/parent-leads`
- **Component:** `ParentLeadsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Parent lead management

### `/orders`
- **Component:** `OrdersPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Order management

### `/content`
- **Component:** `ContentPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Content management (HR documents, policies, etc.)

### `/messaging`
- **Component:** `MessagingPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Messaging system overview

### `/support`
- **Component:** `SupportPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Support ticket management

### `/cantons`
- **Component:** `CantonsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Canton management (for policy crawler)

### `/cantons/:code`
- **Component:** `CantonDetailPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Canton detail and source management

### `/policies/review`
- **Component:** `PolicyReviewPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Policy review and approval

### `/discount-terminations`
- **Component:** `DiscountTerminationsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Discount termination workflow management

### `/subscriptions`
- **Component:** `SubscriptionsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Subscription management

### `/system`
- **Component:** `SystemMonitorPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** System monitoring and health checks

### `/translations`
- **Component:** `TranslationsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Translation management

### `/settings`
- **Component:** `SettingsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Platform settings

### `/design-system`
- **Component:** `DesignSystemPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Design system reference

---

## Route Protection

### AdminProtectedRoute Component
- Wraps all admin routes
- Requires authentication via Clerk
- Requires `ADMIN` or `SUPER_ADMIN` role
- Redirects to `/access-denied` if unauthorized
- Redirects to `/login` if not authenticated

**Files:**
- `admin/src/components/auth/AdminAuthComponents.tsx`

---

## AdminLayout Component

All protected routes are rendered within `AdminLayout` which provides:
- Sidebar navigation
- Header with user info
- Main content area
- Footer

**Files:**
- `admin/src/components/AdminLayout.tsx`

---

## Default Route

### `/` (index)
- **Redirects to:** `/dashboard`
- **Auth:** Required
- **Description:** Default route redirects to dashboard

---

## Catch-All Route

### `*` (any unmatched route)
- **Redirects to:** `/dashboard`
- **Auth:** Required
- **Description:** Catch-all for SPA routing

---

## Notes

- All admin routes require authentication and admin role
- Admin dashboard is separate from main frontend application
- Uses React Router v6 for routing
- QueryClientProvider wraps all routes for React Query
- FrontendSettingsManager updates favicon and title based on admin settings
- All routes are client-side rendered (SPA)

