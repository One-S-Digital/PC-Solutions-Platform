# Quick Fix: Sentry DSN Configuration

## The Problem
```
sentry.config.ts:9 Sentry DSN not configured. Skipping Sentry initialization.
```

## Check Current Configuration

First, see what's actually configured:

```bash
# Get your Render API key from: https://dashboard.render.com/ → Account Settings → API Keys
node scripts/check-render-env.js --save-key your-render-api-key
node scripts/check-render-env.js
```

See [scripts/README-check-render-env.md](./scripts/README-check-render-env.md) for details.

## The Solution (Quick Steps)

### 1. Create Sentry Projects (5 minutes)
Go to https://sentry.io and create 3 projects:
- `pc-solutions-frontend` (React)
- `pc-solutions-admin` (React)
- `pc-solutions-api` (Node.js)

### 2. Get Your DSN Values
Copy the DSN from each project:
**Settings → Client Keys (DSN)**

Format: `https://[KEY]@[REGION].ingest.sentry.io/[PROJECT_ID]`

### 3. Add to Render Dashboard

**Frontend Service (`pc-solutions-frontend`):**
```
VITE_SENTRY_DSN = [paste your frontend DSN here]
```

**Admin Service (`pc-solutions-admin`):**
```
VITE_SENTRY_DSN = [paste your admin DSN here]
```

**API Service (`pc-solutions-v2`):**
```
SENTRY_DSN = [paste your API DSN here]
```

### 4. Redeploy
Trigger a manual deploy or wait for next automatic deployment.

## That's It!
Once deployed, Sentry will start tracking errors automatically. No more "DSN not configured" message.

---

**For detailed instructions, see:** [SENTRY_CONFIGURATION_FIX.md](./SENTRY_CONFIGURATION_FIX.md)
