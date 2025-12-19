# 🌍 Translation Workflow for New Pages & Features

## Quick Reference: What Happens When Developers Add New Pages

When other developers add new pages or features, the translation system has **multiple automated safeguards** to ensure translations are added correctly:

---

## 🛡️ Automated Protection Layers

### 1. **CI/CD Pipeline (Automatic)**
When a developer opens a Pull Request, GitHub Actions automatically:

✅ **Extracts all translation keys** from the code  
✅ **Checks if keys exist** in all language files (en, fr, de)  
✅ **Fails the PR** if any keys are missing  
✅ **Comments on the PR** with a detailed report of missing keys  
✅ **Validates TypeScript types** are up-to-date  
✅ **Runs ESLint** to catch hardcoded strings  

**Result:** The PR **cannot be merged** until all translations are added!

### 2. **ESLint Rules (Local Development)**
ESLint automatically flags hardcoded strings in JSX:
```tsx
// ❌ ESLint will flag this
<button>Save</button>

// ✅ This passes
<button>{t('buttons.save')}</button>
```

### 3. **Browser Console Warnings (Runtime)**
i18next logs missing keys to the browser console:
```
i18next::translator: missingKey fr admin newPage.title New Page
```

---

## 📋 Step-by-Step Workflow for Developers

### Step 1: Plan Before Coding
Before writing code, developers should:
1. Identify all user-facing text in the new feature
2. Decide which namespace to use:
   - `common.json` - Shared UI elements (buttons, labels)
   - `admin.json` - Admin-specific features
   - `dashboard.json` - Dashboard features
   - Create new namespace if it's a major feature (20+ keys)

### Step 2: Add Translation Keys (ALL Languages)
**CRITICAL:** Keys must be added to **ALL THREE** language files:

```json
// 1. packages/translations/locales/en/myFeature.json (English - source)
{
  "title": "My New Feature",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}

// 2. packages/translations/locales/fr/myFeature.json (French)
{
  "title": "Ma Nouvelle Fonctionnalité",
  "buttons": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  }
}

// 3. packages/translations/locales/de/myFeature.json (German)
{
  "title": "Meine Neue Funktion",
  "buttons": {
    "save": "Speichern",
    "cancel": "Abbrechen"
  }
}
```

### Step 3: Use Translations in Code
```tsx
import { useTranslation } from 'react-i18next';

function MyNewPage() {
  const { t } = useTranslation(['myFeature', 'common']);
  
  return (
    <div>
      <h1>{t('myFeature:title')}</h1>
      <button>{t('common:buttons.save')}</button>
      <button>{t('common:buttons.cancel')}</button>
    </div>
  );
}
```

### Step 4: Run Validation Scripts (Before Committing)
```bash
# Full validation check (recommended)
npm run i18n:full-check

# Or run individually:
npm run extract:i18n-keys    # Extract keys from code
npm run check:i18n-keys      # Check all keys exist
npm run generate:i18n-types   # Update TypeScript types
```

### Step 5: Test Locally
1. Start dev server: `npm run dev`
2. Switch languages (EN → FR → DE)
3. Verify all text displays correctly
4. Check browser console for warnings
5. Fix any missing keys

### Step 6: Commit & Push
```bash
git add packages/translations/locales/**/*.json
git add src/pages/MyNewPage.tsx
git commit -m "feat: add new page with translations"
git push
```

---

## 🚨 What Happens If Developers Forget Translations?

### Scenario 1: Hardcoded Strings
**ESLint catches it:**
- Developer sees ESLint errors in their IDE
- Build fails locally
- PR cannot be merged

### Scenario 2: Missing Translation Keys
**CI/CD catches it:**
1. Developer opens PR
2. GitHub Actions runs `npm run check:i18n-keys`
3. Script detects missing keys
4. **PR fails** with error message
5. GitHub bot comments on PR with missing keys list:
   ```
   ❌ Missing translation keys detected!
   
   Missing in fr/admin.json:
   - admin.newPage.title
   - admin.newPage.buttons.save
   
   Missing in de/admin.json:
   - admin.newPage.title
   - admin.newPage.buttons.save
   ```
6. Developer must add missing keys and push again
7. PR passes only when all keys exist

### Scenario 3: Missing Keys in Production
**Runtime warnings:**
- Browser console shows missing key warnings
- Users see fallback English text (or key names)
- This should never happen if CI/CD is working

---

## 🔧 Developer Tools & Commands

### Validation Commands
```bash
# Full check (extract + validate + generate types)
npm run i18n:full-check

# Extract keys from code
npm run extract:i18n-keys

# Check all keys exist in all languages
npm run check:i18n-keys

# Generate TypeScript types
npm run generate:i18n-types

# Check for untranslated strings
npm run check:untranslated
```

### Quick Fix Workflow
If CI/CD fails:
1. Read the error message in GitHub Actions
2. Check the PR comment for missing keys list
3. Add missing keys to all language files
4. Run `npm run i18n:full-check` locally
5. Push changes
6. PR will pass automatically

---

## 📝 Best Practices for Developers

### ✅ DO:
- Add keys to **ALL THREE** language files (en, fr, de)
- Use descriptive, hierarchical key names
- Group related keys together
- Run `npm run i18n:full-check` before committing
- Test in all three languages
- Use existing keys from `common.json` when possible

### ❌ DON'T:
- Add keys to only one language file
- Hardcode strings in components
- Skip validation scripts
- Use generic key names like "text1", "button"
- Create new namespaces for small features (< 10 keys)

---

## 🎯 Example: Adding a New Admin Page

### 1. Create the Page Component
```tsx
// admin/src/pages/Reports.tsx
import { useTranslation } from 'react-i18next';

export default function Reports() {
  const { t } = useTranslation(['admin', 'common']);
  
  return (
    <div>
      <h1>{t('admin:reports.title', 'Reports')}</h1>
      <p>{t('admin:reports.subtitle', 'View and export system reports')}</p>
      <button>{t('common:buttons.export')}</button>
    </div>
  );
}
```

### 2. Add Translation Keys (ALL Languages)
```json
// packages/translations/locales/en/admin.json
{
  "reports": {
    "title": "Reports",
    "subtitle": "View and export system reports"
  }
}

// packages/translations/locales/fr/admin.json
{
  "reports": {
    "title": "Rapports",
    "subtitle": "Voir et exporter les rapports système"
  }
}

// packages/translations/locales/de/admin.json
{
  "reports": {
    "title": "Berichte",
    "subtitle": "Systemberichte anzeigen und exportieren"
  }
}
```

### 3. Validate
```bash
npm run i18n:full-check
```

### 4. Test
- Switch languages in the UI
- Verify text changes correctly
- Check console for warnings

---

## 🔍 How to Find Missing Translations

### Method 1: Run Validation Script
```bash
npm run check:i18n-keys
```
Output shows exactly which keys are missing in which languages.

### Method 2: Check Browser Console
When running the app, missing keys appear as warnings:
```
i18next::translator: missingKey fr admin reports.title Reports
```

### Method 3: Check CI/CD Logs
GitHub Actions logs show detailed missing keys report.

### Method 4: Use Translation Management Page
The admin panel has a "Translations" page that shows:
- All translation keys
- Missing translations (highlighted)
- Keys that need review

---

## 🚀 Quick Start Checklist for New Developers

When adding a new page/feature:

- [ ] Identify all user-facing text
- [ ] Choose appropriate namespace (`common`, `admin`, or new)
- [ ] Add keys to **English** file first
- [ ] Add **same keys** to **French** file
- [ ] Add **same keys** to **German** file
- [ ] Use `useTranslation()` hook in component
- [ ] Replace all hardcoded strings with `t()` calls
- [ ] Run `npm run i18n:full-check`
- [ ] Test in all three languages
- [ ] Check browser console for warnings
- [ ] Commit translation files with feature code

---

## 📚 Additional Resources

- **Full Documentation**: `TRANSLATION_SYSTEM_DOCUMENTATION.md`
- **Translation Management**: Admin panel → Translations page
- **Validation Scripts**: `scripts/check-i18n-keys.ts`
- **CI/CD Workflow**: `.github/workflows/i18n-check.yml`

---

## 💡 Pro Tips

1. **Reuse Common Keys**: Check `common.json` first - many buttons/labels already exist
2. **Use Interpolation**: For dynamic text, use `{{variable}}` syntax
3. **Group Related Keys**: Keep related translations together (e.g., all form fields)
4. **Run Checks Early**: Don't wait until PR - run validation locally
5. **Check Existing Patterns**: Look at similar pages for key naming patterns

---

**Remember:** The CI/CD pipeline will catch missing translations, but it's faster to catch them locally with `npm run i18n:full-check`!

