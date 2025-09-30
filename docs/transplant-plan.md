# PC Solutions Design Transplant Plan

## Overview
This document outlines the plan to transplant the Google AI Studio frontend mock from PC-solutions-Design into our monorepo as the production user UI, while maintaining pixel-perfect fidelity and integrating with our existing NestJS + Prisma + PostgreSQL backend.

## Architecture Overview

### Current Monorepo Structure
```
/workspace
├── admin/          # Admin dashboard app
├── api/            # NestJS backend
├── frontend/       # Existing user app (to be replaced)
├── packages/       # Shared packages
└── PC-solutions-Design/  # Design mock (source)
```

### Target Structure
```
/workspace
├── admin/          # Admin dashboard app (unchanged)
├── api/            # NestJS backend (unchanged)
├── apps/
│   └── web-client/ # New production user UI
├── packages/
│   ├── api-types/  # Generated API types
│   ├── api-client/ # Axios client with auth
│   └── ...         # Existing shared packages
└── PC-solutions-Design/  # Design mock (source only)
```

## New App Structure: `apps/web-client`

### App Configuration
- **Name**: `web-client`
- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS (extending shared config)
- **Routing**: React Router v6+
- **State Management**: React Context + TanStack Query
- **Forms**: React Hook Form + Zod
- **Auth**: Clerk integration
- **API**: Typed Axios client

### Directory Structure
```
apps/web-client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── layouts/        # Layout components
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   ├── adapters/       # Data adapters
│   ├── contexts/       # React contexts
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   ├── styles/         # Styling
│   └── main.tsx        # App entry point
├── public/             # Static assets
├── _import_raw/        # Quarantined mock assets
├── tests/              # Test files
├── docs/               # Documentation
└── package.json        # Dependencies
```

## Route Mapping

### Public Routes
| Mock Route | New Route | Component | Auth Required |
|------------|-----------|-----------|---------------|
| `/login` | `/login` | `LoginPage` | No |
| `/signup` | `/signup` | `SignupPage` | No |
| `/pricing` | `/pricing` | `PricingPage` | No |
| `/parent-lead-form` | `/parent-lead-form` | `ParentLeadFormPage` | No |

### Protected Routes
| Mock Route | New Route | Component | Required Role |
|------------|-----------|-----------|---------------|
| `/dashboard` | `/dashboard` | `DashboardPage` | Any authenticated |
| `/marketplace/products` | `/marketplace/products` | `MarketplacePage` | Any authenticated |
| `/marketplace/services` | `/marketplace/services` | `MarketplacePage` | Any authenticated |
| `/recruitment/job-listings` | `/recruitment/job-listings` | `RecruitmentPage` | Any authenticated |
| `/messages` | `/messages` | `MessagesPage` | Any authenticated |
| `/settings` | `/settings` | `SettingsPage` | Any authenticated |

### Role-Specific Routes
| Mock Route | New Route | Component | Required Role |
|------------|-----------|-----------|---------------|
| `/supplier/dashboard` | `/supplier/dashboard` | `SupplierDashboardPage` | PRODUCT_SUPPLIER |
| `/service-provider/dashboard` | `/service-provider/dashboard` | `ServiceProviderDashboardPage` | SERVICE_PROVIDER |
| `/foundation/dashboard` | `/foundation/dashboard` | `FoundationDashboardPage` | FOUNDATION |
| `/educator/dashboard` | `/educator/dashboard` | `EducatorDashboardPage` | EDUCATOR |
| `/parent/dashboard` | `/parent/dashboard` | `ParentDashboardPage` | PARENT |

### Admin Routes (Moved to Admin App)
| Mock Route | Admin Route | Component | Required Role |
|------------|-------------|-----------|---------------|
| `/admin/content-dashboard` | `/admin/content-dashboard` | `ContentManagementDashboardPage` | SUPER_ADMIN |
| `/admin/system-monitoring` | `/admin/system-monitoring` | `AdminSystemMonitoringPage` | SUPER_ADMIN |
| `/admin/platform-settings` | `/admin/platform-settings` | `AdminPlatformSettingsPage` | SUPER_ADMIN |
| `/admin/discount-terminations` | `/admin/discount-terminations` | `DiscountTerminationsPage` | SUPER_ADMIN |

## API Integration Plan

### Backend Endpoints
Our NestJS backend already provides:
- **Auth**: Clerk webhook integration, JWT validation
- **Users**: User management, profiles, roles
- **Organizations**: Organization management
- **Uploads**: File upload service
- **Billing**: Stripe integration
- **Settings**: User and organization settings
- **Admin**: Admin functionality
- **Health**: Health checks

### New API Client Structure
```
packages/api-client/
├── src/
│   ├── client.ts          # Axios instance with interceptors
│   ├── auth.ts            # Auth-related API calls
│   ├── users.ts           # User management
│   ├── organizations.ts   # Organization management
│   ├── marketplace.ts     # Marketplace functionality
│   ├── recruitment.ts     # Recruitment functionality
│   ├── messaging.ts       # Messaging functionality
│   ├── settings.ts        # Settings management
│   └── types.ts           # API response types
└── package.json
```

### API Endpoints Needed
Based on the mock functionality, we need to ensure these endpoints exist:

#### User Management
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users` - List users (admin)
- `POST /api/users` - Create user (admin)

#### Organization Management
- `GET /api/organizations` - List organizations
- `GET /api/organizations/:id` - Get organization
- `PUT /api/organizations/:id` - Update organization
- `POST /api/organizations` - Create organization

#### Marketplace
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (supplier)
- `PUT /api/products/:id` - Update product (supplier)
- `GET /api/services` - List services
- `GET /api/services/:id` - Get service
- `POST /api/services` - Create service (provider)
- `PUT /api/services/:id` - Update service (provider)

#### Recruitment
- `GET /api/jobs` - List job listings
- `GET /api/jobs/:id` - Get job listing
- `POST /api/jobs` - Create job listing (foundation)
- `PUT /api/jobs/:id` - Update job listing (foundation)
- `GET /api/candidates` - List candidates
- `GET /api/candidates/:id` - Get candidate profile
- `POST /api/applications` - Submit application

#### Messaging
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

#### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `GET /api/organizations/:id/settings` - Get organization settings
- `PUT /api/organizations/:id/settings` - Update organization settings

## Data Adapters

### Adapter Pattern
Each screen will have a corresponding adapter that maps API DTOs to UI models:

```
src/adapters/
├── user.adapter.ts        # User data transformation
├── organization.adapter.ts # Organization data transformation
├── product.adapter.ts     # Product data transformation
├── service.adapter.ts     # Service data transformation
├── job.adapter.ts         # Job listing transformation
├── candidate.adapter.ts   # Candidate profile transformation
├── conversation.adapter.ts # Conversation transformation
├── message.adapter.ts     # Message transformation
└── settings.adapter.ts    # Settings transformation
```

### Example Adapter
```typescript
// src/adapters/user.adapter.ts
export const userAdapter = {
  toUI: (apiUser: ApiUser): UIUser => ({
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    avatarUrl: apiUser.avatarUrl,
    status: apiUser.status,
    lastLogin: formatDate(apiUser.lastLogin),
    region: apiUser.region,
    plan: apiUser.plan,
    memberSince: formatDate(apiUser.memberSince)
  }),
  
  toAPI: (uiUser: Partial<UIUser>): Partial<ApiUser> => ({
    name: uiUser.name,
    email: uiUser.email,
    // ... other fields
  })
};
```

## Authentication Integration

### Clerk Setup
- Wrap app with `<ClerkProvider>`
- Use `useAuth()` hook for auth state
- Implement `useAuthToken()` for API calls
- Add `AuthGuard` HOC for protected routes

### Identity Mapping
- Call `GET /api/users/me` to get internal `AppUser`
- Store `appUserId` for ownership checks
- Never persist raw Clerk subject ID

### Auth Flow
1. User signs in with Clerk
2. Frontend gets Clerk JWT
3. API client adds `Authorization: Bearer <token>` header
4. Backend validates JWT and returns `AppUser`
5. Frontend stores `appUserId` for subsequent calls

## RBAC Implementation

### Role-Based Route Protection
```typescript
// Protected route with role requirements
<Route 
  path="/supplier/dashboard" 
  element={
    <ProtectedRoute roles={[UserRole.PRODUCT_SUPPLIER]}>
      <SupplierDashboardPage />
    </ProtectedRoute>
  } 
/>
```

### Role-Based Component Rendering
```typescript
// Conditional rendering based on role
{user.role === UserRole.FOUNDATION && (
  <FoundationSpecificComponent />
)}
```

### API-Level Protection
- Backend enforces role-based access
- Frontend hides UI elements for unauthorized roles
- 403 responses handled gracefully

## Admin Features Migration

### Super-Admin Features to Add to Admin App
Based on the mock, these features need to be added to the existing Admin app:

1. **Content Moderation**
   - Review and approve/reject content submissions
   - Content queue management
   - Moderation history

2. **System Monitoring**
   - Real-time system status
   - Performance metrics
   - Error tracking
   - Log viewing

3. **Platform Settings**
   - Platform branding
   - Feature toggles
   - System configuration
   - Maintenance mode

4. **Discount Management**
   - Promo code management
   - Discount terminations
   - Usage analytics

5. **Vendor-Client Relationships**
   - Manage supplier-foundation relationships
   - Track active clients
   - Relationship analytics

### Admin App Integration
- Add new routes to existing Admin app
- Reuse existing Admin design system
- Implement server-side RBAC
- Add audit logging for sensitive actions

## Visual Regression Testing

### Playwright Setup
```typescript
// tests/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test('login page visual regression', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-page.png');
});
```

### CI Integration
- Run visual regression tests on every PR
- Fail if diff > 2px or > 0.5% area
- Generate baseline screenshots for all routes
- Compare against design mock

## Development Workflow

### Phase 1: Scaffold and Import
1. Create `apps/web-client` with Vite + React + TypeScript
2. Import mock assets into `_import_raw/`
3. Copy CSS to `src/styles/imported/`
4. Setup Tailwind CSS
5. Create basic routing structure

### Phase 2: API Client and Auth
1. Generate API types from Swagger
2. Create typed API client
3. Integrate Clerk authentication
4. Implement identity mapping
5. Add auth guards

### Phase 3: Data Integration
1. Create data adapters
2. Wire screens with live API calls
3. Implement forms with validation
4. Add loading/error states
5. Test with real data

### Phase 4: Admin Features
1. Identify missing admin features
2. Implement in Admin app
3. Add RBAC protection
4. Test admin functionality

### Phase 5: QA and CI
1. Setup visual regression testing
2. Add unit tests
3. Add E2E tests
4. Setup CI pipeline
5. Performance optimization

## Environment Configuration

### Development
```bash
# .env.development
VITE_API_URL=http://localhost:3000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SKIP_AUTH=false
```

### Production
```bash
# .env.production
VITE_API_URL=https://api.procrechesolutions.com/api
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SKIP_AUTH=false
```

## Success Criteria

### Design Fidelity
- ✅ All pages match mock visually (≤2px difference)
- ✅ Responsive design works on all screen sizes
- ✅ Animations and interactions match mock
- ✅ Color scheme and typography match exactly

### Functionality
- ✅ All forms work with real API
- ✅ Authentication flow works end-to-end
- ✅ Role-based access control enforced
- ✅ File uploads work correctly
- ✅ Real-time features work (messaging, notifications)

### Performance
- ✅ Page load times < 3 seconds
- ✅ Bundle size optimized
- ✅ No memory leaks
- ✅ Smooth animations and transitions

### Security
- ✅ No sensitive data in client bundle
- ✅ Proper auth token handling
- ✅ RBAC enforced at API level
- ✅ No XSS or injection vulnerabilities

### Testing
- ✅ Visual regression tests pass
- ✅ Unit tests cover critical paths
- ✅ E2E tests cover user journeys
- ✅ CI pipeline green

## Risk Mitigation

### Design Changes
- **Risk**: Visual differences from mock
- **Mitigation**: Visual regression testing, pixel-perfect implementation

### API Integration
- **Risk**: Missing or incompatible API endpoints
- **Mitigation**: API contract testing, adapter pattern for flexibility

### Performance
- **Risk**: Slow page loads or poor UX
- **Mitigation**: Code splitting, lazy loading, performance monitoring

### Security
- **Risk**: Auth bypass or data exposure
- **Mitigation**: Security testing, RBAC enforcement, input validation

## Timeline Estimate

- **Phase 1**: 2-3 days (Scaffold and import)
- **Phase 2**: 3-4 days (API client and auth)
- **Phase 3**: 5-7 days (Data integration)
- **Phase 4**: 3-4 days (Admin features)
- **Phase 5**: 2-3 days (QA and CI)

**Total**: 15-21 days

## Dependencies

### External
- Clerk for authentication
- Stripe for billing
- AWS S3 for file storage
- PostgreSQL for data storage

### Internal
- NestJS backend API
- Admin dashboard app
- Shared packages (types, configs)
- Design mock repository

## Next Steps

1. **Immediate**: Start Phase 1 - scaffold `apps/web-client`
2. **Week 1**: Complete Phases 1-2 (scaffold, API client, auth)
3. **Week 2**: Complete Phase 3 (data integration)
4. **Week 3**: Complete Phases 4-5 (admin features, QA)
5. **Week 4**: Testing, optimization, deployment

## Notes

- Maintain pixel-perfect fidelity to the mock
- Use existing backend APIs where possible
- Implement missing functionality in Admin app
- Follow existing code conventions and patterns
- Ensure proper RBAC and security
- Test thoroughly before deployment