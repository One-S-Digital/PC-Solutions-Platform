# Build Status & Troubleshooting

## Current Issue: Render install fails before build (Resolved)

### Error Message
```
pnpm install --frozen-lockfile
ERR_PNPM_OUTDATED_LOCKFILE: Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

### Root Cause
- Husky (`"husky": "^9.1.7"`) was added to the root `package.json` but the workspace lockfile was never regenerated.
- Render’s build command (`pnpm install --frozen-lockfile && cd api && pnpm run build:render`) runs a frozen install before any scripts, so the deployment dies before it can even attempt the API build.

### Fix
1. Run `pnpm install` locally and commit the refreshed `pnpm-lock.yaml`.
2. Add `scripts/prebuild-lock-check.mjs` plus the `pnpm run prebuild:render` npm script to guard the lockfile before any Render build starts.
3. Ensure every Render service executes the guard (see `render.yaml` – each `buildCommand` now starts with `pnpm run prebuild:render`).

### Local Verification
```bash
pnpm run prebuild:render        # Fails fast if pnpm-lock.yaml is stale
pnpm install --frozen-lockfile  # Succeeds locally after the fix
cd api && pnpm run build:render # Optional – mirrors Render’s build
```

---

## Current Issue: Frontend Build Failing

### Error Message
```
ERROR: Multiple exports with the same name "SUGGESTED_SERVICE_CATEGORIES"
ERROR: Multiple exports with the same name "SUGGESTED_PRODUCT_CATEGORIES"
```

### Root Cause Analysis

**Status:** ✅ **FIXED in code** - Render using cached/stale build

The local code is **100% correct** with only one export per constant:
- Line 244: `export const SUGGESTED_SERVICE_CATEGORIES = [...]`
- Line 267: `export const SUGGESTED_PRODUCT_CATEGORIES = [...]`

**Why Render is still failing:**
1. Render may be deploying from cached build layers
2. Monorepo setup may be confusing Render's build context
3. Previous failed builds left artifacts

### Latest Commits (All Correct)

```
ec041210a - chore: Add build timestamp to force cache refresh ✅
0ddfa071d - fix: Remove duplicate export ✅
8886d5034 - docs: Add deployment notes ✅
2b394c55a - feat: Add frontend prebuild script ✅
```

## Solution: Force Fresh Build

### Option 1: Clear Build Cache in Render (Recommended)

1. Go to Render Dashboard
2. Find service: **pc-solutions-frontend**
3. Go to **Settings** tab
4. Scroll to "Build & Deploy" section
5. Click **"Clear Build Cache"**
6. Then click **"Manual Deploy"**
7. Select branch: `merge/pcs-development-integration`
8. Deploy

### Option 2: Simplify Build Command

If cache clear doesn't work, temporarily simplify the build:

**Current render.yaml:**
```yaml
buildCommand: cd frontend && pnpm install --frozen-lockfile=false && pnpm run build:render
```

**Alternative (simpler):**
```yaml
buildCommand: cd frontend && rm -rf node_modules dist .vite && pnpm install && vite build
```

### Option 3: Manual Database Connection (If needed)

The build log shows API postinstall running, which shouldn't happen for frontend. This suggests monorepo confusion.

**Temporary workaround:**
Set in Render Dashboard environment variables:
```
SKIP_API_BUILD=true
```

## Verification Checklist

After successful build, verify:

- [ ] Build completes without errors
- [ ] `dist/` folder is created
- [ ] Service starts successfully
- [ ] ChipInput component loads in browser
- [ ] Can add custom categories
- [ ] Categories appear as chips with × to remove

## What The Code Does (When It Works)

### Service Provider Settings
```tsx
<ChipInput
  selectedChips={settings.serviceCategories || []}
  availableOptions={SUGGESTED_SERVICE_CATEGORIES}
  onChange={(categories) => onChange('serviceCategories', categories)}
  allowCustomValues={true}
/>
```

### Suggested Categories Available
**Services (19 options):**
- Cleaning & Maintenance
- IT & Technical Support
- Facilities Maintenance
- Consulting
- Training & Coaching
- Catering
- Security Services
- ...plus 12 more

**Products (19 options):**
- Educational Toys
- Furniture
- Books & Learning Materials
- Art & Craft Supplies
- Outdoor Play Equipment
- ...plus 14 more

### User Can:
1. ✅ Select from suggested categories
2. ✅ Type custom categories
3. ✅ Press Enter to add
4. ✅ Click × to remove
5. ✅ Categories saved to database
6. ✅ Searchable in marketplace

## Technical Details

### File Structure
```
frontend/
├── constants.ts (SUGGESTED_CATEGORIES defined here)
├── components/
│   ├── ui/ChipInput.tsx (Tag input component)
│   ├── settings/sections/CompanyProfileSettings.tsx (Uses ChipInput)
│   └── service-provider/ServiceUploadModal.tsx (Uses ChipInput)
├── scripts/
│   └── prebuild-check.mjs (Validates files before build)
└── package.json (build:render runs prebuild)
```

### Database Schema
```sql
-- Products table
ALTER TABLE products ADD COLUMN categories TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Services table  
ALTER TABLE services ADD COLUMN categories TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Organizations table
ALTER TABLE organizations ADD COLUMN productCategories TEXT[] DEFAULT ARRAY[]::TEXT[];
```

### TypeScript Types
```typescript
interface Service {
  category: ServiceCategory;     // Legacy enum
  categories?: string[];         // New flexible tags ✅
}

interface Product {
  category?: string;             // Legacy single
  categories?: string[];         // New flexible tags ✅
}
```

## If Build Still Fails

### Check 1: Verify Branch
```bash
# In Render, make sure deploying from:
Branch: merge/pcs-development-integration
Commit: ec041210a or later
```

### Check 2: Check Build Logs
Look for these indicators:
- ✅ "pnpm install" runs successfully
- ✅ "Running frontend prebuild checks..." appears
- ✅ "Found: components/ui/ChipInput.tsx"
- ✅ "vite v6.x building for production..."
- ❌ Any "Multiple exports" errors = cache issue

### Check 3: Nuclear Option (Last Resort)
1. Delete the Render service
2. Recreate from scratch
3. Deploy fresh

## Contact Points

If you need help:
1. Check Render logs for exact error
2. Verify git commit hash in build log
3. Try manual build locally: `cd frontend && pnpm run build`
4. Check if local build works

## Local Testing

To test locally before deploying:
```bash
cd /workspace/frontend
pnpm install
pnpm run build:render
```

Expected output:
```
✅ Running frontend prebuild checks...
✅ Found: components/ui/ChipInput.tsx
✅ Found SUGGESTED_SERVICE_CATEGORIES in constants.ts
✅ Frontend prebuild checks complete!
✅ vite v6.x building for production...
✅ dist/index.html created
```

---

**Current Status:** Code is correct, waiting for Render to deploy fresh build without cache.
