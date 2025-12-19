# Translation Workflow Documentation

## Overview

This document outlines the complete translation workflow for the ProCrèche Solutions platform, including development, maintenance, and CI/CD processes.

## Architecture

### Translation System Components

1. **Shared Translation Package** (`@workspace/translations`)
   - Common Swiss terminology and translations
   - TypeScript utilities and React hooks
   - Centralized translation management

2. **Platform-Specific Translations**
   - Frontend: `/frontend/public/locales/{lang}/{namespace}.json`
   - Admin: `/admin/src/i18n/locales/{lang}/{namespace}.json`
   - API: Dynamic translations via database

3. **Translation Namespaces**
   - `common`: Shared UI elements and common terms
   - `auth`: Authentication and user management
   - `dashboard`: Dashboard-specific content
   - `translation`: Legacy translations (being phased out)

## Development Workflow

### Adding New Translations

1. **Identify Translation Need**
   ```bash
   # Run audit to find hardcoded text
   node scripts/translation-audit-simple.mjs
   ```

2. **Add Translation Keys**
   ```typescript
   // In your component
   const { t } = useTranslation('common');
   return <button>{t('buttons.save')}</button>;
   ```

3. **Update Translation Files**
   ```json
   // In common.json
   {
     "buttons": {
       "save": "Save"
     }
   }
   ```

4. **Run Translation Scripts**
   ```bash
   # Fix missing keys and hardcoded text
   node scripts/fix-hardcoded-text.mjs
   
   # Translate to other languages
   node scripts/translate-complete.mjs
   ```

### Using Shared Translation Package

```typescript
import { useTranslation, translateWithSwissTerminology } from '@workspace/translations';

function MyComponent() {
  const { t, translateSwiss } = useTranslation('common');
  
  // Standard translation
  const saveText = t('buttons.save');
  
  // Swiss terminology translation
  const customText = translateSwiss('Custom Text');
  
  return <button>{saveText}</button>;
}
```

## Maintenance Workflow

### Daily Tasks

1. **Check Translation Status**
   ```bash
   node scripts/translation-validation.mjs
   ```

2. **Review CI/CD Reports**
   - Check GitHub Actions for translation quality gates
   - Review PR comments for translation status

### Weekly Tasks

1. **Audit Translation Coverage**
   ```bash
   node scripts/translation-audit-simple.mjs
   ```

2. **Update Swiss Terminology**
   - Review and update `packages/translations/src/constants.ts`
   - Add new common terms to Swiss terminology dictionary

### Monthly Tasks

1. **Review Translation Quality**
   - Check for untranslated content
   - Validate Swiss terminology usage
   - Update translation guidelines

2. **Clean Up Unused Keys**
   - Identify unused translation keys
   - Remove deprecated translations
   - Optimize translation files

## CI/CD Pipeline

### Automated Checks

The CI/CD pipeline automatically runs:

1. **Translation Validation**
   - Checks for missing translations
   - Validates translation quality
   - Ensures proper namespace structure

2. **Coverage Requirements**
   - Minimum 95% translation coverage
   - Maximum 0 errors
   - Maximum 10 warnings

3. **Quality Gates**
   - All required languages present (en, fr, de)
   - All required namespaces present
   - No critical hardcoded text

### Manual Overrides

In exceptional cases, you can override quality gates:

```yaml
# In .github/workflows/translation-check.yml
- name: Override translation check
  if: github.event_name == 'pull_request'
  run: |
    echo "TRANSLATION_CHECK_OVERRIDE=true" >> $GITHUB_ENV
```

## Translation Scripts

### Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `translation-audit-simple.mjs` | Audit translation coverage | `node scripts/translation-audit-simple.mjs` |
| `translation-validation.mjs` | Validate translation quality | `node scripts/translation-validation.mjs` |
| `ci-translation-check.mjs` | CI/CD quality gates | `node scripts/ci-translation-check.mjs` |
| `fix-hardcoded-text.mjs` | Fix hardcoded text and missing keys | `node scripts/fix-hardcoded-text.mjs` |
| `translate-complete.mjs` | Translate using Swiss terminology | `node scripts/translate-complete.mjs` |

### Script Workflow

```bash
# 1. Audit current state
node scripts/translation-audit-simple.mjs

# 2. Fix issues
node scripts/fix-hardcoded-text.mjs

# 3. Translate content
node scripts/translate-complete.mjs

# 4. Validate results
node scripts/translation-validation.mjs

# 5. Run CI checks
node scripts/ci-translation-check.mjs
```

## Best Practices

### Translation Key Naming

```typescript
// Good: Descriptive and hierarchical
'buttons.save'
'forms.validation.emailRequired'
'pages.dashboard.welcome'

// Bad: Generic or unclear
'text1'
'button'
'msg'
```

### Swiss Terminology Usage

```typescript
// Use Swiss terminology for common terms
const { translateSwiss } = useTranslation();
const saveText = translateSwiss('Save'); // Automatically uses Swiss French/German

// For complex translations, use standard translation keys
const { t } = useTranslation('common');
const complexText = t('pages.dashboard.complexMessage');
```

### Component Translation Patterns

```typescript
// Good: Use translation hooks
function MyComponent() {
  const { t } = useTranslation('common');
  return <button>{t('buttons.save')}</button>;
}

// Bad: Hardcoded text
function MyComponent() {
  return <button>Save</button>;
}
```

## Troubleshooting

### Common Issues

1. **Missing Translation Keys**
   ```bash
   # Fix missing keys
   node scripts/fix-hardcoded-text.mjs
   ```

2. **Untranslated Content**
   ```bash
   # Check validation report
   node scripts/translation-validation.mjs
   ```

3. **CI/CD Failures**
   ```bash
   # Run CI checks locally
   node scripts/ci-translation-check.mjs
   ```

### Debug Mode

Enable translation debugging:

```typescript
// In i18n configuration
i18n.init({
  debug: process.env.NODE_ENV === 'development',
  // ... other config
});
```

## Monitoring and Metrics

### Key Metrics

- **Translation Coverage**: Percentage of keys translated
- **Quality Score**: Based on validation results
- **Hardcoded Text Count**: Number of untranslated strings
- **Missing Keys**: Keys referenced but not defined

### Reporting

- **Daily**: CI/CD pipeline reports
- **Weekly**: Translation audit reports
- **Monthly**: Quality trend analysis

## Support

### Getting Help

1. **Check Documentation**: Review this guide and related docs
2. **Run Diagnostics**: Use translation scripts to identify issues
3. **Review CI/CD**: Check GitHub Actions for error details
4. **Contact Team**: Reach out to development team for complex issues

### Resources

- [i18n Implementation Guide](./i18n-implementation-guide.md)
- [i18n Specification](./i18n-specification.md)
- [Translation Scripts](../scripts/)
- [Shared Translation Package](../packages/translations/)