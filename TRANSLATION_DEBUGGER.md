# Translation Debugger - Quick Start

## What is it?
A visual debugging tool that captures all translation strings used in your frontend application in real-time as you navigate through pages.

## How to Use

### 1. Start Your Development Server
```bash
cd frontend
npm run dev
```

### 2. Open the Debugger
- Look for a purple button in the bottom-right corner: **🌐 Translation Debug (0)**
- Click it OR press **Ctrl+Shift+T** to toggle the debug panel

### 3. Capture Translations
- Simply navigate through all the pages of your app
- The debugger automatically captures every translation key used
- Watch the counter increase as translations are detected

### 4. Export Your Data
Once you've visited all pages, you have two options:

**Option A: Copy to Clipboard**
- Click **"📋 Copy JSON"** button
- Paste the data anywhere (email, chat, etc.)
- Send it to me for fixing

**Option B: Download as File**
- Click **"💾 Download"** button  
- A JSON file will be downloaded automatically
- Send this file to me

### Example Output
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
    {
      "namespace": "auth",
      "key": "login_button",
      "value": "Login",
      "page": "/login"
    }
    // ... more translations
  ]
}
```

## Features

✅ **Real-time Capture** - Automatically records every translation as it's used  
✅ **No Duplicates** - Each translation key is captured only once  
✅ **Page Tracking** - Shows which page each translation appears on  
✅ **Namespace Grouping** - Organized by namespace (common, auth, dashboard, etc.)  
✅ **Search & Filter** - Quickly find specific translations  
✅ **Export Options** - Copy or download the complete data  
✅ **Development Only** - Automatically disabled in production  

## Keyboard Shortcuts
- **Ctrl+Shift+T** - Toggle debugger panel

## Tips for Best Results

1. **Clear Before Starting**: Click "🗑️ Clear" to remove any old data
2. **Visit Every Page**: Navigate through all pages systematically
3. **Check All User Roles**: If possible, test different user role views
4. **Export When Done**: Save your data immediately after completing the tour
5. **Test Different Languages**: You can switch languages and capture for each

## What to Send Me

After capturing all translations, just send me:
- The copied JSON data (via copy button), OR
- The downloaded JSON file

I'll use this to identify and fix any missing or incorrect translations.

## Troubleshooting

**Don't see the purple button?**
- Make sure you're running in development mode (`npm run dev`)
- Refresh the page

**No translations being captured?**
- Make sure you're navigating to pages that use translations
- Check that the app is running without errors

**Can't copy to clipboard?**
- Use the Download button instead
- Your browser might be blocking clipboard access

---

## Technical Details

**Files Added:**
- `frontend/components/debug/TranslationDebugger.tsx` - Main debugger component
- `docs/translation-debugger-usage.md` - Detailed documentation

**Files Modified:**
- `frontend/App.tsx` - Integrated the debugger (only in dev mode)

**How it Works:**
The debugger intercepts all `i18n.t()` function calls and records:
- The translation key
- The namespace (common, auth, dashboard, etc.)
- The translated value
- Which page it was used on
- Timestamp

This data is stored in React state and can be exported as JSON for analysis.
