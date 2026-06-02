# ProCrèche AI Assistant — Master Plan

**Status:** Active planning document — supersedes `AI_LAYER1_HANDOVER.md` for strategic direction
**Last updated:** 2026-06-02
**Owner:** AI integration workstream

> ⚠️ **V2 redesign in effect.** Sections §2.2, §4, §5, and parts of §6 have been updated to reflect the v2 direction approved on 2026-06-02. The full v2 design rationale, complete tool catalog, phasing, and change log live in **`docs/AI_ASSISTANT_REDESIGN_V2.md`**. That document is the source of truth for what to build next.

---

## 0. TL;DR

We are not building a chatbot. We are building the **ProCrèche Virtual Assistant** — a role-aware natural-language command layer through which any user can accomplish anything they can do by hand on the platform, just by typing in the chat.

**Architectural rule:** _The assistant understands and executes. Write actions require user confirmation. The platform enforces the result._

```
Shared AI Foundation  (✅ Layer 1 — done)
        ↓
AI Virtual Assistant / Orchestrator   ✅ MVP built, V2 redesign in progress
        ↓
Per-domain tool handler classes  ← V2 architecture
        ↓
Search · Recruitment · Staffing · Marketplace · Leads · Messaging · Support
All 7 user roles · ~45 tools · L3 write actions with confirmation
```

**V2 goals (see `docs/AI_ASSISTANT_REDESIGN_V2.md` for full detail):**
- Every platform capability has a corresponding assistant tool
- All 7 roles have access to a role-appropriate tool set (not FOUNDATION + ADMIN only)
- Search returns real results immediately, with no-results suggestions on empty
- Write actions execute after user confirmation (L3) — the assistant doesn't just open modals
- `contact_admin` is always available as the final escalation path

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

> **V2 change:** L3 now means "any write action requiring user confirmation", not "admin approval for bulk/external sends". Admin approval for bulk or external-posting actions is a separate post-MVP concern handled by a future approval-inbox feature (see P1 in §6).

| Level | Description | Approval | Examples |
|---|---|---|---|
| **L1 — Answer** | Read data, fetch info, answer questions | None — immediate | `search_candidates`, `get_my_leads`, `search_help_docs` |
| **L2 — Draft** | Compose content for user review | User reviews preview card | `draft_job_post`, `draft_parent_reply` |
| **L3 — Execute** | Mutate platform state | User confirms via confirmation card | `post_job`, `send_message`, `place_order`, `apply_to_job`, `contact_admin` |

Tools requiring admin approval before execution (e.g. bulk sends, external posting campaigns) carry a separate `requiresAdminApproval: true` flag on the tool definition. This is distinct from the L1/L2/L3 classification and is not implemented until P1 (External Routing).

Every tool the assistant can call is tagged with its level. The orchestrator enforces the approval flow per level.

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

## 4. Build state and goals

> **V2 redesign replaces the original MVP milestone definition.** The MVP (M0–M2) has been shipped. V2 phases are defined in `docs/AI_ASSISTANT_REDESIGN_V2.md §9`. The summary below reflects the current state and revised goals.

### 4.1 What is built (MVP complete ✅)

- ✅ Layer 1: Shared AI Foundation (`api/src/ai/`)
- ✅ Layer 2 / Phase 1: Internal Matching backend (`api/src/staffing/`)
- ✅ M0: Foundation staffing UI + i18n backfill
- ✅ M1: Conversation infrastructure (`api/src/assistant/`)
- ✅ M2: Frontend assistant panel (`admin/src/components/assistant/`)
- ✅ Feature flags: `ai_foundation_enabled`, `ai_staffing_matching`, `ai_assistant_enabled`

See `docs/AI_MVP_HANDOVER.md` for the complete inventory and known gaps.

### 4.2 Known bugs fixed in v2

| Bug | Root cause | Fix |
|---|---|---|
| Every assistant message returns 400 error | `FREE_THEN_VALUE` model list has 5 items; OpenRouter caps `models[]` at 3 | `models.slice(0, 3)` in `openrouter.adapter.ts` — PR #659 |
| "Candidate search tool encountered an error" response | `search_internal_candidates` calls `staffing-request-parser` (also uses 5-model list); parse fails silently; tool returns `PENDING_PARSE` with no candidates | PR #659 fixes the nested LLM call; `search_candidates_ai` (v2) returns real results synchronously |

### 4.3 V2 goals (replacing original MVP success criteria)

- **All roles:** Any user (FOUNDATION, EDUCATOR, PARENT, SUPPLIER, SERVICE_PROVIDER, ADMIN) can chat with the assistant and get things done
- **Search:** "Find me an EDE in Geneva" returns a ranked list of candidates with scores within 5 seconds
- **No results:** On empty search, the assistant presents concrete next steps — never a vague apology
- **Write actions:** "Post a job for an auxiliaire at 80% in Vaud" → assistant drafts the posting → user confirms → job is live
- **Escalation:** Any user can say "I need to speak to someone" → assistant files a pre-drafted support ticket on their behalf
- **All locale support:** FR/DE/EN throughout
- **Audit:** Every L3 action logged in `AIToolCall` table; `AiAuditLog` tracks all LLM calls

### 4.4 What remains out of scope (unchanged from MVP)

- WhatsApp channel — P13
- Voice input — P15
- External routing (JobUp, Job-Room) — P1
- HR document RAG retrieval — P2
- Memory / context store (conversations start fresh) — P4
- Reactivation campaigns — P8
- E-learning assignment via assistant — P6
- Embedding-based vector ranking — P9
- Geocoding worker — P10

---

## 5. V2 build phases

> **M0–M2 are complete.** The phases below are the v2 build plan. Full detail in `docs/AI_ASSISTANT_REDESIGN_V2.md §9`.

### Phase 0 — Foundation refactor (prerequisite for all v2 work)

1. Introduce `ToolHandlerRegistry` + per-domain handler classes under `api/src/assistant/tools/handlers/`
2. Standardise all existing tools to return `{ data, total, suggestions? }` envelope
3. Add `contact_admin` tool → `SupportService.createTicket()`
4. Update orchestrator prompt: no-results rule, escalation rule, remove hardcoded `search_internal_candidates` reference
5. Raise `MAX_TOOL_STEPS` from 3 → 5
6. Remove `search_internal_candidates` from registry (replaced in Phase 1)

**Exit:** All existing tools still work; `contact_admin` available to all users.

---

### Phase 1 — Search done right (highest user-facing impact)

1. `search_candidates_ai` — sync parse + match + return ranked candidates (fixes the core broken flow)
2. `search_candidates` — direct pool search, no AI parsing (fast path)
3. `search_products`, `search_services` — marketplace search
4. `search_jobs` (educator), `search_foundations` (parent)
5. `suggestions[]` populated on `total: 0` for every search tool
6. Open assistant to EDUCATOR and PARENT roles with restricted tool sets
7. Frontend: `CandidateResultCard`, `JobListingCard`, `ProductCard`, `ServiceCard`, `NoResultsCard`
8. Add `assistant.json` / `aiTools.json` keys for all new UI strings

**Exit:** "Find me an EDE in Geneva" returns real candidates or presents concrete next steps. Never a vague apology.

---

### Phase 2 — L3 write actions (makes assistant fully autonomous)

1. Recruitment: `post_job`, `apply_to_job`, `shortlist_candidate`, `update_application_status`
2. Leads: `respond_to_lead`
3. Messaging: `send_message`
4. Marketplace: `place_order`, `request_service`, `send_supplier_inquiry`
5. Staffing: `create_replacement_request`
6. Parent: `submit_enquiry`
7. Enhanced `ToolCallCard` — rich preview per action type (see `AI_ASSISTANT_REDESIGN_V2.md §7.2`)

**Exit:** A user can type "Post a job for an auxiliaire 80% in Vaud" → review the draft → confirm → job is live.

---

### Phase 3 — Completeness + hardening

1. Admin tools: `find_user`, `get_platform_stats`
2. `view_match_results` — fetch results for a specific staffing request ID
3. Per-role welcome suggestion chips updated
4. Rate limiting per user (30 req/min via ThrottlerModule)
5. Daily per-user budget cap in `BudgetService`
6. AI Operations dashboard: new "Assistant" tab (conversation counts, top tools, latency)
7. Eval harness: `pnpm test:ai-eval` against fixtures per agent per locale
8. Onboarding tour for new assistant users

**Exit:** Beta release to design partners with full monitoring in place.

---

### Phase 4 — Reliability upgrade (native function calling)

1. Replace JSON-in-prompt with OpenAI function-calling format in `OpenRouterAdapter`
2. Tool definitions become typed schemas passed as `tools[]` parameter
3. Streaming execution status events ("Searching candidates…", "Matching in progress…")
4. Conversation history persisted across refreshes (sessionStorage / `AIContextMemory` hydration)

**Exit:** Tool-call accuracy improved; "LLM generates malformed JSON" failure class eliminated.

---

## 6. Post-v2 roadmap

> **V2 update:** P5 (Supplier Marketplace), P11 (Educator assistant), and P12 (Parent assistant) are **pulled into v2 Phases 1–2** and are no longer post-MVP. The items below are the remaining post-v2 backlog.

Numbered roughly in priority order; each phase is independently shippable.

### P1 — Specialist module: External Routing
- New agent `job-ad-generator` — produces multi-channel job ads (JobUp, Job-Room, LinkedIn) from a `StaffingRequest`
- New tools `recommend_external_channels` (L2) + `create_external_routing_campaign` (L3 + `requiresAdminApproval: true`)
- New tables: `ExternalRoutingCampaign`, `ExternalCandidateCapture`, `ShortLinkTracker`
- Public capture landing page at `/apply/:shortLinkCode` for external candidates
- Admin approval inbox UI for campaigns that need admin sign-off

### P2 — Specialist module: HR/Document Assistant (RAG)
- Implement deferred `LlmClient.retrieve()` — pgvector cosine search on `KnowledgeDocument.embedding`
- New agent `hr-doc-search` with `retrieval` config
- Seed knowledge base from HR template library + canton policy crawl (existing `CrawlerModule`)
- New tool `search_hr_documents` (L1) — returns summarised + linked source docs

### P3 — Specialist module: Parent Lead Assistant (enhanced)
- New agent `parent-lead-classifier` (urgency, intent) + `parent-reply-drafter`
- New tools `summarize_parent_leads` (L1) — admin view of lead pipeline
- Inline assistant integration on the existing parent leads page
- Per-canton language detection (FR vs DE leads)
- *Note: basic parent tools (`submit_enquiry`, `search_foundations`) are already in v2 Phase 1*

### P4 — Memory & context store
- Hydrate `AIContextMemory` — last 10 conversations summary, user preferences (preferred match thresholds), foundation profile
- Inject into orchestrator prompt as compressed context (token budget capped)
- Per-user memory TTL controls in user settings UI

### P5 — ~~Specialist module: Supplier / Service Marketplace~~ PULLED INTO V2 PHASE 1–2
> *`search_products`, `search_services`, `place_order`, `request_service`, `send_supplier_inquiry` are in v2 Phase 1–2. P5 slot is now available for the next priority item.*

### P6 — Specialist module: E-learning Assistant
- New agent `training-recommender`
- New tools `recommend_training` (L1), `assign_elearning_course` (L2)
- Connects to existing `ElearningModule`

### P7 — Admin AI Ops capabilities
- New agent `staffing-demand-analyst` — natural-language KPI queries
- New tools `staffing_demand_heatmap` (L1), `incomplete_profile_segment` (L1), `weekly_recruitment_report` (L1)
- Materialised views for fast aggregate queries

### P8 — Reactivation Engine
- New agent `reactivation-message-drafter`
- New tables `ReactivationCampaign`, `ReactivationMessage`
- L3 tool + `requiresAdminApproval: true` (bulk send to many educators requires admin sign-off)

### P9 — Profile embeddings + vector ranking
- Backfill `EducatorEmbedding` for all approved educators (BullMQ job)
- Update `HybridMatcherService` to use vector similarity as a tiebreaker (currently stub)
- Re-embed on profile change (already wired via `staffing.embed-profile` queue, needs trigger)

### P10 — Geocoding worker
- Implement deferred `ai.geocode` processor
- Uses Swisstopo (primary) / Mapbox (fallback) for forward geocoding User/Organization addresses
- Backfill job for existing rows
- Switch `HybridMatcher` distance calc from in-memory haversine to `earthdistance` SQL (perf win on large pools)

### P11 — ~~Educator-facing assistant~~ PULLED INTO V2 PHASE 1
> *`search_jobs`, `apply_to_job`, `get_my_applications` are in v2 Phase 1–2.*

### P12 — ~~Parent-facing assistant~~ PULLED INTO V2 PHASE 1
> *`search_foundations`, `submit_enquiry`, `get_my_enquiries` are in v2 Phase 1–2.*

### P13 — WhatsApp Agent Channel
- Meta WhatsApp Business Platform integration
- Webhook at `POST /assistant/whatsapp/webhook`
- New `AIConversation.channel = 'WHATSAPP'`
- Identity verification: phone number → User lookup
- Same orchestrator, restricted tool surface (no complex modals — link back to platform via secure short-link for L2+)
- New tools `send_whatsapp_message` (L3), `send_secure_platform_link` (L1)

### P14 — Multi-modal: CV parsing + profile enrichment
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

### 8.2 Open questions for v2

1. **Native function calling rollout** — Phase 4 switches from JSON-in-prompt to OpenAI `tools[]` parameter. This changes how `OpenRouterAdapter` works and requires updating all agent prompts. Confirm OpenRouter supports `tools[]` for all models in `FREE_THEN_VALUE` before committing to a timeline.
2. **Conversation retention** — how long to keep `AIMessage` rows? GDPR consideration — propose: 90 days default, user-deletable via settings.
3. **Mobile UX** — `AssistantPanel` is a fixed sidebar; on mobile screens it needs a bottom-sheet treatment. Confirm before Phase 1 ships to all roles.
4. **Consent for read tools on educator profiles** — `search_candidates` and `search_candidates_ai` read educator data. `safety.service.ts` has `assertCandidateConsent()` — confirm this is called before any profile data is returned to the assistant.
5. **`contact_admin` ticket routing** — does `SupportService.createTicket()` notify admins in real time? If not, foundation/educator/parent users may file tickets that sit unseen. Confirm notification flow before shipping.

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
docs/AI_ASSISTANT_MASTER_PLAN.md          — this file (strategic overview)
docs/AI_ASSISTANT_REDESIGN_V2.md          — v2 tool catalog, phasing, architecture changes
docs/AI_MVP_HANDOVER.md                   — complete inventory of what was built in MVP
docs/AI_LAYER1_HANDOVER.md                — Layer 1 detail (historical reference)
docs/I18N_SYSTEM.md                       — translation system
docs/TRANSLATION_WORKFLOW_FOR_DEVELOPERS.md
api/src/ai/llm-client.ts                  — the gateway contract (do not bypass)
api/src/ai/ai-agents.config.ts            — agent registry (add all new agents here)
api/src/ai/providers/openrouter.adapter.ts— models.slice(0,3) fix — do not revert
api/src/assistant/tools/tool-registry.ts  — current tool definitions
api/src/assistant/orchestrator.service.ts — conversation orchestration
api/src/staffing/staffing.service.ts      — pattern for specialist modules
api/src/staffing/hybrid-matcher.service.ts— scoring logic for candidate matching
api/src/marketplace/marketplace.service.ts— product/service search
api/src/support/support.service.ts        — contact_admin backend
api/src/messaging/messaging.service.ts    — send_message backend
api/prisma/schema.prisma                  — current DB schema
CLAUDE.md                                 — project conventions
frontend/i18n.ts                          — frontend i18n bootstrap
packages/translations/locales/en/         — source-of-truth translation files
```

---

## 11. Branching / PR strategy

- One PR per milestone (M0, M1, M2, M3, then per post-MVP phase)
- Each PR ships with: code, migration (if any), translation keys for all 3 locales, golden fixtures, feature flag wiring, docs update
- `pnpm i18n:check`, `pnpm type-check`, `pnpm test` must all pass before merge
- Post-MVP phases can branch off `main` independently — they don't block each other
