# Translation Debugger - Usage Guide

## Overview
The Translation Debugger is a visual debugging tool that captures all translation strings used in the frontend application as you navigate through pages. This tool helps identify missing translations, track translation usage, and export translation data for analysis.

## Features
- 🎯 **Real-time Capture**: Automatically captures all translation keys as they are used
- 🔍 **Live Filtering**: Search and filter captured translations
- 📋 **Copy to Clipboard**: One-click copy of all translation data as JSON
- 💾 **Export to File**: Download translation data as a timestamped JSON file
- 🗂️ **Organized by Namespace**: Translations grouped by namespace (common, auth, dashboard, etc.)
- 🌐 **Language Tracking**: Records which language was active when translations were captured
- 📄 **Page Tracking**: Shows which page each translation was used on

## How to Use

### Opening the Debugger
The debugger appears as a floating purple button in the bottom-right corner of the screen (only in development mode).

**Three ways to toggle the debugger:**
1. Click the purple "🌐 Translation Debug" button
2. Press `Ctrl+Shift+T` (keyboard shortcut)
3. The button shows the count of captured translations

### Capturing Translations
1. Navigate through your application pages
2. The debugger automatically captures all translation keys used via `t()` or `useTranslation()` calls
3. Watch the count increase in real-time
4. Each translation is captured only once (duplicates are filtered)

### Viewing Captured Translations
Once opened, the debugger panel shows:
- **Total Captured**: Number of unique translation keys recorded
- **Current Language**: The active i18n language
- **Namespaces**: Translations grouped by namespace (common, auth, dashboard, pricing)
- **Individual Entries**: Each showing:
  - Translation key (in blue)
  - Translated value
  - Page where it was used

### Filtering Translations
Use the search box to filter translations by:
- Key name
- Namespace
- Translated value

### Exporting Data

#### Copy to Clipboard
Click **"📋 Copy JSON"** to copy all translation data to clipboard in this format:
```json
{
  "totalTranslations": 45,
  "languages": ["en"],
  "capturedAt": "2025-10-09T12:34:56.789Z",
  "translations": [
    {
      "namespace": "common",
      "key": "welcome",
      "value": "Welcome",
      "page": "/dashboard"
    },
    // ... more translations
  ]
}
```

#### Download as File
Click **"💾 Download"** to download the data as a JSON file with automatic timestamp:
- Filename format: `translations-debug-2025-10-09T12-34-56-789Z.json`

### Clearing Data
Click **"🗑️ Clear"** to reset all captured translations and start fresh.

## Best Practices for Debugging

1. **Start Fresh**: Clear the debugger before starting your testing session
2. **Navigate Systematically**: Go through each page/section of the app methodically
3. **Test Different Languages**: Switch languages and capture translations for each
4. **Export Regularly**: Save your captured data frequently to avoid losing it
5. **Review by Namespace**: Check each namespace to ensure all expected keys are present

## Example Workflow

1. **Initial Setup**
   ```
   - Open the app in development mode
   - Click the Translation Debug button (or press Ctrl+Shift+T)
   - Click "Clear" to start fresh
   ```

2. **Capture All Translations**
   ```
   - Navigate to Login page
   - Navigate to Signup page
   - Navigate to Dashboard
   - Navigate to Marketplace
   - ... continue through all pages
   ```

3. **Review and Export**
   ```
   - Use the filter to search for specific keys
   - Review each namespace
   - Click "Copy JSON" or "Download"
   - Send the data for analysis/fixing
   ```

4. **Analysis**
   - Check for missing translations (keys that show the key itself instead of translated text)
   - Verify all expected keys are present
   - Identify unused translations

## Technical Details

- **Only Active in Development**: The debugger only appears when `import.meta.env.DEV` is true
- **Intercepts i18n.t()**: Hooks into the i18next `t()` function to capture all translation calls
- **No Performance Impact**: Uses React state and memoization efficiently
- **Persistent During Session**: Translations remain captured until you clear them or refresh the page

## Troubleshooting

**Debugger not appearing?**
- Ensure you're running in development mode (`npm run dev` or `vite`)
- Check that the build completed successfully

**Translations not being captured?**
- Make sure you're using the i18next `t()` function or `useTranslation()` hook
- Refresh the page and try again
- Check browser console for any errors

**Can't copy to clipboard?**
- Ensure your browser has clipboard permissions
- Try the Download option instead

## Development Notes

**Location**: `frontend/components/debug/TranslationDebugger.tsx`

**Integration**: Added to `frontend/App.tsx` inside the NotificationProvider

**Dependencies**:
- react-i18next
- React hooks (useState, useEffect, useCallback)
