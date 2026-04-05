# SQLite Architecture & Schema Protocol
*Reference from: agents/data_engineer/README.md — section "Architectural Mandate"*

## Database Location
`data/propSearch.db` — the single source of truth for all property data.

## Schema Design Principles

### Core Tables
- **`properties`** — master property records with all acquisition metrics
- **`archived_properties`** — historical archive (no longer auto-populated from auto-archive)
- **`price_history`** — time-series price data (populated by `backfill_price_history.js`)
- **`enrichment_requests`** — user-initiated field enrichment queue
- **`manual_queue`** — analyst-sourced leads pending import

### Indexing
Ensure indexes on: `id`, `address`, `area`, `archived`, `pipeline_status`, `market_status`, `alpha_score`

### WAL Mode
All writes use WAL (Write-Ahead Logging) mode for concurrent reads. Verify with:
```sql
PRAGMA journal_mode;
-- Must return: WAL
```

## API Server (`server/index.js`)
- No Express dependency
- `better-sqlite3` for synchronous, high-performance queries
- REST endpoints: `/api/properties`, `/api/macro`, `/api/inbox`, `/api/enrichment-requests`, `/api/health`
- Port: **3001** (user's manual testing only — do not start in agent sessions)

## Idempotent Restore on Startup
`server/index.js` runs this on every startup:
```sql
INSERT INTO properties
SELECT * FROM archived_properties
WHERE id NOT IN (SELECT id FROM properties);
```
This safely restores any archived records missing from `properties` without overwriting analyst-set flags. New records get `archived = 1`; existing records are skipped. Never resets `archived` to 0.

## Price History Backfill
Run `agents/data_engineer/backfill_price_history.js` to populate the `price_history` table for existing properties (DE-140).
