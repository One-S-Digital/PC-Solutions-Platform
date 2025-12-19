# 🌍 i18n Translation System Documentation

## Overview

This document describes the internationalization (i18n) system for the PC Solutions Platform. The system is built on **react-i18next** with a namespace-based architecture for scalability and type safety.

## 📁 Structure

```
packages/translations/locales/
├─ en/ (English - Default)
│  ├─ common.json          # Global UI elements
│  ├─ auth.json            # Authentication flows
│  ├─ dashboard.json       # Dashboard screens
│  ├─ pricing.json         # Pricing plans
│  ├─ signup.json          # Sign-up flow
│  ├─ parentLeadForm.json  # Parent enquiry form
│  ├─ marketplace.json     # Products & services
│  ├─ recruitment.json     # Jobs & candidates
│  ├─ users.json           # User management
│  ├─ content.json         # E-Learning/HR/Policies
│  ├─ messages.json        # Messaging system
│  ├─ admin.json           # Admin features
│  └─ settings.json        # User settings
├─ fr/ (French)            # Same structure
└─ de/ (German)            # Same structure
```

## 🎯 Namespace Guidelines

### When to Create a New Namespace

Create a new namespace when:
- ✅ You're building a new major feature (e.g., `payments.json`)
- ✅ A feature has 20+ unique translation keys
- ✅ Content is logically separate from existing namespaces

**Don't create** a new namespace for:
- ❌ Small components (use `common.json`)
- ❌ Fewer than 10 keys (use existing namespace)
- ❌ Temporary features

### Namespace Size Limits

- **Optimal**: 50-300 keys per namespace
- **Warning**: 300-500 keys (consider splitting)
- **Action Required**: 500+ keys (must split)

## 💻 Usage

### 1. Basic Usage

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation(['myNamespace', 'common']);
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('common:buttons.submit')}</button>
    </div>
  );
}
```

### 2. With TypeScript Type Safety

```typescript
import { useTranslation } from 'react-i18next';
import type { I18nKey } from '@/i18n/types';

function MyComponent() {
  const { t } = useTranslation(['myNamespace', 'common']);
  
  // TypeScript will autocomplete and validate keys!
  const key: I18nKey = 'myNamespace:title'; // ✅
  const invalid: I18nKey = 'fake:key';      // ❌ Type error
  
  return <h1>{t(key)}</h1>;
}
```

### 3. With Interpolation

```typescript
// In JSON
{
  "greeting": "Hello, {{name}}!",
  "itemCount": "You have {{count}} items"
}

// In code
t('greeting', { name: 'John' })        // "Hello, John!"
t('itemCount', { count: 5 })           // "You have 5 items"
```

### 4. Namespace Colon Syntax

```typescript
// Explicit namespace (recommended for cross-namespace usage)
t('common:buttons.login')
t('auth:errors.invalidCredentials')

// Implicit namespace (when using useTranslation(['myNs']))
const { t } = useTranslation(['signup']);
t('title')  // Uses signup:title
```

## 🛠️ Development Tools

### 1. Generate TypeScript Types

Automatically generate type-safe keys from translation files:

```bash
npm run generate:i18n-types
```

**Output**: `frontend/i18n/types.ts` with IntelliSense support

### 2. Extract Used Keys

Find all translation keys used in your codebase:

```bash
npm run extract:i18n-keys
```

**Output**: `i18n-used-keys.json` with usage statistics

### 3. Check for Missing Keys

Verify all used keys exist in all languages:

```bash
npm run check:i18n-keys
```

**Output**: 
- ✅ Success if all keys exist
- ❌ Failure with detailed report if keys are missing

### 4. Full i18n Check

Run all checks in sequence:

```bash
npm run i18n:full-check
```

## 🔒 CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/i18n-check.yml` workflow automatically:

1. **Extracts** all translation keys from code
2. **Validates** keys exist in all languages (en/fr/de)
3. **Generates** TypeScript types
4. **Runs** ESLint checks for hardcoded strings
5. **Comments** on PRs with missing keys report

### Pre-commit Hook (Optional)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run check:i18n-keys
```

## 📋 ESLint Rules

The `eslint-plugin-i18next` prevents hardcoded strings in JSX:

```typescript
// ❌ ESLint Warning
<button>Click me</button>

// ✅ Correct
<button>{t('common:buttons.clickMe')}</button>
```

**Configuration** (`frontend/.eslintrc.cjs`):
- Only checks JSX/TSX markup content
- Ignores technical attributes (className, id, etc.)
- Allows constants and route paths

## 📝 Adding New Translations

### Step 1: Add Keys to JSON

```json
// packages/translations/locales/en/myNamespace.json
{
  "title": "My Feature",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "messages": {
    "success": "Operation successful!"
  }
}
```

### Step 2: Register Namespace

```typescript
// frontend/i18n.ts
import myNamespaceEn from '@workspace/translations/locales/en/myNamespace.json';
import myNamespaceFr from '@workspace/translations/locales/fr/myNamespace.json';
import myNamespaceDe from '@workspace/translations/locales/de/myNamespace.json';

i18n.init({
  ns: ['common', 'auth', 'myNamespace', /* ... */],
  resources: {
    en: {
      common: commonEn,
      // ...
      myNamespace: myNamespaceEn,
    },
    // ... fr, de
  },
});
```

### Step 3: Generate Types

```bash
npm run generate:i18n-types
```

### Step 4: Use in Code

```typescript
const { t } = useTranslation(['myNamespace', 'common']);
return <h1>{t('title')}</h1>;
```

## 🚨 Common Issues & Solutions

### Issue: "Translation key not found"

**Cause**: Key doesn't exist in JSON file

**Solution**:
1. Check spelling: `t('common:buttons.login')` vs `t('common:button.login')`
2. Verify namespace is loaded: `useTranslation(['common'])`
3. Run: `npm run check:i18n-keys`

### Issue: "Keys showing instead of text"

**Cause**: Missing translation in JSON or wrong namespace

**Solution**:
1. Check if key exists: `packages/translations/locales/en/namespace.json`
2. Verify namespace in `i18n.ts` config
3. Run: `npm run extract:i18n-keys` to see what's being used

### Issue: TypeScript errors on translation keys

**Cause**: Types are out of date

**Solution**:
```bash
npm run generate:i18n-types
```

### Issue: CI failing on missing keys

**Cause**: New keys added to code but not to translation files

**Solution**:
1. Check the GitHub Actions artifact for the report
2. Add missing keys to all language files (en/fr/de)
3. Run: `npm run check:i18n-keys` locally to verify

## 🎨 Best Practices

### 1. Key Naming Convention

```json
{
  // ✅ Good: Descriptive, hierarchical
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Invalid email address"
  },
  
  // ❌ Bad: Flat, unclear
  "btn1": "Submit",
  "err": "Error"
}
```

### 2. Avoid Overly Nested Keys

```json
// ✅ Good: 2-3 levels deep
{
  "user": {
    "profile": {
      "title": "User Profile"
    }
  }
}

// ❌ Bad: Too deep
{
  "pages": {
    "dashboard": {
      "sections": {
        "user": {
          "profile": {
            "header": {
              "title": "User Profile"
            }
          }
        }
      }
    }
  }
}
```

### 3. Use Common for Shared UI

Place frequently reused elements in `common.json`:
- Buttons (Save, Cancel, Submit, etc.)
- Form labels (Email, Password, Name, etc.)
- Common messages (Success, Error, Loading, etc.)

### 4. Namespace Isolation

Each feature should be self-contained:

```typescript
// ✅ Good
const { t } = useTranslation(['signup', 'common']);
t('title')                    // signup:title
t('common:buttons.next')      // common:buttons.next

// ❌ Avoid mixing features
t('loginPage.forgotPassword')  // Don't use login keys in signup
```

## 📊 Monitoring & Metrics

### Key Usage Report

```bash
npm run extract:i18n-keys
```

Shows:
- Total unique keys
- Keys per namespace
- Most used keys
- Files using each key

### Missing Keys Report

```bash
npm run check:i18n-keys
```

Shows:
- Missing keys per language
- Where they're used
- Namespace breakdown

### Type Safety Coverage

Generated types provide:
- ✅ Autocomplete in IDEs
- ✅ Compile-time validation
- ✅ Refactoring safety

## 🔄 Migration Guide

### From Old to New System

**Before**:
```typescript
const { t } = useTranslation(['dashboard', 'common']);
t('signupPage.title')
t('common.perMonth')
```

**After**:
```typescript
const { t } = useTranslation(['signup', 'common']);
t('title')
t('common:perMonth')
```

### Bulk Migration Script

Use `sed` for quick replacements:

```bash
# Update namespace in useTranslation
sed -i "s/useTranslation(\['dashboard'/useTranslation(['myFeature'/g" MyPage.tsx

# Remove old prefix
sed -i "s/t('oldPrefix\./t('/g" MyPage.tsx
```

## 📚 Resources

- [react-i18next docs](https://react.i18next.com/)
- [i18next docs](https://www.i18next.com/)
- [eslint-plugin-i18next](https://github.com/edvardchen/eslint-plugin-i18next)

## 🤝 Contributing

When adding new features:

1. Create namespace if needed (20+ keys)
2. Add keys to all languages (en/fr/de)
3. Register in `i18n.ts`
4. Generate types: `npm run generate:i18n-types`
5. Use in code with type safety
6. Run checks: `npm run i18n:full-check`
7. Commit all changes together

---

**Questions?** Check the CI output or run `npm run i18n:full-check` for diagnostics.
