# immoSearch: Dashboard QA Tasks & Bug Tracking

## Task Template (Copy/Paste)
<!--
| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [ID] | [Low/Med/High/Critical] | [Low/Med/High] | [Summary] | [Pending/In Progress/Done] | [Agent Name] | [Agent Name] | [Task ID or -] | [YYYY-MM-DD] |
-->

## Active Backlog
| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DAT-011 | Medium | Low | Schema Cleanup: Deprecate single 'link' field in master.json once the frontend is updated to use 'links' array | Pending | Data Gatherer | Product Owner | FE-029 | 2026-03-07 |
| FE-031 | Medium | Medium | Comparative Intelligence: Implement side-by-side property comparison matrix (max 3 properties) | Pending | Frontend Engineer | Product Owner | - | 2026-03-08 |
| DAT-012 | High | High | High-Fidelity Dataset Expansion: Populate 'master.json' until it reaches 50 high-fidelity listings with full schema support (gallery, links, running costs) | Pending | Data Gatherer | Product Owner | - | 2026-03-08 |
| QA-024 | High | Medium | Data Audit: Verify the final dataset of 50 properties for schema completeness, image fidelity, and geographical distribution | Pending | UI/UX QA | Product Owner | DAT-012 | 2026-03-08 |
| DAT-013 | High | Low | Schema Alignment: Update 'data/property.schema.json' to include `service_charge`, `ground_rent`, and `lease_years_remaining`. Synchronize 'frontend/src/types/property.ts' as per ADR-005 | Pending | Data Gatherer | Product Owner | - | 2026-03-08 |
| FE-033 | Medium | Low | UI Refinement: Unify AlphaBadge visualization methodology to be grounded in formal schema metrics | Pending | Frontend Engineer | UI/UX QA | - | 2026-03-08 |
| DAT-014 | High | High | Active Capture Architecture: Design and implement the 'Inbox' storage (SQLite or JSON-based) and update scraper to capture 100% of raw listings | Pending | Data Gatherer | Product Owner | - | 2026-03-08 |
| DAT-015 | High | High | Local API Server: Implement a lightweight Node.js/Express server in `server/` to handle 'Inbox' read/write operations for the frontend | Pending | Data Gatherer | Product Owner | DAT-014 | 2026-03-08 |
| FE-035 | High | High | Inbox UI: Implement a 'Rapid Review' dashboard for raw listings with keyboard shortcuts (A=Approve, R=Reject) | Pending | Frontend Engineer | Product Owner | DAT-015 | 2026-03-08 |
| FE-036 | Medium | Medium | API Integration: Connect Dashboard to the new Local API Server for 'Inbox' management | Pending | Frontend Engineer | Product Owner | FE-035 | 2026-03-08 |
| QA-025 | High | Medium | Active Capture Audit: Validate the end-to-end workflow from raw scrape -> Inbox -> Master DB promotion | Pending | UI/UX QA | Product Owner | FE-036 | 2026-03-08 |
| QA-026 | High | Medium | Financial Audit: Verify ownership cost calculation accuracy and mortgage rate visualization fidelity | Pending | UI/UX QA | Product Owner | FE-038 | 2026-03-08 |
| DAT-019 | High | Low | Manual Ingestion: Update workflow to prioritize and process `data/manual_queue.json` in every cycle | Pending | Data Gatherer | Product Owner | - | 2026-03-08 |
| FE-040 | Medium | Medium | Quick Add UI: Implement 'Direct URL Injection' input in Dashboard to write to `manual_queue.json` via local API | Pending | Frontend Engineer | Product Owner | DAT-015 | 2026-03-08 |

---


## Resolved
| ID | Priority | Effort | Task | Status | Responsible | Resolved By | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FE-030 | High | Medium | Analyst Annotations: Implement local-persistence 'Analyst Notes' field in Property Detail and Preview Drawer | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-026 | Medium | Medium | UI Refinement: Implement comprehensive hover tooltips based on `agents/ui_ux_qa/METRIC_DEFINITIONS.md` | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-034 | Medium | Low | Type Safety: Remove '(property as any)' type casts in 'PreviewDrawer.tsx' and 'PropertyDetail.tsx' once 'Property' interface is updated | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-022 | High | High | Gallery Implementation: Render high-res image gallery in Preview Drawer and Detail views | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-025 | High | Medium | Map Intelligence: Implement semi-transparent London Metro overlay using GeoJSON data | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-027 | High | Medium | Institutional Sorting: Implement multi-factor sorting (Value Gap, Commute Utility, Appreciation) across all Dashboard views | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-028 | Medium | Low | UI Enhancement: Implement 'Running Cost Node' in Asset Detail and Preview Drawer views | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| FE-029 | High | Medium | Multi-Link Source Hub: Implement a 'Source Hub' dropdown/menu in all views to handle multiple portal/agent links and fix broken button logic | Done | Frontend Engineer | Frontend Agent | 2026-03-08 |
| QA-016 | Low | Low | Map Clarity Audit: Evaluate if grayscale/inverted map remains usable for London experts | Done | QA Agent | UI/UX QA | 2026-03-08 |
| QA-021 | High | Medium | UI/UX Audit: Define institutional-grade tooltip content for all metrics (Alpha, MOS, Heat, etc.) | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| QA-022 | High | Low | Aesthetic Audit: Review 'Market Situation Room' (Landing Page) for Linear/Bloomberg alignment | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| QA-023 | High | Medium | Link Integrity Audit: Scan all listings for broken 'links' and ensure every property has both a portal and direct agent link if possible | Done | UI/UX QA | UI/UX QA | 2026-03-08 |
| DAT-009 | High | Medium | Tenure Verification: Research and populate 'service_charge', 'ground_rent', and 'lease_years_remaining' for new properties | Done | Data Gatherer | Data Agent | 2026-03-07 |
| DAT-007 | High | Medium | Spatial Assets: Source and provide 'data/london_metro.geojson' for Tube/Overground lines | Done | Data Gatherer | Product Owner | 2026-03-07 |
| DAT-002 | High | Medium | Institutional Proximity: Add travel time to Paternoster Square and Canada Square to new research | Done | Data Gatherer | Data Agent | 2026-03-07 |
| DAT-001 | Critical | High | Data Integrity Audit: Scan master.json for placeholder/broken URLs and re-scrape | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-010 | Critical | Medium | Image Placeholder Audit: Replace all Unsplash/synthetic image URLs with real property visual assets | Done | Data Gatherer | Data Agent | 2026-03-08 |
| FE-018 | Medium | Low | User Interaction: Implement a functional User Profile Menu in the sidebar footer | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-019 | High | Medium | Macro Intelligence: Implement 'Market Pulse' dashboard/widget once scoped by QA | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-020 | High | Medium | Landing Page Overhaul: Implement Market Business Tracker and Timing Indicator | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| MAP-006 | Medium | Low | Map Interaction Polish: Implement auto-fit bounds and smoother zoom levels | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-021 | Low | Low | UI Refinement: Change commute labels from 'm' to 'min' in Map Popup for clarity | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-017 | High | Medium | Map Aesthetic & Legibility: Remove yellowish sepia tint and ensure markers are not filtered | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| MAP-005 | Critical | High | Map Overhaul: Massive enhancement of readability and spatial context (Carto Dark tiles + Station/Park overlays) | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-016 | High | Medium | UI Polish: Implement descriptive tooltips for all Table headers explaining metrics | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-017 | High | Medium | Commute Visualization: Render Paternoster/Canada travel nodes in Table & Detail views | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-001 | High | Low | Dark Mode Audit: Contrast check on Alpha Score badges | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-002 | Critical | Medium | Global Theme Inconsistency: Align Landing, Detail & 404 pages to Dark Mode | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-003 | High | Low | Dynamic Sidebar: Connect "Target Areas" to real property data | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-004 | Medium | Low | Leaflet Styling Refactor: Remove CSS conflicts in App.css/index.css | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-005 | Medium | Low | Map Marker Aesthetics: Use theme-defined color variables for Markers | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-006 | Medium | Low | Sorting Sync: Unify sorting state between Table and Grid views | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-007 | High | Medium | Component Refactoring: Centralize AlphaBadge and KPI Cards | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-008 | Medium | Low | Missing Strategy Page: Implement placeholder or stub route for /strategy | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-009 | Medium | Medium | Sidebar Search (⌘K): Implement Search Modal or functional search bar | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-010 | Low | Low | Inconsistent Loading States: Unify Syncing/Pulse UI across pages | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-011 | Medium | Low | Breadcrumb Refinement: Implement robust navigation labeling in Layout Header | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-012 | High | Low | Source Link Consistency: Ensure all 'Source' links open in new tab with proper security | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-013 | High | Medium | UI Pattern: Implement "Preview Drawer" for property details to prevent context loss | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-014 | Medium | Low | Data Transparency: Add Tooltips to AlphaBadges explaining score components | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-015 | Medium | Low | Precision Filters: Add numeric range inputs for Price and SQFT in Dashboard | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
