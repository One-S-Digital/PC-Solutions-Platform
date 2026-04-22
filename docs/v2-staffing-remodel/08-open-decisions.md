# Open Decisions

Points that need a product / business answer (or a deliberate deferral) before or during implementation. None of these block writing this plan; all of them affect a specific phase.

## D1. Replacement as a new domain, or overloaded on `JobListing`?

- **Recommendation in this plan:** new `ReplacementRequest` + `ReplacementMatch` tables (Phase 3).
- **Alternative:** keep replacement as a `JobContractType.REPLACEMENT` with a new `urgency` field on `JobListing` and reuse `JobApplication` as the fulfilment state machine.
- **Trade-off:** overloaded `JobListing` is simpler to migrate but forces the same 4-stage application lifecycle (`PENDING → REVIEWED → ACCEPTED → REJECTED`) onto time-sensitive replacement shifts. The plan's recommendation assumes replacement needs a **different**, much shorter workflow (matched → offered → confirmed → fulfilled). If the business wants "replacement is just an urgent job", pick the alternative.
- **Who decides:** Product.

## D2. Admin default landing URL

- Today: `ADMIN` / `SUPER_ADMIN` land on user-facing `/admin/content-dashboard` (`frontend/App.tsx:168`).
- Options:
  - (a) Admin SPA URL — requires knowing the deploy URL (env `ADMIN_APP_URL`).
  - (b) `/users/all` in the user SPA — pragmatic if admins mostly live in the user SPA.
  - (c) New `/admin/staffing-signals` page in the user SPA mirroring the admin SPA page.
- **Recommendation:** (a) if admin SPA is exposed to admins routinely; otherwise (c).
- **Who decides:** Product + DevOps.

## D3. Socket channel for notifications

- Extend existing `messaging.gateway.ts` with a `notification.created` event on the user's socket, **or** introduce a new `/notifications` namespace.
- **Trade-off:** reusing the messaging gateway is faster to ship; a dedicated namespace is cleaner long-term.
- **Recommendation:** reuse `messaging.gateway.ts` for now; extract when/if we add other notification transports (mobile push, web push).

## D4. How aggressive is the `job_match` fan-out?

- `STAFFING_MATCH_EMAIL_LIMIT` default. Too high → spam perception, preference opt-outs; too low → candidates miss opportunities.
- **Recommendation:** start at 20, monitor opt-out rates, adjust.
- **Who decides:** Growth / Product.

## D5. Subscription entitlements for staffing features

- Staffing is behind `SubscriptionGatedRoute` today.
- Questions:
  - Is replacement staffing gated at a higher tier?
  - Are admin "staffing signals" free for all admins or tied to enterprise?
  - Should educators' "available for replacement" toggle be free?
- **Plan assumption:** same gate as existing recruitment; no new tiers introduced.
- **Who decides:** Business / Monetisation.

## D6. Availability model finalisation

- `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md` is partially implemented; admin still uses legacy string availability.
- Decision needed: commit to the structured model and deprecate the `availability: String?` legacy field, OR keep both forever and pay the complexity.
- **Recommendation:** commit to structured, write a read-only compatibility shim in the service, deprecate legacy in Phase 7.

## D7. Do admins need their own `Notification` feed?

- The plan introduces `Notification` model for all users.
- **Implicit assumption:** admins also receive notifications (urgent replacement created, support SLA breached, moderation queue spike).
- **Who decides:** Product.

## D8. Messaging deepening for recruiter ↔ candidate

- Conversations exist but are unscoped. Phase 2/3 surfaces "Message candidate" buttons.
- Question: auto-create a conversation per `(foundation, candidate, jobListing)` context, or reuse the general messaging model?
- **Recommendation:** reuse general model; add `metadata.contextType='staffing'` + `contextId` JSON hooks (no schema change).

## D9. What happens to existing `RecruitmentPage.tsx`?

- Option (a): keep it, mount at `/staffing/jobs` + `/staffing/candidates` (simple alias).
- Option (b): split into `StaffingJobsPage` + `StaffingCandidatesPage` (separate files, clearer mental model).
- **Recommendation:** (a) through Phase 2; revisit in Phase 5 if the file becomes unwieldy.

## D10. E-learning priority

- Brief: "Minimal." Today it is fully built with a LMS graph, enrollments, certificates.
- Decision: **leave as-is** (cost of removing = huge, cost of keeping = 0). Just downgrade in nav.
- Confirmed unless Product objects.

---

## Items intentionally deferred

- SendGrid / Mailgun delivery webhook wiring (`EmailLog.status` enrichment).
- Mobile push notifications.
- Automated AI matching / scoring beyond the rule-based matcher proposed in Phase 2.
- Redis-backed webhook idempotency (currently in-memory `Set`; listed as known issue in `CLAUDE.md`).
- ClamAV malware scanning (env-gated off by default).
