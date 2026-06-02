# AI Assistant V2 — Phase 0 + 1 Handover

**Branch:** `claude/eager-hypatia-mk9Aa` · **Commit:** `4c32d22`
**Status:** Phases 0 + 1 complete, type-checked, tested, pushed. Phases 2–4 not started.
**Plan of record:** `docs/AI_ASSISTANT_REDESIGN_V2.md` (read this first — it defines the full target)
**Prior context:** `docs/AI_ASSISTANT_MASTER_PLAN.md`, `docs/AI_MVP_HANDOVER.md`, `docs/AI_LAYER1_HANDOVER.md`

---

## 1. What this delivers

The assistant can now actually search and escalate. Before this work, `search_internal_candidates`
returned only a pending request ID (no candidates), every write action dead-ended, and there was no
"talk to a human" path. Phase 0 rebuilt the tool-execution architecture; Phase 1 made search return
real ranked results with graceful no-results handling.

**Phase 0 — Foundation**
- `ToolHandler` contract + standard result envelope `{ data, total, hasMore?, suggestions?, scope? }`
- Per-domain `ToolHandlerRegistry` replaces the old 500-line `switch` in the orchestrator
- `contact_admin` (L3) escalation tool → `SupportService.createTicket`
- **New L3 confirm/reject endpoints** — modal-less L3 tools now execute server-side on confirmation
- `MAX_TOOL_STEPS` raised 3 → 5; `search_internal_candidates` retired
- Prompt rewritten: SEARCH / NO-RESULTS / WRITE-ACTION / ESCALATION rules

**Phase 1 — Search done right**
- `search_candidates_ai` — sync parse → **inline** match → ranked candidates in one turn
- `search_candidates` (direct pool), `search_products`, `search_services`, `search_jobs` (educator),
  `search_foundations` (parent)
- `suggestions[]` populated on every `total: 0`, always ending with `contact_admin`
- `tool_call` + `tool_result` SSE events emitted for result-card tools
- Frontend result cards + `NoResultsCard`; en/fr/de strings

---

## 2. File map (what changed / what's new)

### Backend (`api/src/assistant/`)
| File | Change |
|---|---|
| `tools/tool-handler.interface.ts` | **NEW** — `ToolHandler`, `ToolResult<T>`, `ToolSuggestion`, `resolveLimit`, `isAdminRole` |
| `tools/tool-handler.registry.ts` | **NEW** — name → handler routing; injects all handlers |
| `tools/handlers/profile.handler.ts` | **NEW** — `get_my_profile`, `navigate_to`, `open_modal` |
| `tools/handlers/leads.handler.ts` | **NEW** — `get_my_leads`, `get_my_enquiries` |
| `tools/handlers/recruitment.handler.ts` | **NEW** — `get_my_applications` |
| `tools/handlers/marketplace.handler.ts` | **NEW** — `get_my_orders`, `get_my_listings`, `get_my_service_requests` |
| `tools/handlers/staffing.handler.ts` | **NEW** — `explain_match` |
| `tools/handlers/support.handler.ts` | **NEW** — `contact_admin` (L3) |
| `tools/handlers/search.handler.ts` | **NEW** — all 8 search/lookup tools |
| `tools/handlers/drafts.handler.ts` | **NEW** — `draft_job_post`, `draft_parent_reply` (L2, modal prefill) |
| `tools/tool-registry.ts` | Retired `search_internal_candidates`; added `contact_admin` + 6 search tools; new role groups |
| `orchestrator.service.ts` | Delegates to registry; `MAX_TOOL_STEPS=5`; emits card events; `confirmToolCall`/`rejectToolCall` |
| `orchestrator.service.spec.ts` | Rewired to build a real registry with mocked deps; covers new tools |
| `assistant.service.ts` | `confirmToolCall` / `rejectToolCall` pass-throughs (ownership-checked) |
| `assistant.controller.ts` | `POST conversations/:id/tool-calls/:toolCallId/{confirm,reject}` |
| `assistant.module.ts` | Imports `RecruitmentModule`, `MarketplaceModule`, `SupportModule`; registers handlers + registry |
| `../ai/agents/assistant-orchestrator/prompt.v1.ts` | New tool-selection / search / no-results / write / escalation rules |

### Frontend (`frontend/`)
| File | Change |
|---|---|
| `components/assistant/ResultCards.tsx` | **NEW** — card components + `SearchResultCards` dispatcher + `isResultCardTool` |
| `components/assistant/AssistantPanel.tsx` | Renders result cards by tool name; L3 confirm executes server-side; cancel → reject |
| `services/assistantService.ts` | `confirmToolCall`, `rejectToolCall` |

### Translations (`packages/translations/locales/{en,fr,de}/assistant.json`)
Added `toolCard` (confirm/cancel/success/cancelled/autoExecuting) and `results`
(searching/none/suggestionsHeading). 36 keys each, in parity.

---

## 3. How it works now (request flow)

1. `OrchestratorService.run()` loops up to `MAX_TOOL_STEPS` (5). Each step asks the LLM for a tool call.
2. **L1/L2 tools** execute immediately via `registry.execute(name, args, principal, locale, disabledFlags)`.
   - If the tool is in `RESULT_CARD_TOOLS`, the orchestrator emits `tool_call` (placeholder) then
     `tool_result` (envelope) so the frontend renders cards. The result is *also* fed back to the LLM
     as text so it narrates a summary.
3. **L3 tools** (`contact_admin`, and future Phase-2 writes) do **not** auto-execute. The orchestrator
   creates an `AIToolCall` row with `status: AWAITING_APPROVAL` and emits a `tool_call` approval card,
   then stops.
4. On the frontend, the user clicks **Confirm**:
   - Tool **has a modal** (`draft_*`) → opens the pre-filled modal (legacy behavior).
   - Tool is **modal-less L3** (`contact_admin`) → `POST .../tool-calls/:id/confirm` →
     `OrchestratorService.confirmToolCall()` re-checks ownership + role, runs the handler, marks the row
     `EXECUTED`, returns the result. **Cancel** → `.../reject` marks it `REJECTED`.

`search_candidates_ai` inline-match path (`search.handler.ts`):
`staffing.createRequest()` → `staffing.runMatching(id)` (parses if needed, runs `matcher.match` synchronously)
→ `getMatches()` + `getRequest()` for `parsedRole`/`parsedCanton`. Returns ranked candidates with scores.

---

## 4. Key decisions & conventions (follow these in Phase 2+)

- **Every tool returns `ToolResult`.** Search tools MUST set `suggestions[]` when `total === 0`, ending
  with `{ actionType: 'contact_admin' }`. Never let the assistant dead-end.
- **One handler per domain.** Add a tool = add a method to the right handler (or a new handler) and
  register it in `tool-handler.registry.ts` + `assistant.module.ts`. Never reintroduce a god-switch.
- **L3 = user confirmation, not admin approval.** Admin approval for bulk/external sends is a *separate*
  future `requiresAdminApproval` flag (see plan §3) — do not conflate.
- **Result-card tools** are listed in two places that must stay in sync: `RESULT_CARD_TOOLS` in
  `orchestrator.service.ts` (backend, decides event emission) and in `ResultCards.tsx` (frontend, decides
  rendering). Add new card tools to both.
- **Spelling:** `enquiry`/`enquiries` = parent childcare leads; `inquiry`/`inquiries` = marketplace/supplier.
  Both are intentional (mirror the DB). See plan §5.
- **Feature flags:** absent flag → enabled. Staffing search tools are gated behind `v2_staffing_ia`
  (matching their siblings). `contact_admin` is intentionally **never** gated.
- **Translations:** new UI strings go in `assistant.json` for all three locales, kept in key-parity.

---

## 5. What is NOT done (Phases 2–4)

### Phase 2 — L3 write actions (the next big milestone)
The confirm→execute plumbing is ready; these just need handlers + registry entries + tool-registry
definitions (all L3) + per-action preview cards:
- `post_job` → `RecruitmentService.createJobListing(dto, foundationId)`
- `apply_to_job` → `RecruitmentService.createJobApplication(dto, candidateId)` ⚠️ note: method is
  `createJobApplication`, **not** `createApplication` as the plan text says
- `shortlist_candidate` → `RecruitmentService.saveCandidate(foundationId, candidateId)`
- `update_application_status` → `RecruitmentService.updateJobApplication(id, { status })`
- `respond_to_lead` → `LeadsService.respondToLead(leadId, foundationId, status, message?)`
- `send_message` → `MessagingService.createDirectMessage(senderId, receiverId, content)`
- `place_order` → `MarketplaceService.createOrder(dto, organizationId)`
- `request_service` → `MarketplaceService.createServiceRequest(orgId, serviceId, description?, scheduledAt?)`
- `send_supplier_inquiry` → `InquiryService.createInquiry(dto, buyerOrgId)` (in `marketplace/inquiry.service.ts`)
- `create_replacement_request` → `ReplacementsService.createRequest(dto, foundationId, userId)`
- `submit_enquiry` (parent) → `LeadsService.createParentLead(dto)`
- **Enhanced `ToolCallCard` previews** per action type (plan §7.2) — currently the L3 card shows a generic
  args preview; build rich previews (job draft, message recipient+body, order total, etc.)

For Phase 2 you'll need to import `LeadsModule`, `MessagingModule`, `ReplacementsModule` into
`assistant.module.ts` (Support/Recruitment/Marketplace are already imported). `InquiryService` is
exported from `MarketplaceModule`.

### Phase 3 — Completeness
- `find_user` (`UsersService.findAll({ page, limit, role?, search? })`), `get_platform_stats` (admin)
- `view_match_results` (fetch results for an existing `staffingRequestId`)
- Per-role welcome suggestion chips refreshed
- Expand `send_message` to educator/parent → foundation/admin

### Phase 4 — Reliability
- Replace JSON-in-prompt with native OpenAI function-calling in `OpenRouterAdapter`
- Streaming tool-execution status ("Searching candidates…")

---

## 6. Known issues / cleanups

1. **`search_candidates_ai` double-matches when Redis is enabled.** `staffing.createRequest()`
   enqueues a match *and* we call `runMatching()` inline to guarantee sync results. The match upsert is
   idempotent so results are correct, but it's wasteful. Clean fix: give `StaffingService` a flag/param
   to skip the queued match for assistant-initiated requests, or a dedicated `createAndMatchSync()`.
2. **`RESULT_CARD_TOOLS` duplicated** backend + frontend (see §4). Consider a shared constant in
   `packages/` if it grows.
3. **`i18n:check` script is missing** in this checkout (`scripts/i18n-check.js` not present, though
   `package.json` references it). Locale parity was validated manually. If you add strings, validate by
   parsing the three JSONs and diffing keys.
4. **Pre-existing frontend type errors** exist in unrelated files (Sidebar, ChatWindow, profile forms,
   etc.) — not introduced here. The assistant files type-check clean. Don't be alarmed by a noisy
   `tsc -p frontend/tsconfig.json`.
5. **`find_foundation`** is ADMIN_ONLY and a result-card tool — admins get a foundations card. Confirm
   that's desired UX or downgrade to a plain lookup.

---

## 7. How to verify

```bash
# Install (fresh containers have no node_modules) + generate Prisma client
pnpm install
# (api postinstall runs `prisma generate` automatically)

# Type-check API source (ignore test/ and scripts/ — they have pre-existing errors)
cd api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep '^src/' | grep 'error TS'   # → empty = clean

# Run the assistant test suites (55 tests)
cd api && npx jest assistant

# Frontend: assistant files only (repo has unrelated pre-existing errors)
cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep assistant            # → empty = clean

# Locale key parity (manual, since i18n-check.js is absent)
node -e "const fs=require('fs');const k=o=>Object.entries(o).flatMap(([a,v])=>v&&typeof v=='object'?Object.keys(v).map(b=>a+'.'+b):[a]);const d=['en','fr','de'].map(l=>k(JSON.parse(fs.readFileSync('packages/translations/locales/'+l+'/assistant.json'))));console.log(d.map(x=>x.length))"
```

---

## 8. Quick start for the next agent

1. Read `docs/AI_ASSISTANT_REDESIGN_V2.md` §5 (tool catalog) and §7.2 (preview cards).
2. Pick Phase 2. For each L3 tool: add a handler method (use existing handlers in
   `tools/handlers/` as templates), register the tool in `tool-registry.ts` (level `L3_EXECUTE`,
   correct `allowedRoles`), and wire DI in `assistant.module.ts` if a new service module is needed.
3. The confirm→execute path already runs any registered tool — no orchestrator changes needed for
   basic L3 execution. You only touch the orchestrator if you add new SSE event types.
4. Build the matching preview card in `frontend/components/assistant/` and add strings to
   `assistant.json` (en/fr/de).
5. Add/extend tests in `orchestrator.service.spec.ts` (it constructs the real registry — just extend
   the service mocks).
