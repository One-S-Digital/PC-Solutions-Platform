# View Plans Button Fix

## Issue
The "View Plans" button on the login page (`/frontend/pages/LoginPage.tsx`) was not working because it linked to `/pricing`, but:
1. The `/pricing` route did not exist in production mode
2. The `PricingPage` component did not exist
3. In E2E mode, the route was referenced but the component was not imported

## Root Cause
- The button was added to the login page but the corresponding pricing page and route were never created
- This caused the button to navigate to a non-existent route, resulting in a 404 or redirect

## Solution Implemented

### 1. Created PricingPage Component
**File:** `/workspace/frontend/pages/PricingPage.tsx`

Features:
- Displays all pricing plans from `PRICING_PLANS` constant
- Separate sections for:
  - Daycare Centers (Foundation plans with Basic, Essential, Professional tiers)
  - Suppliers & Service Providers (custom pricing plans)
- Monthly/Annual billing toggle for daycare plans
- Responsive design with mobile support
- Multilingual support (EN/FR/DE)
- Call-to-action buttons linking to signup
- Back button for easy navigation
- Language switcher in header
- Proper use of shared UI components (Card, Button, etc.)

### 2. Added Route to App.tsx
**File:** `/workspace/frontend/App.tsx`

Changes:
- Imported `PricingPage` component (line 95)
- Added `/pricing` route in production mode (line 571)
- Route was already present in E2E mode but now properly imported

### 3. Added Translation Keys
Updated translation files to support the new pricing page:

**Files:**
- `/workspace/packages/translations/locales/en/subscription.json`
- `/workspace/packages/translations/locales/fr/subscription.json`
- `/workspace/packages/translations/locales/de/subscription.json`

New translation keys:
- `pricingTitle`: "Choose Your Plan"
- `pricingSubtitle`: Descriptive subtitle
- `daycareHeader`: "For Daycare Centers"
- `daycareDescription`: Description for daycare section
- `partnersHeader`: "For Suppliers & Service Providers"
- `partnersDescription`: Description for partners section
- `popular`: "Most Popular" badge
- `monthly` / `annually`: Billing cycle labels
- `save10` / `savePercentage`: Savings indicators
- `needHelp`: Help section title
- `contactMessage`: Contact message for help section

## Testing Recommendations

1. **Manual Testing:**
   - Navigate to `/login` page
   - Click "View Plans" button
   - Verify pricing page displays correctly
   - Test billing toggle (monthly/annually)
   - Test language switcher
   - Test signup button navigation
   - Test back button functionality

2. **Visual Testing:**
   - Verify responsive design on mobile, tablet, desktop
   - Check plan cards display correctly
   - Verify "Most Popular" badge appears on Essential plan
   - Check pricing information displays properly

3. **E2E Testing:**
   - Add test to verify `/pricing` route is accessible
   - Test navigation from login page to pricing page
   - Test navigation from pricing page to signup page

## Related Files
- `/workspace/frontend/pages/LoginPage.tsx` (lines 448-451) - Contains the "View Plans" button
- `/workspace/frontend/constants.ts` (lines 158-252) - Contains `PRICING_PLANS` data
- `/workspace/frontend/services/pricingService.ts` - Pricing service utilities
- `/workspace/frontend/hooks/usePricingTranslations.ts` - Translation hook for pricing
- `/workspace/frontend/components/settings/sections/BillingSubscriptionSettings.tsx` - Similar plan card implementation

## Benefits
✅ Users can now view pricing plans before signing up
✅ Improved user experience with clear pricing information
✅ Multilingual support for international users
✅ Consistent design with existing components
✅ Mobile-responsive layout
✅ Easy navigation back to login or signup

## Notes
- The pricing data is sourced from the `PRICING_PLANS` constant in `constants.ts`
- Pricing is displayed in CHF (Swiss Francs)
- Daycare plans show 10% annual discount
- Supplier and Service Provider plans show "Contact us for pricing" approach
- All plans use the existing translation infrastructure via `usePricingTranslations` hook
