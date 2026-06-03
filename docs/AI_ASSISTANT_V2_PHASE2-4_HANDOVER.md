# AI Assistant V2 — Phase 2 + 3 + 4 Handover

**Branch:** `claude/jolly-maxwell-gYKT1`
**Status:** Phases 2 + 3 complete; Phase 4 partially complete (streaming tool-status done, native
function-calling deliberately deferred — see §5). Type-checked, tested (64 assistant tests passing), pushed.
Post-review fixes applied — see §8.
**Plan of record:** `docs/AI_ASSISTANT_REDESIGN_V2.md`
**Prior handover:** `docs/AI_ASSISTANT_V2_PHASE0-1_HANDOVER.md` (read first — defines the architecture this builds on)

---

## 1. What this delivers

Phases 0–1 made the assistant *search and escalate*. This work makes it **act**. The confirm→execute
plumbing built in Phase 0 is now backed by 11 L3 write tools, so a user can do by typing nearly anything
they can do by hand. Phase 3 adds admin completeness tools and per-role onboarding. Phase 4 adds streaming
execution status.

**Phase 2 — L3 write actions (the assistant is now autonomous)**
- `post_job`, `apply_to_job`, `shortlist_candidate`, `update_application_status` (recruitment)
- `respond_to_lead` (foundation), `submit_enquiry` (parent)
- `send_message` (universal — any role → any user)
- `place_order`, `request_service`, `send_supplier_inquiry` (marketplace)
- `create_replacement_request` (gated `v2_replacement_module`)
- **Rich per-action preview cards** — each L3 card shows a labelled field preview of exactly what will
  happen before the user confirms (replaces the generic args line).

**Phase 3 — Completeness**
- `find_user`, `get_platform_stats` (admin)
- `view_match_results` (ranked matches for an existing staffing request ID; renders candidate cards)
- Per-role welcome suggestion chips (foundation / educator / parent / supplier / service-provider / admin)
- `send_message` opened to all roles (educator/parent → foundation/admin etc.)

**Phase 4 — Reliability (partial)**
- Streaming tool-execution status: the orchestrator emits a `tool_status` SSE event when a result-card
  tool starts, so the UI shows "Searching candidates…" instead of a bare spinner.
- Native OpenAI function-calling: **deferred** — see §5 for the rationale and a concrete plan.

---

## 2. File map

### Backend (`api/src/assistant/`)
| File | Change |
|---|---|
| `tools/handlers/recruitment-write.handler.ts` | **NEW** — `post_job`, `apply_to_job`, `shortlist_candidate`, `update_application_status` |
| `tools/handlers/leads-write.handler.ts` | **NEW** — `respond_to_lead`, `submit_enquiry` |
| `tools/handlers/marketplace-write.handler.ts` | **NEW** — `place_order`, `request_service`, `send_supplier_inquiry` |
| `tools/handlers/messaging.handler.ts` | **NEW** — `send_message` |
| `tools/handlers/replacements.handler.ts` | **NEW** — `create_replacement_request` |
| `tools/handlers/admin.handler.ts` | **NEW** — `find_user`, `get_platform_stats` |
| `tools/handlers/search.handler.ts` | Added `view_match_results` |
| `tools/tool-registry.ts` | Added 14 tool definitions (11 L3 writes + `find_user`, `get_platform_stats`, `view_match_results`) |
| `tools/tool-handler.registry.ts` | Registers the 6 new handlers |
| `assistant.module.ts` | Imports `LeadsModule`, `MessagingModule`, `ReplacementsModule`, `UsersModule`; provides new handlers |
| `orchestrator.service.ts` | Emits `tool_status`; added `view_match_results` to `RESULT_CARD_TOOLS` |
| `orchestrator.service.spec.ts` | Registry rebuilt with new handler mocks; +12 tests (L3 writes, admin tools) |
| `../ai/agents/assistant-orchestrator/prompt.v1.ts` | WRITE-ACTION routing rules; `view_match_results`/`find_user`/`get_platform_stats` search rules |

### Frontend (`frontend/`)
| File | Change |
|---|---|
| `components/assistant/ActionPreviewCard.tsx` | **NEW** — per-L3-tool field preview, i18n labels |
| `components/assistant/AssistantPanel.tsx` | ToolCallCard uses rich preview; per-role welcome chips; consumes `tool_status` |
| `components/assistant/ResultCards.tsx` | `view_match_results` → candidate cards; `statusLabel` prop |
| `services/assistantService.ts` | `ToolStatusEvent` + `onToolStatus` handler; `tool_status` SSE case |

### Translations (`packages/translations/locales/{en,fr,de}/assistant.json`)
Added `preview` (titles + 24 field labels + noDetails) and `welcome` per-role chips. **96 keys each, in parity.**

---

## 3. How L3 writes flow (unchanged plumbing, new tools)

1. LLM proposes an L3 tool → orchestrator creates an `AIToolCall` (`AWAITING_APPROVAL`) and emits a
   `tool_call` approval card. **Nothing executes.**
2. Frontend renders `ToolCallCard` → `ActionPreviewCard` shows the labelled preview + Confirm/Cancel.
3. **Confirm** (modal-less) → `POST .../tool-calls/:id/confirm` → `OrchestratorService.confirmToolCall()`
   re-checks conversation ownership + role, runs the handler, marks `EXECUTED`, returns the result.
   **Cancel** → `.../reject` marks `REJECTED`.

No orchestrator changes were needed for execution — the Phase 0 confirm path runs any registered tool.

---

## 4. Conventions followed (keep these in future work)

- **One handler per domain; read vs write split.** Read handlers (`recruitment.handler.ts`) stayed; writes
  live in `*-write.handler.ts`. Register in `tool-handler.registry.ts` **and** `assistant.module.ts`.
- **Admin-on-behalf-of pattern:** write handlers take `foundationId` from `args` (admin, resolved via
  `find_foundation`) else `principal.organizationId` (own org). Mirrors `draft_job_post`.
- **Every tool returns `ToolResult`.** Writes return `{ data: {…created}, total: 1 }`.
- **Feature flags:** `post_job`/`shortlist_candidate`/`view_match_results` gated `v2_staffing_ia`;
  `create_replacement_request` gated `v2_replacement_module`. `send_message`/`contact_admin` never gated.
- **Result-card tools listed in two synced places:** `RESULT_CARD_TOOLS` (orchestrator) + `ResultCards.tsx`.
- **Translations** in key-parity across en/fr/de (validate by diffing the three JSONs — `i18n-check.js`
  is still absent in this checkout, see prior handover §6.3).

---

## 5. Phase 4 native function-calling — why deferred, and the plan

**Done:** streaming `tool_status` events (concrete, tested, user-facing).

**Deferred:** replacing JSON-in-prompt with OpenAI `tools[]` function-calling in `OpenRouterAdapter`.

**Why:** this is not an assistant-scoped change — `LlmClient.run()` / `OpenRouterAdapter` is the shared
gateway for **every** agent (staffing parser, knowledge embeddings, etc.). Swapping the request/response
contract changes how all of them parse model output. It cannot be validated in this environment (no live
OpenRouter key / model access), so shipping it blind risks a silent regression across the whole AI layer —
exactly the failure class it's meant to remove. It belongs in its own PR with live-LLM smoke tests.

**Concrete plan when picked up:**
1. Add a `tools?: ToolSchema[]` param to the `LlmClient.run()` options and an opt-in `useNativeTools` flag
   on the agent definition (default off → no behaviour change for existing agents).
2. In `OpenRouterAdapter`, when `useNativeTools`, send `tools` + `tool_choice` and read
   `choices[0].message.tool_calls` instead of parsing JSON from content. Map back to the existing
   `{ message, toolCall }` schema so the orchestrator is untouched.
3. Generate the `tools[]` schema from `TOOL_REGISTRY` (name/description/inputSchema already match the
   OpenAI shape — `inputSchema` becomes `parameters.properties`).
4. Flip `assistant-orchestrator` to `useNativeTools: true` last, behind a feature flag, after a live smoke
   test confirms tool selection parity.

---

## 6. Known issues / follow-ups

> A `feature-dev` code review (3 reviewers) ran against this build. Verified findings were **fixed**
> in this branch (see §8); the items below are what remains.

1. **`send_message` recipient is a raw `recipientUserId`.** Non-admins can't `find_user`, so cross-role
   messaging from educator/parent currently relies on an ID surfaced by a prior tool (e.g. a foundation
   card). A future `find_message_recipient` scoped lookup would close this.
2. **`RESULT_CARD_TOOLS` is duplicated** backend + frontend (now also `TOOL_STATUS_LABELS`). Mitigated with
   cross-reference "KEEP IN SYNC" comments; a shared `packages/` constant would remove the drift entirely.
3. **Native function calling** — §5.

---

## 8. Post-review fixes (this branch)

Applied after the `feature-dev` quality review:

- **Security — `update_application_status` cross-tenant write (CRITICAL).** The handler now loads the
  application's `jobListing.foundationId` and rejects (`ForbiddenException`) unless it matches the caller's
  org (admins exempt). The service updates by ID with no scoping, so the guard lives in the handler.
  Covered by two new tests (own-org succeeds, other-org rejected).
- **Data integrity — `submit_enquiry` blank email (CRITICAL).** This path bypasses the DTO's `@IsEmail`;
  the handler now validates the resolved `parentEmail` and rejects an invalid/blank one (new test).
- **Robustness — enum validation.** `update_application_status` validates against `ApplicationStatus` and
  `create_replacement_request` validates `urgency` against `UrgencyLevel`, returning a clear message
  instead of an opaque Prisma error.
- **DRY.** Extracted `CONTACT_ADMIN_SUGGESTION` and `resolveOnBehalfOrgId()` into `tool-handler.interface.ts`
  (were duplicated, with inconsistent copy, across handlers).
- **Drift guards.** Added "KEEP IN SYNC" comments tying the backend/frontend result-card lists together.

A separate reviewer reported 5 "feature-flag mismatch" criticals; all were **false positives** (verified
against `tool-registry.ts`) and the `respond_to_lead` "missing ownership check" was already enforced inside
`LeadsService.respondToLead`. No changes made for those.

---

## 7. How to verify

```bash
pnpm install
cd api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep '^src/' | grep 'error TS'   # → empty
cd api && npx jest assistant                                                          # → 64 passing
cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E 'assistant|ResultCards|ActionPreview'  # → empty
# Locale parity (en/fr/de → 96 each):
node -e "const fs=require('fs');const k=o=>Object.entries(o).flatMap(([a,v])=>v&&typeof v=='object'?k(v).map(b=>a+'.'+b):[a]);console.log(['en','fr','de'].map(l=>k(JSON.parse(fs.readFileSync('packages/translations/locales/'+l+'/assistant.json'))).length))"
```
