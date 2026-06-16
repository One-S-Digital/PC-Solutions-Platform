# AI Staffing — Manual Tasks vs. Build Plan

This document separates work that requires human action outside the codebase
(accounts, env vars, legal, content, commercial agreements) from work that is
part of the direct software build. It is the checklist the team works through
alongside the phased build in `AI_STAFFING_INTEGRATION_PLAN.md`.

---

## Quick overview

```
Manual tasks            →  accounts, keys, env vars, legal, content, commercial
Build                   →  all code, migrations, config files, tests, UI
```

Everything in the build section is in `AI_STAFFING_INTEGRATION_PLAN.md`
broken into phases. This document only lists the things that are **not code**.

---

## Section A — Pre-Phase 0 (must be done before any build starts)

These block Phase 0 (the AI Foundation). Nothing can be wired up without them.

### A.1 — AI model provider accounts and API keys

**Who:** Platform lead / infra
**Lead time:** Minutes (instant approval)

All chat/completion models are accessed through **OpenRouter** — a unified OpenAI-compatible API that proxies to Google, Anthropic, DeepSeek, Mistral, Meta, and others behind a single key. This replaces the need for direct Google/DeepSeek/Anthropic accounts.

| Provider | What to do | Notes |
|---|---|---|
| **OpenRouter** | Create account at [openrouter.ai](https://openrouter.ai) → settings → API keys → create key | One key covers Gemini 2.5 Flash, Gemini Pro, Claude Sonnet, DeepSeek-V3, and every other model we route to. Pay-as-you-go via account credits. |
| **Voyage AI** (embeddings only) | Create account at [voyageai.com](https://www.voyageai.com) → dashboard → API keys → create key | OpenRouter does not broadly cover embeddings; Voyage is the dedicated embeddings provider (`voyage-3-lite` multilingual). One direct dependency. |

After getting keys, add to Render environment as:
```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_APP_NAME=procreche-staffing            # OpenRouter recommends sending an X-Title for traffic attribution
OPENROUTER_SITE_URL=https://procreche.ch          # OpenRouter recommends sending an HTTP-Referer for traffic attribution
VOYAGE_API_KEY=...
```

**Optional OpenRouter configuration to do during account setup:**

- **Provider preferences for data residency.** In OpenRouter account settings → privacy/data, set "Only use providers that comply with data policies" and prefer EU-hosted inference where available. This is the recommended posture for Swiss personal data handling.
- **Allowed providers list.** If you want to exclude DeepSeek from agents touching personal data, configure it on the OpenRouter dashboard's provider preferences (or per-request in code — both work). The plan defaults to including DeepSeek as a secondary; revisit after Phase 0.
- **Account-level spending limit.** OpenRouter dashboard → settings → set a hard monthly spending cap. This is the backstop if our in-app per-foundation budgets ever fail. Suggested initial cap: $50/month.

### A.2 — Geocoding provider accounts

**Who:** Platform lead / infra
**Lead time:** Swisstopo is instant; Mapbox takes minutes

| Provider | What to do | Notes |
|---|---|---|
| **Swisstopo Geo Admin API** | Review terms at [api3.geo.admin.ch](https://api3.geo.admin.ch) — no registration required for basic use | Primary geocoder; free; Swiss postal codes are accurate here; check rate limits for production batch backfill |
| **Mapbox** | Create account at [mapbox.com](https://mapbox.com) → create public token | Fallback only; free tier is generous (100k requests/month); needed if Swisstopo rate-limits during backfill |

Add to Render:
```
MAPBOX_API_KEY=...
```

### A.3 — Enable Postgres extensions on production

**Who:** Infra / whoever manages the Render Postgres instance
**Lead time:** Minutes — done via Render dashboard or direct DB connection

Three extensions must be enabled on the production Postgres instance:

```sql
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector (embeddings)
CREATE EXTENSION IF NOT EXISTS cube;            -- required by earthdistance
CREATE EXTENSION IF NOT EXISTS earthdistance;   -- haversine distance queries
```

Check that the Render Postgres version is ≥ 15 (pgvector is available on Render
Postgres 14+). If the current plan does not support pgvector, upgrade the plan
before Phase 0 migrations run.

**Action:** Confirm the Postgres version and plan tier, then run the three
`CREATE EXTENSION` statements manually before the first Phase 0 migration.

### A.4 — Confirm Redis is provisioned on production

**Who:** Infra
**Lead time:** Minutes if already on the Render account

The codebase conditionally enables BullMQ only if `REDIS_ENABLED=true`. For
AI background jobs to work in production, Redis must be live.

**Action:** Check whether a Redis instance exists on the Render account. If not,
add one (Render offers managed Redis). Then confirm:
```
REDIS_URL=...
REDIS_ENABLED=true
```
are set in the production Render environment.

---

## Section B — Phase-gated manual tasks

These must be done before the specified phase can go live.

### B.0 — Required before Phase 0 completes

**B.0.1 — Set billing limits on OpenRouter and Voyage**
**Who:** Platform lead / finance
**What:** Log into OpenRouter and Voyage and set account-level monthly spend
caps. This is separate from the per-foundation budget enforcement in code — it
is the provider-side safety net if code budgets fail.

Suggested initial caps:
- OpenRouter: $50/month combined for all chat/completion models (adjust after first 30 days of real usage data)
- Voyage AI: $20/month for embeddings (Voyage is cheap — even with full profile re-embedding this is generous)

Also: top up OpenRouter credits manually before Phase 0 deploy. OpenRouter is
pay-as-you-go from a prepaid balance, so an empty balance means hard-stop
errors — not a soft warning. Suggested initial credit: $20.

**B.0.2 — Decide per-foundation daily token budget**
**Who:** Product / commercial
**What:** The code enforces a hard daily budget per foundation and per agent
(§3.11 in the integration plan). Engineering needs a number to configure as the
default. This is a product/commercial decision, not a technical one.

Input needed: "What is the maximum daily AI spend we want a single foundation to
trigger at launch?" Expressed as a cost figure; engineering converts to token
counts per model.

### B.1 — Required before Phase 1 goes live (Internal Matching)

**B.1.1 — Curate the Role Taxonomy knowledge document**
**Who:** Subject-matter expert (someone who knows Swiss childcare roles) + content
**What:** Write the canonical role taxonomy Markdown file stored at
`api/src/ai/knowledge/role-taxonomy.md`. This is the ground truth the Request
Parser and Match Explanation agents retrieve from RAG.

Minimum content required:
- Each role name in French, German, and English
- Formal definition (2–3 lines)
- Typical diploma/qualification expected
- Equivalences across cantons (e.g. "Auxiliaire" in Vaud ≈ "Assistante en institution" in Geneva)
- Common abbreviations

**Why this cannot be written by engineering:** accuracy on Swiss childcare
qualifications matters legally and professionally. A wrong equivalence leads to
bad matches. This document is reviewed and approved by someone with domain
expertise, then checked in as code.

**B.1.2 — Curate the Canton Staffing Rules knowledge document**
**Who:** Subject-matter expert / legal
**What:** Write `api/src/ai/knowledge/canton-rules.md` covering per-canton rules
that affect job-ad generation and matching.

Minimum needed for Phase 1:
- Child-to-staff ratios per age group per canton
- Diploma requirements per role per canton (some cantons accept equivalences, others do not)
- Language requirements where legally mandated

This is used by the job-ad generator (Phase 4) and optionally by the match
explanation agent to surface compliance notes.

**B.1.3 — Legal review of consent language**
**Who:** Legal
**What:** The `CandidateConsent` flow requires consent text that is nDSG-compliant
(Swiss Federal Act on Data Protection). Engineering builds the consent gate and
the DB record; legal must draft and approve the actual consent wording before
the flow goes live.

Minimum items to cover:
- Scope of matching (I consent to be matched with daycare requests)
- Scope of sharing (I consent to my shortlisted profile being visible to a foundation)
- Contact permission (I consent to be contacted about relevant roles)
- Retention period (how long the profile is kept after inactivity)
- Withdrawal mechanism (how to remove consent, what happens to existing matches)

**B.1.4 — Decide pilot scope for Phase 1 soft launch**
**Who:** Product / commercial
**What:** Phase 1 goes live behind a feature flag (`ai_internal_matching`).
Engineering needs to know which foundation accounts get the flag enabled first.
This is a product decision.

### B.2 — Required before Phase 2 goes live (CV Parsing)

**B.2.1 — Define the sensitive-field strip list (final)**
**Who:** Legal / DPO
**What:** The gateway enforces a compile-time strip list of forbidden field names
before any profile data reaches a model (§3.16). The plan proposes: age, date of
birth, nationality, race, health conditions, religion, family status, photo URLs,
and ID document numbers. Legal/DPO should confirm this is the correct set under
Swiss law (nDSG) and add anything missing.

**B.2.2 — Set data retention policy**
**Who:** Legal / DPO
**What:** The audit log default retention is 24 months (§3.8 / §0.E in the
integration plan). Legal must confirm this is appropriate under nDSG, or specify
the required period. Engineering configures it; legal defines it.

### B.3 — Required before Phase 3 goes live (Reactivation)

**B.3.1 — Review reactivation message templates**
**Who:** Content / legal
**What:** Per-locale (fr-CH, de-CH, en) and per-role-archetype Handlebars
templates are the default reactivation path — no model call. A human must review
and approve these templates before they send to real candidates.

Deliverable: approved .hbs template files per locale. Engineering creates the
scaffolding; content fills and reviews the copy.

**B.3.2 — Decide reactivation frequency cap**
**Who:** Product
**What:** The plan enforces a maximum of N reactivation outreaches per candidate
per rolling 30 days. Engineering needs a number. Also: should the candidate be
able to set their own preference (e.g. "contact me at most once a week")?

### B.4 — Required before Phase 4 goes live (External Routing — Manual)

No external API accounts are needed for Phase 4 (manual/template routing). But:

**B.4.1 — Set up UTM / tracking link domain**
**Who:** Marketing / infra
**What:** All external apply links route through `apply.procreche.ch/:slug` (or
equivalent subdomain). This subdomain must be configured in DNS and the Render
routing before the capture landing page goes live. Engineering builds the
redirector; infra/DNS sets up the subdomain.

**B.4.2 — Decide apply-link domain name**
**Who:** Product / marketing
**What:** Is it `apply.procreche.ch`, `/jobs/:slug/apply` on the main domain, or
something else? Affects SSL cert provisioning and Clerk's allowed-redirect URLs.
Needs to be decided before Phase 4 development begins.

### B.5 — Required before Phase 5 goes live (External APIs)

These involve external commercial and government relationships with uncertain
timelines. Start all three in parallel as early as possible — ideally during
Phase 2 or Phase 3 of the build.

**B.5.1 — JobCloud: commercial agreement + feed registration**
**Who:** Commercial / platform lead
**What:** JobCloud's XML feed model requires:
1. A commercial agreement with JobCloud (their sales team) to get feed credentials
2. Providing them with the feed URL once the endpoint is built
3. Agreeing on publication scope (jobs.ch, jobup.ch, JobScout24 — each may be separate)

**Timeline risk:** Commercial agreements can take weeks. Start this conversation
during Phase 3 so credentials are ready when Phase 5 build completes.

Note: Engineering builds the feed endpoint independently of this. The endpoint
can be tested with a stub consumer before JobCloud activates it.

**B.5.2 — Job-Room (arbeit.swiss): apply for API credentials**
**Who:** Platform lead
**What:** Job-Room's Jobs API is a government-controlled system. Access credentials
must be applied for separately. There is no self-serve signup.

Action: Submit a credential request to SECO (State Secretariat for Economic
Affairs) or the Job-Room technical team. Provide platform description, intended
use, and expected posting volume.

**Timeline risk:** Government credential processes can take 1–3 months. This
should be initiated no later than Phase 2 of the build.

Once credentials arrive: provide `JOB_ROOM_CLIENT_ID` and `JOB_ROOM_CLIENT_SECRET`
as Render environment variables.

**B.5.3 — Indeed: employer account + Job Sync API access**
**Who:** Platform lead / commercial
**What:**
1. Create an employer account at [indeed.com/hire](https://indeed.com/hire)
2. Apply for Job Sync API access through Indeed's partner program
3. Review and accept Indeed's publisher agreement

Once approved: `INDEED_API_KEY` + `INDEED_EMPLOYER_ID` to Render env.

Note: Indeed's API approval is faster than Job-Room but still not instant.
Initiate during Phase 3.

**B.5.4 — (removed — Voyage AI is now a Phase 0 dependency, see §A.1)**

### B.6 — Required before Phase 6 goes live (Intelligence)

**B.6.1 — Swiss-German job-ad quality review process**
**Who:** Content / a German-speaking subject-matter expert
**What:** Swiss-German output quality from Gemini Flash is TBD until Phase 5 pilots.
Before Phase 6 rolls out the weekly intelligence narrative in German, establish
a lightweight review process: who reviews, how quickly, what the threshold is
for escalating to a stronger model.

---

## Section C — Ongoing manual operations (not one-time)

These are not build tasks or one-time setups. They are part of running the system.

| Task | Who | Frequency | Notes |
|---|---|---|---|
| Monitor OpenRouter credit balance + auto-top-up | Infra | Weekly | OpenRouter is prepaid; an empty balance is a hard-stop. Enable auto-top-up on the OpenRouter dashboard once usage patterns stabilise. |
| Monitor OpenRouter + Voyage billing dashboards | Infra | Weekly until stable | Cross-check against in-app cost tracking; provider billing lags by minutes (OpenRouter is near-real-time) |
| Review admin AI audit log for anomalies | Platform lead | Weekly | The admin dashboard surfaces >25% token drift; investigate when flagged |
| Review failed output-safety-classifier hits | Admin team | Daily when live | Failures route to admin review queue; someone must clear them |
| Update role taxonomy knowledge doc | Domain expert | When Swiss childcare roles change | Re-embedding triggered automatically on commit |
| Update canton rules knowledge doc | Legal / domain expert | When cantonal regulations change | Same as above |
| Approve external job posts before publication | Admin | Per post | External posts require admin approval until auto-approve flag is enabled |
| Review reactivation templates for tone | Content | Quarterly | Templates are static; a human sense-check catches drift from brand voice |
| Monitor Job-Room / JobCloud posting status | Admin | Weekly | External adapters track status; anomalies surface on the external channels dashboard |
| Review German output quality sample | German-speaking reviewer | Monthly in Phase 5 pilot | Small random sample; if rework rate is <20%, escalation flag stays off |
| Roll feature flags for new foundations | Admin / product | On onboarding | `ai_internal_matching` etc. are per-foundation; must be turned on for each new pilot |

---

## Section D — What is part of the direct build

Everything below is engineering work tracked in `AI_STAFFING_INTEGRATION_PLAN.md`.
Listed here as a summary so the manual tasks document is self-contained.

### Phase 0 — Shared AI Foundation

- `api/src/ai/` module: gateway, model routing, OpenRouter chat adapter, Voyage embedding adapter, application-level circuit breaker for OpenRouter outages
- Prisma migrations: pgvector/cube/earthdistance extensions, all new tables (AiAuditLog, AiAgentRun, AiAgentConfig, AiResultCache, KnowledgeDocument, CandidateConsent)
- Prompt template registry, versioning config, eval harness (Jest)
- RAG retrieval service (hybrid BM25 + vector, principal-scoped)
- Knowledge document ingestion pipeline (Markdown → chunk → embed → store)
- Geocoding worker (Swisstopo primary, Mapbox fallback), backfill job
- Cost tracking: `model-costs.ts`, per-call pricing, budget enforcement, anomaly alert
- Safety/compliance: sensitive-field strip-list (values from B.2.1), consent gate, output classifier
- ESLint rule + CI check enforcing `api/src/ai/` module boundary
- Feature flag `ai_foundation_enabled`

### Phase 1 — Internal Matching

- Staffing-specific schema migrations (StaffingRequest, MatchResult, EducatorEmbedding, etc.)
- BullMQ queues: `staffing.parse-request`, `staffing.match`, `staffing.explain`, `staffing.embed-*`
- Request Parser agent (Gemini Flash, Zod schema, canton list + role taxonomy + age groups)
- Hybrid Matcher service (SQL hard filters → weighted rule score → vector tiebreaker)
- Match Explanation agent (Gemini Flash, 80-word ceiling, JSON output)
- Replace `findMatchingCandidates` stub in `recruitment.service.ts`
- New `staffing` module: `POST /staffing/requests`, `GET /staffing/requests/:id/matches`
- Foundation shortlist UI (staffing-request box + ranked candidate table with explanations)
- Admin observability page: AI agent runs

### Phase 2 — CV Parsing + Profile Enrichment

- CV parsing pipeline (`pdf-parse`, `mammoth`, Gemini Flash agent, Zod schema)
- `CandidateExperience` and `CandidateCertification` table migrations
- Educator profile confirmation flow (parser pre-fills → educator confirms)
- Availability columns migration and UI update
- Profile completeness score (deterministic, not AI)
- Profile embedding worker

### Phase 3 — Reactivation

- Reactivation template engine (Handlebars, fr-CH / de-CH / en, per role-archetype)
- `ReactivationCampaign` table + service
- Quiet-hours + frequency-cap enforcement in BullMQ worker
- Response tracking (tokenised links → `MatchResult.candidateResponse`)
- Optional tone-rewrite agent (Gemini Flash, 100-word ceiling, only on explicit request)
- Feedback signal (declined / no-response → de-weight for same daycare)

### Phase 4 — External Routing (Manual)

- Job-Ad Generator agent (Gemini Flash, fr/de/en variants, short + full, admin-approve step)
- External Routing Recommender agent (Gemini Flash, 3-bullet output)
- Manual partner channel workflow (copy variants, tracked short-link generator, UTM)
- `ExternalPosting`, `ExternalApplicant` table migrations
- Apply capture landing page (`/jobs/:slug/apply`, Clerk-light, CV upload + AI pre-fill)
- Source attribution on `JobApplication` (sourceChannel, sourceCampaign)
- Admin "External Channels" dashboard section

### Phase 5 — External APIs

- `api/src/external-channels/` module with `ExternalJobChannelAdapter` interface
- JobCloud XML feed adapter (tokenised endpoint, auto-remove on status change)
- Job-Room API adapter (requires credentials from B.5.2)
- Indeed Job Sync adapter (screener questions, apply-with-Indeed capture)
- Per-adapter contract tests against recorded fixtures
- External posting status tracking, cost-per-applicant attribution

### Phase 6 — Staffing Intelligence

- Materialised views: requests/canton/month, fill rate, time-to-shortlist, source performance
- Demand heatmap agent (Gemini Flash, weekly cron, 400-word ceiling)
- Predictive replacement flag (simple regression, not LLM)
- Admin KPI dashboard tiles replacing generic count cards

---

## Dependency map

```
Manual A.1 (OpenRouter + Voyage) → unblocks Phase 0 build
Manual A.2 (geocoding keys)      → unblocks Phase 0 geocoding worker
Manual A.3 (Postgres extensions) → unblocks Phase 0 migrations
Manual A.4 (Redis prod)          → unblocks Phase 0 BullMQ workers

Manual B.0.1 (billing caps)      → must be done before Phase 0 deploys to prod
Manual B.0.2 (budget numbers)    → must be done before Phase 0 deploys to prod

Manual B.1.1 (role taxonomy)     → unblocks Phase 0 RAG ingestion (needed for Phase 1)
Manual B.1.2 (canton rules)      → needed for Phase 4 job-ad generator
Manual B.1.3 (consent copy)      → unblocks Phase 1 go-live
Manual B.1.4 (pilot scope)       → needed to enable Phase 1 flags

Manual B.2.1 (strip list)        → configures Phase 0 safety gate
Manual B.2.2 (retention period)  → configures Phase 0 audit log

Manual B.3.1 (templates)         → unblocks Phase 3 go-live
Manual B.3.2 (freq cap number)   → configures Phase 3 cap

Manual B.4.1 (subdomain DNS)     → unblocks Phase 4 capture page
Manual B.4.2 (apply domain)      → must be decided before Phase 4 dev starts

Manual B.5.1 (JobCloud)          → start during Phase 2, needed for Phase 5.1
Manual B.5.2 (Job-Room)          → start during Phase 2, needed for Phase 5.2
Manual B.5.3 (Indeed)            → start during Phase 3, needed for Phase 5.3
```

---

## Environment variables checklist

All variables that must be set on Render before going live, by phase:

**Before Phase 0 deploys:**
```
OPENROUTER_API_KEY                 # all chat/completion models, one key
OPENROUTER_APP_NAME=procreche-staffing
OPENROUTER_SITE_URL=https://procreche.ch
VOYAGE_API_KEY                     # embeddings only
MAPBOX_API_KEY                     # geocoding fallback (Swisstopo is primary, no key)
REDIS_URL
REDIS_ENABLED=true
```

**Before Phase 5.1 (JobCloud):**
```
JOBCLOUD_FEED_TOKEN          # generated by us, given to JobCloud
JOBCLOUD_FEED_SIGNING_SECRET # generated by us
```

**Before Phase 5.2 (Job-Room):**
```
JOB_ROOM_CLIENT_ID
JOB_ROOM_CLIENT_SECRET
JOB_ROOM_API_URL
```

**Before Phase 5.3 (Indeed):**
```
INDEED_API_KEY
INDEED_EMPLOYER_ID
```

**Removed by the OpenRouter switch (no longer needed):**
```
GEMINI_API_KEY                     # superseded by OPENROUTER_API_KEY
DEEPSEEK_API_KEY                   # superseded by OPENROUTER_API_KEY
ANTHROPIC_API_KEY                  # superseded by OPENROUTER_API_KEY
```
