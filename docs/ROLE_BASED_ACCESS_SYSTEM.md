# Role-Based Access System

## Platform Access by Role

### Super Admin
- **Full administrative suite:** dashboard, marketplace, recruitment, messaging, user management (including the dedicated "Admins" list), content tools (e‑learning, HR procedures, state policies), partner management, and global settings

### Admin
- **Administrative dashboard:** marketplace, recruitment, messaging, user management (excluding the "Admins" list), content tools, partner management, and platform settings

### Foundation (Daycare)
- **Foundation dashboard:** marketplace, orders/appointments, parent leads, recruitment, HR procedures, e‑learning, state policies, analytics, organization profile, messaging, support, and settings

### Product Supplier
- **Supplier dashboard:** orders, product listings, analytics, messaging, support, state policies, and settings

### Service Provider
- **Service-provider dashboard:** incoming requests, service listings, analytics, messaging, support, state policies, and settings

### Educator / Candidate
- **Educator dashboard:** job board, profile, applications, e‑learning, messaging, support, state policies, and settings

### Parent
- **Parent lead form:** inquiry tracking, messaging, support, state policies, and settings

## Tiered Subscription Access

### Basic Access
- **Key features:** Marketplace, state policies, product/service orders, and requests
- **Limitations:** No parent enquiries, HR, recruitment, e-learning, analytics, team management, or WhatsApp support
- **Typical role:** Foundation (entry)

### Essential
- **Key features:** Adds limited parent enquiries (up to 15) and HR documents
- **Limitations:** Still lacks recruitment, e-learning, analytics, team management, and WhatsApp support
- **Typical role:** Foundation (growing)

### Professional
- **Key features:** Full Foundation suite: unlimited parent enquiries, HR documents, recruitment, e-learning, analytics, team management, and WhatsApp support
- **Typical role:** Foundation (advanced)

### Supplier Plan
- **Key features:** Marketplace, analytics, team management, WhatsApp support, and unlimited orders/service requests
- **Limitations:** No parent enquiries, HR, recruitment, or e-learning
- **Typical role:** Product suppliers

### Service Provider Plan
- **Key features:** Similar to Supplier Plan—analytics, team management, WhatsApp support, and unlimited orders/service requests
- **Limitations:** No parent enquiries, HR, recruitment, or e-learning
- **Typical role:** Service providers

## Implementation Notes

1. **Role-based sidebar:** Menu items should be displayed based on user role
2. **Subscription tiers:** Features should be gated based on subscription level
3. **Feature gating:** Both role and subscription level should be checked for access
4. **Messaging:** Available to all roles
5. **Support:** Available to all roles
6. **State policies:** Available to all roles

## Role Hierarchy

1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Admin access (cannot promote to SUPER_ADMIN)
3. **FOUNDATION** - Foundation organization access
4. **PRODUCT_SUPPLIER** - Product supplier access
5. **SERVICE_PROVIDER** - Service provider access
6. **EDUCATOR** - Educator access
7. **PARENT** - Basic user access (default)

## Database Schema

### AppUser Table
- Primary role storage
- Links to Clerk user ID
- Source of truth for roles

### AppUserRoleHistory Table
- Audit trail of all role changes
- Tracks who made changes and why

### Outbox Table
- Queue for syncing changes to Clerk
- Handles retries on failure

## Authentication Flow

1. **Frontend signup** → Stores role in `unsafeMetadata`
2. **Webhook sync** → Moves role to `publicMetadata` 
3. **JWT token** → Includes role from `publicMetadata`
4. **API validation** → Checks role from JWT or database

## Security Considerations

- **publicMetadata** can only be set server-side with the secret key
- This prevents users from giving themselves admin roles
- `unsafeMetadata` can be set client-side but isn't included in JWT tokens
- The webhook ensures the role is validated before being promoted to `publicMetadata`