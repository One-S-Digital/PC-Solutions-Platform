# AI Integration — Layer 1 Handover

> ⚠️ **This document is historical reference.** The active strategic plan is **`docs/AI_ASSISTANT_MASTER_PLAN.md`** — which supersedes this doc's "what to build next" section. The "what was built" inventory below remains accurate for Layer 1 / Phase 0.
>
> **Phase 1 (Internal Matching MVP)** described in §4 below has been **completed on branch `claude/review-handover-plan-UHBvr`** (commit `9f1a9f3`). See the master plan for the remaining work.

---

**Branch:** `claude/analyze-ai-layer-1-8rj9s`
**PR:** #647
**Status:** Layer 1 (Phase 0 — Shared AI Foundation) **complete and pushed**. Layer 2 (Phases 1–6) **not started**.
**Full plan:** `docs/AI_STAFFING_INTEGRATION_PLAN.md` (from branch `claude/ai-integration-plan-JBbzG`, also open as PR #629)

---

## 1. What was built (do not rebuild)

### Backend — `api/src/ai/`

| File | Purpose |
|---|---|
| `llm-client.ts` | **The gateway** — the only public surface for all feature modules. Call `LlmClient.run({agent, input, schema, locale, principal})`. Handles feature flag, RBAC, consent gate, budget, cache, circuit breaker, OpenRouter call, Zod validation, audit write. |
| `providers/openrouter.adapter.ts` | OpenAI-compatible client pointing at `openrouter.ai`. Passes `models[]` array for native provider fallback. `stream: false` explicitly set. |
| `providers/voyage.adapter.ts` | Direct Voyage AI embeddings (`voyage-3-lite`). Completely separate from the chat path. |
| `circuit-breaker.service.ts` | Opens after 5 consecutive OpenRouter 5xx; auto-resets after 10 min. |
| `audit-log.service.ts` | Writes `AiAuditLog` rows. Manages `AiAgentRun` parent records for multi-step orchestrations. |
| `budget.service.ts` | Aggregates today's tokens per agent. Throws at 100% of `dailyTokenBudget`; logs warn at 70%. |
| `safety.service.ts` | Sensitive-field strip list. `assertCandidateConsent(userId)` pre-check. |
| `result-cache.service.ts` | Postgres-backed cache via `AiResultCache` table. Key = content hash. |
| `ai-agents.config.ts` | Agent registry — model chains, output ceilings, allowed roles, scope rules. Currently has one agent: `echo-validate`. **Add all new agents here.** |
| `model-costs.ts` | Per-provider per-token pricing. USD cost calculated on every audit log row. |
| `agents/echo-validate/` | Proof-of-life agent. Proves the gateway is model-agnostic. |
| `admin/ai-admin.controller.ts` | REST endpoints for admin dashboard: `GET overview/agents/audit/cost/knowledge/safety/env-check`, `PATCH flag`, `PATCH agents/:name/config`. |
| `queues/ai-exec.queue.ts` | BullMQ queues: `ai.exec`, `ai.embed`, `ai.geocode`. All conditionally registered under `REDIS_ENABLED`. |
| `ai.module.ts` | Wires everything. Registered in `app.module.ts`. |

### Database — Prisma schema additions

Six new models (migration at `api/prisma/migrations/20260520100000_add_ai_foundation/`):

| Model | Purpose |
|---|---|
| `AiAuditLog` | Append-only log of every LLM call. Fields: agentName, promptVersion, model, fallbackUsed, inputHash, outputHash, tokenUsage, costUsd, latencyMs, cacheHit, principalId, organizationId, entityRef, retrievedDocIds, agentRunId |
| `AiAgentRun` | Groups child `AiAuditLog` rows for multi-step orchestrations |
| `AiAgentConfig` | Runtime overrides: active prompt version per agent per environment/foundation |
| `AiResultCache` | Postgres-backed LLM result cache (key, agent, payload, modelUsed, expiresAt) |
| `KnowledgeDocument` | RAG knowledge base (source, locale, cantonScope, content — no vector column yet, see §3) |
| `CandidateConsent` | Versioned consent grants per educator. Required before any agent reads a User profile. |

Also: `CandidateConsent[]` relation added to `User` model.

**Extensions enabled** in `schema.prisma`: `vector`, `cube`, `earthdistance` (previewFeatures: `postgresqlExtensions`).
**Note:** Extensions must be manually enabled on production Postgres before the migration runs — see `docs/AI_STAFFING_MANUAL_TASKS.md §A.3`.

### Admin dashboard — `admin/src/pages/AiOperationsPage.tsx`

Single-page, 7 horizontal tabs using the existing `Tabs` component:
- **Overview** — kill switch, provider status, stat tiles, live feed (auto-refresh 15s)
- **Agents** — 24h aggregate table, prompt version config panel
- **Audit Log** — paginated/filterable, expandable rows
- **Cost** — MTD, projected EOM, per-agent breakdown, daily chart
- **Knowledge** — RAG document library (empty until seeded)
- **Safety** — consent counts, revocation log
- **Settings** — kill switch duplicate, env-var presence check

Route: `/ai` in admin. Sidebar: under `platformOps` group with `Brain` icon. Translations added for en/fr/de.

### Packages installed

`zod`, `openai`, `handlebars` added to `api/package.json`.

---

## 2. The gateway contract — how feature modules call the AI

```ts
// The ONLY way to call an LLM from any feature module:
import { LlmClient } from '../ai/llm-client';

const result = await this.llm.run({
  agent: 'staffing-request-parser',   // must exist in AI_AGENTS
  input: { rawText, locale },          // field-allowlist enforced per agent
  schema: StaffingRequestSchema,       // Zod schema — validation + type safety
  locale: 'fr',
  principal: { userId, role, organizationId },
  entityRef: staffingRequest.id,       // optional — for audit tracing
});
// result.output is typed as z.infer<typeof StaffingRequestSchema>
```

**Rule enforced by ESLint:** No file outside `api/src/ai/` may import from `openai`, `@google/generative-ai`, `@anthropic-ai/sdk`, or make direct fetch calls to LLM API domains.

---

## 3. Known gaps / things not yet done in Layer 1

These were acknowledged as incomplete when the layer was shipped:

1. **`KnowledgeDocument` has no vector column.** The schema has the table but the `vector(768)` embedding column was intentionally deferred because pgvector requires the extension to be live on the DB first. Add it once production has confirmed `CREATE EXTENSION vector` is done. The column should be: `embedding Unsupported("vector(768)")?` with a `@@index` using HNSW.

2. **`EmbeddingClient.retrieve()` not implemented.** `LlmClient.embed()` delegates to `VoyageAdapter` but the RAG retrieval path (`LlmClient.retrieve({query, scope, k, principal})`) referenced in the plan is not wired up yet. Agents that declare `retrieval` in their config will need this before they work.

3. **Geocoding worker not built.** `ai.geocode` BullMQ queue is registered but no processor exists. Phase 1 needs lat/lon on `User` and `Organization` (see §4 below).

4. **`AiModule` is not exported from a barrel.** Feature modules should import `AiModule` via `app.module.ts` dependency injection, not direct file imports.

5. **`echo-validate` agent has no fixtures.** The plan calls for a `fixtures/` directory per agent for the eval harness (golden input/output pairs). Add these before writing prompt v2+.

6. **Circuit breaker state is in-memory.** Survives restarts but resets on deploy. Acceptable for now; Redis-backed state is the upgrade path.

---

## 4. What to build next — Layer 2, Phase 1 (Internal Matching MVP)

This is the first consumer of the Layer 1 foundation. All the plumbing exists — Phase 1 is about staffing-specific features on top of it.

### 4.1 Prisma schema additions needed for Phase 1

All are additive. Add in one migration:

```prisma
// New tables
model StaffingRequest { ... }           // generalised intake (free-text → structured)
model StaffingRequestEmbedding { ... }  // 1:1 with StaffingRequest, pgvector
model MatchResult { ... }               // 1:N with StaffingRequest, with explanation + score
model EducatorEmbedding { ... }         // 1:1 with User (EDUCATOR only), pgvector

// Additive columns on User
latitude          Decimal?
longitude         Decimal?
geocodedAt        DateTime?
maxCommuteKm      Int?
availabilitySchemaVersion Int @default(1)
lastMatchedAt     DateTime?
responsivenessScore Decimal @default(0)

// Additive columns on Organization
latitude          Decimal?
longitude         Decimal?
geocodedAt        DateTime?

// Additive column on JobListing (for Phase 4)
staffingRequestId String?   // nullable FK to StaffingRequest
```

Also add `NotificationType` enum values: `SHORTLIST_READY`, `CANDIDATE_RESPONDED`.

### 4.2 New agents to register in `ai-agents.config.ts`

Add each to `AI_AGENTS` and create the corresponding `api/src/ai/agents/<name>/` folder:

| Agent key | Task | Model | Max tokens | Scope |
|---|---|---|---|---|
| `staffing-request-parser` | Free text → structured `StaffingRequest` JSON | `google/gemini-2.5-flash` | 120 | `organization` (FOUNDATION only) |
| `match-explanation` | Score breakdown → 80-word prose | `google/gemini-2.5-flash` | 100 | `organization` |

Each agent folder needs: `index.ts`, `prompt.v1.ts`, `schema.ts`, `fixtures/` (at least one golden case).

### 4.3 New NestJS module: `api/src/staffing/`

- `StaffingModule` with `StaffingController` and `StaffingService`
- Register in `app.module.ts`
- **DO NOT touch** `api/src/recruitment/` — keep it as-is per CLAUDE.md

Key endpoints:
```
POST   /staffing/requests           — parse + create StaffingRequest (enqueue staffing.parse-request)
GET    /staffing/requests/:id       — get request + status
GET    /staffing/requests/:id/matches — get MatchResult list for this request
```

### 4.4 New BullMQ queues (in `api/src/staffing/` or extend `ai-exec.queue.ts`)

```
staffing.parse-request   — calls match-explanation agent, creates StaffingRequest row
staffing.match           — runs HybridMatcher, creates MatchResult rows
staffing.explain         — calls match-explanation agent for top 3–5 candidates
staffing.embed-profile   — calls VoyageAdapter.embed(), writes EducatorEmbedding
staffing.embed-request   — writes StaffingRequestEmbedding
```

### 4.5 Hybrid Matcher service

`api/src/staffing/hybrid-matcher.service.ts` — pure scoring logic, no LLM:

1. **SQL hard filters** (Prisma where clause): `candidatePoolVisible=true`, `approvalStatus=APPROVED`, canton overlap, language overlap, work-% band, role overlap, contract type
2. **Weighted score** (in TypeScript, not SQL): Role 20 / Availability 20 / Location 15 / Qualification 15 / Language 10 / Age-group 10 / Contract 5 / Responsiveness 5
3. **Distance** via `earthdistance` Postgres extension (requires lat/lon to be populated first)
4. **Vector similarity** as tiebreaker only (once embeddings exist)

This replaces the `findMatchingCandidates` stub at `api/src/recruitment/recruitment.service.ts:728`. The stub currently returns the whole pool with no scoring — leave it in place and route new `/staffing/requests` to the new service instead.

### 4.6 Foundation UI changes

Replace the placeholder candidate list on the foundation dashboard with a staffing-request text box and shortlist table. The relevant frontend page is likely at `frontend/pages/foundation/` — check the current route for the foundation dashboard.

---

## 5. Environment variables required

These must be set before any Phase 1 work will run end-to-end:

| Var | Purpose | Required by |
|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter chat completions | Layer 1 gateway |
| `OPENROUTER_SITE_URL` | Sent as `HTTP-Referer` | OpenRouter best practice |
| `OPENROUTER_APP_NAME` | Sent as `X-Title` | OpenRouter attribution |
| `VOYAGE_API_KEY` | Voyage AI embeddings | Phase 1 embed workers |
| `MAPBOX_API_KEY` | Geocoding fallback | Phase 1 geocode worker |
| `REDIS_URL` or `REDIS_HOST` | BullMQ queues | All async workers |

The admin UI `Settings` tab has an env-var presence check at `GET /ai/admin/env-check`.

The `ai_foundation_enabled` feature flag **must be seeded and set to `isActive: true`** for any gateway call to succeed. The seed is in `api/prisma/seed.ts`. Toggle from the admin `/ai` → Settings tab if needed.

---

## 6. How the plan maps to build phases

From `docs/AI_STAFFING_INTEGRATION_PLAN.md`:

| Phase | Status | What it is |
|---|---|---|
| **Phase 0** — Shared AI Foundation | ✅ **Done** | Everything in `api/src/ai/` |
| **Phase 1** — Internal Matching MVP | ⬜ Not started | §4 above |
| **Phase 2** — CV Parsing + Profile Enrichment | ⬜ Not started | CV parser agent, `CandidateExperience`/`CandidateCertification` tables, embedding worker |
| **Phase 3** — Reactivation Engine | ⬜ Not started | Handlebars templates + `ReactivationCampaign` table |
| **Phase 4** — External Routing (manual) | ⬜ Not started | Job-ad generator agent, short-link tracker, capture landing page |
| **Phase 5** — External APIs | ⬜ Not started | JobCloud XML feed, Job-Room, Indeed adapters |
| **Phase 6** — Staffing Intelligence | ⬜ Not started | Materialised views, demand heatmap agent, KPI tiles |

---

## 7. Key files to read before starting

```
docs/AI_STAFFING_INTEGRATION_PLAN.md   — full plan, all phases
docs/AI_STAFFING_MANUAL_TASKS.md       — env vars, accounts, legal tasks (not code)
api/src/ai/ai-agents.config.ts         — agent registry (extend this for Phase 1)
api/src/ai/llm-client.ts               — gateway contract
api/src/ai/model-costs.ts              — model pricing
api/prisma/schema.prisma               — current DB schema (has all Layer 1 tables)
CLAUDE.md                              — project conventions, key file locations
```

---

## 8. Conventions to follow

- **No LLM SDK imports outside `api/src/ai/`** — enforced by ESLint.
- **Every new agent** needs its own folder under `api/src/ai/agents/<name>/` with `index.ts`, `prompt.v1.ts`, `schema.ts`, `fixtures/`.
- **Prompt templates** use Handlebars (`.v1.ts` exports a function `(input, locale) => string`).
- **All AI calls are async via BullMQ** — never call `LlmClient.run()` synchronously in a request handler (exception: the parser preview where sub-second feedback is needed, per the plan).
- **Staffing features live in `api/src/staffing/`** — do not modify `api/src/recruitment/`.
- **Feature flags**: use `ai_foundation_enabled` as the master switch; add per-phase flags (`ai_staffing_matching`, etc.) as needed.
- **Migrations** are timestamp-prefixed: `YYYYMMDDHHMMSS_description`. Use `IF NOT EXISTS` in DDL where Prisma doesn't generate it automatically.
