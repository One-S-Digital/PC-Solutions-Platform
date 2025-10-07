# 🔍 Visual i18n Scanner Guide

## Overview

The Visual i18n Scanner is a powerful tool that uses Playwright to visually scan your running application and detect missing translation keys and hardcoded text that should be internationalized. Unlike static code analysis, this tool actually sees what users see in the browser.

## 🚀 Quick Start

### Prerequisites

1. **Install Playwright** (already done):
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

2. **Start your frontend application**:
   ```bash
   cd frontend
   npm run dev
   ```

### Basic Usage

```bash
# Run visual scanner (with browser window)
npm run scan:i18n:visual

# Run visual scanner (headless mode)
npm run scan:i18n:visual:headless

# Run advanced scanner (with more features)
npm run scan:i18n:advanced

# Run advanced scanner (headless)
npm run scan:i18n:advanced:headless
```

## 📋 What It Detects

### 1. Missing Translation Keys
- Keys that look like translation keys but aren't translated
- Patterns: `common.save`, `dashboard.title`, `user:profile`, `settings_preferences`
- Keys with dots, colons, or underscores

### 2. Hardcoded Text
- User-facing text that should be translated
- UI elements like buttons, labels, messages
- Common keywords: save, cancel, delete, edit, etc.

### 3. Translation Loading Issues
- Missing translation files
- i18n initialization problems
- Console errors related to i18n

## 🛠️ Advanced Features

### Custom Configuration

```javascript
const scanner = new AdvancedVisualI18nScanner({
  baseUrl: 'http://localhost:3000',
  headless: false,        // Show browser window
  slowMo: 1000,          // Slow down for observation
  waitTime: 3000,        // Wait time for dynamic content
  auth: {                // Authentication (if needed)
    type: 'clerk',
    // ... auth config
  }
});
```

### Custom Page Scanning

```javascript
// Scan specific pages
await scanner.scanPage('http://localhost:3000/custom-page', 'Custom Page');

// Scan with custom options
await scanner.scanPage('http://localhost:3000/dashboard', 'Dashboard', {
  waitForSelector: '.dashboard-content',
  scrollToBottom: true
});
```

## 📊 Reports Generated

### 1. JSON Report (`visual-i18n-report.json`)
- Detailed data about all findings
- Machine-readable format
- Perfect for CI/CD integration

### 2. HTML Report (`visual-i18n-report.html`)
- Visual report with screenshots
- Easy to share with team
- Interactive and user-friendly

### 3. Screenshots (`i18n-screenshots/`)
- Screenshots of each scanned page
- Visual reference for issues found
- Helps identify context of problems

## 🔧 Troubleshooting

### Common Issues

1. **"Page not found" errors**
   - Make sure your frontend is running on the correct port
   - Check the `baseUrl` configuration
   - Verify the page URLs exist

2. **"Authentication required"**
   - Configure authentication in the scanner options
   - Or scan public pages only

3. **"Too many false positives"**
   - Adjust the detection patterns in the scanner
   - Add more specific filters for your use case

### Debug Mode

```bash
# Run with debug logging
DEBUG=true npm run scan:i18n:advanced

# Run with slow motion for observation
SLOW_MO=2000 npm run scan:i18n:advanced
```

## 📈 Integration with CI/CD

### GitHub Actions Example

```yaml
name: i18n Visual Scan
on: [push, pull_request]

jobs:
  visual-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run dev &
      - run: sleep 30  # Wait for app to start
      - run: npm run scan:i18n:advanced:headless
      - uses: actions/upload-artifact@v2
        with:
          name: i18n-reports
          path: |
            visual-i18n-report.json
            visual-i18n-report.html
            i18n-screenshots/
```

## 🎯 Best Practices

### 1. Regular Scanning
- Run visual scans after major UI changes
- Include in your CI/CD pipeline
- Schedule weekly scans for ongoing monitoring

### 2. Page Coverage
- Scan all user-facing pages
- Include different user roles and states
- Test with different languages if possible

### 3. False Positive Management
- Review and adjust detection patterns
- Add specific exclusions for your app
- Use the HTML report to validate findings

## 🔍 Understanding the Results

### Missing Keys
- **High Priority**: Keys that are definitely missing translations
- **Action**: Add these keys to your locale files
- **Example**: `"common.save"` showing instead of "Save"

### Hardcoded Text
- **Medium Priority**: Text that should be translated
- **Action**: Replace with translation keys
- **Example**: `"Click here to continue"` should be `{t('common.continue')}`

### Translation Issues
- **High Priority**: Problems with i18n setup
- **Action**: Fix i18n configuration
- **Example**: Missing translation files or initialization errors

## 🚀 Next Steps

1. **Run the scanner** on your application
2. **Review the HTML report** to see visual issues
3. **Fix missing keys** by adding them to locale files
4. **Replace hardcoded text** with translation keys
5. **Set up regular scanning** in your workflow

## 📞 Support

If you encounter issues:
1. Check the console output for error messages
2. Verify your frontend is running and accessible
3. Review the generated reports for specific issues
4. Adjust scanner configuration as needed

The visual scanner is designed to catch issues that static analysis misses, giving you a complete picture of your i18n implementation! 🎉