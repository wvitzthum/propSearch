# immoSearch: Dashboard QA Tasks & Bug Tracking

## Active Backlog
| ID | Priority | Task | Status | Reported By | Date |
| --- | --- | --- | --- | --- | --- |
| QA-001 | High | Initial Dark Mode Audit: Contrast check on Alpha Score badges | Pending | QA Agent | 2026-03-07 |
| QA-002 | Critical | Global Theme Inconsistency: Align Landing, Detail & 404 pages to Dark Mode | Pending | QA Agent | 2026-03-07 |
| QA-003 | High | Dynamic Sidebar: Connect "Target Areas" to real property data | Pending | QA Agent | 2026-03-07 |
| QA-004 | Medium | Leaflet Styling Refactor: Remove CSS conflicts in App.css/index.css | Pending | QA Agent | 2026-03-07 |
| QA-005 | Medium | Map Marker Aesthetics: Use theme-defined color variables for Markers | Pending | QA Agent | 2026-03-07 |
| QA-006 | Medium | Sorting Sync: Unify sorting state between Table and Grid views | Pending | QA Agent | 2026-03-07 |
| QA-007 | High | Component Refactoring: Centralize AlphaBadge and KPI Cards | Pending | QA Agent | 2026-03-07 |

---

## Detailed Task Logs

### [QA-001] Dark Mode Contrast Audit
- **Status:** Pending
- **Priority:** High
- **Description:** Some alpha score badge colors (specifically Amber and Rose) might not meet accessibility contrast standards on dark backgrounds (#09090b).
- **Steps to Reproduce:**
  1. Open dashboard.
  2. Inspect badges for Emerald (>=8), Amber (5-7), and Rose (<5).
- **Acceptance Criteria:**
  - All badge-to-background contrast ratios are >= 4.5:1.
  - Text remains legible at 12px.
  - Use `retro-green` and `retro-amber` theme variables if possible.

### [QA-002] Global Theme Inconsistency
- **Status:** Pending
- **Priority:** Critical
- **Description:** LandingPage.tsx, PropertyDetail.tsx, and the 404 route in App.tsx are implemented with a light-theme aesthetic, creating a jarring UX transition from the Dark Mode Dashboard.
- **Steps to Reproduce:**
  1. Navigate to `/`.
  2. Click "Launch Dashboard" (Observe switch to dark).
  3. Click a property to see details (Observe switch back to light).
  4. Navigate to a non-existent URL (Observe switch to light 404).
- **Acceptance Criteria:**
  - All pages use `bg-linear-bg` and `text-white` as base.
  - No standard `slate` or `blue` light-mode utility classes (e.g., `bg-white`, `text-slate-900`) remaining.
  - Consistent use of `linear-border` and `linear-card`.

### [QA-003] Dynamic Sidebar
- **Status:** Pending
- **Priority:** High
- **Description:** Sidebar "Target Areas" are hardcoded. They should reflect actual areas present in the dataset and provide filtering functionality.
- **Steps to Reproduce:**
  1. View `Layout.tsx` sidebar.
  2. Note areas are Islington, Bayswater, West Hampstead regardless of data.
- **Acceptance Criteria:**
  - Sidebar areas are derived from `properties` data using `useProperties` hook or a shared state.
  - Clicking an area filters the Dashboard view (sync state).

### [QA-004] Leaflet Styling Refactor
- **Status:** Pending
- **Priority:** Medium
- **Description:** `App.css` contains light-themed Leaflet overrides while `index.css` contains dark-themed ones. This causes unpredictable popup rendering.
- **Steps to Reproduce:**
  1. Open Dashboard in Map View.
  2. Click a marker to see a popup.
  3. Observe popup has a white background or light borders from `App.css`.
- **Acceptance Criteria:**
  - All Leaflet overrides consolidated in `index.css`.
  - `App.css` cleaned up or merged.
  - Popups match the "Bloomberg" dark aesthetic.

### [QA-005] Map Marker Aesthetics
- **Status:** Pending
- **Priority:** Medium
- **Description:** `Dashboard.tsx` uses hardcoded hex colors for map markers instead of theme variables.
- **Acceptance Criteria:**
  - Marker colors use `--color-retro-green` and `--color-retro-amber` from theme.
  - Logic unified with `AlphaBadge`.

### [QA-006] Sorting Sync
- **Status:** Pending
- **Priority:** Medium
- **Description:** `Dashboard.tsx` and `PropertyTable.tsx` have independent sorting states. Changing sort in Table view doesn't reflect in the general `filteredProperties` logic or Grid view.
- **Acceptance Criteria:**
  - Sorting state lifted to `Dashboard.tsx` or a shared hook.
  - Both Grid and Table views reflect the same sorting order.

### [QA-007] Component Refactoring
- **Status:** Pending
- **Priority:** High
- **Description:** Duplicated logic for Alpha Score badges and KPI cards across components.
- **Acceptance Criteria:**
  - Create a shared `AlphaBadge` component in `components/`.
  - Create a shared `KPICard` component in `components/`.
  - Ensure consistent styling and data-driven coloring.
