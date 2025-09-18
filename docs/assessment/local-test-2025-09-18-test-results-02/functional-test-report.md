# Functional Test Report — 2025-09-18 (pass 2)

Scope
- Verify API fix, Swagger availability, and a safe GET.

Results
- Swagger (local): http://localhost:3000/api/docs — OK (200)
- Swagger (public): temporary URL available on request — OK
- Safe GET / — 200 OK

Evidence
- Screenshot (Swagger): ./localhost_3000_api_155102.png

Changes applied (minimal)
- build/apps/api/nest-cli.json: set compilerOptions.tsConfigPath to "tsconfig.build.json"
- build/apps/api/tsconfig.json: override "noEmit": false and "outDir": "./dist"
- build/apps/api/tsconfig.build.json: ensure "compilerOptions.outDir": "./dist"

Notes
- @repo/typescript-config remains JSON-only; no runtime usage.
