# ProCrèche v2 — Staffing-First Remodel

> **Important:** Before starting any analysis or implementation related to the v2 remodel,
> **read these notes first**. They are the source of truth for the remodel so we do not
> re-investigate the codebase from scratch every session.

## Files in this folder

| File | Purpose |
|---|---|
| `00-README.md` | You are here. Entry point. |
| `01-current-state-inventory.md` | Full audit of what exists today: API modules, Prisma models, frontend pages, admin pages, email system, integrations. Keep this updated as the code evolves. |
| `02-gap-analysis.md` | What is missing or stubbed relative to the v2 staffing-first strategy. |
| `03-remodel-strategy.md` | Strategic direction, principles, information-architecture targets, acceptance criteria per feature area. |
| `04-phased-plan.md` | Concrete phased work plan (what to restructure, refactor, add, deprecate). No calendar estimates — phases instead. |
| `05-data-migration-and-preservation.md` | How to preserve live users and data through the remodel (nothing destructive). |
| `06-email-and-notification-plan.md` | Staffing-centric transactional email + in-app notification plan that hooks into the existing `email-notification` module. |
| `07-navigation-ia-target.md` | Final navigation, routes, and page layouts per role (foundation + admin). |
| `08-open-decisions.md` | Questions that need product decisions before/while building. |

## Scope recap (from the brief)

- **Product pivot:** ProCrèche becomes a **staffing and recruitment system** for Swiss crèches, with everything else relegated to secondary support layers.
- **Admin dashboard:** all existing roles' features stay, but staffing sits on top and drives alerts/notifications. Staffing-focused email flows (candidate matching, daycare application notifications) must be added.
- **Foundation (daycare) dashboard:** remodelled around staffing.
- **Parent / Product supplier / Service provider dashboards:** **unchanged** in role scope. They keep their existing feature set. No staffing content leaks into them.
- **Do not rebuild** what is already working. Restructure, rename, re-prioritise, and fill gaps. Preserve live users and live data.

## Hard navigation rule (from brief)

Top-level navigation for the staffing-oriented roles (foundation + admin) must follow this order:

1. **Overview** (staffing-first dashboard homepage)
2. **Staffing**
3. **HR & Compliance**
4. **Parent Enquiries**
5. **Suppliers & Services**

**Admin-only variation** (per user follow-up): Overview → **Users** → then the order above. All other admin modules (billing, support, content moderation, system, translations, …) remain available but ranked below staffing-signal surfaces.

## Feature acceptance test (apply to every proposed change)

A change is in scope only if it makes at least one of these true:

- Improves hiring speed.
- Improves candidate visibility.
- Reduces staffing pressure (especially replacement).
- Simplifies operator workflow.

Otherwise it is secondary support — allowed to stay, not allowed to drive IA.

## Branch / PR convention for this effort

- Planning / notes branch: `cursor/v2-staffing-remodel-plan-3032` (this PR).
- Subsequent implementation branches should be scoped per phase (e.g. `cursor/v2-p1-ia-foundation-3032`, `cursor/v2-p2-replacement-domain-3032`) and reference this plan.
