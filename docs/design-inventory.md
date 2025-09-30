# Design Repository Inventory

## Overview
This document catalogs all components, routes, assets, and functionality from the PC-solutions-Design repository that needs to be transplanted into our monorepo.

## Routes and Navigation Flow

### Public Routes (No Auth Required)
- `/login` - Login page with demo user buttons, social login options, and links to signup/pricing
- `/signup` - User registration page
- `/pricing` - Subscription plans page with role-based pricing tiers
- `/parent-lead-form` - Public form for parents seeking daycare services

### Protected Routes (Auth Required)
- `/dashboard` - Role-based dashboard redirect
- `/dashboard/details/:detailType` - Dashboard detail views

### Marketplace Routes
- `/marketplace/products` - Product marketplace
- `/marketplace/services` - Service marketplace

### Recruitment Routes
- `/recruitment/job-listings` - Job listings
- `/recruitment/candidate-pool` - Candidate pool
- `/candidate/:candidateId` - Individual candidate profiles

### Messaging Routes
- `/messages` - Messages list
- `/messages/:conversationId` - Individual conversation

### HR & Compliance Routes
- `/hr-procedures` - HR procedures and documents
- `/state-policies` - State policies and regulations
- `/e-learning` - E-learning courses

### Partner Routes
- `/partners` - Partners list (Admin only)
- `/partner/:partnerId` - Partner detail page

### User Management Routes
- `/users/*` - User management (Admin only)
- `/settings/*` - User settings

### Admin Routes (Super Admin/Admin only)
- `/admin/content-dashboard` - Content management dashboard
- `/admin/discount-terminations` - Discount terminations management
- `/admin/system-monitoring` - System monitoring
- `/admin/platform-settings` - Platform settings
- `/design-system` - Design system showcase

### Role-Specific Routes

#### Product Supplier Routes
- `/supplier/dashboard` - Supplier dashboard
- `/supplier/orders` - Order management
- `/supplier/product-listings` - Product listings management
- `/supplier/analytics` - Analytics
- `/supplier/company-profile` - Company profile (redirects to settings)
- `/supplier/support` - Support

#### Service Provider Routes
- `/service-provider/dashboard` - Service provider dashboard
- `/service-provider/requests` - Service requests
- `/service-provider/service-listings` - Service listings
- `/service-provider/analytics` - Analytics
- `/service-provider/company-profile` - Company profile (redirects to settings)
- `/service-provider/support` - Support

#### Foundation Routes
- `/foundation/dashboard` - Foundation dashboard
- `/foundation/orders-appointments` - Orders and appointments
- `/foundation/leads` - Parent leads management
- `/foundation/analytics` - Analytics
- `/foundation/organisation-profile` - Organization profile
- `/foundation/support` - Support

#### Educator Routes
- `/educator/dashboard` - Educator dashboard
- `/educator/job-board` - Job board
- `/educator/profile` - Profile management
- `/educator/applications` - Job applications
- `/educator/support` - Support

#### Parent Routes
- `/parent/dashboard` - Parent dashboard
- `/parent/enquiries` - Enquiries
- `/parent/support` - Support

### Utility Routes
- `/file-gallery` - File gallery (Educator only)
- `/notifications` - Notifications
- `/notifications` - Notifications

## Page-Level Components

### Core Pages
- `DashboardPage.tsx` - Main dashboard with role-based content
- `DashboardDetailPage.tsx` - Detailed dashboard views
- `LoginPage.tsx` - Authentication page
- `SignupPage.tsx` - Registration page
- `PricingPage.tsx` - Subscription plans
- `ParentLeadFormPage.tsx` - Public lead form
- `MarketplacePage.tsx` - Marketplace interface
- `RecruitmentPage.tsx` - Recruitment interface
- `HRProceduresPage.tsx` - HR procedures
- `StatePoliciesPage.tsx` - State policies
- `ELearningPage.tsx` - E-learning interface
- `UsersPage.tsx` - User management
- `SettingsPage.tsx` - Settings interface
- `MessagesPage.tsx` - Messaging interface
- `NotificationsPage.tsx` - Notifications
- `FileGalleryPage.tsx` - File gallery
- `DesignSystemPage.tsx` - Design system showcase

### Admin Pages
- `ContentManagementDashboardPage.tsx` - Content management
- `AdminSystemMonitoringPage.tsx` - System monitoring
- `AdminPlatformSettingsPage.tsx` - Platform settings
- `DiscountTerminationsPage.tsx` - Discount management

### Role-Specific Pages
- Foundation: `FoundationDashboardPage.tsx`, `FoundationOrdersAppointmentsPage.tsx`, `FoundationLeadsPage.tsx`, `FoundationAnalyticsPage.tsx`, `FoundationOrganisationProfilePage.tsx`, `FoundationSupportPage.tsx`
- Supplier: `SupplierDashboardPage.tsx`, `SupplierOrdersPage.tsx`, `SupplierProductListingsPage.tsx`, `SupplierAnalyticsPage.tsx`, `SupplierCompanyProfilePage.tsx`, `SupplierSupportPage.tsx`
- Service Provider: `ServiceProviderDashboardPage.tsx`, `ServiceProviderRequestsPage.tsx`, `ServiceProviderListingsPage.tsx`, `ServiceProviderAnalyticsPage.tsx`, `ServiceProviderCompanyProfilePage.tsx`, `ServiceProviderSupportPage.tsx`
- Educator: `EducatorDashboardPage.tsx`, `EducatorJobBoardPage.tsx`, `EducatorProfilePage.tsx`, `EducatorApplicationsPage.tsx`, `EducatorSupportPage.tsx`
- Parent: `ParentDashboardPage.tsx`, `ParentEnquiriesPage.tsx`, `ParentSupportPage.tsx`

## Reusable UI Components

### Layout Components
- `MainLayout.tsx` - Main application layout
- `Navbar.tsx` - Navigation bar
- `Sidebar.tsx` - Sidebar navigation

### UI Components
- `Button.tsx` - Button component with variants
- `Card.tsx` - Card component
- `LanguageSwitcher.tsx` - Language switching
- `ChipInput.tsx` - Chip input component
- `FileUploadZone.tsx` - File upload zone
- `QuantityInput.tsx` - Quantity input
- `RadioPills.tsx` - Radio pill selection
- `Tabs.tsx` - Tab component
- `ToggleSwitch.tsx` - Toggle switch

### Feature Components
- `LeadCard.tsx` - Lead display card
- `SupplierCard.tsx` - Supplier display card
- `OrderRequestModal.tsx` - Order request modal
- `ServiceRequestModal.tsx` - Service request modal
- `ChatWindow.tsx` - Chat interface
- `ConversationList.tsx` - Conversation list
- `MessageBubble.tsx` - Message bubble
- `JobDetailModal.tsx` - Job detail modal
- `JobPostModal.tsx` - Job posting modal
- `ViewApplicantsModal.tsx` - Applicant viewing modal

### Admin Components
- `ContentUploadModal.tsx` - Content upload modal
- `PolicyAlertModal.tsx` - Policy alert modal

### Settings Components
- `SettingsSectionWrapper.tsx` - Settings section wrapper
- `SettingsSidebar.tsx` - Settings sidebar
- `OrganizationProfileForm.tsx` - Organization profile form
- `AddPromoCodeModal.tsx` - Promo code addition modal
- `ConfirmDestructiveActionModal.tsx` - Confirmation modal

### Shared Components
- `ActiveClientToggle.tsx` - Active client toggle
- `FeatureLock.tsx` - Feature locking component
- `FileUploadModal.tsx` - File upload modal
- `RenameFileModal.tsx` - File rename modal

## Forms and Interactions

### Authentication Forms
- Login form with email/password, demo user buttons, social login options
- Signup form with role selection and organization details
- Password reset flow (placeholder)

### User Management Forms
- User profile forms
- Organization profile forms
- Settings forms with role-specific fields

### Marketplace Forms
- Product listing forms
- Service listing forms
- Order request forms
- Service request forms

### Recruitment Forms
- Job posting forms
- Application forms
- Candidate profile forms

### Admin Forms
- Content upload forms
- Policy alert forms
- System configuration forms
- User management forms

### Settings Forms
- Organization settings
- Billing settings
- Notification preferences
- Team member management
- Promo code management

## Assets and Resources

### Images and SVGs
- Custom icons in `components/icons/CustomIcons.tsx`
- Placeholder images using Picsum Photos service
- Organization logos and cover images
- Product and service images

### Fonts
- Standard web fonts (no custom font files found)

### Localization
- Translation files in `public/locales/`
  - English (`en/translation.json`)
  - French (`fr/translation.json`)
  - German (`de/translation.json`)

### Styling
- Tailwind CSS classes
- Custom color scheme with Swiss-themed colors
- Responsive design patterns
- Component-specific styling

## Data Models and Types

### User Types
- `User` - User interface with role, organization, and profile data
- `UserRole` - Enum for user roles (SUPER_ADMIN, ADMIN, FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, EDUCATOR, PARENT)
- `Organization` - Organization interface for foundations, suppliers, service providers

### Content Types
- `Product` - Product interface for marketplace
- `Service` - Service interface for marketplace
- `JobListing` - Job listing interface
- `CandidateProfile` - Candidate profile interface
- `Course` - E-learning course interface
- `HRDocument` - HR document interface
- `PolicyDocument` - Policy document interface

### Communication Types
- `Conversation` - Chat conversation interface
- `Message` - Message interface
- `AppNotification` - Notification interface

### Business Logic Types
- `ParentLead` - Parent lead interface
- `OrderRequest` - Order request interface
- `ServiceRequest` - Service request interface
- `Application` - Job application interface
- `VendorClient` - Vendor-client relationship interface

### Settings Types
- `SupplierSettings` - Supplier-specific settings
- `ProviderSettings` - Service provider-specific settings
- `FoundationSettings` - Foundation-specific settings
- `PricingPlan` - Pricing plan interface

### Admin Types
- `ContentModerationItem` - Content moderation interface
- `SystemMonitoringData` - System monitoring interface
- `LogEntry` - Log entry interface
- `SecurityAlert` - Security alert interface
- `PlatformSettings` - Platform settings interface

## Mock Data and Constants

### Mock Users
- Foundation user (Astrid L.)
- Parent user (Sophie D.)
- Super admin user
- Supplier user (Max W.)
- Service provider user (Lena A.)
- Educator user (Tom F.)

### Mock Organizations
- Foundation organization (KinderWelt)
- Supplier organization (EcoGoods Global)
- Service provider organization (ProClean Solutions)

### Mock Content
- Products, services, job listings
- Candidate profiles
- HR documents, courses, policy documents
- Conversations and messages
- Orders and service requests

### Constants
- Swiss cantons list
- Service categories and delivery types
- HR categories and e-learning categories
- Policy types and broad categories
- Input field styling constants
- App name and branding

## Key Features and Functionality

### Authentication and Authorization
- Role-based access control
- Demo user login for testing
- Social login placeholders
- Password reset flow

### Marketplace
- Product and service browsing
- Order and service request management
- Supplier and service provider profiles
- Cart functionality

### Recruitment
- Job posting and management
- Candidate profile viewing
- Application tracking
- Job board interface

### Communication
- Real-time messaging
- Group conversations
- File sharing
- Notifications

### Content Management
- HR document library
- E-learning courses
- Policy document management
- File upload and management

### Analytics and Reporting
- Role-specific dashboards
- Analytics pages for suppliers and service providers
- System monitoring for admins
- Performance metrics

### Settings and Configuration
- User profile management
- Organization settings
- Billing and subscription management
- Team member management
- Promo code management

### Admin Features
- Content moderation
- System monitoring
- Platform settings
- User management
- Discount management
- Audit logging

## Technical Implementation Notes

### State Management
- React Context for app state
- Cart context for marketplace
- Messaging context for chat
- Notification context for alerts

### Routing
- React Router v6+ with protected routes
- Role-based route guards
- Nested routing for settings and admin

### Internationalization
- React-i18next for translations
- Language switching component
- Multi-language support (EN/FR/DE)

### Styling
- Tailwind CSS for styling
- Custom color scheme
- Responsive design
- Component-based styling

### Data Flow
- Mock data for development
- Context providers for state management
- Form handling with validation
- Modal and drawer patterns for interactions