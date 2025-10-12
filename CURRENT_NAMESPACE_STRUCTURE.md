# Current i18n Namespace Structure

## Configuration Summary

**Location**: `frontend/i18n.ts`  
**Default Namespace**: `common`  
**Fallback Language**: `en`  
**Supported Languages**: English (en), French (fr), German (de)

---

## All Active Namespaces (13 Total)

### 1. **common** (Default Namespace)
**File**: `packages/translations/locales/{lang}/common.json`  
**Purpose**: Shared elements across entire application  
**Contains**:
- `buttons.*` - All button labels (save, cancel, login, signup, etc.)
- `errors.*` - Common error messages  
- `forms.*` - Form validation messages
- `navigation.*` - Navigation items
- `status.*` - Status labels
- `notifications.*` - Toast/notification messages
- `loginPage.*` - Login page specific keys
- `hardcodedText.*` - Legacy hardcoded text replacements
- `languageSwitcher.*` - Language selection
- `settingsPage.*` - Settings page keys
- `contentUploadModal.*` - Content upload modals
- `orderSummaryDrawer.*` - Order summary
- `messagesPage.*` - Messages page keys
- Many component-specific sections

**Size**: ~1050 lines (largest namespace)

---

### 2. **auth**
**File**: `packages/translations/locales/{lang}/auth.json`  
**Purpose**: Authentication flows  
**Contains**:
- Basic auth fields (signIn, signUp, email, password, etc.)
- `signupPage.*` - Complete signup flow (DUPLICATE with signup namespace)
- `loginPage.*` - Login page keys (DUPLICATE with common namespace)
- Auth validation messages
- Account management (created, activated, deleted, etc.)

**Size**: ~282 lines  
**Note**: Has significant overlap with `common` and `signup` namespaces

---

### 3. **dashboard**
**File**: `packages/translations/locales/{lang}/dashboard.json`  
**Purpose**: All dashboard pages for different user roles  
**Contains**:
- `foundationDashboard.*` - Foundation/daycare dashboard
- `educatorDashboard.*` - Educator dashboard
- `supplierDashboard.*` - Supplier dashboard
- `serviceProviderDashboard.*` - Service provider dashboard
- `parentDashboard.*` - Parent dashboard
- `educatorProfilePage.*` - Educator profile
- `dashboardPage.*` - Generic dashboard elements

**Size**: ~930 lines (second largest)

---

### 4. **signup**
**File**: `packages/translations/locales/{lang}/signup.json`  
**Purpose**: User registration flow  
**Contains**:
- `title`, `subtitle`, `steps.*` - Signup wizard
- `progress.*` - Progress indicators
- `role.*` - Role names (simple strings)
- `roles.*` - Role objects with label and description
- `fields.*`, `labels.*` - Form field labels
- `placeholders.*` - Input placeholders
- `errors.*` - Signup-specific validation errors
- `buttons.*` - Signup buttons

**Size**: ~138 lines  
**Note**: Has `role` (singular, strings) AND `roles` (plural, objects)

---

### 5. **recruitment**
**File**: `packages/translations/locales/{lang}/recruitment.json`  
**Purpose**: Job posting and recruitment features  
**Contains**:
- `jobListings.*` - Job list views
- `candidatePool.*` - Candidate management
- `jobOffers.*` - Job offer displays
- `tabs.*` - Tab labels
- `viewApplicantsModal.*` - Applicant modals
- `jobPostModal.*` - Job posting forms
- `jobDetailModal.*` - Job detail views
- `buttons.*`, `labels.*`, `filters.*`

**Size**: ~91 lines

---

### 6. **users**
**File**: `packages/translations/locales/{lang}/users.json`  
**Purpose**: User management and role management  
**Contains**:
- `all.*`, `admins.*`, `foundations.*`, etc. - User type sections
- `headers.*` - Table headers
- `status.*` - User status labels (pending, active, inactive)
- `buttons.*` - User management buttons
- `roleManagement.*` - Complete role management UI
  - Search, filters, table, user details drawer
  - Admin actions (change role, suspend, activate)

**Size**: ~77 lines

---

### 7. **marketplace**
**File**: `packages/translations/locales/{lang}/marketplace.json`  
**Purpose**: Marketplace for products and services  
**Contains**:
- Product listings
- Service cards
- Search and filters
- Ordering and requests

**Size**: ~35 lines

---

### 8. **content**
**File**: `packages/translations/locales/{lang}/content.json`  
**Purpose**: Content management (e-learning, HR docs, policies)  
**Contains**:
- `eLearning.*` - E-learning content
- `hrProcedures.*` - HR procedure documents
- `statePolicies.*` - State policy documents
- `contentManagementDashboard.*`
- `hrDocumentCard.*` - Document card components

**Size**: ~73 lines

---

### 9. **messages**
**File**: `packages/translations/locales/{lang}/messages.json`  
**Purpose**: Messaging and chat features  
**Contains**:
- Chat window elements
- Conversation lists
- Message composition
- Empty states

**Size**: ~15 lines

---

### 10. **admin**
**File**: `packages/translations/locales/{lang}/admin.json`  
**Purpose**: Admin panel and system management  
**Contains**:
- `partners.*` - Partner management
- `platformSettings.*` - Platform settings
- `designSystem.*` - Design system pages
- `discountTerminations.*` - Discount management

**Size**: ~97 lines

---

### 11. **settings**
**File**: `packages/translations/locales/{lang}/settings.json`  
**Purpose**: User settings and preferences  
**Contains**:
- `page.*` - Settings page structure
- `accountSecurity.*` - Account settings
- `personalInfo.*` - Personal information
- `changePassword.*` - Password management
- `notifications.*` - Notification preferences
- `language.*` - Language settings

**Size**: ~33 lines

---

### 12. **pricing**
**File**: `packages/translations/locales/{lang}/pricing.json`  
**Purpose**: Pricing plans and subscription management  
**Contains**:
- `hero.*` - Pricing page hero section
- `tabs.*` - Plan type tabs
- Plan details for different user types
- Feature lists and pricing tables

**Size**: ~156 lines

---

### 13. **parentLeadForm**
**File**: `packages/translations/locales/{lang}/parentLeadForm.json`  
**Purpose**: Parent lead generation form  
**Contains**:
- Form fields for parent inquiries
- Validation messages
- Submission flow

**Size**: ~35 lines

---

## Key Configuration Details

### Default Behavior
```typescript
defaultNS: 'common'  // Keys without namespace prefix default to 'common'
nsSeparator: ':'     // Use colon to specify namespace: t('common:buttons.login')
keySeparator: '.'    // Use dot for nested keys: t('buttons.login')
```

### Namespace Resolution Order
1. If namespace specified: `t('signup:title')` → looks in `signup` namespace only
2. If no namespace: `t('buttons.login')` → looks in `defaultNS` (`common`)
3. If component declares multiple namespaces: `useTranslation(['auth', 'common'])`
   - First searches in 'auth' namespace
   - Falls back to 'common' if not found

### Known Issues / Duplications

1. **loginPage.*** keys exist in BOTH:
   - `common.json` (lines 148-185)
   - `auth.json` (lines 163-185)

2. **signupPage.*** keys exist in BOTH:
   - `auth.json` (lines 30-162)
   - `signup.json` (as root-level keys)

3. **buttons.*** keys exist in:
   - `common.json` (main location)
   - Various other namespaces (nested in modal/component sections)

4. **Naming Inconsistency**:
   - Some pages use singular: `role.*` (in signup.json)
   - Same page has plural: `roles.*` (also in signup.json, but as objects)

---

## Recommendations

1. **Remove Duplicates**: Consolidate `loginPage` and `signupPage` keys - pick ONE namespace
2. **Namespace Prefixes**: Always use explicit prefixes (`common:`, `auth:`, etc.) to avoid ambiguity
3. **Clean Up auth.json**: This file has massive overlap with other namespaces
4. **Consistent Structure**: Decide if keys should be at namespace root or under page-specific sections

---

## Total Statistics

- **Total Namespaces**: 13
- **Total Languages**: 3 (en, fr, de)
- **Total Translation Files**: 39 (13 × 3)
- **Estimated Total Keys**: ~2,500+ keys across all languages
- **Largest Namespace**: `common.json` (~1,050 lines)
- **Smallest Namespace**: `messages.json` (~15 lines)
