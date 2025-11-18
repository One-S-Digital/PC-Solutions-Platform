# Translation Keys Not Loading - Fixed

## Issue
Translation keys are showing as raw strings (e.g., `supportPage.furtherAssistanceTitle`, `filters.all`) on the frontend instead of translated text.

## Root Cause (FIXED)
The `packages/translations/package.json` had incomplete `exports` field. It only exported 4 translation files (common, auth, dashboard, pricing) but `frontend/i18n.ts` imports 15 translation files. The missing exports prevented the Docker build from properly bundling all translation files into the frontend build.

**Missing exports:**
- signup.json
- parentLeadForm.json
- marketplace.json
- recruitment.json
- users.json
- content.json
- messages.json
- admin.json
- settings.json
- profile.json

## Fix Applied
Updated `/workspace/packages/translations/package.json` to export all translation files for all languages (en, fr, de).

**Commit:** `784b58cb3 - Fix missing translation file exports in package.json`

## Translation Keys Added in Merge #152
The following keys were added to `packages/translations/locales/{en,fr,de}/dashboard.json`:

```json
{
  "filters": {
    "all": "All"
  },
  "supportPage": {
    "faqTitle": "Frequently Asked Questions",
    "furtherAssistanceTitle": "Need Further Assistance?",
    "furtherAssistanceText": "If you can't find the answer you're looking for...",
    "emailLinkText": "support@procrechesolutions.com",
    "orSubmitTicket": "or submit a support ticket below.",
    "submitTicketTitle": "Submit a Support Ticket",
    "ticketForm": {
      "subjectLabel": "Subject",
      "subjectPlaceholder": "Brief description of your issue",
      "messageLabel": "Message",
      "messagePlaceholder": "Please provide detailed information about your issue"
    }
  }
}
```

## Solution - Action Required
Now that the fix is committed, you need to deploy it:

### Step 1: Push the fix to remote
```bash
git push origin cursor/investigate-frontend-loading-errors-after-merge-2985
```

### Step 2: Redeploy with Build Cache Cleared
1. Go to your Render dashboard
2. Find the frontend service
3. Click "Manual Deploy" > **Clear build cache & deploy**
   - ⚠️ **IMPORTANT:** Check "Clear build cache" option to ensure pnpm reinstalls packages with the updated exports
4. Deploy the latest commit (784b58cb3)

The build cache clearing is crucial because pnpm may have cached the old package.json without all the exports.

## Affected Pages
- Service Provider Support Page
- Service Provider Requests Page (filter buttons)
- Supplier Support Page
- Educator Support Page
- Foundation Support Page
- Parent Support Page
- Various other pages using `filters.all`

## Verification
After redeployment, check that these strings display correctly:
- Support page: "Need Further Assistance?" (instead of `supportPage.furtherAssistanceTitle`)
- Filter buttons: "All" (instead of `filters.all`)
