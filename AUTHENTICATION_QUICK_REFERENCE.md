# Authentication System - Quick Reference Guide

## 🎯 TL;DR

- **Identity Provider**: Clerk
- **Source of Truth**: PostgreSQL Database (AppUser table)
- **Authorization**: Role-Based Access Control (RBAC)
- **Token Type**: JWT (RS256)
- **Default Role**: PARENT

---

## 📊 System Architecture (One-Liner)

```
Clerk (Auth) → JWT → Backend Verifies → Loads DB Role → Checks Permissions → Grant/Deny
```

---

## 🔑 Key Concepts

| Concept | Description |
|---------|-------------|
| **Clerk** | Third-party SaaS that handles authentication (login/signup) |
| **JWT Token** | Signed token issued by Clerk, contains user ID and metadata |
| **AppUser** | Database table storing user roles (source of truth) |
| **publicMetadata** | Clerk metadata synced FROM database (cached copy) |
| **ClerkAuthGuard** | Verifies JWT and loads user from database |
| **RolesGuard** | Checks if user has required role for endpoint |

---

## 👥 User Roles

| Role | Level | Typical Access |
|------|-------|----------------|
| `SUPER_ADMIN` | 1 (Highest) | Full platform control, user management, settings |
| `ADMIN` | 2 | Content moderation, support, limited config |
| `FOUNDATION` | 3 | Post jobs, manage leads, order products/services |
| `PRODUCT_SUPPLIER` | 4 | Manage catalog, process orders |
| `SERVICE_PROVIDER` | 4 | Manage services, handle requests |
| `EDUCATOR` | 5 | Browse jobs, apply, manage profile |
| `PARENT` | 6 (Lowest) | Submit leads, view responses |

---

## 🔄 User Journey Flows

### Signup Flow (Frontend)
```
1. User fills form → 2. Clerk creates account → 3. Webhook fires → 
4. Backend creates AppUser (role: PARENT) → 5. Syncs to Clerk metadata → 
6. User redirected to /dashboard
```

### Login Flow
```
1. User enters credentials → 2. Clerk validates → 3. Issues JWT → 
4. Frontend stores token → 5. API calls include JWT → 
6. Backend verifies & loads role → 7. Grants access
```

### Role Change Flow
```
1. Admin makes request → 2. Backend validates admin permissions → 
3. Updates database → 4. Syncs to Clerk metadata → 
5. Creates audit log → 6. User sees new role on next login
```

---

## 🛡️ Security Layers

```
Layer 1: HTTPS/TLS
   ↓
Layer 2: Clerk Authentication (JWT)
   ↓
Layer 3: Backend Token Verification
   ↓
Layer 4: Database Role Check
   ↓
Layer 5: RolesGuard Authorization
   ↓
Access Granted/Denied
```

---

## 📍 Source of Truth Priority

**Role Resolution Order:**

1. ✅ **Database (AppUser.role)** ← Primary source
2. ⚠️ Clerk publicMetadata.role ← Synced copy only
3. ❌ Frontend state ← Never trusted

**Rule:** Backend ALWAYS loads role from database, never trusts JWT metadata.

---

## 🔧 Key Files

### Frontend
```
frontend/
├── providers/AuthProvider.tsx        # Clerk integration
├── pages/LoginPage.tsx               # Clerk SignIn component
├── pages/SignupPage.tsx              # Clerk SignUp component
└── types.ts                          # UserRole enum
```

### Admin
```
admin/src/
├── providers/AppProvider.tsx         # Clerk provider
├── components/auth/
│   ├── AdminAuthComponents.tsx       # Protected routes
│   ├── AdminCustomLoginFormNew.tsx   # Login form
│   └── AdminCustomSignupFormNew.tsx  # Signup form
└── pages/AccessDenied.tsx            # Non-admin redirect
```

### Backend
```
api/src/
├── auth/
│   ├── guards/
│   │   ├── clerk-auth.guard.ts       # JWT verification
│   │   ├── roles.guard.ts            # Role authorization
│   │   └── auth-pipeline.guard.ts    # Combined guard
│   └── decorators/
│       └── roles.decorator.ts        # @Roles() decorator
├── webhooks/
│   └── clerk-webhook.controller.ts   # User sync
└── admin/role-management/
    └── role-management.controller.ts # Role changes
```

### Database
```
api/prisma/
└── schema.prisma
    ├── AppUser                       # User + role
    └── AppUserRoleHistory            # Audit log
```

---

## 🔐 Environment Variables

### Frontend & Admin
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx  # Get from Clerk Dashboard
```

### Backend
```env
CLERK_SECRET_KEY=sk_live_xxxxx            # Get from Clerk Dashboard
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx       # Same as frontend
CLERK_WEBHOOK_SECRET=whsec_xxxxx          # Webhook signing secret
DATABASE_URL=postgresql://...              # PostgreSQL connection
```

---

## 🎨 Code Snippets

### Protect a Route (Backend)
```typescript
@Controller('marketplace')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class MarketplaceController {
  
  @Get('products')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN)
  async getProducts(@Req() req: any) {
    // Only FOUNDATION and ADMIN can access
    const { userId, role } = req.context;
    return this.productService.findAll();
  }
}
```

### Check Role (Frontend)
```typescript
import { useAuthContext } from './providers/AuthProvider';

function MyComponent() {
  const { currentUser } = useAuthContext();
  
  if (currentUser?.role === UserRole.ADMIN) {
    return <AdminPanel />;
  }
  
  return <RegularUserPanel />;
}
```

### Check Role (Admin)
```typescript
import { useUser } from '@clerk/clerk-react';

function AdminRoute() {
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role;
  
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return <Navigate to="/access-denied" />;
  }
  
  return <AdminDashboard />;
}
```

### Change User Role (API)
```typescript
POST /admin/role-management/:clerkId/role
Authorization: Bearer <super_admin_jwt>

Body:
{
  "role": "FOUNDATION",
  "reason": "User operates a daycare"
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "VITE_CLERK_PUBLISHABLE_KEY is required"
**Solution:** Add environment variable to Render/Vercel and redeploy.

### Issue: "Access Denied" for admin user
**Solution:** Set `publicMetadata.role` to `"ADMIN"` or `"SUPER_ADMIN"` in Clerk Dashboard.

### Issue: User has wrong role after signup
**Solution:** Check webhook logs. If webhook failed, user will auto-provision as PARENT on first API call.

### Issue: Role change not reflected
**Solution:** User must log out and log back in. JWT tokens are cached until expiration.

### Issue: 401 Unauthorized on API calls
**Solution:** Check JWT token is valid and not expired. Verify `Authorization: Bearer <token>` header.

### Issue: Database role differs from Clerk metadata
**Solution:** Database always wins. Webhook will revert Clerk metadata to match database.

---

## 📋 Admin Tasks

### Create Super Admin
**Option 1: Clerk Dashboard**
1. Go to Clerk Dashboard → Users
2. Find user
3. Click Metadata tab
4. Edit Public Metadata
5. Add: `{"role": "SUPER_ADMIN"}`

**Option 2: API (requires existing super admin)**
```bash
POST /admin/role-management/user_2abc123/role
Authorization: Bearer <super_admin_jwt>
Content-Type: application/json

{
  "role": "SUPER_ADMIN"
}
```

### View Audit Logs
```bash
GET /admin/role-management/:clerkId/history
Authorization: Bearer <admin_jwt>
```

### Revoke Admin Access
```bash
POST /admin/role-management/user_2abc123/role
Authorization: Bearer <super_admin_jwt>

{
  "role": "PARENT",
  "reason": "User no longer requires admin access"
}
```

---

## 🧪 Testing Authentication

### Test Login (cURL)
```bash
# 1. Get token from Clerk (manual login or use Clerk dev tools)
TOKEN="eyJhbGciOiJSUzI1NiIs..."

# 2. Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api.com/users/me
```

### Test Role Protection
```bash
# Try accessing admin endpoint as regular user
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://your-api.com/admin/users

# Expected: 403 Forbidden
```

### Verify Webhook
```bash
# Check Clerk webhook logs in Clerk Dashboard
# Verify events are being received and processed

# Check backend logs
docker logs api-container | grep "webhook"
```

---

## 📊 Quick Decision Matrix

### When to use which authentication method?

| Scenario | Use |
|----------|-----|
| User signs up | Clerk `<SignUp />` component |
| User logs in | Clerk `<SignIn />` component |
| Protect frontend route | `useAuthContext()` + conditional render |
| Protect admin route | `AdminProtectedRoute` + publicMetadata check |
| Protect API endpoint | `@UseGuards(ClerkAuthGuard, RolesGuard)` + `@Roles()` |
| Check if user is admin | `user.publicMetadata.role === 'ADMIN'` |
| Change user role | `POST /admin/role-management/.../role` |
| Get current user | `GET /users/me` |

---

## 🔄 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW SUMMARY                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Action → Clerk → JWT → Frontend → API Request →      │
│  Backend (ClerkAuthGuard) → Verify JWT → Load DB →         │
│  RolesGuard → Check Permissions → Controller → Response    │
│                                                              │
│  Source of Truth: Database                                  │
│  Cached in: Clerk publicMetadata                            │
│  Displayed in: Frontend state                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 Support Resources

- **Clerk Docs**: https://clerk.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NestJS Guards**: https://docs.nestjs.com/guards
- **JWT Spec**: https://jwt.io/

---

## ⚡ Quick Commands

### Verify Clerk Setup
```bash
# Check env vars
echo $VITE_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY

# Test Clerk API
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  https://api.clerk.com/v1/users
```

### Check Database Roles
```sql
-- Get all users and their roles
SELECT clerkId, email, role, isActive, createdAt 
FROM "AppUser" 
ORDER BY createdAt DESC;

-- Get role change history
SELECT u.email, h.previousRole, h.newRole, h.changedBy, h.createdAt
FROM "AppUserRoleHistory" h
JOIN "AppUser" u ON h.userId = u.id
ORDER BY h.createdAt DESC;
```

### Reset User Role (Emergency)
```sql
-- Directly update in database (use with caution)
UPDATE "AppUser" 
SET role = 'PARENT' 
WHERE clerkId = 'user_2abc123';

-- Then sync to Clerk via webhook or manual update
```

---

## 🎓 Learning Path

1. **Read**: `AUTHENTICATION_SYSTEM_INVESTIGATION.md` for full details
2. **Study**: `AUTHENTICATION_EDGE_CASES_AND_SCENARIOS.md` for edge cases
3. **Review**: This quick reference for daily use
4. **Practice**: Test authentication flows in development
5. **Monitor**: Watch webhook logs in production

---

**Last Updated:** 2025-10-13  
**Status:** ✅ Production Ready  
**Action Required:** Add Clerk keys to environment
