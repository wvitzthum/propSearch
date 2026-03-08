# Data Fidelity Audit Report: 2026-03-08 (CRITICAL CORRUPTION)

## Audit Objective
Verify the integrity of `data/master.json` following the automated sync of external imports and triaged inbox leads.

## 1. Findings: DATABASE POLLUTION
The `master.json` file has been corrupted by two distinct batches of low-fidelity/synthetic data.

### A. Hallucinated Import Batch (Ingested)
- **Source:** `immoSearch_listings_20.json` (ID range: `a1b2c3d4-0001-...` to `a1b2c3d4-0020-...`).
- **Issues:** 
    - Hallucinated image URLs (e.g., `arundel_sq_main.jpg`).
    - Primary links point to Area Search result pages, not specific properties.
    - Financial data (list_price, sqft) likely synthetic estimates.
- **Status:** **CRITICAL FAILURE** - Polluting the dashboard with broken/fake assets.

### B. Shallow Triaged Leads (Ingestion Pending or Partial)
- **Source:** `data/triaged/` (20+ files).
- **Issues:**
    - Records use `price` field instead of `list_price`, causing `sync_data.js` to default price to £0.
    - Missing crucial metrics: `sqft`, `floor_level`, `epc`, `tenure`, `alpha_score`.
    - Image URLs often `null`.
- **Status:** **HIGH RISK** - Syncing these will create "Empty" cards in the UI with £0 price.

## 2. Impact
- **Financial Distortion:** Dashboard KPIs (Avg Price, Alpha Performance) are now statistically invalid.
- **UX Degradation:** Users clicking "Deep Scan" or "Source Hub" will be met with broken links and 404s.
- **Pipeline Trust:** The "Shortlisted" and "Vetted" workflows are compromised by non-empirical data.

## 3. Mandatory Remediation Plan
1. **REVERT MASTER:** The Data Gatherer must revert `data/master.json` to the last known good state (`data/archive/master_backup_07_03_2026.json`) OR surgically remove IDs starting with `a1b2c3d4-`.
2. **PURGE IMPORTS:** Delete `data/import/immoSearch_listings_20.json` immediately.
3. **STRICT SYNC:** Update `scripts/sync_data.js` to reject items with `list_price: 0` or missing `sqft`.
4. **RE-ENRICH LEADS:** Triaged leads in `data/triaged/` must be enriched with full schema fields (sqft, epc, alpha) before syncing.

## Audit Status
**CRITICAL SYSTEM FAILURE** - Data Integrity Breach.
