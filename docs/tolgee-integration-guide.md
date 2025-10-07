# Complete i18n Migration to Tolgee for ProCrèche Monorepo

A comprehensive, end-to-end playbook to **completely replace** your current i18n implementation with Tolgee, eliminate legacy JSON files, and modernize your translation workflow.

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Spin up Tolgee (Self-hosted)](#2-spin-up-tolgee-self-hosted--10-minutes)
3. [Import Existing JSONs](#3-import-your-existing-jsons-one-time)
4. [Frontend Wiring (Next.js)](#4-frontend-wiring-nextjs)
5. [Environment Configuration](#5-env-configuration)
6. [Namespace & Key Hygiene](#6-namespace--key-hygiene-fix-your-earlier-issues)
7. [Dev Ergonomics: In-Context Editing](#7-dev-ergonomics-in-context-editing)
8. [CI Guardrails](#8-ci-guardrails-no-regressions)
9. [Testing: Assert Localized Render](#9-testing-assert-localized-render)
10. [Deployment](#10-deployment-renderrailwayyour-vps)
11. [Translator Workflow](#11-translator-workflow-day-to-day)
12. [Rollout Plan](#12-rollout-plan-safe--fast)
13. [Troubleshooting](#13-troubleshooting-quick-list)

## 1. Current State & Migration Goals

### Current i18n Implementation (TO BE REMOVED)
```
/frontend/src/i18n/     # i18next configuration
/frontend/src/locales/  # JSON files (en, fr, de)
/admin/src/i18n/        # i18next configuration  
/admin/src/locales/     # JSON files (en, fr, de)
```

### Target Architecture (TOLGEE-ONLY)
```
/frontend           # Next.js with Tolgee SDK
/admin              # Next.js with Tolgee SDK
/api                # Node/Express (no i18n needed)
/infra              # Tolgee + PostgreSQL
/locales            # DELETED (replaced by Tolgee)
```

**Migration Goal:** Complete elimination of JSON files and i18next in favor of Tolgee's cloud-based translation management.

**Target languages:** en, fr, de (add more later)  
**Namespaces:** common, auth, dashboard, pricing (add as needed)

## 2. Spin up Tolgee (Self-hosted) — 10 minutes

### Create `/infra/tolgee.docker-compose.yml`:

```yaml
version: "3.8"
services:
  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: tolgee
      POSTGRES_USER: tolgee
      POSTGRES_PASSWORD: tolgee
    volumes:
      - tolgee_pg:/var/lib/postgresql/data

  tolgee:
    image: tolgee/tolgee:latest
    restart: unless-stopped
    ports: ["8080:8080"]
    environment:
      TOLGEE_AUTHENTICATION_ENABLED: "true"
      TOLGEE_INITIAL_USERNAME: "admin@procrechesolutions.com"
      TOLGEE_INITIAL_PASSWORD: "ChangeThis123"
      TOLGEE_AUTHENTICATION_DEFAULT_ENABLED: "true"
      TOLGEE_APP_FRONTEND_URL: "http://localhost:8080"
      SPRING_DATASOURCE_URL: "jdbc:postgresql://db:5432/tolgee"
      SPRING_DATASOURCE_USERNAME: "tolgee"
      SPRING_DATASOURCE_PASSWORD: "tolgee"
    depends_on: [db]

volumes:
  tolgee_pg:
```

### Run:

```bash
cd infra
docker compose -f tolgee.docker-compose.yml up -d
```

### Setup:

1. Open http://localhost:8080
2. Log in with the credentials above
3. Create Project → **ProCreche Platform**
4. Default language: **en**
5. Add languages: **fr**, **de**
6. Create namespaces: **common**, **auth**, **dashboard**, **pricing**

**Tip:** Create an API key (Project → Settings → API keys) with Read for production, Read/Write for dev.

## 3. Export & Import Legacy JSONs (One-time Migration)

### Step 1: Export Current Translations
```bash
# Export from frontend
cp -r frontend/src/locales ./legacy-locales-frontend
cp -r admin/src/locales ./legacy-locales-admin

# Create consolidated export
mkdir -p ./migration-export
```

### Step 2: Import into Tolgee
In Tolgee UI → your project → Import → choose **i18next JSON format**.

Import by language + namespace:

**Frontend translations:**
- `legacy-locales-frontend/en/common.json` → en / namespace common
- `legacy-locales-frontend/fr/common.json` → fr / namespace common
- `legacy-locales-frontend/de/common.json` → de / namespace common
- `legacy-locales-frontend/en/auth.json` → en / namespace auth
- `legacy-locales-frontend/fr/auth.json` → fr / namespace auth
- `legacy-locales-frontend/de/auth.json` → de / namespace auth
- `legacy-locales-frontend/en/dashboard.json` → en / namespace dashboard
- `legacy-locales-frontend/fr/dashboard.json` → fr / namespace dashboard
- `legacy-locales-frontend/de/dashboard.json` → de / namespace dashboard

**Admin translations:**
- `legacy-locales-admin/en/common.json` → en / namespace admin-common
- `legacy-locales-admin/fr/common.json` → fr / namespace admin-common
- `legacy-locales-admin/de/common.json` → de / namespace admin-common
- `legacy-locales-admin/en/dashboard.json` → en / namespace admin-dashboard
- `legacy-locales-admin/fr/dashboard.json` → fr / namespace admin-dashboard
- `legacy-locales-admin/de/dashboard.json` → de / namespace admin-dashboard

**Clean up placeholders:** Don't import values where `value === key`. Fix those now or leave empty (Tolgee will fall back to en).

## 4. Complete Frontend Migration (Remove i18next)

**IMPORTANT:** This section completely removes i18next and replaces it with Tolgee SDK.

### A) Use Tolgee React SDK (RECOMMENDED - Complete Migration)

#### Step 1: Remove i18next Dependencies

```bash
cd frontend
npm uninstall i18next react-i18next i18next-browser-languagedetector
npm i @tolgee/react @tolgee/core
```

#### Step 2: Delete Legacy Files

```bash
# Remove old i18n files
rm -rf src/i18n/
rm -rf src/locales/
rm -rf public/locales/  # if exists
```

#### Step 3: Create Tolgee Provider

Create `frontend/src/providers/TolgeeProvider.tsx`:

```tsx
"use client";
import { TolgeeProvider, Tolgee, DevTools, FormatSimple } from '@tolgee/react';

const tolgee = Tolgee()
  .use(DevTools())       // remove in production if you prefer
  .use(FormatSimple())
  .init({
    apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL!,  // e.g. http://localhost:8080
    apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY!,  // Read/Write for dev
    availableLanguages: ['en', 'fr', 'de'],
    fallbackLanguage: 'en',
  });

export function TolgeeAppProvider({ children }: { children: React.ReactNode }) {
  return <TolgeeProvider tolgee={tolgee}>{children}</TolgeeProvider>;
}
```

#### Step 4: Replace App Layout

**App Router** (`frontend/app/layout.tsx`):

```tsx
import { TolgeeAppProvider } from '@/providers/TolgeeProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TolgeeAppProvider>{children}</TolgeeAppProvider>
      </body>
    </html>
  );
}
```

#### Step 5: Update All Components

**Replace ALL i18next usage with Tolgee:**

```tsx
// OLD (i18next) - DELETE THIS
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('dashboard');

// NEW (Tolgee) - USE THIS
import { useTranslate } from '@tolgee/react';
const { t } = useTranslate('dashboard', { keyPrefix: 'dashboardPage' });
```

**Example component migration:**

```tsx
"use client";
import { useTranslate } from '@tolgee/react';

export function DashboardTitle() {
  const { t } = useTranslate('dashboard', { keyPrefix: 'dashboardPage' });
  return <h1>{t('quickLinks')}</h1>;
}
```

#### Step 6: Repeat for Admin

**Do the same for `/admin`:**

```bash
cd admin
npm uninstall i18next react-i18next i18next-browser-languagedetector
npm i @tolgee/react @tolgee/core
rm -rf src/i18n/ src/locales/ public/locales/
```

Copy the TolgeeProvider and update admin layout accordingly.

## 5. Environment Configuration

### Create `.env.local` in frontend and admin:

```bash
NEXT_PUBLIC_TOLGEE_API_URL=http://localhost:8080
NEXT_PUBLIC_TOLGEE_API_KEY=YOUR_DEV_READWRITE_KEY
NEXT_PUBLIC_I18N_LANGS=en,fr,de
```

**In production, use a Read-only key. Never expose a write key in public prod builds.**

## 6. Complete Codebase Cleanup (Remove All i18next References)

### Step 1: Remove i18next Imports
```bash
# Find and remove all i18next imports
find frontend admin -name "*.tsx" -o -name "*.ts" | xargs grep -l "react-i18next\|i18next" | xargs sed -i '/import.*react-i18next\|import.*i18next/d'
```

### Step 2: Update Translation Calls
Replace all `useTranslation()` calls with `useTranslate()`:

```bash
# Replace useTranslation with useTranslate
find frontend admin -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/useTranslation/useTranslate/g'
```

### Step 3: Remove i18next Configuration Files
```bash
# Remove any remaining i18next config
rm -f frontend/src/i18n.ts
rm -f admin/src/i18n.ts
rm -f frontend/i18next.config.js
rm -f admin/i18next.config.js
```

### Step 4: Update Package.json Scripts
Remove i18next-related scripts:

```json
{
  "scripts": {
    // REMOVE THESE:
    // "extract-i18n": "...",
    // "test:i18n": "...",
    
    // KEEP THESE:
    "i18n:guard": "ts-node --transpile-only scripts/i18n-guard.ts"
  }
}
```

### Step 5: Clean Up Legacy Directories
```bash
# Remove all legacy i18n directories
rm -rf frontend/src/locales/
rm -rf admin/src/locales/
rm -rf frontend/public/locales/
rm -rf admin/public/locales/
rm -rf ./legacy-locales-frontend/
rm -rf ./legacy-locales-admin/
rm -rf ./migration-export/
```

## 7. Dev Ergonomics: In-Context Editing

While logged into Tolgee (same browser), in dev you can hover and edit any string inline.

This is the **#1 feature your translators will love**. Toggle with the Tolgee DevTools widget.

## 8. CI Guardrails (no regressions)

Add a small checker to fail builds if there are placeholders or missing critical keys.

### Create `scripts/i18n-guard.ts`:

```typescript
// Simple static check against JSON files (run pre-migration or on exported snapshots)
import fs from 'fs'; 
import path from 'path';

const LOCALES_DIR = path.resolve('locales'); // adapt if you keep snapshots
const BAD_VALUES = new Set(['/month', 'save 10%', 'Save 10%']);

let errors = 0;
const walk = (obj: any, prefix: string[] = []) =>
  Object.entries(obj).flatMap(([k, v]) => 
    typeof v === 'object' ? walk(v as any, [...prefix, k]) : [[...prefix, k, v]]
  );

for (const lng of (fs.existsSync(LOCALES_DIR) ? fs.readdirSync(LOCALES_DIR) : [])) {
  const dir = path.join(LOCALES_DIR, lng);
  if (!fs.statSync(dir).isDirectory()) continue;
  
  for (const file of fs.readdirSync(dir)) {
    const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const [ns, key, val] of walk(json)) {
      const keyPath = `${ns}.${key}`;
      if (val === keyPath || BAD_VALUES.has(String(val).trim())) {
        console.error(`❌ ${lng}/${file}: "${keyPath}" has placeholder "${val}"`);
        errors++;
      }
    }
  }
}

if (errors) process.exit(1);
console.log('✅ i18n guard passed');
```

### `package.json`:

```json
{
  "scripts": {
    "i18n:guard": "ts-node --transpile-only scripts/i18n-guard.ts"
  }
}
```

**Optional:** Write a tiny ESLint rule (or regex lint) that errors on `useTranslation()` without a namespace outside whitelisted files.

## 9. Testing: Assert Localized Render

### Example with React Testing Library (frontend):

```tsx
// __tests__/pricing.i18n.test.tsx
import { render, screen } from '@testing-library/react';
import { TolgeeProvider, Tolgee, FormatSimple } from '@tolgee/react';
import { PricingCard } from '@/components/PricingCard';

function renderWithTolgee(lang: 'en' | 'fr') {
  const tolgee = Tolgee().use(FormatSimple()).init({
    apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL!,
    apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY!,
    availableLanguages: ['en', 'fr'],
    fallbackLanguage: 'en',
    language: lang,
  });
  return render(
    <TolgeeProvider tolgee={tolgee}>
      <PricingCard plan="pro" />
    </TolgeeProvider>
  );
}

test('shows FR strings when language=fr', async () => {
  renderWithTolgee('fr');
  expect(await screen.findByText(/\/mois/i)).toBeInTheDocument(); // e.g. labels.perMonth
});
```

## 10. Deployment (Render/Railway/your VPS)

1. Deploy the Tolgee stack (tolgee + postgres) using the same docker compose
2. Expose https://tolgee.yourdomain.com with TLS
3. Create a Read-only API key for production
4. Set env on frontend and admin:

```bash
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.yourdomain.com
NEXT_PUBLIC_TOLGEE_API_KEY=prod_readonly_key
```

**Keep at least English bundled locally as a safety fallback (optional).**

## 11. Translator Workflow (day-to-day)

1. Translators log into Tolgee UI
2. Use screenshots and comments per key for context
3. Status flow: **Untranslated → Translated → Reviewed**
4. Enable Translation Memory and Glossary (e.g., HR terms, daycare roles)
5. If you need approvals: make "Reviewer" mandatory before prod

## 12. Complete Migration Rollout Plan (Eliminate i18next)

### Week 1: Preparation & Setup
- [ ] **Host Tolgee** (Docker setup)
- [ ] **Export all legacy JSONs** from frontend and admin
- [ ] **Import into Tolgee** with proper namespaces
- [ ] **Remove i18next dependencies** from both apps
- [ ] **Install Tolgee SDK** in both apps
- [ ] **Delete all JSON files** and i18n directories

### Week 2: Code Migration
- [ ] **Replace all useTranslation()** with useTranslate()
- [ ] **Update all components** to use Tolgee SDK
- [ ] **Remove i18next imports** and configuration files
- [ ] **Clean up package.json** scripts
- [ ] **Test in development** with DevTools enabled

### Week 3: Production Cutover
- [ ] **Deploy Tolgee** to production
- [ ] **Switch production apps** to Tolgee (read-only key)
- [ ] **Train translators** on in-context editing
- [ ] **Verify all translations** are working
- [ ] **Delete legacy i18n documentation**

### Week 4: Optimization
- [ ] **Enable Translation Memory** and Glossary
- [ ] **Set up automated workflows**
- [ ] **Implement quality assurance** processes
- [ ] **Monitor performance** and user experience

## 13. Troubleshooting Quick List

| Issue | Solution |
|-------|----------|
| Keys visible on screen | Namespace missing; or key absent; or `returnEmptyString: true` (set to false) |
| No updates in dev | Not logged into Tolgee in the same browser; DevTools not enabled; wrong API URL |
| Prod 401/403 | Using write key or expired key; rotate to prod Read-only key |
| Latency | Host Tolgee closer to your users; cache responses in your app if needed |

## TL;DR - Complete i18n Elimination

1. **Host Tolgee with Docker**
2. **Export & import all legacy JSONs into Tolgee**
3. **Completely remove i18next** from both frontend and admin
4. **Replace with Tolgee React SDK** (no i18next backend)
5. **Delete all JSON files** and i18n directories
6. **Deploy with read-only key**; use in-context editing

---

## Why This Complete Migration Approach?

### Problems with Current i18n Setup:
- **JSON file management** is error-prone and doesn't scale
- **No translator interface** - requires developer involvement
- **No translation memory** or consistency tools
- **Manual key extraction** and namespace management
- **No in-context editing** for translators
- **Version control conflicts** with translation files

### Benefits of Complete Tolgee Migration:
- **Cloud-based translation management** - no more JSON files
- **In-context editing** - translators can edit directly in the app
- **Translation memory** and glossary for consistency
- **Automated key extraction** and namespace management
- **Real-time collaboration** between translators
- **Quality assurance** workflows and approval processes
- **API-driven** - no file system dependencies

### Migration Strategy: Complete Replacement
This guide advocates for **complete elimination** of i18next rather than gradual migration because:

1. **Cleaner codebase** - no legacy i18n code to maintain
2. **Faster adoption** - translators get full Tolgee features immediately
3. **No technical debt** - eliminates i18next complexity entirely
4. **Better DX** - developers work with one translation system
5. **Future-proof** - Tolgee handles all translation needs

**Result:** A modern, scalable translation system that eliminates the need for JSON files and provides a superior experience for both developers and translators.