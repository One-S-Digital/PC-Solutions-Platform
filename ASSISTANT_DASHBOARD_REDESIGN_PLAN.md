# Assistant-First Foundation Dashboard — Redesign Plan

**Goal:** Remodel the Foundation (daycare) dashboard into a chat-oriented AI assistant experience, per the approved mockup: a persistent conversation workspace as the default landing view, with a Morning Briefing, conversation history in the sidebar, approval-gated drafts inline in the chat, and a one-click toggle back to the classic dashboard.

**Scope:** Foundation role only. Parent / Supplier / Service Provider dashboards untouched (per CLAUDE.md). Admin untouched.

**Visual language:** Keep the existing Swiss palette and component style — `swiss-mint` (#48CFAE), `swiss-teal` (#227C9D), `swiss-charcoal`, `page-bg` (#F9FAFB), Nunito, `rounded-card` / `shadow-soft` (see `frontend/tailwind.config.js:11-18`). The mockup's deep-teal hero/bubbles map to a new `swiss-deep-teal` token (one addition, no replacements).

---

## 1. What already exists (build on, don't rebuild)

| Capability | Where | Reuse as |
|---|---|---|
| Chat UI: streaming, markdown, tool cards, suggestion chips | `frontend/components/assistant/AssistantPanel.tsx` | Core of the new full-page chat thread |
| SSE client: token / tool_call / tool_result / next_steps / done events | `frontend/services/assistantService.ts` | Unchanged transport layer |
| Claude orchestrator with L1 (answer) / L2 (draft) / L3 (execute w/ approval) tools | `api/src/assistant/orchestrator.service.ts`, `api/src/assistant/assistant.service.ts` | Same engine; add tools + briefing |
| Conversation persistence | `AIConversation` / `AIMessage` Prisma models | Extend with titles, status, archiving |
| Approval-gated action cards ("PENDING APPROVAL") | `ActionPreviewCard` + L3 flow in `AssistantPanel.tsx:121-191` | Inline draft cards in the thread |
| Notifications table + feed (remodel Phase 4) | `Notification` model, `api/src/notifications/` | Bell badge + briefing inputs |
| Collapsible sidebar nav, role filtering | `frontend/components/layout/Sidebar.tsx:44-112` | Restyled compact nav + conversations list |
| Feature flags (`FeatureFlag` table, GLOBAL/ORG/USER scope) | Prisma + STAFFING_REMODEL_PLAN §8 | New flag `v2_assistant_dashboard` |
| Canton policy data | `api/src/policy-crawler/`, State Policies pages | "Vaud directive" briefing item + tool |
| Domain features: leads, recruitment, replacements, marketplace/orders, HR docs, messaging, e-learning | see CLAUDE.md key files | Targets for new assistant tools |

**Gaps to build:** conversation list/rename/archive API, Morning Briefing generator, full-page assistant layout, Assistant⇄Dashboard toggle, quick-action chips, scheduled-draft workflow (e.g. "Reply to Berger family — Draft approved · sent 09:14"), new domain tools (lead replies, newsletters, onboarding packs, supply orders).

---

## 2. Screenshot → component map

```
┌────────────┬──────────────────────────────────────────────────┐
│ Sidebar    │ AssistantHeader (greeting · date/org · toggle ·  │
│            │   "Assistant active" pill · bell · avatar)       │
│ • Brand    ├──────────────────────────────────────────────────┤
│ • Existing nav (unchanged)       MorningBriefingCard          │
│ • ConversationsList (new)        ChatThread                   │
│   (Today/Yesterday/Last week)      ├ MessageBubble (user)     │
│ • UserFooter                       ├ AssistantMessage         │
│            │                       └ DraftApprovalCard        │
│            │                     QuickActionChips             │
│            │                     Composer (+ attach, send)    │
│            │                     TrustFooter (disclaimer)     │
└────────────┴──────────────────────────────────────────────────┘
```

New frontend module: `frontend/pages/foundation/assistant/` + `frontend/components/assistant-workspace/`:

| Component | Notes |
|---|---|
| `AssistantWorkspacePage.tsx` | New default route for Foundation; owns layout + active conversation state |
| `WorkspaceSidebar.tsx` | **The existing Foundation sidebar nav is kept unchanged** (same items, order, and collapsible groups as `Sidebar.tsx` today — strategy-locked per STAFFING_REMODEL_PLAN §2). The only additions are AI sections rendered beneath the nav: a `CONVERSATIONS` header with "+ New" button and the grouped `ConversationsList`. Implemented by extending `Sidebar.tsx` (or composing it) rather than replacing it |
| `ConversationsList.tsx` | Grouped by Today / Yesterday / Last week; icon per conversation kind (chat, draft, briefing, order); status sublabel ("Draft approved · sent 09:14"); "+ New" button |
| `AssistantHeader.tsx` | Greeting ("Good morning, {firstName} 👋"), date + org name, center `Assistant | Dashboard` segmented toggle, "Assistant active" status pill, notification bell (Notification table count), Clerk avatar |
| `MorningBriefingCard.tsx` | Deep-teal hero card: headline ("N things need your attention today"), summary sentence, CTA buttons that send pre-built prompts into the thread ("Handle everything with me", per-item CTAs) |
| `ChatThread.tsx` | Refactored out of `AssistantPanel.tsx` (extract message list + streaming rendering so the floating widget and full page share one implementation) |
| `DraftApprovalCard.tsx` | Evolution of `ActionPreviewCard`: title row ("Reply to Léa Dubois — daughter, 20 months, starting August"), PENDING APPROVAL / APPROVED / SENT badge, expand-to-edit, Approve & send / Edit / Discard |
| `QuickActionChips.tsx` | Configurable chips above composer (Prepare onboarding, Vaud directive, Parent newsletter, Order supplies) → inject prompt templates |
| `Composer.tsx` | Input ("Ask me anything — I'll handle the rest…"), attachment button (reuse `authenticatedUpload`), mint send button |
| `TrustFooter.tsx` | Static i18n string: "The assistant takes no external action without your approval · Responses grounded in your data and verified cantonal directives" |

Styling: all from existing tokens; additions limited to `swiss-deep-teal` (hero card / user bubble background) and an `amber` badge style for PENDING APPROVAL (Tailwind amber, already available).

### 2.1 Chat interaction patterns (from detailed mockups)

Assistant turns are not plain text — they are a narrative sentence followed by zero or more **rich result cards**, all rendered inside the assistant's white message container:

- **DraftApprovalCard, expanded state** — header row (icon + "Reply to Léa Dubois — daughter, 20 months, starting August" + PENDING APPROVAL badge), quoted draft preview (left mint border, light background, key facts bolded e.g. "**Thursday at 10am**"), action row: `Approve & send` (primary mint), `Edit` (outline), `Discard` (coral-tinted ghost).
- **DraftApprovalCard, collapsed state** — when a turn produces multiple drafts, only the first renders expanded; subsequent ones show header + badge + `Approve & send` / `View draft` (expands in place). Keeps multi-draft turns scannable.
- **CandidateShortlistCard** — narrative ("…received **7 applications**… shortlisted the 3 best matches against your criteria"), then one row per candidate: initials avatar (mint tint), name, meta line ("Certified · 4 yrs exp · Lausanne · avail. Aug 1"), match-score pill ("94%") — sourced directly from the remodel's scoring algorithm (§5.5 of STAFFING_REMODEL_PLAN, max 100 pts). Footer: bulk action `Invite all 3 to interview` (L3, one approval covers the batch) + `View all 7 applications` (deep-link to `/staffing/applications` filtered to the posting).
- **Source attribution line** — every assistant turn ends with a muted timestamp + provenance: "08:42 · sources: Parent Leads, Calendar". Backend: orchestrator records which tool domains were consulted during the turn and emits them in the `done` SSE event; frontend renders the list. This is the "grounded in your data" claim made visible.
- **Cross-domain awareness in drafts** — the lead-reply draft references calendar conflicts ("avoiding your 2pm appointment with Clara Richard") and capacity ("matches your 8 available spots"): `draft_lead_reply` must consult availability/appointments and org capacity, not just the lead record.
- **Card → state round-trip** — approving a card updates it in place (PENDING APPROVAL → SENT with timestamp) via the draft-status SSE events (§3.4); the same status surfaces in the sidebar conversation sublabel.

Implementation note: extend the existing `ResultCards`/`ActionPreviewCard` components rather than inventing a new card system — the renderer should switch on a `cardType` field in the `tool_call`/`tool_result` payloads (`draft_approval`, `candidate_shortlist`, …) so new card types are additive.

---

## 3. Backend work

### 3.1 Conversations API (extend `api/src/assistant/`)
- Prisma (additive only): `AIConversation` + `title String?`, `kind ConversationKind @default(CHAT)` (CHAT | DRAFT | BRIEFING | ORDER), `status String?` (free-text sublabel), `archivedAt DateTime?`, `lastActivityAt DateTime`.
- Endpoints: `GET /assistant/conversations` (grouped/paginated), `PATCH /assistant/conversations/:id` (rename/archive), auto-title generation after first exchange (existing Haiku validation model is the cheap candidate for this).

### 3.2 Morning Briefing
- `BriefingService` in the assistant module. `GET /assistant/briefing` returns `{ headline, summary, items: [{ type, title, cta, prompt }] }`.
- Composed from existing queries — no new domain logic:
  - new parent leads since last login matched against capacity (`api/src/leads/`),
  - applications waiting > N days (`api/src/recruitment/`),
  - replacement matches pending (`api/src/replacements/`),
  - new canton policy entries for the org's canton (`api/src/policy-crawler/`),
  - unread notifications/messages.
- Generated on demand with a short cache (e.g. regenerate at most hourly per org); summary sentence written by the LLM from the structured items, items themselves are deterministic. Each item carries a prompt string so its CTA button just submits to the normal chat pipeline.
- Persist as an `AIConversation` of kind `BRIEFING` ("Morning briefing — Jun 10") so it appears in history.

### 3.3 New / upgraded assistant tools (orchestrator registry)
| Tool | Level | Backed by |
|---|---|---|
| `list_parent_leads`, `draft_lead_reply` | L1 / L2 | leads module + messaging; draft proposes visit slots (read org availability; conflict-check appointments as in the mockup) |
| `send_lead_reply` | L3 (approval) | messaging/email-notification |
| `summarize_canton_update`, checklist | L1 | policy-crawler content |
| `draft_parent_newsletter` / `send_newsletter` | L2 / L3 | mailing (campaigns) module |
| `prepare_onboarding_pack` | L2/L3 | HR procedures + document templates |
| `draft_supply_order` / `submit_order` | L2 / L3 | marketplace/orders |
| `shortlist_candidates` (returns scored matches for CandidateShortlistCard), `invite_to_interview` (batch, one approval), `update_application_status` | L2 / L3 | recruitment + remodel scoring algorithm (uses new SHORTLISTED/INTERVIEW/OFFER/HIRED statuses) |
| existing `post_job` etc. | — | keep as-is |
- "Handle everything with me" = one prompt that walks briefing items sequentially, emitting one approval card per action — no new orchestration primitive needed, the agent loop already supports multi-tool turns.
- Keep the PII scrubber and JOB POSTING RULE behaviors intact for all new tools.

### 3.4 Draft lifecycle
- Extend the existing L3 confirm flow with a persisted draft state so the sidebar can show "Draft approved · sent 09:14": new `AssistantDraft` model (conversationId, toolCallId, payload JSON, status DRAFT|PENDING_APPROVAL|APPROVED|SENT|DISCARDED, sentAt) or reuse `ScheduledEmail` where the action is an email. Status changes push an SSE event so open threads update live.

---

## 4. Routing, flags, rollout

- **Flag:** `v2_assistant_dashboard` (FeatureFlag table, ORGANIZATION scope for pilot orgs → GLOBAL). Frontend needs a small `useFeatureFlag(key)` hook + `GET /feature-flags/me` endpoint (also unblocks the other v2_* flags, which currently have no frontend read).
- **Routes:** flag ON → `RoleBasedDashboardRedirect` (`frontend/App.tsx:162-187`) sends FOUNDATION to `/foundation/assistant`; the header toggle's **Dashboard** tab navigates to `/foundation/dashboard` (the existing Foundation dashboard, unchanged); **Assistant** tab returns to `/foundation/assistant`. Flag OFF → nothing changes, Foundation lands on `/foundation/dashboard` as today.
- **Floating widget:** suppress `AssistantContainer` on `/foundation/assistant` (it would duplicate the page); keep it everywhere else so the assistant follows the user onto classic pages.
- **i18n:** every new string in en/fr/de under the existing `assistant` namespace; run `pnpm i18n:check`.
- **Mobile:** sidebar collapses to a drawer (existing MainLayout pattern); briefing card stacks; chips scroll horizontally.

---

## 5. Phasing

**Phase A — Workspace shell (frontend-heavy, ~no schema)**
Extract `ChatThread` from `AssistantPanel`; build `AssistantWorkspacePage`, header w/ toggle, composer, trust footer, quick-action chips (prompt templates only); route + flag + redirect. *Exit: Foundation user lands on a full-page chat that works exactly like today's widget.*

**Phase B — Conversation history**
Schema additions (§3.1), conversations API, `ConversationsList` with grouping/auto-titles, "+ New". *Exit: sidebar matches mockup; conversations resume across sessions.*

**Phase C — Morning Briefing**
`BriefingService` + `MorningBriefingCard` + CTA-to-prompt wiring; bell wired to Notification count. *Exit: hero card shows real overnight items with working CTAs.*

**Phase D — Drafts & approval workflow**
`DraftApprovalCard`, draft persistence + status SSE, `draft_lead_reply`/`send_lead_reply` end-to-end (the Léa Dubois flow in the mockup). *Exit: "Reply to the new parent leads" produces editable pending-approval drafts that send on approval and show "sent 09:14" in history.*

**Phase E — Tool breadth**
Newsletter, onboarding pack, supply order, canton-update summary, shortlist tools (§3.3), each behind the same approval pattern. *Exit: all four quick-action chips fully functional.*

**Phase F — Polish & rollout**
fr/de translations, mobile QA, empty/error/offline states, telemetry (assistant_message_sent, draft_approved, briefing_cta_clicked), pilot org → global flag flip; decide default view per user (remember last toggle choice).

Each phase is independently shippable behind the flag; A–C carry no external-action risk.

---

## 6. Risks & guardrails

- **Trust boundary is the product:** nothing outward-facing (emails, orders, messages) ever sends without an explicit L3 approval click — this is already enforced in the orchestrator; new tools must register at the correct level. The trust footer reflects reality, keep it true.
- **Briefing cost/latency:** deterministic item queries + cached LLM summary; never block first paint on the LLM (render items, stream the summary in).
- **Don't fork the chat UI:** the floating widget and the workspace must share `ChatThread`, or every streaming fix lands twice.
- **Coordination with PR #626:** the staffing remodel's Phase 5 ("dashboard redesign around staffing KPIs") is superseded for Foundation by this plan — reconcile in STAFFING_REMODEL_PLAN.md before starting Phase C to avoid two competing dashboards.
- **Additive schema only**, consistent with the remodel's architecture rules; no changes to existing `AIMessage` rows.
