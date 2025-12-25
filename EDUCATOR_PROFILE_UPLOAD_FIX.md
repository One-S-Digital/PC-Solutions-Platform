# Educator Profile Picture Upload Fix

## Issue Summary
Profile picture upload for educators was not working due to a schema refactoring that changed how avatar data is stored.

## Root Cause
A recent migration (`20251220000000_add_user_avatar_and_bio`) refactored the avatar storage system:
- **Before**: Avatar URL was stored directly in the User table
- **After**: Avatar is stored as a relation (`avatarAssetId`) pointing to the Asset table

The frontend was still trying to send `avatarUrl` field, which:
1. Is not accepted by the backend DTO (`UpdateEducatorSettingsDto`)
2. Does not exist in the database schema
3. Was silently being ignored during saves

## Changes Made

### Backend Changes (`api/src/settings/settings.controller.ts`)

**Updated `getEducatorSettings` endpoint:**
- Added `avatarAsset` relation to the query
- Returns `avatarUrl` computed from the asset's `publicUrl` field
- Ensures frontend receives the avatar URL for display

```typescript
// Before
const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId);

// After
const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
  avatarAsset: true, // Include avatar asset relation
});

// Added to response
avatarUrl: (user as any).avatarAsset?.publicUrl ?? '', // Compute from asset relation
```

### Frontend Changes

#### 1. `frontend/components/settings/sections/EducatorProfileSettings.tsx`

**Removed `avatarUrl` from local state:**
- Removed `avatarUrl` from `profileData` state
- State now only tracks `avatarAssetId` (the relation ID)

**Updated avatar upload handler:**
- Removed the line that tried to save `avatarUrl`
- Now only saves `avatarAssetId` after successful upload
- The URL is automatically computed by the backend from the asset relation

```typescript
// Before
handleFieldChange('avatarUrl', uploadedUrl);
handleFieldChange('avatarAssetId', response.asset.id);

// After
// Only save the avatarAssetId, not the URL
handleFieldChange('avatarAssetId', response.asset.id);
```

**Updated avatar display:**
- Uses `settings.avatarUrl` (from backend) instead of local state
- Falls back to `currentUser.avatarUrl` if not available
- Still generates placeholder avatar if no URL exists

```typescript
// Before
const avatarUrl = profileData.avatarUrl || currentUser?.avatarUrl || ...

// After
const avatarUrl = settings.avatarUrl || currentUser?.avatarUrl || ...
```

#### 2. `frontend/pages/ProfileEditPage.tsx`

**Added `avatarUrl` to settings loading:**
- Now loads `avatarUrl` from backend response
- Stores it in form data for display purposes
- Does not send it back to backend (only `avatarAssetId` is sent)

```typescript
roleSettings = {
  // ... other fields
  avatarAssetId: data.avatarAssetId || '',
  avatarUrl: data.avatarUrl || '', // Computed from asset relation on backend
}
```

#### 3. `frontend/pages/educator/EducatorProfilePage.tsx`

**Updated profile loading:**
- Uses `data.avatarUrl` from backend response
- Falls back to `currentUser.avatarUrl` if not available

```typescript
// Before
avatarUrl: currentUser.avatarUrl,

// After
avatarUrl: data.avatarUrl || currentUser.avatarUrl,
```

## How It Works Now

1. **Upload Flow:**
   - User selects and crops an image
   - Frontend uploads to `/upload/file` with `assetKind: 'AVATAR'`
   - Backend creates Asset record and returns asset ID
   - Frontend saves only the `avatarAssetId` to educator settings
   - Backend stores the relation: `User.avatarAssetId -> Asset.id`

2. **Display Flow:**
   - Frontend requests educator settings from backend
   - Backend queries User with `avatarAsset` relation included
   - Backend computes `avatarUrl` from `avatarAsset.publicUrl`
   - Frontend receives and displays the computed `avatarUrl`

## Benefits of This Approach

1. **Single Source of Truth**: Avatar URL is computed from the Asset table, not duplicated
2. **Data Integrity**: No risk of URL and asset ID becoming out of sync
3. **Flexibility**: Easy to change storage URLs (e.g., CDN migration) without updating User records
4. **Consistency**: Same pattern used for logos, cover images, and other assets

## Testing Checklist

- [x] Backend returns `avatarUrl` in GET `/api/settings/educator`
- [x] Frontend displays existing avatar on load
- [x] Frontend can upload new avatar
- [x] Avatar persists after save and page reload
- [x] No `avatarUrl` is sent in PATCH requests (only `avatarAssetId`)
- [x] Fallback to placeholder avatar works when no avatar exists

## Related Files

- `api/src/settings/settings.controller.ts` - Backend settings controller
- `api/src/settings/dto/educator-settings.dto.ts` - DTO definition
- `api/prisma/schema.prisma` - Database schema
- `frontend/components/settings/sections/EducatorProfileSettings.tsx` - Settings UI
- `frontend/pages/ProfileEditPage.tsx` - Profile edit page
- `frontend/pages/educator/EducatorProfilePage.tsx` - Educator profile page
- `frontend/types.ts` - TypeScript type definitions

## Migration Notes

This fix aligns the educator profile with the same pattern used for:
- Foundation logos/covers (via `Organization.logoAssetId` → `Asset`)
- Supplier logos/covers (via `Organization.logoAssetId` → `Asset`)
- Service Provider logos/covers (via `Organization.logoAssetId` → `Asset`)
- Parent avatars (via `User.avatarAssetId` → `Asset`)

All roles now use the asset relation pattern for consistent file management.
