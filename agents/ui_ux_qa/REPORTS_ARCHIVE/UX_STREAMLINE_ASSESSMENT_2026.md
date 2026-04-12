# UX Streamline Assessment: propSearch
**Date:** 2026-04-02  
**Assessor:** UI/UX QA  
**Goal:** Identify concrete improvements to streamline the user experience

---

## Executive Summary

The current propSearch UI suffers from **mission creep on the Dashboard**, **navigation confusion**, and **missing workflow patterns**. The application tries to do too much in one place while leaving core workflows fragmented across pages.

**Core Problem:** The Dashboard is a 43KB monolith that attempts market intelligence, property browsing, map visualization, and filtering simultaneously. This creates cognitive overload and buries the most important action — property research — under layers of market data.

---

## Critical Issues (Must Fix)

### 1. Dashboard Monolith — The #1 UX Killer

**Problem:** `Dashboard.tsx` (43KB+) does everything:
- Market Pulse KPIs
- Months of Supply / Negotiation Delta
- BoE Rate Tracker
- Area Performance Table
- Swap Rate Signal
- BoE Rate Path Chart
- Property Table with full filters
- Interactive Leaflet Map
- Property Preview Drawer
- Comparison Bar

**Impact:** User lands on a wall of data with no clear entry point. The most important action — browsing properties — is buried under 8+ competing visual elements.

**Evidence:**
```
Dashboard layout priority:
[MarketConditionsBar — full width]
[KPI Cards — 4 cards, equal weight]
[Market Pulse Chart + Swap Rate — 60/40 split]
[Area Table + BoE Chart — 55/45 split]
[Property Table — requires scroll to reach]
```

**Recommendation:**
```
IMMEDIATE FIX: Deconstruct Dashboard into a proper landing page
- Remove Property Table from Dashboard
- Remove Leaflet Map from Dashboard  
- Dashboard becomes: Market Overview Only
- Properties get their own dedicated page (/properties)
```

---

### 2. No Dedicated Properties Page — Buries the Core Asset

**Problem:** The property table is embedded in Dashboard. This means:
- To browse properties, you must pass through market data
- Filters are competing with market charts for space
- No way to bookmark a "property research session"
- Area filter is in sidebar, not with properties

**Current Flow:**
```
User Goal: Browse properties in NW3
Current: Dashboard → scroll past KPIs → scroll past charts → find table → apply area filter
```

**Recommendation:**
```
Create /properties page (per FE-176):
- Full-width property table
- Filter bar at top (area, price, alpha, status)
- Grid/Table/Kanban toggle
- Bulk actions
- Property detail as slide-over (not full route)
```

---

### 3. Property Detail is a Route, Not a Panel

**Problem:** Clicking a property navigates to `/property/:id` — a full page route.

**Impact:**
- User loses their place in the property list
- Comparison context is lost
- Must navigate back to continue browsing
- No quick peek capability

**Evidence from PreviewDrawer.tsx:** The PreviewDrawer already exists as a slide-over component, but PropertyDetail.tsx duplicates this as a full route.

**Recommendation:**
```
Remove /property/:id as primary navigation
- Property detail becomes slide-over panel (extend PreviewDrawer)
- PreviewDrawer already has: images, floorplan, pipeline tracker, notes
- Add missing sections from PropertyDetail to PreviewDrawer
- Keep /property/:id as fallback for direct links only
```

---

### 4. Redundant Navigation Structure

**Current Sidebar:**
```
Dashboard        ← Market overview (correct)
Properties       ← (doesn't exist yet, needs FE-176)
Map             ← (embed in Dashboard currently, needs /map route)
Inbox           ← Lead triage (isolated)
Comparison      ← Global bar exists, page also exists
Affordability   ← Calculator (useful)
Mortgage Intel  ← (REDUNDANT — overlaps with Affordability)
```

**Problems:**
- "Mortgage Intel" duplicates "Affordability" — user doesn't know which to use
- Area list in sidebar grows unbounded as more properties are added
- No visual hierarchy between pages

**Recommendation:**
```
Streamline sidebar to 5 items (per QA-175):
1. Dashboard      — Market overview
2. Properties     — Property database (NEW)
3. Map            — Full-viewport spatial (NEW)
4. Inbox          — Lead triage
5. Comparison     — Decision matrix

Remove from sidebar:
- Mortgage Intel → merge into Affordability
- Target Areas   → move to Properties page filter
```

---

### 5. No Persistent Filter State

**Problem:** Filters applied on Dashboard are lost when navigating away.

**Impact:**
- User applies NW3 filter → clicks property → returns to unfiltered view
- Must re-apply filters constantly
- No "saved filter" capability

**Evidence:** `useSearchParams` exists but isn't used for filter persistence.

**Recommendation:**
```
1. Move all filters to URL params (?area=NW3&alphaMin=8&status=shortlisted)
2. Filters survive page navigation and refresh
3. Add "Save Filter" capability in Properties page
4. Command palette can filter by URL param
```

---

### 6. Comparison is Fragmented

**Problem:** Two comparison mechanisms exist:
1. Global `ComparisonBar` (bottom-fixed)
2. `/comparison` page (full matrix)

**Impact:**
- User doesn't know which to use
- ComparisonBar has limited actions
- Full page has better matrix but requires navigation

**Evidence from ComparisonPage.tsx:** Matrix comparison with analyst notes exists but is disconnected from the global comparison state.

**Recommendation:**
```
1. Unify: ComparisonBar feeds into /comparison page
2. Add "View Full Matrix" button to ComparisonBar
3. Properties can be added to comparison from:
   - PropertyTable checkbox
   - PreviewDrawer button
   - Command palette
```

---

### 7. Inbox is Disconnected from Main Workflow

**Problem:** Inbox is completely isolated:
- No "Investigate in Properties" link
- Can't add inbox leads to comparison
- No quick path to see similar properties

**Evidence from Inbox.tsx:** Accept/Reject actions only affect inbox status, not the main property database.

**Recommendation:**
```
1. Inbox "Approve" action should:
   - Set status to "Discovered" in pipeline
   - Offer "Add to Comparison" 
   - Link to "Find Similar" (same area/price range)

2. Add breadcrumb: Inbox → Properties (filtered)
```

---

### 8. Landing Page Adds No Value

**Problem:** `/` redirects to landing page that adds friction before accessing data.

**Evidence:** Smoke tests show landing page has no unique value — user just clicks through to Dashboard.

**Recommendation:**
```
Remove landing page entirely
- / → redirect to /dashboard
- OR make landing page = Dashboard (no redirect)
- User should access data in 1 click, not 2
```

---

## High-Priority Improvements

### A. Command Palette Enhancement

**Current:** ⌘K opens palette with basic navigation.

**Missing:**
- No property search (e.g., "northways college")
- No filter shortcuts (e.g., "filter:nw3 alpha:>8")
- No recent properties
- No keyboard-only property navigation

**Recommendation:**
```
Add to command palette:
- Property search with fuzzy matching
- Quick actions: "Shortlist top 5 by alpha"
- Navigation history
- Filter presets (save/load)
```

---

### B. Keyboard Navigation

**Current:** Only ⌘K is implemented.

**Missing:**
- `j/k` — navigate property list (vim-style)
- `o` — open selected property detail
- `s` — toggle shortlist
- `c` — add to comparison
- `f` — focus filter bar
- `?` — show keyboard shortcuts

**Recommendation:**
```
Implement vim-style navigation:
1. j/k — up/down in lists
2. o — open/expand
3. Esc — close/back
4. / — focus search
5. s — shortlist
6. c — compare
7. ? — help overlay
```

---

### C. Progressive Disclosure

**Problem:** Everything is visible at once — no hierarchy of information.

**Evidence:**
- Dashboard shows all market data simultaneously
- PropertyTable shows 20+ columns by default
- PreviewDrawer shows all tabs at once

**Recommendation:**
```
1. Dashboard: Show "Market Snapshot" by default, "Detailed View" on click
2. PropertyTable: Show 8 columns by default, "+Columns" to expand
3. PreviewDrawer: Show "Overview" tab by default, additional tabs as sub-sections
4. AffordabilitySettings: Collapse advanced options by default
```

---

### D. Empty States and Onboarding

**Problem:** No guidance when:
- No properties match filters
- Inbox is empty
- No shortlisted properties

**Evidence:** User sees blank space, no indication of what to do.

**Recommendation:**
```
Add contextual empty states:
- No properties: "Add your first property URL or browse the inbox"
- Empty inbox: "New leads will appear here when scraped"
- No comparisons: "Select properties to compare from the table"
```

---

## Medium-Priority Improvements

### E. Visual Consistency

**Issues:**
- Some components use `text-linear-text-primary`, others use `text-white`
- KPI cards use different sizes than comparable elements
- PropertyTable rows have inconsistent hover states

**Recommendation:**
```
1. Audit all color tokens in index.css
2. Create component library: Button, Card, Table, Badge variants
3. Document in STORYBOOK or similar
```

---

### F. Loading States

**Issues:**
- MarketPulse shows skeleton on loading but some components just show "N/A"
- PropertyTable shows "Loading..." but doesn't indicate what's loading
- No optimistic updates when adding to comparison

**Recommendation:**
```
1. Consistent loading skeleton for all async components
2. Add loading indicator to ComparisonBar when adding properties
3. Toast notifications for async actions
```

---

### G. Data Freshness Visibility

**Problem:** No indication of how old the data is.

**Evidence:** `market_pulse_summary.last_refreshed` exists but isn't displayed.

**Recommendation:**
```
1. Add "Last updated: 2 hours ago" to MarketPulse header
2. Color-code freshness: green (<1hr), yellow (1-24hr), red (>24hr)
3. Add "Refresh" button in header
```

---

## Quick Wins (Low Effort, High Impact)

| # | Change | Impact | Effort |
|---|--------|--------|--------|
| 1 | Remove Landing Page, redirect to Dashboard | Faster access | Low |
| 2 | Merge Mortgage Intel into Affordability settings | Less confusion | Low |
| 3 | Property detail as slide-over instead of route | Better flow | Medium |
| 4 | Move area filter to Properties page sidebar | Clearer nav | Low |
| 5 | Add keyboard shortcuts (j/k/o/s/c) | Power user boost | Medium |
| 6 | Filters persist in URL | No re-filtering | Low |
| 7 | Add empty states with CTAs | Better onboarding | Low |
| 8 | Show data freshness indicator | Trust in data | Low |

---

## Implementation Priority

### Phase 1: Navigation & Routing (1-2 days)
1. Remove landing page redirect to dashboard
2. Merge Mortgage Intel into Affordability
3. Add Properties page (FE-176)
4. Add Map page (FE-178)
5. Property detail as slide-over

### Phase 2: Dashboard Deconstruction (2-3 days)
1. Strip PropertyTable from Dashboard
2. Strip Map from Dashboard
3. Dashboard = Market Overview only
4. Properties page = Property research workspace

### Phase 3: Workflow Integration (2-3 days)
1. Command palette enhancements
2. Keyboard navigation (j/k/o/s/c)
3. ComparisonBar → Comparison page unification
4. Inbox "Approve" → Property pipeline integration

### Phase 4: Polish (1-2 days)
1. Progressive disclosure (collapse advanced options)
2. Empty states with CTAs
3. Data freshness indicators
4. Loading skeletons

---

## User Flow Comparison

### Current Flow: Research a NW3 Property
```
1. / → Click "Enter Command Center"
2. Dashboard loads → Wait for market data
3. Scroll past 8 market widgets
4. Find property table (below fold)
5. Look for area filter → Click NW3
6. Find property → Click to open detail
7. Property opens as full page → Lose table context
8. Click Back → Filters reset
9. Repeat
```

### Proposed Flow: Research a NW3 Property
```
1. /dashboard → Market overview loads (fast)
2. Click "Properties" in sidebar
3. Properties page → Filter bar at top → Click NW3
4. Property list filters instantly
5. Click property → Slide-over opens (table still visible)
6. Close slide-over → Continue browsing
7. URL preserves filter (?area=NW3)
```

---

## Conclusion

The propSearch UI has excellent data density and the Bloomberg/Linear aesthetic is well-applied. However, **the Dashboard tries to be everything at once**, and **the core workflow (property research) is buried**.

**The fix is structural, not cosmetic:**
1. Dashboard = Market Overview
2. Properties = Dedicated research workspace  
3. Map = Spatial intelligence layer
4. Inbox → Pipeline integration
5. Comparison = Unified decision engine

Once this structure is in place, incremental improvements (keyboard nav, empty states, freshness indicators) will compound into a dramatically better user experience.

---

**Assessment Status:** Complete  
**Ready for:** Product Owner review → Frontend Engineer implementation  
