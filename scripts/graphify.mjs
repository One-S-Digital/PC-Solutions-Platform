#!/usr/bin/env node
/**
 * graphify v1.0 — static analysis for PC-Solutions-Platform
 *
 * Scans the monorepo and (re)generates:
 *   graphify-out/graph.json        machine-readable dependency graph
 *   graphify-out/GRAPH_REPORT.md   human/Claude-readable report
 *
 * Run:  node scripts/graphify.mjs
 */

import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'graphify-out');

// Directories under api/src that are NestJS infrastructure, not feature modules
const API_INFRA_DIRS = new Set(['common', 'compat', 'prisma', 'types', 'utils', 'platform', 'src']);

// Known module descriptions — add new entries as modules evolve
const MODULE_DESCRIPTIONS = {
  auth:                   ['JWT validation, Clerk sync, CASL RBAC', 'Clerk, Passport, CASL'],
  admin:                  ['Back-office ops, role management', 'auth'],
  marketplace:            ['Product catalog, ordering, search', 'billing, categories'],
  billing:                ['Stripe subscriptions + payments', 'Stripe SDK'],
  messaging:              ['Real-time chat (Socket.io)', 'Redis'],
  leads:                  ['Lead capture & CRM pipeline', 'mailing'],
  elearning:              ['Learning content, courses', 'content'],
  mailing:                ['Email campaigns', 'SendGrid, Mailgun'],
  'email-notification':   ['Transactional notifications', 'mailing'],
  categories:             ['Product/service taxonomy', '—'],
  content:                ['CMS-style content management', '—'],
  analytics:              ['User behaviour tracking', '—'],
  dashboard:              ['Aggregated stats per role', 'analytics'],
  crawler:                ['Web content crawling & classification', '—'],
  'frontend-settings':    ['Feature flags, per-role config', '—'],
  profiles:               ['User profile data', 'auth'],
  users:                  ['User account management', 'auth'],
  'user-management':      ['Admin user management ops', 'auth'],
  recruitment:            ['Job/candidate matching', '—'],
  support:                ['Support tickets', '—'],
  upload:                 ['File upload & S3 storage', '—'],
  webhooks:               ['Incoming webhook handlers (Clerk, Stripe)', 'auth, billing'],
  settings:               ['Per-user settings', '—'],
  'subscription-management': ['Subscription lifecycle ops', 'billing'],
  'content-management':   ['CMS content CRUD', 'content'],
  'content-moderation':   ['Content review & moderation', 'content'],
  maintenance:            ['Maintenance mode controls', '—'],
  metrics:                ['Platform metrics & health', '—'],
  security:               ['Security audit logging', '—'],
  sync:                   ['Data sync jobs', '—'],
  translation:            ['Dynamic translation management', '—'],
  'static-translation':   ['Static i18n string delivery', '—'],
  'translation-errors':   ['Translation error tracking', '—'],
  'organization-documents': ['Org document storage', 'upload'],
  partners:               ['Partner integrations', '—'],
  'platform-settings':    ['Global platform configuration', '—'],
  'policy-alerts':        ['Policy change alerts', 'mailing'],
  principal:              ['Principal/org entity management', '—'],
  'promo-codes':          ['Promotional code management', 'billing'],
  'system-configuration': ['System-level config', '—'],
  'system-monitoring':    ['System health monitoring', 'metrics'],
  'vendor-clients':       ['Third-party vendor client wrappers', '—'],
  health:                 ['Health check endpoint', '—'],
};

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function files(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith(ext));
}

function hasFile(dir, ext) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((n) => n.endsWith(ext));
}

// ─── Scan API modules ────────────────────────────────────────────────────────

function scanApiModules() {
  const srcDir = join(ROOT, 'api', 'src');
  return subdirs(srcDir)
    .filter((name) => !API_INFRA_DIRS.has(name) && hasFile(join(srcDir, name), '.module.ts'))
    .map((name) => {
      const [desc, deps] = MODULE_DESCRIPTIONS[name] || ['—', '—'];
      return { id: `mod-${name}`, name, path: `api/src/${name}/`, desc, deps };
    });
}

// ─── Scan frontend ───────────────────────────────────────────────────────────

function scanFrontendComponents() {
  const dir = join(ROOT, 'frontend', 'src', 'components');
  return subdirs(dir).map((name) => ({ name, path: `frontend/src/components/${name}/` }));
}

function scanFrontendPages() {
  const dir = join(ROOT, 'frontend', 'src', 'pages');
  return subdirs(dir).map((name) => ({ name, path: `frontend/src/pages/${name}/` }));
}

function scanFrontendContexts() {
  const dir = join(ROOT, 'frontend', 'src', 'contexts');
  return files(dir, '.tsx')
    .concat(files(dir, '.ts'))
    .map((f) => ({ name: f.replace(/\.(tsx?|jsx?)$/, ''), path: `frontend/src/contexts/${f}` }));
}

// ─── Scan admin ──────────────────────────────────────────────────────────────

function scanAdminPages() {
  const dir = join(ROOT, 'admin', 'src', 'pages');
  return readdirSync(dir)
    .filter((n) => n.endsWith('.tsx') || n.endsWith('.ts'))
    .map((n) => n.replace(/\.(tsx?)$/, ''));
}

function scanAdminComponentDirs() {
  const dir = join(ROOT, 'admin', 'src', 'components');
  return subdirs(dir);
}

import { readFileSync } from 'fs';

function scanPackagesSync() {
  const dir = join(ROOT, 'packages');
  return subdirs(dir).map((name) => {
    const pkgJson = join(dir, name, 'package.json');
    let pkgName = `@repo/${name}`;
    if (existsSync(pkgJson)) {
      try { pkgName = JSON.parse(readFileSync(pkgJson, 'utf8')).name || pkgName; } catch { /* ignore */ }
    }
    return { name, path: `packages/${name}/`, pkgName };
  });
}

// ─── Generate graph.json ─────────────────────────────────────────────────────

function buildGraph(apiModules, packages, frontendComponents, frontendPages, frontendContexts, adminPages, adminComponentDirs) {
  const now = new Date().toISOString().slice(0, 10);

  const nodes = [
    { id: 'frontend', type: 'app', path: 'frontend/', tech: 'React 19 + Vite + Tailwind', entry: 'frontend/src/main.tsx' },
    { id: 'admin', type: 'app', path: 'admin/', tech: 'React 19 + Vite', entry: 'admin/src/main.tsx' },
    { id: 'api', type: 'app', path: 'api/', tech: 'NestJS', entry: 'api/src/main.ts' },
    ...packages.map((p) => ({ id: `pkg-${p.name}`, type: 'package', path: p.path, name: p.pkgName })),
    ...apiModules.map((m) => ({ id: m.id, type: 'api-module', path: m.path })),
    ...frontendComponents.map((c) => ({ id: `fc-${c.name}`, type: 'frontend-component-dir', path: c.path })),
    ...frontendPages.map((pg) => ({ id: `fp-${pg.name}`, type: 'frontend-page-dir', path: pg.path })),
    ...frontendContexts.map((ctx) => ({ id: `ctx-${ctx.name}`, type: 'context', path: ctx.path })),
  ];

  const edges = [
    { from: 'frontend', to: 'pkg-ui' },
    { from: 'frontend', to: 'pkg-types' },
    { from: 'frontend', to: 'pkg-translations' },
    { from: 'admin', to: 'pkg-ui' },
    { from: 'admin', to: 'pkg-types' },
    { from: 'admin', to: 'pkg-translations' },
    { from: 'api', to: 'pkg-types' },
    { from: 'api', to: 'pkg-translations' },
    { from: 'mod-marketplace', to: 'mod-billing' },
    { from: 'mod-marketplace', to: 'mod-categories' },
    { from: 'mod-leads', to: 'mod-mailing' },
    { from: 'mod-email-notification', to: 'mod-mailing' },
    { from: 'mod-dashboard', to: 'mod-analytics' },
    { from: 'mod-elearning', to: 'mod-content' },
  ].filter((e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to));

  return {
    version: '1.0',
    generated: now,
    repo: 'pc-solutions-platform',
    type: 'monorepo',
    nodes,
    edges,
    meta: {
      apiModuleCount: apiModules.length,
      packageCount: packages.length,
      adminPageCount: adminPages.length,
      frontendComponentDirCount: frontendComponents.length,
    },
  };
}

// ─── Generate GRAPH_REPORT.md ─────────────────────────────────────────────────

function buildReport(graph, apiModules, packages, frontendComponents, frontendPages, frontendContexts, adminPages, adminComponentDirs) {
  const date = graph.generated;

  const modulesTable = apiModules
    .map((m) => `| \`${m.name}\` | ${m.desc} | ${m.deps} |`)
    .join('\n');

  const componentsTable = frontendComponents
    .map((c) => `| \`${c.name}/\` | — |`)
    .join('\n');

  const contextsTable = frontendContexts.length
    ? frontendContexts.map((c) => `| \`${c.name}\` | — |`).join('\n')
    : '| *(none found)* | — |';

  const pagesSection = frontendPages.length
    ? frontendPages.map((p) => `├── ${p.name}/`).join('\n')
    : '*(none found)*';

  const packagesTable = packages
    .map((p) => `| \`${p.pkgName}\` | \`${p.pkgName}\` | — |`)
    .join('\n');

  const adminPagesList = adminPages.map((p) => `- \`${p}\``).join('\n');
  const adminComponentList = adminComponentDirs.map((d) => `- \`${d}/\``).join('\n');

  return `# PC-Solutions-Platform — Graph Report

Generated: ${date} | Tool: graphify v1.0 (static analysis)

---

## Module Map

\`\`\`
pc-solutions-platform/
├── frontend/          React 19 SPA — 7-role marketplace UI
├── admin/             React 19 SPA — back-office dashboard
├── api/               NestJS — centralized REST + WebSocket API
└── packages/
${packages.map((p) => `    ├── ${p.name}/`).join('\n')}
\`\`\`

---

## API Modules (${apiModules.length} modules under \`api/src/\`)

| Module | Key responsibility | Notable deps |
|---|---|---|
${modulesTable}

---

## Frontend Pages (\`frontend/src/pages/\`)

\`\`\`
pages/
${pagesSection}
\`\`\`

**Main router**: \`frontend/src/App.tsx\` — contains all role-based route guards.

---

## Admin App (\`admin/src/\`)

### Pages
${adminPagesList}

### Component Directories
${adminComponentList}

---

## Frontend Component Domains (\`frontend/src/components/\`)

| Directory | Contains |
|---|---|
${componentsTable}

---

## Context Providers (\`frontend/src/contexts/\`)

| Context | Purpose |
|---|---|
${contextsTable}

---

## Shared Packages

| Package | Import path | Use case |
|---|---|---|
${packagesTable}

---

## Data Flow: Typical Request

\`\`\`
Browser
  └── Clerk JWT (Authorization header)
        └── NestJS API Gateway
              ├── JwtAuthGuard (validates Clerk token)
              ├── RolesGuard (CASL ability check)
              └── Module Controller
                    ├── Service (business logic)
                    ├── Prisma ORM → PostgreSQL
                    ├── Redis (cache / Bull job queue)
                    └── External: Stripe / SendGrid / S3
\`\`\`

---

## Auth & Role Model

- **Provider**: Clerk (hosted auth UI + JWT)
- **Sync**: Clerk webhooks → \`api/src/auth/\` → Prisma User record
- **RBAC**: CASL \`ability\` definitions scoped per role
- **Roles** (enum in \`@workspace/types\`):
  - \`SUPER_ADMIN\` — full platform access
  - \`ADMIN\` — managed admin access (uses \`/admin\` app)
  - \`FOUNDATION\` — grant/program management
  - \`PRODUCT_SUPPLIER\` — product catalog & orders
  - \`SERVICE_PROVIDER\` — service listings & leads
  - \`EDUCATOR\` — availability, elearning, parent-facing profile
  - \`PARENT\` — marketplace browsing, child management

---

## Key Entry Points

| File | Role |
|---|---|
| \`frontend/src/main.tsx\` | Frontend SPA entry |
| \`frontend/src/App.tsx\` | All frontend routes + role guards |
| \`admin/src/main.tsx\` | Admin SPA entry |
| \`api/src/main.ts\` | NestJS bootstrap |
| \`api/src/app.module.ts\` | Root NestJS module (imports all modules) |
| \`api/prisma/schema.prisma\` | Full DB schema |
| \`turbo.json\` | Build task graph |
| \`render.yaml\` | Production deployment spec |

---

## Dependency Graph (inter-module)

\`\`\`
frontend  ──imports──▶  @repo/ui, @workspace/types, @workspace/translations
admin     ──imports──▶  @repo/ui, @workspace/types, @workspace/translations
api       ──imports──▶  @workspace/types, @workspace/translations

api/auth    ◀── guards ── all other api modules
api/billing ◀── checks ── marketplace, elearning, leads
api/mailing ◀── sends  ── email-notification, leads, auth
api/messaging ◀── socket ── frontend
\`\`\`

---

## Build & Scripts

| Script | Purpose |
|---|---|
| \`pnpm build\` | Turborepo build all apps |
| \`pnpm dev\` | Dev servers for all apps |
| \`pnpm lint\` / \`lint:fix\` | ESLint across all packages |
| \`pnpm type-check\` | TS check across all packages |
| \`pnpm test\` | Vitest + Playwright |
| \`pnpm db:migrate\` | Prisma migrate deploy |
| \`pnpm graphify\` | Regenerate this graph report |

---

## Maintenance Notes

- Regenerate this report after major structural changes: \`pnpm graphify\`
- Update \`graph.json\` is regenerated automatically by the same command
- Report path: \`graphify-out/GRAPH_REPORT.md\`
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('graphify v1.0 — scanning monorepo…\n');

  const apiModules = scanApiModules();
  const packages = scanPackagesSync();
  const frontendComponents = scanFrontendComponents();
  const frontendPages = scanFrontendPages();
  const frontendContexts = scanFrontendContexts();

  let adminPages = [];
  let adminComponentDirs = [];
  try { adminPages = scanAdminPages(); } catch { /* admin may not exist */ }
  try { adminComponentDirs = scanAdminComponentDirs(); } catch { /* admin may not exist */ }

  console.log(`  API modules:       ${apiModules.length}`);
  console.log(`  Packages:          ${packages.length}`);
  console.log(`  Admin pages:       ${adminPages.length}`);
  console.log(`  Frontend comp dirs:${frontendComponents.length}`);
  console.log(`  Frontend page dirs:${frontendPages.length}`);
  console.log(`  Frontend contexts: ${frontendContexts.length}`);
  console.log('');

  const graph = buildGraph(apiModules, packages, frontendComponents, frontendPages, frontendContexts, adminPages, adminComponentDirs);
  const report = buildReport(graph, apiModules, packages, frontendComponents, frontendPages, frontendContexts, adminPages, adminComponentDirs);

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  writeFileSync(join(OUT, 'graph.json'), JSON.stringify(graph, null, 2) + '\n', 'utf8');
  writeFileSync(join(OUT, 'GRAPH_REPORT.md'), report, 'utf8');

  console.log('  graphify-out/graph.json       written');
  console.log('  graphify-out/GRAPH_REPORT.md  written');
  console.log('\nDone.');
}

main();
