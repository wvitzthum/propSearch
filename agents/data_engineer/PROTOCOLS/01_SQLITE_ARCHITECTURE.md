# SQLite Architecture & Schema Protocol
*Reference from: agents/data_engineer/README.md — section "Architectural Mandate"*

## Database Location
`data/propSearch.db` — the single source of truth for all property data.

## Schema Design Principles

### Core Tables
- **`properties`** — master property records with all acquisition metrics
- **`archived_properties`** — historical archive (no longer auto-populated from auto-archive)
- **`price_history`** — time-series price data with enriched status (populated by `backfill_price_history.js` and `sync_data.js`; enrich entries on portal re-scrape — see DE-221)
- **`enrichment_requests`** — user-initiated field enrichment queue
- **`manual_queue`** — analyst-sourced leads pending import

### `price_history` Table Schema (DE-221)
The `price_history` table stores enriched time-series entries, not just raw snapshots:

```sql
CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT,
  price REAL,                    -- listed price on that date
  date TEXT,                     -- ISO date
  status TEXT,                    -- 'listed' | 'reduced' | 'under_offer' | 'sold' | 'withdrawn'
  reduction_pct REAL,            -- % reduction from previous price (only for 'reduced')
  price_per_sqm REAL,            -- price per sqm on that date
  days_on_market INTEGER,        -- DOM on that date
  london_hpi REAL,               -- London-wide HPI value (for benchmark line)
  source TEXT,                   -- 'portal_scrape' | 'sync_snapshot' | 'price_monitor'
  portal_price_id TEXT,          -- stable portal price entry ID (if available from portal)
  FOREIGN KEY(property_id) REFERENCES properties(id)
);
```

> ⚠️ **Active gap (DE-221):** The current `price_history` table only has `(property_id, price, date)`. The enriched columns are not yet added. All chart tooltip fields (`status`, `reduction_pct`, `DOM`, `HPI`) are currently `undefined` because the table schema never populated them. The `price_monitor.js` detects reductions but never writes enriched entries here — it only updates `properties` reduction fields.

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
