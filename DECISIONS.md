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
...
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
Accepted

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
