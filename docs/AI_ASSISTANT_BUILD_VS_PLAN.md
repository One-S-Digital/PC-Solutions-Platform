# AI Assistant — Build vs Plan Comparison & Handover

**Date:** 2026-06-03 · **Branch:** `claude/jolly-maxwell-gYKT1`
**Purpose:** Single source of truth for *what was planned* vs *what is actually built*, reconciling the
three planning documents against the code on this branch.

**Reference documents:**
- **Original plan** — `docs/AI_ASSISTANT_MASTER_PLAN.md` (strategic, layers, phases, post-v2 roadmap P1–P15)
- **V2 plan** — `docs/AI_ASSISTANT_REDESIGN_V2.md` (tool catalog, no-results, L3 writes, phasing §9)
- **Build handovers** — `docs/AI_LAYER1_HANDOVER.md`, `docs/AI_MVP_HANDOVER.md`,
  `docs/AI_ASSISTANT_V2_PHASE0-1_HANDOVER.md`, `docs/AI_ASSISTANT_V2_PHASE2-4_HANDOVER.md`

**Legend:** ✅ built & tested · 🟡 partial / built-but-unhardened · ❌ not built

---

## 1. Executive summary

The MVP (Layer 1 + staffing backend + conversation infra + assistant panel) and **v2 Phases 0–2** are
fully built. **Phase 3 is built for its tool surface but not its hardening items.** **Phase 4 is one-third
built** (streaming status only). The post-v2 roadmap (P1–P15) is untouched, as planned.

| Phase | Scope | Status |
|---|---|---|
| MVP M0–M2 | Layer 1, staffing backend, conversation infra, assistant panel | ✅ |
| **V2 Phase 0** | Handler registry, result envelope, `contact_admin`, prompt rules, `MAX_TOOL_STEPS=5` | ✅ |
| **V2 Phase 1** | Real search (6 tools), no-results suggestions, result cards, EDU/PARENT roles | ✅ |
| **V2 Phase 2** | 11 L3 write tools, rich preview cards | ✅ |
| **V2 Phase 3** | `find_user`/`get_platform_stats`/`view_match_results` + welcome chips | ✅ |
| V2 Phase 3 (hardening) | Rate limiting, per-user budget cap, AI-Ops Assistant tab, eval harness, onboarding tour | ❌ |
| **V2 Phase 4** | Streaming `tool_status` | 🟡 (status done) |
| V2 Phase 4 (rest) | Native function-calling, conversation persistence across refresh | ❌ |
| Post-v2 P1–P15 | External routing, RAG, memory, embeddings, geocoding, WhatsApp, voice, CV parsing… | ❌ (by design) |

**Tool count:** **35 tools built** across all 7 roles (v2 plan targeted "~45"; the gap is unbuilt post-v2
tools like `search_hr_documents`, external-routing, e-learning — not missing core tools).

---

## 2. Architecture layers

| Layer | Planned | Built |
|---|---|---|
| **L1 — Shared AI foundation** (`api/src/ai/`) | gateway, OpenRouter+Voyage adapters, circuit breaker, audit, budget, safety, result cache, agent registry, queues | ✅ — with gaps: `LlmClient.retrieve()` (RAG) ❌, geocoding processor ❌, vector ranking is a stub ❌ |
| **L2 — Orchestrator** (`api/src/assistant/`) | intent → role-aware tool selection → approval gates → streaming | ✅ — per-domain `ToolHandlerRegistry`, `MAX_TOOL_STEPS=5`, SSE streaming, L3 confirm/reject endpoints |
| **L3 — Specialist modules** | Staffing, Recruitment, Marketplace, Leads, Messaging, Support, Replacements | ✅ for everything wired to a tool. External Routing / HR-RAG / E-learning / WhatsApp modules ❌ (post-v2) |

---

## 3. Tool catalog — planned (v2 §5) vs built

All 35 built tools, grouped by audience. Every tool has a handler registered in
`tool-handler.registry.ts` and provided in `assistant.module.ts` (parity verified).

### Universal (all roles)
| Tool | Level | Status |
|---|---|---|
| `search_help_docs` | L1 | ✅ |
| `get_my_profile` | L1 | ✅ |
| `navigate_to` | L1 | ✅ |
| `open_modal` | L1 | ✅ |
| `contact_admin` | L3 | ✅ (never gated — escalation always available) |
| `send_message` | L3 | ✅ (universal; recipient is a raw userId — see §6) |

### Admin / Super-Admin
| Tool | Level | Status |
|---|---|---|
| `find_foundation` | L1 | ✅ |
| `find_user` | L1 | ✅ (Phase 3) |
| `get_platform_stats` | L1 | ✅ (Phase 3) |

### Foundation + Admin
| Tool | Level | Flag | Status |
|---|---|---|---|
| `get_my_leads` | L1 | — | ✅ |
| `get_my_orders` | L1 | — | ✅ |
| `search_candidates` | L1 | `v2_staffing_ia` | ✅ |
| `search_candidates_ai` | L1 | `v2_staffing_ia` | ✅ (sync parse→match→ranked) |
| `search_products` / `search_services` | L1 | — | ✅ |
| `explain_match` | L1 | `v2_staffing_ia` | ✅ |
| `view_match_results` | L1 | `v2_staffing_ia` | ✅ (Phase 3) |
| `post_job` | L3 | `v2_staffing_ia` | ✅ |
| `shortlist_candidate` | L3 | `v2_staffing_ia` | ✅ |
| `update_application_status` | L3 | — | ✅ (org-ownership enforced — see §6) |
| `create_replacement_request` | L3 | `v2_replacement_module` | ✅ |
| `respond_to_lead` | L3 | — | ✅ |
| `place_order` / `request_service` / `send_supplier_inquiry` | L3 | — | ✅ |
| `draft_job_post` / `draft_parent_reply` | L2 | `v2_staffing_ia` | ✅ (modal prefill) |

### Educator
| Tool | Level | Status |
|---|---|---|
| `search_jobs` | L1 | ✅ |
| `apply_to_job` | L3 | ✅ |
| `get_my_applications` | L1 | ✅ |

### Parent
| Tool | Level | Status |
|---|---|---|
| `search_foundations` | L1 | ✅ |
| `submit_enquiry` | L3 | ✅ (email validated — see §6) |
| `get_my_enquiries` | L1 | ✅ |

### Supplier / Service Provider
| Tool | Level | Status |
|---|---|---|
| `get_my_listings` | L1 | ✅ |
| `get_my_service_requests` | L1 | ✅ |
| `get_my_orders` | L1 | ✅ (shared with foundation) |

**Retired:** `search_internal_candidates` (replaced by `search_candidates` + `search_candidates_ai`).

---

## 4. Phase-by-phase: planned vs built

### Phase 0 — Foundation refactor ✅
Planned (master §5 / v2 §9): handler registry, standard result envelope, `contact_admin`,
no-results/escalation prompt rules, `MAX_TOOL_STEPS 3→5`, retire `search_internal_candidates`.
**Built:** all of it. (Phase 0–1 handover.)

### Phase 1 — Search done right ✅
Planned: `search_candidates_ai`, `search_candidates`, `search_products`, `search_services`,
`search_jobs`, `search_foundations`; `suggestions[]` on `total:0`; result cards; open to EDUCATOR/PARENT.
**Built:** all of it, incl. `CandidateResultCard`/`JobListingCard`/`ProductCard`/`ServiceCard`/`NoResultsCard`.

### Phase 2 — L3 write actions ✅
Planned: `post_job`, `apply_to_job`, `shortlist_candidate`, `update_application_status`, `respond_to_lead`,
`send_message`, `place_order`, `request_service`, `send_supplier_inquiry`, `create_replacement_request`,
`submit_enquiry`; rich `ToolCallCard` previews.
**Built:** all 11 tools + `ActionPreviewCard` (per-action labelled previews).

### Phase 3 — Completeness + hardening 🟡
| Item | Status |
|---|---|
| `find_user`, `get_platform_stats` | ✅ |
| `view_match_results` | ✅ |
| Per-role welcome suggestion chips | ✅ |
| **Rate limiting per user (30 req/min, ThrottlerModule)** | ❌ |
| **Daily per-user budget cap in `BudgetService`** | ❌ (L1 `BudgetService` exists; not wired per-user into the assistant) |
| **AI-Ops dashboard "Assistant" tab** (conversation counts, top tools, latency) | ❌ |
| **Eval harness `pnpm test:ai-eval`** (fixtures per agent per locale) | ❌ |
| **Onboarding tour** for new assistant users | ❌ |

> Note: the v2 redesign doc (§9) listed Phase 3 as *completeness only*; the master plan (§5) folded the
> hardening items above into Phase 3. They remain unbuilt under either reading.

### Phase 4 — Reliability upgrade 🟡
| Item | Status |
|---|---|
| Streaming execution status (`tool_status` SSE → "Searching candidates…") | ✅ |
| **Native OpenAI function-calling** (`tools[]` in `OpenRouterAdapter`, replace JSON-in-prompt) | ❌ — deliberately deferred; plan in Phase 2-4 handover §5 |
| **Conversation history persisted across refresh** (sessionStorage / `AIContextMemory` hydration) | ❌ |

---

## 5. What still needs to be built (consolidated backlog)

### A. Finish v2 Phase 3 (hardening — recommended before a wider beta)
1. **Rate limiting** — `ThrottlerModule` guard on the assistant message endpoint (~30/min/user).
2. **Per-user daily budget cap** — wire L1 `BudgetService` into the orchestrator; reject over-budget with a friendly message.
3. **AI-Ops "Assistant" tab** — conversation counts, top tools, p50/p95 latency (`AiOperationsPage.tsx` — also still hardcoded-EN, needs `aiOperations.json` already present).
4. **Eval harness** — `pnpm test:ai-eval` running golden fixtures per agent per locale.
5. **Onboarding tour** for first-time assistant users.

### B. Finish v2 Phase 4 (reliability)
6. **Native function-calling** in `OpenRouterAdapter` (opt-in `useNativeTools` flag, generate `tools[]` from `TOOL_REGISTRY`, flip the assistant agent last, behind a flag, with a live smoke test). Detailed plan: Phase 2-4 handover §5.
7. **Conversation persistence** across page refresh (hydrate from `AIMessage` / sessionStorage).

### C. Open Layer-1 / MVP gaps (predate v2, still relevant)
8. `LlmClient.retrieve()` — RAG retrieval (pgvector cosine on `KnowledgeDocument.embedding`). Blocks P2.
9. **Geocoding worker** (`ai.geocode` processor) — queue exists, no processor. Blocks `earthdistance` perf win.
10. **Vector ranking** — `HybridMatcherService` vector-similarity tiebreaker is a stub; `EducatorEmbedding` backfill not run.
11. **`AiOperationsPage.tsx` i18n** — still hardcoded English (namespace `aiOperations.json` exists to receive keys).
12. **Translation namespaces** — `aiTools.json` and `aiSafety.json` from the master plan were **not** created; tool/result strings were folded into `assistant.json`. Decide: adopt the planned split or document the consolidation.

### D. Post-v2 roadmap (P1–P15 — untouched, by design)
External Routing/JobUp (P1) · HR-Doc RAG (P2) · enhanced Parent-Lead agent (P3) · Memory/context store (P4) ·
E-learning assistant (P6) · Admin demand analytics (P7) · Reactivation engine (P8) · Profile embeddings (P9) ·
Geocoding (P10, = #9) · WhatsApp channel (P13) · CV parsing (P14) · Voice input (P15).
*(P5/P11/P12 were pulled into v2 Phases 1–2 and are ✅ done.)*

---

## 6. Known issues / tech debt (current branch)

Post-review fixes already applied this branch (Phase 2-4 handover §8):
- ✅ `update_application_status` now enforces foundation ownership (was a cross-tenant write).
- ✅ `submit_enquiry` validates `parentEmail` (bypassed the DTO's `@IsEmail`).
- ✅ Enum validation for `status` / `urgency`; extracted shared `CONTACT_ADMIN_SUGGESTION` + `resolveOnBehalfOrgId()`.

Still open:
- `send_message` takes a raw `recipientUserId`; non-admins can't `find_user`, so cross-role messaging relies on an ID surfaced by a prior tool. A scoped `find_message_recipient` would close it.
- `RESULT_CARD_TOOLS` is duplicated backend/frontend (now + `TOOL_STATUS_LABELS`); mitigated with "KEEP IN SYNC" comments, not a shared constant.
- Webhook idempotency / `search_candidates_ai` double-match when Redis is enabled (Phase 0-1 handover §6).

---

## 7. Translation surfaces (master plan §3.2)

| Surface | Status |
|---|---|
| A. UI strings (`assistant.json`, en/fr/de, 96 keys, parity) | ✅ |
| B. AI prompts (localized `prompt.v1.ts`) | ✅ |
| C. AI-generated content (model outputs in locale; `MatchResult.explanationLocale`) | ✅ |
| D. Backend messages (`TranslationService`) | ✅ for shipped paths |
| Planned `aiTools.json` / `aiSafety.json` namespaces | ❌ (folded into `assistant.json`) |
| `aiOperations.json` wired into `AiOperationsPage.tsx` | ❌ (file exists, page still hardcoded EN) |

---

## 8. Quick verify

```bash
pnpm install
cd api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep '^src/' | grep 'error TS'   # → empty
cd api && npx jest assistant                                                          # → 64 passing
cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E 'assistant|ResultCards|ActionPreview'  # → empty
# 35 built tools:
node -e "const s=require('fs').readFileSync('api/src/assistant/tools/tool-registry.ts','utf8');console.log((s.match(/name:\s*'/g)||[]).length,'tool defs')"
```
