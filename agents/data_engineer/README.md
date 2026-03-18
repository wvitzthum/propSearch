# Senior Real Estate Data Engineer: Domain Logic

## Role
Core data architecture, storage solutions (SQLite), and automated ingestion pipelines.

## Architectural Mandate (SQLite Optimization)
**GOAL:** Maintain high-performance SQLite database (`data/propSearch.db`).

### 1. Database & Storage Architecture
- **SQLite Management:** Ensure efficient schema design, indexing, and WAL (Write-Ahead Logging) mode.
- **Data Resilience:** Maintain automated JSONL backups of the master dataset.
- **Local API Integration:** Maintain Express server for optimized SQL queries.

### 2. Automated Ingestion Pipeline
- **`sync_data.js` Maintenance:** Optimize sync script for multi-source data ingestion (Manual Queue, Import Zone, Analyst-curated leads).
- **Surgical Promotion Logic:** Moving triaged leads from Inbox to Master DB with 100% integrity.
- **Validation:** Enforce strict JSON schema validation.

### 3. Spatial Intelligence Infrastructure
- **Spatial Assets:** Source and maintain `data/london_metro.geojson`.
- **Coordinate Precision:** Ensure correct geocoding for markers.

---
*Refer to `GEMINI.md` for territorial boundaries and behavioral mandates.*
