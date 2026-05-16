# AI Staffing Integration — Phased Build Plan

**Status:** Proposed
**Owner:** Platform Engineering
**Branch:** `claude/ai-integration-plan-JBbzG`
**Related docs:** `STAFFING_REMODEL_PLAN.md`, `IMPLEMENTATION_PHASES.md`, `REMODEL_NOTES.md`, `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`

---

## 1. Executive Summary

The AI staffing engine is a layered system, not a single feature. The right build order is **internal → reactivation → external**, mirroring the technical recommendation in the source plan. The platform already provides most of the substrate (Prisma/Postgres, BullMQ, Redis, R2, WebSockets, Notification table, ReplacementRequest tables, feature flags, fr/en/de translation, messaging gateway). The work is therefore **less about new infrastructure and more about three additions**: an AI orchestration layer, structured profile/geography upgrades, and an external-channel adapter framework.

This plan deliberately defers external job-board APIs to Phase 5. Building them earlier inverts the strategic value: external routing should feed the internal pool, not replace it.

**Cost stance.** The plan is engineered around cheap models — **Gemini Flash and DeepSeek** as defaults — without compromising defensibility. The cost discipline is structural, not a per-feature decision:

1. **Deterministic code does the heavy lifting** (SQL filters → rule-based scoring); the LLM only narrates the top 3–5 results.
2. **Templates replace LLM calls** for any repeated text (reactivation messages, status emails, screener acknowledgments).
3. **Persistent caching** keyed by content hash means parsed CVs, parsed requests, match explanations, and job-ad drafts are written to the model exactly once.
4. **An AI Gateway** at `api/src/ai/` enforces per-agent input-field allowlists, output-token ceilings, JSON-schema validation, and daily token budgets — and lets us escalate any single agent to a stronger model via one config line without touching callers.

The result: a Gemini-Flash-default architecture today, fully reversible to Gemini Pro / Claude / DeepSeek per agent tomorrow, with hard cost guardrails enforced in code.

---

## 2. What Already Exists (Keep & Extend)

Confirmed by codebase audit. Re-usable foundations:

| Capability | Where | Re-use strategy |
|---|---|---|
| Postgres + Prisma ORM | `api/prisma/schema.prisma` | **Keep as system of record.** Add `pgvector` extension. No separate vector DB. |
| Recruitment tables | `JobListing`, `JobApplication`, `ApplicationStatus` (PENDING…HIRED incl. SHORTLISTED/INTERVIEW/OFFER) | **Reuse.** No new "job" entity needed. |
| Replacement staffing tables | `ReplacementRequest`, `ReplacementMatch`, urgency/status enums | **Generalize.** Promote into a unified `StaffingRequest` model (see §4) — replacement becomes one `contractType` value. |
| Educator profile fields | `User.{availabilitySettings,candidatePoolVisible,availableForReplacement,cities[],jobRoles[],skills[],certifications[],region,cvUrl,cvAssetId,documents}` | **Keep, normalize, augment.** Most fields the AI plan asks for already exist in shape. |
| Notification table + types | `Notification`, `NotificationType` enum | **Reuse.** Wire the skeleton `notifications` module + WS gateway. |
| Background jobs | BullMQ + Redis registered in `app.module.ts`; translation queue working pattern | **Reuse.** All AI orchestration (parsing, embedding, reactivation, channel sync) runs as queues. No new infra. |
| File storage | Cloudflare R2 via `UPLOAD_MODE=r2`, `cvAssetId` on User and JobApplication | **Reuse for CVs.** Add parsing pipeline on top. |
| Email transport | SMTP → Mailgun → SendGrid priority chain; cron-driven `ScheduledEmail` table | **Reuse for AI-generated emails.** New seeded template keys; LLM produces body, not delivery. |
| WebSocket layer | `messaging.gateway.ts` + Socket.io | **Reuse for live notifications** (shortlist ready, candidate replied). |
| Feature flags | `FeatureFlag` model + service; flags `v2_*` already planned | **Reuse.** Add `ai_*` flags for staged rollout. |
| Multilingual (fr/en/de) | `packages/translations` + translation queue | **Reuse.** LLM outputs must respect locale; Swiss French is the primary. |
| Clerk auth + roles | `FOUNDATION`, `EDUCATOR`, `ADMIN`, `SUPER_ADMIN` | **Reuse.** External applicants get a Clerk-light flow (email-only + role `EDUCATOR`). |
| Audit & idempotency patterns | Webhook handler, EmailLog | **Pattern to follow** for new AI audit log. |

**Gaps the AI plan exposes (must build):**

1. No LLM integration anywhere in the codebase.
2. `findMatchingCandidates` is a stub — returns the whole pool, no scoring.
3. No CV parsing.
4. No vector search or semantic similarity.
5. Geography is string-only — no lat/lon, no commute-radius queries.
6. No `StaffingRequest` (free-form intake) entity — only structured `JobListing` and `ReplacementRequest`.
7. No external channel adapters; no candidate-source attribution.
8. No AI audit log.
9. Notifications module exists only as a skeleton; not wired into recruitment.

---

## 3. Architectural Decisions

These are the technical bets that shape every later phase. Each one favours long-term defensibility over near-term cost.

### 3.1 LLM provider, AI Gateway, and model routing

The platform never calls an LLM directly from a feature module. Every call goes through a single **AI Gateway** at `api/src/ai/` that owns model selection, cost limits, caching, structured-output validation, and audit logging. This is the architectural lever that lets us run on cheap models today and swap any of them tomorrow without touching callers.

**Default model tier — cheapest viable, by task:**

| Task | Default model | Escalation (rare, flagged) |
|---|---|---|
| Request parsing (extract structured criteria) | **Gemini 2.5 Flash** or **DeepSeek-V3** | none — these models are already over-spec for field extraction |
| CV parsing (text → structured JSON) | **Gemini 2.5 Flash** | Gemini Pro only when validation fails twice |
| Match explanation (40–80 words) | **Gemini 2.5 Flash** | none |
| Reactivation message (template-filled, see §3.10) | **template only**, no LLM call | Flash only when the daycare writes a custom tone request |
| Routing recommendation (3 bullets) | **Gemini 2.5 Flash** | none |
| Short job-ad blurb (≤180 words) | **Gemini 2.5 Flash** | none |
| Full job ad (300–500 words, Swiss FR/DE/EN) | **Gemini 2.5 Flash** | Gemini Pro / Claude Sonnet for German output until quality stabilises |
| Compliance-sensitive copy (consent text, rejection wording) | **template + legal review**, no LLM authorship | n/a — never LLM-authored |
| Weekly admin intelligence narrative | **Gemini 2.5 Flash** | Pro tier on demand |
| Embeddings | **Gemini text-embedding-004** or **Voyage-3-lite** | — |

DeepSeek and Gemini Flash are interchangeable for most of these — pick whichever has a stable Swiss-region availability and acceptable latency at integration time. Both should be wired through OpenAI-compatible adapters in the gateway. The gateway's job is to make this a configuration choice per agent, not a code change.

**Why this tiering survives the "cheapest model" mandate without breaking quality:**

- **Structured output, not free text.** Every agent returns JSON validated against a Zod schema. A cheap model that returns valid JSON is functionally identical to an expensive model that returns valid JSON. Quality risk lives in *prose*, which we minimise in §3.10.
- **Deterministic code does the matching, not the model.** Match scoring is rule-based (§3.3). The model only narrates the top 3–5 results.
- **Templates for repeated language.** Reactivation messages, status updates, screener acknowledgments are all template-driven — no LLM call at all.
- **Escalation is a feature flag, not a hardcoded path.** If Gemini Flash German output is weak in early pilots, flip one config value to route only that agent to Pro / Claude Sonnet. The schema is identical.

**Gateway contract:**

```ts
// api/src/ai/llm-client.ts
interface LlmRunOptions<TSchema> {
  agent: AgentName;            // selects model, prompt, output schema
  input: unknown;              // typed per agent
  schema: TSchema;             // Zod schema — single source of truth
  cacheKey?: string;           // see §3.9
  maxOutputTokens?: number;    // hard ceiling per task class
  locale?: 'fr' | 'de' | 'en';
}
```

Adapters live under `api/src/ai/providers/{gemini,deepseek,anthropic}.adapter.ts` — each implements the same gateway contract. Switching the default for an agent is a one-line config change in `ai-agents.config.ts`.

**Structured outputs everywhere.** OpenAI-compatible providers (DeepSeek, Gemini via the compat layer) all support `response_format: json_schema`. We use it unconditionally — no string-parsing JSON, no regex repair, no "please return JSON" prompting.

**Prompt caching where the provider supports it.** Gemini has implicit and explicit caching with strong discounts on cached tokens; DeepSeek offers context caching. We keep the role taxonomy, canton list, qualification ontology, and system prompt in a stable cached block at the top of every request — high hit rate, large per-call discount.

### 3.2 Vector search — `pgvector`, not a separate database

- **Add the `vector` extension to the existing Postgres.** Embeddings live on `EducatorEmbedding` and `StaffingRequestEmbedding` tables (one row per profile/request, model and dimension columns for forward-compat).
- Why this over Pinecone/Weaviate/Qdrant: zero new infra, transactional consistency with the source profile, identical backup story, and pgvector with HNSW indexes is fast enough at our expected scale (low six-figures of profiles for years). The pain point of pgvector is multi-tenant scaling at >10M rows — we are nowhere near it.
- Migration path is open: when scale demands, embeddings can be mirrored to a dedicated vector DB via a queue. Schema does not change.
- **Use small, cheap embedding models** (e.g. `voyage-3-lite` or Cohere multilingual) — not because cost matters, but because dimension count drives index size. 512–768 dims is the sweet spot.

### 3.3 Hybrid matching, not vector-only

- Hard filters (canton, language, work-percentage range, contract type, start-date feasibility) run in **SQL** — fast, deterministic, debuggable.
- Soft scoring (role fit, qualification fit, experience fit, age-group fit) runs as a **weighted score** in code, not embedded prompts.
- Vector similarity is **only one signal**, used to recover near-fits that hard filters drop, and to surface free-text experience matches (e.g. "trotteurs experience").
- Final ranking and the human-readable explanation are produced by Claude Sonnet, given the structured scoring breakdown — never given raw profiles to "decide". This is the only way the system stays auditable and bias-bounded.

### 3.4 Geography

- Add `latitude` and `longitude` (Decimal) columns to `User` and `Organization`, populated on profile save via a geocoding worker (Mapbox or Swisstopo for Swiss postal-code accuracy).
- **No PostGIS** at this stage. Haversine distance in SQL using a generated `earth_position` column with the `cube` + `earthdistance` extensions is sufficient and supported on managed Postgres (Render, Supabase, RDS).
- Re-evaluate PostGIS only if we add multi-stop commute routing or isochrones.

### 3.5 Staffing request as a generalised entity

- Introduce a new `StaffingRequest` model. **Do not** retrofit `JobListing` (it's an outward-facing job ad) or shoehorn this into `ReplacementRequest` (too narrow).
- `StaffingRequest` is the *intent*. It can resolve into:
  - one or more `ReplacementMatch` proposals (existing table, reused), or
  - a published `JobListing` (existing table, reused) when the daycare opts to externalise, or
  - a candidate-reactivation campaign.
- This keeps the AI plan's "request → shortlist → maybe external" lifecycle clean while reusing every downstream entity.

### 3.6 External channel adapter framework

- One NestJS module `api/src/external-channels/` with an adapter interface (`publish`, `update`, `close`, `fetchApplications`).
- Each channel is a sub-module: `jobcloud-xml`, `job-room`, `indeed`, `manual-partner`.
- **JobCloud XML feed is served by us** — a tokenised endpoint `GET /external-channels/jobcloud/feed.xml?token=…` that JobCloud pulls. This is the architecturally correct shape because JobCloud's model is pull-based. We control freshness via the same `JobListing.status` field that already exists.
- All applies route through a single `apply.procreche.ch/:slug` page (or `/jobs/:slug/apply` on the existing frontend) — never deep-link into a JobListing detail page. This guarantees source attribution and Clerk profile capture.

### 3.7 Observability & audit

- One `AiAuditLog` table, written on every LLM call: `requestId`, `agentName`, `inputHash`, `outputHash`, `model`, `tokenUsage`, `latencyMs`, `userId`, `entityRef`, `createdAt`. Stored permanently for compliance.
- Reuse Sentry (already integrated per `docs/SENTRY_*.md`) for exceptions and slow-call breadcrumbs. Add a custom tag `ai.agent`.
- Match explanations are persisted on `MatchResult.explanation` — not regenerated on view — for legal defensibility ("here is what the system told the daycare on date X").

### 3.8 Async-by-default

Every AI call is enqueued through BullMQ. Synchronous UI calls only for the parser preview (where the daycare expects sub-second feedback). Reasons: rate-limit smoothing, automatic retry with backoff, separable scaling, and no request-timeout cliffs on Render's 30s HTTP limit.

### 3.9 AI Intermediary pattern — deterministic-first, narrow inputs

The gateway is more than a model-picker. It enforces an **intermediary discipline** between user input and the LLM, so the model only ever sees the minimum needed for one well-defined task. This single pattern is responsible for the majority of cost savings.

The flow for **every** AI feature is:

```
user / daycare input
     │
     ▼
1. clean & validate input (code)
2. classify task type → pick the agent (code)
3. fetch ONLY the database fields that agent needs (code)
4. assemble minimal prompt with cached system block (gateway)
5. call cheapest viable model with json_schema output (gateway)
6. validate against Zod schema (gateway)
7. cache the result by canonical input hash (gateway)
     │
     ▼
platform action
```

Concrete rules the gateway enforces — not conventions, code:

- **Hard filter before model call.** No agent that compares candidates is allowed to receive more than N candidates in its input. The matcher service prunes 2,000 → ~12 via SQL hard filters and weighted scoring before the explanation agent ever runs.
- **Field-level minimisation.** Each agent declares its `requiredInputFields` array. The gateway throws in dev if a caller passes anything outside that allowlist. CVs, full profiles, full daycare records never reach the LLM as a blob.
- **Per-task output ceilings**, hard-coded per agent, never overridable by the caller:

| Agent | Max output |
|---|---|
| Request parser | JSON only — ~120 tokens |
| Match explanation | 80 words |
| Reactivation rewrite (when needed) | 100 words |
| Short job ad | 180 words |
| Full job ad | 500 words |
| Routing recommendation | 3 bullets |
| Weekly intelligence narrative | 400 words |

Exceeding the ceiling is a validation failure, not a soft hint.

- **Single-task agents.** No "do everything" prompt. If a feature needs two things (parse + explain), it's two gateway calls with two schemas. This keeps each prompt short, cacheable, and cheap to swap.
- **Prompt template registry** under `api/src/ai/agents/`. One file per agent, containing: model default, schema, prompt template, required-input allowlist, cache TTL, output ceiling. Reviewable, diffable, lintable.

### 3.10 Caching and templating — the second cost lever

Caching is treated as a first-class part of the pipeline, not an optimisation.

**Persistent caches (Postgres-backed):**

| Cached artifact | Key | Invalidated when |
|---|---|---|
| Parsed CV → structured JSON | `cvAssetId` content hash | CV is replaced |
| Educator profile summary | `userId` + profile updatedAt | profile changes |
| Educator embedding | same | same |
| Parsed staffing request | hash of raw text + locale | never (immutable input → immutable parse) |
| Match explanation | `(staffingRequestId, educatorId)` | request or profile changes |
| Generated job-ad draft | `staffingRequestId` + variant | request changes |
| Translation variants of static copy | source text + target locale | source text changes |
| Routing recommendation | hash of structured request | request changes |

Implementation: a small `AiResultCache` table (key, agent, payload JSON, modelUsed, createdAt, expiresAt) consulted by the gateway before every call. Cache-hit cost is one Postgres lookup; cache-miss cost is one LLM call. Cache hit rate is the headline metric on the gateway dashboard.

**Provider-level caching** (Gemini implicit/explicit cache, DeepSeek context cache) stacks on top of this for the system-prompt block, giving a second discount on the few calls that actually do hit the model.

**Templates instead of LLM calls for repeated text.** The reactivation flow is the cleanest example:

```
Bonjour {{firstName}}, une crèche à {{city}} recherche {{role}} à {{percentage}}%,
avec disponibilité {{days}}. Votre profil semble proche de cette opportunité.
Souhaitez-vous recevoir les détails ?
```

- 90% of reactivation messages will be 100% template — **zero LLM calls**.
- The "rewrite for tone" path (e.g. the daycare wants a warmer voice) is the only branch that hits the model, and only with ~50 input tokens and a 100-word output ceiling.
- Templates are stored per locale (`fr-CH`, `de-CH`, `en`) and per role-archetype to feel natural without being generic. Maintained as plain `.hbs` files under `api/src/ai/templates/`.

The same template-first approach applies to: status update emails, screener acknowledgments, "no match found yet" notifications, and the daycare-facing structured-request confirmation card.

### 3.11 Cost guardrails as code

- **Daily token budget per agent and per foundation**, surfaced on the gateway dashboard. Soft-warn at 70%, hard-fail at 100% with a templated fallback (e.g. for explanations, show the structured score breakdown without the prose).
- **Single source of truth for pricing**: a `model-costs.ts` file mapping provider → input/output cost. Every gateway call records actual token usage; every audit-log row is priced. Monthly cost-per-foundation rolls up automatically.
- **Anomaly alerts** (Sentry) when an agent's average token usage drifts >25% from its 7-day baseline — catches prompt regressions before the bill does.

---

## 4. Data Model Strategy

### 4.1 Reused tables (no changes or additive only)

- `JobListing` — used by Phase 5 external-publishing flow.
- `JobApplication` — used as the final landing entity for external applicants (status starts at `PENDING`, source tracked separately).
- `ReplacementRequest`, `ReplacementMatch` — used directly. ReplacementMatch becomes the equivalent of the source plan's `MatchResult` for replacement-type requests.
- `Notification`, `NotificationType` — extend the enum with `SHORTLIST_READY`, `CANDIDATE_RESPONDED`, `EXTERNAL_POST_PUBLISHED`, `EXTERNAL_APPLICANT_RECEIVED`.

### 4.2 New tables

```
StaffingRequest                       — generalised intake (replaces source plan's StaffingRequest)
StaffingRequestEmbedding              — 1:1 with StaffingRequest, pgvector
MatchResult                           — 1:N with StaffingRequest (replaces source plan's MatchResult)
EducatorEmbedding                     — 1:1 with User (for EDUCATORs), pgvector
ExternalPosting                       — 1:N with StaffingRequest, one row per channel published-to
ExternalApplicant                     — 1:N with ExternalPosting, bridges to JobApplication once converted
CandidateConsent                      — versioned consent grants per educator
AiAuditLog                            — append-only, every LLM call
AiAgentRun                            — coarser-grain log of multi-step orchestrations (parse → match → explain)
```

### 4.3 Additive columns on existing tables

- `User`: `latitude`, `longitude`, `geocodedAt`, `maxCommuteKm`, `availabilitySchemaVersion`, `lastMatchedAt`, `responsivenessScore`.
- `Organization`: `latitude`, `longitude`, `geocodedAt`.
- `JobListing`: `staffingRequestId` (nullable FK — created from a request), `sourceChannelTags` (string[] for attribution).
- `JobApplication`: `externalApplicantId` (nullable FK), `sourceChannel`, `sourceCampaign`.

### 4.4 What we deliberately do **not** split out

- The source plan's `CandidateExperience` and `CandidateCertification` are already covered by `User.workExperience` (currently JSON text) and `User.certifications` (string array). **Promote these to proper tables only when CV parsing demands it (Phase 2).** A premature split adds migration cost with no Phase-1 payoff.

---

## 5. Phased Roadmap

The active staffing remodel (`IMPLEMENTATION_PHASES.md` Phases 1–7) must land first or in parallel — it builds the surfaces this plan plugs into (foundation dashboard, replacement UI, notification bell, application pipeline). The AI phases here begin once Remodel Phase 3 (Replacement Staffing) is in.

### Phase 0 — Foundations (2 weeks)

**Goal:** Land the AI gateway, the audit log, and the schema migrations everything else depends on. No user-visible features.

- Add `api/src/ai/` module: `LlmClient`, `EmbeddingClient`, agent registry, prompt-template loader, structured-output schemas, `AiResultCache` lookup, per-agent input-field allowlist, output-token ceilings, daily budget enforcement.
- Wire **Gemini Flash and DeepSeek** adapters behind the gateway contract (OpenAI-compatible). Anthropic adapter built in the same shape but kept inactive — the gateway can route any single agent to it via config when escalation is warranted.
- Enable provider-level prompt caching on the system-prompt block (canton list, role taxonomy, qualification ontology).
- Per-agent config file (`ai-agents.config.ts`) defines default model, max output tokens, cache TTL, required input fields, locale routing.
- New Prisma migrations:
  - Enable `vector`, `cube`, `earthdistance` Postgres extensions.
  - Create `StaffingRequest`, `MatchResult`, `EducatorEmbedding`, `StaffingRequestEmbedding`, `AiAuditLog`, `AiAgentRun`, `CandidateConsent`.
  - Add geo columns to `User` and `Organization`.
- New BullMQ queues: `ai.parse-request`, `ai.embed-profile`, `ai.embed-request`, `ai.geocode`, `ai.match`, `ai.explain`.
- Geocoding worker (Mapbox or Swisstopo Geo Admin API). Backfill all existing `User` and `Organization` rows.
- Feature flags: `ai_request_parser`, `ai_internal_matching`, `ai_cv_parsing`, `ai_reactivation`, `ai_external_routing`, `ai_external_apis`. All off by default.

**Exit criteria:** `LlmClient.run(...)` works end-to-end against a test agent; geocoding backfill complete; audit log records every call.

### Phase 1 — Internal Matching MVP (3 weeks)

**Goal:** A daycare types a free-form request and sees a ranked shortlist with explanations. Internal pool only.

- **Request Parser agent** (Gemini Flash, JSON schema output, ~120-token ceiling) — converts free text into structured `StaffingRequest` rows. Schema includes the Swiss canton list, role taxonomy (Auxiliaire, ASE, EDE, FaBe, Educateur diplômé HES, Stagiaire, Apprenti, Directeur), employment types, language codes, age groups (nursery 0–18mo / toddlers 18mo–3yr / preschool 3–5yr / school-age). Parsed result is cached by canonical request-text hash — identical requests never hit the model twice.
- **Hybrid Matcher service** (`api/src/ai/match/`):
  - SQL hard filters: canton overlap, language overlap, work-percentage band overlap, role overlap, contract-type compatibility, start-date feasibility, `candidatePoolVisible=true`, `approvalStatus=APPROVED`.
  - Score weights from the source plan (Role 20 / Availability 20 / Location 15 / Qualification 15 / Language 10 / Age-group 10 / Contract 5 / Responsiveness 5).
  - Distance via `earthdistance` extension on lat/lon; convert km → score with a piecewise function bounded by `maxCommuteKm`.
  - Vector similarity used as a tiebreaker and to recover candidates dropped by the soft-experience filter only.
- **Match Explanation agent** (Gemini Flash, 80-word ceiling, JSON output with `strengths[]`, `missing_info[]`, `recommended_action`) — runs only on the **top 3–5 candidates** that the deterministic scorer surfaced. Input is the structured score breakdown + a narrow allowlisted slice of the candidate profile — never the full row. Result cached by `(staffingRequestId, educatorId)`; invalidated only when either changes.
- **Replace `findMatchingCandidates` stub** in `recruitment.service.ts`. The new endpoint `POST /staffing/requests` and `GET /staffing/requests/:id/matches` lives in a new `staffing` module to keep concerns clean; the legacy endpoint can stay as a thin proxy.
- **Foundation UI**: replace the placeholder candidate list on the foundation dashboard with the staffing-request box + shortlist table. Reuse the existing replacement-request component shells where possible.
- **Admin observability**: surface `AiAgentRun` rows on a new admin page `Staffing > AI Runs`.

**Exit criteria:** A daycare submits a French request and receives a top-10 shortlist with per-candidate explanations in <3s p95 for cached system prompts.

### Phase 2 — Candidate Profile Enrichment & CV Parsing (3 weeks)

**Goal:** Make the internal pool actually useful by getting profiles to structured completeness.

- **CV Parser pipeline**:
  - On `cvAssetId` set or replaced → enqueue `ai.parse-cv`.
  - Worker: pull from R2 → text extraction (`pdf-parse` for PDF, `mammoth` for DOCX) → **Gemini Flash** with a strict JSON schema mirroring the source plan's `CandidateExperience` / `CandidateCertification` shape. Parsed result cached by CV content hash; re-parsing only happens on file replacement.
  - **Now is the right time to split** `CandidateExperience` and `CandidateCertification` into real tables (the source plan's §4B/§4C). One Prisma migration, one backfill from existing JSON.
  - Confirmation step in the educator UI: parser fills the form; educator confirms or edits; nothing auto-publishes.
- **Availability calendar upgrade**: extend `availabilitySettings` JSON into proper columns (`availableDays[]`, `availableTimeBlocks[]`, `earliestStartDate`, `openToReplacement`, `openToPermanent`, `openToTemporary`). Keep the JSON as a compatibility shim during migration.
- **Profile completeness score** (`User.profileCompletenessScore`) — deterministic, not AI. Used by Phase 1 matcher as the responsiveness/quality signal.
- **Profile embedding worker** — runs whenever a profile changes; writes to `EducatorEmbedding`. Throttled per user.

**Exit criteria:** 70%+ of new educator sign-ups upload a CV; parsed-then-confirmed profiles have all eight core fields populated; embedding coverage >95% of approved educators.

### Phase 3 — Reactivation Engine (2 weeks)

**Goal:** Convert the long tail of near-fit candidates into responses.

- **Templates do the work, not the model.** Per-locale (`fr-CH`, `de-CH`, `en`) and per-role-archetype Handlebars templates produce the message with zero LLM calls. The structured `StaffingRequest` already supplies every field the template needs (`firstName`, `city`, `role`, `percentage`, `days`).
- **Optional "tone rewrite" agent** (Gemini Flash, 100-word ceiling) — only invoked when the daycare explicitly asks for a warmer/firmer/shorter variant. Otherwise no model call at all.
- New `ReactivationCampaign` table: groups outbound messages per `StaffingRequest` for analytics. Each message is a `Notification` + an email send (existing transport) + optionally an in-app DM via the messaging gateway.
- Quiet-hours and frequency caps enforced at the queue level. A candidate can receive at most N reactivation outreaches per rolling 30 days.
- Response capture: links in the email are tokenised and route through a tracking endpoint that writes to `MatchResult.candidateResponse` and surfaces to the foundation dashboard.
- Feedback signal back into matcher: declined / no-response candidates are de-weighted on subsequent matches for the same daycare.

**Exit criteria:** Response rate of 20%+ on first-batch reactivations in pilot cantons; no candidate over the cap.

### Phase 4 — External Routing (Manual + Capture) (2 weeks)

**Goal:** When internal matching is thin, route externally with full source attribution — before touching any external API.

- **Job-Ad Generator agent** (Gemini Flash, locale-aware, two variants: short ≤180 words and full ≤500 words) — produces an admin-reviewable job ad from a `StaffingRequest`. Output schema is the existing `JobListing` shape; admin approves → `JobListing.status=PUBLISHED`, `staffingRequestId` set. Drafts cached by `staffingRequestId` + variant; regeneration only on request change. Swiss-German output is the one path that may escalate to a stronger model (config-flagged) until quality is validated.
- **External Routing Recommender agent** (Gemini Flash, 3-bullet ceiling) — given the structured request, suggests a channel mix (e.g. "JobCloud + LinkedIn + training schools" for a director role). Outputs are recommendations only; admin chooses. Cached by request hash.
- **Manual partner channel workflow**:
  - Generate copy variants per channel (long for LinkedIn, short for WhatsApp groups, formal for school newsletters).
  - Tracked short-link generator: every external link is `apply.procreche.ch/:slug?src=<channel>&c=<campaign>`. Slugs are stable, sources are not.
  - Admin marks "posted" with a timestamp; the system tracks open/click via the short-link redirector.
- **Capture landing page**: `/jobs/:slug/apply` — minimal Clerk-light flow (email + phone + canton + role + work-% + diploma + consent). Creates a `User` with role `EDUCATOR`, `approvalStatus=PENDING_REVIEW`, profile pre-filled by parsed CV if uploaded. Writes `ExternalApplicant` and a `JobApplication`.
- **Source attribution everywhere**: `JobApplication.sourceChannel`, `sourceCampaign` always populated, visible to admin and surfaced on the candidate's profile timeline.

**Exit criteria:** 100% of external apply links resolve through ProCrèche; 60%+ of external visitors who start an apply finish a usable profile (consent + 6 core fields).

### Phase 5 — External APIs (4 weeks, sequenced)

**Goal:** Automate the channels worth automating. Each adapter is independent and gated by its own flag.

Order, by ROI for Switzerland:

1. **JobCloud XML feed adapter** — we serve XML, JobCloud pulls. Tokenised endpoint, signed updates, removal-on-status-change handled automatically. Track imported listing IDs in `ExternalPosting`. Lowest integration risk because JobCloud drives the schedule.
2. **Job-Room API adapter** — only after credentials are granted. Compliance-validated payload formatter; status tracking; manual fallback if credentials lag. This one earns *trust signal* with Swiss public employment services more than volume.
3. **Indeed Job Sync API adapter** — postings with screener questions. Screeners map directly to fields we already have (work-%, canton, diploma, replacement-availability). Apply-with-Indeed responses flow into the same capture landing page so we still get a ProCrèche profile.
4. **LinkedIn** — stays manual indefinitely. Their API surface for unpaid job posting is not worth the maintenance.

Each adapter follows the same shape:

```
api/src/external-channels/<channel>/
  ├─ <channel>.adapter.ts       (implements ExternalJobChannelAdapter)
  ├─ <channel>.controller.ts    (webhooks/feeds where applicable)
  ├─ <channel>.processor.ts     (BullMQ worker for poll/publish)
  └─ dto/
```

**Exit criteria:** Each adapter passes a contract test against recorded fixtures; can publish, update, close, and reconcile externalPostId state without admin intervention.

### Phase 6 — Staffing Intelligence (3 weeks)

**Goal:** Turn accumulated request/match/application data into the dashboards the source plan §16 promises.

- **Materialised views** in Postgres for: requests by canton/month, fill-rate by role, average time-to-shortlist, source performance, replacement demand patterns, candidate responsiveness curves.
- **Demand-heatmap agent** (Gemini Flash, weekly cron, 400-word ceiling) — narrative summary on top of the views, surfaced on the admin dashboard. Runs once per week per canton — total cost is trivial. Output cached for the week.
- **Predictive flag**: simple regression (not Claude) for "Foundation X is likely to need a replacement within 14 days" based on historical `ReplacementRequest` cadence. Promotes to a notification of type `LOW_REPLACEMENT_POOL`.
- KPI tiles on the admin dashboard replace the current generic count cards.

**Exit criteria:** Admin dashboard shows live staffing KPIs; weekly intelligence email lands for super-admins.

---

## 6. Compliance & Audit

These are non-negotiable, baked into every phase — not a Phase 7 afterthought.

- **Consent-first**: `CandidateConsent` row required before a profile enters matching. Versioned (we change the policy → new row required). Withdrawal removes the educator from active matching within one queue cycle.
- **Explainability**: every shortlist row has a persisted `MatchResult.explanation`. The phrase "AI rejected this candidate" is forbidden in copy — `frontend/components/match/` ships with a copy lint.
- **Human-in-the-loop**: external job posts, reactivation messages, and final shortlists all require admin or daycare approval until adoption metrics stabilise. Auto-approve is a per-foundation flag, opt-in.
- **Sensitive inference ban**: the prompt-template loader strips and rejects any field that resembles age, nationality, race, health, religion, family status before sending to the LLM. Static checker in CI validates prompt templates against an allowlist of input fields.
- **Audit log**: append-only, retained per Swiss data-protection norms. Every AI call traceable to a user, input, output, and timestamp.
- **Data minimisation**: profile fields exposed to the LLM are the minimum required per agent — e.g. the explanation agent receives the structured score breakdown, *not* the raw profile JSON.

---

## 7. Monetisation Surface

Aligns with source plan §17. The phasing makes the packaging natural:

| Tier | Unlocks |
|---|---|
| Basic Recruitment (included) | Job listing CRUD, raw applicant list — what exists today |
| AI Staffing Assistant (premium) | Phases 1–3: NL request, internal matching, explanations, reactivation |
| External Staffing Router (add-on / usage) | Phases 4–5: external job posts, channel routing, source attribution, campaign reporting |
| Assisted Staffing (high-touch) | ProCrèche team layer on top of the same UI — no separate product |

Feature flags double as paywall gates. The `FeatureFlag` model + per-user resolver already supports this — no new entitlements service needed.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Weak internal pool at launch makes matcher look bad | Phase 2 ships before Phase 1 goes GA; profile-completion campaign + referral incentives run in parallel; Phase 4 capture flow seeds the pool from day one. |
| LLM hallucination on structured outputs | Tool-use only; Zod-validated schemas; reject + retry on validation failure; never display raw LLM text without an explanation contract. |
| Cost overruns from per-search LLM calls | Gemini Flash / DeepSeek as default for all agents (§3.1); deterministic SQL+score before any model call (§3.3, §3.9); templates instead of LLM for repeated text (§3.10); persistent `AiResultCache` keyed by content hash; provider-level prompt caching on the system block; daily token budget per agent and per foundation with hard-fail to templated fallback (§3.11). |
| Cheap model produces weak Swiss-French or Swiss-German prose | Structured-output JSON contract limits prose surface area; explanation agent caps at 80 words; per-agent escalation flag routes one agent at a time to a stronger model without code changes; small human-review queue for the first month of German output. |
| pgvector saturation | Monitor index size and query latency; have a documented migration to Qdrant/Weaviate via the embedding queue. Not premature work. |
| External API instability or credential delays | Adapter framework is independent per channel; manual fallback in Phase 4 covers every channel; Phase 5 enables one channel at a time. |
| Bias or discrimination claims | Sensitive-field strip-list in CI; explanation persisted for legal defense; human approval on all outbound messages. |
| External applicant drop-off on the capture page | Six-field minimum; CV upload pre-fills via Phase 2 parser; save-progress + email link to resume. |
| Conflict with active remodel | This plan slots **after** Remodel Phase 3. Until then, AI work stays behind feature flags in `claude/ai-integration-plan-JBbzG`. |

---

## 9. Sequencing Against the Active Remodel

The remodel (`IMPLEMENTATION_PHASES.md`) is doing the right groundwork. The AI build dovetails:

```
Remodel P1 (IA + bug sweep)            →  unblocks Phase 0 (no conflict)
Remodel P2 (scoring + email wiring)    →  Phase 1 replaces the stub scorer the remodel touches lightly
Remodel P3 (ReplacementRequest UI)     →  Phase 1 matcher reuses these surfaces
Remodel P4 (emails + notifications)    →  Phase 3 reactivation rides on this transport
Remodel P5 (foundation dashboard)      →  Phase 1 UI replaces the placeholder shortlist
Remodel P6 (admin dashboard)           →  Phase 6 KPI tiles
Remodel P7 (measurement)               →  Phase 6 dashboards
```

Concrete proposal: Remodel P2 should **not** build a final scoring algorithm — ship a v0 score (canton + work-% + role match) with a stable interface so Phase 1 of this plan can swap the implementation behind it. That keeps the remodel deliverable and avoids throwing work away.

---

## 10. Open Questions

1. **Embedding provider** — Gemini `text-embedding-004` (cheapest, multilingual, OpenAI-compatible) is the default proposal; Voyage-3-lite as a fallback. Gateway abstraction makes the choice reversible.
2. **Geocoding provider** — Swisstopo is free and Swiss-accurate but rate-limited; Mapbox is paid but global. Suggest Swisstopo with Mapbox fallback.
3. **Job-Room credentials** — Application timing affects Phase 5 sequencing. Should be requested in Phase 0.
4. **Pricing of the AI Assistant tier** — needs commercial input before Phase 1 GA. Build doesn't block on it.
5. **Multilingual quality bar** — Swiss-German vs. German for the DACH region. Recommend Gemini Flash for first-month pilot with a small human-review queue; escalate the job-ad agent (only that one) to Gemini Pro or Claude Sonnet via config if review-queue rework rate exceeds 20%.
6. **Provider primary: Gemini Flash vs DeepSeek** — both are viable defaults. Decision criteria for Phase 0: Swiss-region latency (Gemini routes through European endpoints; DeepSeek currently does not), data-residency compliance, and rate-limit headroom for the matching workload. The gateway supports both; choose one as primary, keep the other as cold standby.
