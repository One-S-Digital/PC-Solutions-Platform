# Signup Diagnostics

A durable, queryable trace of every signup, built to answer one question without
guesswork: **why did this account end up in the incomplete list instead of the
review queue?**

---

## Why this exists

Two rounds of fixes (PR #679, PR #680) closed real data-loss paths, and an
educator still landed in Incomplete on 12/09. That was not necessarily a failed
fix — it was that nothing recorded enough to tell the difference between the
possible causes, which need opposite responses:

| Cause | Where it happens | What it means |
|---|---|---|
| Educator never came back to step 3 | browser | drop-off, not a bug |
| Step-3 draft was lost and they gave up | browser | persistence bug |
| Submit was pressed and all 5 retries failed | browser → API | backend/connectivity bug |
| Submit arrived but carried no bio and no CV | API | form/DTO bug |
| Profile was submitted, then emptied later | API | the revert guards firing as designed |
| Webhook carried no role, so no account exists | webhook | metadata bug (or normal OAuth) |

Before this, all six produced the same visible outcome and no stored evidence.
The API logs to a Winston **console** transport only (`api/src/common/logger.service.ts`),
so nothing survived a redeploy, and step 3 lives entirely in the browser until
the final PATCH — a user who abandons or errors out left no server-side trace at
all.

---

## Does fixing educators fix every role?

**No — and the two failure modes are different, so both are instrumented.**

Educators are the only role with a **two-phase signup**:

```
Educator      step 1 role → step 2 account (webhook creates User as INCOMPLETE)
              → step 3 profile (PATCH promotes to PENDING_REVIEW) → done
Every other   step 1 role → step 2 account (webhook creates User AND applies the
role          whole signup form in the same transaction) → done
```

`frontend/pages/SignupPage.tsx` renders four steps for educators and three for
everyone else. Because a Parent, Foundation, Supplier or Service Provider is
finished the moment the webhook commits, **they can never appear in the
incomplete list** — `INCOMPLETE` only exists on `EducatorApprovalStatus`.

They are not immune, though. They share the first phase, where a different
symptom comes from the same class of bug: if `unsafe_metadata` does not survive
the trip to Clerk, the webhook either skips account creation entirely (no role
found) or creates a user with no organisation, no capacity, no category. That is
exactly what commit `bec7474` fixed — silent field loss rather than a stuck
status.

So the instrumentation is split accordingly:

- **All roles** — the shared spine: webhook receipt, which metadata slot carried
  the role, account creation, and a presence map of every step-2 field that
  survived. Cheap, and it makes a Foundation losing its capacity as visible as an
  educator losing their bio.
- **Educators only** — the second phase: step-3 entry, draft save/restore/miss,
  each submit attempt and retry, final failure, abandonment, and the
  server-side promotion verdict.

The admin funnel table shows started / account created / profile submitted per
role, so the next time something looks wrong the educator-vs-everyone question
is answered by looking rather than by reasoning.

---

## Where the logs are stored

**Primary: a Postgres table, `signup_event_logs`** (`SignupEventLog` in
`api/prisma/schema.prisma`, migration `20260916000000_add_signup_event_log`).

Chosen over the alternatives because a signup spans three processes that never
share a request — the browser wizard, the Clerk webhook, and the authenticated
PATCH — and console lines from those three cannot be stitched back together
after the fact, nor do they survive the next deploy. The table is:

- **durable** — survives restarts and redeploys, unlike the console transport;
- **queryable** — "show me this email's timeline" is one indexed lookup;
- **joinable** — a correlation id links all three processes into one story.

The table deliberately has **no foreign key to `User`**: rows are written before
the user exists, and must survive the user being deleted — "the account was
never created" is itself a finding.

**Secondary: the console.** Every event also emits one structured
`[signup-trace]` line through the existing Winston logger, so live tailing on
the host still works. The console copy is written *before* the DB insert, so a
failing insert cannot hide the event it was trying to record.

**Not stored anywhere else.** No third-party sink, no log file on disk (which a
container redeploy would lose anyway).

### What a row holds

`correlationId`, `event`, `stage`, `source`, `outcome`, `role`, `userId`,
`clerkId`, `email`, `approvalStatusBefore/After`, `detail` (JSONB), `errorCode`,
`errorMessage`, `ipAddress`, `userAgent`, `createdAt`.

`detail` holds **presence flags and counters only** — `hasShortBio: true`,
`attempt: 3`, `status: 503`. Never the text the user typed.
`SignupLogService.sanitizeDetail` enforces this: objects are dropped, arrays
collapse to their length, strings are truncated to 500 chars, and the key count
is capped at 40. This is both a privacy control and what keeps the table cheap
enough to retain.

### Retention

**90 days**, then deleted by a nightly purge (`signup-log.scheduler.ts`, 04:00).
Override with `SIGNUP_LOG_RETENTION_DAYS`. The window is what makes keeping
email and IP defensible: the data has a purpose that expires.

Set `SIGNUP_LOG_ENABLED=false` to switch the trace off. It is **opt-out** by
design — a diagnostic nobody remembered to enable is how this bug got a second
undiagnosed round.

---

## The correlation id

This is the linchpin. Without it there are three disconnected piles of rows.

1. Minted in the browser when a role is chosen on step 1
   (`frontend/utils/signupTrace.ts`), stored in `localStorage` so it survives a
   reload, a tab close and the email round-trip.
2. Passed to Clerk in `unsafe_metadata.signupCorrelationId`, so the
   `user.created` webhook — a different process with no browser access — stamps
   the same id.
3. Sent on `PATCH /settings/educator` and `POST /users/complete-profile` as the
   `X-Signup-Correlation-Id` header.
4. Re-minted on a fresh signup attempt, so two attempts by the same person do
   not collapse into one misleading timeline.
5. Cleared once the signup completes.

A missing id never drops an event — the row is stored as `unlinked` and remains
findable by email and userId.

---

## Event catalogue

Defined in `api/src/signup-log/signup-log.events.ts`. Named `<source>.<what_happened>`,
past tense, one event per real occurrence.

| Stage | Events |
|---|---|
| WIZARD | `client.wizard_started` |
| ACCOUNT | `client.account_submitted`, `client.verification_sent`, `client.verification_submitted`, `client.account_failed`, `webhook.user_created_received`, `webhook.role_missing`, `webhook.account_created`, `webhook.failed`, `api.complete_profile_received/succeeded/failed` |
| PROFILE | `client.step3_entered`, `client.draft_saved/restored/missing`, `client.profile_submit_attempt/retry/failed/succeeded`, `client.wizard_abandoned`, `api.educator_patch_received`, `api.educator_promoted`, `api.educator_promotion_skipped`, `api.educator_reverted_to_incomplete`, `api.educator_cv_deleted` |
| REVIEW | `admin.educator_approved`, `admin.educator_rejected`, `admin.decision_blocked_incomplete` |
| SYSTEM | `system.stuck_incomplete` |

The three that carry most of the diagnostic weight:

- **`client.wizard_abandoned`** — sent with `navigator.sendBeacon` on `pagehide`
  or a hidden `visibilitychange`, which is the only transport a browser
  guarantees to flush while a page is being torn down. It is the sole trace an
  abandoning user leaves anywhere.
- **`api.educator_promotion_skipped`** — carries *why* the PATCH did not promote:
  `NOT_AN_APPLICATION` (arrived with no bio and no CV — our bug),
  `ALREADY_SUBMITTED_OR_DECIDED` (a later edit — not a failure).
- **`system.stuck_incomplete`** — a daily 05:00 sweep flags educators sitting at
  INCOMPLETE for over 24h, recording whether the profile is empty (drop-off) or
  holds content that failed to promote (our bug). This is what turns "someone
  noticed weeks later" into a dated, attributable event.

---

## Reading the logs

**Admin → Signup Diagnostics** (`/signup-diagnostics`, ADMIN/SUPER_ADMIN only —
the rows carry email, IP and user agent).

- a per-role funnel for the window,
- a journeys list filtered to problems by default,
- a timeline per journey, headed by a plain-language **diagnosis** so nobody has
  to interpret event names to get the answer.

The fastest route: **Educator Approvals → Incomplete tab → "Why incomplete?"**
on any row jumps straight to that account's timeline, across every attempt it
made.

### API

| Endpoint | Purpose |
|---|---|
| `GET /admin/signup-log/journeys?onlyFailed=true&days=30` | one row per journey |
| `GET /admin/signup-log/funnel?days=30` | started vs. completed, by role |
| `GET /admin/signup-log/events?email=…` | raw event search |
| `GET /admin/signup-log/timeline/:correlationId` | one journey |
| `GET /admin/signup-log/user/:userId` | one account, all attempts |
| `POST /signup-log/client-event` | browser beacon (public, rate-limited) |

The beacon endpoint is **public by necessity** — most of the events it accepts
happen before the user has a session, and the abandonment event fires from a
page that is being destroyed. It is made safe by being narrow, not by being
authenticated: the event name must be on a fixed allow-list, the body is
validated and then scrubbed to primitives, and it is rate-limited to 60/min per
IP. Nothing it writes is ever read back as a fact about a user — these rows are
evidence for a human reading a timeline, never an input to authorization.

---

## Guarantees

1. **It cannot break a signup.** Every write is fire-and-forget and every failure
   is swallowed to a warning. A diagnostic that can fail the thing it diagnoses
   is worse than no diagnostic. Covered by tests in
   `api/src/signup-log/signup-log.service.unit.spec.ts`.
2. **It records presence, not content.**
3. **It agrees with the code it describes.** The trace must never report
   `PROMOTED` for a transition that did not happen — a log that disagrees with
   the code is worse than no log. Pinned by a parity test in
   `api/src/settings/educator-submission-notification.unit.spec.ts`.
