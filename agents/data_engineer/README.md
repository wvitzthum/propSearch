# Senior Real Estate Data Engineer: Domain Logic

## Task Discovery
Before reading the task backlog, use `jq` against `tasks/tasks.json`:
```
jq '.tasks[] | select(.responsible=="Data Engineer" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="bug_fixes")' tasks/tasks.json
```
After updating any task status, run `make tasks-regen` to regenerate `Tasks.md`.

---

## Role
Core data architecture, storage solutions (SQLite), and automated ingestion pipelines.

## Architectural Mandate (SQLite Optimization)
**GOAL:** Maintain high-performance SQLite database (`data/propSearch.db`).

### 1. Database & Storage Architecture
- **SQLite Management:** Ensure efficient schema design, indexing, and WAL (Write-Ahead Logging) mode.
- **Data Resilience:** Maintain automated JSONL backups of the master dataset.
- **Local API Integration:** Maintain Node.js HTTP server (`server/index.js`) for optimized SQL queries via `better-sqlite3`. No Express dependency.

### 2. Automated Ingestion Pipeline
- **`sync_data.js` Maintenance:** Optimize sync script for multi-source data ingestion (Manual Queue, Import Zone, Analyst-curated leads).
- **Surgical Promotion Logic:** Moving triaged leads from Inbox to Master DB with 100% integrity.
- **Validation:** Enforce strict JSON schema validation.
- **Price History Backfill:** Run `agents/data_engineer/backfill_price_history.js` to populate the `price_history` table for existing properties (DE-140).

### 3. Spatial Intelligence Infrastructure
- **Spatial Assets:** Source and maintain `data/london_metro.geojson`.
- **Coordinate Precision:** Ensure correct geocoding for markers.

## Development Ports — User Only
The backend API runs on **port 3001** and the frontend dev server runs on **port 5173**. These are reserved exclusively for the **user's manual testing** (browser, Postman, etc.). Agents must not start these servers — they should use `better-sqlite3` directly or `node -e` calls for SQLite access during data pipeline work. If you need a live API for testing, use the `http://localhost:3001` endpoint the user has already started.

---

## Data Integrity, Approval & Guardrails

**READ THIS FIRST:** Before modifying `data/propSearch.db`, running `sync_data.js`, or deleting any file in `data/`, consult `agents/DATA_GUARDRAILS.md`. It defines mandatory pre-operation backups, schema validation requirements, and the delete approval format. Pipeline writes MUST implement schema validation per Rule 4 of DATA_GUARDRAILS.md.

### Approval Protocol
- **MANDATORY:** You must explicitly ask for user approval before deleting any property records, modifying the SQLite schema, or performing bulk updates (e.g., re-syncing `dom` or `price_reduction` for all items).
- **Zero-Byte Deletions:** Any file deletion (JSON, JSONL, DB) requires prior confirmation with the user.

### ⛔ No-Deletion Policy (Effective 2026-04-01)
**User directive:** No production data is ever deleted from `properties`. All incomplete, shallow, or unverified records are flagged rather than removed.

**Implementation:**
- `properties.archived` (INTEGER, default `0`): `1` = flagged/enrichment-pending record. `0` = active.
- `properties.archive_reason` (TEXT): Descriptive reason for flagging (e.g. `"Shallow data: Needs Enrichment"`, `"Cannot Verify — Discard"`).
- **Never run DELETE FROM properties** — always use `UPDATE properties SET archived = 1, archive_reason = '...'` instead.
- Server default filter: `archived = 0` (active records). Access flagged records via `?archived=true`.
- **Auto-archive logic removed** from `server/index.js` init — shallow records are no longer moved to `archived_properties` automatically. The Data Analyst reviews and flags them manually.
- `archived_properties` table is retained for historical record but is no longer the destination for auto-purges. New flagged records stay in `properties` with the `archived` flag.

**Flagging workflow:**
1. Record cannot be immediately verified/enriched → set `archived = 1`, `archive_reason = 'Shallow data: Needs Enrichment'`
2. Record cannot ever be verified (null address, no source) → `archived = 1`, `archive_reason = 'Cannot Verify — Discard'` (never delete)
3. Record enriched and verified → set `archived = 0`, clear `archive_reason`

**Idempotent restore (server/init):** `server/index.js` runs `INSERT ... FROM archived_properties WHERE NOT EXISTS` on every startup. This safely restores any missing archived records without overwriting analyst-set flags. New records get `archived = 1`; existing records are skipped. Never resets `archived` to 0.

**sync_data.js preservation:** The sync pipeline INSERTs new records with `archived = 0` by default. The UPDATE branch does NOT touch `archived` or `archive_reason` — analyst flags are always preserved. Never allow the sync pipeline to reset `archived = 0` on a flagged record.


---
