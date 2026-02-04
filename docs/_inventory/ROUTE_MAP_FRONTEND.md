# Frontend Route Map

Complete mapping of all routes in the frontend application (`frontend/App.tsx`).

**Last Updated:** Based on codebase analysis

---

## Public Routes

### `/login`
- **Component:** `LoginPage`
- **Auth:** Not required
- **Description:** User login page

### `/signup`
- **Component:** `SignupPage`
- **Auth:** Not required
- **Description:** User signup/profile completion page

### `/partners`
- **Component:** `PublicPartnersPage`
- **Auth:** Not required
- **Description:** Public partners directory

### `/parent-lead-form`
- **Component:** `ParentLeadFormPage`
- **Auth:** Not required
- **Description:** Public form for parents to submit leads

---

## Protected Routes (Require Authentication)

### Dashboard Routes

#### `/dashboard`
- **Component:** `RoleBasedDashboardRedirect`
- **Auth:** Required
- **Description:** Redirects to role-specific dashboard
- **Redirects:**
  - `PRODUCT_SUPPLIER` → `/supplier/dashboard`
  - `SERVICE_PROVIDER` → `/service-provider/dashboard`
  - `FOUNDATION` → `/foundation/dashboard`
  - `EDUCATOR` → `/educator/dashboard`
  - `PARENT` → `/parent/dashboard`
  - `ADMIN/SUPER_ADMIN` → `/admin/content-dashboard`

#### `/dashboard/details/:detailType`
- **Component:** `DashboardDetailPage`
- **Auth:** Required
- **Description:** Dashboard detail view

---

## Foundation Routes

### `/foundation/dashboard`
- **Component:** `FoundationDashboardPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`
- **Subscription:** Required (gated)
- **Description:** Foundation dashboard with stats and activities

### `/foundation/orders-appointments`
- **Component:** `FoundationOrdersAppointmentsPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`
- **Subscription:** Required (gated)
- **Description:** Orders and appointments management

### `/foundation/leads`
- **Component:** `FoundationLeadsPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`
- **Subscription:** Required (gated)
- **Description:** Parent leads management

### `/foundation/analytics`
- **Component:** `FoundationAnalyticsPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`
- **Subscription:** Required (gated)
- **Description:** Analytics dashboard

### `/foundation/organisation-profile`
- **Component:** `FoundationOrganisationProfilePage`
- **Auth:** Required
- **Roles:** `FOUNDATION`
- **Subscription:** Not required
- **Description:** Organization profile management

### `/foundation/support`
- **Component:** `FoundationSupportPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`
- **Subscription:** Not required
- **Description:** Support tickets

---

## Product Supplier Routes

### `/supplier/dashboard`
- **Component:** `SupplierDashboardPage`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Required (gated)
- **Description:** Supplier dashboard

### `/supplier/orders`
- **Component:** `SupplierOrdersPage`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Required (gated)
- **Description:** Order management

### `/supplier/product-listings`
- **Component:** `SupplierProductListingsPage`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Required (gated)
- **Description:** Product listings management

### `/supplier/analytics`
- **Component:** `SupplierAnalyticsPage`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Required (gated)
- **Description:** Analytics dashboard

### `/supplier/company-profile`
- **Component:** Redirects to `/settings`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Not required

### `/supplier/organisation-profile`
- **Component:** `SupplierOrganisationProfilePage`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Not required
- **Description:** Organization profile

### `/supplier/support`
- **Component:** `SupplierSupportPage`
- **Auth:** Required
- **Roles:** `PRODUCT_SUPPLIER`
- **Subscription:** Not required
- **Description:** Support tickets

---

## Service Provider Routes

### `/service-provider/dashboard`
- **Component:** `ServiceProviderDashboardPage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Required (gated)
- **Description:** Service provider dashboard

### `/service-provider/requests`
- **Component:** `ServiceProviderRequestsPage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Required (gated)
- **Description:** Service request management

### `/service-provider/service-listings`
- **Component:** `ServiceProviderListingsPage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Required (gated)
- **Description:** Service listings management

### `/service-provider/analytics`
- **Component:** `ServiceProviderAnalyticsPage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Required (gated)
- **Description:** Analytics dashboard

### `/service-provider/company-profile`
- **Component:** Redirects to `/settings/service-provider`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Not required

### `/service-provider/organisation-profile`
- **Component:** `ServiceProviderOrganisationProfilePage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Not required
- **Description:** Organization profile

### `/service-provider/support`
- **Component:** `ServiceProviderSupportPage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Subscription:** Not required
- **Description:** Support tickets

---

## Educator Routes

### `/educator/dashboard`
- **Component:** `EducatorDashboardPage`
- **Auth:** Required
- **Roles:** `EDUCATOR`
- **Subscription:** Not required
- **Description:** Educator dashboard

### `/educator/job-board`
- **Component:** `EducatorJobBoardPage`
- **Auth:** Required
- **Roles:** `EDUCATOR`
- **Subscription:** Not required
- **Description:** Job listings board

### `/educator/profile`
- **Component:** `EducatorProfilePage`
- **Auth:** Required
- **Roles:** `EDUCATOR`
- **Subscription:** Not required
- **Description:** Profile management

### `/educator/applications`
- **Component:** `EducatorApplicationsPage`
- **Auth:** Required
- **Roles:** `EDUCATOR`
- **Subscription:** Not required
- **Description:** Job applications tracking

### `/educator/support`
- **Component:** `EducatorSupportPage`
- **Auth:** Required
- **Roles:** `EDUCATOR`
- **Subscription:** Not required
- **Description:** Support tickets

---

## Parent Routes

### `/parent/dashboard`
- **Component:** `ParentDashboardPage`
- **Auth:** Required
- **Roles:** `PARENT`
- **Subscription:** Not required
- **Description:** Parent dashboard

### `/parent/enquiries`
- **Component:** `ParentEnquiriesPage`
- **Auth:** Required
- **Roles:** `PARENT`
- **Subscription:** Not required
- **Description:** Enquiry tracking

### `/parent/support`
- **Component:** `ParentSupportPage`
- **Auth:** Required
- **Roles:** `PARENT`
- **Subscription:** Not required
- **Description:** Support tickets

---

## Common Routes (All Authenticated Users)

### `/marketplace`
- **Component:** Redirects to `/marketplace/products`
- **Auth:** Required
- **Description:** Marketplace entry point

### `/marketplace/products`
- **Component:** `MarketplacePage`
- **Auth:** Required
- **Description:** Product marketplace

### `/marketplace/services`
- **Component:** `MarketplacePage`
- **Auth:** Required
- **Description:** Service marketplace

### `/recruitment`
- **Component:** Redirects to `/recruitment/job-listings`
- **Auth:** Required
- **Description:** Recruitment entry point

### `/recruitment/job-listings`
- **Component:** `RecruitmentPage`
- **Auth:** Required
- **Description:** Job listings

### `/recruitment/candidate-pool`
- **Component:** `RecruitmentPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`
- **Description:** Candidate pool (foundations only)

### `/candidate/:candidateId`
- **Component:** `CandidateProfilePage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`
- **Description:** View candidate profile

### `/messages`
- **Component:** `MessagesPage`
- **Auth:** Required
- **Roles:** All authenticated users
- **Description:** Messaging inbox

### `/messages/:conversationId`
- **Component:** `MessagesPage`
- **Auth:** Required
- **Roles:** All authenticated users
- **Description:** Conversation view

### `/hr-procedures`
- **Component:** `HRProceduresPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`
- **Description:** HR procedures library

### `/state-policies`
- **Component:** `StatePoliciesPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`
- **Description:** State policies by canton

### `/e-learning`
- **Component:** `ELearningPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`
- **Description:** E-Learning platform

### `/partners-directory`
- **Component:** `PartnersPage`
- **Auth:** Required
- **Description:** Partners directory

### `/partner/:partnerId`
- **Component:** `PartnerDetailPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`
- **Description:** Partner detail page

### `/users/*`
- **Component:** `UsersPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** User management (admin only)

### `/profile`
- **Component:** `ProfilePage`
- **Auth:** Required
- **Roles:** All authenticated users (except PARENT for some features)
- **Description:** User profile page

### `/profile/organization/:id`
- **Component:** `OrganizationProfileViewPage`
- **Auth:** Required
- **Roles:** All authenticated users
- **Description:** View organization profile

### `/profile/educator/:id`
- **Component:** `EducatorProfileViewPage`
- **Auth:** Required
- **Roles:** `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`, `EDUCATOR`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`
- **Description:** View educator profile

### `/settings`
- **Component:** `SettingsPage`
- **Auth:** Required
- **Roles:** All authenticated users
- **Description:** Settings page

### `/settings/profile`
- **Component:** `ProfileEditPage`
- **Auth:** Required
- **Roles:** All authenticated users
- **Description:** Edit profile

### `/settings/service-provider`
- **Component:** `ServiceProviderSettingsPage`
- **Auth:** Required
- **Roles:** `SERVICE_PROVIDER`
- **Description:** Service provider settings

### `/notifications`
- **Component:** `NotificationsPage`
- **Auth:** Required
- **Roles:** All authenticated users
- **Description:** Notifications center

### `/file-gallery`
- **Component:** `FileGalleryPage`
- **Auth:** Required
- **Roles:** `EDUCATOR`
- **Description:** File gallery (educator only)

---

## Admin Routes (Frontend)

### `/admin/content-dashboard`
- **Component:** `ContentManagementDashboardPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Content management dashboard

### `/admin/discount-terminations`
- **Component:** `DiscountTerminationsPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Discount termination management

### `/admin/system-monitoring`
- **Component:** `AdminSystemMonitoringPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** System monitoring

### `/admin/support`
- **Component:** `FoundationSupportPage` (reused)
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Support ticket management

### `/design-system`
- **Component:** `DesignSystemPage`
- **Auth:** Required
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Description:** Design system reference

---

## Route Protection Logic

### ProtectedLayout Component
- Wraps all protected routes
- Checks Clerk authentication
- Handles pending users (redirects to profile completion)
- Shows loading state during auth check

### SubscriptionGatedRoute Component
- Wraps subscription-required routes
- Checks subscription status via `SubscriptionPaywall`
- Shows paywall if subscription inactive
- Allows access to always-allowed routes (settings, profile, support)

### SubscriptionPaywall Component
- Checks if user's role requires subscription
- Verifies active subscription status
- Shows appropriate paywall UI
- Handles subscription request flow

---

## Route Redirects

### Default Redirects
- `/` → `/dashboard` (if authenticated) or `/login` (if not)
- `/dashboard` → Role-specific dashboard
- `/marketplace` → `/marketplace/products`
- `/recruitment` → `/recruitment/job-listings`

### Unauthorized Redirects
- Unauthenticated users → `/login`
- Wrong role → Role-specific dashboard
- Pending users → `/signup` (profile completion)

---

## Notes

- All routes except public routes require authentication
- Subscription-gated routes show paywall if subscription inactive
- Role-based redirects ensure users land on appropriate dashboard
- Pending users (no role assigned) are redirected to profile completion
- Admin routes are accessible from both frontend and admin dashboard
- Some routes are reused across roles (e.g., support pages)

