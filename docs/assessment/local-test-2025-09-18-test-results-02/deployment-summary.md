# Deployment Summary (Local E2E) — 2025-09-18-02

Branch
- One-S-Digital/PC-Solutions-V2@cursor/replicate-mock-frontend-gui-and-ui-design-e5ae

Local Services
- Frontend (Vite): http://localhost:5173
- Admin (Vite): http://localhost:5174
- API (NestJS): http://localhost:3000 (Swagger: /api/docs)

Public Access
- API Swagger: temporary URL available on request

Notes
- Resolved Nest MODULE_NOT_FOUND by enabling emit to dist and pointing Nest CLI to tsconfig.build.json.
- API runs locally; Swagger reachable locally and via a temporary tunnel.
