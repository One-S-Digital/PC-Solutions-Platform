# Agent Handover Note — AI Assistant Workspace

**Last updated:** 2026-06-15  
**Branch:** `claude/gifted-hawking-c3u1hk`

---

## Current status: SHIPPED — no feature flags

The AI assistant workspace is fully built and **always on** in both SPAs.
Feature flags for the assistant were removed on 2026-06-15 and the assistant
is now a permanent part of the product build.

**Feature flags removed:**
- `v2_assistant_dashboard` — no longer exists in frontend code (Foundation routing is unconditional)
- `v2_admin_assistant` — no longer exists in admin code (admin routing is unconditional)
- `ai_assistant_enabled` — still exists in the backend as a master kill switch but the frontend no longer checks it for routing/UI gating

If you ever need to disable the assistant UI without a deploy, you can flip
`ai_assistant_enabled` to `false` in the database; the API calls will fail
gracefully and the workspace shows an error banner. But there is no longer
a frontend feature flag to hide the UI.

---

## What is built

### Foundation SPA (`/frontend`)

| Thing | Where |
|---|---|
| Workspace page | `frontend/pages/foundation/AssistantWorkspacePage.tsx` |
| Route | `frontend/App.tsx` — `/foundation/assistant`, always registered |
| Landing redirect | `frontend/App.tsx:RoleBasedDashboardRedirect` — FOUNDATION always lands on `/foundation/assistant` |
| Workspace components | `frontend/components/assistant-workspace/` |
| Shared chat hook | `frontend/components/assistant/useAssistantChat.ts` |
| Shared thread renderer | `frontend/components/assistant/ChatMessageList.tsx` |
| API service functions | `frontend/services/assistantService.ts` |
| Sidebar conversation list | `frontend/components/assistant-workspace/ConversationsList.tsx` |
| Feature flags hook (still present, not used for assistant) | `frontend/hooks/useFeatureFlags.ts` |

**Hybrid top bar (Navbar.tsx):**  
- Foundation users always see the `Assistant | Dashboard` pill toggle left of the language selector.  
- While on `/foundation/assistant`, the search field is replaced with the time-of-day greeting + date + org name, and the "Assistant active" pill appears.

### Admin SPA (`/admin`)

| Thing | Where |
|---|---|
| Workspace page | `admin/src/pages/AssistantWorkspacePage.tsx` |
| Route | `admin/src/App.tsx` — `/assistant`, always registered, no flag gate |
| Landing redirect | `admin/src/App.tsx:IndexRedirect` — always sends to `/assistant` |
| Workspace components | `admin/src/components/assistant-workspace/` |
| Sidebar conversation list | `admin/src/components/assistant-workspace/ConversationsList.tsx` |

**Hybrid top bar (Header.tsx):**  
- Always shows the `Assistant | Dashboard` pill toggle left of the language selector.  
- While on `/assistant`, left side shows time-of-day greeting + date, and the "Assistant active" pill appears.

### Design system (both SPAs)

- **Input field:** Rounded pill (`rounded-3xl`), white background, circular emerald-600 send button with `ArrowRightIcon`.
- **Toggle:** Rounded pill with `SparklesIcon` (Assistant) and `HomeIcon` (Dashboard).
- **Briefing hero card:** `bg-emerald-800` (dark green), white text, items + CTA.
- **User message bubbles:** `bg-emerald-700 text-white`.
- **Quick action chips:** Emerald icons, emerald hover/focus states.
- **"Assistant active" pill:** `bg-emerald-50 text-emerald-700` with emerald dot.

### Backend (`/api`)

| Thing | Where |
|---|---|
| Chat endpoint (SSE) | `api/src/assistant/assistant.controller.ts` — `POST /assistant/chat` |
| Briefing endpoint | `api/src/assistant/assistant.controller.ts` — `GET /assistant/briefing` |
| Briefing service | `api/src/assistant/briefing.service.ts` |
| Conversation CRUD | `api/src/assistant/assistant.controller.ts` — `GET/PATCH /assistant/conversations` |
| Feature flag endpoint | `api/src/subscription-management/feature-flags.controller.ts` — `GET /feature-flags/me` |
| Prisma schema | `api/prisma/schema.prisma` — `AIConversation`, `AIConversationKind` |
| Render build seed | `api/scripts/seed-once.js` — upserts `ai_assistant_enabled`, `v2_assistant_dashboard`, `v2_admin_assistant` to active=true on every deploy |

---

## Architectural rules (do not break)

1. **Sidebar nav is unchanged** — `ConversationsList` is _additive_, appended after the main nav in both `Sidebar.tsx` files.
2. **Float widget is suppressed on the workspace routes** — `AssistantContainer.tsx` (frontend) returns null when `location.pathname.startsWith('/foundation/assistant')`; `AdminLayout.tsx` (admin) suppresses it on `/assistant`.
3. **Shared chat engine** — Both the workspace page and the floating panel use `useAssistantChat` + `ChatMessageList`. Never duplicate streaming logic.
4. **Parent / Supplier / Service Provider dashboards are untouched** — only FOUNDATION and ADMIN are remodeled.
5. **Draft approval flow** — `DraftApprovalCard` handles `draft_lead_reply` tool calls from the assistant. It renders inline in the workspace, not in a modal.

---

## Pending / known gaps

- `packages/assistant-ui` extraction (ADMIN_ASSISTANT_WORKSPACE_PLAN §2.1) is still pending — admin and frontend share the same component code but it is copy-pasted, not a shared package. Fixes to streaming/chat must be applied to both SPAs.
- Admin `draft_announcement` / `send_announcement` tools (plan §3.2) are deferred — the assistant deep-links to `/mailing` instead.
- The `useFeatureFlags` hook and the `GET /feature-flags/me` API endpoint remain in place for other feature flags used elsewhere in the product. They are not used for assistant routing anymore.
- `api/scripts/seed-once.js` still upserts the three assistant flags to `active=true` on every Render deploy. This is harmless (idempotent) but the records can be removed from the database if desired — the UI no longer reads them.
