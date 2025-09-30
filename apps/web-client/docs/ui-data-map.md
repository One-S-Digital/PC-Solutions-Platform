# UI Data Map

This document maps all UI components to their data requirements, API endpoints, DTOs, and adapters.

## Overview

Each component that displays data from the backend should have:
- A clear data contract (what fields it needs)
- An API endpoint (where to get the data)
- A DTO interface (the raw API response shape)
- An adapter (transforms DTO to UI-friendly format)
- Notes on formatting, validation, and special handling

## Pages

### LoginPage (`/login`)
**Visual Fields**: Email input, password input, social login buttons, navigation links
**API Endpoint**: N/A (uses Clerk for authentication)
**DTO**: N/A
**Adapter**: N/A
**Notes**: 
- Uses Clerk for authentication
- Links to `/pricing`, `/signup`, `/parent-lead-form`
- No demo/testing login UI in production

### PricingPage (`/pricing`)
**Visual Fields**: Plan cards with name, price, features, popularity badge
**API Endpoint**: `GET /api/plans` (when available)
**DTO**: `PricingPlan[]`
**Adapter**: `pricingAdapter.toUI()`
**Notes**:
- Currently uses static data from `src/data/plans.json`
- Ready for API integration
- SEO meta tags for title/description

### SignupPage (`/signup`)
**Visual Fields**: Registration form fields, role selection, terms acceptance
**API Endpoint**: N/A (uses Clerk for registration)
**DTO**: N/A
**Adapter**: N/A
**Notes**: Uses Clerk for user registration

### ParentLeadFormPage (`/parent-lead-form`)
**Visual Fields**: Parent contact form, child details, preferences
**API Endpoint**: `POST /api/parent-leads`
**DTO**: `ParentLeadRequest`
**Adapter**: `parentLeadAdapter.toAPI()`
**Notes**: Form validation with react-hook-form + zod

### DashboardPage (`/dashboard`)
**Visual Fields**: Welcome message, user info, quick stats, recent activity, notifications
**API Endpoint**: `GET /api/me`, `GET /api/dashboard/stats`
**DTO**: `User`, `DashboardStats`
**Adapter**: `userAdapter.toUI()`, `dashboardAdapter.toUI()`
**Notes**: 
- Role-based content
- Loading states for all data sections
- Empty states when no data

### MarketplacePage (`/marketplace`)
**Visual Fields**: Product/service cards, search, filters, tabs
**API Endpoint**: `GET /api/products`, `GET /api/services`
**DTO**: `Product[]`, `Service[]`
**Adapter**: `productAdapter.toUI()`, `serviceAdapter.toUI()`
**Notes**:
- Search and filtering
- Pagination
- Image loading states
- Stock status badges

### SettingsPage (`/settings`)
**Visual Fields**: User profile form, organization settings, notification preferences, security settings
**API Endpoint**: `GET /api/me`, `PUT /api/me`, `PUT /api/organization`
**DTO**: `User`, `Organization`
**Adapter**: `userAdapter.toUI()`, `organizationAdapter.toUI()`
**Notes**:
- Form validation
- Real-time updates
- Error handling
- Success feedback

### MessagesPage (`/messages`)
**Visual Fields**: Conversation list, message bubbles, input field
**API Endpoint**: `GET /api/conversations`, `GET /api/messages/:id`, `POST /api/messages`
**DTO**: `Conversation[]`, `Message[]`
**Adapter**: `conversationAdapter.toUI()`, `messageAdapter.toUI()`
**Notes**:
- Real-time updates
- Message status indicators
- File upload support

### RecruitmentPage (`/recruitment`)
**Visual Fields**: Job listings, candidate profiles, application forms
**API Endpoint**: `GET /api/jobs`, `GET /api/candidates`, `POST /api/applications`
**DTO**: `Job[]`, `Candidate[]`, `Application`
**Adapter**: `jobAdapter.toUI()`, `candidateAdapter.toUI()`, `applicationAdapter.toUI()`
**Notes**:
- Role-based access
- Application tracking
- Document upload

## Components

### Navbar
**Visual Fields**: Logo, navigation links, user menu, notifications
**API Endpoint**: `GET /api/me`, `GET /api/notifications/unread`
**DTO**: `User`, `Notification[]`
**Adapter**: `userAdapter.toUI()`, `notificationAdapter.toUI()`
**Notes**: Responsive design, role-based navigation

### Sidebar
**Visual Fields**: Navigation menu, user info, organization info
**API Endpoint**: `GET /api/me`
**DTO**: `User`
**Adapter**: `userAdapter.toUI()`
**Notes**: Collapsible, role-based menu items

### ProductCard
**Visual Fields**: Image, title, description, price, stock status, supplier info
**API Endpoint**: N/A (receives data as props)
**DTO**: `UIProduct`
**Adapter**: N/A
**Notes**: Hover effects, loading states, error handling

### ServiceCard
**Visual Fields**: Image, title, description, category, delivery type, provider info
**API Endpoint**: N/A (receives data as props)
**DTO**: `UIService`
**Adapter**: N/A
**Notes**: Category badges, availability indicators

### UserProfile
**Visual Fields**: Avatar, name, role, organization, contact info
**API Endpoint**: `GET /api/me`
**DTO**: `User`
**Adapter**: `userAdapter.toUI()`
**Notes**: Avatar fallback, role badges

## Data Adapters

### userAdapter
**Purpose**: Transform user data between API and UI formats
**Methods**:
- `toUI(apiUser: ApiUser): UIUser` - Adds displayName, initials
- `toAPI(uiUser: Partial<UIUser>): Partial<ApiUser>` - Removes UI-only fields

### productAdapter
**Purpose**: Transform product data with formatting
**Methods**:
- `toUI(apiProduct: ApiProduct): UIProduct` - Adds formattedPrice, stockStatusColor, etc.
- `toAPI(uiProduct: Partial<UIProduct>): Partial<ApiProduct>` - Removes UI-only fields

### serviceAdapter
**Purpose**: Transform service data with formatting
**Methods**:
- `toUI(apiService: ApiService): UIService` - Adds categoryLabel, deliveryTypeLabel, etc.
- `toAPI(uiService: Partial<UIService>): Partial<ApiService>` - Removes UI-only fields

### organizationAdapter
**Purpose**: Transform organization data
**Methods**:
- `toUI(apiOrg: ApiOrganization): UIOrganization` - Adds displayName, formattedAddress
- `toAPI(uiOrg: Partial<UIOrganization>): Partial<ApiOrganization>` - Removes UI-only fields

## API Client Usage

All API calls should go through `packages/api-client` with:
- Axios for HTTP requests
- Clerk bearer token authentication
- Error handling
- Type safety with generated types

## Form Handling

All forms use:
- `react-hook-form` for form state
- `zod` for validation schemas
- Server-side error display
- Loading states during submission

## File Uploads

File uploads use:
- `UploadService` endpoint
- Progress indicators
- Error handling
- Preview functionality

## Loading States

All data-fetching components should have:
- Skeleton loaders that match the final layout
- Error states with retry options
- Empty states with helpful messaging
- No layout shifts during loading

## Error Handling

Error handling should:
- Display server errors inline
- Provide retry mechanisms
- Fall back to cached data when possible
- Log errors for debugging

## Accessibility

All components should:
- Have proper ARIA labels
- Support keyboard navigation
- Provide screen reader support
- Maintain color contrast ratios