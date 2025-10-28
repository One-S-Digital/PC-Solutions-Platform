# Option: Remove isActive from User Model

## If you decide you DON'T need user activation/deactivation features:

### Step 1: Update Prisma Schema

Edit `api/prisma/schema.prisma` (around line 146):

```prisma
model User {
  id        String   @id @default(uuid())
  clerkId   String   @unique
  email     String   @unique
  firstName String?
  lastName  String?
  role      UserRole

  // ... other fields ...
  
  lastActiveAt DateTime?
  // REMOVE THIS LINE:
  // isActive     Boolean   @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // ... relations ...
}
```

### Step 2: Create Migration

```bash
cd api
npx prisma migrate dev --name remove_isactive_from_users
```

### Step 3: Update Code

Remove all references to `isActive` in:
- `api/src/user-management/user-management.service.ts` (lines 54-55, 151-163, 228-229, 282-283)
- `api/src/user-management/user-management.controller.ts` (lines 29, 104)
- `packages/types/src/user.ts` (lines 24, 59)
- Any frontend code that filters by active status

### Step 4: Regenerate Prisma Client

```bash
cd api
npx prisma generate
```

### WARNING

You will LOSE the ability to:
- Soft-delete users (mark as inactive without deleting data)
- Suspend user accounts temporarily
- Filter active vs inactive users in admin dashboard
- Track user account status

**This is used in 204+ places in your codebase!**
