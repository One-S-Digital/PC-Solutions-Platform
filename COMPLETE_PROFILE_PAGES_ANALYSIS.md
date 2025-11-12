# Complete Frontend-Facing Profile Pages Analysis & Implementation Plan

## Current State Analysis - All Roles

### 1. FOUNDATION (Daycare/Organization)

#### **Current Profile Pages:**
- **Own Profile**: `/profile` - Shows personal info + organization preview
- **Organization Profile**: `/foundation/organisation-profile` - Detailed organization profile view (FOUNDATION role only)
- **Viewing Others**: `/partner/:partnerId` - Can view supplier/service provider profiles

#### **Components:**
- `OrganizationPublicProfile` - Shows organization preview (used on `/profile`)
- `FoundationOrganisationProfilePage` - Full organization profile page

#### **Data Displayed:**
- Organization name, logo, cover image
- Contact information (email, phone, address, canton)
- Capacity, languages, pedagogy
- Job listings (open roles)
- VAT number, organization ID
- Booking links

#### **Status:**
✅ Has own organization profile page
✅ Has preview component
❌ No frontend-facing route for others to view (`/profile/organization/:id`)
❌ Main `/profile` page doesn't link to frontend-facing view

---

### 2. PRODUCT_SUPPLIER

#### **Current Profile Pages:**
- **Own Profile**: `/profile` - Shows personal info + organization preview
- **Company Profile Settings**: `/settings` (Company Profile section) - Edit company info
- **Viewing Others**: `/partner/:partnerId` - Can view other organizations

#### **Components:**
- `OrganizationPublicProfile` - Shows organization preview (used on `/profile`)
- `CompanyProfileSettings` - Settings form for editing company profile
- `SupplierCompanyProfilePage` - **DEPRECATED** (redirects to `/settings`)

#### **Data Displayed:**
- Company name, logo, cover image
- About text, VAT number
- Regions served, languages spoken
- Products (shown in `OrganizationPublicProfile`)
- Direct order link, catalog URL

#### **Status:**
✅ Has organization preview on `/profile`
✅ Has settings to edit company profile
❌ No dedicated company profile view page
❌ No frontend-facing route for others to view (`/profile/organization/:id`)
❌ Main `/profile` page doesn't link to frontend-facing view

---

### 3. SERVICE_PROVIDER

#### **Current Profile Pages:**
- **Own Profile**: `/profile` - Shows personal info + organization preview
- **Company Profile Settings**: `/settings/service-provider` (Company Profile section) - Edit company info
- **Viewing Others**: `/partner/:partnerId` - Can view other organizations

#### **Components:**
- `OrganizationPublicProfile` - Shows organization preview (used on `/profile`)
- `CompanyProfileSettings` - Settings form for editing company profile
- `ServiceProviderCompanyProfilePage` - **DEPRECATED** (redirects to `/settings`)

#### **Data Displayed:**
- Company name, logo, cover image
- About text, VAT number
- Regions served, languages spoken
- Services (shown in `OrganizationPublicProfile`)
- Service categories, delivery type
- Booking link

#### **Status:**
✅ Has organization preview on `/profile`
✅ Has settings to edit company profile
❌ No dedicated company profile view page
❌ No frontend-facing route for others to view (`/profile/organization/:id`)
❌ Main `/profile` page doesn't link to frontend-facing view

---

### 4. EDUCATOR (Candidate)

#### **Current Profile Pages:**
- **Own Profile**: `/educator/profile` - Personal profile (EDUCATOR role only)
- **Viewing Others**: `/candidate/:candidateId` - View candidate profile (FOUNDATION, ADMIN, SUPER_ADMIN only)
- **Main Profile**: `/profile` - Shows basic personal info (doesn't show educator-specific data)

#### **Components:**
- `EducatorProfilePage` - Own profile page with full educator details
- `CandidateProfilePage` - View other candidates' profiles

#### **Data Displayed:**
- Name, avatar, current role/title
- Location, availability status
- Short bio
- Skills & specialties
- Work experience
- Education
- Certifications
- Availability preferences
- CV & documents

#### **Status:**
✅ Has own profile page (`/educator/profile`)
✅ Has candidate viewing page (`/candidate/:candidateId`)
❌ Candidate viewing limited to FOUNDATION, ADMIN, SUPER_ADMIN
❌ No unified frontend-facing route (`/profile/educator/:id`)
❌ Main `/profile` page doesn't show educator-specific data or link to educator profile
❌ No preview of what others see

---

### 5. PARENT

#### **Current Profile Pages:**
- **Own Profile**: `/profile` - Shows basic personal info
- **Dashboard**: `/parent/dashboard` - Shows child profile info (mock data)

#### **Components:**
- `ProfilePage` - Basic profile page
- `ParentDashboardPage` - Shows child profile section (mock)

#### **Data Displayed:**
- Personal information (name, email, member since)
- Child information (name, age, location, languages, special needs) - **Mock data only**

#### **Status:**
✅ Has basic profile page
❌ No dedicated parent profile page
❌ Child profile data is mock (not from database)
❌ No frontend-facing route (parents typically don't need public profiles)
❓ **Question**: Do parents need frontend-facing profiles? (Probably not, but need to confirm)

---

### 6. ADMIN / SUPER_ADMIN

#### **Current Profile Pages:**
- **Own Profile**: `/profile` - Shows basic personal info
- **Admin Dashboard**: Various admin pages

#### **Components:**
- `ProfilePage` - Basic profile page

#### **Data Displayed:**
- Personal information (name, email, member since)
- Organization info (if applicable)

#### **Status:**
✅ Has basic profile page
❌ No dedicated admin profile page
❌ No frontend-facing route (admins don't need public profiles)
❓ **Question**: Do admins need frontend-facing profiles? (Probably not)

---

## Summary of Issues

### **Critical Issues:**
1. **No unified frontend-facing routes** for viewing profiles:
   - Missing: `/profile/organization/:id` (for FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER)
   - Missing: `/profile/educator/:id` (for EDUCATOR)
   - Existing: `/candidate/:candidateId` (limited access)
   - Existing: `/partner/:partnerId` (works but not unified)

2. **Profile page disconnection**:
   - `/profile` page doesn't link to frontend-facing views
   - `/profile` page doesn't show educator-specific data for educators
   - Organization preview exists but no way to view full frontend-facing profile

3. **Component limitations**:
   - `OrganizationPublicProfile` expects `currentUser` context
   - No reusable component for viewing educator profiles
   - No unified profile service

4. **Access control inconsistencies**:
   - `/candidate/:candidateId` only accessible to FOUNDATION, ADMIN, SUPER_ADMIN
   - Should be accessible to more roles (or all authenticated users)

5. **Missing profile pages**:
   - PRODUCT_SUPPLIER: No dedicated company profile view page
   - SERVICE_PROVIDER: No dedicated company profile view page
   - Both redirect to settings instead

---

## Implementation Plan

### Phase 1: Create Frontend-Facing Profile Routes

#### 1.1 Add Unified Routes

**File**: `frontend/App.tsx`

Add new protected routes (inside ProtectedLayout):
```typescript
// Frontend-facing organization profile (for FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER)
<Route 
  path="/profile/organization/:id" 
  element={
    <ProtectedRoute roles={[
      UserRole.FOUNDATION, 
      UserRole.ADMIN, 
      UserRole.SUPER_ADMIN, 
      UserRole.PRODUCT_SUPPLIER, 
      UserRole.SERVICE_PROVIDER, 
      UserRole.EDUCATOR, 
      UserRole.PARENT
    ]}>
      <OrganizationProfileViewPage />
    </ProtectedRoute>
  } 
/>

// Frontend-facing educator profile
<Route 
  path="/profile/educator/:id" 
  element={
    <ProtectedRoute roles={[
      UserRole.FOUNDATION, 
      UserRole.ADMIN, 
      UserRole.SUPER_ADMIN, 
      UserRole.EDUCATOR, 
      UserRole.PRODUCT_SUPPLIER, 
      UserRole.SERVICE_PROVIDER
    ]}>
      <EducatorProfileViewPage />
    </ProtectedRoute>
  } 
/>
```

#### 1.2 Update Existing Routes

**Option A**: Keep existing routes, expand access:
```typescript
// Expand candidate route access
<Route path="/candidate/:candidateId" element={
  <ProtectedRoute roles={[
    UserRole.FOUNDATION, 
    UserRole.ADMIN, 
    UserRole.SUPER_ADMIN,
    UserRole.EDUCATOR,
    UserRole.PRODUCT_SUPPLIER,
    UserRole.SERVICE_PROVIDER
  ]}>
    <CandidateProfilePage />
  </ProtectedRoute>
} />

// Keep partner route, but could redirect to unified route
<Route path="/partner/:partnerId" element={
  <ProtectedRoute roles={[...]}>
    <PartnerDetailPage /> {/* Or redirect to /profile/organization/:id */}
  </ProtectedRoute>
} />
```

**Option B**: Redirect to unified routes:
```typescript
<Route path="/candidate/:candidateId" element={
  <Navigate to="/profile/educator/:candidateId" replace />
} />
```

---

### Phase 2: Create Frontend-Facing Profile Pages

#### 2.1 Organization Profile View Page

**New File**: `frontend/pages/profile/OrganizationProfileViewPage.tsx`

**Features:**
- Fetch organization data by ID from API
- Display using `OrganizationPublicProfile` component
- Show organization details based on type:
  - **FOUNDATION**: Job listings, pedagogy, capacity
  - **PRODUCT_SUPPLIER**: Products, direct order link
  - **SERVICE_PROVIDER**: Services, booking link
- Allow messaging/contact if viewer has permission
- Handle loading/error states
- Show "Back" button

**API Endpoint Needed:**
- `GET /profiles/organization/:id` - Get organization by ID

#### 2.2 Educator Profile View Page

**New File**: `frontend/pages/profile/EducatorProfileViewPage.tsx`

**Features:**
- Fetch educator data using `useRecruitmentApi().getCandidateById()`
- Display using reusable educator profile component
- Show full educator profile (skills, experience, education, certifications)
- Allow messaging/contact if viewer has permission
- Handle loading/error states
- Show "Back" button

**API Endpoint:**
- `GET /recruitment/candidates/:id` - Already exists, works for all authenticated users

---

### Phase 3: Update Profile Components

#### 3.1 Update OrganizationPublicProfile Component

**File**: `frontend/components/profile/OrganizationPublicProfile.tsx`

**Changes:**
- Make it work without `currentUser` context
- Accept organization data as prop (not just from user)
- Handle cases where organization data is passed directly
- Keep backward compatibility with current usage

```typescript
type OrganizationPublicProfileProps = {
  user?: User; // Optional - for backward compatibility
  organization?: Organization; // New - direct organization data
  organizationId?: string; // New - fetch by ID
  showActions?: boolean; // New - show/hide action buttons
};
```

#### 3.2 Create Reusable Educator Profile Component

**New File**: `frontend/components/profile/EducatorProfileView.tsx`

**Extract common logic from `CandidateProfilePage`:**
- Display educator information
- Show skills, experience, education, certifications
- Handle contact/messaging actions
- Reusable for both viewing own profile and others' profiles

**Props:**
```typescript
type EducatorProfileViewProps = {
  candidate: CandidateProfile;
  isOwnProfile?: boolean;
  showActions?: boolean;
  onMessage?: () => void;
  onInviteToApply?: () => void;
};
```

---

### Phase 4: Connect Profile Pages

#### 4.1 Update Main Profile Page

**File**: `frontend/pages/ProfilePage.tsx`

**Changes:**

1. **For Educators**:
   ```typescript
   // Add section showing educator profile preview
   {currentUser.role === UserRole.EDUCATOR && (
     <Card>
       <h2>Your Profile as Others See It</h2>
       <EducatorProfilePreview candidate={educatorData} />
       <Button onClick={() => navigate(`/profile/educator/${currentUser.id}`)}>
         View Full Profile
       </Button>
     </Card>
   )}
   ```

2. **For Organizations** (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER):
   ```typescript
   // Add button to view frontend-facing profile
   {showPublicOrganizationProfile && (
     <>
       <OrganizationPublicProfile user={currentUser} />
       <Button onClick={() => navigate(`/profile/organization/${currentUser.primaryOrganization?.id}`)}>
         View Organization Profile
       </Button>
     </>
   )}
   ```

3. **Unified Navigation**:
   - Add clear sections:
     - "Personal Information" (private)
     - "Public Profile" (what others see)
     - "Organization Profile" (for org roles)

#### 4.2 Update Educator Profile Page

**File**: `frontend/pages/educator/EducatorProfilePage.tsx`

**Changes:**
- Add "View Profile as Others See It" button/link
- Link to `/profile/educator/:userId`
- Show preview section of what others see

#### 4.3 Update Foundation Organization Profile Page

**File**: `frontend/pages/foundation/FoundationOrganisationProfilePage.tsx`

**Changes:**
- Add "View Organization Profile" button/link
- Link to `/profile/organization/:organizationId`
- Clarify this is the "admin view" vs "public view"

---

### Phase 5: API Endpoint Updates

#### 5.1 Organization Profile Endpoint

**File**: `api/src/profiles/profiles.controller.ts`

Add endpoint:
```typescript
@Get('organization/:id')
@ApiOperation({ summary: 'Get organization profile by ID' })
async getOrganizationProfile(@Param('id') id: string, @Request() req) {
  return this.profilesService.getOrganizationProfileById(id);
}
```

**File**: `api/src/profiles/profiles.service.ts`

Add method:
```typescript
async getOrganizationProfileById(organizationId: string) {
  const organization = await this.prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      products: { where: { isActive: true } },
      services: { where: { isActive: true } },
      jobListings: { where: { status: 'PUBLISHED' } },
      logoAsset: true,
      coverAsset: true,
    },
  });
  
  if (!organization) {
    throw new NotFoundException('Organization not found');
  }
  
  return organization;
}
```

#### 5.2 Ensure Candidate Endpoint Works for All Roles

**File**: `api/src/recruitment/recruitment.controller.ts`

Verify `GET /recruitment/candidates/:id` works for all authenticated users (currently should work, but verify access control)

---

### Phase 6: Create Profile Service

#### 6.1 Unified Profile Service

**New File**: `frontend/services/profileService.ts`

```typescript
export const profileService = {
  // Get organization profile by ID
  async getOrganizationProfile(organizationId: string): Promise<Organization> {
    // Fetch from API
  },
  
  // Get educator profile by ID
  async getEducatorProfile(userId: string): Promise<CandidateProfile> {
    // Fetch from API
  },
  
  // Get own profile
  async getOwnProfile(): Promise<User> {
    // Fetch from API
  },
};
```

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

---

## Files to Create/Modify

### New Files:
1. `frontend/pages/profile/OrganizationProfileViewPage.tsx` - Frontend-facing organization profile page
2. `frontend/pages/profile/EducatorProfileViewPage.tsx` - Frontend-facing educator profile page
3. `frontend/components/profile/EducatorProfileView.tsx` - Reusable educator profile component
4. `frontend/services/profileService.ts` - Unified profile service

### Files to Modify:
1. `frontend/App.tsx` - Add frontend-facing profile routes
2. `frontend/pages/ProfilePage.tsx` - Add links to frontend-facing profiles, show previews
3. `frontend/pages/educator/EducatorProfilePage.tsx` - Add link to frontend-facing profile
4. `frontend/pages/foundation/FoundationOrganisationProfilePage.tsx` - Add link to frontend-facing profile
5. `frontend/components/profile/OrganizationPublicProfile.tsx` - Make it work without currentUser
6. `frontend/pages/candidate/CandidateProfilePage.tsx` - Optionally redirect or expand access
7. `api/src/profiles/profiles.controller.ts` - Add organization by ID endpoint
8. `api/src/profiles/profiles.service.ts` - Add organization by ID method
9. `frontend/services/api-endpoints.ts` - Add organization by ID endpoint

---

## Role-Specific Implementation Details

### FOUNDATION
- ✅ Has organization profile page (`/foundation/organisation-profile`)
- ✅ Has preview component
- ❌ Need: Frontend-facing route (`/profile/organization/:id`)
- ❌ Need: Link from `/profile` to frontend-facing view

### PRODUCT_SUPPLIER
- ✅ Has organization preview on `/profile`
- ✅ Has settings to edit company profile
- ❌ Need: Frontend-facing route (`/profile/organization/:id`)
- ❌ Need: Link from `/profile` to frontend-facing view
- ❌ Need: Dedicated company profile view page (optional, can use unified route)

### SERVICE_PROVIDER
- ✅ Has organization preview on `/profile`
- ✅ Has settings to edit company profile
- ❌ Need: Frontend-facing route (`/profile/organization/:id`)
- ❌ Need: Link from `/profile` to frontend-facing view
- ❌ Need: Dedicated company profile view page (optional, can use unified route)

### EDUCATOR
- ✅ Has own profile page (`/educator/profile`)
- ✅ Has candidate viewing page (`/candidate/:candidateId`)
- ❌ Need: Unified frontend-facing route (`/profile/educator/:id`)
- ❌ Need: Link from `/profile` to educator profile
- ❌ Need: Expand access to `/candidate/:candidateId` or redirect to unified route
- ❌ Need: Show educator-specific data on main `/profile` page

### PARENT
- ✅ Has basic profile page
- ❓ **Question**: Do parents need frontend-facing profiles? (Probably not)
- ❌ Need: Real child profile data (currently mock)

### ADMIN / SUPER_ADMIN
- ✅ Has basic profile page
- ❓ **Question**: Do admins need frontend-facing profiles? (Probably not)

---

## Testing Checklist

### Organization Profiles:
- [ ] Frontend-facing organization profile accessible to authenticated users
- [ ] Organization profile displays correctly for FOUNDATION (job listings)
- [ ] Organization profile displays correctly for PRODUCT_SUPPLIER (products)
- [ ] Organization profile displays correctly for SERVICE_PROVIDER (services)
- [ ] Profile page links correctly to frontend-facing organization profile
- [ ] Organization profile component works without currentUser
- [ ] Error handling for non-existent organizations
- [ ] Loading states work correctly

### Educator Profiles:
- [ ] Frontend-facing educator profile accessible to authenticated users
- [ ] Profile page links correctly to frontend-facing educator profile
- [ ] Educator profile displays all appropriate data
- [ ] Main `/profile` page shows educator-specific data
- [ ] Error handling for non-existent educators
- [ ] Loading states work correctly

### General:
- [ ] Navigation between own profile and frontend-facing profile works
- [ ] Preview sections show correct information
- [ ] Access control works correctly for different roles
- [ ] Mobile responsive design
- [ ] All routes properly protected

---

## Implementation Priority

1. **High**: Update `OrganizationPublicProfile` to work without currentUser
2. **High**: Create frontend-facing organization profile page
3. **High**: Add routes for frontend-facing profiles
4. **High**: Create frontend-facing educator profile page
5. **Medium**: Update main profile page to link to frontend-facing profiles
6. **Medium**: Add organization by ID API endpoint
7. **Low**: Create unified profile service
8. **Low**: Expand access to `/candidate/:candidateId` or redirect

---

## Next Steps

1. **Start with Organization Profiles**: Update component and create view page
2. **Then Educator Profiles**: Create view page and component
3. **Connect Profile Pages**: Add links and previews
4. **Add API Endpoints**: Organization by ID endpoint
5. **Test Thoroughly**: Ensure all connections work
6. **Polish UX**: Make navigation intuitive
