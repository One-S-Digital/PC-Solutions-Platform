# Admin Direct User Creation — Implementation Plan

## Context

Currently the admin dashboard **invites** users via Clerk (sends an email; the user appears in the DB only after they sign up). This plan covers adding a **direct user creation** flow: an admin fills in a form and the account is created immediately in both Clerk and the database, with the email pre-verified.

---

## Overview of Changes

| Layer | What changes |
|-------|-------------|
| Backend DTO | New `AdminCreateUserDto` |
| Backend endpoint | `POST /users/admin-create` (SUPER_ADMIN only) |
| Backend service | `adminCreateUser()` in `UsersService` |
| Frontend API | New `adminCreateUser()` in `api.ts` |
| Frontend UI | "Create Account" tab in the existing `AddUserModal` |

---

## Backend

### 1. DTO — `api/src/users/dto/admin-create-user.dto.ts`

```typescript
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AdminCreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  /**
   * Optional temporary password. If omitted the backend generates a
   * cryptographically random one. The user should reset it on first login.
   */
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword?: string;
}
```

### 2. Service method — `UsersService.adminCreateUser()`

Sequence:

```
1. clerk.users.createUser({
     emailAddress: [dto.email],
     emailAddressVerified: true,        // pre-verified — no email check needed
     firstName: dto.firstName,
     lastName: dto.lastName,
     password: dto.temporaryPassword ?? generateSecurePassword(),
     publicMetadata: { role: dto.role, adminCreated: true },
   })
   → returns clerkUser with clerkUser.id

2. this.usersService.create({
     clerkId: clerkUser.id,
     email: dto.email,
     firstName: dto.firstName,
     lastName: dto.lastName,
     role: dto.role,
   })
   → creates AppUser row in DB

3. Return { clerkId, dbUserId, email, role }
```

Error handling:
- If Clerk creation succeeds but DB insert fails → call `clerk.users.deleteUser(clerkUser.id)` to roll back, then throw.
- If email already exists in Clerk (422) → throw `ConflictException('A user with this email already exists')`.

> **Why `emailAddressVerified: true`?**
> The admin has confirmed the email externally. Skipping Clerk's email verification means the account is usable immediately without requiring the user to click a link.

### 3. Controller endpoint

```typescript
@Post('admin-create')
@Roles(UserRole.SUPER_ADMIN)           // SUPER_ADMIN only — stronger than invite
async adminCreateUser(
  @Body() dto: AdminCreateUserDto,
  @Request() request,
) {
  const callerRole = request.context?.role || request.user?.role;
  // Admins cannot self-promote — only SUPER_ADMIN reaches this endpoint anyway
  const result = await this.usersService.adminCreateUser(dto);
  return { success: true, data: result };
}
```

---

## Frontend

### 1. API service — `admin/src/services/api.ts`

```typescript
adminCreateUser: (
  apiClient: AxiosInstance,
  payload: {
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    temporaryPassword?: string;
  }
) => apiClient.post<ApiResponse<User>>('/users/admin-create', payload),
```

### 2. UI — Third tab in `AddUserModal`: "Create Account"

Add a third tab alongside "Single Invite" and "Bulk Invite".

Fields:
- **Email** (required)
- **First name** (optional)
- **Last name** (optional)
- **Role** (required, same role selector, SUPER_ADMIN restricted)
- **Temporary password** toggle:
  - Default: auto-generate (backend handles it)
  - Manual: text input (min 12 chars)

On success:
- Close modal
- `toast.success('User account created and ready to use')`
- Invalidate `['admin-users']` query so the new user appears immediately in the table
- Optionally show a one-time banner with the temporary password (if auto-generated, the backend can return it once)

Mutation:
```typescript
const adminCreateUserMutation = useMutation({
  mutationFn: (payload) => apiService.adminCreateUser(apiClient, payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setIsAddUserModalOpen(false);
    toast.success('User account created');
  },
});
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Only SUPER_ADMIN can use this | `@Roles(UserRole.SUPER_ADMIN)` on controller, enforced by `RolesGuard` |
| Password strength | Backend enforces min 12 chars; auto-generated passwords use `crypto.randomBytes` |
| Temporary password exposure | If auto-generated, return it **once** in the API response only; never log it |
| Email pre-verification | Intentional — admin has confirmed the address; documented in code |
| Rollback on DB failure | Clerk user is deleted if DB insert fails to prevent orphaned Clerk accounts |

---

## Key Files to Change

```
api/src/users/
  dto/admin-create-user.dto.ts          ← NEW
  users.service.ts                      ← add adminCreateUser()
  users.controller.ts                   ← add POST /users/admin-create

admin/src/services/api.ts              ← add adminCreateUser()
admin/src/pages/Users.tsx              ← add third tab + mutation
```

---

## Implementation Order

1. `AdminCreateUserDto` (10 min)
2. `UsersService.adminCreateUser()` — Clerk create + DB create + rollback (30 min)
3. Controller endpoint (10 min)
4. Frontend API function (5 min)
5. Frontend tab + mutation (30 min)
6. Manual test: create user → verify appears in Clerk dashboard + admin users table (15 min)
