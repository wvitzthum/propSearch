# Active Capture Architecture: The "Inbox" Pattern

## Objective
To capture 100% of raw property listings from disparate sources (Rightmove, Zoopla, Agent Sites) without the risk of data loss during normalization. This allows for a two-stage data pipeline: **Capture** (Raw) and **Normalize** (Refined).

## 1. Storage: The "Inbox" Directory
Instead of a monolithic database, we use a partitioned JSON-based storage for the inbox to maintain high visibility and ease of debugging.
- **Path:** `/workspaces/immoSearch/data/inbox/`
- **Structure:** `YYYY_MM_DD_RAW_[SOURCE].json` (e.g., `2026_03_08_RAW_RIGHTMOVE.json`)

## 2. Pipeline Lifecycle

### Phase A: Direct Capture (Raw)
The scraper fetches data and dumps the *entire* raw JSON object from the portal (e.g., `window.jsonModel` from Rightmove) into the Inbox.
- **Mandate:** No filtering or calculation occurs in this phase.
- **Goal:** Maximum data preservation.

### Phase B: Normalization Engine
A script (or agent logic) reads the latest Inbox files and transforms them into the immoSearch schema (`property.schema.json`).
- **Input:** `data/inbox/YYYY_MM_DD_RAW_*.json`
- **Output:** `data/DD_MM_YYYY.json` (The daily snapshot)

### Phase C: Registry Sync
The daily snapshot is merged into `data/master.json`.
- **Logic:** Address + Area deduplication.
- **Metadata Update:** `last_seen`, `discovery_count`, `is_new`.

## 3. Benefits
1. **Audit Trail:** If a calculation is found to be wrong (e.g., wrong `price_per_sqm`), we can re-run normalization without re-scraping the web.
2. **Resilience:** If a portal changes its DOM/JSON structure, only Phase B needs updating; Phase A remains a simple fetch-and-save operation.
3. **Data Fidelity:** We keep the original portal image URLs and IDs in the raw storage for future deep-links.

## 4. Implementation Steps (DAT-014)
- [ ] Create `data/inbox/` directory.
- [ ] Update `data/.gitignore` to ensure raw files are tracked but managed (if large, consider `.gitattributes` or external storage, but for immoSearch we keep it in-repo for now).
- [ ] Define `raw_listing` schema wrapper for Inbox.

## 5. Raw Listing Schema Wrapper
```json
{
  "source": "string", // "Rightmove", "Zoopla", etc.
  "captured_at": "ISO8601",
  "raw_data": {} // The verbatim object from the source
}
```
