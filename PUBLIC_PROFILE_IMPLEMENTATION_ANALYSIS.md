# Public Profile Pages Implementation - Analysis & Plan

## Current State Analysis

### 1. Existing Profile Infrastructure

#### **Educator/Candidate Profiles**
- **Location**: `frontend/pages/educator/EducatorProfilePage.tsx`
- **Current Access**: Protected route at `/educator/profile` (requires authentication)
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
  - Partner detail page at `/partner/:partnerId` (protected route)
- **Data Source**: 
  - User's `primaryOrganization` from `currentUser` context
  - Organization data from database via `UserOrganization` relation
- **API Endpoints**: 
  - `/profiles/me` (protected)
  - `/profiles/organization` (protected)

#### **Candidate Profile View (For Foundations)**
- **Location**: `frontend/pages/candidate/CandidateProfilePage.tsx`
- **Current Access**: Protected route at `/candidate/:candidateId`
- **Access Control**: Only FOUNDATION, ADMIN, SUPER_ADMIN roles
- **Features**: View candidate details, send message, invite to apply

### 2. Current Routing Structure

**Protected Routes** (require authentication):
- `/profile` - User's own profile (all roles)
- `/educator/profile` - Educator's own profile (EDUCATOR role only)
- `/candidate/:candidateId` - View candidate profile (FOUNDATION, ADMIN, SUPER_ADMIN)
- `/partner/:partnerId` - View organization profile (multiple roles, but protected)

**Public Routes** (no authentication):
- `/pricing` - Pricing page
- `/parent-lead-form` - Lead form
- `/login`, `/signup` - Auth pages

### 3. API Endpoint Analysis

#### **Protected Endpoints**:
- `GET /recruitment/candidates/:id` - Get candidate by ID (requires auth)
- `GET /profiles/me` - Get current user profile (requires auth)
- `GET /profiles/organization` - Get organization profile (requires auth)

#### **Public Endpoints** (using `@Public()` decorator):
- `GET /health` - Health check
- `GET /frontend-settings/public` - Public frontend settings
- `GET /system-configuration/settings/public` - Public system settings

**Missing**: No public endpoints for profiles

### 4. Data Flow Issues

1. **Profile Page Disconnection**:
   - `/profile` page shows organization preview for FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER
   - `/educator/profile` is separate and doesn't connect to main profile page
   - No unified view linking personal profile to organization profile

2. **Public Access Gap**:
   - No public routes for viewing educator/candidate profiles
   - No public routes for viewing organization profiles
   - All profile viewing requires authentication

3. **Data Fetching**:
   - Organization data comes from `currentUser.primaryOrganization`
   - Educator data comes from recruitment API
   - No unified profile service

## Implementation Plan

### Phase 1: Create Public API Endpoints

#### 1.1 Public Profile Endpoints (Backend)

**File**: `api/src/profiles/profiles.controller.ts`

Add new public endpoints:
```typescript
@Get('public/educator/:id')
@Public()
async getPublicEducatorProfile(@Param('id') id: string) {
  // Return educator profile with public fields only
}

@Get('public/organization/:id')
@Public()
async getPublicOrganizationProfile(@Param('id') id: string) {
  // Return organization profile with public fields only
}
```

**File**: `api/src/profiles/profiles.service.ts`

Add methods:
- `getPublicEducatorProfile(userId: string)` - Returns public educator data
- `getPublicOrganizationProfile(organizationId: string)` - Returns public org data
- Filter sensitive data (email, phone if privacy settings restrict)

#### 1.2 Update Recruitment Controller

**File**: `api/src/recruitment/recruitment.controller.ts`

Add public endpoint:
```typescript
@Get('candidates/:id/public')
@Public()
async getPublicCandidateProfile(@Param('id') id: string) {
  // Return public candidate profile
}
```

### Phase 2: Create Public Profile Components

#### 2.1 Public Educator Profile Component

**New File**: `frontend/components/profile/EducatorPublicProfile.tsx`

Features:
- Display educator information (name, bio, skills, experience, education, certifications)
- Show availability preferences
- Display CV/document links (if public)
- Contact button (if privacy allows)
- Similar layout to `OrganizationPublicProfile`

#### 2.2 Update Organization Public Profile

**File**: `frontend/components/profile/OrganizationPublicProfile.tsx`

Ensure it works for:
- Public viewing (no currentUser required)
- Proper data fetching from API
- Handle missing data gracefully

### Phase 3: Create Public Routes

#### 3.1 Update App.tsx Routing

**File**: `frontend/App.tsx`

Add public routes (outside ProtectedLayout):
```typescript
<Route path="/profile/educator/:id" element={<EducatorPublicProfilePage />} />
<Route path="/profile/organization/:id" element={<OrganizationPublicProfilePage />} />
```

#### 3.2 Create Public Profile Pages

**New File**: `frontend/pages/profile/EducatorPublicProfilePage.tsx`
- Fetch data from public API endpoint
- Display using `EducatorPublicProfile` component
- Handle loading/error states

**New File**: `frontend/pages/profile/OrganizationPublicProfilePage.tsx`
- Fetch data from public API endpoint
- Display using `OrganizationPublicProfile` component
- Handle loading/error states

### Phase 4: Connect Profile Pages

#### 4.1 Update Main Profile Page

**File**: `frontend/pages/ProfilePage.tsx`

Changes:
1. **For Educators**:
   - Show link to public profile: "View Public Profile"
   - Link format: `/profile/educator/:userId`
   - Show preview of what public profile looks like

2. **For Organizations** (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER):
   - Show link to public profile: "View Public Profile"
   - Link format: `/profile/organization/:organizationId`
   - Already shows preview via `OrganizationPublicProfile`

3. **Unified Navigation**:
   - Add tabs or sections:
     - "My Profile" (personal info)
     - "Public Profile" (what others see)
     - "Organization Profile" (if applicable)

#### 4.2 Update Educator Profile Page

**File**: `frontend/pages/educator/EducatorProfilePage.tsx`

Changes:
- Add "View Public Profile" button/link
- Link to `/profile/educator/:userId`
- Show preview section of public profile

### Phase 5: Privacy & Access Control

#### 5.1 Privacy Settings

**Database**: Add privacy fields to User table (if not exists):
- `profileVisibility` (PUBLIC, PRIVATE, LIMITED)
- `showEmail` (boolean)
- `showPhone` (boolean)
- `showLocation` (boolean)

**API**: Filter data based on privacy settings in public endpoints

#### 5.2 Access Control

- Public profiles should respect privacy settings
- Some fields may be hidden based on user preferences
- Contact information may require authentication to view

### Phase 6: Data Integration

#### 6.1 Unified Profile Service

**New File**: `frontend/services/profileService.ts`

Create service to:
- Fetch public profiles
- Fetch private profiles
- Handle both educator and organization profiles
- Cache profile data

#### 6.2 Update API Endpoints File

**File**: `frontend/services/api-endpoints.ts`

Add:
```typescript
profiles: {
  public: {
    educator: (id: string) => `/profiles/public/educator/${id}`,
    organization: (id: string) => `/profiles/public/organization/${id}`,
  },
  // ... existing endpoints
}
```

## Technical Considerations

### 1. SEO & Public URLs

- Public profiles should have SEO-friendly URLs
- Consider: `/profile/educator/:slug` instead of `/profile/educator/:id`
- Add meta tags for social sharing

### 2. Performance

- Cache public profile data
- Use CDN for profile images
- Implement pagination for large lists

### 3. Security

- Validate user IDs to prevent enumeration attacks
- Rate limit public endpoints
- Sanitize all user-generated content
- Respect privacy settings strictly

### 4. Data Consistency

- Ensure organization data is up-to-date
- Handle cases where user has no organization
- Handle cases where organization is deleted

## Files to Create/Modify

### New Files:
1. `api/src/profiles/dto/public-profile.dto.ts` - DTOs for public profiles
2. `frontend/components/profile/EducatorPublicProfile.tsx` - Public educator profile component
3. `frontend/pages/profile/EducatorPublicProfilePage.tsx` - Public educator profile page
4. `frontend/pages/profile/OrganizationPublicProfilePage.tsx` - Public organization profile page
5. `frontend/services/profileService.ts` - Unified profile service

### Files to Modify:
1. `api/src/profiles/profiles.controller.ts` - Add public endpoints
2. `api/src/profiles/profiles.service.ts` - Add public profile methods
3. `api/src/recruitment/recruitment.controller.ts` - Add public candidate endpoint
4. `api/src/recruitment/recruitment.service.ts` - Add public candidate method
5. `frontend/App.tsx` - Add public routes
6. `frontend/pages/ProfilePage.tsx` - Add links to public profiles
7. `frontend/pages/educator/EducatorProfilePage.tsx` - Add public profile link
8. `frontend/services/api-endpoints.ts` - Add public profile endpoints
9. `frontend/components/profile/OrganizationPublicProfile.tsx` - Make it work without currentUser

## Testing Checklist

- [ ] Public educator profile accessible without authentication
- [ ] Public organization profile accessible without authentication
- [ ] Privacy settings respected in public profiles
- [ ] Profile page links correctly to public profiles
- [ ] Public profiles display all appropriate data
- [ ] Sensitive data hidden based on privacy settings
- [ ] SEO meta tags present on public profiles
- [ ] Error handling for non-existent profiles
- [ ] Loading states work correctly
- [ ] Mobile responsive design

## Next Steps

1. **Start with Backend**: Create public API endpoints first
2. **Then Frontend Components**: Build public profile components
3. **Add Routes**: Wire up public routes
4. **Connect Existing Pages**: Link from private to public profiles
5. **Add Privacy Controls**: Implement privacy settings
6. **Test Thoroughly**: Ensure all edge cases handled
