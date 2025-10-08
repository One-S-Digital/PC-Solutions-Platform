# Translation System Documentation

**Status:** ✅ Unified & Clean  
**Last Updated:** October 8, 2025  
**Source of Truth:** `/workspace/packages/translations/`

---

## 🎯 Overview

This platform uses a **unified translation system** powered by `@workspace/translations` package.

### Quick Facts:
- **Languages:** English (en), French (fr), German (de)
- **Namespaces:** common, auth, dashboard, pricing
- **Total Keys:** ~1,000 translation keys
- **Validation:** Automated (0 errors)
- **Single Source:** All translations in one place

---

## 📁 Architecture

```
/workspace/
└── packages/translations/          ← SINGLE SOURCE OF TRUTH
    ├── locales/
    │   ├── en/
    │   │   ├── common.json         (242 keys)
    │   │   ├── auth.json           (199 keys)
    │   │   ├── dashboard.json      (577 keys)
    │   │   └── pricing.json        (66 keys)
    │   ├── fr/ (same structure)
    │   └── de/ (same structure)
    │
    └── src/
        ├── index.ts                (main exports)
        ├── hooks.ts                (useTranslation, Swiss terminology)
        ├── types.ts                (TypeScript types)
        └── utils.ts                (translation utilities)

Frontend → imports from @workspace/translations ✅
Admin → imports from @workspace/translations ✅
```

---

## 🚀 How to Use

### In React Components:

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');  // or 'auth', 'dashboard', 'pricing'
  
  return (
    <div>
      <h1>{t('buttons.save')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

### With Variables:

```typescript
const { t } = useTranslation();

// Use interpolation
<p>{t('dashboard.welcome', { name: 'John' })}</p>
// Output: "Welcome back, John!"
```

### Change Language:

```typescript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  return (
    <button onClick={() => i18n.changeLanguage('fr')}>
      Français
    </button>
  );
}
```

---

## ➕ Adding New Translations

### Step 1: Add to English First

**File:** `packages/translations/locales/en/[namespace].json`

```json
{
  "myNewSection": {
    "title": "My New Section",
    "description": "This is a new section"
  }
}
```

### Step 2: Add to French & German

**Files:** 
- `packages/translations/locales/fr/[namespace].json`
- `packages/translations/locales/de/[namespace].json`

Use the same key structure with translated values.

### Step 3: Validate

```bash
node scripts/validate-translations.mjs
```

Must pass with 0 errors before committing!

### Step 4: Use in Code

```typescript
const { t } = useTranslation('common');
<h1>{t('myNewSection.title')}</h1>
```

---

## 🔍 Validation

### Automatic Validation:

**Pre-commit Hook:** Runs automatically when you commit  
**CI/CD:** Runs on every push/PR

### Manual Validation:

```bash
# Validate all translation files
node scripts/validate-translations.mjs

# Audit translation keys
node scripts/audit-translations.mjs
```

### What Gets Validated:
- ✅ No invalid keys (punctuation, HTML tags, etc.)
- ✅ No self-referential values
- ✅ No API paths as keys
- ✅ Proper JSON structure
- ✅ Language consistency (warnings only)

---

## 🛠️ Available Scripts

### Validation & Auditing:
```bash
# Validate all translations (0 errors required)
node scripts/validate-translations.mjs

# Audit translation inventory
node scripts/audit-translations.mjs

# Consolidate from multiple sources (if needed)
node scripts/consolidate-translations.mjs
```

### Cleanup (if corruption occurs):
```bash
# Clean admin translations
node scripts/clean-admin-translations.mjs

# Clean frontend translations
node scripts/clean-frontend-translations.mjs

# Clean packages translations
node scripts/clean-packages-translations.mjs
```

---

## 📋 Key Naming Conventions

### Structure:
```
namespace.section.subsection.key
```

### Examples:
```
common.buttons.save
auth.loginPage.title
dashboard.sidebar.settings
pricing.plans.foundation.title
```

### Best Practices:
- ✅ Use descriptive, hierarchical keys
- ✅ Group related translations
- ✅ Use camelCase for keys
- ✅ Keep values concise but clear
- ❌ Don't use punctuation as keys
- ❌ Don't use full sentences as keys
- ❌ Don't create self-referential values

---

## 🌍 Supported Languages

### Primary Languages:
- **English (en):** Default & fallback
- **French (fr):** Full support
- **German (de):** Full support (Swiss German where applicable)

### Language Codes:
- Use lowercase: `'en'`, `'fr'`, `'de'`
- Consistent everywhere (no more EN/en confusion)

### Adding a New Language:

1. Create directory: `packages/translations/locales/[lang]/`
2. Copy all JSON files from `en/` directory
3. Translate all values
4. Update `packages/translations/src/types.ts`:
   ```typescript
   export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';  // add new lang
   ```
5. Update frontend/admin i18n configs
6. Validate: `node scripts/validate-translations.mjs`

---

## 🐛 Troubleshooting

### Translation not showing (showing key instead):

**Check:**
1. Key exists in translation file
2. Namespace specified correctly
3. Language file loaded
4. Console for errors

```typescript
// ❌ Wrong
t('buttons.save')  // if you're using 'dashboard' namespace

// ✅ Right
t('common:buttons.save')  // specify namespace
// OR
const { t } = useTranslation('common');
t('buttons.save')  // namespace already set
```

### Language switching not working:

**Check:**
1. `i18n.changeLanguage('fr')` being called
2. Component re-renders on language change
3. All translation files exist for that language
4. No console errors

### Build errors with imports:

**Check:**
1. Vite alias configured (`@workspace/translations`)
2. Package built: `cd packages/translations && npm run build`
3. pnpm workspace linked: `pnpm install`

---

## 📊 Current State

### Validation Status:
```
✅ Total errors: 0
⚠️  Total warnings: 16 (language consistency - minor)
✅ Frontend: Using @workspace/translations
✅ Admin: Using @workspace/translations
✅ Automated validation: Active
```

### Translation Coverage:
```
EN: 1,084 keys (4 namespaces)
FR: 1,084 keys (4 namespaces)  
DE: 1,084 keys (4 namespaces)
```

---

## 🔒 Safety

### Backups:
- Old frontend locales: `frontend/public/locales.old`
- Old admin locales: `admin/src/i18n/locales.old`
- Emergency backups: `/workspace/backups/`

### Rollback:
If issues arise, see `/workspace/ROLLBACK_PLAN.md`

---

## 📚 Additional Documentation

### For Developers:
- **This file** - Main translation guide
- **UNIFICATION_PLAN.md** - How unification was done
- **ROLLBACK_PLAN.md** - Emergency procedures

### For Reference:
- **docs/translation-analysis-archive/** - Original analysis (7 documents)
- **translation-audit.json** - Translation inventory

### For Implementation:
- **OPTION_B_EXECUTIVE_SUMMARY.md** - Unification plan overview
- **QUICK_START_GUIDE.md** - Quick reference

---

## ✅ Success Metrics

### Before Unification (Emergency State):
- ❌ Systems: 3 separate
- ❌ Errors: 772
- ❌ Source of truth: None
- ❌ Automation: None

### After Unification (Current State):
- ✅ Systems: 1 unified
- ✅ Errors: 0
- ✅ Source of truth: packages/translations
- ✅ Automation: Pre-commit + CI/CD

---

## 🎯 Quick Reference

### Most Common Tasks:

```bash
# Add a translation
# 1. Edit packages/translations/locales/en/[namespace].json
# 2. Edit packages/translations/locales/fr/[namespace].json  
# 3. Edit packages/translations/locales/de/[namespace].json
# 4. Validate
node scripts/validate-translations.mjs

# Use in component
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('common');
{t('your.new.key')}

# Check translation coverage
node scripts/audit-translations.mjs

# Build packages (if you modify src/)
cd packages/translations && npm run build
```

---

## 🤝 Contributing

### Before Committing Translation Changes:

1. ✅ Validate: `node scripts/validate-translations.mjs`
2. ✅ Test in browser (all 3 languages)
3. ✅ No console errors
4. ✅ All keys have values in all languages

### Translation Quality Standards:

- Translations must be accurate and culturally appropriate
- Swiss terminology preferred for German/French
- Consistent tone across all languages
- No machine translation without review
- Professional, clear language

---

## 📞 Support

**Issues with translations?**
1. Run validation: `node scripts/validate-translations.mjs`
2. Check this README
3. Review `/workspace/ROLLBACK_PLAN.md`

**Need to add a new feature?**
1. Add translations to all 3 languages
2. Validate before commit
3. Test in browser

**System broken?**
- Restore from backups (see ROLLBACK_PLAN.md)
- Check git history
- Contact team lead

---

**Last Validation:** October 8, 2025 - 0 errors ✅  
**Status:** Production Ready 🚀
