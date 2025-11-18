# Translation Keys Not Loading - Rebuild Required

## Issue
Translation keys are showing as raw strings (e.g., `supportPage.furtherAssistanceTitle`, `filters.all`) on the frontend instead of translated text.

## Root Cause
The translation strings were added to the JSON files in merge #152 (commit 6dc45c219), but the frontend application has not been rebuilt since then. The frontend loads translations at build time by importing JSON files in `i18n.ts`, so it needs to be rebuilt to pick up the new translations.

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

## Solution
Rebuild and redeploy the frontend service:

### Option 1: Manual Redeploy on Render
1. Go to your Render dashboard
2. Find the frontend service
3. Click "Manual Deploy" > "Deploy latest commit"

### Option 2: Trigger via Git Push
1. Make a small change (e.g., update a comment or version)
2. Commit and push to trigger the CI/CD pipeline

### Option 3: Local Build Test (Optional)
To verify locally before deploying:
```bash
cd /workspace/frontend
npm install
npm run build
```

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
