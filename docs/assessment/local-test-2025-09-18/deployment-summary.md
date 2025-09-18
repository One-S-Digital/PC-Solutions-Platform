# Deployment Summary (Local E2E) — 2025-09-18

Branch
- One-S-Digital/PC-Solutions-V2@cursor/replicate-mock-frontend-gui-and-ui-design-e5ae

Monorepo
- Turborepo + pnpm, apps under build/apps

Local Services
- Frontend (Vite): http://localhost:5173
- Admin (Vite): http://localhost:5174
- API (NestJS): http://localhost:3000 (Swagger: /api/docs)

Exposed Public URLs
- Frontend: https://user:dc453bcdb8299bd519039860811930e6@repo-test-reports-tunnel-614s7l7g.devinapps.com
- Admin: https://user:48e056348da81f7434aad12e989a093e@repo-test-reports-tunnel-gvwgy460.devinapps.com
- API: https://user:f9c70e43d920e1662cadba408957d871@repo-test-reports-tunnel-ej2nza2u.devinapps.com
- API Swagger: https://user:f9c70e43d920e1662cadba408957d871@repo-test-reports-tunnel-ej2nza2u.devinapps.com/api/docs

Environment
- Frontend .env.local:
  - VITE_CLERK_PUBLISHABLE_KEY=pk_test_dXByaWdodC1zYWxtb24tOTUuY2xlcmsuYWNjb3VudHMuZGV2JA
  - VITE_API_URL=http://localhost:3000/api
- Admin .env.local:
  - VITE_CLERK_PUBLISHABLE_KEY=pk_test_dXByaWdodC1zYWxtb24tOTUuY2xlcmsuYWNjb3VudHMuZGV2JA
- API env (shell):
  - DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pc_solutions_dev?schema=public
  - STRIPE_PUBLISHABLE_KEY=[redacted test key]
  - STRIPE_SECRET_KEY=[redacted test key]

Database
- Local Postgres (Docker) postgres:15
- DB: pc_solutions_dev
- Prisma: generate + migrate applied

Key Minimal Fixes Applied (pushed)
- Admin: replaced @repo/types UserRole import with local enum to fix runtime blank screen
- Admin: added Admin .env.local (not committed) and adjusted AdminDashboard props/icons to align with available types
- Admin: corrected page imports and tsconfig JSX/interop/aliases
- Frontend: minimal unblocks (route wrappers/ProtectedRoute, small fixes)
- UI package: removed broken exports to prevent runtime errors

Screenshots
- Admin signup: ![/home/ubuntu/screenshots/localhost_5174_admin_143323.png](/home/ubuntu/screenshots/localhost_5174_admin_143323.png)
- API Swagger: ![/home/ubuntu/screenshots/user_143435.png](/home/ubuntu/screenshots/user_143435.png)
Updated Public URLs (current)
- Frontend (Login): https://user:f1a1db6b72cd6022fd115b798dd131d6@repo-test-reports-tunnel-p8418k71.devinapps.com/login
- Admin (Login): https://user:af7a4684c6a976de9b8740cb34ac1c4f@repo-test-reports-tunnel-se3o6gjm.devinapps.com/admin/login
- API Swagger: https://user:b55e562c9b17be64c9b2db64678ed6ea@repo-test-reports-tunnel-2wo70z6s.devinapps.com/api/docs

New Evidence
- Frontend login screenshot: ![/home/ubuntu/screenshots/user_145235.png](/home/ubuntu/screenshots/user_145235.png)
- API Swagger endpoints screenshot: ![/home/ubuntu/screenshots/user_145214.png](/home/ubuntu/screenshots/user_145214.png)
Updated tunnels (later 2025-09-18)
- Frontend: https://user:c6e8b82a8761db76d12aa9ce99ca60b8@repo-test-reports-tunnel-owg9x1hn.devinapps.com
- Admin: https://user:67dcb80635fb525f07a4dad34e3afd92@repo-test-reports-tunnel-b5gqe1hi.devinapps.com
- API: https://user:ec85d844a69dd978b67f2b3869cec6e0@repo-test-reports-tunnel-tw6wcfs0.devinapps.com
Notes
- Frontend/App.tsx adjusted to use <Outlet /> for nested protected routes; unauthenticated redirect behavior now observed consistently.
- API dev run encountered MODULE_NOT_FOUND for @repo/typescript-config; Swagger not serving at /api/docs during this pass; left as-is per “minimal unblocks only”.
