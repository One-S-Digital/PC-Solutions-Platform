# ProCrèche AI Assistant — Master Plan

**Status:** Active planning document — supersedes `AI_LAYER1_HANDOVER.md` for strategic direction
**Last updated:** 2026-05-21
**Owner:** AI integration workstream

---

## 0. TL;DR

We are not building a chatbot. We are building the **ProCrèche Virtual Assistant** — a role-aware natural-language command layer that orchestrates every platform workflow (staffing, HR docs, parent leads, suppliers, e-learning, WhatsApp) through a single conversational surface backed by structured tool calls and pre-filled modals.

**Architectural rule:** _The assistant understands and prepares. The platform validates and executes._

```
Shared AI Foundation  (✅ Layer 1 — done)
        ↓
AI Virtual Assistant / Orchestrator   ← THE NEW CORE
        ↓
Connected modals + specialist modules
        ↓
Staffing (Phase 1 done) · External Routing · HR Docs · Parent Leads
Suppliers · E-learning · WhatsApp (later)
```

---

## 1. Current state — what exists today

### 1.1 Layer 1: Shared AI Foundation ✅
Branch `claude/analyze-ai-layer-1-8rj9s` (PR #647) — fully shipped.

| Component | Path | Status |
|---|---|---|
| LLM gateway | `api/src/ai/llm-client.ts` | ✅ |
| OpenRouter adapter | `api/src/ai/providers/openrouter.adapter.ts` | ✅ |
| Voyage adapter (embeddings) | `api/src/ai/providers/voyage.adapter.ts` | ✅ |
| Circuit breaker | `api/src/ai/circuit-breaker.service.ts` | ✅ |
| Audit log + AiAgentRun | `api/src/ai/audit-log.service.ts` | ✅ |
| Budget service | `api/src/ai/budget.service.ts` | ✅ |
| Safety / consent | `api/src/ai/safety.service.ts` | ✅ |
| Result cache (Postgres) | `api/src/ai/result-cache.service.ts` | ✅ |
| Agent registry | `api/src/ai/ai-agents.config.ts` | ✅ |
| BullMQ queues (ai.exec, ai.embed, ai.geocode) | `api/src/ai/queues/ai-exec.queue.ts` | ✅ (geocode processor not built) |
| Admin AI ops dashboard | `admin/src/pages/AiOperationsPage.tsx` | ⚠️ functional but **i18n missing** (hardcoded EN) |
| Prisma models (AiAuditLog, AiAgentRun, AiAgentConfig, AiResultCache, KnowledgeDocument, CandidateConsent) | `api/prisma/schema.prisma` | ✅ |
| `echo-validate` proof-of-life agent | `api/src/ai/agents/echo-validate/` | ✅ (fixtures added in Phase 1 commit) |

**Known Layer 1 gaps still open:**
- `KnowledgeDocument.embedding` vector(768) column — added by Phase 1 migration ✅
- `LlmClient.retrieve()` (RAG retrieval path) — not implemented
- Geocoding worker — queue registered, no processor
- AiOperationsPage.tsx — **does not use `useTranslation`** (hardcoded English) — must be fixed
- Circuit breaker is in-memory (acceptable for now)

### 1.2 Layer 2 / Phase 1: Internal Matching MVP ✅
Branch `claude/review-handover-plan-UHBvr` (this branch) — just shipped in commit `9f1a9f3`.

| Component | Path | Status |
|---|---|---|
| Prisma additions (StaffingRequest, StaffingRequestEmbedding, MatchResult, EducatorEmbedding) | `api/prisma/schema.prisma` | ✅ |
| Geo cols on User/Organization + JobListing.staffingRequestId | `api/prisma/schema.prisma` | ✅ |
| Migration with pgvector/cube/earthdistance extensions | `api/prisma/migrations/20260521000000_add_staffing_phase1/migration.sql` | ✅ |
| Pre-build extension script | `api/scripts/enable-pg-extensions.sql` | ✅ |
| `staffing-request-parser` agent (FR/DE/EN prompt, Zod schema, golden fixture) | `api/src/ai/agents/staffing-request-parser/` | ✅ |
| `match-explanation` agent | `api/src/ai/agents/match-explanation/` | ✅ |
| StaffingModule (controller, service, hybrid matcher, queues, processors) | `api/src/staffing/` | ✅ |
| `ai_staffing_matching` feature flag (default off) | `api/prisma/seed.ts` | ✅ |
| Sync preview path (≤800 chars) + async queue path | `api/src/staffing/staffing.service.ts` | ✅ |
| Foundation UI — staffing request box + shortlist table | `frontend/pages/foundation/` | ❌ **NOT BUILT** |
| i18n keys for staffing module | `packages/translations/locales/{en,fr,de}/staffing.json` | ❌ **NOT ADDED** |
| Geocoding worker (`ai.geocode` processor) | `api/src/staffing/workers/` | ❌ stub job exists, no processor |
| Embedding workers — vector writes implemented via raw SQL | `api/src/staffing/workers/staffing-embed.processor.ts` | ✅ |

---

## 2. The architecture we are building toward

### 2.1 Three layers

```
┌──────────────────────────────────────────────────────────────────┐
│ Layer 1 — Shared AI Foundation                                    │
│   model routing · prompt registry · RAG · cost tracking · safety  │
│   tool/function calling · audit logs · approval workflow          │
│   memory & context store                                          │
└──────────────────────────────────────────────────────────────────┘
                              ↑ called by
┌──────────────────────────────────────────────────────────────────┐
│ Layer 2 — AI Virtual Assistant Orchestrator   ← NEW              │
│   intent detection · role-aware routing · clarifying questions    │
│   tool selection · modal protocol · approval gates · memory       │
│   streaming responses                                             │
└──────────────────────────────────────────────────────────────────┘
                              ↑ orchestrates
┌──────────────────────────────────────────────────────────────────┐
│ Layer 3 — Specialist Modules (one per business domain)           │
│   Staffing · External Routing · HR/Docs · Parent Leads · Supplier │
│   E-learning · WhatsApp · Admin Ops                              │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 The three action levels (safety classification)

| Level | Description | Approval | Examples |
|---|---|---|---|
| **L1 — Answer** | Information only | None | "How do I upload a CV?" · "What's my staffing demand this month?" |
| **L2 — Draft** | Prepares an action; user reviews | User confirms in modal | "Draft a job post" · "Find me candidates" · "Reply to this parent" |
| **L3 — Execute** | Multi-party / high-impact | Admin approval logged | "Send to 40 candidates" · "Post externally to JobUp" · "Send WhatsApp blast" |

Every tool the assistant can call is tagged with its level. The orchestrator enforces approval flow per level.

### 2.3 The modal protocol (UI contract)

The orchestrator returns structured outputs, not prose-only responses:

```json
{
  "type": "assistant_action",
  "intent": "staffing_request",
  "modal": "staffing_request_modal",
  "prefill": { "role": "Auxiliaire", "canton": "VD", "percentage": 60, ... },
  "level": "L2_DRAFT",
  "approvalRequired": true,
  "speech": "I detected a staffing request for an auxiliaire in Lausanne at 60%..."
}
```

The frontend assistant client interprets `type: "assistant_action"` and opens the matching modal pre-filled. The user reviews → confirms → backend executes.

### 2.4 Tool registry

A central registry — one entry per backend capability the assistant can invoke. Example shape:

```ts
{
  name: 'search_internal_candidates',
  level: 'L2_DRAFT',
  allowedRoles: ['FOUNDATION', 'ADMIN'],
  inputSchema: SearchCandidatesSchema,  // Zod
  modal: 'candidate_shortlist_modal',
  handler: (input, principal) => staffingService.runMatching(...)
}
```

Tools are how the LLM "uses" the platform. The orchestrator passes the registry (filtered by user role) to the LLM as OpenRouter tool definitions. The model picks one and returns args. The backend validates and executes.

---

## 3. Translation workflow — applied to every AI artifact

### 3.1 The platform's translation system (reference)

Source: `docs/I18N_SYSTEM.md`, `docs/TRANSLATION_WORKFLOW_FOR_DEVELOPERS.md`, `frontend/i18n.ts`

- **Library:** react-i18next, default `fr`, supported `en`, `fr`, `de`
- **File layout:** `packages/translations/locales/{en,fr,de}/{namespace}.json` (dot.notation nested keys)
- **Discovery:** Vite auto-globs all `*.json` per locale (no manual imports)
- **Dynamic updates:** API endpoint `GET /static-translations/{lng}/{ns}` (backed by `api/src/static-translation/`)
- **CI gate:** `pnpm i18n:check` validates that every key referenced in code exists in **all three** locales — PR cannot merge if missing
- **Auto-translation tooling:** `api/src/translation/` (DeepL adapter, translation memory, cost tracking, queue)
- **ESLint rule:** flags hardcoded JSX strings
- **Missing-key tracking:** `api/src/translation-errors/` logs and reports missing keys from production

### 3.2 The four translation surfaces in the AI build

Each surface has a different mechanism. **All four are required for every feature** — checked in code review.

| Surface | What | Mechanism | Owner |
|---|---|---|---|
| **A. UI strings** | Assistant chat bubbles, modal labels, buttons, error messages | `t('assistant:foo.bar')` via react-i18next | Frontend dev |
| **B. AI prompts** | System prompts for each agent, in user's locale | `prompt.v1.ts(input, locale)` returns localized template | Agent author |
| **C. AI-generated content** | Explanations, drafts, job posts written by the LLM | Prompt instructs the model to output in `locale`; Zod schema validates | Agent author |
| **D. Backend messages** | API error responses, notification bodies, email subjects | `TranslationService.t(key, locale)` server-side | Backend dev |

### 3.3 New translation namespaces required

To be created in `packages/translations/locales/{en,fr,de}/`:

| Namespace file | Purpose | When added |
|---|---|---|
| `assistant.json` | Assistant chat UI, conversation states, tool feedback | MVP M1 |
| `staffing.json` | Staffing request modal, shortlist labels, match explanations UI chrome | MVP M0 (immediate — Phase 1 already shipped without these) |
| `aiOperations.json` | Admin AI ops dashboard (replaces hardcoded EN in `AiOperationsPage.tsx`) | MVP M0 (gap fix) |
| `aiTools.json` | Tool result formatting strings (e.g., "Showing 5 matches", "No candidates found") | MVP M1 |
| `aiSafety.json` | Approval prompts, consent dialogs, action confirmations | MVP M2 |

### 3.4 Translation key conventions for AI

- **Namespace:** Use `assistant:` for orchestrator UI, `staffing:` etc. for module-specific UI, `aiTools:` for shared tool output strings
- **Dot.notation:** `assistant.chat.placeholder`, `assistant.intent.staffing_request.heading`
- **ICU interpolation:** Use the existing format helpers — `{{count}}`, `{{date, date}}`, `{{amount, currency}}`
- **Plural forms:** `_one` / `_other` suffix (see `frontend/i18n.ts:355`)
- **No hardcoded user-facing strings in `.ts`/`.tsx` files** — ESLint will catch
- **Prompt files are exempt** from the JSX-hardcoded-string rule — they output to the LLM, not the user; but the prompt instructs the LLM to respond in the passed `locale`

### 3.5 Workflow for adding a new AI tool with translations

```
1. Backend dev adds tool definition (api/src/ai/tools/<name>.ts)
   - Defines name, level, allowedRoles, Zod input schema, handler
   - Defines i18n key paths the tool will emit, e.g.:
     resultKey: 'aiTools.searchInternalCandidates.summary'

2. Backend dev adds keys to packages/translations/locales/en/aiTools.json
   - Source-of-truth EN values

3. Run: pnpm translate (DeepL auto-translates EN → FR/DE)
   - Output committed to fr/ and de/ files

4. Frontend dev consumes via useTranslation(['aiTools']) in modal/UI

5. CI: pnpm i18n:check passes (all 3 locales have key) → PR mergeable
```

### 3.6 Translating AI-generated content (Surface C)

When the LLM generates user-facing text (explanations, drafts, job posts), we **do not store English and translate** — we tell the model to generate in the user's locale directly. Pattern (already used in `match-explanation/prompt.v1.ts`):

```ts
export default function prompt(input, locale) {
  const lang = locale === 'de' ? 'German' : locale === 'en' ? 'English' : 'French';
  return `Respond ONLY with a JSON object. Write the explanation in ${lang}. ...`;
}
```

**Storage:** Store the locale used alongside the content (`MatchResult.explanationLocale`). When the user switches language we re-generate via background job (cached by content+locale hash).

### 3.7 Action item: backfill missing translations in Layer 1

The handover claimed AI translations were added but only the **sidebar label** was. Two backfill tasks must happen before MVP M1:

1. Wire `useTranslation` into `admin/src/pages/AiOperationsPage.tsx` and replace all hardcoded English with keys in a new `aiOperations.json` namespace (~80 keys: tab labels, table headers, button text, status badges, empty states).
2. Add `staffing.json` namespace covering the foundation-facing UI being built in MVP M0.

---

## 4. MVP definition

**Goal:** Ship the smallest end-to-end slice that proves the assistant model + delivers production value to foundations.

### 4.1 In scope for MVP

- ✅ Layer 1 (already done)
- ✅ Staffing Phase 1 backend (already done — sync parse, hybrid matching, async explanations)
- ❌ **Foundation UI** — staffing request box + shortlist table (no assistant yet, plain modal)
- ❌ **AI Assistant Orchestrator v1** — single conversational entry point for FOUNDATION + ADMIN roles
- ❌ **Tool registry v1** with these tools:
  - `search_help_docs` (L1)
  - `open_modal` (L1) — opens any pre-filled modal
  - `parse_staffing_request` (L2) — wraps the existing staffing-request-parser agent
  - `search_internal_candidates` (L2) — wraps HybridMatcher
  - `explain_match` (L1) — wraps match-explanation
  - `draft_job_post` (L2)
  - `draft_parent_reply` (L2)
- ❌ **Frontend assistant client** — chat panel + modal protocol handler + streaming responses
- ❌ **AIConversation / AIMessage / AIToolCall** Prisma models
- ❌ **i18n backfill** — AI Operations page + new `assistant.json` / `staffing.json` namespaces
- ❌ **`ai_assistant_enabled` feature flag** (master toggle for the assistant)

### 4.2 Explicitly out of scope for MVP

- WhatsApp channel (Phase 5)
- Voice input
- L3 execute-level tools (sending to many recipients, posting externally) — drafts only
- External routing (JobUp, Job-Room) — manual workflow continues
- HR document RAG retrieval
- Memory/context store (every conversation starts fresh in MVP)
- Educator-facing or parent-facing assistant — FOUNDATION + ADMIN only in MVP
- Reactivation campaigns
- E-learning assignment via assistant
- Embedding-based candidate similarity (the workers are built, but vector ranking deferred until profiles backfill embeddings)
- Geocoding worker — Phase 2

### 4.3 MVP success criteria

- A foundation user can type "Find me an EDE in Geneva at 60% starting next month" in the assistant panel and within 5 seconds see a shortlist of internal candidates with explanations, in their selected locale (FR/DE/EN)
- A foundation user can type "Draft a job post for an auxiliaire" and the assistant opens the job-post modal pre-filled
- A foundation user can type "How do I publish a job listing?" and get a useful answer with a "Take me there" button
- An admin user can see every assistant action in `AiAuditLog` and `AIToolCall` tables with PII redacted
- All assistant UI text passes `pnpm i18n:check` in all three locales
- `ai_assistant_enabled` and `ai_staffing_matching` flags toggle features cleanly

---

## 5. MVP build plan — milestones

### M0 — Foundation UI for Phase 1 staffing + i18n backfill  (1 week)

The staffing backend exists but has no UI. Build it as a standalone foundation page first so the assistant has something to "open" later.

**Deliverables:**
1. `packages/translations/locales/{en,fr,de}/staffing.json` with ~50 keys
2. `packages/translations/locales/{en,fr,de}/aiOperations.json` (~80 keys) — backfill
3. Rewire `admin/src/pages/AiOperationsPage.tsx` to use `useTranslation(['aiOperations'])`
4. New page `frontend/pages/foundation/StaffingRequestsPage.tsx` (route `/foundation/staffing`)
   - Free-text textarea
   - "Find candidates" button
   - Calls `POST /staffing/requests`
   - Polls / SSE for matches → shows shortlist with explanation
   - Tab/section on `FoundationDashboardPage.tsx` linking to it
5. Run `pnpm translate` to auto-fill FR/DE via DeepL
6. CI green: `pnpm i18n:check`

**Exit:** Foundation user can use staffing matching end-to-end (no assistant yet).

---

### M1 — Conversation infrastructure + assistant orchestrator skeleton  (1–2 weeks)

**Deliverables:**

1. **Prisma additions** (one migration):
   - `AIConversation` (id, userId, organizationId, role, channel='web', status, startedAt, endedAt)
   - `AIMessage` (id, conversationId, sender enum {USER, ASSISTANT, SYSTEM}, content, structuredIntent JSON, createdAt)
   - `AIToolCall` (id, conversationId, messageId, toolName, inputJson, outputJson, status, level, approvalRequired, approvedById, executedAt, errorMessage)
   - `AIActionApproval` (id, toolCallId, status, approvedBy, approvalContext, createdAt)
   - `AIContextMemory` (id, userId, organizationId, memoryType, key, valueJson, expiresAt) — schema only, hydration in M3

2. **`api/src/assistant/` module:**
   - `assistant.controller.ts` — `POST /assistant/messages` (SSE streaming response), `POST /assistant/conversations`, `GET /assistant/conversations/:id`
   - `assistant.service.ts` — conversation/message persistence, orchestration entry point
   - `orchestrator.service.ts` — calls `LlmClient.run()` with a new agent `assistant-orchestrator`, handles tool-call loop, enforces approval gates
   - `tools/tool-registry.ts` — central registry with role filtering
   - `tools/<tool-name>.ts` — one file per tool (see MVP scope list)
   - `assistant.module.ts` — wires up, imports StaffingModule, AiModule

3. **New agent: `assistant-orchestrator`** registered in `ai-agents.config.ts`
   - Model chain: `anthropic/claude-sonnet-4-6` (primary), `google/gemini-2.5-pro` (fallback)
   - Uses OpenRouter tool-calling JSON schema (multi-step)
   - System prompt instructs: respond in user's locale, propose tools not actions, never execute without confirmation
   - Roles: FOUNDATION, ADMIN, SUPER_ADMIN (MVP)

4. **Streaming protocol:**
   - Server-Sent Events on `POST /assistant/messages`
   - Event types: `token` (partial text), `tool_call` (proposed tool), `tool_result` (executed), `modal_action` (open modal), `done` (final)
   - Reuse existing SSE pattern — investigate first; if absent, add minimal helper

5. **i18n namespace `assistant.json`** with chat UI strings (~60 keys)

**Exit:** API works end-to-end via curl; no UI yet. `POST /assistant/messages` returns SSE stream with a tool call.

---

### M2 — Frontend assistant client + modal protocol  (1–2 weeks)

**Deliverables:**

1. **Floating assistant button** in foundation/admin layouts — bottom-right, opens slide-over panel
2. **`AssistantPanel` component:**
   - Chat thread (reuse messaging UI primitives)
   - Composer with auto-focus on `/` or `Cmd+K`
   - Streaming token rendering
   - Tool-call cards showing what the assistant is proposing
3. **Modal protocol handler:**
   - Frontend interprets `modal_action` events
   - Maps `modal: "staffing_request_modal"` to actual component
   - Pre-fills via React Hook Form `defaultValues`
   - On user confirm, calls the relevant backend endpoint (already exists for staffing)
4. **Inline context buttons** — "Ask the assistant about this" buttons in:
   - Foundation dashboard (top-right)
   - Staffing requests page
   - Job listings page
5. **State management:** Use existing React Query for conversation queries + a small Zustand store (or Context) for current conversation ID + open/close state
6. **Role gating:** Assistant button only visible if user role ∈ {FOUNDATION, ADMIN, SUPER_ADMIN} AND `ai_assistant_enabled` flag is on

**Exit:** A foundation user can chat with the assistant, see it propose actions, confirm them in modals, and see results inline. End-to-end MVP demo works.

---

### M3 — Hardening, observability, beta release  (1 week)

**Deliverables:**

1. **AI Operations dashboard updates:**
   - New tab "Assistant" — shows AIConversation/AIMessage/AIToolCall counts, top tools used, average latency
   - Conversation drill-down — admin can replay any user conversation (PII-redacted per `safety.service.ts` rules)
2. **Approval inbox for L3 tools** (future-proofing, even if no L3 tools in MVP) — admin UI to approve/reject pending `AIActionApproval` rows
3. **Rate limiting per user** (e.g., 30 messages/min) — reuse existing ThrottlerModule
4. **Cost guardrails** — daily per-user budget hard cap in `BudgetService` (not just per-agent)
5. **Eval harness:** for each agent run the `fixtures/` golden cases as a unit test (`pnpm test:ai-eval`); regression catch
6. **Production env-var checklist update** in `docs/AI_STAFFING_MANUAL_TASKS.md` (or a new `AI_ASSISTANT_DEPLOY.md`)
7. **Onboarding tour** — first time a foundation user opens the assistant, show 3-step intro
8. **Beta feature flag rollout:** enable `ai_assistant_enabled` for 1 internal foundation, then 5 design partners

**Exit:** Beta release to design partners. Monitoring in place. Documentation complete.

---

## 6. Post-MVP roadmap

Numbered roughly in priority order; each phase is independently shippable.

### P1 — Specialist module: External Routing
- New agent `job-ad-generator` — produces multi-channel job ads (JobUp, Job-Room, LinkedIn) from a `StaffingRequest`
- New tool `recommend_external_channels` (L2) + `create_external_routing_campaign` (L3)
- New tables: `ExternalRoutingCampaign`, `ExternalCandidateCapture`, `ShortLinkTracker`
- Public capture landing page at `/apply/:shortLinkCode` for external candidates
- Admin approval workflow for L3 routing campaigns

### P2 — Specialist module: HR/Document Assistant (RAG)
- Implement deferred `LlmClient.retrieve()` — pgvector cosine search on `KnowledgeDocument.embedding`
- New agent `hr-doc-search` with `retrieval` config
- Seed knowledge base from HR template library + canton policy crawl (the existing `CrawlerModule`)
- New tool `search_hr_documents` (L1) — returns summarised + linked source docs

### P3 — Specialist module: Parent Lead Assistant
- New agent `parent-lead-classifier` (urgency, intent) + `parent-reply-drafter`
- New tools `summarize_parent_leads` (L1), `draft_parent_reply` (L2)
- Inline assistant integration on the existing parent leads page
- Per-canton language detection (FR vs DE leads)

### P4 — Memory & context store
- Hydrate `AIContextMemory` — last 10 conversations summary, user preferences (preferred match thresholds), foundation profile
- Inject into orchestrator prompt as compressed context (token budget capped)
- Per-user memory TTL controls in user settings UI

### P5 — Specialist module: Supplier / Service Marketplace
- New agent `supplier-quote-drafter`
- New tools `search_suppliers` (L1), `create_supplier_request` (L2)
- Integrate with existing `marketplace` and `service-requests` modules

### P6 — Specialist module: E-learning Assistant
- New agent `training-recommender`
- New tools `recommend_training` (L1), `assign_elearning_course` (L2)
- Connects to existing `ElearningModule`

### P7 — Admin AI Ops capabilities
- New agent `staffing-demand-analyst` — natural-language KPI queries
- New tools `staffing_demand_heatmap` (L1), `incomplete_profile_segment` (L1), `weekly_recruitment_report` (L1)
- Materialised views for fast aggregate queries

### P8 — Reactivation Engine
- Per the original AI_STAFFING_INTEGRATION_PLAN Phase 3
- New agent `reactivation-message-drafter`
- New tables `ReactivationCampaign`, `ReactivationMessage`
- L3 tool requires admin approval

### P9 — Profile embeddings + vector ranking
- Backfill `EducatorEmbedding` for all approved educators (BullMQ job)
- Update `HybridMatcherService` to use vector similarity as a tiebreaker (currently stub)
- Re-embed on profile change (already wired via `staffing.embed-profile` queue, needs trigger)

### P10 — Geocoding worker
- Implement deferred `ai.geocode` processor
- Uses `MAPBOX_API_KEY` for forward geocoding User/Organization addresses
- Backfill job for existing rows
- Switch `HybridMatcher` distance calc from in-memory haversine to `earthdistance` SQL (perf win on large pools)

### P11 — Educator-facing assistant
- Open assistant to EDUCATOR role with a restricted tool set
- Tools: `complete_my_profile`, `find_jobs_near_me`, `improve_my_profile`, `check_missing_documents`
- Tighter consent + scope rules per `safety.service.ts`

### P12 — Parent-facing assistant
- Open to PARENT role with very restricted tools
- Tools: `find_nearby_daycares`, `check_request_status`, `update_child_details`

### P13 — WhatsApp Agent Channel
- Meta WhatsApp Business Platform integration
- Webhook at `POST /assistant/whatsapp/webhook`
- New `AIConversation.channel = 'whatsapp'`
- Identity verification: phone number → User lookup
- Same orchestrator, restricted tool surface (no complex modals — link back to platform with secure short-link for L2+)
- New tools `send_whatsapp_message` (L3), `send_secure_platform_link` (L1)

### P14 — Multi-modal: CV parsing + profile enrichment
- Per the original AI_STAFFING_INTEGRATION_PLAN Phase 2
- New agent `cv-parser` (PDF/DOCX → structured `CandidateExperience` + `CandidateCertification`)
- New tool `parse_cv_upload` (L2)
- Triggered when educator uploads CV — assistant offers to autofill profile

### P15 — Voice input
- Browser WebSpeech API → STT before passing to orchestrator
- Locale-aware (Swiss French/German variants)

---

## 7. Database additions for MVP

To be added in `api/prisma/schema.prisma` during M1 in one migration `20260601000000_add_assistant_core`:

```prisma
enum AIConversationStatus {
  ACTIVE
  ENDED
  ARCHIVED
}

enum AIChannel {
  WEB
  WHATSAPP    // future
  EMAIL       // future
}

enum AIMessageSender {
  USER
  ASSISTANT
  SYSTEM
  TOOL
}

enum AIToolCallStatus {
  PROPOSED
  AWAITING_APPROVAL
  APPROVED
  EXECUTED
  REJECTED
  FAILED
}

enum AIActionLevel {
  L1_ANSWER
  L2_DRAFT
  L3_EXECUTE
}

model AIConversation {
  id             String   @id @default(uuid())
  userId         String
  organizationId String?
  role           UserRole
  channel        AIChannel @default(WEB)
  status         AIConversationStatus @default(ACTIVE)
  locale         String   @default("fr")
  startedAt      DateTime @default(now())
  endedAt        DateTime?

  user         User       @relation(fields: [userId], references: [id])
  messages     AIMessage[]
  toolCalls    AIToolCall[]

  @@index([userId, startedAt(sort: Desc)])
  @@map("ai_conversations")
}

model AIMessage {
  id               String   @id @default(uuid())
  conversationId   String
  sender           AIMessageSender
  content          String   @db.Text
  structuredIntent Json?
  createdAt        DateTime @default(now())

  conversation AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  toolCalls    AIToolCall[]

  @@index([conversationId, createdAt])
  @@map("ai_messages")
}

model AIToolCall {
  id                 String   @id @default(uuid())
  conversationId     String
  messageId          String?
  toolName           String
  level              AIActionLevel
  inputJson          Json
  outputJson         Json?
  status             AIToolCallStatus @default(PROPOSED)
  approvalRequired   Boolean  @default(false)
  approvedById       String?
  executedAt         DateTime?
  errorMessage       String?  @db.Text
  createdAt          DateTime @default(now())

  conversation AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  message      AIMessage?     @relation(fields: [messageId], references: [id])
  approvals    AIActionApproval[]

  @@index([conversationId, createdAt])
  @@index([status])
  @@map("ai_tool_calls")
}

model AIActionApproval {
  id              String   @id @default(uuid())
  toolCallId      String
  status          String   // pending | approved | rejected
  approvedBy      String?
  approvalContext Json?
  createdAt       DateTime @default(now())

  toolCall AIToolCall @relation(fields: [toolCallId], references: [id], onDelete: Cascade)

  @@map("ai_action_approvals")
}

model AIContextMemory {
  id             String   @id @default(uuid())
  userId         String
  organizationId String?
  memoryType     String   // "preference" | "summary" | "fact"
  key            String
  valueJson      Json
  expiresAt      DateTime?
  createdAt      DateTime @default(now())

  @@unique([userId, memoryType, key])
  @@map("ai_context_memory")
}
```

Note: `AIUsageLog` is **not** added — we already have `AiAuditLog` from Layer 1 which serves the same purpose. The orchestrator writes one `AiAuditLog` row per LLM call (already does) plus one `AIToolCall` row per tool invocation.

---

## 8. Risks & open questions

### 8.1 Risks
1. **Tool-call accuracy** — LLMs can hallucinate tool names. Mitigation: strict OpenRouter JSON-schema tool definitions + Zod validation + fallback to clarifying question
2. **Latency** — multi-step orchestration (intent → tool → result → summarisation) can exceed 5s. Mitigation: stream first token within 1s, parallelise where safe, aggressively cache
3. **Cost runaway** — chat is open-ended. Mitigation: per-user daily budget cap (M3), conversation length cap, summarisation of old messages
4. **Translation quality of LLM output** — DeepL is reliable for UI strings but LLM output in DE may be uneven. Mitigation: explicit examples in prompt per locale, eval fixtures per locale, fallback to FR
5. **Modal sprawl** — every new tool tempts a new modal. Mitigation: reuse existing modals; new modals only with design review

### 8.2 Open questions to resolve before M1
1. **Streaming infrastructure** — does the platform already use SSE/WebSocket? Need to find before M1 (investigate `frontend/services/api.ts` and any existing `EventSource` usage)
2. **Auth on SSE** — Clerk JWT in EventSource headers requires custom polyfill; alternative is signed token in query param
3. **Mobile (PWA) chat UX** — does the existing app target PWA/mobile? If yes, the floating button placement and keyboard handling need design pass
4. **Conversation retention** — how long to keep `AIMessage` rows? GDPR consideration — propose: 90 days default, user-deletable
5. **OPUS-4-7 vs Sonnet-4-6 for orchestrator** — Sonnet is fast and capable for tool calling; only switch to Opus if Sonnet fails evals

### 8.3 Manual / ops tasks (not code)
- Confirm pgvector extension live in production (`api/scripts/enable-pg-extensions.sql`)
- `OPENROUTER_API_KEY`, `VOYAGE_API_KEY`, `MAPBOX_API_KEY` set per environment
- DeepL API key set (used by translation pipeline) — confirm in `api/src/translation/translation.config.ts`
- Redis enabled for assistant queues (`REDIS_URL` or `REDIS_HOST`)
- Feature flags seeded: `ai_foundation_enabled`, `ai_staffing_matching`, `ai_assistant_enabled` (new)
- WhatsApp Business Platform account (only at P13)

---

## 9. Conventions reminder

- **No LLM SDK imports outside `api/src/ai/`** (ESLint enforced)
- **Every new agent** needs `index.ts`, `prompt.v1.ts`, `schema.ts`, `fixtures/` (golden cases per locale)
- **Every new tool** needs an entry in `tool-registry.ts` with `level`, `allowedRoles`, Zod input schema, optional modal mapping
- **Every new UI string** needs keys in all three locales — CI enforces
- **Every L2/L3 action** must go through the approval gate — never bypass
- **Staffing features live in `api/src/staffing/`** — never modify `api/src/recruitment/`
- **Assistant orchestration lives in `api/src/assistant/`** — new module, separate from `ai/` (which stays the gateway)
- **Migrations** are timestamp-prefixed YYYYMMDDHHMMSS; raw SQL when Prisma `Unsupported` types are involved
- **AI-generated content stores the locale** alongside the content so we can re-generate on language switch

---

## 10. Key files to read before starting any AI work

```
docs/AI_ASSISTANT_MASTER_PLAN.md     — this file
docs/AI_LAYER1_HANDOVER.md           — Layer 1 detail (now historical reference)
docs/I18N_SYSTEM.md                  — translation system
docs/TRANSLATION_WORKFLOW_FOR_DEVELOPERS.md
api/src/ai/llm-client.ts             — the gateway contract
api/src/ai/ai-agents.config.ts       — agent registry
api/src/staffing/staffing.service.ts — Phase 1 staffing service (pattern for specialist modules)
api/src/staffing/hybrid-matcher.service.ts — scoring logic
api/prisma/schema.prisma             — current DB schema
CLAUDE.md                            — project conventions
frontend/i18n.ts                     — frontend i18n bootstrap
packages/translations/locales/en/    — source-of-truth translation files
```

---

## 11. Branching / PR strategy

- One PR per milestone (M0, M1, M2, M3, then per post-MVP phase)
- Each PR ships with: code, migration (if any), translation keys for all 3 locales, golden fixtures, feature flag wiring, docs update
- `pnpm i18n:check`, `pnpm type-check`, `pnpm test` must all pass before merge
- Post-MVP phases can branch off `main` independently — they don't block each other
