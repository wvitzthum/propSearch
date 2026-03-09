# propSearch: Dashboard QA Tasks & Bug Tracking

## Task Template (Copy/Paste)
<!--
| [ID] | [Low/Med/High/Critical] | [Low/Med/High] | [Summary] | [Pending/In Progress/Done] | [Agent Name] | [Agent Name] | [Task ID or -] | [YYYY-MM-DD] |
-->

## Active Backlog
| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-036 | Critical | Low | UX Audit: Thorough assessment of `MortgageTracker.tsx` (Graph quality, font uniformity, overall usability). | Pending | UI/UX QA | Stakeholder | - | 2026-03-09 |
| FE-077 | High | Medium | UI Fix: Restore Metro lines on Dashboard Map. Verify `/api/london-metro` and DuckDB data. | Pending | Frontend Engineer | Stakeholder | - | 2026-03-09 |
| FE-078 | High | Medium | UX Enhancement: Polish "Discovery Dashboard" interaction patterns and visual hierarchy. | Pending | Frontend Engineer | Stakeholder | - | 2026-03-09 |
| FE-079 | High | High | UI Overhaul: Rewrite Mortgage Tracker charts and unify typography/font-sizing. | Pending | Frontend Engineer | Stakeholder | QA-036 | 2026-03-09 |
| DAT-076 | Critical | Medium | Infrastructure: Stabilize `initializeDB` in `server/index.js` and resolve DuckDB connection/locking issues. | Pending | Data Engineer | UI/UX QA | - | 2026-03-09 |
| DAT-075 | EMERGENCY | Low | Data Purge: Delete all assets from DuckDB `properties` that lack `sqft` or `epc` to fix dashboard pollution. | Pending | Data Engineer | UI/UX QA | - | 2026-03-09 |
| FE-075 | Critical | Medium | UI Resilience: Implement null-safety in `AlphaBadge`, `PropertyTable`, and `PreviewDrawer` to prevent crashes on shallow data. | Pending | Frontend Engineer | UI/UX QA | - | 2026-03-09 |
| FE-071 | High | Medium | UI: Replace hardcoded metrics in `MortgageTracker.tsx` (12M PPI Delta, Peak/Low) with dynamic calculations from `mortgage_history`. | Pending | Frontend Engineer | UI/UX QA | - | 2026-03-09 |
| DAT-081 | High | Low | Schema: Add `epc_improvement_potential` and `est_capex_requirement` fields to `property.schema.json` and DuckDB. | Pending | Data Engineer | UI/UX QA | - | 2026-03-09 |
| FE-074 | High | Medium | UI: Implement "CAPEX & Retrofit Node" in `PropertyDetail.tsx` to visualize EPC improvement path and costs. | Pending | Frontend Engineer | UI/UX QA | DAT-081 | 2026-03-09 |
| DAT-070 | High | Medium | Data Analysis: Audit current Alpha Scores and suggest refinement to "Spatial" weight based on 2026 Tube connectivity. | Pending | Data Analyst | Product Owner | - | 2026-03-09 |
| FE-065 | High | Medium | UI Optimization: Update `useProperties` to utilize server-side filtering and pagination via DuckDB. | Pending | Data Engineer | Product Owner | FE-064 | 2026-03-09 |
| FE-072 | Medium | Low | UI: Add Y-axis scale labels and interactive hover tooltips to all SVG charts in `MortgageTracker.tsx`. | Pending | Frontend Engineer | UI/UX QA | - | 2026-03-09 |
| FE-073 | Medium | Medium | UI: Expand LTV Arbitrage Matrix to display multiple LTV bands (60%, 75%, 85%, 90%). | Pending | Frontend Engineer | UI/UX QA | DAT-080 | 2026-03-09 |
| DAT-080 | Medium | Medium | Data: Source and integrate 60%, 75%, and 85% LTV mortgage rate history into `macro_trend.json` / DuckDB. | Pending | Data Engineer | UI/UX QA | - | 2026-03-09 |
| FE-076 | Medium | Low | UI: Add "Data Quality" indicator to assets in the Table view (e.g., a "Shallow" or "Needs Enrichment" tag). | Pending | Frontend Engineer | UI/UX QA | - | 2026-03-09 |

---


## Resolved
| ID | Priority | Effort | Task | Status | Responsible | Resolved By | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DAT-074 | High | High | Data Enrichment: 33 new external leads from `new_leads.jsonp` imported to Inbox and area-mapped. | Done | Data Analyst | Data Analyst | 2026-03-09 |
...
