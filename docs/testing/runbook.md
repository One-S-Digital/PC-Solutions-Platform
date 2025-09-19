# PC Solutions Platform v2.0 - Testing Runbook

## Overview
This runbook provides comprehensive testing procedures for the PC Solutions Platform v2.0 rebuild validation. All tests are designed to ensure production readiness across all critical system components.

## Prerequisites
- Node.js >= 18
- pnpm package manager
- Docker and Docker Compose
- PostgreSQL database
- ClamAV antivirus scanner
- Stripe test account with webhook endpoints
- Clerk authentication setup

## Environment Setup

### 1. Development Environment
```bash
# Copy environment template
cp .env.example .env

# Install dependencies
pnpm install

# Start services
docker compose up -d

# Run database migrations
pnpm db:migrate

# Seed test data
pnpm db:seed
```

### 2. CI Environment
```bash
# Copy test environment
cp .env.test .env

# Install dependencies
pnpm install

# Start services with test configuration
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed
```

## Test Execution Order

### Phase 1: Infrastructure & Smoke Tests
1. **Environment Validation**
   - Verify all services start correctly
   - Check database connectivity
   - Validate ClamAV scanner availability

2. **Smoke Tests**
   ```bash
   # Run smoke test suite
   pnpm test:smoke
   
   # Check health endpoints
   curl http://localhost:3000/health
   curl http://localhost:3000/health/clamav
   curl http://localhost:3000/health/version
   ```

### Phase 2: Authentication & Authorization
```bash
# Run authentication tests
pnpm test:auth

# Test JWT Bearer flow
pnpm test:jwt-flow

# Test RBAC authorization
pnpm test:rbac
```

### Phase 3: Billing & Subscriptions
```bash
# Test Stripe integration
pnpm test:billing

# Test webhook handling
pnpm test:webhooks

# Test subscription flows
pnpm test:subscriptions
```

### Phase 4: Security & File Upload
```bash
# Test file upload security
pnpm test:upload-security

# Test ClamAV integration
pnpm test:clamav

# Test MIME validation
pnpm test:mime-validation
```

### Phase 5: Feature Testing
```bash
# Test gated content UX
pnpm test:gated-content

# Test enterprise tenanting
pnpm test:enterprise

# Test messaging system
pnpm test:messaging

# Test i18n functionality
pnpm test:i18n
```

### Phase 6: Performance & Security
```bash
# Run performance tests
pnpm test:performance

# Run security audit
pnpm test:security

# Test accessibility
pnpm test:accessibility
```

### Phase 7: End-to-End Testing
```bash
# Run full E2E test suite
pnpm test:e2e

# Test email notifications
pnpm test:email-e2e
```

## Test Data Requirements

### Required Test Users
- `superadmin@demo.ch` - Super Admin role
- `admin@foundationA.ch` - Foundation Admin
- `manager@branchA.ch` - Branch Manager
- `educator@branchA.ch` - Educator
- `supplier@vendor.ch` - Product Supplier
- `service@vendor.ch` - Service Provider
- `parent@demo.ch` - Parent

### Required Organizations
- **Sunrise Group** (Enterprise tenant)
  - Pully branch
  - Lausanne branch
  - Fribourg branch (for testing)

### Required Stripe Prices
- `PRICE_MONTHLY_RECURRING` - Monthly subscription
- `PRICE_ANNUAL_RECURRING` - Annual recurring subscription
- `PRICE_ANNUAL_ONETIME` - Annual one-time payment

### Required Test Files
- `clean.jpg` - Valid JPEG file
- `wrongmime.exe` - Executable renamed as .jpg
- `eicar.txt` - EICAR test virus string

## Health Check Endpoints

### Core Health Checks
- `GET /health` - Basic application health
- `GET /health/clamav` - ClamAV scanner status
- `GET /health/version` - Application version and commit SHA

### Expected Responses
```json
// GET /health
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}

// GET /health/clamav
{
  "clamav": "ok",
  "version": "ClamAV 1.0.0",
  "lastUpdate": "2024-01-15T09:00:00Z"
}

// GET /health/version
{
  "version": "2.0.0",
  "commit": "abc123def456",
  "buildTime": "2024-01-15T08:00:00Z"
}
```

## Performance Baselines

### Response Time Targets
- API endpoints: p95 < 250ms (local)
- File uploads: p95 < 600ms for 1-5MB files
- Dashboard load: First byte < 300ms (local)

### Load Testing
```bash
# Run load tests with autocannon
npx autocannon -d 20 -c 30 http://localhost:3000/api/organizations

# Run comprehensive load tests
pnpm test:load
```

## Security Testing

### Automated Security Checks
```bash
# Run security audit
pnpm audit

# Run ESLint security rules
pnpm lint:security

# Run dependency vulnerability scan
pnpm audit:security
```

### Manual Security Tests
- IDOR (Insecure Direct Object Reference) testing
- SQL injection attempts
- File path traversal testing
- CORS configuration validation
- Authentication bypass attempts

## Test Artifacts

### Required Reports
- `reports/smoke-tests.md` - Smoke test results
- `reports/auth-rbac.md` - Authentication and authorization tests
- `reports/billing-e2e.html` - Billing flow screenshots/videos
- `reports/uploads-security.md` - File upload security tests
- `reports/gating-ux.md` - Gated content UX validation
- `reports/enterprise-tenanting.md` - Enterprise tenant isolation
- `reports/messaging-e2e.html` - Messaging system tests
- `reports/i18n.md` - Internationalization tests
- `reports/cors.txt` - CORS configuration tests
- `reports/perf-summary.md` - Performance test results
- `reports/security.md` - Security audit findings
- `reports/a11y.md` - Accessibility compliance
- `reports/migrations.md` - Database migration tests
- `reports/ci-proof.txt` - CI pipeline validation

### Log Files
- `logs/smoke.log` - Smoke test execution logs
- `logs/clamav-tests.log` - ClamAV test results
- `logs/observability.log` - Request tracing and error logs

## Exit Criteria

All tests must pass for production readiness:

✅ **Infrastructure**
- All services start without errors
- Database migrations complete successfully
- Health checks return expected responses

✅ **Authentication & Authorization**
- JWT Bearer flow works correctly
- RBAC prevents unauthorized access
- No data leakage between tenants/branches

✅ **Billing & Subscriptions**
- Stripe webhooks process correctly
- Subscription states update properly
- Payment flows complete successfully

✅ **Security**
- File uploads are scanned by ClamAV
- MIME validation prevents malicious uploads
- No critical security vulnerabilities

✅ **Performance**
- Response times meet baseline targets
- System handles expected load
- No memory leaks or performance degradation

✅ **Accessibility**
- WCAG AA compliance met
- Keyboard navigation works
- Screen reader compatibility

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL status
docker compose ps postgres

# Restart database
docker compose restart postgres

# Check logs
docker compose logs postgres
```

**ClamAV Scanner Not Available**
```bash
# Check ClamAV status
docker compose ps clamav

# Restart ClamAV
docker compose restart clamav

# Check ClamAV logs
docker compose logs clamav
```

**Test Failures**
```bash
# Run tests with verbose output
pnpm test --verbose

# Run specific test suite
pnpm test:auth --verbose

# Check test logs
tail -f logs/test-execution.log
```

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline runs tests in the following order:
1. Lint and type checking
2. Unit tests
3. Integration tests
4. E2E tests (headless)
5. Performance smoke tests
6. Security audit
7. Build verification

### Local CI Simulation
```bash
# Run full CI pipeline locally
pnpm ci:full

# Run specific CI stage
pnpm ci:test
pnpm ci:build
pnpm ci:security
```

## Support

For issues or questions regarding testing procedures:
- Check the troubleshooting section above
- Review test logs in the `logs/` directory
- Consult the individual test documentation in `reports/`
- Contact the development team for assistance