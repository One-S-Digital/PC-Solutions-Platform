# Translation Regression Root Cause Analysis

## Issue Summary

Translation string errors resurfaced in the UI after they were previously fixed, with errors like:
- `key 'roles.foundation (en)' returned an object instead of string`
- `key 'roles.supplier (en)' returned an object instead of string`
- `key 'roles.serviceProvider (en)' returned an object instead of string`
- `key 'roles.parent (en)' returned an object instead of string`

## Root Cause

The regression was introduced in **commit c53921039** ("Refactor: Update translation keys and add missing ones") where an automated migration script (`scripts/fix-translation-keys.mjs`) was run to refactor translation keys.

### The Problem

The script incorrectly transformed translation keys:
- **Before**: `t('signupPage.roles.foundation')` 
- **After**: `t('roles.foundation')` ❌ WRONG

### Why This Caused the Error

In the `signup.json` translation files (all languages: en, fr, de), there are TWO separate structures:

1. **`role` (singular)** - Simple string values:
```json
"role": {
  "foundation": "Foundation (Daycare)",
  "productSupplier": "Product Supplier",
  "serviceProvider": "Service Provider",
  "parent": "Parent",
  ...
}
```

2. **`roles` (plural)** - Nested object structure:
```json
"roles": {
  "foundation": {
    "label": "Foundation (Daycare)",
    "description": "Manage your daycare operations..."
  },
  "productSupplier": {
    "label": "Product Supplier",
    "description": "Sell products to childcare organizations"
  },
  ...
}
```

When the code used `t('roles.foundation')`, i18next returned the **entire object** `{ label: "...", description: "..." }` instead of a string, causing the error.

## The Fix

### 1. Fixed SignupPage.tsx (frontend/pages/SignupPage.tsx)

Changed the role configuration to use the **singular** form:

```typescript
const rolesConfig: { role: SignupRole; nameKey: string; icon: React.ElementType }[] = [
  { role: SignupRole.FOUNDATION, nameKey: 'role.foundation', icon: BuildingOffice2Icon },     // ✅ Changed
  { role: SignupRole.SUPPLIER, nameKey: 'role.supplier', icon: UserIcon },                     // ✅ Changed
  { role: SignupRole.SERVICE_PROVIDER, nameKey: 'role.serviceProvider', icon: CogIcon },       // ✅ Changed
  { role: SignupRole.PARENT, nameKey: 'role.parent', icon: UsersIcon },                        // ✅ Changed
];
```

### 2. Fixed Migration Script (scripts/fix-translation-keys.mjs)

Updated the pattern replacement to use singular form:

```javascript
{
  name: 'signupPage.roles.*',
  find: /t\(['"`]signupPage\.roles\.([a-zA-Z0-9]+)['"`]/g,
  replace: "t('role.$1'",  // ✅ Changed to 'role' (singular)
  namespace: 'signup'
},
```

## Impact

- **Files Modified**: 2
  - `frontend/pages/SignupPage.tsx` - Fixed role key references
  - `scripts/fix-translation-keys.mjs` - Prevented future regressions

- **Affected Languages**: All (en, fr, de)
- **Affected Roles**: foundation, supplier, serviceProvider, parent

## Prevention

1. The migration script has been corrected to prevent this issue from recurring if run again
2. The translation structure should be reviewed to determine if both `role` and `roles` structures are needed, or if one should be removed for clarity

## Alternative Solutions (Not Implemented)

If the nested `roles` structure needs to be used instead, the code would need to reference:
- `t('roles.foundation.label')` for the label
- `t('roles.foundation.description')` for the description

However, since the simple `role` structure already exists and serves the current need, using it is the simpler solution.

## Testing Recommendations

1. Verify signup page displays role names correctly in all languages (en, fr, de)
2. Test role selection flow to ensure no translation errors appear
3. Check browser console for any remaining translation-related warnings
4. Verify the role names appear in the page title after role selection

## Date

Analysis completed: 2025-10-11
Branch: `cursor/investigate-translation-string-regression-0fc9`
