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
# Pipe escaping: all | chars in task titles are escaped as &#124; to prevent
# markdown table breakage. Backtick code spans are replaced with <code> HTML.
#
# See tasks/tasks_resolved.json for archived completed tasks.
-->


---

## 🆕 New Approved Features (2026-03-30)

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| FE-150 | High | Medium | UI: Implement ⌘K Global Command Palette — fuzzy property search, pipeline shortcuts, navigation, macro filters, and recent actions with full keyboard support. | Done | Frontend Engineer | None | 2026-03-30 |
| FE-161 | High | High | UI: Create a dedicated 'Affordability Settings' page — personal mortgage tracker for monthly budget, LTV band, loan term, and deposit. Build a unified <code>useMortgageCalculator</code> hook as single source of truth for all mortgage math, reading live rates from <code>macro_trend.json</code> via <code>useFinancialData</code> (not hardcoded 4.5%). Deprecate inline <code>BudgetSlider</code> and <code>AffordabilityNode</code> in PropertyDetail — replace with a compact summary card linking to the new page. <code>LTVMatchBadge</code> and <code>BudgetSlider</code> both consume the shared hook. MortgageTracker page remains independent but shares the same rate data. | Done | Frontend Engineer | None | 2026-03-30 |
| FE-153 | High | Medium | UI: Implement Investment Thesis Tags — persistent tagging system for strategic property narratives with batch support and Dashboard filter integration. | Done | Frontend Engineer | None | 2026-03-30 |
| FE-152 | High | Medium | UI: Implement 5-Year Capital Appreciation Model — Bloomberg-style fan chart (Bear/Base/Bull scenarios) with IRR vs. risk-free rate signal in PropertyDetail. | Todo | Frontend Engineer | DAT-151, DAT-120 | 2026-03-30 |
| FE-154 | High | High | UI: Implement Monte Carlo Property Price Simulator — run 1,000+ iteration price simulation per property with configurable time horizon (1-5 years), display probability distribution (P10/P50/P90), and overlay on the 5-Year Appreciation fan chart. | Todo | Frontend Engineer | DAT-151, DAT-152 | 2026-03-30 |
| FE-155 | High | Medium | UI: Implement Data Provenance UI — ⓘ source attribution tooltips on every metric, "Data Provenance" collapsible section in PropertyDetail, and freshness indicators (green/amber/red) with links to live source URLs. | Todo | Frontend Engineer | DAT-153 | 2026-03-30 |
| FE-163 | High | High | UI: Build 'Market Conditions Radar' — a Bloomberg-density market intelligence panel giving the user a single-glance verdict on whether the market is in their favour. Four new components: (1) MarketConditionsBar — slim horizontal status strip showing Market Mode (BUYER/NEUTRAL/SELLER from MOS), Negotiation Room (%), Rate Signal (FALLING/HOLDING/RISING from swap rate trend), Seasonal Window score (1-10), and composite Buyer Favour Score (0-10). (2) AreaPerformanceTable — compact table replacing the Area Heat bar chart, showing each target borough's 12-month HPI forecast vs London-wide benchmark with delta column. (3) SwapRateSignal — leading mortgage indicator strip showing current 2yr/5yr GBP swap rates, implied fixed mortgage rate, directional signal, and 5-month sparkline history. (4) BoERatePathChart — SVG fan chart showing current rate, market-implied path Q3 2026-Q2 2027 (bear/base/bull scenarios), and MPC meeting markers. Also compact-rework MarketPulse: reduce 4-KPI + heat bars + summary spread across two rows into a dense single-section with SDLT urgency badge. Integrate MarketConditionsBar above the property grid. Add AreaPerformanceTable, SwapRateSignal, and BoERatePathChart below MarketPulse. Extend types/macro.ts with BoERateConsensus, SwapRates, HPIForecasts, AreaTrends interfaces. Extend useMacroData.ts to normalise and expose all new fields. Requires boe_rate_consensus, swap_rates, hpi_forecasts, and area_trends in macro_trend.json (already populated). | Todo | Frontend Engineer | None | 2026-04-01 |
| FE-164 | High | High | UI: Build 'Market Conditions Radar' — a Bloomberg-density market intelligence panel giving the user a single-glance verdict on whether the market is in their favour. Four new components: (1) MarketConditionsBar — slim horizontal status strip showing Market Mode (BUYER/NEUTRAL/SELLER from MOS), Negotiation Room (%), Rate Signal (FALLING/HOLDING/RISING from swap rate trend), Seasonal Window score (1-10), and composite Buyer Favour Score (0-10). (2) AreaPerformanceTable — compact table replacing the Area Heat bar chart, showing each target borough's 12-month HPI forecast vs London-wide benchmark with delta column. (3) SwapRateSignal — leading mortgage indicator strip showing current 2yr/5yr GBP swap rates, implied fixed mortgage rate, directional signal, and 5-month sparkline history. (4) BoERatePathChart — SVG fan chart showing current rate, market-implied path Q3 2026-Q2 2027 (bear/base/bull scenarios), and MPC meeting markers. Also compact-rework MarketPulse: reduce 4-KPI + heat bars + summary spread across two rows into a dense single-section with SDLT urgency badge. Integrate MarketConditionsBar above the property grid. Add AreaPerformanceTable, SwapRateSignal, and BoERatePathChart below MarketPulse. Extend types/macro.ts with BoERateConsensus, SwapRates, HPIForecasts, AreaTrends interfaces. Extend useMacroData.ts to normalise and expose all new fields. Requires boe_rate_consensus, swap_rates, hpi_forecasts, and area_trends in macro_trend.json (already populated). | Todo | Frontend Engineer | None | 2026-04-01 |

---

## 🐛 Bug Fixes

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| FE-163 | High | Low | Inbox.tsx renders only 2 broken fragments — API returns mixed file formats (flat array vs wrapper object with leads key) but frontend assumed flat RawListing[] only. Rewrote fetchInbox normalizer to handle both: (A) flat array [{},...] files and (B) wrapper { leads: [...] } batch export files, extracting filename from server-added property. | Done | Frontend Engineer | None | 2026-04-01 |
| FE-162 | High | Low | Runtime crash in Inbox.tsx — Cannot read properties of undefined (reading toLocaleString). Two locations call listing.price.toLocaleString() without null guard, crashing when the API returns listings without a price field. | Done | Frontend Engineer | None | 2026-04-01 |
| QA-157 | High | Low | Accessibility: MortgageTracker.tsx has two unlabelled <code><input></code> elements (Monthly Budget and Loan Term fields) with no id, aria-label, or aria-labelledby. Confirmed via Playwright accessibility test failure. Add <code>aria-label</code> attributes to both inputs per WCAG 1.3.1 & 4.1.2. | Done | Frontend Engineer | None | 2026-04-01 |
| QA-158 | High | Medium | UI/UX Audit: After FE-162 (Market Conditions Radar), verify all new components render correctly on 1280px, 1440px, and 1920px viewport widths. Check MarketConditionsBar for horizontal overflow on narrow viewports. Verify AreaPerformanceTable column alignment. Validate SwapRateSignal sparkline renders in all themes. Confirm BoERatePathChart SVG fan chart scales without clipping. Report layout findings to Frontend Engineer as tickets. | Todo | UI/UX QA | FE-164 | 2026-04-01 |

---

## 📊 Data & Research (Unblocked First)

| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |

| DAT-154 | High | Low | Data: Establish automated backup protocol for <code>data/</code> directory — create <code>data/backups/</code> directory, implement dated snapshot script, maintain <code>data/backups/LOG.md</code>, enforce weekly + pre-operation snapshot discipline per analyst README. | Done | Data Analyst | None | 2026-03-30 |
| DAT-157 | Medium | Medium | Historical mortgage rates lack 2yr/5yr term split. The <code>mortgage_history</code> table in SQLite only contains rates by LTV band (<code>rate_90</code>, <code>rate_85</code>, <code>rate_75</code>, <code>rate_60</code>) but no term length differentiation (2yr vs 5yr). Currently <code>mortgage_2yr</code> uses <code>rate_90</code> as a proxy which conflates LTV band with term length. Source 2yr and 5yr historical rates by LTV band from BoE Effective Interest Rates database: https://www.bankofengland.co.uk/boeapps/database/. Populate <code>mortgage_history</code> with <code>{ date, boe_rate, mortgage_2yr_90ltv, mortgage_5yr_75ltv, ... }</code>. See DAT-131. | Todo | Data Analyst | DAT-131 | 2026-03-30 |
| DAT-153 | High | High | Data: Design and implement provenance schema in <code>macro_trend.json</code> — every field must carry <code>source</code>, <code>source_url</code>, <code>methodology</code>, and <code>last_refreshed</code> metadata. Maintain <code>data/sources/</code> directory with citation files per feed. Implement automated freshness validation with stale-data warnings in Market Pulse. | Todo | Data Analyst | None | 2026-03-30 |
| DAT-150 | High | Low | SDLT MILESTONE HIT (2026-04-01) — SDLT tiers now live. Refresh macro_trend.json. Data: Add SDLT tier thresholds to <code>macro_trend.json</code> and calculate LTV Match Score for all properties based on current mortgage rates. | Todo | Data Analyst | None | 2026-03-30 |
| DAT-155 | High | High | SDLT MILESTONE HIT (2026-04-01) — Claim immediately. CRITICAL DATA GAP — BoE Chart empty. The <code>market_business</code> and <code>business_history</code> fields are <code>undefined</code> in <code>global_context</code> SQLite (<code>key='macro_trend'</code>). <code>MarketSituationRoom</code>'s <code>MarketVolumeChart</code> renders no data. Source: populate these fields with 12-month listings/sold volume per month from Rightmove/Zoopla Land Registry data. Structure: <code>MarketBusiness[]</code> with <code>{ month: string, listed: ProvenanceOrValue<number>, sold?: ProvenanceOrValue<number> }</code>. The chart expects <code>month</code>, <code>listed</code>, <code>sold</code> fields per row. | Todo | Data Analyst | None | 2026-03-30 |
| DAT-156 | High | High | SDLT MILESTONE HIT (2026-04-01) — Claim immediately. Market Pulse missing data. The following fields are <code>undefined</code> in <code>global_context</code> (<code>key='macro_trend'</code>): <code>inventory_velocity</code>, <code>negotiation_delta</code>, <code>timing_signals</code>, <code>market_pulse_summary</code>. <code>MarketPulse</code> component renders all four KPIs with hardcoded fallbacks (e.g. <code>months_of_supply: 4.2</code>, <code>avg_discount_pct: -7.4</code>, <code>seasonal_buy_score: 8.5</code>). Source/provide real data for: <code>inventory_velocity.months_of_supply</code> (MOS, <4 seller's market, >6 buyer's), <code>negotiation_delta.avg_discount_pct</code> (% between asking and sold price), <code>timing_signals.seasonal_buy_score</code> (0-10), <code>market_pulse_summary</code> (string analyst summary). | Todo | Data Analyst | None | 2026-03-30 |
| DAT-151 | High | High | Research: Source postcode-level HPI history, regional velocity, and BoE rate consensus for appreciation engine. Build appreciation calculation logic (10th/50th/90th percentile scenarios) with property-specific adjustments (lease risk, EPC, floor level, area velocity). | Todo | Data Analyst | DAT-120, DE-120 | 2026-03-30 |
| DAT-152 | High | High | Research: Source all data inputs required for Monte Carlo price simulation — postcode-level HPI volatility (variance/std dev), quarterly rental yield estimates by area, BoE rate path fan. Cross-validate with Land Registry / ONS / BoE published datasets. Maintain source citations and freshness timestamps in <code>macro_trend.json</code>. | Todo | Data Analyst | DAT-120, DE-120 | 2026-03-30 |
| DE-160 | High | High | CRITICAL — 25 flagged records restored. As of 2026-04-01, the auto-archive/purge policy has been replaced by an <code>archived</code> flag on <code>properties</code>. All 25 records previously in <code>archived_properties</code> have been restored to <code>properties</code> with <code>archived=1</code> and <code>archive_reason='Shallow data: Needs Enrichment'</code>. **Enrich all 25 flagged records**: source missing EPC ratings, sqft, and other missing fields via re-scrape. Once enriched, set <code>archived=0</code>. Records without valid addresses (1 null-address record: <code>ab5c0faa-b051-414d-a427-bf7ba4c39d5d</code>) should be investigated — if they cannot be enriched, set <code>archived=1</code> with <code>archive_reason='Cannot Verify — Discard'</code> (do not delete). See API: <code>GET /api/properties?archived=true</code>. | Done | Data Analyst | None | 2026-04-01 |
| DE-161 | High | Low | Policy update — No deletions from <code>properties</code> table. Per user directive 2026-04-01, no production data is ever deleted from <code>properties</code>. Incomplete/shallow/duplicate records are flagged with <code>archived=1</code> + <code>archive_reason</code> text. Review and update the Data Analyst README to reflect: (1) all enrichment candidates are accessed via <code>properties WHERE archived=1</code>, never via deletion; (2) analyst sets <code>archived=1</code> with a descriptive <code>archive_reason</code> for any record they cannot immediately verify; (3) analyst never deletes from <code>archived_properties</code> or <code>properties</code> without user approval per DATA_GUARDRAILS Rule 2. | Todo | Data Analyst | None | 2026-04-01 |
| DAT-158 | High | Medium | Data: Populate <code>market_business</code> and <code>business_history</code> fields in <code>global_context</code> SQLite (key='macro_trend'). MarketSituationRoom's MarketVolumeChart is empty in production. Source 12-month listings/sold volume per month from Rightmove/Zoopla/Land Registry data. Structure: MarketBusiness[] with { month: string, listed: ProvenanceOrValue<number>, sold?: ProvenanceOrValue<number> }. Also update the API endpoint GET /api/macro to return these fields so MarketVolumeChart renders. Note: macro_trend.json already has market_business populated with 12 months of Rightmove data — the gap is the SQLite sync and API delivery layer. | Todo | Data Analyst | None | 2026-04-01 |
| DAT-159 | High | Medium | Data: Populate <code>inventory_velocity</code>, <code>negotiation_delta</code>, <code>timing_signals</code>, and <code>market_pulse_summary</code> in global_context SQLite (key='macro_trend'). MarketPulse component renders four KPIs with hardcoded fallbacks in production (months_of_supply: 4.2, avg_discount_pct: -7.4, seasonal_buy_score: 8.5). These fields are undefined in the API response. Source real data: MOS from Rightmove monthly report, avg discount from Land Registry sold vs asking price, seasonal buy score from historical transaction timing analysis, and market_pulse_summary as an analyst-written one-sentence market verdict. Update GET /api/macro to return these fields. | Todo | Data Analyst | None | 2026-04-01 |

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

| QA-156 | Data: 4 Legacy Migration properties have malformed UUIDs (<code>c1a2b3c4...</code>, <code>d2e3f4g5...</code>, <code>e3f4g5h6...</code>, <code>1773181669681</code>). These IDs contain non-hex characters or numeric-only format, violating UUID spec. Regenerate proper UUIDs for all 4 records in <code>propSearch.db</code>. All are <code>source='Legacy Migration'</code>. | Done |  |
| QA-155 | Audit: Quarterly data integrity audit — scan all records in <code>propSearch.db</code> and <code>master.jsonl</code> for hallucinated IDs (<code>a1b2c3d4-</code> pattern), missing mandatory fields, and records with <code>is_estimated=false</code> but no source citation. Report findings to user. | Done |  |
| DE-140 | Create <code>price_history</code> table and update sync pipeline | Done | 2026-03-21 |
| FE-091 | Fix Floorplan view (image clipping + drag-to-pan) and repair Image Carousel | Done | 2026-03-21 |
| DE-130 | Expand <code>macro_trend.json</code> with <code>sdlt_countdown</code> and <code>epc_deadline_risk</code> | Done | 2026-03-21 |
| DE-120 | Create SQLite analytical views for <code>regional_velocity</code> | Done | 2026-03-21 |
| FE-090 | Implement Floorplan preview in Lead Inbox and Property Detail tab | Done | 2026-03-21 |
| DE-110 | Implement <code>/api/inbox/batch</code> for bulk triage and schema sync | Done | 2026-03-20 |
| DAT-070 | Data Analysis: Audit current Alpha Scores and suggest refinement to 'Spatial' weight based on 2026 Tube connectivity. | Done | 2026-03-09 |
| DAT-090 | Data: Research and implement floorplan-specific extraction from portal JSON blobs (Rightmove/Zoopla). | Done | 2026-03-16 |
| DAT-095 | Data: Enriched Hatherley Grove property (W2) with high-fidelity Alpha Score (8.54) and live data. | Done | 2026-03-18 |
| FE-088 | UI Fix: Resolve React DOM nesting error in <code>PropertyTable.tsx</code> by refactoring to a two-row header for 'Acquisition Model' grouping. | Done | 2026-03-16 |
| FE-089 | UI/UX: Enhance <code>Inbox.tsx</code> to gracefully handle CSP framing blocks from property portals. Added detection for known blockers and a prominent 'Focused Peek' workflow. | Done | 2026-03-16 |

> **Source:** `tasks/tasks.json`  |  **Archive:** `tasks/tasks_resolved.json`  |  **Generator:** `tasks/scripts/generate_tasks_markdown.py`