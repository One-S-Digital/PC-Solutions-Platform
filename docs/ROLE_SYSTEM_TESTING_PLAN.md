# Role System Testing Plan

## Overview
This document outlines the comprehensive testing plan for the new role management system.

## Prerequisites

### Environment Variables
Create a `.env.test` file in the API directory with:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pcdb_test?schema=public"

# Clerk
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_ISSUER="https://your-instance.clerk.accounts.dev"

# App
PORT=3001
NODE_ENV=test
```

### Database Setup
1. Create a test database
2. Run migrations
3. Verify schema

## Testing Phases

### Phase 1: Database & Migration Testing

#### 1.1 Migration Verification
- [ ] Run migration script
- [ ] Verify AppUser table created
- [ ] Verify AppUserRoleHistory table created
- [ ] Verify Outbox table created
- [ ] Verify indexes are properly set
- [ ] Test data migration from User to AppUser

#### 1.2 Database Operations
- [ ] Test AppUser CRUD operations
- [ ] Test role history logging
- [ ] Test outbox queue operations
- [ ] Verify foreign key constraints

### Phase 2: Authentication Flow Testing

#### 2.1 Token Verification
- [ ] Test valid Clerk token acceptance
- [ ] Test invalid token rejection
- [ ] Test expired token handling
- [ ] Test token with missing claims

#### 2.2 Role Context Middleware
- [ ] Test role loading for existing user
- [ ] Test auto-creation for new user
- [ ] Test error handling for DB issues
- [ ] Verify context attachment to request

### Phase 3: Authorization Testing

#### 3.1 Role Guards
- [ ] Test SUPER_ADMIN access to all endpoints
- [ ] Test ADMIN access restrictions
- [ ] Test role-specific endpoint access
- [ ] Test unauthorized access rejection

#### 3.2 Public Endpoints
- [ ] Verify public decorator works
- [ ] Test health check endpoints
- [ ] Test webhook endpoints

### Phase 4: Admin API Testing

#### 4.1 Role Management Endpoints
- [ ] Test GET /admin/role-management/users/:clerkUserId
- [ ] Test PATCH /admin/role-management/users/:clerkUserId/role
- [ ] Test GET /admin/role-management/history
- [ ] Verify audit logging

#### 4.2 Permission Testing
- [ ] Test ADMIN cannot promote to SUPER_ADMIN
- [ ] Test role change validation
- [ ] Test non-existent user handling

### Phase 5: Webhook Integration Testing

#### 5.1 Webhook Security
- [ ] Test valid Svix signature
- [ ] Test invalid signature rejection
- [ ] Test replay protection
- [ ] Test missing headers

#### 5.2 Event Processing
- [ ] Test user.created event
- [ ] Test user.updated event
- [ ] Test user.deleted event
- [ ] Test role sync to database

### Phase 6: Sync Mechanism Testing

#### 6.1 Outbox Worker
- [ ] Test role mirror to Clerk
- [ ] Test retry mechanism
- [ ] Test error handling
- [ ] Test concurrent processing

#### 6.2 Reconciliation Service
- [ ] Test hourly reconciliation
- [ ] Test drift detection
- [ ] Test bulk user processing
- [ ] Test error recovery

### Phase 7: End-to-End Scenarios

#### 7.1 User Signup Flow
1. User signs up with role selection
2. Webhook receives user.created
3. AppUser created with correct role
4. Role synced to Clerk public metadata
5. User can access role-appropriate endpoints

#### 7.2 Role Change Flow
1. Admin changes user role
2. Database updated with history
3. Outbox entry created
4. Role synced to Clerk
5. User's next request has new role

#### 7.3 Error Recovery Flow
1. Simulate Clerk API failure
2. Verify outbox retry
3. Simulate database failure
4. Test graceful degradation

### Phase 8: Performance Testing

#### 8.1 Load Testing
- [ ] Test middleware performance impact
- [ ] Test concurrent role changes
- [ ] Test outbox processing throughput
- [ ] Monitor database connection pool

#### 8.2 Stress Testing
- [ ] Test with 1000+ concurrent users
- [ ] Test webhook burst handling
- [ ] Test reconciliation with large dataset

## Test Data Setup

### Users to Create
1. Super Admin user
2. Admin user
3. Foundation user
4. Product Supplier user
5. Service Provider user
6. Educator user
7. Parent user

### Scenarios to Test
1. New user registration
2. Existing user migration
3. Role promotion
4. Role demotion
5. Bulk role changes

## Automated Test Scripts

### Run Unit Tests
```bash
npm run test:unit
```

### Run Integration Tests
```bash
npm run test:integration
```

### Run E2E Tests
```bash
npm run test:e2e
```

## Manual Testing Checklist

### Frontend Testing
- [ ] Login with each role type
- [ ] Verify correct UI elements shown
- [ ] Test role-specific features
- [ ] Verify error messages

### API Testing with Postman/Insomnia
- [ ] Import test collection
- [ ] Run through all endpoints
- [ ] Verify response formats
- [ ] Test error scenarios

## Rollback Plan

If issues are discovered:
1. Stop the application
2. Restore database backup
3. Revert code changes
4. Redeploy previous version

## Success Criteria

- All test phases pass
- No performance degradation
- Zero data loss
- Smooth user experience
- Audit trail complete