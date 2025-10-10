# Repository Cleanup Plan

## Files to DELETE

### 1. Outdated/Duplicate Translation Documentation (19 files)
**Reason:** Multiple overlapping translation docs - consolidate into one comprehensive guide

- [ ] CLEANUP_COMPLETE.md
- [ ] COMPLETE_MISSION_SUMMARY.md
- [ ] FINAL_SUMMARY.md (keep updated version)
- [ ] I18N_MIGRATION_COMPLETE.md
- [ ] MISSING_KEYS_ANALYSIS.md
- [ ] OPTION_B_EXECUTIVE_SUMMARY.md
- [ ] PHASE_2_COMPLETION_REPORT.md
- [ ] RUNTIME_TRANSLATION_FIX.md
- [ ] TRANSLATION_DEBUGGER.md
- [ ] TRANSLATION_FIX_COMPLETION_REPORT.md
- [ ] TRANSLATION_FIX_SUMMARY.md
- [ ] TRANSLATION_ISSUE_INVESTIGATION_REPORT.md
- [ ] TRANSLATION_SYSTEM_STATUS.md
- [ ] UNIFICATION_COMPLETE.md
- [ ] UNIFICATION_PLAN.md
- [ ] YOUR_QUESTION_ANSWERED.md
- [ ] docs/translation-debugger-usage.md
- [ ] docs/translation-analysis-archive/ (entire directory)

### 2. Outdated Test/Assessment Files (15+ files)
**Reason:** Old test results from September, no longer relevant

- [ ] docs/assessment/local-test-2025-09-18/ (entire directory)
- [ ] docs/assessment/local-test-2025-09-18-test-results/ (entire directory)
- [ ] docs/assessment/local-test-2025-09-18-test-results-02/ (entire directory)
- [ ] docs/test-results/ (entire directory)
- [ ] api/test/build-verification-report.md
- [ ] reports/ (entire directory)

### 3. Logs and Generated Files
**Reason:** Generated files, should be in .gitignore

- [ ] api/logs/translation-errors/ (entire directory)
- [ ] translation-migration-report.json
- [ ] translation-phase2-report.json
- [ ] test-upload.html

### 4. Unused Debug Components
**Reason:** No longer needed with stable translation system

- [ ] frontend/components/debug/TranslationDebugger.tsx
- [ ] frontend/components/debug/ (directory if empty)

### 5. Test/Script Files
**Reason:** Development/testing artifacts

- [ ] api/scripts/test-seed.ts
- [ ] extract-missing-keys.mjs

### 6. Outdated/Redundant Documentation
**Reason:** Superseded by better documentation or no longer applicable

- [ ] docs/ui-guide.md (outdated - replace with current)
- [ ] docs/rebuild-prompt.md (development artifact)
- [ ] docs/rebuild-specification.md (development artifact)
- [ ] docs/phase2-implementation-plan.md (completed)
- [ ] docs/phase3-testing-complete-guide.md (completed)
- [ ] docs/phase3-testing-hardening-guide.md (completed)
- [ ] docs/PHASE3_COMPLETION_SUMMARY.md (completed)
- [ ] scripts/README-translation.md (superseded)

## Files to UPDATE/CONSOLIDATE

### Keep and Update:
- README.md (main)
- TRANSLATIONS_README.md (comprehensive translation guide)
- LOCAL_SETUP_QUICKSTART.md
- LOCAL_DEPLOYMENT_GUIDE.md
- AUTHENTICATION_SETUP.md
- ENVIRONMENT_SETUP.md

### Create New:
- CURRENT_UI_GUIDE.md (modern, accurate UI documentation)
- DEVELOPER_GUIDE.md (consolidated developer setup)
- ADMIN_GUIDE.md (admin panel documentation)

## Total Files to Remove: ~60+ files
## Space Saved: Estimated 5-10MB
