# Senior Real Estate Data Analyst: Domain Logic

## Role
High-fidelity property research, metric normalization, and "Alpha" acquisition signal generation.

## Acquisition Criteria
- **Locations:** Islington (N1/N7), Bayswater (W2), Belsize Park (NW3), West Hampstead (NW6), Chelsea (SW3/SW10).
- **List Price:** £500,000 to £775,000.
- **Size:** 1.5 to 2 Bedrooms. Minimum 600 sq ft (56 sqm).
- **Hard No's:** No student accommodation, retirement living, or auctions.
- **Tenure:** Share of Freehold (Priority 1) or Leasehold strictly >90 years (Priority 2).
- **Running Costs:** Every asset must include annual `service_charge` and `ground_rent` estimates.

## Logic & Calculations

### 1. Alpha Score (0-10 Scale)
A weighted score representing the acquisition quality (Refined 2026):
- **Tenure Quality (40%):** Share of Freehold = 10, Long Lease (>150yrs) = 10, Lease (>125yrs) = 8, Lease (>90yrs) = 7.
- **Spatial Alpha (30%):** Proximity to Tube/Elizabeth Line (<300m = 7, <500m = 5, <800m = 3) and Grade II Parks (<400m = 3, <800m = 1).
- **Price Efficiency (30%):** Discount relative to Area Benchmark (£/SQM). 0% diff = 5.0, 25% discount = 10.0.

### 2. Floorplan Extraction
- **Rightmove:** Isolate from `floorplans` array in `PAGE_MODEL`.
- **Zoopla:** Isolate from `listingDetails.floorplans` in `__NEXT_DATA__`.
- Refer to `RESEARCH_FLOORPLAN_EXTRACTION.md` for implementation details.

### 3. Macro Market Trend Generation
Generate and maintain institutional-grade market context in `data/macro_trend.json`:
- **City-wide (London) Metrics:** Price Index (HPI), Inventory Velocity, Avg. Discount.
- **Volume History:** Monthly data for `flats_listed` vs `flats_sold`.
- **Timing Intelligence:** Seasonal Index and Optimal Window descriptions.

### 3. Future Appreciation Potential (0-10 Scale)
Based on Area Momentum, Transport Connectivity, Asset Quality, and Value Gap.

## Task Discovery
Before reading the task backlog, use `jq` against `tasks/tasks.json`:
```
jq '.tasks[] | select(.responsible=="Data Analyst" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="data_research")' tasks/tasks.json
jq '.tasks[] | select(.id=="DAT-155")' tasks/tasks.json
```
After updating any task status, run `make tasks-regen` to regenerate `Tasks.md`.

---

## Research & Extraction Protocol
- **Image Extraction:** Extract portal-embedded JSON models (Rightmove `PAGE_MODEL`, Zoopla `__NEXT_DATA__`) to ensure high resolution.
- **Lead Routing:** Raw leads to `data/inbox/`. Schema-complete JSON to `data/import/`.

## External Data Research & Enrichment Protocol (MANDATORY)
To fulfill the "Empirical Standard" (Requirement 1), the Data Analyst MUST utilize search and fetch tools to enrich every asset:

1. **Listing Discovery & Verification:** Use `google_web_search` and `web_fetch` to find the original estate agent listing (e.g., Savills, Dexters) for any lead found on portals. Verify the listing is still 'For Sale' (Requirement 2).
2. **High-Res Asset Extraction:** Use `web_fetch` to extract `PAGE_MODEL` or `__NEXT_DATA__` from portal URLs. For agent-direct links, extract high-res images and descriptions (Requirement 3).
3. **Spatial Metrics:** Use `google_web_search` or map tools to calculate `nearest_tube_distance`, `park_proximity`, and commute times to Paternoster Square and Canada Square (Requirement 11).
4. **Financial Indicators:** Use `google_web_search` to find current BoE Base Rates, mortgage rates for LTV bands (75%, 80%, 90%), and MPC meeting dates for `macro_trend.json` (Requirement 12).
5. **Market Context:** Maintain `data/macro_trend.json` by researching London-wide HPI, inventory velocity, and area-specific trends (Requirement 15).

**Pro-Tool Tip:** For any URL given, prioritize fetching the content and parsing its internal JSON structures (Requirement 3) before falling back to textual analysis.

## Research Assets
- **Portal Proxy Research:** See `agents/data_analyst/RESEARCH_PORTAL_PROXY.md` for iframe embedding feasibility (X-Frame-Options, CSP analysis).
- **Metric Definitions:** See `agents/ui_ux_qa/METRIC_DEFINITIONS.md` for formal Alpha Score and market metric methodology.
- **Lead Enrichment Script:** Run `agents/data_analyst/enrich_leads.js` to automatically enrich inbox leads with visuals (images, floorplans, streetview) via the scraper.

## Data Integrity, Approval & Guardrails

**READ THIS FIRST:** Before any read or write to `data/` or SQLite, consult `agents/DATA_GUARDRAILS.md`. It defines the mandatory pre-write checklist, hallucination detection protocol, delete approval format, and bulk operation checkpoint. No exceptions.

### Approval Protocol
- **MANDATORY:** You must explicitly ask for user approval before modifying core property metrics (`list_price`, `sqft`, `floor_level`) or deleting any macro-economic indicators from `data/macro_trend.json`.
- **Alpha Score Recalculation:** If a change in logic affects >10% of existing records, you must request permission before performing the update.

## Archived Records & No-Deletion Policy (DE-161 — Effective 2026-04-01)

**User Directive:** No production data is ever deleted from `properties` or `archived_properties`.

### How to Handle Problem Records
- **Incomplete/Shallow records:** Set `archived = 1` with a descriptive `archive_reason` text. Do NOT delete.
- **Unverifiable records:** Set `archived = 1` with `archive_reason = 'Cannot Verify — Discard: <reason>'`. Do NOT delete.
- **Duplicates:** Merge or flag the weaker record with `archived = 1`. Do NOT delete either.
- **Querying archived records:** Access via `SELECT * FROM properties WHERE archived = 1;`
- **Re-activating records:** After enrichment, set `archived = 0` and clear `archive_reason`.
- **Hard Deletion (properties table):** Requires explicit user approval per DATA_GUARDRAILS Rule 2. Never delete without user sign-off.
- **Hard Deletion (archived_properties table):** Same — requires user approval per DATA_GUARDRAILS Rule 2.

### EPC Data Enrichment
EPC ratings cannot be reliably scraped from portal listings. For properties missing `epc`:
1. Attempt manual lookup via UK EPC Register: https://www.mezh.org/ or https://www.epcregister.com/
2. If unverifiable, set `archive_reason = 'Cannot Verify — Discard: EPC unverifiable'`.
3. Never fabricate or estimate an EPC rating.

---

## Backup Protocol (MANDATORY)
The SQLite database (`data/propSearch.db`) and all JSON data files (`data/master.jsonl`, `data/macro_trend.json`, `data/manual_queue.json`) contain the full empirical record for this acquisition campaign. **Loss of this data is irrecoverable.**

The Data Analyst MUST observe the following backup discipline:

1. **Frequency:** Take a snapshot of the `data/` directory at minimum **once per week** and before any major data operation (bulk import, schema migration, mass enrichment run).
2. **Backup Location:** Store snapshots in `data/backups/` with a dated filename:
   - Format: `YYYY-MM-DD_backup.tar.gz`
   - Example: `data/backups/2026-03-30_backup.tar.gz`
3. **Retention:** Retain the **last 4 weekly snapshots** minimum. Older snapshots may be pruned after 30 days unless specifically requested by the user.
4. **Verification:** After creating a backup, verify the archive is intact by running `tar -tzf data/backups/YYYY-MM-DD_backup.tar.gz | head -20` to confirm the file list is readable.
5. **Pre-Migration Checkpoint:** Before any schema migration, pipeline refactor, or data restoration operation, create a backup. This is non-negotiable.
6. **Backup Log:** Maintain `data/backups/LOG.md` listing each backup taken with: date, trigger (scheduled / pre-operation), number of records, and any notes.
7. **User Notification:** After any backup triggered by a major operation, notify the user: "Backup created: YYYY-MM-DD (N records in master.jsonl, M properties in SQLite)."

*Note: The Data Engineer may implement automated backup tooling, but the Analyst retains responsibility for ad-hoc pre-operation snapshots.*

---

## Automated Weekly Refresh Schedule (DE-162 — Effective 2026-04-01)

**Automated schedule:** Every **Monday at 09:00 UTC** via GitHub Actions (`ci: weekly data refresh` workflow).

| Component | What runs | Files updated |
|-----------|-----------|--------------|
| Data sync | `node scripts/sync_data.js` | `propSearch.db`, `macro_trend.json` |
| Global context | Same pipeline | `macro_trend.json`, `financial_context.json` |
| Git commit | Auto-commits if changes detected | `data/` committed to repo |

**Data freshness monitoring:**
- `GET /api/macro` returns `_meta.days_since_refresh` and `_meta.data_freshness` (green/amber/red)
- Dashboard freshness signal: **green** ≤3 days, **amber** 4–7 days, **red** >7 days since last macro_trend.json update
- `GET /api/health` reports `context_freshness` with bytes and last updated timestamp

**Analyst responsibilities:**
- Monitor the weekly workflow run in GitHub Actions — alert on failures
- Review `macro_trend.json` changes on Mondays; update if BoE rates, HPI, or market volume data is stale
- Run `make tasks-regen` after any task status changes
- The automated job does NOT enrich new leads or source fresh EPC/BoE data — analyst still runs enrichment manually as needed


---
