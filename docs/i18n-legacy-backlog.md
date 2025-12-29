# i18n Legacy Backlog

> **Last Updated:** 12/29/2025, 5:16:28 PM
> 
> **Purpose:** Tracking document only - these issues do NOT block commits or releases.
> Fix them incrementally when working in affected files.

## Summary

- **Total Legacy Issues:** 108
- **High Confidence:** 31
- **Medium Confidence:** 77

### By Area

| Area | High | Medium | Total |
|------|------|--------|-------|
| Frontend | 8 | 48 | 56 |
| Admin | 0 | 23 | 23 |
| UI Package | 0 | 0 | 0 |
| Translations | 23 | 6 | 29 |
| Other | 0 | 0 | 0 |

---

## Issues by File

### Frontend

#### `frontend/types.ts`

**Total:** 10 (4 high, 6 medium)

**High Confidence:**

- Line 497: `"Education Policy"`
- Line 497: `"Education Policy"`
- Line 501: `"Data Privacy"`
- Line 501: `"Data Privacy"`

**Medium Confidence:**

- Line 428: `"Child Development"`
- Line 428: `"Child Development"`
- Line 435: `"Other Content"`
- Line 500: `"Child Protection"`
- Line 500: `"Child Protection"`
- Line 1118: `"New Client"`

---

#### `frontend/pages/StatePoliciesPage.tsx`

**Total:** 4 (2 high, 2 medium)

**High Confidence:**

- Line 236: `"Education Policy"`
- Line 240: `"Data Privacy"`

**Medium Confidence:**

- Line 27: `"In Review"`
- Line 239: `"Child Protection"`

---

#### `frontend/sentry.config.ts`

**Total:** 2 (1 high, 1 medium)

**High Confidence:**

- Line 38: `"Send Feedback"`

**Medium Confidence:**

- Line 95: `"Failed to fetch"`

---

#### `frontend/components/availability/DateOverrideModal.tsx`

**Total:** 1 (1 high, 0 medium)

**High Confidence:**

- Line 125: `"Edit Date Override"`

---

#### `frontend/components/supplier/ProductUploadModal.tsx`

**Total:** 9 (0 high, 9 medium)

**Medium Confidence:**

- Line 90: `"In Stock"`
- Line 91: `"Low Stock"`
- Line 92: `"Out of Stock"`
- Line 115: `"In Stock"`
- Line 144: `"In Stock"`
- Line 229: `"In Stock"`
- Line 281: `"In Stock"`
- Line 418: `"Product Intake"`
- Line 475: `"Highlight a key benefit"`

---

#### `frontend/pages/supplier/SupplierProductListingsPage.tsx`

**Total:** 8 (0 high, 8 medium)

**Medium Confidence:**

- Line 107: `"In Stock"`
- Line 109: `"Low Stock"`
- Line 111: `"Out of Stock"`
- Line 225: `"Organization required"`
- Line 386: `"Product deleted"`
- Line 399: `"Unable to delete product"`
- Line 545: `"In Stock"`
- Line 552: `"In Stock"`

---

#### `frontend/hooks/useAuthenticatedApi.ts`

**Total:** 7 (0 high, 7 medium)

**Medium Confidence:**

- Line 29: `"Authentication token not available"`
- Line 66: `"An unexpected error occurred"`
- Line 84: `"Authentication token not available"`
- Line 129: `"An unexpected error occurred"`
- Line 146: `"Authentication token not available"`
- Line 158: `"An unexpected error occurred"`
- Line 172: `"Authentication token not available"`

---

#### `frontend/constants.ts`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 28: `"Lower Saxony"`
- Line 205: `"Recruitment module"`

---

#### `frontend/contexts/MessagingContext.tsx`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 416: `"An unknown error occurred"`
- Line 455: `"An unknown error occurred"`

---

#### `frontend/hooks/usePricingTranslations.ts`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 31: `"Recruitment module"`
- Line 40: `"Dedicated account manager"`

---

#### `frontend/pages/admin/AdminSystemMonitoringPage.tsx`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 112: `"Health Check"`
- Line 119: `"Health Check"`

---

#### `frontend/providers/AuthProvider.tsx`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 167: `"Authentication token not available"`
- Line 465: `"Authentication token not available"`

---

#### `frontend/services/api.ts`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 149: `"An error occurred"`
- Line 197: `"An unexpected error occurred"`

---

#### `frontend/tests/unit/recruitment.adapter.test.ts`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 12: `"Educatrice bilingue"`
- Line 28: `"Educatrice bilingue"`

---

#### `frontend/pages/admin/ContentManagementDashboardPage.tsx`

**Total:** 1 (0 high, 1 medium)

**Medium Confidence:**

- Line 149: `"Super Admin"`

---

### Admin

#### `admin/src/components/AddCandidateModal.tsx`

**Total:** 6 (0 high, 6 medium)

**Medium Confidence:**

- Line 26: `"Available Immediately"`
- Line 30: `"Not Currently Available"`
- Line 34: `"Early Childhood Education"`
- Line 35: `"Child Development"`
- Line 36: `"Curriculum Planning"`
- Line 41: `"Parent Communication"`

---

#### `admin/src/components/HealthCheck.tsx`

**Total:** 6 (0 high, 6 medium)

**Medium Confidence:**

- Line 60: `"Main Logo"`
- Line 61: `"Admin Logo"`
- Line 63: `"Admin Favicon"`
- Line 64: `"Hero Image"`
- Line 70: `"File Reachable"`
- Line 71: `"Valid Content Type"`

---

#### `admin/src/components/AddJobListingModal.tsx`

**Total:** 4 (0 high, 4 medium)

**Medium Confidence:**

- Line 47: `"Early Childhood Education Degree"`
- Line 49: `"Valid childcare certification"`
- Line 51: `"Background check required"`
- Line 58: `"Paid time off"`

---

#### `admin/src/constants/design-system.ts`

**Total:** 2 (0 high, 2 medium)

**Medium Confidence:**

- Line 129: `"PCS Super Admin"`
- Line 308: `"Team Meeting"`

---

#### `admin/src/components/ContentUploadModal.tsx`

**Total:** 1 (0 high, 1 medium)

**Medium Confidence:**

- Line 640: `"In Review"`

---

#### `admin/src/components/FileUploadComponent.tsx`

**Total:** 1 (0 high, 1 medium)

**Medium Confidence:**

- Line 167: `"Drop file here"`

---

#### `admin/src/components/UniversalFileUploader.tsx`

**Total:** 1 (0 high, 1 medium)

**Medium Confidence:**

- Line 118: `"File type information not loaded"`

---

#### `admin/src/components/auth/AdminCustomSignupFormNew.tsx`

**Total:** 1 (0 high, 1 medium)

**Medium Confidence:**

- Line 295: `"Organization Name"`

---

#### `admin/src/types/subscription.ts`

**Total:** 1 (0 high, 1 medium)

**Medium Confidence:**

- Line 324: `"Grace Period"`

---

### Translations

#### `packages/translations/src/constants.ts`

**Total:** 29 (23 high, 6 medium)

**High Confidence:**

- Line 22: `"Save"`
- Line 23: `"Cancel"`
- Line 24: `"Submit"`
- Line 25: `"Add"`
- Line 26: `"Edit"`
- Line 27: `"Delete"`
- Line 29: `"Go Back"`
- Line 30: `"Login"`
- Line 47: `"Welcome"`
- Line 50: `"Loading"`
- Line 51: `"Error"`
- Line 53: `"Warning"`
- Line 54: `"Info"`
- Line 59: `"Open"`
- Line 60: `"Search"`
- Line 61: `"Filter"`
- Line 62: `"Sort"`
- Line 63: `"View"`
- Line 64: `"Download"`
- Line 65: `"Upload"`
- Line 67: `"Send"`
- Line 68: `"Create"`
- Line 69: `"Update"`

**Medium Confidence:**

- Line 31: `"Sign Up"`
- Line 36: `"Nom de famille"`
- Line 37: `"Phone Number"`
- Line 40: `"Service Provider"`
- Line 41: `"Product Supplier"`
- Line 48: `"Tableau de bord"`

---


---

*This document is auto-generated from `scripts/i18n-hardcoded-report.json`*
*Run `node scripts/generate-legacy-backlog.mjs` to regenerate*
