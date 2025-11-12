# Public Profile Pages - Role Analysis

## Summary

Based on investigation of the codebase and documentation, here are the roles that currently have front-facing public profile pages:

## Roles with Public Profile Pages

### 1. **FOUNDATION** (Daycare)
- **Component**: `OrganizationPublicProfile`
- **Location**: Shown in `/profile` page as a preview
- **Public Route**: `/partner/:partnerId` (protected, not truly public)
- **Features Displayed**:
  - Organization name, logo, cover image
  - About description
  - Contact information (phone, email, booking link)
  - Region, canton, capacity
  - Pedagogy tags
  - Open job listings

### 2. **PRODUCT_SUPPLIER**
- **Component**: `OrganizationPublicProfile`
- **Location**: Shown in `/profile` page as a preview
- **Public Route**: `/partner/:partnerId` (protected, not truly public)
- **Features Displayed**:
  - Organization name, logo, cover image
  - About description
  - Contact information (phone, email, direct order link)
  - Region, canton
  - Product listings with prices
  - Product tags

### 3. **SERVICE_PROVIDER**
- **Component**: `OrganizationPublicProfile`
- **Location**: Shown in `/profile` page as a preview
- **Public Route**: `/partner/:partnerId` (protected, not truly public)
- **Features Displayed**:
  - Organization name, logo, cover image
  - About description
  - Contact information (phone, email, booking link)
  - Region, canton
  - Service listings with categories and delivery types
  - Service categories tags

## Implementation Details

### Code References

**ProfilePage.tsx** (lines 31, 90-91):
```typescript
const shouldHaveOrgProfile = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(currentUser.role);
const shouldShowPublicOrganizationProfile = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(currentUser.role);
```

**OrganizationPublicProfile.tsx**:
- Displays different content based on role:
  - FOUNDATION: Shows job listings
  - PRODUCT_SUPPLIER: Shows products
  - SERVICE_PROVIDER: Shows services

### Route Configuration

**App.tsx** (line 194-199):
```typescript
<Route
  path="/partner/:partnerId"
  element={
    <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
      <PartnerDetailPage />
    </ProtectedRoute>
  }
/>
```

**Note**: The `/partner/:partnerId` route is **protected** (requires authentication), not a truly public route accessible without login.

## Roles WITHOUT Public Profile Pages

1. **EDUCATOR** - Has a profile page at `/educator/profile` but it's for personal profile management, not a public-facing organization profile
2. **PARENT** - No public profile page
3. **ADMIN** - No public profile page
4. **SUPER_ADMIN** - No public profile page

## Current State

### What Exists:
- Organization profile previews shown to users on their own `/profile` page
- Partner detail pages accessible to authenticated users at `/partner/:partnerId`
- Marketplace pages that link to partner profiles

### What's Missing:
- **Truly public routes** (accessible without authentication) for viewing organization profiles
- Public API endpoints for fetching organization profile data without authentication
- SEO-friendly public URLs for organization profiles

## Recommendations

If the goal is to have truly public-facing profile pages:

1. **Create public routes** (no authentication required) for organization profiles
2. **Add public API endpoints** in `api/src/profiles/profiles.controller.ts` that don't require authentication
3. **Update routing** in `App.tsx` to include public routes outside of `ProtectedLayout`
4. **Consider SEO** - Public profile pages should be indexable by search engines

## Documentation References

- `docs/rebuild-specification.md` - Mentions organization profiles for Foundations, Suppliers, and Service Providers
- `docs/onboarding-guide.md` - Details profile fields for organization roles
- `frontend/components/profile/OrganizationPublicProfile.tsx` - The component that renders public profiles
