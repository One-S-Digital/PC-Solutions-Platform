# Admin Assistant Workspace — Build Plan

**Goal:** Bring the chat-first AI assistant experience built for the Foundation profile (per `ASSISTANT_DASHBOARD_REDESIGN_PLAN.md`) to the Admin dashboard: a full-page assistant workspace in the `/admin` SPA for `ADMIN` / `SUPER_ADMIN`, with a platform-wide Morning Briefing, conversation history, approval-gated actions inline in the chat, and a toggle back to the classic admin dashboard.

**Scope:** Admin SPA (`/admin`) + backend additions in `api/src/assistant/`. The Foundation workspace and Parent / Supplier / Service Provider dashboards are untouched. The classic admin dashboard (`admin/src/pages/Dashboard.tsx`) stays as-is — the workspace is an alternative landing view behind a flag.

**Visual language:** Admin SPA's existing tokens and component style (Tailwind + heroicons, `swiss-teal` / `swiss-mint` / `swiss-charcoal` as already used in `AssistantPanel.tsx`). Reuse the deep-teal hero treatment from the Foundation workspace for the briefing card.

---

## 1. What already exists (build on, don't rebuild)

The Foundation build did most of the heavy lifting — the backend is largely role-agnostic. This is primarily an **admin-frontend** project.

| Capability | Where | Status for Admin |
|---|---|---|
| All 8 `/assistant/*` endpoints (conversations CRUD, SSE messages, tool-call confirm/reject) | `api/src/assistant/assistant.controller.ts` | **Already allow ADMIN/SUPER_ADMIN** — no new endpoints needed |
| `GET /assistant/briefing` | `assistant.controller.ts` + `briefing.service.ts` | Endpoint allows ADMIN, but **items are foundation-org-scoped** — needs an admin variant (§3.1) |
| Orchestrator: multi-step tool loop, L1/L2/L3 tiers, PII scrubber, history, flags | `api/src/assistant/orchestrator.service.ts` | Role-agnostic; `getToolsForRole(ADMIN)` already returns the broadest tool set |
| Tool registry (66 tools, role + flag scoped) | `api/src/assistant/tools/tool-registry.ts` | Admin sees all `*_ADMIN` scopes plus `ADMIN_ONLY` (`find_user`, `find_foundation`, `get_platform_stats`); needs admin-ops tools (§3.2) |
| Conversation persistence (title, kind, statusLabel, archive, lastActivityAt) | `AIConversation` / `AIMessage` / `AIToolCall` Prisma models | Reuse unchanged — `organizationId` is already optional, `role` snapshot per conversation |
| LLM config (`assistant-orchestrator` agent, OpenRouter fallback chain, budget) | `api/src/ai/ai-agents.config.ts` | `allowedRoles` already includes ADMIN/SUPER_ADMIN |
| Floating chat widget in admin (SSE streaming, tool cards, L3 approve/cancel, modal actions) | `admin/src/components/assistant/AssistantPanel.tsx`, `AssistantContainer.tsx` | Working today, but session-only: no history, no briefing, no draft cards, no sidebar list |
| Admin SSE client | `admin/src/services/assistantService.ts` | Has `createConversation` + `streamMessage` only — missing list/history/patch/confirm-by-id/briefing functions that `frontend/services/assistantService.ts` already has |
| Workspace UI components (header, briefing card, draft approval card, chips, composer, trust footer, conversations list) | `frontend/components/assistant-workspace/`, `frontend/components/assistant/` (incl. `useAssistantChat.ts`, `ChatMessageList.tsx`, `ResultCards.tsx`) | Built for the frontend SPA — **cannot be imported across SPAs today**; extraction decision in §2.1 |
| i18n | `packages/translations/locales/{en,fr,de}/assistant.json`; admin auto-discovers shared namespaces (`admin/src/i18n/index.ts`) | Reuse `assistant` namespace; add `assistant.adminWorkspace.*` keys for admin-specific copy |
| Feature flags read path | `GET /feature-flags/me` + `frontend/hooks/useFeatureFlags.ts` | Endpoint reusable; admin SPA needs its own small `useFeatureFlag` hook (copy of the frontend one) |

**Gaps to build:** admin briefing generator (platform-wide signals), admin-ops tools, shared chat-UI extraction (or admin-side port), full-page workspace route in `/admin`, conversations list in the admin sidebar, admin feature flag, i18n keys.

---

## 2. Target experience & component map

Same layout grammar as the Foundation workspace, with admin content:

```
┌────────────┬──────────────────────────────────────────────────┐
│ Sidebar    │ AssistantHeader (greeting · "Platform overview" ·│
│ (existing  │   Assistant | Dashboard toggle · bell · avatar)  │
│ NavGroup   ├──────────────────────────────────────────────────┤
│ nav,       │ AdminBriefingCard ("N items need review today")  │
│ unchanged) │ ChatThread                                       │
│            │   ├ MessageBubble (user)                         │
│ CONVERSA-  │   ├ AssistantMessage (+ ResultCards)             │
│ TIONS (new)│   └ ActionApprovalCard (L3, e.g. approve educator)│
│ + New      │ QuickActionChips (admin templates)               │
│            │ Composer · TrustFooter                           │
└────────────┴──────────────────────────────────────────────────┘
```

| Component (admin SPA) | Notes |
|---|---|
| `admin/src/pages/AssistantWorkspacePage.tsx` | New route `/assistant`; owns active-conversation state, URL-synced via `?c=<id>` (same pattern as `frontend/pages/foundation/AssistantWorkspacePage.tsx`) |
| `Sidebar.tsx` extension | Existing strategy-locked NavGroup nav **unchanged**; append a `CONVERSATIONS` section beneath it: grouped list (Today / Yesterday / Last week / Older), kind icons, status sublabels, inline rename, archive, "+ New" — port of `frontend` `ConversationsList` |
| `AssistantHeader.tsx` | Greeting + date; segmented `Assistant | Dashboard` toggle navigating between `/assistant` and `/dashboard` |
| `AdminBriefingCard.tsx` | Deep-teal hero card rendering `GET /assistant/briefing` items for admins (§3.1); each item's CTA submits a pre-built prompt into the thread |
| `ChatThread` / `useAssistantChat` / `ResultCards` / `ActionApprovalCard` | Shared with frontend per §2.1 — do not fork |
| `QuickActionChips.tsx` | Admin templates: "Review pending educator approvals", "Show platform stats this week", "Find a user", "Draft an invite" |
| `Composer.tsx`, `TrustFooter.tsx` | Direct ports; trust copy identical ("no external action without your approval") |

**Quick-action chips and briefing CTAs are just prompt templates** — they submit text into the normal chat pipeline, exactly as in the Foundation build.

### 2.1 Code sharing decision — extract, don't fork (recommended)

The admin widget already duplicates `assistantService.ts`, and the Foundation plan's own guardrail says "Don't fork the chat UI… or every streaming fix lands twice." Adding a second full workspace by copy would triple maintenance.

- **Recommended:** create `packages/assistant-ui/` (workspace package, consistent with the existing shared-UI convention in `/packages`) containing the transport (`assistantService.ts`), `useAssistantChat.ts`, `ChatMessageList`, `ResultCards`, `ActionPreviewCard`/`DraftApprovalCard`, `Composer`, `TrustFooter`, `ConversationsList`, `QuickActionChips` (chips/config injected per app). Auth stays injected via the existing `getToken` parameter, so the package has no Clerk coupling. Frontend then re-exports from the package (mechanical refactor, no behavior change).
- **Fallback (if extraction is deemed too risky mid-remodel):** port the components into `admin/src/components/assistant-workspace/` as copies, and record the duplication in CLAUDE.md "Known Issues". Phase A below works with either choice; the extraction is its own phase so it can be deferred but not forgotten.

---

## 3. Backend work

### 3.1 Admin Morning Briefing (extend `briefing.service.ts`)

Branch on `principal.role` inside `BriefingService` (or add an `AdminBriefingProvider` the service delegates to). Deterministic queries only, same 30-min per-user cache, same `{ generatedAt, items, conversationId }` response shape and daily `kind: BRIEFING` conversation persistence — the frontend card stays dumb.

Platform-wide items (each carries a `prompt` string for its CTA):

| Item type | Query | Window |
|---|---|---|
| `pending_educator_approvals` | educator profiles awaiting approval | all open |
| `stale_applications_platform` | `jobApplication.count({ status: 'PENDING' })`, platform-wide | older than 5 days |
| `unassigned_parent_leads` | `parentLead.count({ status: 'NEW' })`, platform-wide | last 7 days |
| `replacements_without_matches` | open `ReplacementRequest` with no `PROPOSED` match | all open |
| `open_support_tickets` | unresolved support tickets | all open |
| `canton_policy_updates` | `asset.count({ category: 'STATE_POLICY' })`, all cantons | last 7 days |
| `unread_notifications` | `notification.count({ read: false })`, user-scoped | n/a |

Align item types with the staffing remodel's "Staffing Signals" concept (STAFFING_REMODEL_PLAN §5.6) so the briefing and the remodeled admin dashboard report the same numbers from the same queries.

### 3.2 Admin tools (tool registry additions, `ADMIN_ONLY` scope)

Existing: `find_user`, `find_foundation`, `get_platform_stats` (all L1). Additions, each a thin wrapper over existing services — no new domain logic:

| Tool | Level | Backed by |
|---|---|---|
| `get_pending_educator_approvals` | L1 | recruitment/approvals queries (result card: candidate rows) |
| `approve_educator` / `reject_educator` | **L3** | existing approval mutation; one approval card per educator |
| `get_open_support_tickets` | L1 | support module |
| `get_staffing_signals` | L1 | same queries as §3.1 (zero-match jobs, low-pool cantons) |
| `draft_user_invite` / `send_user_invite` | L2 / **L3** | `POST /users/invite` flow (`users.controller.ts`) |
| `draft_announcement` / `send_announcement` | L2 / **L3** | mailing (campaigns) module |

Defense-in-depth: every handler re-checks `ADMIN_ONLY` against the principal (pattern already in `admin.handler.ts:35`). Fix while here: `get_platform_stats` currently validates against `FOUNDATION_ADMIN` — tighten to `ADMIN_ONLY`.

**Out of scope (deliberately):** feature-flag toggling, user deletion, subscription/billing mutations — too destructive for v1; the assistant deep-links to the relevant admin page instead (`navigate_to` tool already exists).

### 3.3 Schema & endpoints

**None.** All required Prisma models and endpoints exist. Admin conversations are user-scoped (`organizationId: null`), which the models already support.

---

## 4. Routing, flags, rollout

- **Flag:** new `v2_admin_assistant` (FeatureFlag table, seeded `isActive: false`), independent of `v2_assistant_dashboard` so admin and foundation roll out separately. Tool-level flags (`v2_staffing_ia`, etc.) keep working unchanged through the registry.
- **Routes:** add `<Route path="assistant" element={<AssistantWorkspacePage />} />` in `admin/src/App.tsx` (inside `AdminProtectedRoute`). Flag ON → the `index` redirect targets `/assistant` instead of `/dashboard`; header toggle switches between the two. Flag OFF → route hidden, nothing changes.
- **Floating widget:** suppress `AssistantContainer` on `/assistant` (duplicate); keep it on all other admin pages. Once the shared package lands, the widget renders the shared `ChatThread` too — fixing today's drift where the admin widget lacks `tool_status`, `next_steps`, and persisted-history handling.
- **i18n:** new keys in en/fr/de under `assistant` (e.g. `assistant.adminWorkspace.*`, `assistant.adminBriefing.*`); run `pnpm i18n:check`.
- **Budget:** admin usage shares the orchestrator's 500k daily token budget — monitor via the existing AI audit trail (`/ai` AiOperationsPage) during pilot; raise or split per-role only if pilot data demands it.

---

## 5. Phasing

**Phase A — Shared chat core** *(no user-visible change)*
Extract transport + `useAssistantChat` + message list + cards into `packages/assistant-ui/`; re-point frontend and the admin floating widget at it. Exit: both SPAs render chat from one implementation; `pnpm type-check` and existing assistant tests green.

**Phase B — Admin workspace shell**
`AssistantWorkspacePage` + route + `v2_admin_assistant` flag + admin `useFeatureFlag` hook; header with toggle; composer, chips (prompt templates), trust footer; suppress floating widget on the page. Exit: admin lands on a full-page chat with history-backed conversations (list/rename/archive — backend already done) in the sidebar.

**Phase C — Admin briefing**
§3.1 backend branch + `AdminBriefingCard` + CTA wiring. Exit: hero card shows real platform-wide review items with working CTAs.

**Phase D — Admin tools & approvals**
§3.2 tools end-to-end; educator-approval flow as the flagship L3 demo (briefing item → list card → per-candidate `Approve` cards → status updates in place). Exit: all four quick-action chips fully functional.

**Phase E — Polish & rollout**
fr/de translations, mobile/drawer QA, empty/error states, telemetry (reuse the Foundation event names with a `surface: admin` property), pilot with internal admins → flag flip. Remember last toggle choice per user.

Each phase ships independently behind the flag; A–C carry no external-action risk.

---

## 6. Risks & guardrails

- **Admin blast radius:** admin tools act across *all* organizations, not one foundation. Every mutating tool is L3 (explicit approval click), handlers re-check the role server-side, and every execution is already recorded in `AIToolCall` (+ AI audit log). No bulk-mutation tools in v1.
- **PII at platform scope:** `find_user` and approval lists surface real user data; the orchestrator's PII scrubber must stay in the loop for everything fed back to the LLM (raw data only reaches the frontend card). Verify scrubber coverage for the new tools in review.
- **Extraction churn:** Phase A touches the Foundation workspace mid-remodel (PR #626 branch). Keep it a pure move-and-re-export refactor, land it separately, and rerun the Foundation assistant smoke tests before Phase B starts.
- **Two briefings, one truth:** admin briefing numbers must match the remodeled admin dashboard's staffing signals — share the query layer, don't re-implement counts.
- **Trust footer is a contract:** as with Foundation, nothing outward-facing sends without approval; keep the copy true.
