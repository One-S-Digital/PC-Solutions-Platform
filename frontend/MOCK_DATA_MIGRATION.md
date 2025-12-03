# Mock Data Migration Guide

This document tracks all places where mock/placeholder data is used in the frontend and needs to be replaced with real API integration.

## Completed Migrations

### Constants Renamed (✅ Done)
All `MOCK_*` constants in `constants.ts` have been renamed to more appropriate names:

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `MOCK_PLATFORM_SETTINGS` | `DEFAULT_PLATFORM_SETTINGS` | Platform configuration defaults |
| `MOCK_POLICY_ALERTS` | `INITIAL_POLICY_ALERTS` | Empty initial state |
| `MOCK_PARENT_LEADS` | `INITIAL_PARENT_LEADS` | Empty initial state |
| `MOCK_CANDIDATE_PROFILES` | `INITIAL_CANDIDATE_PROFILES` | Empty initial state |
| `MOCK_PRODUCTS` | `INITIAL_PRODUCTS` | Empty initial state |
| `MOCK_SERVICES` | `INITIAL_SERVICES` | Empty initial state |
| `MOCK_JOB_LISTINGS` | `INITIAL_JOB_LISTINGS` | Empty initial state |
| `MOCK_APPLICATIONS` | `INITIAL_APPLICATIONS` | Empty initial state |
| `MOCK_SERVICE_REQUESTS` | `INITIAL_SERVICE_REQUESTS` | Empty initial state |
| `MOCK_ORDERS` | `INITIAL_ORDERS` | Empty initial state |
| `MOCK_CONVERSATIONS` | `INITIAL_CONVERSATIONS` | Empty initial state |
| `MOCK_MESSAGES` | `INITIAL_MESSAGES` | Empty initial state |
| `MOCK_NOTIFICATIONS` | `INITIAL_NOTIFICATIONS` | Empty initial state |
| `MOCK_HR_DOCS` | `INITIAL_HR_DOCS` | Empty initial state |
| `MOCK_COURSES` | `INITIAL_COURSES` | Empty initial state |
| `MOCK_POLICY_DOCS` | `INITIAL_POLICY_DOCS` | Empty initial state |
| `MOCK_ORDER_REQUESTS` | `INITIAL_ORDER_REQUESTS` | Empty initial state |
| `MOCK_VENDOR_CLIENTS` | `INITIAL_VENDOR_CLIENTS` | Empty initial state |
| `MOCK_ORGANIZATIONS` | `INITIAL_ORGANIZATIONS` | Empty initial state |
| `MOCK_SYSTEM_LOGS` | `INITIAL_SYSTEM_LOGS` | Empty initial state |
| `MOCK_SECURITY_ALERTS` | `INITIAL_SECURITY_ALERTS` | Empty initial state |
| `MOCK_FOUNDATION_SETTINGS` | `DEFAULT_ADMIN_FOUNDATION_SETTINGS` | Admin form defaults |
| `MOCK_PRICING_PLANS` | `PRICING_PLANS` | Actual pricing data |
| `MOCK_CONTENT_MODERATION_ITEMS` | `INITIAL_CONTENT_MODERATION_ITEMS` | Empty initial state |
| `MOCK_SYSTEM_MONITORING_DATA` | `DEFAULT_SYSTEM_MONITORING_DATA` | System monitoring structure |
| `MOCK_SUPPLIER_SETTINGS` | `DEFAULT_ADMIN_SUPPLIER_SETTINGS` | Admin form defaults |
| `MOCK_PROVIDER_SETTINGS` | `DEFAULT_ADMIN_PROVIDER_SETTINGS` | Admin form defaults |
| `MOCK_PARTNERS` | `INITIAL_PARTNERS` | Empty initial state |
| `MOCK_LOG_ENTRIES` | `INITIAL_LOG_ENTRIES` | Empty initial state |

**Note:** Backward-compatible aliases are maintained in `constants.ts` for gradual migration.

## Pending API Integrations

### High Priority - Core Functionality

#### 1. Orders & E-Commerce (`components/cart/OrderSummaryDrawer.tsx`)
**Current State:** Orders are pushed to local `INITIAL_ORDERS` array
**Needed:** Real API call to `/api/orders` to submit orders

```typescript
// TODO: Replace with real API call
INITIAL_ORDERS.push(newOrder);
```

#### 2. Messaging System (`contexts/MessagingContext.tsx`)
**Current State:** Messages stored in local `INITIAL_MESSAGES` and `INITIAL_CONVERSATIONS`
**Needed:** Real-time messaging API integration

Areas to update:
- `loadUserConversations` - fetch from API
- `loadMessagesForConversation` - fetch from API
- `sendMessage` - POST to API
- `markConversationAsRead` - PATCH to API
- `startConversation` - POST to API

#### 3. Supplier Dashboard (`pages/supplier/SupplierDashboardPage.tsx`)
**Current State:** Uses `INITIAL_PRODUCTS`, `INITIAL_ORDERS`, `INITIAL_ORGANIZATIONS`
**Needed:** Fetch data from API based on current user's organization

#### 4. Supplier Orders (`pages/supplier/SupplierOrdersPage.tsx`)
**Current State:** Uses `INITIAL_ORDERS`, `INITIAL_ORGANIZATIONS`
**Needed:** Fetch orders from `/api/supplier/orders`

### Medium Priority - Admin & Monitoring

#### 5. System Monitoring (`pages/admin/AdminSystemMonitoringPage.tsx`)
**Current State:** Uses `DEFAULT_SYSTEM_MONITORING_DATA`, `INITIAL_LOG_ENTRIES`
**Needed:** Real API endpoints for:
- `/api/admin/system-status` - System health
- `/api/admin/logs` - Log entries
- `/api/admin/metrics` - Performance metrics

#### 6. Discount Terminations (`pages/admin/DiscountTerminationsPage.tsx`)
**Current State:** Uses `INITIAL_ORGANIZATIONS`
**Needed:** API for vendor client relationships and termination management

#### 7. Content Management Dashboard (`pages/admin/ContentManagementDashboardPage.tsx`)
**Current State:** Local state for courses, HR docs, policies
**Needed:** Already uses API for fetching, but local state for mock activity

### Lower Priority - Fallback Data

These pages already use API calls but fall back to empty arrays:

#### 8. E-Learning Page (`pages/ELearningPage.tsx`)
- Uses `/content/elearning` API ✅
- Falls back to `INITIAL_COURSES` (empty array) on error

#### 9. State Policies Page (`pages/StatePoliciesPage.tsx`)
- Uses `/content/state-policies` API ✅
- Falls back to `INITIAL_POLICY_DOCS` (empty array) on error
- `INITIAL_POLICY_ALERTS` for alerts management

#### 10. HR Procedures Page (`pages/HRProceduresPage.tsx`)
- Uses `/content/hr-documents` API ✅
- Falls back to `INITIAL_HR_DOCS` (empty array) on error

#### 11. Partners Page (`pages/PartnersPage.tsx`)
**Current State:** Displays `INITIAL_PARTNERS` (empty array)
**Needed:** API endpoint for partner listings

#### 12. Service Provider Pages
- `ServiceProviderRequestsPage.tsx` - Uses `INITIAL_ORGANIZATIONS`
- `ServiceProviderListingsPage.tsx` - Uses `INITIAL_SERVICES`

### Static Configuration (Keep as is)

These are not mock data but actual configuration:
- `PRICING_PLANS` - Actual business pricing (could be moved to CMS/DB in future)
- `DEFAULT_PLATFORM_SETTINGS` - Platform defaults (should come from backend config)
- `DEFAULT_ADMIN_*_SETTINGS` - Form defaults for admin interfaces
- `SUGGESTED_*` constants - Suggestion lists for forms

## API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders` | POST | Submit new orders |
| `/api/orders?supplierId=X` | GET | Get supplier orders |
| `/api/conversations` | GET/POST | Messaging |
| `/api/conversations/:id/messages` | GET/POST | Messages |
| `/api/admin/system-status` | GET | System monitoring |
| `/api/admin/logs` | GET | Log entries |
| `/api/partners` | GET | Partner listings |
| `/api/vendor-clients` | GET/PATCH | Vendor client management |

## Migration Strategy

1. **Phase 1 (Critical):** Orders & E-Commerce
2. **Phase 2 (Important):** Messaging System
3. **Phase 3 (Admin):** System Monitoring & Admin Tools
4. **Phase 4 (Enhancement):** Partner Listings, Service Provider tools

## Testing Checklist

After each migration:
- [ ] Verify data loads correctly from API
- [ ] Test error handling (API failures should show appropriate messages)
- [ ] Verify loading states are displayed
- [ ] Test empty state handling
- [ ] Confirm no TypeScript errors
- [ ] Test with real user authentication
