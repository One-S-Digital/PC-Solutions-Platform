# Security & Compliance

Security measures and compliance information for the ProCrèche Solutions platform.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Data Protection](#data-protection)
4. [File Upload Security](#file-upload-security)
5. [API Security](#api-security)
6. [Compliance](#compliance)

---

## Authentication

### Clerk Authentication

The platform uses **Clerk** for authentication:

- JWT-based authentication
- Secure password storage (handled by Clerk)
- OAuth support (Google, etc.)
- Email verification
- Password reset functionality

**Files:**
- `api/src/auth/guards/clerk-auth.guard.ts`
- `api/src/webhooks/clerk-webhook.controller.ts`

### Session Management

- JWT tokens with expiration
- Secure token storage
- Automatic token refresh

---

## Authorization

### Role-Based Access Control (RBAC)

- Users assigned roles
- Routes protected by role requirements
- API endpoints enforce role checks

**Files:**
- `api/src/auth/guards/roles.guard.ts`
- `api/src/auth/decorators/roles.decorator.ts`

### Feature-Based Access

- Subscription-based feature gating
- Feature flags for gradual rollouts
- Usage limits enforced

**Files:**
- `api/src/subscription-management/subscription-management.controller.ts`
- `frontend/components/shared/SubscriptionPaywall.tsx`

---

## Data Protection

### Data Encryption

- Data in transit: HTTPS/TLS
- Data at rest: Database encryption (PostgreSQL)
- Sensitive fields encrypted in database

### Personal Data

- User emails stored securely
- Contact information separated from auth email
- GDPR considerations in data handling

**Files:**
- `api/prisma/schema.prisma` - Database schema

---

## File Upload Security

### File Validation

- MIME type validation
- File size limits
- File extension checks
- Content validation

**Files:**
- `api/src/upload/upload.controller.ts`
- `api/src/upload/cloudflare-r2.service.ts`

### Malware Scanning

- Optional ClamAV integration
- Malware scanning for uploaded files
- Quarantine for suspicious files

**Files:**
- `api/src/security/antivirus-upload.controller.ts`
- `api/src/security/quarantine-storage.service.ts`

### File Storage

- Files stored in Cloudflare R2 (S3-compatible)
- Presigned URLs for secure access
- Checksum verification
- ETag validation

**Files:**
- `api/src/upload/cloudflare-r2.service.ts`

---

## API Security

### Rate Limiting

- Request rate limits enforced
- Different limits for different endpoints
- Authentication endpoints have stricter limits

**Files:**
- `api/src/app.module.ts` - Throttler configuration
- `api/src/common/decorators/throttle.decorator.ts`

### CORS

- CORS configured for allowed origins
- Secure headers via Helmet

**Files:**
- `api/src/main.ts` - CORS configuration

### Input Validation

- DTO validation using class-validator
- SQL injection prevention (Prisma ORM)
- XSS prevention

**Files:**
- `api/src/**/dto/*.dto.ts` - DTOs with validation

---

## Compliance

### Data Privacy

- User data stored securely
- Contact information separate from auth email
- Audit logs for sensitive operations

**Files:**
- `api/src/admin/audit-logs.controller.ts`

### GDPR Considerations

- User data can be exported
- User accounts can be deleted
- Data retention policies

---

## Security Best Practices

### For Users

1. Use strong passwords
2. Enable email verification
3. Don't share your account
4. Report suspicious activity
5. Keep your browser updated

### For Administrators

1. Use strong admin passwords
2. Review audit logs regularly
3. Monitor system alerts
4. Keep system updated
5. Follow principle of least privilege

---

## Security Monitoring

### System Monitoring

- System health checks
- Error logging
- Security alerts
- Performance monitoring

**Files:**
- `api/src/system-monitoring/system-monitoring.controller.ts`
- `admin/src/pages/SystemMonitor.tsx`

### Audit Logs

- User actions logged
- Role changes tracked
- Subscription changes logged
- Content moderation actions logged

**Files:**
- `api/src/admin/audit-logs.controller.ts`
- `api/prisma/schema.prisma` - AuditLog model

---

## Under the Hood

### Security Middleware

- Helmet for security headers
- CORS protection
- Rate limiting
- Request logging

**Files:**
- `api/src/main.ts` - Middleware configuration
- `api/src/common/middleware/` - Custom middleware

### Environment Variables

Security-sensitive configuration via environment variables:
- `CLERK_SECRET_KEY` - Clerk authentication
- `DATABASE_URL` - Database connection (encrypted)
- `R2_*` - Cloudflare R2 credentials
- `CLAMAV_HOST` - Malware scanner (optional)

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** create a public issue
2. Contact support immediately
3. Provide detailed information
4. Allow time for fix before disclosure

---

## Notes

- Security is an ongoing process
- Regular security updates applied
- Third-party dependencies monitored
- Security best practices followed

---

**File References:**
- `api/src/security/` - Security modules
- `api/src/auth/` - Authentication modules
- `api/src/common/middleware/` - Security middleware

