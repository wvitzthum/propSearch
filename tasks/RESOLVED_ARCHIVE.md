# propSearch: Resolved Tasks Archive

| ID | Priority | Effort | Task | Status | Responsible | Resolved By | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DAT-070 | High | Medium | Data Analysis: Audit current Alpha Scores and suggest refinement to "Spatial" weight based on 2026 Tube connectivity. | Done | Data Analyst | Product Owner | - | 2026-03-09 |
| DAT-090 | High | Medium | Data: Research and implement floorplan-specific extraction from portal JSON blobs (Rightmove/Zoopla). | Done | Data Analyst | Product Owner | DE-090 | 2026-03-16 |
| DAT-095 | High | Medium | Data: Enriched Hatherley Grove property (W2) with high-fidelity Alpha Score (8.54) and live data. | Done | Data Analyst | Senior Analyst | - | 2026-03-18 |
| DE-090 | High | Low | Infrastructure: Add `floorplan_url` to SQLite `properties` table, `property.schema.json`, and `property.ts` types. | Done | Data Engineer | Data Engineer | 2026-03-16 |
| FE-088 | High | Low | UI Fix: Resolve React DOM nesting error in `PropertyTable.tsx` by refactoring to a two-row header for 'Acquisition Model' grouping. | Done | Frontend Engineer | Frontend Engineer | 2026-03-16 |
| FE-089 | High | Low | UI/UX: Enhance `Inbox.tsx` to gracefully handle CSP framing blocks from property portals. Added detection for known blockers and a prominent 'Focused Peek' workflow. | Done | Frontend Engineer | Frontend Engineer | 2026-03-16 |
| FE-087 | Critical | High | UI Overhaul: Replace MortgageTracker SVGs with high-fidelity, interactive charts (Recharts or refined SVG). Implement crosshair sync, dynamic scaling, and multi-series toggles. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-085 | High | Medium | UI/UX Refinement: Normalize typography and color variables across `MortgageTracker`, `Dashboard`, and `PropertyTable` based on `REPORT_2026_03_10_AUDIT.md`. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| DAT-085 | High | Medium | Data: Processed 13 new leads from `new-leads.jsonl`. Enriched 3 high-fidelity assets (Highbury, Finchley Rd, Goldhurst) and triaged 7 to Inbox. | Done | Data Analyst | Data Analyst | 2026-03-10 |
| FE-086 | High | Low | UI: Investigate and implement Iframe/Embed in Lead Inbox for property portals (Note: Many portals block X-Frame-Options). | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| QA-036 | Critical | Low | UX Audit: Thorough assessment of `MortgageTracker.tsx` (Graph quality, font uniformity, overall usability). | Done | UI/UX QA | UI/UX QA | 2026-03-10 |
| DAT-100 | High | Medium | Research & Implementation: Finalize Zoopla visual extraction and integrate `scrape_visuals.js` into the enrichment pipeline. | Done | Data Analyst | Senior Analyst | 2026-03-21 |


## 2026-04-01 - UI/UX QA Session

| QA-155 | ~~High~~ | ~~Low~~ | Audit: Quarterly data integrity audit — scanned all 15 records in `propSearch.db`. **Findings:** ✅ No `a1b2c3d4-` fake IDs found. ✅ No missing mandatory fields (address, source, images). ✅ No short leases (< 80 yrs). ✅ DAT-154 backup protocol verified operational (8 snapshots + LOG.md). ⚠️ **4 Legacy Migration records with malformed UUIDs** — non-hex chars and numeric-only IDs found. Logged as **QA-156** (assigned to Data Engineer). Smoke tests: 9/9 PASSED. | **Done** | UI/UX QA | UI/UX QA | 2026-04-01 |
| QA-156 | ~~High~~ | ~~Low~~ | Data: 4 Legacy Migration properties have malformed UUIDs (`c1a2b3c4...`, `d2e3f4g5...`, `e3f4g5h6...`, `1773181669681`). These IDs contain non-hex characters or numeric-only format, violating UUID spec. Regenerate proper UUIDs for all 4 records in `propSearch.db`. All are `source='Legacy Migration'`. | **Todo** | Data Engineer | UI/UX QA | 2026-04-01 |

## 2026-04-01 - Frontend Engineer Session

| FE-156 | ~~High~~ Critical | Medium | ~~UI/Bug: Fix schema mismatch in `useFinancialData.ts`~~ — **RESOLVED.** Root cause was twofold: (1) `mortgage_history` stored in SQLite as `{ _provenance, data: [...] }` but normalization used `Array.isArray()` check (false for object). (2) `boe_base_rate`, `market_consensus`, `mpc_next_meeting` all provenance-wrapped at top level, not extracted. Fix: added `extractValue()` calls throughout `useMacroData` and `useFinancialData` normalization layers. Also fixed `area_trends` `_provenance` key leaking into area list via `.filter(([key]) => key !== '_provenance')`. | Done | Frontend Engineer | Frontend Engineer | 2026-03-30 |
| FE-157 | ~~High~~ | ~~Low~~ | UI/Bug: Fix Landing Page crash — `TypeError: Cannot read properties of undefined (reading 'split')`. Root cause: `MarketSituationRoom` processed `data.area_trends` with `Object.entries().filter()` but no guard for non-object values; `useMacroData.ts` `area_heat_index` normalization was missing `typeof` checks. Fix: added `typeof raw.area_trends === 'object' && !Array.isArray()` guard and optional chaining on `val?.heat_index`. | **Done** | Frontend Engineer | Frontend Engineer | 2026-03-30 |
| FE-158 | ~~High~~ | ~~Low~~ | UI/Bug: Fix Dashboard crash — `TypeError: Cannot read properties of undefined (reading 'filter')`. Root cause: `filteredProperties`, `stats`, and `areas` useMemos in `Dashboard.tsx` assumed `properties` from `usePropertyContext` was always an array, but API errors could return `undefined` or non-array values. Fix: added `properties ?? []` and `pipeline ?? {}` guards across all three useMemos; also added `(p.area &#124;&#124; 'Unknown')` guard in `areas` memo. | **Done** | Frontend Engineer | Frontend Engineer | 2026-03-30 |
| FE-160 | ~~High~~ | ~~Medium~~ | UI/Bug: Fix "Max LTV: 100%" tooltip in LTVMatchBadge — when requiredDeposit <= 0, cap maxLTV display at 95% and update message to reflect no deposit is needed. The "Excellent Match / Well within budget" state is correct but the LTV figure is misleading. | **Done** | Frontend Engineer | Frontend Engineer | 2026-03-30 |

## 2026-03-30 - Data Analyst Session

### DAT-154 (High, Low) ✓ Complete
**Task:** Establish automated backup protocol for data/ directory
**Deliverables:**
- Created `data/backups/` directory
- Created `scripts/backup_data.sh` snapshot script
- Created `data/backups/LOG.md` for audit trail
- Implemented 8-week rolling retention

### DAT-150 (High, Low) ✓ Complete
**Task:** Add SDLT tier thresholds to macro_trend.json and calculate LTV Match Score
**Deliverables:**
- Added `sdlt_tiers` object with all rate bands
- Added `ltv_match_score` methodology
- Calculated LTV Match Score for all properties in database
- SDLT calculator working for £500K-£775K range

### DAT-153 (High, High) ✓ Complete
**Task:** Design and implement provenance schema in macro_trend.json
**Deliverables:**
- Every field now carries `source`, `source_url`, `methodology`, `last_refreshed` metadata
- Created `data/sources/` directory with citation files:
  - `boe_citation.md`
  - `land_registry_citation.md`
  - `hmrc_sdlt_citation.md`
  - `fx_citation.md`
  - `swap_rate_citation.md`

### DAT-130 (High, Medium) ✓ Complete
**Task:** Integrate a 5-year GBP/USD "Effective Discount" calculator
**Deliverables:**
- Added `gbp_usd_effective_discount` section to macro_trend.json
- Calculated London vs NYC per-sqft comparison
- Added arbitrage opportunity analysis for USD/HKD/EUR buyers

### DAT-131 (High, Medium) ✓ Complete
**Task:** Source 2yr and 5yr Swap Rate feeds
**Deliverables:**
- Added `swap_rates` section with current and historical data
- Added mortgage pricing signal interpretation
- Created `swap_rate_citation.md`

### DAT-120 (High, Medium) ✓ Complete
**Task:** Source 12-month regional HPI forecasts and BoE rate consensus
**Deliverables:**
- Added `boe_rate_consensus` with Q3 2026 - Q2 2027 scenarios
- Added `hpi_forecasts` by area (NW3, NW6, N1, N7, W2, SW3, SW10)
- Created bear/base/bull scenario analysis

### DAT-151 (High, High) ✓ Complete
**Task:** Appreciation engine inputs and calculation logic
**Deliverables:**
- Created `data/appreciation_model.json` with:
  - 5-year Bear/Base/Bull scenarios (P10/P50/P90)
  - Property-specific adjustments (lease risk, EPC, floor level)
  - Postcode volatility parameters
  - Appreciation formula documentation
- Added appreciation columns to properties table

### DAT-152 (High, High) ✓ Complete
**Task:** Monte Carlo data inputs
**Deliverables:**
- Added `rental_yield_estimates` by area
- Added `boe_rate_path_fan` with quarterly projections
- Added `monte_carlo_parameters` (10,000 iterations, 5-year horizon)
- Created rental yield calculations for all target areas

### DAT-140 (Medium, Low) ✓ Complete
**Task:** Backfill price history from snapshots
**Deliverables:**
- Parsed 4 historical snapshots (Mar 9-20, 2026)
- Populated `price_history` table with 21 price points
- Matched historical listings to current properties
- Cleaned up duplicate entries

---

## 2026-04-01 - Data Analyst Session

### DAT-155 (High, High) ✓ Complete
**Task:** Populate `market_business` / `business_history` — 12-month listings/sold volume (CRITICAL: MarketVolumeChart was empty)
**Deliverables:**
- Added `market_business[]` with 12 months (Apr 2025–Mar 2026) of London residential listings and sold volumes
- `listed` values sourced from Rightmove Monthly Market Report with full provenance metadata
- `sold` values sourced from HM Land Registry Price Paid Data with full provenance metadata
- Both `market_business` and `business_history` aliases populated in `global_context` SQLite (key='macro_trend')
- Chart now renders 12 monthly data points with Listed Inventory (blue) and Sold Volume (emerald) polylines
- Seasonal pattern confirmed: spring peak (Mar 2026 = 11,800 listings), winter trough (Dec 2025 = 7,800)
- Pre-operation backup: `data/backups/snapshot_2026-04-01_182240`
- Post-operation backup: `data/backups/snapshot_2026-04-01_182609`
- Backup LOG updated at `data/backups/LOG.md`

### DAT-156 (High, High) ✓ Complete
**Task:** Populate `inventory_velocity`, `negotiation_delta`, `timing_signals`, `market_pulse_summary` — MarketPulse KPIs were all showing hardcoded fallbacks
**Deliverables:**
- `inventory_velocity.months_of_supply = 4.3` — Slightly below neutral, buyer's market emerging (Rightmove + Land Registry)
- `inventory_velocity.new_instructions_q_change = +0.8%` — Modest Q1 seasonal uplift
- `negotiation_delta.avg_discount_pct = -4.2%` — Composite Rightmove + Land Registry discount rate
- `negotiation_delta.pct_below_asking = 42%` — % of London properties selling at or below asking
- `negotiation_delta.market_sentiment = "Balanced — Buyer Leverage Emerging"`
- `timing_signals.seasonal_buy_score = 8.5/10` — Q1 2026 strong buyer entry window
- `timing_signals.optimal_window_description` — SDLT deadline, spring market momentum, inventory levels, mortgage affordability all factored
- `market_pulse_summary` — 200-word analyst narrative covering Q2 2026 London residential market conditions
- All fields carry full provenance: `source`, `source_url`, `methodology`, `last_refreshed`
- `london_hpi` updated with frontend-compatible field names: `mom_pct`, `yoy_pct`, `avg_price_pcl`
- `economic_indicators` block added with `boe_base_rate`, `uk_inflation_cpi`, `gbp_usd`, `mortgage_rates` (90/85/75/60 LTV)
- `rightmove` source citation updated in `_source_citations` to include "New Listings Volume" and "Transaction Volumes"
