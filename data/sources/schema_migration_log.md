
---

## DE-231 — 2026-04-18

**Task:** Add 'watchlist' to pipeline_status enum; remove property_rank column

**Changes:**
1. **Schema (properties table):**
   - `pipeline_status` CHECK constraint updated to include `'watchlist'`
   - New valid values: `discovered | shortlisted | vetted | watchlist | archived`
   - `property_rank` column dropped (was `INTEGER DEFAULT NULL`)

2. **Server (server/index.js):**
   - Updated `missingColumns` definition: removed `property_rank`, updated `pipeline_status` CHECK comment
   - Added `ALTER TABLE properties DROP COLUMN property_rank` migration block
   - Added table-recreation migration for `pipeline_status` CHECK constraint (SQLite limitation)
   - Fixed 10 pre-existing rows with `market_status='discovered'` → `market_status='unknown'` (data cleanup)
   - `validStatuses` array updated to `['discovered','shortlisted','vetted','watchlist','archived']`
   - `validSortColumns` removed `property_rank`; `sortBy='user_priority'` now falls back to default
   - `protected_[]` list removed `property_rank`
   - `PATCH /api/properties/:id/rank` endpoint returns `410 Gone` with deprecation message

**Migration approach:**
- `property_rank` DROP: SQLite 3.35+ `ALTER TABLE DROP COLUMN`
- `pipeline_status` CHECK: table-recreate pattern (`properties_new` → copy → swap)
- `foreign_keys` pragma toggled OFF during table-recreate to avoid FK constraint failures

**Risk:** Medium — table-recreate migration. All 204 properties and data integrity preserved.
**Rollback:** Backup at `data/backups/2026-04-18_DE-231_backup.tar.gz`
