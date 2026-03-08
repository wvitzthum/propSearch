# immoSearch: Dashboard QA Tasks & Bug Tracking

## Task Template (Copy/Paste)
<!--
| [ID] | [Low/Med/High/Critical] | [Low/Med/High] | [Summary] | [Pending/In Progress/Done] | [Agent Name] | [Agent Name] | [Task ID or -] | [YYYY-MM-DD] |
-->

## Active Backlog
| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DAT-039 | EMERGENCY | Low | Data Restoration: REVERT `master.json` to `master_backup_07_03_2026.json` to purge 20 hallucinated listings (IDs a1b2c3d4-...). (See REPORT_2026_03_08_CORRUPTION) | Pending | Data Gatherer | UI/UX QA | - | 2026-03-08 |
| DAT-040 | EMERGENCY | Low | Data Hygiene: DELETE all shallow leads in `data/triaged/` or enrich them with full schema before syncing. Current files lack `list_price` and `sqft`. | Pending | Data Gatherer | UI/UX QA | - | 2026-03-08 |
| DAT-041 | High | Medium | Data Workflow Fix: Update `sync_data.js` to strictly validate items. Reject items with `list_price: 0` or missing `sqft`. | Pending | Data Gatherer | UI/UX QA | - | 2026-03-08 |
| FE-058 | High | Medium | UI Implementation: 'Vetted' Pipeline Status - Add Gem/Shield action to Table/Drawer, add Dashboard filter, and update KPI logic. (See REPORT_2026_03_08_VETTED_GAP) | Pending | Frontend Engineer | UI/UX QA | QA-029 | 2026-03-08 |
| DAT-037 | Critical | Low | Data Deletion: DELETE `data/import/immoSearch_listings_20.json` immediately. | Pending | Data Gatherer | UI/UX QA | - | 2026-03-08 |
| DAT-031 | Critical | High | Data Workflow: Implement Inbox Triage Promotion logic (Move approved leads to Master DB) | Pending | Data Gatherer | UI/UX QA | QA-025 | 2026-03-08 |
| FE-050 | Medium | Medium | UX Enhancement: Implement "Vetted" status UI transitions and pipeline visualization | Pending | Frontend Engineer | UI/UX QA | QA-029 | 2026-03-08 |
| QA-030 | High | Low | UX Audit: Evaluate 'Comparative Intelligence' selection workflow and propose improvements for a 'Global Comparison Basket' | Pending | UI/UX QA | Product Owner | - | 2026-03-08 |
| DAT-035 | High | Medium | Data Gathering: Fetch final 8-10 high-fidelity listings to reach the 50-property milestone | In Progress | Data Gatherer | Data Agent | - | 2026-03-08 |
| FE-060 | High | Low | Feasibility Audit: Investigate `iframe` embedding or "Portal Proxy" for direct portal review within Inbox 2.0 | Pending | Frontend Engineer | Product Owner | - | 2026-03-08 |
| INF-001 | Medium | Low | Token Optimization Strategy: Standardize the use of `rtk` (Rust Token Killer) across all high-volume shell commands to reduce agent context noise | Pending | Generalist | Product Owner | - | 2026-03-08 |

---


## Resolved
| ID | Priority | Effort | Task | Status | Responsible | Resolved By | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-029 | Medium | Low | UX Audit: 'Vetted' pipeline status implementation review | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| FE-046 | High | Low | UI Expansion: Update `AREA_COORDS` and Sidebar/Search filters to support 'Chelsea' and 'Primrose Hill' | Done | Frontend Engineer | UI/UX QA | 2026-03-08 |
| QA-031 | High | Medium | UI Fix: Tooltip clipping in overflow containers resolved via React Portals and dynamic positioning | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| QA-025 | High | Medium | Active Capture Audit: Resolve "Black Hole" by implementing triage move logic in `server/index.js` and `sync_data.js` | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| QA-026 | High | Medium | Financial Audit: Verify ownership cost calculation accuracy and mortgage rate visualization fidelity | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| FE-047 | Critical | Medium | Map Institutional Clarity Fix: Implement specific `MAP_USABILITY_GUIDE.md` specs | Done | Frontend Engineer | UI/UX QA | 2026-03-08 |
| FE-048 | Medium | Low | UI Enhancement: Display `floor_level` in Property Detail, Table, and Preview Drawer | Done | Frontend Engineer | UI/UX QA | 2026-03-08 |
| FE-051 | High | Medium | UI Expansion (Mortgage 2.0): Implement Charts, PPI, and LTV Arbitrage widgets in `MortgageTracker.tsx` | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-052 | High | High | UI Overhaul (Compare 2.0): Implement Global Comparison Basket, fixed Comparison Bar, and high-density Analytics Matrix | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-055 | Critical | Low | UI Priority: Set `viewMode` default to 'table' in `Dashboard.tsx` | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-056 | High | Medium | Table Optimization: Audit `PropertyTable` columns, increase page width usage, and ensure all high-signal metrics are visible without scrolling | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-057 | High | Medium | Map Refinement: Reduce Metro line weight to 2.5 and implement a distinct visual state (color/glow) for 'Shortlisted' property markers | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-049 | High | Medium | Institutional Tooltip Expansion: Update all KPICards and Table Headers to include 'Methodology' section as per REQUIREMENTS.md | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| DAT-029 | High | Medium | Data Architecture: Convert `master.json` to JSONL (JSON Lines) | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-032 | High | Low | Data Enrichment: Add RBKC council tax bands to `financial_context.json` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-033 | High | Medium | Data Sourcing (Mortgage 2.0): Add 12-month historical time-series | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-034 | Medium | Low | Data Enrichment (Mortgage 2.0): Add `mpc_next_meeting` and `market_consensus` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-030 | High | Low | Token Optimization: Implement `data/manifest.json` (ID, Area, Price only) | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-026 | High | Low | Data Expansion: Update `data/macro_trend.json` to include 'Primrose Hill (NW1)' metrics | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-027 | Medium | Low | Data Normalization: Standardize 'Chelsea' area names to 'Chelsea (SW3/SW10)' in `master.json` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-028 | High | Medium | Data Enrichment: Update `data/property.schema.json` and extract `floor_level` for all listings in `master.json` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| QA-028 | High | Low | Map Aesthetic Audit: Review Metro line thickness, background contrast (streetnames), and environmental shading (rivers/parks) | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| DAT-023 | High | High | Data Gathering: Fetch/Scrape initial 10-15 high-fidelity Chelsea listings | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-024 | Critical | Medium | Visual Extraction Research: Investigate anti-detection methods | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-025 | High | Medium | Visual Extraction Protocol: Document and implement a multi-stage fallback | Done | Data Gatherer | Data Agent | 2026-03-08 |
| FE-045 | Medium | High | Submission History Tracker: Implement a UI component | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| DAT-022 | High | Low | Research Expansion: Chelsea support | Done | Data Gatherer | Product Owner | 2026-03-08 |
| DAT-021 | High | Medium | Submission Lifecycle: Status tracking in `manual_queue.json` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-019 | High | Low | Manual Ingestion: Automated workflow via `scripts/sync_data.js` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-020 | High | Medium | External Data Ingestion: Automated ingestion via `scripts/sync_data.js` and `data/import/` | Done | Data Gatherer | Data Agent | 2026-03-08 |
| FE-040 | Medium | Medium | Quick Add UI: Implement 'Direct URL Injection' input in Dashboard/SearchModal to write to `manual_queue.json` | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-035 | High | High | Inbox UI: Implement a 'Rapid Review' dashboard for raw listings with keyboard shortcuts | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-036 | Medium | Medium | API Integration: Connect Dashboard to the new Local API Server for 'Inbox' management | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-037 | High | High | Ownership Cost Calculator: Implement logic to calculate total monthly/annual cost | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-038 | High | High | Mortgage Tracker Page: Create a new high-density page visualizing BoE Base Rate vs. Mortgage Rates | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-039 | Medium | Low | KPI Enhancement: Add "Total Monthly Cost" node to Property Detail and Preview Drawer | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| DAT-011 | Medium | Low | Schema Cleanup: Deprecate single 'link' field in master.json | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-014 | High | High | Active Capture Architecture: Design and implement the 'Inbox' storage | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-015 | High | High | Local API Server: Implement Node.js server for 'Inbox' read/write | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-016 | High | Medium | Financial Data Sourcing: Capture Council Tax bands/costs | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-017 | High | Medium | Mortgage Data Pipeline: Source current 90% LTV mortgage rates | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-018 | High | Low | Macro Trend Update: Include historical and current mortgage rates | Done | Data Gatherer | Data Agent | 2026-03-08 |
| FE-044 | High | Medium | Map Refinement: Metro line thickness and shading | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-041 | Medium | Low | Visual Resilience: Implement 'PropertyImage' component | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-042 | High | Medium | UI Fix: Sidebar and scrolling functionality | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-043 | Medium | Medium | UI Enhancement: Minimalist "Location Node" mini-map | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-033 | Medium | Low | UI Refinement: Unify AlphaBadge visualization methodology | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-031 | Medium | Medium | Comparative Intelligence: Property comparison matrix | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-030 | High | Medium | Analyst Annotations: 'Analyst Notes' field | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-034 | Medium | Low | Type Safety: Remove any casts | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-022 | High | High | Gallery Implementation: High-res gallery in drawer/detail | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-025 | High | Medium | Map Intelligence: London Metro overlay | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-027 | High | Medium | Institutional Sorting: Multi-factor sorting | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-028 | Medium | Low | UI Enhancement: 'Running Cost Node' | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-029 | High | Medium | Multi-Link Source Hub: Handle multiple portal/agent links | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| QA-016 | Low | Low | Map Clarity Audit: Evaluate grayscale/inverted map | Done | QA Agent | UI/UX QA | 2026-03-08 |
| QA-021 | High | Medium | UI/UX Audit: Define institutional-grade tooltips | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| QA-022 | High | Low | Aesthetic Audit: Review 'Market Situation Room' | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| QA-023 | High | Medium | Link Integrity Audit: Scan all listings for broken links | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| DAT-009 | High | Medium | Tenure Verification: service_charge, ground_rent, lease_years | Done | Data Gatherer | Data Agent | 2026-03-07 |
| DAT-007 | High | Medium | Spatial Assets: Source and provide london_metro.geojson | Done | Data Gatherer | Product Owner | 2026-03-07 |
| DAT-002 | High | Medium | Institutional Proximity: Paternoster/Canada Square travel times | Done | Data Gatherer | Data Agent | 2026-03-07 |
| DAT-001 | Critical | High | Data Integrity Audit: Scan master.json and re-scrape | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-010 | Critical | Medium | Image Placeholder Audit: Replace with real property assets | Done | Data Gatherer | Data Agent | 2026-03-08 |
| FE-018 | Medium | Low | User Interaction: Functional User Profile Menu | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-019 | High | Medium | Macro Intelligence: Implement 'Market Pulse' dashboard | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-020 | High | Medium | Landing Page Overhaul: Market Business Tracker | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| MAP-006 | Medium | Low | Map Interaction Polish: smoother zoom levels | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-021 | Low | Low | UI Refinement: Change commute labels to 'min' | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-017 | High | Medium | Map Aesthetic & Legibility: Remove yellowish tint | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| MAP-005 | Critical | High | Map Overhaul: Carto Dark tiles + Station/Park overlays | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-016 | High | Medium | UI Polish: Implement descriptive tooltips | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-017 | High | Medium | Commute Visualization: Paternoster/Canada travel nodes | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-001 | High | Low | Dark Mode Audit: Contrast check on Alpha Score badges | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-002 | Critical | Medium | Global Theme Inconsistency: Align all pages to Dark Mode | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-003 | High | Low | Dynamic Sidebar: Connect to real property data | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-004 | Medium | Low | Leaflet Styling Refactor: Remove CSS conflicts | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-005 | Medium | Low | Map Marker Aesthetics: Use theme-defined color variables | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-006 | Medium | Low | Sorting Sync: Unify state between Table and Grid | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-007 | High | Medium | Component Refactoring: Centralize AlphaBadge and KPI Cards | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-008 | Medium | Low | Missing Strategy Page: Implement stub route | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-009 | Medium | Medium | Sidebar Search (⌘K): Implement Search Modal | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-010 | Low | Low | Inconsistent Loading States: Unify Syncing/Pulse UI | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-011 | Medium | Low | Breadcrumb Refinement: Robust navigation labeling | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-012 | High | Low | Source Link Consistency: Open in new tab | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-013 | High | Medium | UI Pattern: Implement "Preview Drawer" | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-014 | Medium | Low | Data Transparency: Tooltips on AlphaBadges | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-015 | Medium | Low | Precision Filters: Numeric range inputs | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
