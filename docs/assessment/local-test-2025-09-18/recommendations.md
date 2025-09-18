# Recommendations — 2025-09-18

Dev/Build
- Keep @repo/types ESM exports aligned with consumers; add UserRole export to prevent local enums
- Add example .env.local templates for Admin and Frontend with Clerk key placeholders
- Consider preflight script to validate required envs

Frontend/Admin
- Centralize route guards; avoid per-route wrapper duplication
- Re-introduce notifications via @repo/ui after implementing components; remove local placeholders

API
- Add seed data for marketplace entities to exercise CRUD via Swagger/UI
- Add health probe and /metrics (Prometheus) for ops

Release Notes
- Minimal runtime fixes pushed to branch to unblock testing
- Public preview URLs active (see deployment summary)
