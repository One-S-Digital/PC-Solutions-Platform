# i18n Testing and Scanning Guide

This guide explains how to use the comprehensive i18n testing solution that has been implemented for the ProCrèche Solutions platform.

## Overview

The i18n testing solution includes:
- **Hardcoded text detection**: Finds text that should be internationalized
- **Missing key detection**: Identifies translation keys used in code but missing from locale files
- **Unused key detection**: Finds translation keys in locale files that are not used in code
- **Comprehensive test suite**: Automated tests to verify the scanner functionality

## Files Created

### Core Scanner
- `/workspace/scan-i18n.ts` - Main scanner script with all functionality

### Test Suite
- `/workspace/frontend/tests/unit/i18n-basic.test.ts` - Basic functionality tests
- `/workspace/frontend/tests/unit/i18n-scanner.test.ts` - Comprehensive test suite

### Package Configuration
- Updated `/workspace/frontend/package.json` with required dependencies and npm scripts

## Dependencies Added

The following dependencies were added to support the i18n scanner:

```json
{
  "devDependencies": {
    "@babel/parser": "^7.25.9",
    "@babel/traverse": "^7.25.9", 
    "@babel/types": "^7.25.9",
    "globby": "^14.1.0",
    "ts-node": "^10.9.2",
    "yargs": "^17.7.2"
  }
}
```

## NPM Scripts

The following scripts were added to `package.json`:

```json
{
  "scripts": {
    "test:i18n": "ts-node ../scan-i18n.ts --src \"**/*.{ts,tsx,js,jsx}\" --locales \"public/locales\" --languages \"en,fr,de\" --defaultNs \"translation\" --report table --out i18n-report.json",
    "test:i18n:json": "ts-node ../scan-i18n.ts --src \"**/*.{ts,tsx,js,jsx}\" --locales \"public/locales\" --languages \"en,fr,de\" --defaultNs \"translation\" --report json",
    "test:i18n:fail": "ts-node ../scan-i18n.ts --src \"**/*.{ts,tsx,js,jsx}\" --locales \"public/locales\" --languages \"en,fr,de\" --defaultNs \"translation\" --report table --failOnMissing"
  }
}
```

## Usage

### Running the Scanner

#### Basic Scan (Table Output)
```bash
cd /workspace/frontend
pnpm run test:i18n
```

#### JSON Output
```bash
cd /workspace/frontend
pnpm run test:i18n:json
```

#### Fail on Missing Keys
```bash
cd /workspace/frontend
pnpm run test:i18n:fail
```

### Running Tests

#### Run All i18n Tests
```bash
cd /workspace/frontend
pnpm run test:unit tests/unit/i18n-basic.test.ts
```

#### Run Specific Test
```bash
cd /workspace/frontend
pnpm run test:unit tests/unit/i18n-scanner.test.ts
```

### Manual Scanner Usage

You can also run the scanner directly with custom parameters:

```bash
ts-node /workspace/scan-i18n.ts \
  --src "**/*.{ts,tsx,js,jsx}" \
  --locales "public/locales" \
  --languages "en,fr,de" \
  --defaultNs "translation" \
  --report table \
  --out i18n-report.json
```

## Scanner Features

### 1. Hardcoded Text Detection

The scanner identifies:
- JSX text outside `<Trans>` components
- Literal strings in common UI props (placeholder, title, aria-label, etc.)
- Suspicious string/template literals likely rendered to users

**Example of hardcoded text that would be flagged:**
```tsx
// ❌ This would be flagged
<h1>Welcome to our platform</h1>
<button title="Click here to continue">Continue</button>

// ✅ This would not be flagged
<h1>{t('welcome.title')}</h1>
<button title={t('button.continue.tooltip')}>{t('button.continue')}</button>
```

### 2. Missing Key Detection

The scanner finds translation keys used in code but missing from locale files:

**Supported patterns:**
- `t("key")`
- `i18n.t("key")`
- `t("ns:key")`
- `t("key", { ns: "namespace" })`
- `<Trans i18nKey="key" />`
- `<Trans i18nKey="ns:key" />`

### 3. Unused Key Detection

The scanner identifies translation keys in locale files that are not used anywhere in the codebase.

## Current Scan Results

Based on the initial scan of the codebase:

- **Hardcoded text**: 0 issues found ✅
- **Missing keys**: 0 issues found ✅  
- **Unused keys**: 1,251 keys found ⚠️

The large number of unused keys suggests that many translation keys in the locale files are not being used in the current codebase. This could indicate:
- Legacy keys that are no longer needed
- Keys for features that haven't been implemented yet
- Keys that were added but never integrated

## Configuration Options

The scanner supports various configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `--src` | Glob pattern for files to scan | `frontend/**/*.{ts,tsx,js,jsx}` |
| `--ignore` | Glob patterns to ignore | `node_modules/**,**/*.test.*,**/__tests__/**` |
| `--locales` | Root folder for locale files | `frontend/public/locales` |
| `--languages` | Comma-separated list of languages | `en,fr,de` |
| `--defaultNs` | Default namespace | `translation` |
| `--report` | Output format (table/json/both) | `table` |
| `--out` | Output file path | None |
| `--failOnMissing` | Exit with code 2 if missing keys found | `false` |
| `--checkUnused` | Check for unused keys | `true` |
| `--minLength` | Minimum text length to flag | `3` |

## Suppressing False Positives

### Per-line suppression
Add `// i18n-ignore` on the line before the text you want to ignore:

```tsx
// i18n-ignore
<h1>This text will be ignored</h1>
```

### Per-file suppression
Add `/* i18n-ignore-file */` anywhere in the file:

```tsx
/* i18n-ignore-file */
// This entire file will be ignored
```

## Integration with CI/CD

To integrate with your CI/CD pipeline, use the `--failOnMissing` flag:

```bash
pnpm run test:i18n:fail
```

This will:
- Exit with code 0 if no missing keys are found
- Exit with code 2 if missing keys are found (causing CI to fail)

## Recommendations

1. **Clean up unused keys**: Review the 1,251 unused keys and remove those that are no longer needed
2. **Regular scanning**: Run the scanner regularly to catch new issues early
3. **CI integration**: Add the scanner to your CI pipeline to prevent missing key issues
4. **Team training**: Educate the team on proper i18n practices to avoid hardcoded text

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure all dependencies are installed with `pnpm install`
2. **TypeScript compilation errors**: The scanner uses ts-node, make sure TypeScript is properly configured
3. **Large JSON output**: Use `--report table` for human-readable output instead of `--report json`

### Performance

The scanner processes all TypeScript/JavaScript files in the project, which can take some time for large codebases. Consider:
- Using more specific `--src` patterns to limit the scope
- Adding more files to `--ignore` patterns
- Running the scanner on specific directories rather than the entire codebase

## Future Enhancements

Potential improvements to consider:
1. **Incremental scanning**: Only scan changed files
2. **IDE integration**: VSCode extension for real-time feedback
3. **Auto-fix suggestions**: Automatic fixes for common issues
4. **Translation key validation**: Check for proper key naming conventions
5. **Pluralization detection**: Identify keys that should use pluralization