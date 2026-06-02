# ProCrèche AI Assistant — V2 Redesign Plan

**Status:** Design approved — supersedes MVP tool catalog and phasing in `AI_ASSISTANT_MASTER_PLAN.md`
**Created:** 2026-06-02
**Replaces sections:** Master Plan §2.2, §4, §5, §6 (post-MVP roadmap P5, P11, P12 pulled forward)
**Does not replace:** Layer 1 architecture, database models, translation conventions, conventions §9

---

## 0. Why v2?

The MVP assistant (M0–M2) was shipped and is functional. However, real-world use revealed three structural problems:

### Problem 1 — The search tool was broken
`search_internal_candidates` fires an async staffing request and returns only `{ staffingRequestId, status: "PENDING_PARSE" }`. The LLM receives no candidates — just a pending ID it cannot use. On any real query ("find me an EDE in Geneva"), the response was a vague apology with suggestions to navigate manually. This happens because:
- The nested `staffing-request-parser` LLM call inside `createRequest()` also hit the same OpenRouter `models[]` array limit (> 3 items), so parsing silently failed
- Even when parsing works, matching is async — the tool returns before results exist
- There is zero "no results found" handling — the LLM improvises unhelpful responses

**Fix shipped (PR #659):** `models.slice(0, 3)` in `openrouter.adapter.ts` fixes both LLM call failures. The sync parse path now works again.

### Problem 2 — The assistant can't actually do anything
Every write action opens a modal and stops. Users still have to fill in forms themselves. With 150+ write-actions across 13 modules, the assistant exposes 13 tools — almost all `get_my_*` read-only lookups. No job is posted, no message sent, no order placed by the assistant on the user's behalf.

### Problem 3 — No escalation path
When search finds nothing, or a capability doesn't exist, the assistant has nowhere to go. There is no "contact the admin team about this" path, even though the `SupportService` and `MessagingService` are fully built and ready to use.

---

## 1. Target principle

> A user can accomplish anything they can do by hand on the platform, just by typing in the chat.

Every platform capability maps to an assistant tool. Write actions always show a confirmation card before executing. Every search handles zero results with concrete next-step suggestions. The assistant never dead-ends.

---

## 2. What changes from v1

| Area | V1 (current) | V2 (this plan) |
|---|---|---|
| **Roles served** | FOUNDATION + ADMIN only | All 7 roles — each gets a role-appropriate tool set |
| **Tool count** | 13 tools (6 in MVP, 7 added in AI build) | ~45 tools across all roles |
| **Write actions** | 0 — every action opens a modal and stops | L3 execute tools post result after user confirms |
| **L3 meaning** | Admin-approval for bulk/external sends | User confirmation required for any mutating action |
| **Search result** | Returns a request ID (pending) | Returns ranked candidates/products/results immediately |
| **No results** | LLM improvises a vague apology | Every search returns `suggestions[]` on `total: 0`; LLM is prompted to present them |
| **Escalation** | None | `contact_admin` tool always available as final fallback |
| **Tool executor** | Single 500-line `switch` in orchestrator | Per-domain handler classes in `api/src/assistant/tools/handlers/` |
| **Step budget** | `MAX_TOOL_STEPS = 3` | Raised to 5 |

---

## 3. Revised action level definitions

The meaning of L3 changes in v2. The old "admin approval required" concept is now handled by a future approval-inbox feature (post-MVP), not by withholding execution.

| Level | Meaning | Approval | Examples |
|---|---|---|---|
| **L1 — Answer** | Read data, fetch info, answer questions | None — immediate | `search_candidates`, `get_my_leads`, `search_help_docs` |
| **L2 — Draft** | Compose content for user review before sending | User reviews preview card | `draft_job_post`, `draft_parent_reply` |
| **L3 — Execute** | Mutate platform state | User confirms via confirmation card | `post_job`, `send_message`, `place_order`, `contact_admin` |

> **Note on bulk/external actions** (e.g. "send to 40 candidates", "post to JobUp"): these require a separate admin-approval inbox, planned as part of External Routing (P1 in master plan). They will be tagged with a new `requiresAdminApproval: true` flag on the tool definition, separate from the L1/L2/L3 classification.

---

## 4. Architecture changes

### 4.1 Per-domain tool handler classes

Replace the single `switch` in `OrchestratorService.executeTool()` with a `ToolHandlerRegistry` that maps tool names to typed handler classes.

```
api/src/assistant/tools/
  tool-handler.interface.ts      ← ToolHandler<TArgs, TResult> contract
  tool-handler.registry.ts       ← maps name → handler instance
  handlers/
    search.handler.ts            ← all search/lookup tools
    recruitment.handler.ts       ← jobs, applications, shortlisting
    staffing.handler.ts          ← candidate matching, replacement requests
    marketplace.handler.ts       ← products, services, orders, inquiries
    leads.handler.ts             ← parent leads, foundation responses
    messaging.handler.ts         ← send_message
    support.handler.ts           ← contact_admin
    profile.handler.ts           ← get_my_profile, profile updates
```

**Interface contract:**
```typescript
interface ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> {
  execute(args: TArgs, principal: AssistantPrincipalContext, locale: string): Promise<ToolResult<TResult>>;
}
```

Each handler injects only the services it needs (via constructor injection). Adding a new tool means adding a handler — no editing of a 500-line switch.

### 4.2 Standardised tool result envelope

Every tool must return this shape:

```typescript
interface ToolResult<T = unknown> {
  data: T;
  total: number;           // 0 signals the no-results path to the LLM
  hasMore?: boolean;
  suggestions?: {          // Populated when total === 0
    label: string;
    actionType: 'broaden_search' | 'post_job' | 'contact_admin' | 'navigate';
    payload?: Record<string, unknown>;  // Pre-fill data for the suggested action
  }[];
}
```

The orchestrator prompt gains one new rule:
> *"When a tool returns `total: 0`, present each item in `suggestions[]` as a concrete offer the user can take. Always include `contact_admin` as the last option. Never say 'please try again later.'"*

### 4.3 `search_candidates_ai` — the critical fix

This replaces the broken `search_internal_candidates`. The key change: matching runs **synchronously** and the tool returns actual ranked candidates in the same response.

```
Request flow:
1. staffingService.createRequest()     → StaffingRequest created (PENDING_PARSE)
2. staffingService.parseRequest(id)    → sync for ≤800 chars (already the fast path)
3. matcher.match(id)                   → run inline (not queued) for assistant-initiated requests
4. staffingService.getMatches(id)      → fetch ranked MatchResults
5. Return: { candidates[], total, parsedRole, parsedCanton, staffingRequestId, suggestions }
```

When `total === 0`, `parsedRole` and `parsedCanton` (extracted by the parser) are passed into the `post_job` suggestion's `payload` so the job post is pre-filled without asking the user to repeat themselves.

### 4.4 Step budget

`MAX_TOOL_STEPS` raised from 3 to 5. This allows the multi-step flow: search → no results → suggest `post_job` → user confirms → post job → confirm success.

---

## 5. Complete target tool catalog

### Universal (all 7 roles)

| Tool | Level | What it does | Backed by |
|---|---|---|---|
| `search_help_docs` | L1 | Search platform documentation | `KnowledgeEmbeddingService` |
| `get_my_profile` | L1 | Fetch own profile, role, org | `PrismaService` |
| `navigate_to` | L1 | Navigate to a platform page | Frontend event only |
| `contact_admin` | **L3 NEW** | File a support ticket describing what the user needs | `SupportService.createTicket()` |
| `send_message` | **L3 NEW** | Send a direct message to another platform user | `MessagingService.createDirectMessage()` |

### Admin / Super Admin

| Tool | Level | What it does | Backed by |
|---|---|---|---|
| `find_foundation` | L1 | Look up foundation orgs by name → returns ID | `PrismaService` |
| `find_user` | **L1 NEW** | Search users by name/email | `UsersService.findAll()` |
| `get_platform_stats` | **L1 NEW** | Active users, open leads, pending applications count | `PrismaService` aggregates |

### Foundation + Admin

| Tool | Level | What it does | Backed by |
|---|---|---|---|
| `search_candidates` | **L1 NEW** | Direct pool search by role/canton/skills — instant, no AI parsing | `RecruitmentService.findAllCandidates()` |
| `search_candidates_ai` | **L2 NEW** | AI-parsed request → sync match → ranked candidates with scores | `StaffingService` (parse + match + fetch) |
| `view_match_results` | **L1 NEW** | Fetch results for an existing staffing request by ID | `StaffingService.getMatches()` |
| `explain_match` | L1 | Human-readable explanation for a specific match result | `PrismaService` |
| `shortlist_candidate` | **L3 NEW** | Add a candidate to the foundation shortlist | `RecruitmentService.saveCandidate()` |
| `post_job` | **L3 NEW** | Create and publish a job listing | `RecruitmentService.createJobListing()` |
| `update_application_status` | **L3 NEW** | Move application to SHORTLISTED / INTERVIEW / OFFER / HIRED / REJECTED | `RecruitmentService.updateJobApplication()` |
| `create_replacement_request` | **L3 NEW** | Create a replacement request | `ReplacementsService.createRequest()` |
| `get_my_leads` | L1 | Fetch parent leads for the foundation | `PrismaService` |
| `respond_to_lead` | **L3 NEW** | Send a foundation response to a parent lead | `LeadsService.respondToLead()` |
| `search_products` | **L1 NEW** | Search marketplace products by name/category | `MarketplaceService.findAllProducts()` |
| `search_services` | **L1 NEW** | Search services by name/category/canton | `MarketplaceService.findAllServices()` |
| `place_order` | **L3 NEW** | Place a product order | `MarketplaceService.createOrder()` |
| `request_service` | **L3 NEW** | Request a service from a provider | `MarketplaceService.createServiceRequest()` |
| `send_supplier_inquiry` | **L3 NEW** | Send a formal inquiry to a supplier | `InquiryService.createInquiry()` (`api/src/marketplace/inquiry.service.ts`) |
| `get_my_orders` | L1 | Fetch orders for the foundation | `PrismaService` |
| `draft_parent_reply` | L2 | Pre-fill parent reply modal | Modal event |

*`search_internal_candidates` is retired and replaced by `search_candidates` (direct) and `search_candidates_ai` (AI-matched).*

### Educator

| Tool | Level | What it does | Backed by |
|---|---|---|---|
| `search_jobs` | **L1 NEW** | Search available job listings by role/location | `RecruitmentService.findAllJobListings()` |
| `apply_to_job` | **L3 NEW** | Submit an application to a job listing | `RecruitmentService.createApplication()` |
| `get_my_applications` | L1 | Fetch own job applications and statuses | `PrismaService` |

### Parent

| Tool | Level | What it does | Backed by |
|---|---|---|---|
| `search_foundations` | **L1 NEW** | Search childcare foundations by location/type | `PrismaService` |
| `submit_enquiry` | **L3 NEW** | Submit a childcare enquiry to a foundation | `LeadsService.createParentLead()` |
| `get_my_enquiries` | L1 | Fetch own submitted enquiries | `PrismaService` |

### Product Supplier / Service Provider

| Tool | Level | What it does | Backed by |
|---|---|---|---|
| `get_my_listings` | L1 | Fetch product or service listings | `PrismaService` |
| `get_my_orders` | L1 | Fetch incoming orders | `PrismaService` |
| `get_my_service_requests` | L1 | Fetch incoming service requests | `PrismaService` |

---

## 6. No-results handling — full specification

Every search tool that returns `total: 0` must populate `suggestions[]`. The LLM prompt instructs: *present suggestions as concrete offers, always end with `contact_admin`.*

| Tool | Suggestions when `total: 0` |
|---|---|
| `search_candidates` | 1. Try `search_candidates_ai` for AI-ranked results · 2. Broaden to all cantons · 3. `post_job` · 4. `contact_admin` |
| `search_candidates_ai` | 1. Remove date/hours constraints · 2. `post_job` (pre-filled with `parsedRole` + `parsedCanton`) · 3. `contact_admin` |
| `search_jobs` (educator) | 1. Broaden location · 2. `contact_admin` to be notified when matching jobs appear |
| `search_products` | 1. Try a broader category · 2. `send_supplier_inquiry` to request a custom quote · 3. `contact_admin` |
| `search_services` | 1. Try nearby canton · 2. `contact_admin` |
| `search_foundations` (parent) | 1. Broaden canton/city · 2. `contact_admin` |

**`contact_admin` tool pre-fills automatically** using context from the failed search: the subject and body of the ticket describe exactly what the user searched for, so they don't need to repeat themselves.

---

## 7. Frontend UI additions needed

### 7.1 New result card components

**`CandidateResultCard`** — used when `search_candidates` or `search_candidates_ai` returns results:
```
┌─────────────────────────────────────────┐
│ 🧑 Sophie Martin              Score 87  │
│    EDE · Genève · FR / DE               │
│    Skills: 0–3 ans, Montessori          │
│ [Shortlist]  [View Profile]             │
└─────────────────────────────────────────┘
```

**`JobListingCard`** — used when `search_jobs` returns results (educator view):
```
┌─────────────────────────────────────────┐
│ 📋 EDE 80% — Les Petits Pas            │
│    Genève · CDI · From 15 Jun 2026      │
│ [Apply]  [View Details]                 │
└─────────────────────────────────────────┘
```

**`ProductCard` / `ServiceCard`** — used by `search_products` / `search_services`:
```
┌─────────────────────────────────────────┐
│ 📦 Kit pédagogique Montessori           │
│    EduMat SA · CHF 89.00                │
│ [Order]  [Inquire]                      │
└─────────────────────────────────────────┘
```

**`NoResultsCard`** — replaces the vague apology:
```
┌─────────────────────────────────────────┐
│ 🔍 No educators found for EDE / Genève  │
│ Suggestions:                            │
│  → Broaden search to all of Switzerland │
│  → Post a job to attract candidates     │
│  → Contact admin for manual sourcing    │
└─────────────────────────────────────────┘
```

### 7.2 Enhanced `ToolCallCard` (L3 action preview)

Currently shows only tool name and raw args. In v2, each L3 action type gets a rich preview card:

| Action | Preview shows |
|---|---|
| `post_job` | Full job draft: title, contract type, location, description |
| `send_message` | Recipient name, full message text |
| `place_order` | Product name, quantity, total price |
| `contact_admin` | Ticket subject and body text |
| `apply_to_job` | Job title, foundation name, auto-generated cover note |
| `shortlist_candidate` | Candidate name, role, match score |

Each card retains the existing **Confirm / Cancel** buttons.

### 7.3 Translation additions required

New keys needed in `packages/translations/locales/{en,fr,de}/`:

| Namespace | Keys to add | When |
|---|---|---|
| `assistant.json` | Result card strings, no-results messages, tool action labels, confirmation preview strings | v2 Phase 1 |
| `aiTools.json` | Per-tool feedback strings (e.g. `"Showing {{count}} candidates"`, `"No educators found"`) | v2 Phase 1 |

---

## 8. Prompt changes

Three additions to `api/src/ai/agents/assistant-orchestrator/prompt.v1.ts`:

### 8.1 Updated TOOL SELECTION RULES section

```
SEARCH RULES:
- Find candidates (fast, direct): search_candidates
- Find candidates (AI-ranked with scores): search_candidates_ai
- Find products: search_products
- Find services: search_services
- Find jobs (educator only): search_jobs
- Find foundations (parent only): search_foundations

NO-RESULTS RULE:
- When any search returns total: 0, present each item in suggestions[] as a
  concrete option the user can take. Always offer contact_admin last.
  Never say "the tool encountered an error" or "please try again later".

WRITE ACTIONS:
- All L3 tools show a full preview card before executing.
- After a user confirms an L3 action, report the outcome (what was created/
  sent/posted), not what was attempted.
- When you are about to run an L3 tool, first state what you are about to do.

ESCALATION RULE:
- If a user expresses frustration, has a complaint, or says "I need to speak
  to someone / contact admin / report a problem" — use contact_admin.
  Pre-fill the subject and body using context from the conversation.
```

### 8.2 Removed rules

Remove the hardcoded rule that says `"Find candidates / staffing request → use search_internal_candidates"` — this tool no longer exists.

---

## 9. Build phasing

### Phase 0 — Foundation (prerequisite)
- Introduce `ToolHandlerRegistry` and per-domain handler classes
- Standardise all existing tools to return `{ data, total, suggestions }`
- Add `contact_admin` tool (wired to `SupportService.createTicket()`)
- Update orchestrator prompt with no-results rule and escalation rule
- Raise `MAX_TOOL_STEPS` to 5
- Remove `search_internal_candidates` entry from registry

### Phase 1 — Search done right (highest user-facing impact)
- Implement `search_candidates_ai` with synchronous matching + ranked results
- Implement `search_candidates` (direct pool, no AI parse)
- Implement `search_products`, `search_services`
- Implement `search_jobs` (educator) and `search_foundations` (parent)
- Populate `suggestions[]` on `total: 0` for every search tool
- Frontend: `CandidateResultCard`, `JobListingCard`, `ProductCard`, `NoResultsCard`
- Open assistant panel to EDUCATOR and PARENT roles (restricted tool sets)

### Phase 2 — L3 write actions (makes assistant fully autonomous)
- `post_job`, `apply_to_job`, `shortlist_candidate`, `update_application_status`
- `respond_to_lead`
- `send_message`
- `place_order`, `request_service`, `send_supplier_inquiry`
- `create_replacement_request`
- `submit_enquiry` (parent)
- Enhanced `ToolCallCard` previews per action type

### Phase 3 — Completeness
- `find_user`, `get_platform_stats` (admin)
- `view_match_results` (view results for a specific request ID)
- Per-role welcome suggestion chips updated to reflect new capabilities
- `send_message` tool: allow messaging foundation / admin from educator and parent roles

### Phase 4 — Reliability upgrade (native function calling)
- Replace JSON-in-prompt with OpenAI function-calling format in `OpenRouterAdapter`
- This eliminates the "LLM generates malformed JSON" failure class entirely
- Tool definitions become typed schemas passed as `tools[]` parameter, not injected prose
- Streaming tool execution status ("Searching candidates…", "Matching in progress…")

---

## 10. Comparison with v1 master plan — change log

| Section in master plan | v1 says | v2 change |
|---|---|---|
| §2.2 Action levels | L3 = admin approval for bulk/external actions | L3 = user confirmation required for any write action. Admin approval for bulk/external is a separate post-MVP feature |
| §4.1 MVP scope | FOUNDATION + ADMIN only; L3 out of scope; 7 tools | All roles in Phase 1–2; L3 write actions are core; ~45 tools |
| §4.2 Out of scope | "L3 execute-level tools" explicitly excluded | L3 included from Phase 2 onward |
| §5 Build milestones | M0–M3 (staffing UI, orchestrator, frontend, hardening) | Replaced by Phase 0–4 (foundation, search, execute, completeness, reliability) |
| §6 Post-MVP P5 | "Supplier Marketplace" (search_suppliers, create_supplier_request) | Pulled into Phase 1–2 as core capability |
| §6 Post-MVP P11 | "Educator-facing assistant" — deferred | Pulled into Phase 1 |
| §6 Post-MVP P12 | "Parent-facing assistant" — deferred | Pulled into Phase 1 |
| Tool: `search_internal_candidates` | Core MVP tool | Retired; replaced by `search_candidates` + `search_candidates_ai` |
| No-results handling | Not addressed | Explicit requirement in every search tool + prompt rule |
| Escalation path | Not addressed | `contact_admin` tool (universal, always available) |
| Tool executor | Single switch in `orchestrator.service.ts` | Per-domain handler classes |

---

## 11. What does NOT change

- Layer 1 foundation (`api/src/ai/` — all of it stays)
- Database models (all `AI*` Prisma tables, `StaffingRequest`, `MatchResult`, etc.)
- Agent registry pattern and LLM gateway contract (`LlmClient.run()`)
- Translation conventions (all four surfaces: UI strings, prompts, LLM output, backend messages)
- L1 read tools (they still work and stay as-is)
- SSE streaming protocol
- Circuit breaker, budget service, audit log, result cache
- `MAX_TOOL_STEPS = 5` is a runtime constant change, no schema migration needed
- All conventions in master plan §9

---

## 12. Files to read before implementing any v2 work

```
docs/AI_ASSISTANT_REDESIGN_V2.md          ← this file
docs/AI_ASSISTANT_MASTER_PLAN.md          ← updated to reflect v2
docs/AI_MVP_HANDOVER.md                   ← what was actually built (reference)
api/src/assistant/tools/tool-registry.ts  ← current tool definitions (to be extended)
api/src/assistant/orchestrator.service.ts ← current executor (to be refactored)
api/src/staffing/staffing.service.ts      ← sync parse/match path for search_candidates_ai
api/src/staffing/hybrid-matcher.service.ts← scoring logic
api/src/recruitment/recruitment.service.ts← findAllCandidates() for search_candidates
api/src/marketplace/marketplace.service.ts← findAllProducts() / findAllServices()
api/src/support/support.service.ts        ← createTicket() for contact_admin
api/src/messaging/messaging.service.ts    ← createDirectMessage() for send_message
api/src/ai/providers/openrouter.adapter.ts← models.slice(0,3) fix (PR #659)
```
