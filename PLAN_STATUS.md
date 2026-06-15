# Platform Build Status — Plan vs Reality

**Generated:** 2026-06-15  
**Based on:** Last 60 commits · all handover docs · `STAFFING_REMODEL_PLAN.md` · `IMPLEMENTATION_PHASES.md` · `docs/AI_ASSISTANT_MASTER_PLAN.md` · `docs/AI_MVP_HANDOVER.md` · `docs/AI_ASSISTANT_V2_PHASE0-1_HANDOVER.md` · `docs/AI_ASSISTANT_V2_PHASE2-4_HANDOVER.md` · `HANDOVER.md` · Prisma schema  
**Working branch:** `claude/stoic-archimedes-y9keql`  
**Legend:** ✅ Done · 🔄 Partial · ⬜ Not started · ⚠️ Known gap

---

## Quick Summary

| Workstream | Status |
|---|---|
| AI Foundation (Layer 1) | ✅ Fully shipped |
| AI Phase 1 — Internal Matching Backend | ✅ Shipped (vector ranking stub) |
| AI MVP M0 — Foundation Staffing UI + i18n | ✅ Shipped |
| AI MVP M1 — Conversation Infrastructure | ✅ Shipped |
| AI MVP M2 — Frontend Assistant Panel | ✅ Shipped |
| AI V2 Phase 0 — Handler Registry + Escalation | ✅ Shipped |
| AI V2 Phase 1 — Search Done Right | ✅ Shipped |
| AI V2 Phase 2 — L3 Write Actions | ✅ Shipped |
| AI V2 Phase 3 — Completeness | ✅ Shipped |
| AI V2 Phase 4 — Streaming Status | ✅ Shipped (native function-calling deferred) |
| AI Workspace UI (Foundation + Admin) | ✅ Shipped — always on |
| Staffing Remodel Phase 1 — IA + Bug Sweep | ⬜ Not started |
| Staffing Remodel Phase 2 — Backend Wiring + Matching | ⬜ Not started |
| Staffing Remodel Phase 3 — Replacement Module | 🔄 DB schema only |
| Staffing Remodel Phase 4 — Emails + Notifications | 🔄 DB schema only |
| Staffing Remodel Phase 5 — Foundation Dashboard | ⬜ Superseded by AI workspace |
| Staffing Remodel Phase 6 — Admin Dashboard Signals | ⬜ Not started |
| Staffing Remodel Phase 7 — Measurement + Cleanup | ⬜ Not started |

---

## Part 1: AI Assistant — What Is Built

### 1.1 Layer 1 — Shared AI Foundation ✅

All files shipped on branch merged via PR #647.

| Component | Path | Status |
|---|---|---|
| LLM gateway (sole entry point) | `api/src/ai/llm-client.ts` | ✅ |
| OpenRouter adapter (multi-model fallback, capped to 3 models) | `api/src/ai/providers/openrouter.adapter.ts` | ✅ |
| Voyage adapter (embeddings) | `api/src/ai/providers/voyage.adapter.ts` | ✅ |
| Circuit breaker (in-memory; opens at 5 consecutive 5xx) | `api/src/ai/circuit-breaker.service.ts` | ✅ |
| Audit log service | `api/src/ai/audit-log.service.ts` | ✅ |
| Budget service (per-agent daily token cap) | `api/src/ai/budget.service.ts` | ✅ |
| Safety / consent service | `api/src/ai/safety.service.ts` | ✅ |
| Result cache (Postgres-backed) | `api/src/ai/result-cache.service.ts` | ✅ |
| Agent registry | `api/src/ai/ai-agents.config.ts` | ✅ |
| BullMQ queues (`ai.exec`, `ai.embed`, `ai.geocode`) | `api/src/ai/queues/ai-exec.queue.ts` | ✅ (geocode processor missing) |
| Admin AI ops dashboard | `admin/src/pages/AiOperationsPage.tsx` | ✅ (i18n wired) |
| Prisma models (AiAuditLog, AiAgentRun, AiAgentConfig, AiResultCache, KnowledgeDocument, CandidateConsent) | `api/prisma/schema.prisma` | ✅ |
| `echo-validate` proof-of-life agent | `api/src/ai/agents/echo-validate/` | ✅ |
| `staffing-request-parser` agent | `api/src/ai/agents/staffing-request-parser/` | ✅ |
| `match-explanation` agent | `api/src/ai/agents/match-explanation/` | ✅ |
| `assistant-orchestrator` agent | `api/src/ai/agents/assistant-orchestrator/` | ✅ |

### 1.2 Layer 2 / Phase 1 — Internal Matching Backend ✅

| Component | Path | Status |
|---|---|---|
| StaffingModule (controller, service, module) | `api/src/staffing/` | ✅ |
| HybridMatcherService (rule-weights + geo; vector stub) | `api/src/staffing/hybrid-matcher.service.ts` | ✅ |
| BullMQ processors: parse, match, explain, embed | `api/src/staffing/workers/` | ✅ |
| Prisma models (StaffingRequest, MatchResult, EducatorEmbedding, etc.) | `api/prisma/schema.prisma` | ✅ |
| pgvector / cube / earthdistance extensions | `api/prisma/migrations/20260521000000_add_staffing_phase1/` | ✅ |
| `ai_staffing_matching` feature flag | `api/prisma/seed.ts` | ✅ |

### 1.3 MVP M0 — Foundation Staffing UI + i18n ✅

| Component | Path | Status |
|---|---|---|
| Foundation staffing requests page | `frontend/pages/foundation/StaffingRequestsPage.tsx` | ✅ |
| Route `/foundation/staffing-requests` | `frontend/App.tsx` | ✅ |
| `staffing.json` translation keys (~35, en/fr/de) | `packages/translations/locales/` | ✅ |
| `aiOperations.json` translation keys (~80, en/fr/de) | `packages/translations/locales/` | ✅ |
| `assistant.json` initial keys | `packages/translations/locales/` | ✅ |

### 1.4 MVP M1 — Conversation Infrastructure ✅

| Component | Path | Status |
|---|---|---|
| Assistant controller (conversations + SSE endpoint) | `api/src/assistant/assistant.controller.ts` | ✅ |
| OrchestratorService | `api/src/assistant/orchestrator.service.ts` | ✅ |
| Tool handler registry | `api/src/assistant/tools/tool-handler.registry.ts` | ✅ |
| All 6 domain handler files (search, drafts, profile, leads, recruitment, marketplace, staffing, support) | `api/src/assistant/tools/handlers/` | ✅ |
| Prisma models (AIConversation, AIMessage, AIToolCall, AIActionApproval, AIContextMemory) | `api/prisma/schema.prisma` | ✅ |
| Conversation history migration | `api/prisma/migrations/20260610000000_add_conversation_history/` | ✅ |

### 1.5 MVP M2 — Frontend Assistant Client ✅

| Component | Path | Status |
|---|---|---|
| AssistantContainer, AssistantButton, AssistantPanel, AssistantModalHandler | `frontend/components/assistant/` | ✅ |
| `assistantService.ts` (SSE streaming + tool confirm/reject) | `frontend/services/assistantService.ts` | ✅ |
| ResultCards (CandidateCard, JobCard, ProductCard, ServiceCard, NoResultsCard) | `frontend/components/assistant/ResultCards.tsx` | ✅ |
| ActionPreviewCard (per-L3-tool rich preview) | `frontend/components/assistant/ActionPreviewCard.tsx` | ✅ |

### 1.6 V2 Phases 0–4 ✅

**Phase 0 — Handler Registry + Escalation**
- ToolHandler contract + `{ data, total, suggestions? }` standard envelope
- ToolHandlerRegistry replaces the original `switch` in the orchestrator
- `contact_admin` (L3) → `SupportService.createTicket`
- Server-side L3 confirm/reject endpoints (`POST .../tool-calls/:id/confirm` and `/reject`)
- `MAX_TOOL_STEPS` raised 3 → 5
- `search_internal_candidates` retired

**Phase 1 — Search Done Right**
- `search_candidates_ai` (sync parse + match + ranked results in one turn)
- `search_candidates` (direct pool, fast path)
- `search_products`, `search_services` (marketplace)
- `search_jobs` (educator), `search_foundations` (parent)
- `suggestions[]` populated on every `total: 0`, always ending with `contact_admin`
- `tool_call` + `tool_result` SSE events for result-card rendering

**Phase 2 — L3 Write Actions** (all behind user confirmation gate)
- `post_job`, `apply_to_job`, `shortlist_candidate`, `update_application_status`
- `respond_to_lead`, `submit_enquiry`
- `send_message` (universal)
- `place_order`, `request_service`, `send_supplier_inquiry`
- `create_replacement_request` (gated `v2_replacement_module`)
- Rich per-L3-action preview cards (`ActionPreviewCard`)
- Security hardening: cross-tenant write guard in `resolveOnBehalfOrgId()`, admin handler defense in depth

**Phase 3 — Completeness**
- `find_user`, `get_platform_stats` (admin)
- `view_match_results` (renders ranked candidates for a staffing request)
- Per-role welcome suggestion chips (all 6 roles)
- `send_message` open to all roles

**Phase 4 — Reliability (partial)**
- Streaming `tool_status` SSE events ("Searching candidates…" labels in en/fr/de)
- `tool_status` labels frontend-translated via `toolStatus.<toolName>` i18n keys
- **Native OpenAI function-calling: deliberately deferred** — see §2.3 below

### 1.7 AI Workspace UI ✅

Both SPAs have full-page assistant workspaces — always on (no feature flag), controlled solely by `AI_ASSISTANT_ENABLED` environment variable.

**Foundation SPA** (`/foundation/assistant`):
- Sidebar with conversation history list (Today / Yesterday / Last week / Older grouping)
- Morning Briefing hero card (`bg-emerald-800`)
- Quick-action suggestion chips (role-specific)
- Draft approval cards (`DraftApprovalCard`) for L3 write actions
- `Assistant | Dashboard` toggle pill in Navbar (SparklesIcon + HomeIcon)
- "Assistant active" pill shown while on workspace route
- Floating assistant panel suppressed while on workspace route

**Admin SPA** (`/assistant`):
- Mirror of Foundation workspace with admin-specific tools and platform-wide briefing items
- Same emerald design system
- `AssistantContext` provides floating panel fallback on non-workspace pages
- `Assistant | Dashboard` toggle in Header

**Kill switch mechanics:**
- `AI_ASSISTANT_ENABLED=true/false/1/0` in Render environment (no code deploy required)
- Unset → falls back to DB record (currently `true` in production)
- Off: Foundation → `/foundation/dashboard`, Admin → `/dashboard`; toggle hidden, conversation list hidden
- Fails closed on network error (empty flag map)

---

## Part 2: AI Assistant — What Still Needs to Be Built

### 2.1 Post-MVP Phases (from master plan §6)

These phases are defined but not started:

| Phase | What | Priority indicator |
|---|---|---|
| **P1** — External Routing | `job-ad-generator` agent, `recommend_external_channels` + `create_external_routing_campaign` (L3 + admin approval), `ExternalRoutingCampaign`/`ShortLinkTracker` tables, public `/apply/:code` landing page | High |
| **P2** — HR/Document RAG | Implement `LlmClient.retrieve()` (pgvector + BM25 on `KnowledgeDocument`), `hr-doc-search` agent, seed knowledge base from `api/src/ai/knowledge/` markdown files | High — `search_help_docs` currently returns hardcoded text |
| **P3** — Parent Lead Assistant (enhanced) | `parent-lead-classifier` + `parent-reply-drafter` agents, `summarize_parent_leads` tool, inline assistant on leads page, per-canton language detection | Medium |
| **P4** — Memory & Context | Hydrate `AIContextMemory` (last-10-conversations summary, user preferences), inject compressed context into orchestrator prompt, per-user TTL controls | Medium |
| **P6** — E-learning Assistant | `training-recommender` agent, `recommend_training` (L1) + `assign_elearning_course` (L2) tools, connect to `ElearningModule` | Low |
| **P7** — Admin AI Ops | `staffing-demand-analyst` agent, `staffing_demand_heatmap` / `incomplete_profile_segment` / `weekly_recruitment_report` (L1) tools, materialised views | Low |
| **P8** — Reactivation Engine | `reactivation-message-drafter` agent, `ReactivationCampaign` table, L3 tool + `requiresAdminApproval: true` flag | Low |
| **P9** — Profile Embeddings + Vector Ranking | Backfill `EducatorEmbedding` for all approved educators, wire cosine similarity in `HybridMatcherService` (currently zero-scored), re-embed on profile change trigger | Medium |
| **P10** — Geocoding Worker | `api/src/ai/workers/geocode.processor.ts` for `ai.geocode` queue, Swisstopo primary / Mapbox fallback, backfill job; lat/lon on `User`/`Organization` always null today | Medium — distance scoring returns 0 |
| **P13** — WhatsApp Channel | Meta WABA webhook, `AIConversation.channel='WHATSAPP'`, identity verification, restricted tool surface | Low |
| **P14** — CV Parsing | `cv-parser` agent, `CandidateExperience`/`CandidateCertification` tables, `parse_cv_upload` (L2) | Low |
| **P15** — Voice Input | WebSpeech API STT, Swiss FR/DE locale variants | Low |

### 2.2 Outstanding Known Gaps (carried from handover docs)

| Gap | Impact | File/location |
|---|---|---|
| `LlmClient.retrieve()` not implemented | `search_help_docs` returns hardcoded string; RAG config unusable | `api/src/ai/llm-client.ts` |
| Geocoding processor not built | `latitude`/`longitude` always null; distance scoring = 0 | `api/src/staffing/workers/` (stub job exists) |
| Vector ranking is a stub | Cosine similarity column exists; `HybridMatcher` ignores it | `api/src/staffing/hybrid-matcher.service.ts` |
| `packages/assistant-ui` extraction pending | Chat components copy-pasted between Foundation and Admin SPAs; fixes must be applied twice | `frontend/components/assistant/` and `admin/src/components/assistant-workspace/` |
| `draft_announcement` / `send_announcement` tools deferred | Admin deep-links to `/mailing` instead; no assistant-driven bulk mailing | `admin/src/components/assistant-workspace/` |
| `send_message` recipient resolution | Non-admins need a `find_message_recipient` scoped lookup to get a `recipientUserId` without calling `find_user` | `api/src/assistant/tools/handlers/messaging.handler.ts` |
| `RESULT_CARD_TOOLS` duplicated backend + frontend | Drift risk; mitigated by "KEEP IN SYNC" comments only | `orchestrator.service.ts` + `ResultCards.tsx` |
| `search_candidates_ai` double-match when Redis enabled | Wasteful but not incorrect (upsert is idempotent) | `api/src/staffing/staffing.service.ts` |
| Native function-calling deferred | JSON-in-prompt tool selection; hallucinated tool names possible | `api/src/ai/providers/openrouter.adapter.ts` — plan in `AI_ASSISTANT_V2_PHASE2-4_HANDOVER.md §5` |
| Conversation retention / GDPR | No TTL or user-delete on `AIMessage` rows | `api/src/assistant/` |
| `StaffingRequestsPage.tsx` prefill from `?prefill=` query param | `AssistantModalHandler` navigates with prefill param but page doesn't read it | `frontend/pages/foundation/StaffingRequestsPage.tsx` |
| `contact_admin` ticket notification | Does `SupportService.createTicket()` notify admins in real time? Unconfirmed | `api/src/support/support.service.ts` |
| M3 hardening not done | No rate limiting on `/assistant/chat` (30 req/min), no per-user daily budget cap, no eval harness (`pnpm test:ai-eval`), no onboarding tour | Multiple files |

### 2.3 Phase 4 Deferred — Native Function-Calling (concrete plan)

Do NOT revert the existing JSON-in-prompt approach without completing this plan:

1. Add `tools?: ToolSchema[]` param + `useNativeTools?: boolean` flag (default off) to `LlmClient.run()` options and the agent definition shape in `ai-agents.config.ts`.
2. In `OpenRouterAdapter`, when `useNativeTools`, send `tools[]` + `tool_choice` and read `choices[0].message.tool_calls` instead of parsing JSON from content. Map back to the existing `{ message, toolCall }` response shape so the orchestrator is untouched.
3. Generate `tools[]` schemas from `TOOL_REGISTRY` (name/description/inputSchema already match OpenAI shape).
4. Flip `assistant-orchestrator` to `useNativeTools: true` last, behind a feature flag, after a live smoke test confirms tool-selection parity.
5. Requires a live `OPENROUTER_API_KEY` to validate — do not ship blind.

---

## Part 3: Staffing Remodel — What Is Built vs Plan

The staffing remodel (`STAFFING_REMODEL_PLAN.md` + `IMPLEMENTATION_PHASES.md`) was the original active workstream. The AI assistant work took priority and ran in parallel. The database schema was extended as part of AI Phase 1 work, but the UI and workflow phases have not started.

### 3.1 What IS built from the staffing remodel

| Item | Status | Notes |
|---|---|---|
| `ApplicationStatus` extended: `SHORTLISTED`, `INTERVIEW`, `OFFER`, `HIRED` | ✅ | In schema + migration |
| `ReplacementRequest` + `ReplacementMatch` tables + all enums | ✅ | Schema + migration `20260507000000_replacement_staffing_and_notifications` |
| `Notification` table + `NotificationType` enum (8 types) | ✅ | Same migration |
| `UrgencyLevel`, `ReplacementRequestStatus`, `ReplacementMatchStatus` enums | ✅ | In schema |
| `v2_replacement_module` feature flag | ✅ | Seeded (default off) |
| `v2_staffing_ia` feature flag | ✅ | Seeded (default off) |
| `v2_staffing_emails` feature flag | ✅ | Seeded (default off) |
| `v2_in_app_notifications` feature flag | ✅ | Seeded (default off) |
| `ai_staffing_matching` feature flag | ✅ | Seeded (default off) |
| `create_replacement_request` assistant tool (L3) | ✅ | Behind `v2_replacement_module` flag |

### 3.2 Phase 1 — IA + Bug Sweep (Not Started)

All 1A–1F tasks from `IMPLEMENTATION_PHASES.md` remain open:

**1A — Feature flags:** `v2_staffing_ia` seeded ✅ but sidebar reading of it is not wired.

**1B — Admin sidebar reorder (flat → grouped):**
- `NavGroup` collapsible sub-component not built
- Current `admin/src/components/Sidebar.tsx` is still flat
- i18n keys for `sidebar.staffing`, `sidebar.hrCompliance`, `sidebar.suppliersServices`, `sidebar.platformOps` not added to `admin.json`

**1C — Foundation sidebar reorder:**
- Foundation sidebar currently shows the original flat nav (restored in commit `d01d1e8` after a simplification attempt was reverted)
- `/staffing/jobs`, `/staffing/candidates` route aliases not registered
- Staffing group (`sidebar.staffing`, `sidebar.postJob`, etc.) i18n keys not added

**1D — Route alias `/staffing` → `/recruitment`:** Not implemented. Only `/recruitment/*` routes exist.

**1E — Bug fixes from audit (all still open):**

| # | File | Issue |
|---|---|---|
| 1 | `frontend/App.tsx:168` | Admin redirect → `/admin/content-dashboard` instead of admin home |
| 2 | `frontend/components/layout/MainLayout.tsx:17` | `useTranslation` called inside callback |
| 3 | `admin/src/pages/Candidates.tsx:~406` | Delete menu item has no `onClick` handler |
| 4 | `admin/src/components/AddJobListingModal.tsx` | Missing `employmentType`, `workSchedule`, `startDate`, `salaryRange` fields |
| 5 | `admin/src/pages/JobListings.tsx:166-169` | Status filter missing `FILLED` option |
| 6 | `frontend/pages/educator/EducatorJobBoardPage.tsx:93` | `contractTypes` missing `REPLACEMENT`, `TEMPORARY`, `FREELANCE` |
| 7 | `frontend/pages/educator/EducatorApplicationsPage.tsx:55` | `alert()` stub on "View details" |
| 8 | `api/src/recruitment/recruitment.controller.ts:121,161` | Missing `@Roles` guards on `GET /applications` and `GET /applications/:id` |
| 9 | `api/src/recruitment/` DTOs | Duplicate `UpdateJobApplicationDto` — unused file not deleted |
| 10 | `admin/src/pages/Messaging.tsx` | `unreadCount` hard-coded to `0` |
| 11 | `api/src/recruitment/recruitment.service.ts` | `findMatchingCandidates` returns entire pool (deferred to Phase 2) |
| 12 | Various | `picsum.photos` placeholder avatars not replaced |

**1F — Seed missing billing templates:**
- `payment_reminder` template not seeded
- `subscription_payment_failed` template not seeded

### 3.3 Phase 2 — Backend Wiring + Matching (Not Started)

| Task | Status |
|---|---|
| Rewrite `findMatchingCandidates` with weighted scorer (role 40, city 25, skills 15, availability 15, recency 5) | ⬜ |
| Unit tests for scorer | ⬜ |
| Seed email templates: `new_application`, `application_status_update`, `job_match` | ⬜ |
| Call `sendNotification('new_application')` in `createJobApplication` | ⬜ |
| Call `sendNotification('application_status_update')` in `updateJobApplication` on status change | ⬜ |
| Call `sendNotification('job_match')` on `DRAFT → PUBLISHED` transition (capped by env var, default 20) | ⬜ |
| Replace `ViewApplicantsModal` with two-pane review screen | ⬜ |
| Pipeline-stage dropdown using `SHORTLISTED`/`INTERVIEW`/`OFFER`/`HIRED` | ⬜ |
| Add `/staffing/applications` route | ⬜ |
| Store shortlist in `Organization.savedCandidateIds` JSON | ⬜ |
| localStorage migration for existing shortlists on first load | ⬜ |
| Add missing fields to `admin/src/components/AddJobListingModal.tsx` | ⬜ |
| Replace `picsum.photos` with initials-avatar component | ⬜ |

### 3.4 Phase 3 — Replacement Module (Schema done, everything else not started)

Database schema is complete. UI and API are entirely unbuilt:

| Task | Status |
|---|---|
| `ReplacementRequest` + `ReplacementMatch` Prisma models | ✅ (existing migration) |
| `POST /recruitment/replacements` | ⬜ |
| `GET /recruitment/replacements` (foundation-scoped) | ⬜ |
| `GET /recruitment/replacements/:id` (with matches) | ⬜ |
| `PATCH /recruitment/replacements/:id` | ⬜ |
| `POST /recruitment/replacements/:id/offer/:candidateId` | ⬜ |
| `POST /recruitment/replacements/:id/accept` (educator) | ⬜ |
| `POST /recruitment/replacements/:id/confirm/:candidateId` | ⬜ |
| `GET /recruitment/replacements/matching-for-me` (educator) | ⬜ |
| Educator: `isOpenToReplacement` toggle + availability dates/radius in settings DTO | ⬜ |
| Educator: replacement availability UI in profile page | ⬜ |
| Educator: "Replacement opportunities" panel on dashboard | ⬜ |
| Educator: "Replacement offers" tab on applications page | ⬜ |
| Foundation: `FoundationReplacementsPage` (Open/Matched/Confirmed/Fulfilled tabs) | ⬜ |
| Foundation: New request form (role, start/end, urgency, cities, notes) | ⬜ |
| Foundation: Matches table with score + "Offer" action | ⬜ |
| Register `/staffing/replacements` route | ⬜ |
| Admin: `Replacements.tsx` cross-foundation list with urgency/SLA filters | ⬜ |
| Admin: Override "mark fulfilled" with audit reason + CSV export | ⬜ |
| Admin: Register route + add to sidebar inside Staffing group | ⬜ |
| Gate all replacement UI behind `v2_replacement_module` flag | ⬜ |
| Auto-expire cron for `ReplacementRequest` after `endAt` | ⬜ |

### 3.5 Phase 4 — Emails + In-App Notifications (Schema done, everything else not started)

`Notification` table is in the schema. The notifications module does not exist.

| Task | Status |
|---|---|
| `Notification` Prisma model | ✅ |
| `notifications.module.ts`, `notifications.service.ts`, `notifications.controller.ts` | ⬜ |
| `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-count` | ⬜ |
| Internal `createNotification()` called alongside every `sendNotification()` site | ⬜ |
| Socket push via existing `messaging.gateway.ts` on `notification.created` | ⬜ |
| Seed email templates: `replacement_request_open`, `replacement_matched`, `replacement_confirmed`, `low_candidate_pool` (nightly cron) | ⬜ |
| Bug fix: `sendBulkNotification` ignores `scheduledAt` — delegate to `scheduleNotification` when future date | ⬜ |
| `NotificationContext` rewrite: fetch on mount from `/notifications`, subscribe to socket | ⬜ |
| Bell badge count from `/notifications/unread-count` | ⬜ |
| `markRead(id)`, `markAllRead()` exposed from context | ⬜ |
| `useNotificationData` in admin pulling from `Notification` rows | ⬜ |
| Feature-flag gates: `v2_staffing_emails`, `v2_in_app_notifications` (flags seeded, not wired) | ⬜ |

### 3.6 Phase 5 — Foundation Dashboard (Partially superseded)

The Foundation Dashboard has been replaced by the AI Assistant Workspace as the primary landing page for Foundation users. The original Phase 5 tasks (KPI cards, action buttons, staffing-led layout) are now partially addressed by the assistant briefing card and quick-action chips.

| Task | Status | Notes |
|---|---|---|
| Top KPI cards: open positions, applications awaiting review, open replacement requests | ⬜ | Covered partially by morning briefing card |
| Primary action row: Post job, Find replacement, Find candidates, Review applications | ⬜ | Covered by quick-action chips in assistant |
| Remove mock data from `FoundationDashboardPage` | ⬜ | Mock data still present |
| `foundationStaffingOverviewService` combining dashboard + staffing counts | ⬜ | |
| Smoke test: PARENT/EDUCATOR/SUPPLIER/PROVIDER dashboards unchanged | ⬜ | |

Recommendation: Phase 5 should be scoped down to "remove mock data + link to assistant" since the workspace now serves as the primary dashboard.

### 3.7 Phase 6 — Admin Dashboard Signals (Not Started)

| Task | Status |
|---|---|
| 4 staffing signal cards on `Dashboard.tsx` (urgent replacements, stale applications, low-pool regions, zero-match jobs) | ⬜ |
| `GET /admin/staffing/signals` endpoint | ⬜ |
| Existing count cards moved below the fold | ⬜ |
| Admin bell dropdown: `jobRecruitment` category shown first | ⬜ |
| Admin email preferences expose `jobRecruitment` category | ⬜ |

### 3.8 Phase 7 — Measurement + Cleanup (Not Started)

| Task | Status |
|---|---|
| KPI widgets: time-to-first-candidate, time-to-hire, replacement fulfilment speed, candidate-pool growth | ⬜ |
| Server-side 301 redirects: `/recruitment/*` → `/staffing/*` | ⬜ |
| Drop "Recruitment" from user-facing nav labels | ⬜ |
| Update `CLAUDE.md` with v2 context summary | ⬜ |
| Final e2e smoke: fr/en/de, all role dashboards, all new flows | ⬜ |

---

## Part 4: i18n / Translation Status

| Namespace | Keys (en/fr/de) | Status |
|---|---|---|
| `assistant.json` | 96 each | ✅ In parity |
| `staffing.json` | ~35 each | ✅ In parity |
| `aiOperations.json` | ~80 each | ✅ In parity |
| `aiTools.json` | ~20 each | ✅ In parity |
| `admin.json` — new sidebar group keys | 0 of ~8 new keys | ⬜ Phase 1B requires these |
| `dashboard.json` (or similar) — new Foundation sidebar keys | 0 of ~6 new keys | ⬜ Phase 1C requires these |
| `recruitment.json` — pipeline stage labels for new statuses | Not checked | ⬜ Phase 2 requires these |

---

## Part 5: Database Migration Status

All migrations are additive. No destructive changes have been made.

| Migration | Purpose | Status |
|---|---|---|
| `20260507000000_replacement_staffing_and_notifications` | ReplacementRequest, ReplacementMatch, Notification, extended ApplicationStatus | ✅ |
| `20260520100000_add_ai_foundation` | AiAuditLog, AiAgentRun, AiAgentConfig, AiResultCache, KnowledgeDocument, CandidateConsent | ✅ |
| `20260521000000_add_staffing_phase1` | StaffingRequest, MatchResult, EducatorEmbedding, pgvector extensions, geo columns | ✅ |
| `20260601000000_add_assistant_core` | AIConversation, AIMessage, AIToolCall, AIActionApproval, AIContextMemory | ✅ |
| `20260602000000_add_knowledge_embeddings` | KnowledgeDocument.embedding vector(768) | ✅ |
| `20260603000000_make_staffing_request_foundation_nullable` | Schema fix | ✅ |
| `20260604000000_add_cv_url_to_job_applications` | CV URL field on applications | ✅ |
| `20260610000000_add_conversation_history` | Conversation persistence (title, lastActivityAt, kind) | ✅ |

---

## Part 6: Feature Flag Summary

| Flag | Default | What it gates | Status |
|---|---|---|---|
| `ai_assistant_enabled` | `true` (env var takes priority) | Master UI kill switch for assistant workspace | ✅ Wired (env var: `AI_ASSISTANT_ENABLED`) |
| `ai_foundation_enabled` | `false` | All LLM calls | ✅ Seeded, wired in LlmClient |
| `ai_staffing_matching` | `false` | Staffing request matching endpoints | ✅ Seeded, wired |
| `v2_staffing_ia` | `false` | New sidebar nav order, staffing labels, `post_job`/`shortlist_candidate`/`view_match_results` tools | ✅ Seeded — UI nav wiring **not done** |
| `v2_replacement_module` | `false` | Replacement UI, `/staffing/replacements`, `create_replacement_request` tool | ✅ Seeded — UI **not built** |
| `v2_staffing_emails` | `false` | Staffing event email triggers | ✅ Seeded — email call sites **not wired** |
| `v2_in_app_notifications` | `false` | In-app notification feed | ✅ Seeded — notifications module **not built** |

---

## Part 7: What to Pick Up Next (Recommended Priority Order)

### Immediate — high value, low risk

1. **Phase 1E bug fixes** — Security and correctness bugs. Start with bugs 7 (alert() stub), 8 (missing `@Roles` guards — security), and 3 (missing onClick) as these are the most impactful. The rest are polish.
2. **Phase 1B/1C — Admin + Foundation sidebar reorder** — Required for `v2_staffing_ia` flag to have any visible effect. Build the `NavGroup` component for admin; reorder Foundation sidebar behind the flag.
3. **Phase 1D — `/staffing/*` route aliases** — Low-effort, high signal for URL strategy.

### Medium term — needed for replacement module to go live

4. **Phase 3 API endpoints** — The DB schema is already there; the REST endpoints just need to be written in `recruitment.controller.ts`.
5. **Phase 4 Notifications module** — NestJS module + REST endpoints + socket push. Required before any staffing event emails are useful.
6. **Phase 2 candidate scorer** — Real matching logic to replace the stub that returns the full pool.

### Later — infrastructure improvements

7. **P10 Geocoding worker** — Distance scoring currently returns 0.
8. **P9 Vector ranking** — Embeddings columns exist; just need the cosine query wired.
9. **P2 RAG retrieval** — `search_help_docs` returns hardcoded text; implement `LlmClient.retrieve()`.
10. **`packages/assistant-ui` extraction** — Eliminate the copy-pasted assistant components between Foundation and Admin SPAs.
11. **Phase 4 native function-calling** — Follow the concrete plan in `AI_ASSISTANT_V2_PHASE2-4_HANDOVER.md §5`.
12. **M3 hardening** — Rate limiting, per-user budget cap, eval harness.

---

## Part 8: Architectural Rules (Do Not Break)

1. **Only one LLM entry point:** `api/src/ai/llm-client.ts`. No direct LLM SDK imports anywhere else. ESLint enforced.
2. **One handler per domain.** Never reintroduce a god-switch. New tool = method on the right handler + entry in `tool-handler.registry.ts` + `assistant.module.ts`.
3. **L3 = user confirmation.** Admin approval for bulk/external sends is a separate future `requiresAdminApproval` flag — do not conflate with L3.
4. **`RESULT_CARD_TOOLS`** listed in two synced places: `orchestrator.service.ts` (backend) and `ResultCards.tsx` (frontend). Keep in sync.
5. **Float widget suppressed on workspace routes.** `AssistantContainer.tsx` returns null when on `/foundation/assistant`; `AdminLayout.tsx` suppresses on `/assistant`.
6. **Sidebar nav is additive.** `ConversationsList` is appended after the main nav — do not replace existing nav items.
7. **Parent / Supplier / Service Provider dashboards are untouched.** Remodel scope is Admin + Foundation only.
8. **All migrations are additive only.** No column renames or deletes until Phase 7 explicit cleanup.
9. **Every new UI string needs keys in en/fr/de.** `pnpm i18n:check` enforces this in CI.
10. **`enquiry`/`enquiries`** = parent childcare leads. **`inquiry`/`inquiries`** = marketplace/supplier. Intentional, mirrors DB.
