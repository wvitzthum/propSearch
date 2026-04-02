# propSearch: Strategic Decisions (ADR)

# ADR-001: Bloomberg Meets Linear Aesthetic
## Context
The user requires a pro-tool feel for high-stakes decisions.
## Decision
Adopt high data density, dark mode by default, and precision typography.
## Status
Accepted

# ADR-002: No-Auth Architecture
## Context
Private single-user tool.
## Decision
Remove all login/auth overhead to maximize speed to data.
## Status
Accepted

# ADR-003: Area Expansion (Chelsea & Primrose Hill)
## Context
User requested broader prime London coverage.
## Decision
Include SW3, SW10, and NW1 in the primary research scope.
## Status
Accepted

# ADR-004: Ownership Cost Modeling (Mortgage 2.0)
## Context
Price alone is insufficient for capital deployment decisions.
## Decision
Integrate real-time BoE rates and property-specific running costs.
## Status
Accepted

# ADR-005: Comparative Intelligence 2.0
## Context
Need for definitive acquisition decisions across multiple candidates.
## Decision
Implement Global Comparison Basket and Analytics Matrix.
## Status
Accepted

# ADR-006: Local Data Server & Active Listing Capture (Inbox Workflow)
## Context
Scaling from curated JSON to high-velocity capture.
## Decision
Transition to Local API Server + SQLite for Inbox triage.
## Status
Accepted

# ADR-007: Strict Ingestion & Data Fidelity Enforcement
## Context
Maintaining the "Empirical Standard" across all property datasets.
## Decision
Implement automated schema validation and mandatory metric extraction.
## Status
Accepted

# ADR-008: DuckDB Analytical Engine Migration
## Context
The property research tool requires high-performance filtering, multi-dimensional analysis, and a more robust foundation than flat JSON files. While SQLite was considered, DuckDB offers superior performance for columnar analytical queries (e.g., calculating average `price_per_sqm` or `alpha_score` over thousands of records).

## Decision
1.  **Engine:** Transition from `master.json` to an on-disk **DuckDB** database (`data/propSearch.duckdb`).
2.  **API Integration:** The existing Node.js server will be refactored to use the DuckDB client for property lookups and inbox management.
3.  **Storage:** Maintain a primary Parquet/JSONL backup for interoperability.

## Status
Deprecated (Superseded by ADR-011)

# ADR-009: JSONL Format Mandate & Data Integrity Restoration
## Context
As of March 8, 2026, `master.json` was corrupted by hallucinated listings and accidental truncation. Additionally, the file format was transitioned from a JSON Array to JSONL (JSON Lines) to improve token efficiency and read/write performance for large datasets.

## Decision
1.  **Format:** JSONL is the mandatory flat-file format for `master.json`. Every line must be a valid, independent JSON object.
2.  **Restoration:** Data must be restored from `master_backup_07_03_2026.json` (Array format) and converted to JSONL.
3.  **Hygiene:** Hallucinated IDs (`a1b2c3d4-...`) must be surgically removed during restoration.
4.  **Sync Logic:** `sync_data.js` must be updated to support line-by-line JSONL processing instead of `JSON.parse` on the entire file.

## Status
Accepted

# ADR-010: Role Specialization (Data Analyst vs. Data Engineer)
## Context
As the propSearch platform moves toward a more sophisticated DuckDB-based architecture and requires continuous high-fidelity property research, the monolithic "Data Engineer" role has become over-extended. The requirements for data infrastructure (storage, pipelines, API integration) and data research (sourcing, Alpha scoring, macro trends) are distinct disciplines.

## Decision
Split the Data role into two specialized agents:
1.  **Data Analyst:** Focuses on the "Property Quality" layer (sourcing, research, metric normalization, and calculating Alpha Scores).
2.  **Data Engineer:** Focuses on the "Property Storage" layer (DuckDB maintenance, automated ingestion pipelines, and backend API performance).

## Status
Accepted

# ADR-011: SQLite Migration & DuckDB Decommissioning
## Context
While DuckDB provided superior analytical performance, the implementation encountered persistent database locking issues and complex integration overhead with the Node.js environment. Given the single-user, high-stakes nature of the platform, the operational stability of SQLite (`better-sqlite3`) outweighs the columnar performance gains of DuckDB at the current data scale.

## Decision
1.  **Primary Engine:** Migrate the master data store from DuckDB to **SQLite** (`data/propSearch.db`).
2.  **Client:** Standardize on `better-sqlite3` for high-performance, synchronous database operations within the Node.js API.
3.  **Schema Persistence:** Replicate the multi-table analytical schema (Properties, Global Context, Manual Queue) in SQLite.
4.  **Decommissioning:** Remove `duckdb` dependencies and archive `.duckdb` assets.
5.  **Single-Source Truth:** All SQLite operations MUST use the database located in the `data/` folder. Any root-level `.db` files are unauthorized and must be purged.

## Status
Accepted

# ADR-012: Visual Intelligence & Spatial Research (Floorplans)
## Context
Floorplans are a critical data point for judging spatial volume and flow before an acquisition decision. Standard property imagery often fails to provide this context, leading to inefficient triage.
## Decision
1.  **Extraction:** Implement specialized "Hidden Web Data" research to isolate `floorplan_url` from portal JSON blobs (Rightmove/Zoopla).
2.  **Schema:** Expand the SQLite `properties` table and JSON schema to support `floorplan_url` as a first-class metric.
3.  **Visualization:** Integrate a dedicated "Floorplan Preview" in the Lead Inbox and Property Detail page to enable rapid spatial assessment.
## Status
Accepted

# ADR-013: 5-Page Navigation Architecture
## Context
The existing propSearch UI lacked clear page separation — the Dashboard, Properties, Map, Inbox, and Comparison views were blended into a single, hard-to-navigate interface. The user reported poor UX and requested a structural reorganisation into five purpose-built pages.
## Decision
Restructure the application into five distinct, routable pages with a persistent sidebar navigation:
1. **/dashboard** — Market Situation Room: HPI, BoE rate tracker, comparison basket preview, recent inbox activity, data freshness.
2. **/properties** — Primary property tracking surface: table/grid toggle, institutional sorting, column management, filter panel, batch actions.
3. **/map** — Full-viewport spatial intelligence map: Carto Dark tiles, Alpha Score-coded markers, shortlisted glow, metro overlays, slide-in property cards.
4. **/inbox** — Keyboard-centric lead triage: split-pane (list + deep-review), A/R/L shortcuts, batch mode, submission history.
5. **/comparison** — Decision-engine matrix: KPI row winners, delta vs. group average, image sync, analyst notes editor.
Cross-cutting: persistent Comparison Bar (fixed bottom), global Cmd+K command palette routing to all pages.
## Status
Accepted

# ADR-014: Market Status Taxonomy & Listing Freshness Tracking
## Context
The binary `archived = 1` flag conflates multiple distinct market states: genuinely sold properties, withdrawn listings, pre-enrichment duplicates, and properties still actively listed but flagged for incomplete data. The free-text `archive_reason` field is not filterable in the UI. Additionally, there is no timestamp tracking when a property was last verified against a live market scan. Five records currently show "Still Active" in `archive_reason` but are archived — they are reactivation candidates with no structured path to surface that in the UI.
## Decision
1.  **Structured `market_status` field:** Introduce `market_status` as a first-class column on the `properties` table with an enum of values: `active | under_offer | sold_stc | sold_completed | withdrawn | unknown`. This supplements — not replaces — the `archived` flag.
2.  **Separation of concerns:** `market_status` reflects market reality (managed by Analyst + sync pipeline). `archived` reflects the user's research workflow decision. These are independent axes.
3.  **`last_checked` timestamp:** Track the last date each property was verified against a live portal. Displayed as a freshness signal (green/amber/red) throughout the UI.
4.  **API support:** `GET /api/properties` returns `market_status` and `last_checked`. `POST /api/properties/:id/check` updates `last_checked` and re-verifies listing status.
5.  **UI surfaces:** Archive Review view grouped by `market_status` with prominent "Active — Recheck Needed" section; active property cards show freshness badge; recheck and reactivate actions exposed on archived records.
## Status
Accepted

# ADR-014: Market Status Taxonomy & Listing Freshness Tracking
## Context
The binary `archived = 1` flag conflates multiple distinct market states: genuinely sold properties, withdrawn listings, pre-enrichment duplicates, and properties still actively listed but flagged for incomplete data. The free-text `archive_reason` field is not filterable in the UI. Additionally, there is no timestamp tracking when a property was last verified against a live market scan. Five records currently show "Still Active" in `archive_reason` but are archived — they are reactivation candidates with no structured path to surface that in the UI.
## Decision
1. **Structured `market_status` field:** Introduce `market_status` as a first-class column on the `properties` table with an enum of values: `active | under_offer | sold_stc | sold_completed | withdrawn | unknown`. This supplements — not replaces — the `archived` flag.
2. **Separation of concerns:** `market_status` reflects market reality (managed by Analyst + sync pipeline). `archived` reflects the user's research workflow decision. These are independent axes.
3. **`last_checked` timestamp:** Track the last date each property was verified against a live portal. Displayed as a freshness signal (green/amber/red) throughout the UI.
4. **API support:** `GET /api/properties` returns `market_status` and `last_checked`. `POST /api/properties/:id/check` updates `last_checked` and re-verifies listing status.
5. **UI surfaces:** Archive Review view grouped by `market_status` with prominent "Active — Recheck Needed" section; active property cards show freshness badge; recheck and reactivate actions exposed on archived records.
## Status
Accepted
