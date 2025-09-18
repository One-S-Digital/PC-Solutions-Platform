# Functional Test Report — 2025-09-18 (assessment snapshot)

Note: Screenshots referenced below are currently stored outside the repo at /home/ubuntu/screenshots due to an environment limitation on committing binary files in this step. I can add these images to the repo once allowed to commit binaries (or via git LFS).

Scope
- Frontend, Admin, API basic availability and smoke of key routes/forms
- Not a full business-logic verification; backend uses local DB and mock data

Summary
- Frontend: loads signup; protected routes guarded; several pages stubbed to unblock runtime
- Admin: login/signup render via Clerk; dashboard renders mock metrics; navigation to Users/Analytics/Monitoring pages loads
- API: server compiles; Swagger loads; marketplace endpoints visible (earlier); latest tunnel attempt returned FRP “not found”

Findings
- Admin
  - RESOLVED: Blank screen due to missing named export UserRole from @repo/types; replaced with local enum in AdminAuthComponents
  - Dashboard fields referencing non-existent props adjusted; icons updated
  - Auth works visually; no actual Clerk org/roles configured for deeper RBAC
- Frontend
  - RESOLVED: Missing UI exports and role wrappers causing runtime failures; replaced with ProtectedRoute and removed broken exports
  - Several routes/pages added as placeholders to unblock navigation
- API
  - Build required STRIPE_SECRET_KEY; started with provided test keys earlier
  - Latest attempt: Swagger via tunnel returned “not found”; API dev shell showed MODULE_NOT_FOUND for @repo/typescript-config

Basic Route Checks
- Admin
  - /admin/login: OK
  - /admin/signup: OK (role selection + form)
  - /admin/dashboard: OK
  - /admin/users: OK
  - /admin/analytics: OK
  - /admin/monitoring: OK
- Frontend
  - /signup: OK
  - Protected routes redirect when unauthenticated: OK (after Outlet wrapper fix)
- API
  - GET /: 200 OK (health)
  - Swagger listed marketplace endpoints (earlier)

Screenshots (paths on this machine; ready to copy into repo upon approval)
- /home/ubuntu/screenshots/localhost_5174_admin_143220.png
- /home/ubuntu/screenshots/localhost_5174_admin_143323.png
- /home/ubuntu/screenshots/user_143435.png
- /home/ubuntu/screenshots/user_145235.png
- /home/ubuntu/screenshots/user_145214.png
- /home/ubuntu/screenshots/user_145743.png
- /home/ubuntu/screenshots/user_150130.png
- /home/ubuntu/screenshots/user_150247.png
- /home/ubuntu/screenshots/user_150327.png
- /home/ubuntu/screenshots/user_150353.png
- /home/ubuntu/screenshots/user_150421.png
- /home/ubuntu/screenshots/user_150444.png
- /home/ubuntu/screenshots/user_150503.png
- /home/ubuntu/screenshots/user_150523.png
- /home/ubuntu/screenshots/user_150545.png
- /home/ubuntu/screenshots/user_152324.png
- /home/ubuntu/screenshots/user_152426.png
- /home/ubuntu/screenshots/user_152013.png
- /home/ubuntu/screenshots/user_152251.png
- /home/ubuntu/screenshots/user_152304.png
- /home/ubuntu/screenshots/user_152537.png

Current tunnels (at time of update)
- Frontend: https://user:c6e8b82a8761db76d12aa9ce99ca60b8@repo-test-reports-tunnel-owg9x1hn.devinapps.com/login
- Admin: https://user:67dcb80635fb525f07a4dad34e3afd92@repo-test-reports-tunnel-b5gqe1hi.devinapps.com/admin/login
- API (attempted Swagger): https://user:ec85d844a69dd978b67f2b3869cec6e0@repo-test-reports-tunnel-tw6wcfs0.devinapps.com/api/docs
