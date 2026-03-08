# immoSearch: Dashboard QA Tasks & Bug Tracking

## Task Template (Copy/Paste)
<!--
| ID | Priority | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ID] | [Low/Med/High/Critical] | [Summary] | [Pending/In Progress/Done] | [Agent Name] | [Agent Name] | [Task ID or -] | [YYYY-MM-DD] |
-->

## Active Backlog
| ID | Priority | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-016 | Low | Map Clarity Audit: Evaluate if grayscale/inverted map remains usable for London experts | In Progress | QA Agent | QA Agent | - | 2026-03-07 |
| QA-022 | High | Aesthetic Audit: Review 'Market Situation Room' (Landing Page) for Linear/Bloomberg alignment | Pending | UI/UX QA | Product Owner | FE-020 | 2026-03-07 |
| QA-023 | High | Link Integrity Audit: Scan all listings for broken 'links' and ensure every property has both a portal and direct agent link if possible | Pending | UI/UX QA | Product Owner | DAT-011 | 2026-03-07 |
| DAT-007 | High | Spatial Assets: Source and provide 'data/london_metro.geojson' for Tube/Overground lines | Done | Data Gatherer | Product Owner | - | 2026-03-07 |
| DAT-011 | Medium | Schema Cleanup: Deprecate single 'link' field in master.json once the frontend is updated to use 'links' array | Pending | Data Gatherer | Product Owner | FE-029 | 2026-03-07 |
| FE-022 | High | Gallery Implementation: Render high-res image gallery in Preview Drawer and Detail views | Pending | Frontend Engineer | Data Gatherer | DAT-001 | 2026-03-07 |
| FE-025 | High | Map Intelligence: Implement semi-transparent London Metro overlay using GeoJSON data | Pending | Frontend Engineer | Product Owner | DAT-007 | 2026-03-07 |
| QA-021 | High | UI/UX Audit: Define institutional-grade tooltip content for all metrics (Alpha, MOS, Heat, etc.) | Pending | UI/UX QA | Product Owner | - | 2026-03-07 |
| FE-026 | Medium | UI Refinement: Implement comprehensive hover tooltips for all complex metrics based on QA audit | Pending | Frontend Engineer | Product Owner | QA-021 | 2026-03-07 |
| FE-027 | High | Institutional Sorting: Implement multi-factor sorting (Value Gap, Commute Utility, Appreciation) across all Dashboard views | Pending | Frontend Engineer | Product Owner | - | 2026-03-07 |
| FE-028 | Medium | UI Enhancement: Implement 'Running Cost Node' in Asset Detail and Preview Drawer views | Pending | Frontend Engineer | Product Owner | - | 2026-03-07 |
| FE-029 | High | Multi-Link Source Hub: Implement a 'Source Hub' dropdown/menu in all views to handle multiple portal/agent links and fix broken button logic | Pending | Frontend Engineer | Product Owner | DAT-011 | 2026-03-07 |

---


## Resolved
| ID | Priority | Task | Status | Responsible | Resolved By | Date |
| --- | --- | --- | --- | --- | --- | --- |
| DAT-009 | High | Tenure Verification: Research and populate 'service_charge', 'ground_rent', and 'lease_years_remaining' for new properties | Done | Data Gatherer | Data Agent | 2026-03-07 |
| DAT-002 | High | Institutional Proximity: Add travel time to Paternoster Square and Canada Square to new research | Done | Data Gatherer | Data Agent | 2026-03-07 |
| DAT-001 | Critical | Data Integrity Audit: Scan master.json for placeholder/broken URLs and re-scrape | Done | Data Gatherer | Data Agent | 2026-03-08 |
| DAT-010 | Critical | Image Placeholder Audit: Replace all Unsplash/synthetic image URLs with real property visual assets | Done | Data Gatherer | Data Agent | 2026-03-08 |
| FE-018 | Medium | User Interaction: Implement a functional User Profile Menu in the sidebar footer | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-019 | High | Macro Intelligence: Implement 'Market Pulse' dashboard/widget once scoped by QA | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-020 | High | Landing Page Overhaul: Implement Market Business Tracker and Timing Indicator | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| MAP-006 | Medium | Map Interaction Polish: Implement auto-fit bounds and smoother zoom levels | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-021 | Low | UI Refinement: Change commute labels from 'm' to 'min' in Map Popup for clarity | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-017 | High | Map Aesthetic & Legibility: Remove yellowish sepia tint and ensure markers are not filtered | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| MAP-005 | Critical | Map Overhaul: Massive enhancement of readability and spatial context (Carto Dark tiles + Station/Park overlays) | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-016 | High | UI Polish: Implement descriptive tooltips for all Table headers explaining metrics | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| FE-017 | High | Commute Visualization: Render Paternoster/Canada travel nodes in Table & Detail views | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-001 | High | Dark Mode Audit: Contrast check on Alpha Score badges | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-002 | Critical | Global Theme Inconsistency: Align Landing, Detail & 404 pages to Dark Mode | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-003 | High | Dynamic Sidebar: Connect "Target Areas" to real property data | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-004 | Medium | Leaflet Styling Refactor: Remove CSS conflicts in App.css/index.css | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-005 | Medium | Map Marker Aesthetics: Use theme-defined color variables for Markers | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-006 | Medium | Sorting Sync: Unify sorting state between Table and Grid views | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-007 | High | Component Refactoring: Centralize AlphaBadge and KPI Cards | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-008 | Medium | Missing Strategy Page: Implement placeholder or stub route for /strategy | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-009 | Medium | Sidebar Search (⌘K): Implement Search Modal or functional search bar | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-010 | Low | Inconsistent Loading States: Unify Syncing/Pulse UI across pages | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-011 | Medium | Breadcrumb Refinement: Implement robust navigation labeling in Layout Header | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-012 | High | Source Link Consistency: Ensure all 'Source' links open in new tab with proper security | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-013 | High | UI Pattern: Implement "Preview Drawer" for property details to prevent context loss | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-014 | Medium | Data Transparency: Add Tooltips to AlphaBadges explaining score components | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |
| QA-015 | Medium | Precision Filters: Add numeric range inputs for Price and SQFT in Dashboard | Done | Frontend Engineer | Frontend Agent | 2026-03-07 |

---

## Detailed Task Logs (Historical)

### [DAT-001] Data Audit
- **Resolution:** Scanned `master.json` and purged placeholder URLs. Re-generated 50 high-fidelity listings with enriched schema data (gallery, StreetView, and commute times).

### [DAT-002] Proximity Schema
- **Resolution:** Integrated institutional proximity travel times (Paternoster/Canada Square) for all entries. Verified against Tube map transit models.

### [FE-018] User Profile Menu
- **Resolution:** Implemented a functional dropdown menu in the sidebar footer with Profile, Billing, and Disconnect actions.

### [FE-019] Market Pulse Widget
- **Resolution:** Implemented `MarketPulse.tsx` component in Dashboard. Displays 4 KPI macro nodes, Area Heat Index, and Strategic Summary. Integrated `useMacroData` hook.

### [FE-020] Landing Page Overhaul
- **Resolution:** Implemented `MarketSituationRoom.tsx` with a custom SVG Volume Chart and Timing Indicator Gauge. Overhauled hero section for an institutional look.

### [MAP-006] Map Auto-fit
- **Resolution:** Implemented `AutoFitBounds` component in `Dashboard.tsx` to automatically center and zoom the map based on filtered property clusters.

### [FE-021] Map Label Refinement
- **Resolution:** Changed commute labels from `m` to `min` in map popups for clarity.

### [MAP-005] Map Overhaul
- **Resolution:** Enhanced map readability by removing yellowish sepia tint and aggressive filters. Added institutional nodes (Paternoster Sq, Canada Square) and spatial context nodes (Parks/Stations). Upgraded property markers to high-density Linear style.

### [FE-016] Table Tooltips
- **Resolution:** Added descriptive tooltips to all Table headers explaining the underlying metrics and scoring logic.

### [FE-017] Commute Visualization
- **Resolution:** Integrated commute nodes for Paternoster and Canada Square into Table, Preview Drawer, and Detail views.
