# Performance Notes — 2025-09-18

Local Metrics (qualitative)
- Vite HMR is instant; Admin and Frontend cold load < 1s locally
- API cold start acceptable for NestJS

Opportunities
- Code-split large admin pages (charts)
- Ensure images/icons tree-shaken; prefer outline/solid subsets
- Cache-control for API GET endpoints in dev/prod
