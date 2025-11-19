# Frontend-Facing Profile Pages Implementation - Analysis & Plan

## Current State Analysis

### 1. Existing Profile Infrastructure

#### **Educator/Candidate Profiles**
- **Location**: `frontend/pages/educator/EducatorProfilePage.tsx`
- **Current Access**: Protected route at `/educator/profile` (EDUCATOR role only - own profile)
- **Viewing Others**: `/candidate/:candidateId` exists but only for FOUNDATION, ADMIN, SUPER_ADMIN
- **Data Source**: 
  - API: `/recruitment/candidates/:id` (protected endpoint)
  - Hook: `useRecruitmentApi().getCandidateById()`
  - Service: `api/src/recruitment/recruitment.service.ts::findCandidateById()`
- **Database Fields**: User table with educator-specific fields:
  - `workExperience` (JSON string)
  - `education` (JSON string)
  - `certifications` (String[])
  - `skills` (String[])
  - `availability` (String)
  - `cvUrl` (String)

#### **Organization Profiles (Foundation, Supplier, Service Provider)**
- **Component**: `frontend/components/profile/OrganizationPublicProfile.tsx`
- **Current Access**: 
  - Preview shown on `/profile` page (user's own profile)
  - Partner detail page at `/partner/:partnerId` (protected route, multiple roles)
- **Data Source**: 
  - User's `primaryOrganization` from `currentUser` context
  - Organization data from database via `UserOrganization` relation
- **API Endpoints**: 
  - `/profiles/me` (protected)
  - `/profiles/organization` (protected)

#### **Main Profile Page**
- **Location**: `frontend/pages/ProfilePage.tsx`
- **Current Behavior**:
  - Shows user's personal info
  - Shows organization preview for FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER
  - Does NOT link to frontend-facing profile pages
  - Does NOT show educator profile preview

### 2. Current Routing Structure

**Protected Routes** (require authentication):
- `/profile` - User's own profile (all roles)
- `/educator/profile` - Educator's own profile (EDUCATOR role only)
- `/candidate/:candidateId` - View candidate profile (FOUNDATION, ADMIN, SUPER_ADMIN only)
- `/partner/:partnerId` - View organization profile (FOUNDATION, ADMIN, SUPER_ADMIN, PRODUCT_SUPPLIER, SERVICE_PROVIDER)

**Issues**:
- No unified route for viewing educator profiles (like `/profile/educator/:id`)
- Organization profiles accessible but not well integrated with main profile page
- Main profile page doesn't connect to frontend-facing views

### 3. API Endpoint Analysis

#### **Existing Protected Endpoints**:
- `GET /recruitment/candidates/:id` - Get candidate by ID (requires auth, works for all authenticated users)
- `GET /profiles/me` - Get current user profile (requires auth)
- `GET /profiles/organization` - Get organization profile (requires auth)

**Status**: API endpoints exist and work, but routing/UI needs improvement

### 4. Data Flow Issues

1. **Profile Page Disconnection**:
   - `/profile` page shows organization preview for FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER
   - `/educator/profile` is separate and doesn't connect to main profile page
   - No unified view linking personal profile to organization profile
   - No way to view educator profile from main profile page

2. **Access Control**:
   - `/candidate/:candidateId` only accessible to FOUNDATION, ADMIN, SUPER_ADMIN
   - Should be accessible to more roles (or all authenticated users)
   - Need unified route structure

3. **Data Fetching**:
   - Organization data comes from `currentUser.primaryOrganization`
   - Educator data comes from recruitment API
   - No unified profile service
   - Organization profile component expects `currentUser` context

## Implementation Plan

### Phase 1: Create Frontend-Facing Profile Routes

#### 1.1 Add Unified Profile Routes

**File**: `frontend/App.tsx`

Add new protected routes (inside ProtectedLayout):
```typescript
// Frontend-facing profile routes (accessible to authenticated users)
<Route 
  path="/profile/educator/:id" 
  element={
    <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
      <EducatorProfileViewPage />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/profile/organization/:id" 
  element={
    <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR, UserRole.PARENT]}>
      <OrganizationProfileViewPage />
    </ProtectedRoute>
  } 
/>
```

**Note**: These routes are protected (require authentication) but accessible to multiple roles

#### 1.2 Update Existing Candidate Route

**File**: `frontend/App.tsx`

Option 1: Keep existing route but expand access:
```typescript
<Route path="/candidate/:candidateId" element={
  <ProtectedRoute roles={[UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER]}>
    <CandidateProfilePage />
  </ProtectedRoute>
} />
```

Option 2: Redirect to new unified route:
```typescript
<Route path="/candidate/:candidateId" element={<Navigate to="/profile/educator/:candidateId" replace />} />
```

### Phase 2: Create Frontend-Facing Profile Pages

#### 2.1 Educator Profile View Page

**New File**: `frontend/pages/profile/EducatorProfileViewPage.tsx`

Features:
- Fetch educator data using `useRecruitmentApi().getCandidateById()`
- Display using a reusable component (can reuse parts of `CandidateProfilePage`)
- Show full educator profile (skills, experience, education, certifications)
- Allow messaging/contact if viewer has permission
- Handle loading/error states
- Show "Back" button

#### 2.2 Organization Profile View Page

**New File**: `frontend/pages/profile/OrganizationProfileViewPage.tsx`

Features:
- Fetch organization data from API
- Display using `OrganizationPublicProfile` component (needs to work without currentUser)
- Show organization details (products, services, job listings based on type)
- Allow messaging/contact if viewer has permission
- Handle loading/error states

### Phase 3: Update Profile Components

#### 3.1 Update OrganizationPublicProfile Component

**File**: `frontend/components/profile/OrganizationPublicProfile.tsx`

Changes:
- Make it work without `currentUser` context
- Accept organization data as prop (not just from user)
- Handle cases where organization data is passed directly
- Keep backward compatibility with current usage

```typescript
type OrganizationPublicProfileProps = {
  user?: User; // Optional - for backward compatibility
  organization?: Organization; // New - direct organization data
  organizationId?: string; // New - fetch by ID
};
```

#### 3.2 Create Reusable Educator Profile Component

**New File**: `frontend/components/profile/EducatorProfileView.tsx`

Extract common logic from `CandidateProfilePage`:
- Display educator information
- Show skills, experience, education, certifications
- Handle contact/messaging actions
- Reusable for both viewing own profile and others' profiles

### Phase 4: Connect Profile Pages

#### 4.1 Update Main Profile Page

**File**: `frontend/pages/ProfilePage.tsx`

Changes:
1. **For Educators**:
   - Add section showing "Frontend-Facing Profile" preview
   - Add button/link: "View Profile as Others See It" → `/profile/educator/:userId`
   - Show what information is visible to others

2. **For Organizations** (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER):
   - Add button/link: "View Organization Profile" → `/profile/organization/:organizationId`
   - Already shows preview via `OrganizationPublicProfile`
   - Make preview clickable to view full profile

3. **Unified Navigation**:
   - Add clear sections:
     - "Personal Information" (private)
     - "Public Profile" (what others see - for educators)
     - "Organization Profile" (for org roles)

#### 4.2 Update Educator Profile Page

**File**: `frontend/pages/educator/EducatorProfilePage.tsx`

Changes:
- Add "View Profile as Others See It" button/link
- Link to `/profile/educator/:userId`
- Show preview section of what others see

#### 4.3 Update Candidate Profile Page

**File**: `frontend/pages/candidate/CandidateProfilePage.tsx`

Changes:
- Optionally redirect to new unified route
- Or keep as-is but ensure it works well

### Phase 5: API Endpoint Updates (If Needed)

#### 5.1 Organization Profile Endpoint

**File**: `api/src/profiles/profiles.controller.ts`

Add endpoint to get organization by ID:
```typescript
@Get('organization/:id')
@ApiOperation({ summary: 'Get organization profile by ID' })
async getOrganizationProfile(@Param('id') id: string, @Request() req) {
  // Return organization profile
  // Include products, services, job listings based on type
}
```

**File**: `api/src/profiles/profiles.service.ts`

Add method:
- `getOrganizationProfileById(organizationId: string)` - Returns organization with related data

#### 5.2 Ensure Candidate Endpoint Works for All Roles

**File**: `api/src/recruitment/recruitment.controller.ts`

Verify `GET /recruitment/candidates/:id` works for all authenticated users (not just foundations)

### Phase 6: Data Integration & Services

#### 6.1 Create Profile Service

**New File**: `frontend/services/profileService.ts`

Create service to:
- Fetch educator profiles
- Fetch organization profiles
- Handle both viewing own profile and others' profiles
- Cache profile data

#### 6.2 Update API Endpoints File

**File**: `frontend/services/api-endpoints.ts`

Add:
```typescript
profiles: {
  get: '/profiles/me',
  update: '/profiles/me',
  organization: '/profiles/organization',
  organizationById: (id: string) => `/profiles/organization/${id}`, // New
  // ... existing endpoints
}
```

## Technical Considerations

### 1. Access Control

- All routes remain protected (require authentication)
- Different roles can view different profiles
- Respect privacy settings if implemented

### 2. Data Consistency

- Ensure organization data is up-to-date
- Handle cases where user has no organization
- Handle cases where organization is deleted
- Handle cases where educator profile doesn't exist

### 3. User Experience

- Clear navigation between own profile and frontend-facing profile
- Preview sections show what others see
- Easy to share profile links
- Consistent design across all profile types

### 4. Performance

- Cache profile data when appropriate
- Lazy load profile images
- Optimize API calls

## Files to Create/Modify

### New Files:
1. `frontend/pages/profile/EducatorProfileViewPage.tsx` - Frontend-facing educator profile page
2. `frontend/pages/profile/OrganizationProfileViewPage.tsx` - Frontend-facing organization profile page
3. `frontend/components/profile/EducatorProfileView.tsx` - Reusable educator profile component
4. `frontend/services/profileService.ts` - Unified profile service

### Files to Modify:
1. `frontend/App.tsx` - Add frontend-facing profile routes
2. `frontend/pages/ProfilePage.tsx` - Add links to frontend-facing profiles, show previews
3. `frontend/pages/educator/EducatorProfilePage.tsx` - Add link to frontend-facing profile
4. `frontend/components/profile/OrganizationPublicProfile.tsx` - Make it work without currentUser
5. `frontend/pages/candidate/CandidateProfilePage.tsx` - Optionally redirect or keep as-is
6. `api/src/profiles/profiles.controller.ts` - Add organization by ID endpoint
7. `api/src/profiles/profiles.service.ts` - Add organization by ID method
8. `frontend/services/api-endpoints.ts` - Add organization by ID endpoint

## Testing Checklist

- [ ] Frontend-facing educator profile accessible to authenticated users
- [ ] Frontend-facing organization profile accessible to authenticated users
- [ ] Profile page links correctly to frontend-facing profiles
- [ ] Organization profile component works without currentUser
- [ ] Preview sections show correct information
- [ ] Navigation between own profile and frontend-facing profile works
- [ ] Error handling for non-existent profiles
- [ ] Loading states work correctly
- [ ] Mobile responsive design
- [ ] Access control works correctly for different roles

## Implementation Priority

1. **High**: Update `OrganizationPublicProfile` to work without currentUser
2. **High**: Create frontend-facing organization profile page
3. **High**: Add routes for frontend-facing profiles
4. **Medium**: Create frontend-facing educator profile page
5. **Medium**: Update main profile page to link to frontend-facing profiles
6. **Low**: Create unified profile service
7. **Low**: Add organization by ID API endpoint (if needed)

## Next Steps

1. **Start with Organization Profiles**: Update component and create view page
2. **Then Educator Profiles**: Create view page and component
3. **Connect Profile Pages**: Add links and previews
4. **Test Thoroughly**: Ensure all connections work
5. **Polish UX**: Make navigation intuitive
