# Translation Scripts Documentation

## Overview

This directory contains scripts for managing translations in the codebase. **IMPORTANT**: Some scripts modify code automatically, while others only report issues.

## Scripts

### ✅ Safe Scripts (Read-Only, No Code Modification)

#### `check-untranslated-strings.mjs`
**Purpose**: Finds hardcoded strings that should be translated but aren't.

**What it does**:
- Scans JSX/TSX files for hardcoded text visible in the UI
- Checks if strings exist in translation files
- Reports missing translations
- **Does NOT modify any code**

**Usage**:
```bash
npm run check:untranslated
```

**Output**: 
- Console report of untranslated strings
- JSON report file: `untranslated-strings-report.json`

#### `extract-i18n-keys.ts`
**Purpose**: Extracts all translation keys used in the codebase.

**What it does**:
- Finds all `t()` calls in the code
- Generates a report of used keys
- **Does NOT modify any code**

**Usage**:
```bash
npm run extract:i18n-keys
```

#### `check-i18n-keys.ts`
**Purpose**: Checks if translation keys exist in all language files.

**What it does**:
- Compares used keys vs defined keys
- Reports missing keys per language
- **Does NOT modify any code**

**Usage**:
```bash
npm run check:i18n-keys
```

### ⚠️ Dangerous Scripts (Modify Code Automatically)

#### `fix-translation-keys.mjs` ⚠️ **DO NOT USE**
**Status**: **DEPRECATED - Causes issues with translation system**

**Why it's problematic**:
- Automatically modifies translation keys in code
- Removes namespace prefixes incorrectly
- Breaks existing translations
- Causes raw translation keys to appear in UI

**What happened**:
- This script was removing namespace prefixes (e.g., `t('signup:errors.xxx')` → `t('errors.xxx')`)
- This broke the translation system and caused keys to show as raw strings

**Recommendation**: **DO NOT RUN THIS SCRIPT**. Use `check-untranslated-strings.mjs` instead to identify issues, then fix them manually.

#### `fix-phase2-translation-keys.mjs` ⚠️ **DO NOT USE**
**Status**: **DEPRECATED - Same issues as above**

## Best Practices

1. **Always use read-only scripts first** to identify issues
2. **Never run automatic fix scripts** that modify translation keys
3. **Manually fix translation issues** based on reports
4. **Test after making changes** to ensure translations work correctly

## Workflow

1. **Check for untranslated strings**:
   ```bash
   npm run check:untranslated
   ```

2. **Review the report** and identify strings that need translation

3. **Add missing keys** to translation files manually:
   - `packages/translations/locales/en/common.json`
   - `packages/translations/locales/fr/common.json`
   - `packages/translations/locales/de/common.json`

4. **Update code** to use translation keys:
   ```tsx
   // Before
   <button>Submit</button>
   
   // After
   <button>{t('common:buttons.submit')}</button>
   ```

5. **Verify translations work** by running the app and checking all languages

## Translation Key Format

Always use namespace prefixes:
```tsx
// ✅ Correct
t('common:buttons.submit')
t('signup:errors.emailRequired')
t('dashboard:sidebar.home')

// ❌ Incorrect (missing namespace)
t('buttons.submit')
t('errors.emailRequired')
```

## Namespace Structure

- `common:` - Common UI elements (buttons, labels, etc.)
- `signup:` - Signup page translations
- `dashboard:` - Dashboard pages
- `content:` - Content pages (E-Learning, HR Procedures, etc.)
- `admin:` - Admin pages

## Troubleshooting

### Issue: Translation keys showing as raw strings
**Cause**: Missing namespace prefix or key doesn't exist in translation files.

**Solution**:
1. Check if key exists in translation files
2. Verify namespace prefix is correct
3. Ensure translation files are properly loaded

### Issue: Script modifies code incorrectly
**Solution**: 
- Don't use `fix-translation-keys.mjs` or `fix-phase2-translation-keys.mjs`
- Use `check-untranslated-strings.mjs` to identify issues
- Fix issues manually

