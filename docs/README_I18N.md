# 🌍 i18n Quick Start Guide

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install
```

Required packages:
- `eslint-plugin-i18next` - Prevents hardcoded strings
- `glob` - For key extraction
- `ts-node` - TypeScript script execution

### 2. Generate Type Definitions

```bash
npm run generate:i18n-types
```

This creates `frontend/i18n/types.ts` with all translation keys as TypeScript types.

### 3. Run Full Check

```bash
npm run i18n:full-check
```

This will:
- Extract all used translation keys
- Check for missing keys in all languages
- Generate TypeScript types
- Report any issues

## 📝 Common Commands

| Command | Description |
|---------|-------------|
| `npm run generate:i18n-types` | Generate TypeScript type definitions |
| `npm run extract:i18n-keys` | Extract all used translation keys from code |
| `npm run check:i18n-keys` | Check for missing translations |
| `npm run i18n:full-check` | Run all i18n checks |

## 🚀 Usage in Code

### Basic Example

```typescript
import { useTranslation } from 'react-i18next';

function MyPage() {
  const { t } = useTranslation(['myNamespace', 'common']);
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('common:buttons.submit')}</button>
    </div>
  );
}
```

### With Type Safety

```typescript
import type { I18nKey } from '@/i18n/types';

// TypeScript autocomplete and validation!
const key: I18nKey = 'common:buttons.login'; // ✅
const invalid: I18nKey = 'fake:key';         // ❌ Type error
```

## 📂 Namespace Structure

```
packages/translations/locales/
├─ en/
│  ├─ common.json          # Shared UI elements
│  ├─ auth.json            # Login/signup
│  ├─ signup.json          # Sign-up flow
│  ├─ marketplace.json     # Products/services
│  ├─ recruitment.json     # Jobs/candidates
│  └─ ... (13 total)
├─ fr/                     # French translations
└─ de/                     # German translations
```

## ✅ CI/CD Integration

The GitHub Actions workflow automatically:
- ✅ Validates all translation keys exist
- ✅ Checks TypeScript types are up-to-date
- ✅ Comments on PRs with missing keys
- ✅ Runs ESLint to prevent hardcoded strings

## 🔧 Adding New Translations

1. **Add to JSON file**:
   ```json
   // packages/translations/locales/en/myNamespace.json
   {
     "title": "My Feature",
     "buttons": {
       "save": "Save"
     }
   }
   ```

2. **Register in i18n.ts** (if new namespace):
   ```typescript
   import myNamespaceEn from '@workspace/translations/locales/en/myNamespace.json';
   ```

3. **Generate types**:
   ```bash
   npm run generate:i18n-types
   ```

4. **Use in code**:
   ```typescript
   const { t } = useTranslation(['myNamespace']);
   return <h1>{t('title')}</h1>;
   ```

## 🚨 Troubleshooting

### Keys showing instead of text?

1. Check if key exists in JSON:
   ```bash
   npm run check:i18n-keys
   ```

2. Verify namespace is loaded:
   ```typescript
   useTranslation(['correctNamespace'])
   ```

### TypeScript errors on keys?

```bash
npm run generate:i18n-types
```

### CI failing?

Check the GitHub Actions artifacts for the missing keys report, then add them to all language files (en/fr/de).

## 📖 Full Documentation

See [docs/I18N_SYSTEM.md](docs/I18N_SYSTEM.md) for comprehensive documentation.

## 🎯 Key Features

- ✅ **Type Safety**: Full TypeScript support with autocomplete
- ✅ **CI Integration**: Automatic validation in PRs
- ✅ **ESLint Rules**: Prevents hardcoded strings
- ✅ **Multi-language**: English, French, German support
- ✅ **Namespace System**: Organized by feature
- ✅ **Auto Reports**: Missing keys detection

---

**Need help?** Run `npm run i18n:full-check` for diagnostics or check the [full documentation](docs/I18N_SYSTEM.md).
