# 🌍 Translation System - Comprehensive Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Technical Specifications](#technical-specifications)
3. [Adding New Text - Implementation Guide](#adding-new-text---implementation-guide)
4. [Workflow Requirements](#workflow-requirements)
5. [Critical Compliance Notice](#critical-compliance-notice)
6. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## System Overview

### Architecture

The PC Solutions Platform uses a **dual-translation system** that separates static UI text from dynamic user-generated content:

1. **Static UI Translations (i18next)**
   - Handles all hardcoded UI text: buttons, labels, headings, error messages, etc.
   - Managed via JSON files in `packages/translations/locales/`
   - Uses `react-i18next` for React integration
   - Automatically extracted from source code using `i18next-parser`

2. **Dynamic Content Translations (Database)**
   - Handles user-generated content: profiles, descriptions, posts, job applications, etc.
   - Stored in database tables (`entity_sources` and `entity_translations`)
   - Auto-translated via background workers using machine translation (DeepL/Google)
   - Language detection and resolution handled by backend services

### Supported Languages

- **English (en)** - Default language
- **French (fr)** - Primary Swiss market language
- **German (de)** - Secondary Swiss market language

### Translation Files & Locations

#### Static UI Translation Files

```
packages/translations/locales/
├── en/                          # English (source language)
│   ├── common.json              # Global UI elements (buttons, labels, etc.)
│   ├── auth.json                # Authentication flows
│   ├── dashboard.json           # Dashboard screens
│   ├── pricing.json             # Pricing plans
│   ├── signup.json              # Sign-up flow
│   ├── parentLeadForm.json      # Parent enquiry form
│   ├── marketplace.json         # Products & services
│   ├── recruitment.json         # Jobs & candidates
│   ├── users.json               # User management
│   ├── content.json             # E-Learning/HR/Policies
│   ├── messages.json            # Messaging system
│   ├── admin.json               # Admin features
│   ├── settings.json            # User settings
│   └── profile.json             # Profile pages
├── fr/                          # French translations (same structure)
└── de/                          # German translations (same structure)
```

#### Configuration Files

- **Frontend i18n Config**: `frontend/i18n.ts`
- **Admin i18n Config**: `admin/src/i18n/index.ts`
- **i18next Parser Config (Frontend)**: `frontend/i18next-parser.config.js`
- **i18next Parser Config (Admin)**: `admin/i18next-parser.config.js`
- **Shared Translation Package**: `packages/translations/`
  - `src/hooks.ts` - React hooks with Swiss terminology support
  - `src/utils.ts` - Translation utilities
  - `src/types.ts` - TypeScript types

#### Backend Translation Files

- **Translation Service**: `api/src/translation/translation.service.ts`
- **Translation Controller**: `api/src/translation/translation.controller.ts`
- **Translation Config**: `api/src/translation/translation.config.ts`
- **Translation Queue Processor**: `api/src/translation/translation-queue.processor.ts`
- **Translation Module**: `api/src/translation/translation.module.ts`

#### Scripts & Tools

- `scripts/extract-i18n-keys.ts` - Extract translation keys from code
- `scripts/check-i18n-keys.ts` - Validate all keys exist in all languages
- `scripts/generate-i18n-types.ts` - Generate TypeScript types for translation keys
- `scripts/audit-translations.mjs` - Audit translation coverage
- `scripts/validate-translations.mjs` - Validate translation quality
- `scripts/find-hardcoded-strings.mjs` - Find hardcoded text in codebase

### How It Integrates with the Platform

1. **Frontend Application**
   - Uses `react-i18next` hook `useTranslation()` in all components
   - Automatically discovers translation namespaces via Vite's `import.meta.glob`
   - Loads translations from API in development, bundled files in production
   - Caches translations in IndexedDB for offline support

2. **Admin Application**
   - Same i18next setup as frontend
   - Shares translation files from `packages/translations/locales/`
   - Admin-specific translations can be added to `admin.json` namespace

3. **Backend API**
   - Provides REST endpoints for static translations: `/api/static-translations/{lang}/{namespace}`
   - Handles dynamic content translations via database
   - Background workers process translation jobs asynchronously
   - Language detection and machine translation integration

4. **CI/CD Pipeline**
   - GitHub Actions workflow validates translations on every PR
   - Checks for missing keys across all languages
   - Generates TypeScript types automatically
   - ESLint rules prevent hardcoded strings in JSX

---

## Technical Specifications

### Translation Libraries & Frameworks

#### Frontend Libraries

- **i18next** (`^25.2.1`) - Core internationalization framework
- **react-i18next** (`^16.0.0`) - React bindings for i18next
- **i18next-browser-languagedetector** (`^8.2.0`) - Automatic language detection
- **i18next-http-backend** (`^3.0.2`) - Load translations via HTTP
- **i18next-parser** - Extract translation keys from source code

#### Backend Libraries

- **DeepL API** - Machine translation provider (primary)
- **Google Translate API** - Fallback translation provider
- **BullMQ** - Background job queue for translation processing
- **Prisma** - Database ORM for translation storage

### File Structure for Translation Keys

Translation keys use a **hierarchical dot notation** structure:

```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit",
    "delete": "Delete"
  },
  "forms": {
    "validation": {
      "emailRequired": "Email is required",
      "passwordMinLength": "Password must be at least 8 characters"
    }
  },
  "pages": {
    "dashboard": {
      "title": "Dashboard",
      "welcome": "Welcome back, {{name}}!"
    }
  }
}
```

**Key Path Examples:**
- `buttons.save` → "Save"
- `forms.validation.emailRequired` → "Email is required"
- `pages.dashboard.welcome` → "Welcome back, {{name}}!"

### Naming Conventions for Translation Keys

#### ✅ Good Practices

1. **Use descriptive, hierarchical keys**
   ```json
   {
     "buttons": {
       "save": "Save",
       "cancel": "Cancel"
     },
     "errors": {
       "validation": {
         "required": "This field is required",
         "invalidEmail": "Invalid email address"
       }
     }
   }
   ```

2. **Group related keys together**
   - All buttons under `buttons.*`
   - All form validation under `forms.validation.*`
   - All error messages under `errors.*`

3. **Use camelCase for key names**
   - ✅ `saveButton`, `emailRequired`, `welcomeMessage`
   - ❌ `save_button`, `email-required`, `welcome_message`

4. **Keep nesting to 2-3 levels maximum**
   - ✅ `forms.validation.emailRequired`
   - ❌ `pages.dashboard.sections.user.profile.header.title`

#### ❌ Anti-Patterns

1. **Avoid generic or unclear keys**
   ```json
   // ❌ Bad
   {
     "text1": "Save",
     "button": "Cancel",
     "msg": "Error occurred"
   }
   
   // ✅ Good
   {
     "buttons": {
       "save": "Save",
       "cancel": "Cancel"
     },
     "errors": {
       "generic": "An error occurred"
     }
   }
   ```

2. **Don't use abbreviations**
   - ❌ `btn`, `err`, `msg`, `txt`
   - ✅ `button`, `error`, `message`, `text`

3. **Avoid flat structures for large namespaces**
   ```json
   // ❌ Bad - too flat
   {
     "dashboardTitle": "Dashboard",
     "dashboardWelcome": "Welcome",
     "dashboardStats": "Statistics"
   }
   
   // ✅ Good - hierarchical
   {
     "dashboard": {
       "title": "Dashboard",
       "welcome": "Welcome",
       "stats": "Statistics"
     }
   }
   ```

### Namespace Guidelines

#### When to Create a New Namespace

Create a new namespace when:
- ✅ Building a new major feature (e.g., `payments.json`)
- ✅ A feature has 20+ unique translation keys
- ✅ Content is logically separate from existing namespaces

**Don't create** a new namespace for:
- ❌ Small components (use `common.json`)
- ❌ Fewer than 10 keys (use existing namespace)
- ❌ Temporary features

#### Namespace Size Limits

- **Optimal**: 50-300 keys per namespace
- **Warning**: 300-500 keys (consider splitting)
- **Action Required**: 500+ keys (must split)

#### Current Namespaces

- `common` - Shared UI elements (buttons, labels, common terms)
- `auth` - Authentication and login flows
- `dashboard` - Dashboard screens and widgets
- `pricing` - Pricing plans and billing
- `signup` - User registration
- `parentLeadForm` - Parent enquiry forms
- `marketplace` - Products and services marketplace
- `recruitment` - Jobs and candidate management
- `users` - User management
- `content` - E-Learning, HR, Policies
- `messages` - Messaging system
- `admin` - Admin-specific features
- `settings` - User settings
- `profile` - Profile pages

---

## Adding New Text - Implementation Guide

### Static Text: Step-by-Step Instructions

Static text refers to hardcoded UI elements that don't change based on user data: buttons, labels, headings, error messages, etc.

#### Step 1: Identify the Text

Before adding any text to a component, ask:
- Is this text user-facing?
- Will this text appear in the UI?
- Does this text need to be translated?

If **YES** to all, it must use the translation system.

#### Step 2: Choose the Appropriate Namespace

- **Common UI elements** → `common.json`
- **Feature-specific** → Use the feature's namespace (e.g., `dashboard.json`, `auth.json`)
- **New major feature** → Create a new namespace file

#### Step 3: Add Translation Key to JSON Files

**Add the key to ALL language files** (en, fr, de):

```json
// packages/translations/locales/en/common.json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

```json
// packages/translations/locales/fr/common.json
{
  "buttons": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  }
}
```

```json
// packages/translations/locales/de/common.json
{
  "buttons": {
    "save": "Speichern",
    "cancel": "Abbrechen"
  }
}
```

#### Step 4: Use Translation in Component

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <button>{t('buttons.save')}</button>
      <button>{t('buttons.cancel')}</button>
    </div>
  );
}
```

#### Step 5: Verify Translation Works

1. Run the development server
2. Switch languages using the language switcher
3. Verify text changes correctly
4. Check browser console for missing key warnings

#### Complete Example: Adding a New Button

```tsx
// Before (❌ WRONG - Hardcoded)
function SaveButton() {
  return <button>Save</button>;
}

// After (✅ CORRECT - Translated)
import { useTranslation } from 'react-i18next';

function SaveButton() {
  const { t } = useTranslation('common');
  return <button>{t('buttons.save')}</button>;
}
```

**Translation files:**

```json
// en/common.json
{
  "buttons": {
    "save": "Save"
  }
}

// fr/common.json
{
  "buttons": {
    "save": "Enregistrer"
  }
}

// de/common.json
{
  "buttons": {
    "save": "Speichern"
  }
}
```

### Dynamic Text: Handling Data-Dependent Content

Dynamic text changes based on data or user input. There are two scenarios:

#### Scenario 1: Text with Variables (Interpolation)

When text includes dynamic values:

```tsx
import { useTranslation } from 'react-i18next';

function WelcomeMessage({ userName }: { userName: string }) {
  const { t } = useTranslation('dashboard');
  
  return <h1>{t('welcome', { name: userName })}</h1>;
}
```

**Translation files:**

```json
// en/dashboard.json
{
  "welcome": "Welcome back, {{name}}!"
}

// fr/dashboard.json
{
  "welcome": "Bon retour, {{name}} !"
}

// de/dashboard.json
{
  "welcome": "Willkommen zurück, {{name}}!"
}
```

#### Scenario 2: User-Generated Content (Database Translations)

For content created by users (profiles, descriptions, posts, etc.), use the **backend translation system**:

```typescript
// Backend: Save entity with translations
await translationService.saveEntityWithTranslations(
  'user',
  userId,
  {
    displayName: 'John Doe',
    bio: 'I am an educator passionate about early childhood development.'
  },
  ['displayName', 'bio'] // Translatable fields
);

// Frontend: Retrieve translated content
const response = await fetch(
  `/api/translation/entity/user/${userId}?lang=${currentLanguage}&fields=displayName,bio`
);
const { fields } = await response.json();
// fields.displayName and fields.bio are now in the requested language
```

**Key Points:**
- User-generated content is stored in the database
- Backend automatically detects source language
- Background workers translate to all supported languages
- Frontend requests content in the user's UI language

### Interpolated Text: Variables and Placeholders

i18next supports interpolation with variables, formatting, and pluralization.

#### Basic Interpolation

```tsx
const { t } = useTranslation('common');

// Translation file
{
  "greeting": "Hello, {{name}}!",
  "itemCount": "You have {{count}} items"
}

// Usage
t('greeting', { name: 'John' })        // "Hello, John!"
t('itemCount', { count: 5 })            // "You have 5 items"
```

#### Advanced Interpolation with Formatting

```tsx
// Translation file
{
  "price": "Price: {{price, currency}}",
  "date": "Created on {{date, date}}",
  "number": "Total: {{count, number}}"
}

// Usage
t('price', { price: 29.99 })           // "Price: CHF 29.99"
t('date', { date: new Date() })         // "Created on 12/25/2024"
t('number', { count: 1234 })            // "Total: 1,234"
```

#### Pluralization

```tsx
// Translation file
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items",
  "items_zero": "No items"
}

// Usage
t('items', { count: 0 })                // "No items"
t('items', { count: 1 })                // "1 item"
t('items', { count: 5 })                // "5 items"
```

**For languages with complex pluralization (like Russian), use the `count` key:**

```json
{
  "items_one": "{{count}} элемент",
  "items_few": "{{count}} элемента",
  "items_many": "{{count}} элементов",
  "items_other": "{{count}} элементов"
}
```

#### Multiple Variables

```tsx
// Translation file
{
  "userInfo": "User {{name}} ({{email}}) has {{count}} messages"
}

// Usage
t('userInfo', { 
  name: 'John', 
  email: 'john@example.com', 
  count: 5 
})
// "User John (john@example.com) has 5 messages"
```

#### Conditional Text

```tsx
// Translation file
{
  "status": "Status: {{status}}",
  "status_active": "Active",
  "status_inactive": "Inactive"
}

// Usage
const statusText = t(`status_${status}`); // "Active" or "Inactive"
t('status', { status: statusText })
```

### Code Examples for Each Scenario

#### Example 1: Simple Static Text

```tsx
// Component
import { useTranslation } from 'react-i18next';

function LoginForm() {
  const { t } = useTranslation(['auth', 'common']);
  
  return (
    <form>
      <h1>{t('auth:title')}</h1>
      <button type="submit">{t('common:buttons.login')}</button>
      <button type="button">{t('common:buttons.cancel')}</button>
    </form>
  );
}
```

```json
// en/auth.json
{
  "title": "Login"
}

// en/common.json
{
  "buttons": {
    "login": "Login",
    "cancel": "Cancel"
  }
}
```

#### Example 2: Text with Variables

```tsx
// Component
import { useTranslation } from 'react-i18next';

function UserProfile({ user }: { user: { name: string; email: string } }) {
  const { t } = useTranslation('profile');
  
  return (
    <div>
      <h1>{t('welcome', { name: user.name })}</h1>
      <p>{t('emailLabel', { email: user.email })}</p>
    </div>
  );
}
```

```json
// en/profile.json
{
  "welcome": "Welcome, {{name}}!",
  "emailLabel": "Email: {{email}}"
}
```

#### Example 3: Pluralization

```tsx
// Component
import { useTranslation } from 'react-i18next';

function ItemList({ items }: { items: any[] }) {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <p>{t('itemCount', { count: items.length })}</p>
    </div>
  );
}
```

```json
// en/common.json
{
  "itemCount": "{{count}} item",
  "itemCount_plural": "{{count}} items",
  "itemCount_zero": "No items"
}
```

#### Example 4: Dynamic Content (Database)

```tsx
// Component
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

function ServiceProviderCard({ providerId }: { providerId: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  
  const { data } = useQuery({
    queryKey: ['provider', providerId, currentLang],
    queryFn: async () => {
      const response = await fetch(
        `/api/translation/entity/service_provider/${providerId}?lang=${currentLang}&fields=name,about`
      );
      return response.json();
    }
  });
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>{data.fields.name}</h2>
      <p>{data.fields.about}</p>
    </div>
  );
}
```

---

## Workflow Requirements

### Process for Adding Translations When Implementing New Features

#### Step 1: Plan Your Translations

Before writing code:
1. Identify all user-facing text in your feature
2. Group text by namespace (use existing or create new)
3. List all translation keys you'll need
4. Determine which keys are static vs. dynamic

#### Step 2: Create/Update Translation Files

**For Static Text:**

1. **Add keys to English (source) file first:**
   ```json
   // packages/translations/locales/en/myFeature.json
   {
     "title": "My New Feature",
     "buttons": {
       "save": "Save",
       "cancel": "Cancel"
     }
   }
   ```

2. **Add same keys to French file:**
   ```json
   // packages/translations/locales/fr/myFeature.json
   {
     "title": "Ma Nouvelle Fonctionnalité",
     "buttons": {
       "save": "Enregistrer",
       "cancel": "Annuler"
     }
   }
   ```

3. **Add same keys to German file:**
   ```json
   // packages/translations/locales/de/myFeature.json
   {
     "title": "Meine Neue Funktion",
     "buttons": {
       "save": "Speichern",
       "cancel": "Abbrechen"
     }
   }
   ```

**Important:** All three language files must have the same keys!

#### Step 3: Implement Feature Using Translations

```tsx
import { useTranslation } from 'react-i18next';

function MyNewFeature() {
  const { t } = useTranslation('myFeature');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('buttons.save')}</button>
      <button>{t('buttons.cancel')}</button>
    </div>
  );
}
```

#### Step 4: Run Validation Scripts

```bash
# Extract all translation keys from code
npm run extract:i18n-keys

# Check that all keys exist in all languages
npm run check:i18n-keys

# Generate TypeScript types (optional but recommended)
npm run generate:i18n-types
```

#### Step 5: Test Translations

1. Start development server
2. Switch between languages (en, fr, de)
3. Verify all text displays correctly
4. Check browser console for missing key warnings
5. Test with different data scenarios (for dynamic content)

#### Step 6: Commit Changes

Commit all translation files together with your feature code:

```bash
git add packages/translations/locales/**/*.json
git add src/components/MyNewFeature.tsx
git commit -m "feat: add new feature with translations"
```

### Files That Need to Be Updated (In Order)

#### For Static UI Text:

1. **English translation file** (`packages/translations/locales/en/{namespace}.json`)
   - Add new keys with English text
   - This is the source of truth

2. **French translation file** (`packages/translations/locales/fr/{namespace}.json`)
   - Add same keys with French translations
   - Keep key structure identical

3. **German translation file** (`packages/translations/locales/de/{namespace}.json`)
   - Add same keys with German translations
   - Keep key structure identical

4. **Component files** (`.tsx`/`.ts`)
   - Use `useTranslation()` hook
   - Reference translation keys

5. **TypeScript types** (optional, auto-generated)
   - Run `npm run generate:i18n-types` to update types

#### For Dynamic Content:

1. **Backend: Define translatable fields**
   ```typescript
   // api/src/translation/translation.config.ts
   export const FIELDS_BY_ENTITY = {
     myEntity: ['name', 'description', 'about'],
     // ...
   };
   ```

2. **Backend: Use translation service**
   ```typescript
   await translationService.saveEntityWithTranslations(
     'myEntity',
     entityId,
     payload,
     ['name', 'description', 'about']
   );
   ```

3. **Frontend: Request translated content**
   ```typescript
   const response = await fetch(
     `/api/translation/entity/myEntity/${id}?lang=${lang}&fields=name,description,about`
   );
   ```

### Validation & Testing Steps

#### Automated Validation

Run these commands before committing:

```bash
# 1. Extract keys from code
npm run extract:i18n-keys

# 2. Check all keys exist in all languages
npm run check:i18n-keys

# 3. Generate TypeScript types
npm run generate:i18n-types

# 4. Full i18n check (runs all above)
npm run i18n:full-check
```

#### Manual Testing Checklist

- [ ] All text displays correctly in English
- [ ] All text displays correctly in French
- [ ] All text displays correctly in German
- [ ] No missing key warnings in browser console
- [ ] Language switcher works correctly
- [ ] Interpolated variables work (if used)
- [ ] Pluralization works (if used)
- [ ] Dynamic content loads in correct language
- [ ] No hardcoded strings remain in code

#### CI/CD Validation

The GitHub Actions workflow automatically:
1. Extracts translation keys
2. Validates keys exist in all languages
3. Generates TypeScript types
4. Comments on PRs with missing keys report

**Your PR will fail if:**
- Keys are missing in any language file
- Translation files have syntax errors
- TypeScript types are out of date

---

## ⚠️ CRITICAL COMPLIANCE NOTICE

### Mandatory Requirements

**All developers and AI agents working on this platform MUST:**

1. ✅ **Follow the established translation setup for ALL user-facing text**
   - No exceptions
   - No shortcuts
   - No "I'll add translations later"

2. ✅ **Never hardcode raw strings directly in components**
   - All user-facing text must use `t('key')`
   - This includes buttons, labels, headings, error messages, tooltips, etc.

3. ✅ **Ensure translation keys are added to ALL supported language files**
   - English (en) - source language
   - French (fr) - required
   - German (de) - required
   - All three files must have identical key structures

4. ✅ **Test that translations render correctly before considering work complete**
   - Switch languages in the UI
   - Verify text changes
   - Check browser console for warnings

### Consequences of Non-Compliance

**Failure to follow these guidelines will result in:**

1. **Inconsistent user experience across languages**
   - Users see untranslated English text in French/German UI
   - Broken UI elements with missing translations
   - Professional appearance compromised

2. **Untranslated text appearing in production**
   - Poor user experience
   - Negative brand perception
   - Potential compliance issues in multilingual markets

3. **Breakages in the localization system**
   - Missing key errors in console
   - TypeScript type errors
   - CI/CD pipeline failures
   - Deployment blockers

4. **Technical debt requiring remediation**
   - Retroactive translation work
   - Code refactoring to fix hardcoded strings
   - Delayed feature releases
   - Increased maintenance burden

### Enforcement

- **ESLint Rules**: Automatically flags hardcoded strings in JSX
- **CI/CD Pipeline**: Fails builds with missing translations
- **Code Review**: PRs will be rejected if translations are missing
- **TypeScript Types**: Compile-time validation of translation keys

### Zero Tolerance Policy

**There are NO exceptions to these rules.**

- ❌ "It's just a quick fix" - NO
- ❌ "I'll add translations in the next PR" - NO
- ❌ "It's only used internally" - NO (if user-facing)
- ❌ "The text is in English anyway" - NO
- ❌ "It's too small to translate" - NO

**Every user-facing string must be translated. Period.**

---

## Common Mistakes to Avoid

### Anti-Patterns and Incorrect Implementations

#### ❌ Mistake 1: Hardcoded Strings in Components

```tsx
// ❌ WRONG - Hardcoded string
function LoginButton() {
  return <button>Login</button>;
}

// ✅ CORRECT - Translated
import { useTranslation } from 'react-i18next';

function LoginButton() {
  const { t } = useTranslation('common');
  return <button>{t('buttons.login')}</button>;
}
```

#### ❌ Mistake 2: Adding Keys to Only One Language File

```json
// ❌ WRONG - Only added to English
// en/common.json
{
  "buttons": {
    "newButton": "New Button"
  }
}

// fr/common.json - Missing key!
{
  "buttons": {
    "login": "Connexion"
  }
}
```

```json
// ✅ CORRECT - Added to all languages
// en/common.json
{
  "buttons": {
    "newButton": "New Button"
  }
}

// fr/common.json
{
  "buttons": {
    "newButton": "Nouveau Bouton"
  }
}

// de/common.json
{
  "buttons": {
    "newButton": "Neuer Button"
  }
}
```

#### ❌ Mistake 3: Using Variables Directly in Translation Keys

```tsx
// ❌ WRONG - Dynamic key
const key = `buttons.${action}`;
t(key); // This won't work reliably

// ✅ CORRECT - Use interpolation
t('buttons.action', { action: 'save' });
// Or use explicit keys
t(action === 'save' ? 'buttons.save' : 'buttons.cancel');
```

#### ❌ Mistake 4: Forgetting Namespace in useTranslation

```tsx
// ❌ WRONG - Missing namespace
const { t } = useTranslation();
t('title'); // May not find the key

// ✅ CORRECT - Specify namespace
const { t } = useTranslation('dashboard');
t('title'); // Finds dashboard:title
```

#### ❌ Mistake 5: Inconsistent Key Naming

```json
// ❌ WRONG - Inconsistent naming
{
  "saveBtn": "Save",
  "cancel_button": "Cancel",
  "SubmitButton": "Submit"
}

// ✅ CORRECT - Consistent camelCase
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit"
  }
}
```

#### ❌ Mistake 6: Not Testing All Languages

```tsx
// ❌ WRONG - Only tested in English
// Developer only checks English UI, assumes it works

// ✅ CORRECT - Test all languages
// 1. Switch to French - verify translations
// 2. Switch to German - verify translations
// 3. Check browser console for warnings
```

#### ❌ Mistake 7: Using Translation Keys for Dynamic Content

```tsx
// ❌ WRONG - Trying to translate user-generated content with static keys
const userBio = t('user.bio'); // This won't work for user data

// ✅ CORRECT - Use backend translation API for dynamic content
const response = await fetch(
  `/api/translation/entity/user/${userId}?lang=${lang}&fields=bio`
);
const { fields } = await response.json();
const userBio = fields.bio; // Translated user content
```

#### ❌ Mistake 8: Not Handling Missing Translations

```tsx
// ❌ WRONG - No fallback
const text = t('nonexistent.key'); // Shows "nonexistent.key" to user

// ✅ CORRECT - Provide fallback or handle missing keys
const text = t('nonexistent.key', { defaultValue: 'Default text' });
// Or ensure key exists in all language files
```

#### ❌ Mistake 9: Mixing Static and Dynamic Content

```tsx
// ❌ WRONG - Mixing concerns
const message = `${t('welcome')} ${user.name}`; // Hard to translate

// ✅ CORRECT - Use interpolation
const message = t('welcome', { name: user.name });
// Translation file: { "welcome": "Welcome, {{name}}!" }
```

#### ❌ Mistake 10: Not Running Validation Scripts

```bash
# ❌ WRONG - Committing without validation
git add .
git commit -m "Add feature"

# ✅ CORRECT - Validate first
npm run i18n:full-check
# Fix any errors
git add .
git commit -m "Add feature with translations"
```

### Correct vs Incorrect Code Examples

#### Example 1: Button Text

```tsx
// ❌ INCORRECT
function SaveButton() {
  return (
    <button onClick={handleSave}>
      Save
    </button>
  );
}

// ✅ CORRECT
import { useTranslation } from 'react-i18next';

function SaveButton() {
  const { t } = useTranslation('common');
  
  return (
    <button onClick={handleSave}>
      {t('buttons.save')}
    </button>
  );
}
```

#### Example 2: Error Messages

```tsx
// ❌ INCORRECT
function EmailInput() {
  const [error, setError] = useState('');
  
  const validate = (email: string) => {
    if (!email) {
      setError('Email is required');
    }
  };
  
  return (
    <div>
      <input type="email" />
      {error && <span>{error}</span>}
    </div>
  );
}

// ✅ CORRECT
import { useTranslation } from 'react-i18next';

function EmailInput() {
  const { t } = useTranslation('common');
  const [error, setError] = useState('');
  
  const validate = (email: string) => {
    if (!email) {
      setError(t('forms.validation.emailRequired'));
    }
  };
  
  return (
    <div>
      <input type="email" />
      {error && <span>{error}</span>}
    </div>
  );
}
```

#### Example 3: Headings with Variables

```tsx
// ❌ INCORRECT
function Dashboard({ userName }: { userName: string }) {
  return <h1>Welcome back, {userName}!</h1>;
}

// ✅ CORRECT
import { useTranslation } from 'react-i18next';

function Dashboard({ userName }: { userName: string }) {
  const { t } = useTranslation('dashboard');
  return <h1>{t('welcome', { name: userName })}</h1>;
}
```

**Translation file:**
```json
{
  "welcome": "Welcome back, {{name}}!"
}
```

#### Example 4: Conditional Text

```tsx
// ❌ INCORRECT
function StatusBadge({ status }: { status: string }) {
  const text = status === 'active' ? 'Active' : 'Inactive';
  return <span>{text}</span>;
}

// ✅ CORRECT
import { useTranslation } from 'react-i18next';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('common');
  return <span>{t(`status.${status}`)}</span>;
}
```

**Translation file:**
```json
{
  "status": {
    "active": "Active",
    "inactive": "Inactive"
  }
}
```

### Quick Reference: Do's and Don'ts

#### ✅ DO

- ✅ Always use `useTranslation()` hook for user-facing text
- ✅ Add keys to ALL language files (en, fr, de)
- ✅ Use descriptive, hierarchical key names
- ✅ Test translations in all languages
- ✅ Run validation scripts before committing
- ✅ Use interpolation for variables
- ✅ Group related keys in namespaces
- ✅ Keep key structures consistent across languages

#### ❌ DON'T

- ❌ Hardcode strings in components
- ❌ Add keys to only one language file
- ❌ Use generic or unclear key names
- ❌ Skip translation validation
- ❌ Mix static and dynamic content translation approaches
- ❌ Use variables in translation key paths
- ❌ Commit without testing all languages
- ❌ Create unnecessary namespaces for small features

---

## Additional Resources

### Documentation Files

- `docs/I18N_SYSTEM.md` - Detailed i18n system documentation
- `docs/i18n-specification.md` - Full translation system specification
- `docs/i18n-implementation-guide.md` - Implementation details
- `docs/translation-workflow.md` - Development workflow

### Scripts Reference

- `npm run extract:i18n-keys` - Extract keys from code
- `npm run check:i18n-keys` - Validate all keys exist
- `npm run generate:i18n-types` - Generate TypeScript types
- `npm run i18n:full-check` - Run all validation checks

### External Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [i18next Parser Documentation](https://github.com/i18next/i18next-parser)

### Getting Help

1. Check this documentation first
2. Review existing translation files for examples
3. Run validation scripts to identify issues
4. Check CI/CD pipeline output for errors
5. Contact the development team for complex issues

---

**Last Updated:** 2024
**Version:** 1.0.0
**Maintained By:** PC Solutions Development Team

