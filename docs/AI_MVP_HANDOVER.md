# ProCrèche AI Assistant — MVP Handover

**Status:** MVP complete and pushed  
**Branch:** `claude/ai-assistant-mvp-HdmO1`  
**Last updated:** 2026-05-22  
**Supersedes:** `docs/AI_LAYER1_HANDOVER.md`  
**Strategic plan:** `docs/AI_ASSISTANT_MASTER_PLAN.md`

---

## 0. TL;DR for the next agent

The entire AI MVP (Layer 1 foundation + Phase 1 internal matching + M0/M1/M2 assistant) is **built and pushed** on branch `claude/ai-assistant-mvp-HdmO1`. It is not yet in a PR against Main.

**What to read before touching any AI code:**

```
docs/AI_ASSISTANT_MASTER_PLAN.md        ← strategic plan, post-MVP roadmap
docs/AI_STAFFING_MANUAL_TASKS.md        ← ops/legal/env-var checklist (on PR #629 branch)
api/src/ai/llm-client.ts                ← the only allowed LLM call entry point
api/src/ai/ai-agents.config.ts          ← agent registry (add all new agents here)
api/src/staffing/staffing.service.ts    ← pattern for specialist modules
api/src/assistant/orchestrator.service.ts ← conversation orchestration pattern
api/prisma/schema.prisma                ← current DB schema (all AI models at the bottom)
CLAUDE.md                               ← project conventions
```

**The architectural rule:** _No file outside `api/src/ai/` may import from `openai`, any LLM SDK, or make direct HTTP calls to LLM APIs._ ESLint enforces this. All LLM calls go through `LlmClient.run()`.

---

## 1. What is built — complete inventory

### 1.1 Layer 1 — Shared AI Foundation ✅

| File | Purpose |
|---|---|
| `api/src/ai/llm-client.ts` | **The gateway** — the only public surface. `LlmClient.run({agent, input, schema, locale, principal})` |
| `api/src/ai/providers/openrouter.adapter.ts` | OpenRouter chat completions (multi-model fallback via `models[]` array) |
| `api/src/ai/providers/voyage.adapter.ts` | Voyage AI embeddings (`voyage-3-lite`) |
| `api/src/ai/circuit-breaker.service.ts` | Opens after 5 consecutive 5xx; resets after 10 min |
| `api/src/ai/audit-log.service.ts` | Writes `AiAuditLog` rows; manages `AiAgentRun` parents |
| `api/src/ai/budget.service.ts` | Per-agent daily token budgets; hard fail at 100%, warn at 70% |
| `api/src/ai/safety.service.ts` | Sensitive-field strip list; `assertCandidateConsent()` |
| `api/src/ai/result-cache.service.ts` | Postgres-backed result cache keyed by content hash |
| `api/src/ai/ai-agents.config.ts` | Agent registry — **add all new agents here** |
| `api/src/ai/model-costs.ts` | Per-token pricing for cost calculation |
| `api/src/ai/queues/ai-exec.queue.ts` | BullMQ queues: `ai.exec`, `ai.embed`, `ai.geocode` |
| `api/src/ai/admin/ai-admin.controller.ts` | `GET /ai/admin/{overview,agents,audit,cost,knowledge,safety,env-check}`, `PATCH /ai/admin/flag` |
| `api/src/ai/agents/echo-validate/` | Proof-of-life agent — round-trips JSON through OpenRouter |

**Known gaps in Layer 1 (not yet implemented):**
- `LlmClient.retrieve()` — RAG retrieval path is not wired (see §4.1)
- Geocoding processor — `ai.geocode` queue is registered, no processor exists (see §4.2)
- `AiOperationsPage.tsx` — i18n wired but admin tabs are read-only; no real-time kill switch confirmed working end-to-end (needs integration test)

---

### 1.2 Layer 2 / Phase 1 — Internal Matching ✅

| File | Purpose |
|---|---|
| `api/src/staffing/staffing.controller.ts` | `POST /staffing/requests`, `GET /staffing/requests/:id`, `GET /staffing/requests/:id/matches` |
| `api/src/staffing/staffing.service.ts` | Creates `StaffingRequest`; sync parse (≤800 chars) or async queue |
| `api/src/staffing/hybrid-matcher.service.ts` | SQL hard filters → weighted score → distance; vector tiebreaker (stub) |
| `api/src/staffing/workers/staffing-parse.processor.ts` | BullMQ: calls staffing-request-parser agent |
| `api/src/staffing/workers/staffing-match.processor.ts` | BullMQ: runs HybridMatcher |
| `api/src/staffing/workers/staffing-explain.processor.ts` | BullMQ: calls match-explanation agent for top 5 |
| `api/src/staffing/workers/staffing-embed.processor.ts` | BullMQ: writes EducatorEmbedding + StaffingRequestEmbedding via raw SQL |
| `api/src/ai/agents/staffing-request-parser/` | Gemini Flash; free text → structured `StaffingRequest` fields |
| `api/src/ai/agents/match-explanation/` | Gemini Flash; score breakdown → 80-word prose explanation |

**Known gaps in Phase 1:**
- Vector ranking is a stub — `HybridMatcherService` scores by rule weights only; vector similarity column exists but the actual cosine query is not wired. Post-MVP P9 in the master plan.
- Geocoding columns (`latitude`, `longitude`) exist on `User`/`Organization` but are never populated — the geocode worker is not built. Distance scoring in `HybridMatcher` falls back to 0. Post-MVP P10.
- No list endpoint for `StaffingRequest` history — `StaffingRequestsPage.tsx` stores history in component state only; a refresh loses it. Simple to add: `GET /staffing/requests?foundationId=...`.

---

### 1.3 MVP M0 — Foundation Staffing UI + i18n ✅

| File | Purpose |
|---|---|
| `frontend/pages/foundation/StaffingRequestsPage.tsx` | Free-text request → polls for matches → candidate shortlist |
| `frontend/App.tsx` | Route `/foundation/staffing-requests` added |
| `packages/translations/locales/{en,fr,de}/staffing.json` | ~35 keys: form, status badges, match display |
| `packages/translations/locales/{en,fr,de}/aiOperations.json` | ~80 keys: admin AI ops dashboard tabs |
| `packages/translations/locales/{en,fr,de}/assistant.json` | ~60 keys: assistant panel, tool states, welcome screen |
| `admin/src/pages/AiOperationsPage.tsx` | Rewired to `useTranslation(['aiOperations'])` |

**Known gaps in M0:**
- `StaffingRequestsPage` is not linked from the foundation sidebar nav or `FoundationDashboardPage`. The route exists and is accessible — but there's no nav entry yet. Add a "Find Candidates" item to the foundation sidebar.
- No pagination on the match list — `getMatches` returns up to 50, UI shows all. Fine for now.

---

### 1.4 MVP M1 — Conversation Infrastructure ✅

| File | Purpose |
|---|---|
| `api/src/assistant/assistant.controller.ts` | `POST /assistant/conversations`, `GET /assistant/conversations/:id`, `POST /assistant/conversations/:id/messages` (SSE) |
| `api/src/assistant/assistant.service.ts` | Conversation lifecycle, message persistence, SSE setup |
| `api/src/assistant/orchestrator.service.ts` | Builds conversation history → calls `assistant-orchestrator` agent → handles tool call loop |
| `api/src/assistant/tools/tool-registry.ts` | 6 tools: `search_help_docs`, `open_modal`, `search_internal_candidates`, `explain_match`, `draft_job_post`, `draft_parent_reply` |
| `api/src/assistant/assistant.module.ts` | Wires module; imports `AiModule` + `StaffingModule` |
| `api/src/ai/agents/assistant-orchestrator/` | Claude Sonnet 4.6 primary / Gemini Pro fallback; multilingual prompt |
| `api/prisma/migrations/20260601000000_add_assistant_core/migration.sql` | Creates 5 new tables |

**Feature flags** (all seeded, default off — enable via admin `/ai` → Settings or direct DB):
```
ai_foundation_enabled   ← master kill switch for ALL LLM calls
ai_staffing_matching    ← enables staffing request matching
ai_assistant_enabled    ← enables the conversational assistant
```

**Known gaps in M1:**
- The orchestrator currently runs **one LLM call per user message** (no multi-step tool loop). If the model's first response proposes a tool and the result should trigger another tool call, that second turn doesn't happen. Implementing a proper tool-call loop (max 3 iterations) is the key next hardening task (see §4.3).
- `search_help_docs` returns a hardcoded placeholder string — RAG retrieval is not wired. Real implementation needs `LlmClient.retrieve()` (see §4.1).
- No rate limiting on `POST /assistant/conversations/:id/messages` — add ThrottlerModule guard (30 req/min per user) in M3.
- No conversation list endpoint — `GET /assistant/conversations` (paginated, for user history) not yet built.

---

### 1.5 MVP M2 — Frontend Assistant Client ✅

| File | Purpose |
|---|---|
| `frontend/components/assistant/AssistantContainer.tsx` | Role gate + open/close state; renders button + panel |
| `frontend/components/assistant/AssistantButton.tsx` | Fixed `bottom-6 right-6` floating button with `SparklesIcon` |
| `frontend/components/assistant/AssistantPanel.tsx` | Chat thread, streaming token rendering, tool-call cards, welcome screen |
| `frontend/components/assistant/AssistantModalHandler.tsx` | Routes `modal_action` SSE events to navigation/modal opening |
| `frontend/components/assistant/index.ts` | Barrel export |
| `frontend/services/assistantService.ts` | `createConversation()` + `streamMessage()` with SSE parsing |

**Role gate:** `AssistantContainer` only renders for `FOUNDATION`, `ADMIN`, `SUPER_ADMIN`. Hidden by `VITE_AI_ASSISTANT_ENABLED=false` env var if needed.

**Known gaps in M2:**
- No conversation persistence across page refreshes — `conversationId` lives in component state; refreshing starts a new conversation. Could use `sessionStorage` as a cheap fix, or a proper history sidebar.
- No loading state if `createConversation()` fails (e.g. feature flag off) — shows the button but first message silently errors. Should show `t('assistant.errors.notEnabled')` toast.
- `AssistantModalHandler` navigation is one-way — it navigates but doesn't pre-fill form fields. The `StaffingRequestsPage` accepts a `?prefill=` query param but nothing parses it yet in the page.
- Tool-call cards don't show a human-readable summary of `args` — just the tool name. A simple formatter per tool name would improve UX.

---

## 2. Database models — current state

All AI-related models are at the bottom of `api/prisma/schema.prisma`:

### From Phase 0 migration (`20260520100000_add_ai_foundation`)
- `CandidateConsent` — consent grants per educator (required before any profile-reading agent call)
- `AiAuditLog` — every LLM call logged (agent, model, tokens, cost, latency, cache hit, principal)
- `AiAgentRun` — groups multi-step `AiAuditLog` rows
- `AiAgentConfig` — runtime prompt version overrides per agent/environment
- `AiResultCache` — Postgres-backed result cache (key, payload, TTL)
- `KnowledgeDocument` — RAG knowledge base (no vector column yet — added in Phase 1 migration)

### From Phase 1 migration (`20260521000000_add_staffing_phase1`)
- `StaffingRequest` — parsed intake (rawText → structured fields after LLM parse)
- `StaffingRequestEmbedding` — pgvector(512) column, populated by embed worker
- `MatchResult` — 1:N with StaffingRequest; scores, explanation, status
- `EducatorEmbedding` — pgvector(512) column per educator
- Additive columns on `User`: `latitude`, `longitude`, `geocodedAt`, `maxCommuteKm`, `availabilitySchemaVersion`, `lastMatchedAt`, `responsivenessScore`
- Additive columns on `Organization`: `latitude`, `longitude`, `geocodedAt`
- `KnowledgeDocument.embedding` — `vector(768)` added in this migration

### From MVP M1 migration (`20260601000000_add_assistant_core`)
- `AIConversation` — userId, role, channel, status, locale
- `AIMessage` — conversationId, sender (USER/ASSISTANT/SYSTEM/TOOL), content, structuredIntent JSON
- `AIToolCall` — toolName, level (L1/L2/L3), inputJson, outputJson, status, approvalRequired
- `AIActionApproval` — for L3 execute-level tools (future use; no L3 tools in MVP)
- `AIContextMemory` — schema only; not hydrated in MVP (Post-MVP P4)

---

## 3. Agent registry — current agents

Defined in `api/src/ai/ai-agents.config.ts`:

| Agent key | Model chain | Max tokens | Allowed roles | Purpose |
|---|---|---|---|---|
| `echo-validate` | Gemini Flash → DeepSeek → Claude Haiku | 200 | ADMIN, SUPER_ADMIN | Health check; proves gateway is model-agnostic |
| `staffing-request-parser` | Gemini Flash → DeepSeek | 120 | FOUNDATION, ADMIN, SUPER_ADMIN | Free text → structured `StaffingRequest` |
| `match-explanation` | Gemini Flash → DeepSeek | 100 | FOUNDATION, ADMIN, SUPER_ADMIN | Score breakdown → 80-word prose; cached 1h |
| `assistant-orchestrator` | Claude Sonnet 4.6 → Gemini Pro | 1000 | FOUNDATION, ADMIN, SUPER_ADMIN | Intent detection + tool selection for assistant |

**Adding a new agent:**
1. Create `api/src/ai/agents/<name>/index.ts`, `prompt.v1.ts`, `schema.ts`, `fixtures/<locale>.json`
2. Add to `AgentName` union type in `ai-agents.config.ts`
3. Add config entry to `AI_AGENTS` object

---

## 4. Known gaps — the short list

These are the most important things to fix or build next, roughly in priority order.

### 4.1 RAG retrieval — `LlmClient.retrieve()` not implemented
**Impact:** `search_help_docs` tool returns a hardcoded string. Agents can't use `retrieval` config.  
**What to build:**
- Implement `LlmClient.retrieve({query, scope, k, principal})` in `llm-client.ts`
- Runs hybrid BM25 (`to_tsvector`) + pgvector cosine on `KnowledgeDocument`
- Returns top-k passages filtered by `principal`'s access scope
- Wire `search_help_docs` tool handler in `orchestrator.service.ts` to call this
- Seed `KnowledgeDocument` rows from the Markdown files in `api/src/ai/knowledge/`

### 4.2 Geocoding worker — not built
**Impact:** `latitude`/`longitude` on `User` and `Organization` are always null. Distance scoring in `HybridMatcher` returns 0 for all candidates.  
**What to build:** `api/src/ai/workers/geocode.processor.ts` — processes `ai.geocode` queue jobs; calls Swisstopo API (primary) → Mapbox (fallback); writes lat/lon back to `User`/`Organization`. Add a backfill job that enqueues all existing rows.  
**Env vars needed:** `MAPBOX_API_KEY` (Swisstopo needs no key).

### 4.3 Multi-step tool-call loop in orchestrator
**Impact:** If the model proposes a tool and the result should trigger a follow-up response, that second turn doesn't happen. The conversation ends after one LLM call.  
**What to build:** In `OrchestratorService.run()`, after `executeTool()` returns a result, feed the result back into a second `llm.run()` call (max 3 iterations; break on no toolCall in output). This is the standard agentic loop pattern.

### 4.4 Foundation sidebar nav entry missing
**Impact:** `/foundation/staffing-requests` exists but foundation users have no nav link to reach it.  
**What to build:** Add a "Find Candidates" (or "Staffing") item to the foundation sidebar in `frontend/components/layout/Sidebar.tsx` (or wherever foundation nav is defined). Also add a card on `FoundationDashboardPage.tsx` linking to it.

### 4.5 Conversation history not persisted across refreshes
**Impact:** Refreshing the page starts a fresh conversation; prior context is lost.  
**Quick fix:** Store `conversationId` in `sessionStorage` in `AssistantPanel.tsx` and restore on mount.  
**Proper fix (Post-MVP P4):** Implement `AIContextMemory` hydration with last-10-conversations summary.

### 4.6 StaffingRequestsPage prefill from assistant modal action
**Impact:** When the assistant uses `open_modal` with `modal: "staffing_request_modal"`, `AssistantModalHandler` navigates to `/foundation/staffing-requests?prefill=<json>`, but `StaffingRequestsPage` doesn't read the query param.  
**What to build:** In `StaffingRequestsPage.tsx`, read `useSearchParams()` → if `prefill` param exists, parse the JSON and pre-populate the textarea on mount.

---

## 5. Post-MVP roadmap (from master plan)

From `docs/AI_ASSISTANT_MASTER_PLAN.md §6`:

| Phase | What | Status |
|---|---|---|
| **M3** — Hardening | Rate limiting, cost per-user cap, eval harness, admin "Assistant" tab, onboarding tour | Not started |
| **P1** — External Routing | `job-ad-generator` agent, `recommend_external_channels` tool, external posting tables | Not started |
| **P2** — HR/Document RAG | Implement `LlmClient.retrieve()`, `hr-doc-search` agent, knowledge base seed | Not started |
| **P3** — Parent Lead Assistant | `parent-lead-classifier`, `parent-reply-drafter`, inline assistant on leads page | Not started |
| **P4** — Memory & Context | Hydrate `AIContextMemory`, inject compressed context into orchestrator prompt | Not started |
| **P5** — Supplier Marketplace | `supplier-quote-drafter`, `search_suppliers` tool | Not started |
| **P6** — E-learning Assistant | `training-recommender`, `assign_elearning_course` tool | Not started |
| **P7** — Admin AI Ops | `staffing-demand-analyst`, KPI query tools, materialised views | Not started |
| **P8** — Reactivation Engine | `reactivation-message-drafter`, `ReactivationCampaign` table, L3 tool | Not started |
| **P9** — Profile Embeddings | Backfill `EducatorEmbedding`, wire vector similarity in `HybridMatcher` | Not started |
| **P10** — Geocoding Worker | `ai.geocode` processor, Swisstopo/Mapbox, backfill job | Not started |
| **P11** — Educator-facing assistant | Open assistant to EDUCATOR role, restricted tool set | Not started |
| **P12** — Parent-facing assistant | Open to PARENT role, very restricted tools | Not started |
| **P13** — WhatsApp channel | Meta WABA webhook, `AIConversation.channel='WHATSAPP'` | Not started |
| **P14** — CV Parsing | `cv-parser` agent, `CandidateExperience`/`CandidateCertification` tables | Not started |

---

## 6. Environment variables — full checklist

### Must be set before the app can call any LLM:
```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_APP_NAME=procreche-staffing
OPENROUTER_SITE_URL=https://procreche.ch
VOYAGE_API_KEY=...
```

### Must be set before geocoding or distance scoring works:
```
MAPBOX_API_KEY=...
```

### Must be set before background AI workers run:
```
REDIS_URL=...
REDIS_ENABLED=true
```

### Optional frontend flag (disables assistant button without touching DB):
```
VITE_AI_ASSISTANT_ENABLED=false   # set to "false" to hide; absent = enabled
```

### No longer needed (superseded by OpenRouter):
```
# GEMINI_API_KEY       — remove from Render if present
# DEEPSEEK_API_KEY     — remove from Render if present
# ANTHROPIC_API_KEY    — remove from Render if present
```

### Future (Phase 5):
```
JOBCLOUD_FEED_TOKEN, JOBCLOUD_FEED_SIGNING_SECRET
JOB_ROOM_CLIENT_ID, JOB_ROOM_CLIENT_SECRET, JOB_ROOM_API_URL
INDEED_API_KEY, INDEED_EMPLOYER_ID
```

---

## 7. Manual pre-deployment checklist

Before enabling any feature flag in production:

- [ ] `OPENROUTER_API_KEY` set in Render env
- [ ] `VOYAGE_API_KEY` set in Render env
- [ ] `MAPBOX_API_KEY` set in Render env
- [ ] Redis provisioned; `REDIS_URL` + `REDIS_ENABLED=true` set
- [ ] Postgres extensions enabled: `CREATE EXTENSION IF NOT EXISTS vector; cube; earthdistance;`
- [ ] OpenRouter account credits topped up (~$20 initial); monthly cap set (~$50)
- [ ] Voyage AI monthly cap set (~$20)
- [ ] `api/src/ai/knowledge/role-taxonomy.md` reviewed by domain expert
- [ ] `api/src/ai/knowledge/canton-equivalences.md` reviewed by domain/legal expert
- [ ] Consent language approved by legal before EDUCATOR-facing features go live
- [ ] Pilot foundation accounts identified for flag rollout

---

## 8. How to add the next specialist module (pattern)

The master plan defines new specialist modules (P1–P14) each following this pattern. Use `api/src/staffing/` as the canonical reference:

```
1. New agent(s) in api/src/ai/agents/<module-name>/
   - index.ts (AgentConfig)
   - prompt.v1.ts (locale-aware function)
   - schema.ts (Zod)
   - fixtures/<locale>.json (golden test cases)
   - Register in ai-agents.config.ts

2. New module in api/src/<module-name>/
   - <module>.controller.ts (REST endpoints)
   - <module>.service.ts (business logic; calls LlmClient.run())
   - <module>.module.ts (wires up; exports service)
   - Register in app.module.ts

3. New tool(s) in api/src/assistant/tools/tool-registry.ts
   - Add entry with name, description, level, allowedRoles, modal?
   - Handle in OrchestratorService.executeTool() switch

4. New Prisma migration if tables needed
   - Timestamp: YYYYMMDDHHMMSS_description
   - Update schema.prisma

5. New translation namespace if new UI strings
   - packages/translations/locales/{en,fr,de}/<module>.json
   - Source EN → run pnpm translate → FR/DE auto-filled
   - pnpm i18n:check must pass

6. New frontend component/page if UI needed
   - Route in frontend/App.tsx
   - Nav entry in sidebar
```

---

## 9. Conventions — enforced rules

- **No LLM SDK imports outside `api/src/ai/`** — ESLint rule; CI fails if violated
- **Every new agent** needs `index.ts`, `prompt.v1.ts`, `schema.ts`, `fixtures/` with at least one golden case per supported locale
- **Every new tool** needs an entry in `tool-registry.ts` and a case in `OrchestratorService.executeTool()`
- **Every L2/L3 action** must go through the approval gate — never bypass `approvalRequired`
- **Every new UI string** needs keys in all three locales — `pnpm i18n:check` enforces this in CI
- **Staffing features** live in `api/src/staffing/` — never modify `api/src/recruitment/`
- **Assistant orchestration** lives in `api/src/assistant/` — separate from `api/src/ai/` (the gateway)
- **AI-generated content** must store the locale alongside it (e.g. `MatchResult.explanationLocale`) so re-generation on language switch is possible
- **Migrations** are timestamp-prefixed; use raw SQL for `Unsupported` Prisma types (pgvector)
- **`pnpm type-check`**, **`pnpm lint`**, **`pnpm i18n:check`** must all pass before a PR merges
