# propSearch: Active Backlog
<!--
# This file is GENERATED from tasks/tasks.json
# DO NOT EDIT BY HAND — your changes will be overwritten.
#
# Agent workflow:
#   jq '.tasks[] | select(.id=="DAT-155")'  tasks/tasks.json  # read a task
#   jq '.tasks[] | select(.status=="Todo")' tasks/tasks.json  # list all Todo
#   python3 tasks/scripts/generate_tasks_markdown.py --write  # regenerate this file
#
# Section format rules (8-col rows vs 4-col rows) are handled by the generator.
# See tasks/tasks_resolved.json for archived completed tasks.
-->

| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |


---

## 🆕 New Approved Features (2026-03-30)

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| FE-150 | High | Medium | UI: Implement ⌘K Global Command Palette — fuzzy property search, pipeline shortcuts, navigation, macro filters, and recent actions with full keyboard support. | Done | Frontend Engineer | None | 2026-03-30 |
| FE-161 | High | High | UI: Create a dedicated 'Affordability Settings' page — personal mortgage tracker for monthly budget, LTV band, loan term, and deposit. Build a unified `useMortgageCalculator` hook as single source of truth for all mortgage math, reading live rates from `macro_trend.json` via `useFinancialData` (not hardcoded 4.5%). Deprecate inline `BudgetSlider` and `AffordabilityNode` in PropertyDetail — replace with a compact summary card linking to the new page. `LTVMatchBadge` and `BudgetSlider` both consume the shared hook. MortgageTracker page remains independent but shares the same rate data. | In Progress | Frontend Engineer | None | 2026-03-30 |
| FE-153 | High | Medium | UI: Implement Investment Thesis Tags — persistent tagging system for strategic property narratives with batch support and Dashboard filter integration. | In Progress | Frontend Engineer | None | 2026-03-30 |
| FE-152 | High | Medium | UI: Implement 5-Year Capital Appreciation Model — Bloomberg-style fan chart (Bear/Base/Bull scenarios) with IRR vs. risk-free rate signal in PropertyDetail. | Todo | Frontend Engineer | DAT-151, DAT-120 | 2026-03-30 |
| FE-154 | High | High | UI: Implement Monte Carlo Property Price Simulator — run 1,000+ iteration price simulation per property with configurable time horizon (1-5 years), display probability distribution (P10/P50/P90), and overlay on the 5-Year Appreciation fan chart. | Todo | Frontend Engineer | DAT-151, DAT-152 | 2026-03-30 |
| FE-155 | High | Medium | UI: Implement Data Provenance UI — ⓘ source attribution tooltips on every metric, "Data Provenance" collapsible section in PropertyDetail, and freshness indicators (green/amber/red) with links to live source URLs. | Todo | Frontend Engineer | DAT-153 | 2026-03-30 |

---

## 🐛 Bug Fixes

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| QA-157 | High | Low | Accessibility: MortgageTracker.tsx has two unlabelled `<input>` elements (Monthly Budget and Loan Term fields) with no id, aria-label, or aria-labelledby. Confirmed via Playwright accessibility test failure. Add `aria-label` attributes to both inputs per WCAG 1.3.1 & 4.1.2. | Todo | Frontend Engineer | None | 2026-04-01 |

---

## 📊 Data & Research (Unblocked First)

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| DAT-154 | High | Low | Data: Establish automated backup protocol for `data/` directory — create `data/backups/` directory, implement dated snapshot script, maintain `data/backups/LOG.md`, enforce weekly + pre-operation snapshot discipline per analyst README. | Done | Data Analyst | None | 2026-03-30 |
| DAT-157 | Medium | Medium | Historical mortgage rates lack 2yr/5yr term split. The `mortgage_history` table in SQLite only contains rates by LTV band (`rate_90`, `rate_85`, `rate_75`, `rate_60`) but no term length differentiation (2yr vs 5yr). Currently `mortgage_2yr` uses `rate_90` as a proxy which conflates LTV band with term length. Source 2yr and 5yr historical rates by LTV band from BoE Effective Interest Rates database: https://www.bankofengland.co.uk/boeapps/database/. Populate `mortgage_history` with `{ date, boe_rate, mortgage_2yr_90ltv, mortgage_5yr_75ltv, ... }`. See DAT-131. | Todo | Data Analyst | DAT-131 | 2026-03-30 |
| DAT-153 | High | High | Data: Design and implement provenance schema in `macro_trend.json` — every field must carry `source`, `source_url`, `methodology`, and `last_refreshed` metadata. Maintain `data/sources/` directory with citation files per feed. Implement automated freshness validation with stale-data warnings in Market Pulse. | Todo | Data Analyst | None | 2026-03-30 |
| DAT-150 | High | Low | SDLT MILESTONE HIT (2026-04-01) — SDLT tiers now live. Refresh macro_trend.json. Data: Add SDLT tier thresholds to `macro_trend.json` and calculate LTV Match Score for all properties based on current mortgage rates. | Todo | Data Analyst | None | 2026-03-30 |
| DAT-155 | High | High | SDLT MILESTONE HIT (2026-04-01) — Claim immediately. CRITICAL DATA GAP — BoE Chart empty. The `market_business` and `business_history` fields are `undefined` in `global_context` SQLite (`key='macro_trend'`). `MarketSituationRoom`'s `MarketVolumeChart` renders no data. Source: populate these fields with 12-month listings/sold volume per month from Rightmove/Zoopla Land Registry data. Structure: `MarketBusiness[]` with `{ month: string, listed: ProvenanceOrValue<number>, sold?: ProvenanceOrValue<number> }`. The chart expects `month`, `listed`, `sold` fields per row. | Todo | Data Analyst | None | 2026-03-30 |
| DAT-156 | High | High | SDLT MILESTONE HIT (2026-04-01) — Claim immediately. Market Pulse missing data. The following fields are `undefined` in `global_context` (`key='macro_trend'`): `inventory_velocity`, `negotiation_delta`, `timing_signals`, `market_pulse_summary`. `MarketPulse` component renders all four KPIs with hardcoded fallbacks (e.g. `months_of_supply: 4.2`, `avg_discount_pct: -7.4`, `seasonal_buy_score: 8.5`). Source/provide real data for: `inventory_velocity.months_of_supply` (MOS, <4 seller's market, >6 buyer's), `negotiation_delta.avg_discount_pct` (% between asking and sold price), `timing_signals.seasonal_buy_score` (0-10), `market_pulse_summary` (string analyst summary). | Todo | Data Analyst | None | 2026-03-30 |
| DAT-151 | High | High | Research: Source postcode-level HPI history, regional velocity, and BoE rate consensus for appreciation engine. Build appreciation calculation logic (10th/50th/90th percentile scenarios) with property-specific adjustments (lease risk, EPC, floor level, area velocity). | Todo | Data Analyst | DAT-120, DE-120 | 2026-03-30 |
| DAT-152 | High | High | Research: Source all data inputs required for Monte Carlo price simulation — postcode-level HPI volatility (variance/std dev), quarterly rental yield estimates by area, BoE rate path fan. Cross-validate with Land Registry / ONS / BoE published datasets. Maintain source citations and freshness timestamps in `macro_trend.json`. | Todo | Data Analyst | DAT-120, DE-120 | 2026-03-30 |
| DE-160 | High | High | CRITICAL — 25 flagged records restored. As of 2026-04-01, the auto-archive/purge policy has been replaced by an `archived` flag on `properties`. All 25 records previously in `archived_properties` have been restored to `properties` with `archived=1` and `archive_reason='Shallow data: Needs Enrichment'`. **Enrich all 25 flagged records**: source missing EPC ratings, sqft, and other missing fields via re-scrape. Once enriched, set `archived=0`. Records without valid addresses (1 null-address record: `ab5c0faa-b051-414d-a427-bf7ba4c39d5d`) should be investigated — if they cannot be enriched, set `archived=1` with `archive_reason='Cannot Verify — Discard'` (do not delete). See API: `GET /api/properties?archived=true`. | Todo | Data Analyst | None | 2026-04-01 |
| DE-161 | High | Low | Policy update — No deletions from `properties` table. Per user directive 2026-04-01, no production data is ever deleted from `properties`. Incomplete/shallow/duplicate records are flagged with `archived=1` + `archive_reason` text. Review and update the Data Analyst README to reflect: (1) all enrichment candidates are accessed via `properties WHERE archived=1`, never via deletion; (2) analyst sets `archived=1` with a descriptive `archive_reason` for any record they cannot immediately verify; (3) analyst never deletes from `archived_properties` or `properties` without user approval per DATA_GUARDRAILS Rule 2. | Todo | Data Analyst | None | 2026-04-01 |

---

## 🔗 Blocked by Outstanding Data (Clear Dependencies)

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| DAT-120 | High | Medium | Research: Source 12-month regional HPI forecasts and "Market Consensus" for BoE rates (Q3 2026 - Q2 2027). | Todo | Data Analyst | None | 2026-03-21 |
| DAT-130 | High | Medium | Macro: Integrate a 5-year GBP/USD "Effective Discount" calculator for international arbitrage. | Todo | Data Analyst | None | 2026-03-21 |
| DAT-131 | High | Medium | Data: Source 2yr and 5yr Swap Rate feeds to provide leading indicators for mortgage pricing. | Todo | Data Analyst | None | 2026-03-21 |
| FE-120 | High | Medium | UI/UX: Implement "Price Projection" sparklines with Bloomberg-style confidence intervals in the Market Pulse dashboard. | Todo | Frontend Engineer | DAT-120 | 2026-03-21 |
| FE-121 | High | Medium | UI: Implement regional heatmaps for London postcodes to visualize Micro-Market Velocity. | Todo | Frontend Engineer | DE-120 | 2026-03-21 |
| FE-140 | High | Medium | UI: Implement "Price Evolution" chart in Property Detail view using historical data points. | Todo | Frontend Engineer | DE-140 | 2026-03-21 |
| DAT-140 | Medium | Low | Research: Backfill price history for existing properties using historical snapshots in SQLite. | Todo | Data Analyst | DE-140 | 2026-03-21 |

---

## ⚠️ Superseded

| ID | Reason | Replaced By | Date |
| --- | --- | --- | --- |

| FE-151 | Reverse Mortgage Calculator scope fully covered by the dedicated Affordability Settings page in FE-161. The LTV Match Score badges and Budget Slider are now part of FE-161's shared hook scope. | FE-161 | 2026-03-30 |

---

## ✅ Completed

| ID | Task | Resolved | Date |
| --- | --- | --- | --- |

| QA-156 | Data: 4 Legacy Migration properties have malformed UUIDs (`c1a2b3c4...`, `d2e3f4g5...`, `e3f4g5h6...`, `1773181669681`). These IDs contain non-hex characters or numeric-only format, violating UUID spec. Regenerate proper UUIDs for all 4 records in `propSearch.db`. All are `source='Legacy Migration'`. | Done |  |
| QA-155 | Audit: Quarterly data integrity audit — scan all records in `propSearch.db` and `master.jsonl` for hallucinated IDs (`a1b2c3d4-` pattern), missing mandatory fields, and records with `is_estimated=false` but no source citation. Report findings to user. | Done |  |
| DE-140 | Create `price_history` table and update sync pipeline | Done | 2026-03-21 |
| FE-091 | Fix Floorplan view (image clipping + drag-to-pan) and repair Image Carousel | Done | 2026-03-21 |
| DE-130 | Expand `macro_trend.json` with `sdlt_countdown` and `epc_deadline_risk` | Done | 2026-03-21 |
| DE-120 | Create SQLite analytical views for `regional_velocity` | Done | 2026-03-21 |
| FE-090 | Implement Floorplan preview in Lead Inbox and Property Detail tab | Done | 2026-03-21 |
| DE-110 | Implement `/api/inbox/batch` for bulk triage and schema sync | Done | 2026-03-20 |
| DAT-070 | Data Analysis: Audit current Alpha Scores and suggest refinement to 'Spatial' weight based on 2026 Tube connectivity. | Done | 2026-03-09 |
| DAT-090 | Data: Research and implement floorplan-specific extraction from portal JSON blobs (Rightmove/Zoopla). | Done | 2026-03-16 |
| DAT-095 | Data: Enriched Hatherley Grove property (W2) with high-fidelity Alpha Score (8.54) and live data. | Done | 2026-03-18 |
| FE-088 | UI Fix: Resolve React DOM nesting error in `PropertyTable.tsx` by refactoring to a two-row header for 'Acquisition Model' grouping. | Done | 2026-03-16 |
| FE-089 | UI/UX: Enhance `Inbox.tsx` to gracefully handle CSP framing blocks from property portals. Added detection for known blockers and a prominent 'Focused Peek' workflow. | Done | 2026-03-16 |

> **Source:** `tasks/tasks.json`  |  **Archive:** `tasks/tasks_resolved.json`  |  **Generator:** `tasks/scripts/generate_tasks_markdown.py`