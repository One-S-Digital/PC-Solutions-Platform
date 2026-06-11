# Agent Handover Note — Assistant Dashboard Redesign (Phase C → F)

**Date:** 2026-06-11  
**Branch:** `claude/focused-euler-xobpea`  
**Last committed:** Phase B (conversation history)  
**Uncommitted changes on disk:** Phase C partial (see below)

---

## What this project is

A full-page chat-first AI workspace for Foundation (daycare) users, gated behind the `v2_assistant_dashboard` feature flag. When the flag is on, Foundation users land at `/foundation/assistant` instead of `/foundation/dashboard`. A segmented toggle in both views switches between them.

The floating assistant widget is suppressed on `/foundation/assistant` (handled in `AssistantContainer.tsx`).

---

## What has already been built and committed

### Phase A — Workspace shell
- `frontend/components/assistant-workspace/` — `AssistantToggle`, `AssistantHeader`, `QuickActionChips`, `Composer`, `TrustFooter`, `index.ts`
- `frontend/pages/foundation/AssistantWorkspacePage.tsx` — full-page layout, URL-synced conversation selection via `?c=<id>`
- `frontend/pages/foundation/FoundationDashboardPage.tsx` — `AssistantToggle active="dashboard"` added
- `frontend/App.tsx` — `/foundation/assistant` route added; `RoleBasedDashboardRedirect` flag-aware for FOUNDATION
- `frontend/tailwind.config.js` — `swiss-deep-teal: '#1A5F7A'` added
- `frontend/hooks/useFeatureFlags.ts` — module-level cache, `useFeatureFlag(key)` hook
- `api/src/subscription-management/feature-flags.controller.ts` — `GET /feature-flags/me`
- `api/prisma/seed.ts` — seeds `v2_assistant_dashboard` flag (isActive: false)
- i18n keys: `packages/translations/locales/{en,fr,de}/assistant.json` — full `workspace.*` namespace

### Phase B — Conversation history + sidebar
- `frontend/components/assistant/useAssistantChat.ts` — shared chat state machine (extracted from AssistantPanel)
- `frontend/components/assistant/ChatMessageList.tsx` — shared thread renderer
- `frontend/components/assistant/AssistantPanel.tsx` — rewritten to use shared hook
- `frontend/components/assistant/index.ts` — exports `ChatMessageList`, `useAssistantChat`, `ChatMessage`, `PendingModal`
- `frontend/components/assistant-workspace/ConversationsList.tsx` — sidebar history, groups Today/Yesterday/Last week/Older, inline rename, optimistic archive
- `frontend/components/layout/Sidebar.tsx` — `<ConversationsList />` rendered below nav for Foundation users
- `api/prisma/schema.prisma` — `AIConversationKind` enum (`CHAT DRAFT BRIEFING ORDER`), new fields on `AIConversation`: `title`, `kind`, `statusLabel`, `archivedAt`, `lastActivityAt`
- `api/prisma/migrations/20260610000000_add_conversation_history/migration.sql` — idempotent migration
- `api/src/assistant/assistant.service.ts` — `listConversations()`, `updateConversation()`, auto-title from first message, `lastActivityAt` bump
- `api/src/assistant/assistant.controller.ts` — `GET /assistant/conversations`, `PATCH /assistant/conversations/:id`, `GET /assistant/briefing` (Phase C stub already added)
- `api/src/assistant/assistant.service.spec.ts` — tests for auto-title, no-overwrite, listConversations, updateConversation CRUD
- `frontend/services/assistantService.ts` — `listConversations()`, `updateConversation()`, `getConversationHistory()`, `Briefing`/`BriefingItem`/`BriefingItemType` types + `getBriefing()`

---

## Uncommitted changes on disk (Phase C — Morning Briefing)

These four files have been edited but **not yet committed**:

| File | Status | What changed |
|---|---|---|
| `api/src/assistant/briefing.service.ts` | **NEW (untracked)** | Full `BriefingService` — 5-query compute, 30-min in-memory cache per userId, `ensureBriefingConversation()` |
| `api/src/assistant/assistant.module.ts` | modified | `BriefingService` added to providers array |
| `api/src/assistant/assistant.controller.ts` | modified | `GET /assistant/briefing` endpoint + `BriefingService` injection |
| `frontend/services/assistantService.ts` | modified | `Briefing`, `BriefingItem`, `BriefingItemType` types + `getBriefing()` function |

**These have not been type-checked, tested, or committed. Do that before writing more code.**

---

## What to do next (in order)

### Step 1 — Finish Phase C

#### 1a. Type-check and test the uncommitted backend changes
```bash
cd api && pnpm type-check
pnpm test -- --testPathPattern=assistant.service.spec
```
Fix any errors before continuing.

#### 1b. Create `MorningBriefingCard.tsx`

Path: `frontend/components/assistant-workspace/MorningBriefingCard.tsx`

Design spec:
- Deep-teal hero card (`bg-swiss-deep-teal text-white` or a gradient)
- Headline: `"{n} things need your attention today"` — from `briefing.items.length`
- One chip/row per `BriefingItem` type with an icon + localized label + count badge
- Item icons:
  - `parent_leads` → `UserGroupIcon`
  - `stale_applications` → `ClockIcon`
  - `pending_replacements` → `ArrowsRightLeftIcon`
  - `canton_updates` → `DocumentTextIcon`
  - `unread_notifications` → `BellIcon`
- CTA row at the bottom: "Handle everything with me" (sends a pre-built prompt) + per-item quick prompts
- Loading skeleton: show while `isLoading`
- Hide entirely once the user has sent their first message (`messages.length > 0`)
- i18n keys to add under `workspace.briefing.*` in all three locale files

Prompt templates to inject on item click:
```
parent_leads   → "Show my new parent leads and help me reply to them."
stale_applications → "Show me applications waiting more than 5 days and help me action them."
pending_replacements → "Show pending replacement matches and help me review them."
canton_updates → "Summarise the latest cantonal policy updates relevant to my crèche."
unread_notifications → "Show my unread notifications."
handle_all     → "Give me a summary of everything that needs attention today and let's handle it together."
```

#### 1c. Wire `MorningBriefingCard` into `AssistantWorkspacePage.tsx`

Position: between `<AssistantHeader />` and the thread scroll area. Show when:
- `messages.length === 0` AND `!isLoadingHistory` AND `briefing.items.length > 0`

Add a `useBriefing()` call at the top of the page component:
```ts
const { briefing, isLoading: briefingLoading } = useBriefing(); // new hook wrapping getBriefing()
```

The card disappears once the first message is sent (messages.length > 0 hides it).

#### 1d. Add i18n keys for briefing card
Add to `packages/translations/locales/{en,fr,de}/assistant.json` under `workspace.briefing`:
```json
{
  "workspace": {
    "briefing": {
      "headline_one": "{{count}} thing needs your attention today",
      "headline_other": "{{count}} things need your attention today",
      "handleAll": "Handle everything with me",
      "parent_leads": "{{count}} new parent lead",
      "parent_leads_plural": "{{count}} new parent leads",
      "stale_applications": "{{count}} application stale",
      "stale_applications_plural": "{{count}} applications stale",
      "pending_replacements": "{{count}} replacement pending",
      "pending_replacements_plural": "{{count}} replacements pending",
      "canton_updates": "{{count}} canton update",
      "canton_updates_plural": "{{count}} canton updates",
      "unread_notifications": "{{count}} unread notification",
      "unread_notifications_plural": "{{count}} unread notifications"
    }
  }
}
```

#### 1e. Export `MorningBriefingCard` from `index.ts`
```ts
// frontend/components/assistant-workspace/index.ts
export { MorningBriefingCard } from './MorningBriefingCard';
```

#### 1f. Commit Phase C
```bash
git add api/src/assistant/briefing.service.ts \
        api/src/assistant/assistant.module.ts \
        api/src/assistant/assistant.controller.ts \
        frontend/services/assistantService.ts \
        frontend/components/assistant-workspace/MorningBriefingCard.tsx \
        frontend/components/assistant-workspace/index.ts \
        frontend/pages/foundation/AssistantWorkspacePage.tsx \
        packages/translations/locales/en/assistant.json \
        packages/translations/locales/fr/assistant.json \
        packages/translations/locales/de/assistant.json

git commit -m "Phase C: morning briefing card and backend briefing service"
git push -u origin claude/focused-euler-xobpea
```

---

### Phase D — Draft approval card

Create `frontend/components/assistant-workspace/DraftApprovalCard.tsx`:
- States: `PENDING` (show diff/preview + Approve / Edit / Discard buttons) → `APPROVED` (green tick) → `SENT` (delivery confirmed)
- Triggered by SSE `tool_call` events where `toolName === 'draft_lead_reply'` (L2 tier)
- On Approve: call `confirmToolCall()`, patch status to APPROVED, show SENT once SSE done event arrives
- On Edit: open a textarea prefilled with the draft; re-send the edited text as a follow-up message
- On Discard: call `rejectToolCall()`

Backend prerequisite: `draft_lead_reply` and `send_lead_reply` tools must exist in the orchestrator toolset (check `api/src/assistant/tools/`).

---

### Phase E — Additional tools

Add the following to the orchestrator tool registry:
- `draft_newsletter` — Draft a newsletter for parents (L2, requires approval)
- `draft_onboarding_pack` — Prepare an onboarding doc for a new family (L2)
- `place_supply_order` — Create a supply order (L3, requires explicit confirm)
- `summarise_canton_update` — Summarise a STATE_POLICY asset (L1, answer-only)
- `shortlist_candidate` — Shortlist a job applicant (L2)

---

### Phase F — QA and ship

- `pnpm i18n:check` — verify all three locales have identical key structure
- Mobile QA: sidebar collapses, composer fits, cards scroll correctly
- Flip flag: `UPDATE "FeatureFlag" SET "isActive" = true WHERE key = 'v2_assistant_dashboard'` on staging
- Remove `isActive: false` from seed once flag is verified stable
- Add telemetry events: `assistant_workspace_opened`, `briefing_card_cta_clicked`, `quick_action_sent`

---

## Key architectural rules (do not break)

1. **Sidebar nav is unchanged** — ConversationsList is _additive_, appended after the nav `map()` loop in `Sidebar.tsx`
2. **Float widget is suppressed on `/foundation/assistant`** — `AssistantContainer.tsx` returns null when `location.pathname.startsWith('/foundation/assistant')`
3. **Shared chat engine** — Both the workspace page and the floating panel use `useAssistantChat` + `ChatMessageList`. Never duplicate streaming logic
4. **Feature flag fails closed** — `useFeatureFlags.ts` returns empty map on error; all flags default to OFF
5. **Parent / Supplier / Service Provider dashboards are untouched** — only FOUNDATION is remodeled
6. **Do not push to main** — all work goes to `claude/focused-euler-xobpea`

---

## File map

| What | Where |
|---|---|
| Workspace page | `frontend/pages/foundation/AssistantWorkspacePage.tsx` |
| Workspace components | `frontend/components/assistant-workspace/` |
| Shared chat hook | `frontend/components/assistant/useAssistantChat.ts` |
| Shared thread renderer | `frontend/components/assistant/ChatMessageList.tsx` |
| API service functions | `frontend/services/assistantService.ts` |
| Feature flags hook | `frontend/hooks/useFeatureFlags.ts` |
| Briefing backend service | `api/src/assistant/briefing.service.ts` |
| Assistant controller | `api/src/assistant/assistant.controller.ts` |
| Feature flags controller | `api/src/subscription-management/feature-flags.controller.ts` |
| Prisma schema | `api/prisma/schema.prisma` |
| i18n (assistant namespace) | `packages/translations/locales/{en,fr,de}/assistant.json` |
| Sidebar | `frontend/components/layout/Sidebar.tsx` |
| App routes | `frontend/App.tsx` |

---

## Swiss Tailwind colour tokens

| Token | Hex | Use |
|---|---|---|
| `swiss-mint` | `#48CFAE` | Send button, CTA accent |
| `swiss-teal` | `#227C9D` | User bubbles (floating panel), active pill |
| `swiss-deep-teal` | `#1A5F7A` | User bubbles (workspace), hero card |
| `swiss-charcoal` | `#2B2B2B` | Body text |
| `page-bg` | `#F9FAFB` | Page background |

---

## Run commands

```bash
# From monorepo root
pnpm type-check          # TypeScript across all workspaces
pnpm lint                # ESLint
pnpm test                # All unit tests
pnpm i18n:check          # Key parity check across locales
pnpm dev                 # Start all services (requires .env)

# API only
cd api && pnpm type-check
cd api && pnpm test -- --testPathPattern=assistant
```
