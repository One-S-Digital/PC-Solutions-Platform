# Admin Dashboard - Account Suspension UI Missing ⚠️

## Current Status

✅ **Backend Enforcement**: COMPLETE  
❌ **Admin UI**: NOT IMPLEMENTED

## What's Working

### Backend ✅
- `accountEnabled` field exists in database
- ClerkAuthGuard blocks suspended users
- API endpoints exist:
  - `POST /api/user-management/bulk-update` (suspend/activate)
  - `GET /api/user-management?accountEnabled=true/false` (filter)
- User Management Service fully updated

### Frontend ❌
- **No suspend/activate buttons** in admin dashboard
- **No bulk operations UI** 
- Status shown but not actionable
- Only has "Edit" and "Delete" buttons

## What Needs to Be Built

### 1. Add Suspend/Activate Actions to User Menu

**File**: `admin/src/pages/Users.tsx`

Add to the dropdown menu (around line 240):

```tsx
<Menu.Item>
  {({ active }) => (
    <button
      onClick={() => handleSuspendUser(user.id)}
      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm ${
        user.accountEnabled ? 'text-orange-600' : 'text-green-600'
      }`}
    >
      {user.accountEnabled ? (
        <>
          <XCircle className="h-4 w-4 mr-2" />
          Suspend Account
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Activate Account
        </>
      )}
    </button>
  )}
</Menu.Item>
```

### 2. Add Handler Functions

```tsx
const handleSuspendUser = async (userId: string) => {
  if (!confirm('Are you sure you want to suspend this user account?')) return;
  
  try {
    await apiService.bulkUpdateUsers(apiClient, {
      userIds: [userId],
      operation: 'suspend'
    });
    
    // Refresh users list
    queryClient.invalidateQueries({ queryKey: ['users'] });
    
    alert('User account suspended successfully');
  } catch (error) {
    logger.error('Failed to suspend user:', error);
    alert('Failed to suspend user account');
  }
};

const handleActivateUser = async (userId: string) => {
  try {
    await apiService.bulkUpdateUsers(apiClient, {
      userIds: [userId],
      operation: 'activate'
    });
    
    queryClient.invalidateQueries({ queryKey: ['users'] });
    
    alert('User account activated successfully');
  } catch (error) {
    logger.error('Failed to activate user:', error);
    alert('Failed to activate user account');
  }
};
```

### 3. Add API Service Method

**File**: `admin/src/services/api.ts`

Add after the existing user methods (around line 228):

```typescript
export const apiService = {
  // ... existing methods ...
  
  // User Management
  bulkUpdateUsers: (
    apiClient: AxiosInstance, 
    operation: {
      userIds: string[];
      operation: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'changeRole';
      newRole?: string;
    }
  ) => 
    apiClient.post<ApiResponse<any>>('/user-management/bulk-update', operation),
    
  // ... rest of methods ...
}
```

### 4. Update Status Display

**File**: `admin/src/pages/Users.tsx` (around line 213)

Show actual account status instead of generic "ACTIVE":

```tsx
<td className="px-6 py-4 whitespace-nowrap">
  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
    user.accountEnabled 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }`}>
    {user.accountEnabled ? 'Active' : 'Suspended'}
  </span>
</td>
```

### 5. Add Filter for Suspended Users

Add a filter option to show only suspended users:

```tsx
<div className="sm:w-48">
  <select
    className={STANDARD_INPUT_FIELD}
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="">All Statuses</option>
    <option value="active">Active Users</option>
    <option value="suspended">Suspended Users</option>
  </select>
</div>
```

### 6. Update Type Definition

**File**: `admin/src/types/api.ts` (or wherever User type is)

Ensure User type includes:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountEnabled: boolean;  // Add this
  status: string;
  orgName?: string;
  lastLogin?: string;
  avatarUrl?: string;
}
```

## Implementation Steps

1. ✅ Update `admin/src/types/api.ts` - Add `accountEnabled: boolean`
2. ✅ Update `admin/src/services/api.ts` - Add `bulkUpdateUsers()` method
3. ✅ Update `admin/src/pages/Users.tsx`:
   - Add handler functions
   - Add Suspend/Activate menu items
   - Update status display to show `accountEnabled`
   - Add status filter
4. ✅ Import required icons (XCircle, CheckCircle from lucide-react)
5. ✅ Test the flow

## Quick Implementation

Want me to implement all of this for you? I can:

1. Add the API service method
2. Update the Users page with suspend/activate actions
3. Add the proper status display
4. Add filtering by account status
5. Update TypeScript types

This will take about 5-10 minutes to implement properly.

## Alternative: Use Existing Frontend Users Page

The **frontend** (`/workspace/frontend/pages/UsersPage.tsx`) might already have more features. Check if you want to use that instead, or port features from there to the admin dashboard.

## Testing After Implementation

1. Login as admin
2. Go to Users page
3. Click dropdown menu on a user
4. Click "Suspend Account"
5. Confirm
6. User status changes to "Suspended"
7. That user can no longer login (gets "Account has been suspended" error)
8. Click "Activate Account" to restore access

## Priority

**HIGH** - The backend is ready but unusable without UI controls!

Would you like me to implement the UI now?
