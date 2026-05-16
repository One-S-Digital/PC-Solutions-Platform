# AI Staffing Integration — Phased Build Plan

**Status:** Proposed
**Owner:** Platform Engineering
**Branch:** `claude/ai-integration-plan-JBbzG`
**Related docs:** `STAFFING_REMODEL_PLAN.md`, `IMPLEMENTATION_PHASES.md`, `REMODEL_NOTES.md`, `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`

---

## 1. Executive Summary

The AI staffing engine is a layered system, not a single feature. The right build order is **internal → reactivation → external**, mirroring the technical recommendation in the source plan. The platform already provides most of the substrate (Prisma/Postgres, BullMQ, Redis, R2, WebSockets, Notification table, ReplacementRequest tables, feature flags, fr/en/de translation, messaging gateway). The work is therefore **less about new infrastructure and more about three additions**: an AI orchestration layer, structured profile/geography upgrades, and an external-channel adapter framework.

This plan deliberately defers external job-board APIs to Phase 5. Building them earlier inverts the strategic value: external routing should feed the internal pool, not replace it.

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

### 3.1 LLM provider and gateway

- **Use Anthropic Claude exclusively at first**, via a single internal gateway module `api/src/ai/`. No direct `@anthropic-ai/sdk` imports outside that module.
- **Model selection by task** — picked per call, not globally:
  - `claude-haiku-4-5-20251001` → CV parsing, request parsing, short reactivation messages, classification.
  - `claude-sonnet-4-6` → match explanations, job-ad generation, multilingual rewrites, anything user-facing or auditable.
  - Reserve `claude-opus-4-7` for evaluation harness and admin-only "deep search" features later.
- **Always use tool-use / structured outputs** for parsing (never free-text JSON parsing). Define one Zod schema per agent; share it between the prompt-tool definition and the DB write.
- **Prompt caching** on system prompts and the role taxonomy block — recruitment requests reuse the same canton list, role list, qualification taxonomy, so cache hit rate should be high.
- **Provider abstraction is a thin interface, not a port-to-everything layer.** A single `LlmClient.run({task, schema, input})` method; swapping providers later means writing one new implementation, not refactoring callers.

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

- Add `api/src/ai/` module: `LlmClient`, `EmbeddingClient`, agent registry, prompt-template loader, structured-output schemas.
- Wire Anthropic SDK; enable prompt caching; set per-agent model defaults.
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

- **Request Parser agent** (Haiku) — converts free text into structured `StaffingRequest` rows. Tool-use schema with the Swiss canton list, role taxonomy (Auxiliaire, ASE, EDE, FaBe, Educateur diplômé HES, Stagiaire, Apprenti, Directeur), employment types, language codes, age groups (nursery 0–18mo / toddlers 18mo–3yr / preschool 3–5yr / school-age).
- **Hybrid Matcher service** (`api/src/ai/match/`):
  - SQL hard filters: canton overlap, language overlap, work-percentage band overlap, role overlap, contract-type compatibility, start-date feasibility, `candidatePoolVisible=true`, `approvalStatus=APPROVED`.
  - Score weights from the source plan (Role 20 / Availability 20 / Location 15 / Qualification 15 / Language 10 / Age-group 10 / Contract 5 / Responsiveness 5).
  - Distance via `earthdistance` extension on lat/lon; convert km → score with a piecewise function bounded by `maxCommuteKm`.
  - Vector similarity used as a tiebreaker and to recover candidates dropped by the soft-experience filter only.
- **Match Explanation agent** (Sonnet) — given the structured scoring breakdown and the candidate's structured profile, produces a 2–3 sentence rationale in the daycare's preferred locale. Persisted to `MatchResult.explanation`.
- **Replace `findMatchingCandidates` stub** in `recruitment.service.ts`. The new endpoint `POST /staffing/requests` and `GET /staffing/requests/:id/matches` lives in a new `staffing` module to keep concerns clean; the legacy endpoint can stay as a thin proxy.
- **Foundation UI**: replace the placeholder candidate list on the foundation dashboard with the staffing-request box + shortlist table. Reuse the existing replacement-request component shells where possible.
- **Admin observability**: surface `AiAgentRun` rows on a new admin page `Staffing > AI Runs`.

**Exit criteria:** A daycare submits a French request and receives a top-10 shortlist with per-candidate explanations in <3s p95 for cached system prompts.

### Phase 2 — Candidate Profile Enrichment & CV Parsing (3 weeks)

**Goal:** Make the internal pool actually useful by getting profiles to structured completeness.

- **CV Parser pipeline**:
  - On `cvAssetId` set or replaced → enqueue `ai.parse-cv`.
  - Worker: pull from R2 → text extraction (`pdf-parse` for PDF, `mammoth` for DOCX) → Haiku with a strict tool-use schema mirroring the source plan's `CandidateExperience` / `CandidateCertification` shape.
  - **Now is the right time to split** `CandidateExperience` and `CandidateCertification` into real tables (the source plan's §4B/§4C). One Prisma migration, one backfill from existing JSON.
  - Confirmation step in the educator UI: parser fills the form; educator confirms or edits; nothing auto-publishes.
- **Availability calendar upgrade**: extend `availabilitySettings` JSON into proper columns (`availableDays[]`, `availableTimeBlocks[]`, `earliestStartDate`, `openToReplacement`, `openToPermanent`, `openToTemporary`). Keep the JSON as a compatibility shim during migration.
- **Profile completeness score** (`User.profileCompletenessScore`) — deterministic, not AI. Used by Phase 1 matcher as the responsiveness/quality signal.
- **Profile embedding worker** — runs whenever a profile changes; writes to `EducatorEmbedding`. Throttled per user.

**Exit criteria:** 70%+ of new educator sign-ups upload a CV; parsed-then-confirmed profiles have all eight core fields populated; embedding coverage >95% of approved educators.

### Phase 3 — Reactivation Engine (2 weeks)

**Goal:** Convert the long tail of near-fit candidates into responses.

- **Reactivation Writer agent** (Sonnet, locale-aware) — short, personal opener, never templated-looking. Tool output includes subject, body, and a structured CTA payload.
- New `ReactivationCampaign` table: groups outbound messages per `StaffingRequest` for analytics. Each message is a `Notification` + an email send (existing transport) + optionally an in-app DM via the messaging gateway.
- Quiet-hours and frequency caps enforced at the queue level. A candidate can receive at most N reactivation outreaches per rolling 30 days.
- Response capture: links in the email are tokenised and route through a tracking endpoint that writes to `MatchResult.candidateResponse` and surfaces to the foundation dashboard.
- Feedback signal back into matcher: declined / no-response candidates are de-weighted on subsequent matches for the same daycare.

**Exit criteria:** Response rate of 20%+ on first-batch reactivations in pilot cantons; no candidate over the cap.

### Phase 4 — External Routing (Manual + Capture) (2 weeks)

**Goal:** When internal matching is thin, route externally with full source attribution — before touching any external API.

- **Job-Ad Generator agent** (Sonnet, locale-aware) — produces an admin-reviewable job ad from a `StaffingRequest`. Output schema is the existing `JobListing` shape; admin approves → `JobListing.status=PUBLISHED`, `staffingRequestId` set.
- **External Routing Recommender agent** (Haiku) — given the request, suggests a channel mix (e.g. "JobCloud + LinkedIn + training schools" for a director role). Outputs are recommendations only; admin chooses.
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
- **Demand-heatmap agent** (Sonnet, weekly cron) — narrative summary on top of the views, surfaced on the admin dashboard.
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
| Cost overruns from per-search LLM calls | Prompt caching on system blocks (~70% reuse); Haiku for parsing; Sonnet only for explanations and ad generation; daily token budget per foundation with alerting. |
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

1. **Embedding provider** — Voyage, Cohere multilingual, or self-hosted? Defer to Phase 0 kickoff; the gateway abstraction makes the choice reversible.
2. **Geocoding provider** — Swisstopo is free and Swiss-accurate but rate-limited; Mapbox is paid but global. Suggest Swisstopo with Mapbox fallback.
3. **Job-Room credentials** — Application timing affects Phase 5 sequencing. Should be requested in Phase 0.
4. **Pricing of the AI Assistant tier** — needs commercial input before Phase 1 GA. Build doesn't block on it.
5. **Multilingual quality bar** — Swiss-German vs. German for the DACH region. Recommend Sonnet for German output with a small human-review queue for the first month.
