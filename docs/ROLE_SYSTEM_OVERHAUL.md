# Role System Overhaul Plan

## Overview
Complete overhaul of the role management system to use PostgreSQL as the single source of truth with reliable Clerk synchronization.

## Key Changes

### 1. Database Schema
- New `AppUser` table (maps to existing User via clerkId)
- New `AppUserRoleHistory` for audit trail
- New `Outbox` table for reliable Clerk sync
- Keep existing UserRole enum values

### 2. Authentication Flow
- Simplified ClerkAuthGuard (only verifies token)
- RoleContextMiddleware loads role from DB
- No role derivation from JWT/metadata
- Optional Redis caching for performance

### 3. Role Management
- Admin API for role changes
- Transactional updates with audit
- Outbox pattern for Clerk sync
- No external queue dependencies

### 4. Webhook Handling
- Idempotent webhook processing
- Loop prevention
- Raw body parsing for Svix
- Automatic role correction

### 5. Reconciliation
- Hourly job to ensure consistency
- Batch processing with error handling
- Automatic drift correction

## Migration Steps

### Phase 1: Database Setup
1. Create new tables (AppUser, AppUserRoleHistory, Outbox)
2. Keep existing User table for now
3. Add migration to sync existing data

### Phase 2: Auth System
1. Replace ClerkAuthService
2. Add new guards and middleware
3. Update all role checks

### Phase 3: Admin API
1. Create role management endpoints
2. Add audit logging
3. Implement outbox writes

### Phase 4: Webhook & Sync
1. Update webhook controller
2. Add outbox worker
3. Configure reconciliation

### Phase 5: Frontend Updates
1. Update role checks to use API
2. Remove metadata dependencies
3. Add role management UI

### Phase 6: Cleanup
1. Remove old auth code
2. Update documentation
3. Add monitoring

## Rollback Plan
Since we're in development, we can use downtime. If issues arise:
1. Revert code changes
2. Keep database tables (no harm)
3. Fix and redeploy