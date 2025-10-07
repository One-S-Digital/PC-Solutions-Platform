# Tolgee Integration Guide for ProCrèche Monorepo

A comprehensive, end-to-end playbook to integrate Tolgee into your ProCrèche monorepo the right way, prevent regressions, and keep translators productive.

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

## 1. Monorepo Structure

```
/frontend           # Next.js (user app)
/admin              # Next.js (admin dashboard)  
/api                # Node/Express (no i18n needed)
/infra              # docker-compose, deploy files
/locales            # legacy JSONs (temporary during migration)
```

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

## 3. Import your existing JSONs (one-time)

In Tolgee UI → your project → Import → choose **i18next JSON format**.

Import by language + namespace:

- `locales/en/common.json` → en / namespace common
- `locales/fr/common.json` → fr / namespace common
- `locales/de/common.json` → de / namespace common
- `locales/en/auth.json` → en / namespace auth
- `locales/fr/auth.json` → fr / namespace auth
- `locales/de/auth.json` → de / namespace auth
- `locales/en/dashboard.json` → en / namespace dashboard
- `locales/fr/dashboard.json` → fr / namespace dashboard
- `locales/de/dashboard.json` → de / namespace dashboard
- `locales/en/pricing.json` → en / namespace pricing
- `locales/fr/pricing.json` → fr / namespace pricing
- `locales/de/pricing.json` → de / namespace pricing

**Don't import placeholder values where `value === key`.** Fix those now or leave empty (Tolgee will fall back to en).

## 4. Frontend Wiring (Next.js)

You have two good options. Pick **A** if you're happy to adopt Tolgee's SDK (best DX), or **B** to keep react-i18next with minimal changes.

### A) Use Tolgee React SDK (recommended)

#### Install:

```bash
cd frontend
npm i @tolgee/react @tolgee/core
```

#### Create `frontend/src/providers/TolgeeProvider.tsx`:

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

#### Wrap your app:

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

#### Use in components:

```tsx
"use client";
import { useTranslate } from '@tolgee/react';

export function DashboardTitle() {
  const { t } = useTranslate('dashboard', { keyPrefix: 'dashboardPage' });
  return <h1>{t('quickLinks')}</h1>;
}
```

**Repeat the same setup for `/admin`** (copy provider + layout).

### B) Keep react-i18next (compatible path)

#### Install:

```bash
cd frontend
npm i i18next react-i18next @tolgee/i18next
```

#### `frontend/src/i18n.ts`:

```typescript
import i18n from 'i18next';
import { TolgeeBackend } from '@tolgee/i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(TolgeeBackend)
  .use(initReactI18next)
  .init({
    backend: {
      apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL,
      apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY,
    },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'auth', 'dashboard', 'pricing'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

export default i18n;
```

In your app entry (e.g., `_app.tsx` or root layout client boundary), import `./i18n` once.

Then continue to use:

```tsx
const { t } = useTranslation('dashboard', { keyPrefix: 'dashboardPage' });
```

## 5. Environment Configuration

### Create `.env.local` in frontend and admin:

```bash
NEXT_PUBLIC_TOLGEE_API_URL=http://localhost:8080
NEXT_PUBLIC_TOLGEE_API_KEY=YOUR_DEV_READWRITE_KEY
NEXT_PUBLIC_I18N_LANGS=en,fr,de
```

**In production, use a Read-only key. Never expose a write key in public prod builds.**

## 6. Namespace & Key Hygiene (fix your earlier issues)

### Always pass a namespace
Replace bare `useTranslation()` with `useTranslation('dashboard')` (or `useTranslate('dashboard')` in Tolgee SDK).

If helpful, run a quick search/replace or a codemod.

### Remove inline English fallbacks
Stop calling `t(key, englishText)`. Let fallback logic show en.

For Pricing: create a pricing namespace and fetch via `useTranslate('pricing')`.

### Ban placeholder values
No more `"settingsPage.loading": "settingsPage.loading"`. Fix en copies; leave others empty if needed.

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

## 12. Rollout Plan (safe & fast)

### Week 1
- [ ] Host Tolgee
- [ ] Import JSONs
- [ ] Wire SDK in frontend + admin (dev env)
- [ ] Fix namespaces + remove inline fallbacks
- [ ] Turn on DevTools; verify screens in en/fr/de

### Week 2
- [ ] Clean placeholders in en
- [ ] Fill high-traffic fr keys (dashboard, pricing)
- [ ] Add CI guard + basic tests
- [ ] Ship to staging with Read-only key

### Week 3
- [ ] Switch production to Tolgee
- [ ] Train translators on in-context editing
- [ ] Schedule weekly JSON export backups

## 13. Troubleshooting Quick List

| Issue | Solution |
|-------|----------|
| Keys visible on screen | Namespace missing; or key absent; or `returnEmptyString: true` (set to false) |
| No updates in dev | Not logged into Tolgee in the same browser; DevTools not enabled; wrong API URL |
| Prod 401/403 | Using write key or expired key; rotate to prod Read-only key |
| Latency | Host Tolgee closer to your users; cache responses in your app if needed |

## TL;DR

1. **Host Tolgee with Docker**
2. **Import your JSONs by language + namespace**
3. **Use Tolgee React SDK (or i18next backend) with explicit namespaces**
4. **Remove inline English fallbacks; rely on `fallbackLanguage='en'`**
5. **Add CI guardrails + a couple of tests**
6. **Deploy with a read-only key; use in-context editing for rapid iteration**

---

## Migration from Current i18n Implementation

If you're currently using the existing i18n setup described in `i18n-implementation-guide.md`, here's how to migrate:

### Phase 1: Parallel Setup
1. Keep existing i18next setup running
2. Set up Tolgee alongside (different port)
3. Import current JSON files into Tolgee
4. Test Tolgee integration in development

### Phase 2: Gradual Migration
1. Start using Tolgee for new features
2. Migrate high-priority components one by one
3. Keep both systems running during transition

### Phase 3: Full Cutover
1. Migrate all components to Tolgee
2. Remove old i18next configuration
3. Delete legacy JSON files
4. Update CI/CD pipelines

### Phase 4: Optimization
1. Enable advanced Tolgee features (Translation Memory, Glossary)
2. Set up automated workflows
3. Train translators on new tools
4. Implement quality assurance processes

This approach ensures zero downtime and allows for thorough testing at each phase.