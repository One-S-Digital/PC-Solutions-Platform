# AI Staffing Integration — Phased Build Plan

**Status:** Proposed
**Owner:** Platform Engineering
**Branch:** `claude/ai-integration-plan-JBbzG`
**Related docs:** `STAFFING_REMODEL_PLAN.md`, `IMPLEMENTATION_PHASES.md`, `REMODEL_NOTES.md`, `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`

---

## 1. Executive Summary

The work is structured as **two distinct layers**. Layer 1 is a **Shared AI Foundation** owned by core engineering — gateway, model routing with fallback, prompt-template registry with versioning, RAG, logging/audit, role-based permissions, cost tracking, and safety guards. Layer 2 is the **AI Staffing Engine** built on top — request parser, internal matching, candidate reactivation, external routing, and job-ad generation. Future AI features (parent-lead qualification, support assistant, content moderation, policy Q&A, e-learning) are also Layer-2 consumers and re-use Layer 1 without modification.

Within the Staffing Engine, the right build order is **internal → reactivation → external**, mirroring the technical recommendation in the source plan. The platform already provides most of the substrate (Prisma/Postgres, BullMQ, Redis, R2, WebSockets, Notification table, ReplacementRequest tables, feature flags, fr/en/de translation, messaging gateway). The work is therefore **less about new infrastructure and more about three additions**: an AI orchestration layer, structured profile/geography upgrades, and an external-channel adapter framework.

This plan deliberately defers external job-board APIs to Phase 5. Building them earlier inverts the strategic value: external routing should feed the internal pool, not replace it.

**Cost stance.** The plan is engineered around cheap models accessed through **OpenRouter** as a unified API gateway, with **Gemini Flash and DeepSeek** as the default model selections — without compromising defensibility. The cost discipline is structural, not a per-feature decision:

1. **Deterministic code does the heavy lifting** (SQL filters → rule-based scoring); the LLM only narrates the top 3–5 results.
2. **Templates replace LLM calls** for any repeated text (reactivation messages, status emails, screener acknowledgments).
3. **Persistent caching** keyed by content hash means parsed CVs, parsed requests, match explanations, and job-ad drafts are written to the model exactly once.
4. **An AI Gateway** at `api/src/ai/` enforces per-agent input-field allowlists, output-token ceilings, JSON-schema validation, and daily token budgets — and lets us swap any agent's model via one config line without touching callers.

The result: a Gemini-Flash-default architecture today, fully reversible to any other model on OpenRouter (Gemini Pro, Claude, DeepSeek, Mistral, Llama, …) per agent tomorrow, with hard cost guardrails enforced in code. **OpenRouter gives us one account, one API key, one billing source, one adapter, and a single circuit of model availability** — instead of maintaining direct integrations with three providers.

---

## 1.5 Layered Architecture

The build is structured as **two distinct layers**. The lower layer is a platform capability owned by core engineering; the upper layer is a feature owned by the staffing team. Future AI features (parent-lead qualification, support assistant, content moderation, e-learning tutoring, policy Q&A) consume the same lower layer without re-implementing any of it.

```
┌────────────────────────────────────────────────────────────────┐
│ Layer 2 — AI Staffing Engine        (Phases 1–6 of this plan)  │
│ ├── Staffing request parser                                    │
│ ├── Internal candidate matching                                │
│ ├── Candidate reactivation                                     │
│ ├── External routing                                           │
│ └── Job-ad generation                                          │
└────────────────────────────────────────────────────────────────┘
                            ▲
                            │ uses
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Layer 1 — Shared AI Foundation      (Phase 0 of this plan)     │
│ ├── AI Gateway / intermediary                                  │
│ ├── Model routing (default + fallback chain)                   │
│ ├── Prompt template registry + versioning                      │
│ ├── RAG / knowledge retrieval                                  │
│ ├── Logging + audit trail (AiAuditLog, AiAgentRun)             │
│ ├── Permissions / role-based access                            │
│ ├── Cost tracking + per-agent + per-foundation budgets         │
│ └── Safety, compliance, and sensitive-field guards             │
└────────────────────────────────────────────────────────────────┘
                            ▲
                            │ uses
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Layer 0 — Existing platform substrate (no work here)           │
│   Postgres + Prisma · BullMQ + Redis · R2 · WebSockets · Clerk │
│   Email transport · Feature flags · i18n · Sentry · Messaging  │
└────────────────────────────────────────────────────────────────┘
```

**Rule of the layering:** no feature module ever imports an LLM provider SDK, an embedding client, a vector store, or a prompt template directly. The only allowed entry point is the gateway's typed agent interface (`LlmClient.run({agent, input, schema, locale, principal})`). This is enforced by an ESLint rule and a CI check on the `api/src/ai/` module boundary.

The Staffing Engine is the first consumer. The next ones likely:

| Future engine | Reuses from the foundation |
|---|---|
| Parent-lead qualification | parser agent pattern, gateway, audit, cost tracking |
| Support assistant | RAG (knowledge base), permission scoping, fallback chain |
| Content moderation (mailing list, marketplace listings) | structured output, audit, safety guards |
| Policy Q&A for daycares | RAG over canton sources (already crawled by `CantonSource`), gateway |
| E-learning tutor / quiz generator | model routing (cheap), structured output, cost budgets per foundation |

Designing the foundation for one consumer would make all of these expensive later. Designing it for several from day one costs maybe 20% more in Phase 0 and saves multiples of that across each subsequent feature.

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

**OpenRouter as the unified provider.** All chat/completion calls go through [openrouter.ai](https://openrouter.ai), which proxies to every major model behind a single OpenAI-compatible endpoint. This gives us:

- **One account, one API key, one billing source** — instead of maintaining direct Google/DeepSeek/Anthropic accounts.
- **Model swapping is a string change**, not a code change. `model: "google/gemini-2.5-flash"` becomes `model: "deepseek/deepseek-chat"` or `model: "anthropic/claude-sonnet-4"` in one config line.
- **Native fallback support** — OpenRouter accepts a `models` array on every request; if the primary is rate-limited or down, it auto-routes to the next without us writing retry code.
- **Unified usage and cost data** — every response includes token usage and cost in USD; one source of truth for spend tracking.
- **Provider-level prompt caching is passed through** — Anthropic's prompt caching, Gemini's implicit/explicit caching, and DeepSeek's context caching all work via OpenRouter with the same cache discounts.

**One concession:** OpenRouter is chat/completion-focused; its embeddings coverage is limited. Embeddings go direct to **Voyage AI** (multilingual, OpenAI-compatible, cheap, one extra env var). See §3.14 for how this is isolated to a single `EmbeddingClient` interface.

**Default model selection — cheapest viable, by task:**

| Task | Default model (via OpenRouter) | Escalation (rare, flagged) |
|---|---|---|
| Request parsing (extract structured criteria) | `google/gemini-2.5-flash` | none — already over-spec for field extraction |
| CV parsing (text → structured JSON) | `google/gemini-2.5-flash` | `google/gemini-2.5-pro` when validation fails twice |
| Match explanation (40–80 words) | `google/gemini-2.5-flash` | none |
| Reactivation message (template-filled, see §3.10) | **template only**, no LLM call | Flash only when the daycare writes a custom tone request |
| Routing recommendation (3 bullets) | `google/gemini-2.5-flash` | none |
| Short job-ad blurb (≤180 words) | `google/gemini-2.5-flash` | none |
| Full job ad (300–500 words, Swiss FR/DE/EN) | `google/gemini-2.5-flash` | `anthropic/claude-sonnet-4` for German output until quality stabilises |
| Compliance-sensitive copy (consent text, rejection wording) | **template + legal review**, no LLM authorship | n/a — never LLM-authored |
| Weekly admin intelligence narrative | `google/gemini-2.5-flash` | `google/gemini-2.5-pro` on demand |
| Embeddings (direct, not via OpenRouter) | Voyage `voyage-3-lite` (multilingual) | Voyage `voyage-3` for higher recall |

The exact OpenRouter model slugs are pinned per agent in `ai-agents.config.ts`. Slugs change occasionally (e.g. `gemini-2.5-flash-preview` → `gemini-2.5-flash`); the config is the single point of update.

**Why this tiering survives the "cheapest model" mandate without breaking quality:**

- **Structured output, not free text.** Every agent returns JSON validated against a Zod schema. A cheap model that returns valid JSON is functionally identical to an expensive model that returns valid JSON. Quality risk lives in *prose*, which we minimise in §3.10.
- **Deterministic code does the matching, not the model.** Match scoring is rule-based (§3.3). The model only narrates the top 3–5 results.
- **Templates for repeated language.** Reactivation messages, status updates, screener acknowledgments are all template-driven — no LLM call at all.
- **Swap is a string, not a deploy.** If Gemini Flash German output is weak in early pilots, change the model slug for the job-ad agent to `anthropic/claude-sonnet-4` in `ai-agents.config.ts`. No new adapter, no SDK install, no env var change.

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
  principal: Principal;        // required for permissions + audit
}
```

There is **one adapter**: `api/src/ai/providers/openrouter.adapter.ts`. It speaks the OpenAI Chat Completions API (which OpenRouter implements faithfully), reads the model slug + fallback chain from the agent's config, and returns a validated, schema-checked result. Embedding calls go through a separate `EmbeddingClient` (`voyage.adapter.ts`) so the gateway's chat surface stays narrow.

**Structured outputs everywhere.** OpenRouter passes through `response_format: json_schema` for any model that supports it (all Gemini and Anthropic models, recent DeepSeek). Agents declare their schema once; the gateway sets `response_format` on every call. No regex repair, no "please return JSON" prompting.

**Prompt caching where the provider supports it.** OpenRouter forwards cache-control headers and cache hits to the underlying provider — Gemini's implicit caching and Anthropic's `cache_control` ephemeral cache both work transparently. We keep the role taxonomy, canton list, qualification ontology, and system prompt in a stable cached block at the top of every request — high hit rate, large per-call discount, with no provider-specific code.

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

**Provider-level caching passes through OpenRouter.** Gemini's implicit/explicit cache, Anthropic's `cache_control` ephemeral cache, and DeepSeek's context cache all stack on top of our application-level cache for the system-prompt block — a second discount on the few calls that actually do hit the model. No provider-specific code; OpenRouter forwards the cache directives.

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

### 3.12 Fallback model chain

Each agent declares a **chain** of model slugs, not a single default. **OpenRouter natively supports this** — its API accepts a `models` array on every request and falls back automatically on rate limit, 5xx, or timeout, returning which model actually answered. We use this directly rather than reimplementing fallback in our code.

For failures OpenRouter cannot recover from (JSON-validation failure, hallucinated tool call, policy refusal), the gateway retries once with the next model in the chain at the application level.

Default chains (all via OpenRouter):

| Agent | Primary | Secondary | Tertiary |
|---|---|---|---|
| Request parser | `google/gemini-2.5-flash` | `deepseek/deepseek-chat` | `anthropic/claude-haiku-4-5` (config-flagged) |
| CV parser | `google/gemini-2.5-flash` | `deepseek/deepseek-chat` | `google/gemini-2.5-pro` |
| Match explanation | `google/gemini-2.5-flash` | `deepseek/deepseek-chat` | — |
| Job-ad (FR/EN) | `google/gemini-2.5-flash` | `deepseek/deepseek-chat` | — |
| Job-ad (DE/Swiss-DE) | `google/gemini-2.5-flash` | `google/gemini-2.5-pro` | `anthropic/claude-sonnet-4` (config-flagged) |
| Routing recommendation | `google/gemini-2.5-flash` | `deepseek/deepseek-chat` | — |
| Weekly intelligence | `google/gemini-2.5-flash` | `google/gemini-2.5-pro` | — |
| Embeddings (direct, not OpenRouter) | Voyage `voyage-3-lite` | Voyage `voyage-3` | — |

Every response from OpenRouter includes the `model` actually used, which we record in `AiAuditLog.modelUsed` and `AiAuditLog.fallbackUsed`. The dashboard surfaces fallback rate by primary model — when it climbs, we know a provider is degrading before users see it.

An **application-level circuit breaker** sits on top: if OpenRouter itself returns 5xx for N consecutive requests (rare), the breaker opens for 5–15 minutes and the gateway returns a templated fallback (e.g. the explanation agent returns just the structured score breakdown).

### 3.13 Prompt template registry & versioning

Prompts are first-class artifacts, not strings inline in TypeScript.

- One file per agent under `api/src/ai/agents/<agent-name>/`:
  ```
  index.ts            — agent definition (model chain, schema, ceilings, allowlist)
  prompt.v1.ts        — versioned prompt template (Handlebars)
  prompt.v2.ts        — current default
  schema.ts           — Zod output schema
  fixtures/           — golden inputs + expected outputs for the eval harness
  ```
- Every gateway call resolves the **active prompt version** through a config table (`AiAgentConfig`), defaulting to the latest checked-in version but overridable per environment (dev/staging/prod) and per foundation for A/B rollouts.
- The active version is logged on every `AiAuditLog` row — every output is traceable to the exact prompt that produced it.
- Prompt updates ship through PRs like any code change. Removing a version requires a migration to repoint any pinned config row.
- **Eval harness** (a small Jest suite) runs the agent against its `fixtures/` on every PR that touches its directory. A new prompt version that regresses on golden cases fails CI before review.

### 3.14 RAG / knowledge retrieval

Some agents need facts the platform owns but the model doesn't. The foundation ships RAG as a first-class capability so feature modules consume it the same way they consume the model.

**Knowledge sources at launch:**

| Source | Used by |
|---|---|
| Role taxonomy (Auxiliaire, ASE, EDE, FaBe, HES, etc., with definitions + canton-level equivalences) | Staffing parser, match explanation, job-ad generator |
| Canton-specific staffing rules (work permit, diploma equivalence, ratio rules) | Job-ad generator, compliance copy |
| Crawled canton policy documents (existing `CantonSource` table + crawler at `api/src/canton-source/`) | Future policy Q&A; not used in Phase 1 |
| Daycare-specific facts (mission, age groups served, languages of operation, neighbourhood) | Job-ad generator, reactivation rewrite |
| Glossary of internal status terms (replacement, shortlist, trial day) | All agents — kept in the cached system block |

**Implementation:**

- New table `KnowledgeDocument` with embedding column (pgvector) and metadata (`source`, `cantonScope`, `locale`, `audience`).
- Gateway exposes a `retrieve({query, scope, k, principal})` method that runs a hybrid search (BM25 via Postgres FTS + vector similarity), filters by `principal`'s access (a daycare cannot retrieve another daycare's facts), and returns the top-k passages.
- Agents that need RAG declare `retrieval: { scope: 'role-taxonomy' | 'canton-rules' | ..., k: 3 }` in their config. The gateway runs retrieval and injects the passages as a tagged section of the prompt, separate from user input — never concatenated into the user message (prompt-injection safety).
- Retrieved passages are recorded on `AiAuditLog.retrievedDocIds` for explainability ("the model said X because it was given source Y").
- **Static knowledge (role taxonomy, canton rules) is curated, not crawled.** Stored as versioned Markdown in `api/src/ai/knowledge/` and re-embedded on commit. Crawled sources (canton policy PDFs) come later.

The same retrieval primitive is what future features (policy Q&A, support assistant) will consume — no work duplicated.

### 3.15 Permissions and role-based access

The gateway is the enforcement point for who can invoke which agent and over which data.

- Every `LlmClient.run` call requires a `principal` (the Clerk user, with role + organization).
- Each agent declares `allowedRoles: UserRole[]` and `scopeRule: 'self' | 'organization' | 'admin-only'`.
- The gateway throws `ForbiddenException` if the principal lacks the role or attempts cross-tenant data (e.g. a daycare requesting an explanation for a candidate not in their own shortlist).
- Service-internal calls (BullMQ workers running on behalf of a user) pass the original principal through job metadata; no "system god mode" account.
- **Reuses existing `@Roles()` decorator pattern** from `api/src/auth/` — same primitive that already guards REST endpoints, applied at the agent layer.

This matters more than it looks: it's the only thing that prevents a curious daycare admin from prompting "summarise candidate X" where X is outside their pool, or a parent-side feature later from accessing recruitment data.

### 3.16 Safety and compliance guards

Three concrete enforcement points in the gateway:

1. **Sensitive-field strip list.** Static set of forbidden field names (age, nationality, race, health, religion, family status, photo URLs, etc.). The gateway scans every agent's resolved input against this list at request build time and refuses the call. A CI check additionally rejects any prompt template that references a forbidden field by name.
2. **Output safety classifier.** A cheap downstream check on user-facing prose outputs (reactivation rewrite, job ads) that flags clearly inappropriate content. Failure routes to admin review rather than user.
3. **Consent gate.** For any agent that reads a `User` profile, the gateway checks for an active `CandidateConsent` row before the call. No consent → no LLM call, with a templated empty-state message returned to the caller.

All three are gateway-level, not per-agent, so feature teams can't accidentally skip them.

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

## Layer 1 — Shared AI Foundation

### Phase 0 — AI Foundation (3 weeks, single deliverable)

**Goal:** Land the entire shared AI Foundation in one focused effort. No user-visible features yet. Every subsequent phase consumes this layer; no phase rebuilds any part of it.

The phase ships eight capabilities, each independently demonstrable but built together because they share the same module boundary:

**0.A — AI Gateway / intermediary**

- Module `api/src/ai/` with `LlmClient.run({agent, input, schema, locale, principal, cacheKey?})` as the only public surface.
- Agent registry (`api/src/ai/agents/<name>/`) — one folder per agent: `index.ts` (definition), `prompt.vN.ts` (versioned template), `schema.ts` (Zod), `fixtures/` (eval golden cases).
- ESLint rule + CI check forbidding LLM SDK imports and any direct HTTP calls to `openrouter.ai`, `api.voyageai.com`, `generativelanguage.googleapis.com`, or `api.anthropic.com` outside `api/src/ai/`.
- One health-check agent shipped as the proof-of-life: `echo-validate` (round-trips a tiny JSON object through OpenRouter against three different models to prove the abstraction).

**0.B — Model routing with fallback chain**

- One OpenRouter adapter: `api/src/ai/providers/openrouter.adapter.ts` (OpenAI-compatible Chat Completions client).
- One Voyage embedding adapter: `api/src/ai/providers/voyage.adapter.ts` (used by `EmbeddingClient` only — never invoked from feature modules).
- Per-agent model chain config in `ai-agents.config.ts` (primary slug → secondary slug → tertiary slug). Chains are passed to OpenRouter as a `models` array; OpenRouter handles transient fallback.
- Application-level circuit breaker for OpenRouter-itself outages, opening after N consecutive 5xx and routing to templated fallback during the cooling period.
- `AiAuditLog.modelUsed` records the slug OpenRouter actually returned; `AiAuditLog.fallbackUsed` records whether the primary was bypassed.

**0.C — Prompt template registry + versioning**

- Versioned prompt files (`prompt.v1.ts`, `prompt.v2.ts`, …) — no inline strings.
- `AiAgentConfig` table holds the active version per environment + per foundation.
- Eval harness (Jest) runs every agent's `fixtures/` on PRs that touch its directory. Regression fails CI.
- `AiAuditLog.promptVersion` records the exact version used.

**0.D — RAG / knowledge retrieval**

- `KnowledgeDocument` table with pgvector column, metadata (source, cantonScope, locale, audience, version).
- Curated static knowledge under `api/src/ai/knowledge/` (Markdown): role taxonomy, canton equivalence map, internal status glossary. Re-embedded on commit via a build step.
- `LlmClient.retrieve({query, scope, k, principal})` — hybrid BM25 + vector, principal-scoped, returns top-k passages.
- Agents declare `retrieval` in their config; gateway injects passages as a tagged section, never concatenated into user input (prompt-injection safety).
- `AiAuditLog.retrievedDocIds` records what was provided.

**0.E — Logging + audit trail**

- `AiAuditLog` (append-only): `agentName`, `promptVersion`, `model`, `fallbackUsed`, `inputHash`, `outputHash`, `tokenUsage`, `latencyMs`, `costUsd`, `principalId`, `organizationId`, `retrievedDocIds[]`, `cacheHit`, `entityRef`, `createdAt`.
- `AiAgentRun` for multi-step orchestrations (parse → retrieve → match → explain): groups child `AiAuditLog` rows under one parent.
- Sentry breadcrumbs with `ai.agent` tag.
- Retention policy aligned with Swiss data-protection norms (configurable; default 24 months).

**0.F — Permissions / role-based access**

- Every gateway call requires a `principal` (Clerk user + role + org).
- Agents declare `allowedRoles` and `scopeRule` (`self` / `organization` / `admin-only`).
- Gateway throws `ForbiddenException` on role mismatch or cross-tenant access attempt.
- Reuses existing `@Roles()` patterns from `api/src/auth/`.

**0.G — Cost tracking + budgets**

- `model-costs.ts` — single source of truth for per-provider per-token pricing.
- Every audit-log row priced at write time (`costUsd`).
- Daily token budgets per agent and per foundation, enforced at gateway call time.
- Soft-warn at 70%, hard-fail at 100% with a templated fallback contract per agent (e.g. explanation agent returns the structured score breakdown without prose).
- Admin dashboard tile: cost per foundation per day, with anomaly flag on >25% drift from 7-day baseline.

**0.H — Safety + compliance**

- Sensitive-field strip list enforced at request-build time (age, nationality, race, health, religion, family status, photo URL, etc.).
- CI prompt-template linter rejects forbidden field references.
- `CandidateConsent` table + gateway pre-check on any agent reading a `User` profile.
- Output safety classifier on user-facing prose; failures route to admin review.

**Cross-cutting infra delivered in this phase:**

- Prisma migrations: enable `vector`, `cube`, `earthdistance` extensions; create `AiAuditLog`, `AiAgentRun`, `AiAgentConfig`, `AiResultCache`, `KnowledgeDocument`, `CandidateConsent`.
- New BullMQ queues: `ai.exec` (generic gateway-call worker), `ai.embed` (embedding generation), `ai.geocode`. Staffing-specific queues land in Phase 1.
- Geocoding worker (Swisstopo primary, Mapbox fallback). Backfill of existing `User`/`Organization` rows runs as part of the phase.
- Feature flags: `ai_foundation_enabled` (master kill switch), then per-engine flags added in their own phases.

**Exit criteria:**
1. `LlmClient.run(...)` works end-to-end with primary, secondary, and tertiary providers all reachable.
2. Eval harness green on the health-check agent across three distinct OpenRouter model slugs (Gemini Flash, DeepSeek Chat, Claude Sonnet) — proves the gateway is genuinely model-agnostic.
3. RAG retrieval returns role-taxonomy passages for a sample query, scoped to a test principal.
4. Audit log captures token usage, cost, principal, prompt version, retrieved docs, and fallback flag on every call.
5. Geocoding backfill complete for all existing users and organizations.
6. Daily budget hard-fail demonstrated against a synthetic agent.

---

## Layer 2 — AI Staffing Engine

The Staffing Engine is the first consumer of the foundation. Each agent below is a thin definition in `api/src/ai/agents/staffing-*/` — no new gateway features, no new providers, no new compliance plumbing. Phases run roughly sequentially but can overlap once the foundation is in.

### Phase 1 — Internal Matching MVP (3 weeks)

**Goal:** A daycare types a free-form request and sees a ranked shortlist with explanations. Internal pool only.

- **Staffing schema migrations** (additive on top of the foundation): create `StaffingRequest`, `MatchResult`, `EducatorEmbedding`, `StaffingRequestEmbedding`, `ReactivationCampaign` (Phase 3), `ExternalPosting` (Phase 4), `ExternalApplicant` (Phase 4). Add columns to `User`/`JobListing`/`JobApplication` per §4.3.
- New staffing-specific BullMQ queues: `staffing.parse-request`, `staffing.match`, `staffing.explain`, `staffing.embed-profile`, `staffing.embed-request`.
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

## Beyond Layer 2 — future engines on the same foundation

These are out of scope for this plan but called out so the foundation isn't accidentally narrowed to staffing-only:

| Engine | Foundation pieces it would reuse | Net-new work |
|---|---|---|
| Parent-lead qualification | Gateway, parser pattern, model routing, audit, cost | One agent definition; lead-specific schema |
| Support assistant for daycares | RAG (canton policies), permissions, fallback chain, safety classifier | Knowledge ingestion of support docs; one chat agent |
| Marketplace listing moderation | Structured output, audit, safety classifier | One classifier agent |
| Policy Q&A (consumer of `CantonSource`) | RAG, principal scoping | Crawled-doc ingestion pipeline |
| E-learning quiz generator | Model routing, cost budgets per foundation | One agent + lesson-content retrieval |

Each is a single agent definition under `api/src/ai/agents/<name>/` plus a thin feature module. None requires touching the gateway.

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
| Cost overruns from per-search LLM calls | OpenRouter as unified provider with Gemini Flash / DeepSeek slugs as default for all agents (§3.1); deterministic SQL+score before any model call (§3.3, §3.9); templates instead of LLM for repeated text (§3.10); persistent `AiResultCache` keyed by content hash; provider-level prompt caching forwarded by OpenRouter; daily token budget per agent and per foundation with hard-fail to templated fallback (§3.11); OpenRouter account-level monthly cap as a backstop. |
| OpenRouter outage or rate-limit | Native OpenRouter `models` array provides transparent provider-level fallback; application-level circuit breaker opens on consecutive 5xx and routes to templated fallback during cooling period (§3.12); embeddings path is independent (Voyage direct) so profile-indexing degrades separately from chat. |
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

1. **Embedding provider** — Voyage `voyage-3-lite` is the default proposal (multilingual, OpenAI-compatible, cheap, single direct integration since OpenRouter does not broadly cover embeddings). Gateway abstraction (`EmbeddingClient`) makes the choice reversible if OpenRouter adds embedding support later.
2. **Geocoding provider** — Swisstopo is free and Swiss-accurate but rate-limited; Mapbox is paid but global. Suggest Swisstopo with Mapbox fallback.
3. **Job-Room credentials** — Application timing affects Phase 5 sequencing. Should be requested in Phase 0.
4. **Pricing of the AI Assistant tier** — needs commercial input before Phase 1 GA. Build doesn't block on it.
5. **Multilingual quality bar** — Swiss-German vs. German for the DACH region. Recommend Gemini Flash for first-month pilot with a small human-review queue; escalate the job-ad agent (only that one) to Gemini Pro or Claude Sonnet via config if review-queue rework rate exceeds 20%.
6. **OpenRouter routing options** — OpenRouter supports provider preferences (`provider.order`, `provider.allow_fallbacks`, data-policy filters). For Swiss-region latency and data-residency, Phase 0 should configure provider preferences to favour EU-routed inference where the model supports it (Gemini via Google's EU regions, Anthropic via EU endpoints). DeepSeek is China-routed and may be excluded from agents touching personal data — this is a per-agent config decision, not a code change.
