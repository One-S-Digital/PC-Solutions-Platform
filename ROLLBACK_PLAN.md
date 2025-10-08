# Translation System Migration - Rollback Plan

## Quick Rollback Instructions

If anything goes wrong during migration, follow these steps:

### Option 1: Restore from Git (Recommended)
```bash
# If changes were committed
git reset --hard HEAD~1

# If changes were staged but not committed
git reset --hard HEAD
git clean -fd
```

### Option 2: Restore from Backups
```bash
# Restore frontend
rm -rf frontend/public/locales
cp -r backups/emergency-translation-fix-*/frontend-locales frontend/public/locales

# Restore admin
rm -rf admin/src/i18n/locales
cp -r backups/emergency-translation-fix-*/admin-locales admin/src/i18n/locales

# Restore i18n configs
git checkout frontend/i18n.ts
git checkout admin/src/i18n/index.ts
```

### Option 3: Point Restore (Surgical)
```bash
# Restore specific file
git checkout HEAD -- path/to/file

# Or from backup
cp backups/emergency-translation-fix-*/[specific-file] [destination]
```

## Backup Locations

Current backups:
- `/workspace/backups/emergency-translation-fix-20251008-161352/`
- `/workspace/backups/admin-translations-2025-10-08/`
- `/workspace/backups/frontend-translations-2025-10-08/`

## Safety Checklist

Before each phase:
- [ ] Backup created
- [ ] Validation passing
- [ ] Tests running (if applicable)
- [ ] Rollback tested

After each phase:
- [ ] Validation still passing
- [ ] No new errors introduced
- [ ] Apps still buildable
- [ ] Manual testing passed

## Emergency Contacts

If system breaks:
1. Check this rollback plan
2. Restore from most recent backup
3. Run validation: `node scripts/validate-translations.mjs`
4. Test apps: `cd frontend && npm run dev`

## Phase-Specific Rollback

### Phase 1 Rollback: Delete analysis files
### Phase 2 Rollback: `git checkout packages/translations/`
### Phase 3 Rollback: `git checkout frontend/` or restore from backup
### Phase 4 Rollback: `git checkout admin/` or restore from backup
### Phase 5 Rollback: Restore deleted files from backup
### Phase 6 Rollback: Delete new CI/CD files, restore old docs
