# Translation System — Full Specification

## 1) Purpose & Scope

Enable a platform to operate in multiple languages by **separating static UI text** from **dynamic user-generated content (UGC)**, auto-translating only where needed, never overwriting existing translations, and serving the **best available** text for each request language.

* Static UI: buttons, menus, screens → **i18next JSON catalogs** (code-owned).
* Dynamic content: profiles, service providers, products, job applications, posts, etc. → **database translations** (data-owned).
* No UI badge for machine translations (MT). Translation metadata is backend-only.

---

## 2) Language Strategy

* `SUPPORTED_LANGS = ['en', 'fr', 'de']` (example).
* `DEFAULT_LANG = 'en'`.
* Each entity instance has a **source language** (detected at first save or set explicitly).
* Resolution priority when reading a field in language `L`:
  **target(L) → source\_lang → DEFAULT\_LANG → ''**

---

## 3) System Architecture

### 3.1 Components

* **Frontend**: Uses `i18next` for static UI. Calls backend read APIs with `?lang=<uiLang>`.
* **Extractor** (Static): `i18next-parser` configured to **update only the source catalog (en)**.
* **Backend API** (REST/GraphQL): CRUD for entities + read endpoints with language parameter.
* **Translation Worker**: Background job (BullMQ/Sidekiq/Celery) that:

  * Detects source language on create/update.
  * Auto-translates missing or outdated fields to target languages.
  * Writes per-language rows to DB (never overwriting unless source changed).
* **MT Provider** abstraction: pluggable adapter (DeepL/Google/Azure/local model).
* **Cache**: Redis for resolved reads per (`entityType`, `id`, `lang`).
* **Search Index** (optional): language-aware indexing per (`entity`,`lang`).

### 3.2 Data Flow Overview

1. **Write**: User submits entity data → backend saves source text + `source_lang` → enqueue translation job.
2. **Worker**: Translates only missing/outdated targets (hash compare) → upserts per-language rows.
3. **Read**: Client requests `/api/:type/:id?lang=fr` → backend resolves best texts via priority chain → returns localized payload.

---

## 4) Static UI (i18next) — Guardrails

**Do not scan dynamic content.** Configure extractor to only touch `en` catalogs:

```js
// i18next-parser.config.js
module.exports = {
  locales: ['en'],
  defaultNamespace: 'common',
  output: 'public/locales/$LOCALE/$NAMESPACE.json',
  useKeysAsDefaultValue: false,
  defaultValue: (locale, ns, key, value) => value || '',
  keySeparator: '.',
  namespaceSeparator: ':',
  createOldCatalogs: false,
  sort: true,
  keepRemoved: true,
};
```

In code:

```ts
t('dashboardPage.welcome', 'Welcome back');
```

Runtime init (frontend):

```ts
i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  ns: ['common','dashboard','auth'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  saveMissing: false,
  returnEmptyString: false,
});
```

---

## 5) Dynamic Content — Data Model

### 5.1 Generic (recommended)

**entity\_sources**

* `entity_type VARCHAR(32)`      // 'user','service\_provider','product','job\_application',...
* `entity_id UUID`
* `source_lang VARCHAR(8)`
* `created_at TIMESTAMP`
* `updated_at TIMESTAMP`
* **Unique** (`entity_type`,`entity_id`)

**entity\_translations**

* `entity_type VARCHAR(32)`
* `entity_id UUID`
* `lang VARCHAR(8)`              // ISO code
* `field VARCHAR(64)`            // e.g. 'display\_name','bio','title','description',...
* `text TEXT`
* `origin ENUM('machine') DEFAULT 'machine'` // backend-only
* `verified BOOLEAN DEFAULT false`           // future-proofing
* `source_hash CHAR(64)`         // sha256 of the current source text for this field
* `updated_at TIMESTAMP DEFAULT now()`
* **PK/Unique** (`entity_type`,`entity_id`,`lang`,`field`)
* Index (`entity_type`,`lang`)

> Option B: per-entity `*_translations` tables with same columns if you need strict FK constraints.

### 5.2 Field Registry

Central config of translatable fields:

```ts
export const FIELDS_BY_ENTITY: Record<string, string[]> = {
  user: ['display_name','bio'],
  service_provider: ['name','about','services'],
  product: ['title','subtitle','short_desc','long_desc','features'],
  job_application: ['headline','cover_letter','portfolio_summary'],
  // extend as needed
};
```

---

## 6) Write Path (Create/Update Any Entity)

1. **Collect** all free-text fields from payload by `FIELDS_BY_ENTITY[entityType]`.
2. **Detect language** from concatenated free-text (CLD3/FastText/etc.).

   * New entity → `source_lang = detected || DEFAULT_LANG`.
   * Existing entity → keep stored `source_lang` unless explicitly changed.
3. **Upsert source rows** into `entity_translations`:

   * `lang = source_lang`
   * `text = provided value`
   * `origin = 'machine'`
   * `verified = false`
   * `source_hash = sha256(value)`
4. **Upsert/ensure** row in `entity_sources` with `source_lang`.
5. **Enqueue** `TranslateEntity({ entity_type, entity_id })` (asynchronous).

*Notes*

* Perform minimal validation (length, allowed markup).
* Use transactions where applicable.

---

## 7) Background Worker — TranslateEntity

For each entity’s translatable **field** and each target `lang` in `SUPPORTED_LANGS` excluding `source_lang`:

1. Read **source text** for (`entity_type`,`entity_id`,`source_lang`,`field`).
2. Compute `newHash = sha256(sourceText)`.
3. Fetch existing target row (`lang`,`field`).
4. **Skip** if target exists and `existing.source_hash === newHash`.
5. Else:

   * `translated = MT.translate({ text: sourceText, from: source_lang, to: lang })`
   * Upsert `entity_translations`:

     * `text = translated`
     * `origin = 'machine'`
     * `verified = false`
     * `source_hash = newHash`

**Retries & Backoff**

* Retry on 429/5xx with exponential backoff + jitter.
* Circuit-break to fallback provider if primary fails.

**Cost Controls**

* Batch short texts per language/provider when feasible.
* Log char counts per day/provider for cost tracking.

---

## 8) Read Path (Resolve Best Text)

**Public API**: `GET /api/:entityType/:id?lang=fr`

Resolver per field:

1. Try (`lang=fr`).
2. Fallback to (`lang=source_lang`).
3. Fallback to (`lang=DEFAULT_LANG`).
4. Else empty string or omit.

**Response (no metadata exposed):**

```json
{
  "id": "e3f…",
  "lang": "fr",
  "fields": {
    "display_name": "Marie Dupont",
    "bio": "Éducatrice passionnée par la nature et la créativité."
  }
}
```

**Admin/Debug**: `GET /admin/:type/:id?lang=fr&includeMeta=true`

* Same shape, but field values include `{ value, lang, origin, updated_at, source_lang }`.

**Caching**

* Cache resolved payload per (`entityType`,`id`,`lang`) for 5–15 minutes.
* **Invalidate** cache on:

  * entity update
  * translation write for that (`entity`,`lang`)

---

## 9) Search & Indexing (Optional but Recommended)

* Create a **search document per (`entity`,`lang`)** with resolved texts in that language.
* Use locale analyzers (e.g. Elastic `analysis-icu`).
* Reindex when source changes or new MT written.
* For cross-lingual search, consider multilingual embeddings later.

---

## 10) Notifications, Emails, PDFs

* Template language = **recipient’s UI language**.
* Interpolate dynamic fields by calling the **resolver** in that language.
* Dates/numbers formatting handled by frontend/backend i18n formatters per locale (not stored in DB).

---

## 11) Security & Privacy

* Sanitize user HTML (if allowed) at save and/or render (DOMPurify/OWASP).
* PII: ensure only allowed fields are returned per role.
* Do **not** expose `origin`, `verified`, `source_hash` in public APIs.
* Encrypt MT provider API keys; rotate regularly.
* Log and mask long user texts in error logs.

---

## 12) Observability & QA

**Metrics**

* `mt.requests`, `mt.chars`, `mt.failures`
* `translation.skipped_same_hash`
* `detection.confidence_histogram`

**Logs**

* Detection result + confidence (debug).
* Provider latencies & retries.

**Dashboards**

* Coverage per language (% fields translated).
* Error rates by provider/lang.

---

## 13) CI/CD Guardrails

* **Static catalogs test**: fail build if any non-source locale value equals its key (UI catalogs only).
* **Hook order (lint-staged/pre-commit)**:

  1. Run i18n extractor → writes **only `en`**.
  2. Run merge script for static catalogs (fills missing keys in fr/de/it without overwrite).
  3. Run catalogs test above.
* **Dynamic data** is not part of repo; no extractor touches it.

---

## 14) Admin Tools

* **Translations Grid**: For any entity, show columns per language and field.
  (You won’t translate manually now, but this helps support/debug.)
* **Re-translate button**: Re-enqueue job for a field/lang if needed (e.g., after engine switch).
* **Coverage report**: % of entities with complete translations per language.

---

## 15) Rollout & Migration Plan

1. **Schema**: deploy `entity_sources` and `entity_translations`.
2. **Backfill** existing entities:

   * Detect `source_lang` from their current texts.
   * Insert source rows for each field@`source_lang`.
   * Enqueue `TranslateEntity` for all entities.
3. **Read switch** (feature flag): enable resolver in prod, falling back to existing behavior if disabled.
4. **Monitor** MT volumes & costs for first two weeks; adjust batching/limits.

---

## 16) Example End-to-End

**User** (French UI) creates a Service Provider:

```json
{
  "name": "Atelier des Petits",
  "about": "Accompagnement créatif pour enfants de 3 à 6 ans.",
  "services": "Ateliers nature, peinture, musique."
}
```

**Write**:

* Detects `source_lang = 'fr'`.
* Upserts `entity_translations` for (`service_provider`, id, `fr`, `name|about|services`) with `origin='machine'`, `verified=false`, `source_hash`.
* Enqueues translate job.

**Worker**:

* For `en`, `de`, `it`, translates each field (if missing or hash changed) and upserts.

**Read** (German UI):
`GET /api/service_provider/:id?lang=de` → returns DE translations; if any missing, falls back to FR source.

---

## 17) Minimal Interfaces (Pseudocode)

**MT Adapter**

```ts
export interface MTProvider {
  translate(params: { text: string; from: string; to: string }): Promise<string>;
  detect?(text: string): Promise<{ lang: string; confidence: number }>;
}
```

**Service Helpers**

```ts
async function saveEntity(entityType, id, payload) { /* detect, upsert source, enqueue */ }
async function translateEntityJob({ entityType, id }) { /* hash compare & upsert MT */ }
async function resolveFields(entityType, id, lang, fields) { /* target > source > default */ }
```

---

## 18) Do / Don’t Checklist

**Do**

* Keep static UI in i18next JSON; extract **en only**.
* Store all UGC translations in DB rows per (`entity`,`lang`,`field`).
* Re-translate **only** when source changes (hash).
* Cache resolved reads; invalidate on writes.
* Hide MT metadata from public clients.

**Don’t**

* Run i18n extractors over dynamic content.
* Overwrite existing target rows blindly.
* Expose `origin/verified/source_hash` in public APIs.
* Block request threads on MT; always queue.

---

## 19) Performance & Cost Tips

* Debounce translation jobs (e.g., 2–5s delay) to coalesce rapid edits.
* Batch by provider/lang where API allows.
* Track characters/month and set soft budgets with alerts.
* Prefer short, concise source fields; avoid redundant long texts.

---

## 20) Extensibility

* Add languages by editing `SUPPORTED_LANGS`; backfill via bulk job.
* Swap MT engine by replacing the adapter; retranslate on demand using `source_hash` diffing.
* If you later allow **human edits**, simply set `origin='human'`, `verified=true` on PATCH, and keep the same resolver (human > machine > source).

---

This blueprint gives you a robust, low-regret multilingual system: simple for devs, safe for translators, and seamless for users—no regressions, no accidental overwrites, and consistent behavior across **all** user-input entities.
