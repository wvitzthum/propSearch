# propSearch: Potential New Features
> Scoped by: Product Owner & Strategic Lead
> Date: 2026-03-30
> Status: Proposed — pending agent assignment and user approval

---

## Overview

This document captures transformative UX and intelligence features identified during the 2026 Q1 strategic review. All features are scoped against the existing "Bloomberg Terminal meets Linear" aesthetic and the single-user, high-stakes acquisition mandate.

Features marked **→ Tasks** have been approved for implementation and assigned to the agent backlog.

---

## F-01: ⌘K Global Command Palette → **→ Tasks (FE-150)**
**Owner:** Frontend Engineer
**Status:** Approved

### What
A Linear/GitHub-style floating command palette activated by ⌘K (Mac) / Ctrl+K (Windows). Becomes the primary navigation and action hub for the entire dashboard.

### Why It Matters
The single biggest time-waster is navigating via sidebar clicks. A command palette delivers instant access to every action without leaving the keyboard.

### Feature Scope

**Search & Navigation:**
- Fuzzy property search (by address, ID, area, price, Alpha Score)
- Route navigation (go to inbox, mortgage simulator, market pulse)
- Quick property lookup by partial address or ID

**Property Actions:**
- Pipeline shortcuts: shortlist, vet, archive by address or ID
- Comparison basket: add to compare, clear basket
- Macro filters: show value buys, show SW3 shortlisted, clear filters

**System Actions:**
- Budget filter: budget £4,500/mo, max £2.1M
- Data sync: sync inbox, refresh data
- Theme toggle, view mode switch

### UI Spec
- Full-screen dark glass overlay with centered modal (max-width 600px)
- Search input with > prefix indicator (Linear-style)
- Grouped results: Recent, Properties, Navigation, Actions
- Keyboard navigation: ↑↓ to move, Enter to execute, Esc to close
- Recent actions persist across sessions (localStorage)
- Scoped suggestions: palette shows relevant actions for current route

### Acceptance Criteria
- [ ] ⌘K opens palette from any page
- [ ] Fuzzy search returns properties within 100ms
- [ ] All pipeline actions execute without page navigation
- [ ] Esc closes palette and returns focus
- [ ] Recent actions appear on re-open
- [ ] No broken states if no results found

---

## F-03: Reverse Mortgage Calculator → **→ Tasks (FE-151, DAT-150)**
**Owner:** Frontend Engineer + Data Analyst
**Status:** Approved

### What
Inverts the existing Mortgage Tracker logic. Instead of answering "how much will this property cost me?", it answers: "Given my budget, which properties can I afford, and what LTV/deposit is required?"

### Feature Scope

**Part A — Budget-to-Price Engine (FE-151):**
- Input: Monthly budget slider (£2,000–£10,000+)
- Input: Loan term (15/20/25/30 years)
- Input: Active LTV band (90/85/75/60%)
- Output: Maximum loan principal at current 5yr fixed rate
- Output: Target property price ceiling at that LTV
- Output: Minimum deposit required (£ amount and %)
- Output: SDLT estimate for target price tier

**Part B — LTV Match Score (DAT-150):**
- For every property, calculate a LTV Match Score (0-100):
  - 100 if property price ≤ target price ceiling
  - 50 if within 10% above ceiling
  - 0 if above threshold
- Display as compact badge on every PropertyCard and Table row
- Budget Filter widget in sidebar; dashboard filters to Match Score ≥ 80

**Part C — Shortlist Qualifier:**
- When shortlist is active, show "Qualifiers" summary: "3 of 7 shortlisted properties fall within your £4,500/mo budget at 75% LTV"

### UI Spec
- Sidebar Widget: "Budget Filter" — compact slider + LTV selector + results count
- PropertyCard enhancement: LTV Match badge (green/amber/grey)
- PropertyDetail enhancement: "Affordability Node" in sidebar
- MortgageTracker page: Dedicated "Reverse Mode" tab

### Data Dependencies
- economic_indicators.mortgage_rates (existing in macro_trend.json)
- sdlt_tiers (static, to be added to macro_trend.json)

### Acceptance Criteria
- [ ] Slider updates property list in real-time (no submit)
- [ ] Match Score badge visible in Table View and Grid View
- [ ] Affordability Node renders on PropertyDetail
- [ ] SDLT estimate accurate to current UK thresholds (2026)
- [ ] Match score recalculates when LTV or budget changes

---

## F-07: 5-Year Capital Appreciation Model → **→ Tasks (FE-152, DAT-151)**
**Owner:** Frontend Engineer + Data Analyst
**Status:** Approved

### What
A Monte Carlo-style appreciation projection panel on every PropertyDetail page, showing three scenarios — Bear, Base, Bull — over a 5-year horizon, with institutional confidence intervals.

### Feature Scope

**Part A — Appreciation Engine (DAT-151):**
- Source postcode-level HPI historical data (Land Registry, ONS)
- Source regional velocity and buyer/seller market intensity (from DE-120)
- Source BoE rate trajectory consensus (from DAT-120)
- Calculate three annualized growth scenarios:
  - Bear: 10th percentile HPI growth for the postcode/borough
  - Base: Median (50th percentile) HPI growth
  - Bull: 90th percentile HPI growth
- Apply property-specific adjustments:
  - Lease length risk discount (premium if <80 years remaining)
  - EPC efficiency premium/discount (D/E-rated properties have lower growth)
  - Floor level factor (ground floor discount, penthouse premium)
  - Area velocity multiplier (high-demand postcodes get upward adjustment)

**Part B — Fan Chart Visualization (FE-152):**
- Bloomberg-style fan chart:
  - X-axis: Years 0–5
  - Y-axis: Projected property value (£)
  - Three fan bands: Bear (light red), Base (green), Bull (light blue)
  - Solid line: Base case projection
  - Dotted lines: 10th/90th percentile bounds
- Hover state: Projected value at each year for all three scenarios
- Display: "Projected equity at Year 5 (Base): £X" and "Upside capture (Bull): +£Y"

**Part C — Acquisition Decision Node:**
- Summary panel below the chart:
  - Total capital deployed (deposit + SDLT + fees)
  - Projected equity at Year 5 (Base case)
  - Implied IRR (Base case, simple approximation)
  - Comparison to risk-free rate (current 5yr gilt yield)
  - Signal: "Acquire" / "Hold" / "Pass" based on IRR vs. risk-free spread

### UI Spec
- New collapsible panel in PropertyDetail below Negotiation Buffer section
- Dark glassmorphism chart container with institutional color palette
- Data labels in monospace font
- "Institutional Thesis" text summary

### Data Dependencies
- macro_trend.json: HPI history by borough, gilt yield, BoE consensus
- DAT-120: HPI forecasts (unblocked)
- DE-120: Regional velocity views (partially unblocked)
- Property fields: lease_years_remaining, epc, floor_level, area

### Acceptance Criteria
- [ ] Fan chart renders for all properties with valid postcode data
- [ ] Three scenarios (Bear/Base/Bull) displayed with distinct fills
- [ ] Hover state shows values for all three scenarios at each year
- [ ] IRR vs. risk-free rate signal displays correctly
- [ ] Property-specific adjustments (EPC, lease, floor) applied
- [ ] Fallback: generic London average if postcode-level data unavailable

---

## F-08: Investment Thesis Tags → **→ Tasks (FE-153)**
**Owner:** Frontend Engineer
**Status:** Approved

### What
A persistent tagging system that overlays strategic narratives on top of raw property metrics. Users label properties with investment thesis tags — e.g., "Paternoster Commute", "Turnkey", "Capex Play", "Off-Market Candidate" — enabling macro-strategic filtering across the entire dashboard.

### Why It Matters
As the shortlist grows, the reason each property was selected becomes opaque. Tags create a research layer above raw metrics, enabling intelligent portfolio-level views.

### Feature Scope

**Part A — Tag System:**
- Predefined tag library:
  Paternoster Commute | Canary Wharf Access | Turnkey | Capex Play
  Off-Market Candidate | Negotiation Target | Viewing Booked | Offer Made
  Passed | REIT Comparable | Development Potential | Listed Building Risk
- User-defined tags supported (free-text, added inline)
- Multiple tags per property
- Tags persisted in localStorage keyed by property ID

**Part B — Tag Assignment UI:**
- PropertyDetail sidebar: Compact tag editor below Analyst Notes
- Click to add from predefined list or type free text
- Tags rendered as compact chips (color-coded by category)
- Batch tagging: Select multiple properties in Table View → apply tag

**Part C — Filter by Thesis:**
- Sidebar filter section: "Investment Thesis" multi-select
- Filter logic: AND within category, OR across categories
- Active filters shown as removable chips in filter bar
- Dashboard updates in real-time

**Part D — Thesis Summary View:**
- New Dashboard sub-view: "Thesis Overview"
- Shows count and list of properties per thesis tag
- Enables rapid re-sorting by investment category

### UI Spec
- Tags: Small rounded chips, color-coded (Turnkey = emerald, Capex Play = amber, Off-Market = purple)
- Batch toolbar: Appears when >1 row selected, slides in from top of table
- Filter sidebar: Dedicated collapsible "Thesis" section
- PropertyDetail: Inline tag editor with autocomplete

### Acceptance Criteria
- [ ] Tags persist across browser sessions (localStorage)
- [ ] Tags editable from PropertyDetail sidebar
- [ ] Dashboard filters by thesis tag correctly
- [ ] Batch tag application works on multi-select
- [ ] Predefined + user-defined tags both supported
- [ ] Thesis Overview sub-view accessible from Dashboard

---

## F-02: Spatial Keyboard Navigator
**Status:** Scoped — pending approval
**Owner:** Frontend Engineer

### What
Full keyboard traversal of the Dashboard without mouse contact. J/K to move through properties, Enter to open detail, S to shortlist, C to add to comparison, A to archive, Esc to clear selection.

### Feature Scope
- Focus ring on active property row (distinct from hover state)
- Persistent focus state across table scrolling
- Keyboard hints visible on focus: [J↓ K↑ S★ C⚖ A✕ Enter→]
- Works in both Table View and Grid View
- ⌘K palette remains accessible during keyboard navigation

### Acceptance Criteria
- [ ] J/K moves focus without mouse interaction
- [ ] All action shortcuts (S, C, A) fire correctly
- [ ] Focus state visually distinct from hover state
- [ ] Keyboard hints visible on focused row
- [ ] Esc clears selection, returns to default state

---

## F-04: StreetView / Satellite Context Node
**Status:** Scoped — pending approval
**Owner:** Frontend Engineer

### What
Replaces or supplements the current LocationNodeMap with live street-level and satellite imagery for every PropertyDetail page.

### Feature Scope
- Google StreetView embed (primary) with proxy fallback for X-Frame-Options blocks
- OpenStreetMap / Mapillary tiles as fallback
- Satellite toggle button
- "Compass" heading selector for StreetView direction

### Acceptance Criteria
- [ ] StreetView renders for >80% of properties with valid lat/lng
- [ ] Fallback to Mapillary tiles when StreetView blocked
- [ ] Satellite view toggle functional
- [ ] No broken iframe or "Map Error" visible to user

---

## F-05: Vendor Motivation Radar
**Status:** Scoped — pending approval
**Owner:** Data Analyst

### What
A composite score (0–10) estimating seller urgency, based on Days on Market, price reduction history, tenure type, listing freshness, and portal "reduced" flags.

### Feature Scope
- Score calculated by Data Analyst during lead enrichment
- Stored as vendor_motivation_score in SQLite and property schema
- Radar chart visualization in PropertyDetail → Negotiation Strategy section
- Feeds into Negotiation Buffer: high motivation = wider buffer recommended

### Acceptance Criteria
- [ ] Score calculated for all properties with sufficient data
- [ ] Radar chart renders in PropertyDetail
- [ ] Score refreshes when price reduction detected

---

## F-06: Portfolio Path Simulator
**Status:** Scoped — pending approval
**Owner:** Frontend Engineer + Data Analyst

### What
Scenario planning tool for comparing acquisition strategies. Users define "Acquisition Scenarios" (e.g., Scenario A: 2-bed SW3 at £2.1M / Scenario B: 3-bed NW1 at £1.8M) and compare 5-year financial outcomes.

### Feature Scope
- Scenario builder UI: select property + LTV + rate assumptions
- Up to 4 scenarios compared simultaneously
- Outputs: Capital deployed, rental income potential, appreciation projections, SDLT exposure, EPC CAPEX, net monthly outlay
- Spider/radar chart comparing scenarios across all dimensions

### Acceptance Criteria
- [ ] Up to 4 scenarios created and named
- [ ] All financial outputs calculated correctly
- [ ] Spider chart renders comparison
- [ ] Scenarios persist in session

---

## F-09: Live Price Watchdog (Postcode-Level Alerts)
**Status:** Scoped — pending approval
**Owner:** Data Engineer

### What
User sets a max_price threshold per postcode or per specific property. New listings below that threshold surface in the Inbox with a Price Alert badge.

### Feature Scope
- Alert criteria stored in data/manual_queue.json
- Inbox flags matching leads with alert badge and sorted to top
- Alert management UI: "My Alerts" panel in Inbox sidebar

### Acceptance Criteria
- [ ] Alerts persist across sessions
- [ ] Matching inbox leads surface with alert badge
- [ ] Alert management (create/edit/delete) functional

---

## F-10: Viewing Ledger (Deal Room)
**Status:** Scoped — pending approval
**Owner:** Frontend Engineer

### What
A structured viewing and offer log for shortlisted properties, embedded in PropertyDetail. Tracks: viewing date, agent notes, offer made, counteroffer received, decision status.

### Feature Scope
- Timeline component: viewing history in chronological order
- Offer log table: amount, date, status (made/accepted/countered/withdrawn)
- Decision status: Active, Offer Submitted, Under Offer, Acquired, Passed
- Entries sync to manual_queue.json

### Acceptance Criteria
- [ ] Timeline renders for shortlisted properties
- [ ] Viewing and offer entries can be added/edited
- [ ] Entries persist across sessions

---

## F-11: Urban Village Walk/Bike/Transit Score
**Status:** Scoped — pending approval
**Owner:** Data Analyst

### What
Display Walk Score, Bike Score, and Transit Score for each property's postcode alongside the existing commute nodes.

### Feature Scope
- Data sourced from Walk Score API or open alternative (OpenStreetMap-based)
- Stored as walk_score, bike_score, transit_score in property schema
- Rendered as compact triple-badge in PropertyDetail → Connectivity section
- Fallback to "Insufficient Data" state if postcode not covered

### Acceptance Criteria
- [ ] Scores display for all supported postcodes
- [ ] Graceful fallback for unsupported postcodes
- [ ] Scores visible in PropertyDetail and Table View

---

## F-12: Agent Tier Classification
**Status:** Scoped — pending approval
**Owner:** Data Analyst

### What
Enrich every property with the type of agent selling it: Chain (Foxtons/Savills/etc.), Boutique, or Private Treaty. Displayed as a badge in SourceHub.

### Feature Scope
- Agent tier extracted from listing metadata during enrichment
- Badge in SourceHub: Chain | Boutique | Private Treaty
- Negotiation strategy note based on agent type (tooltip)
- Filterable by agent tier in Dashboard

### Acceptance Criteria
- [ ] Agent tier identified for all properties with agent data
- [ ] Badge renders in SourceHub on PropertyDetail
- [ ] Filter by agent tier functional in Dashboard

---

## F-13: Unified Filter State in URL
**Status:** Scoped — pending approval
**Owner:** Frontend Engineer

### What
All Dashboard filter state (area, price range, Alpha Score, tenure, pipeline status, sort order) encoded in URL query string for shareability and bookmarkability.

### Feature Scope
- URL sync: filters → query params on change
- URL restore: page load → apply query params as initial filters
- Shareable links: copy filter state as URL
- Browser back/forward navigation support
- Example: /dashboard?area=SW3,NW1&alpha=7-10&status=shortlisted&sort=alpha_desc

### Acceptance Criteria
- [ ] All filters reflected in URL query params
- [ ] Page reload restores filter state from URL
- [ ] Back/forward browser navigation updates filters
- [ ] Copy URL preserves filter state

---

## Feature Status Summary

| ID | Feature | Owner | Status |
|----|---------|-------|--------|
| F-01 | Global Command Palette | Frontend | ✅ Approved → FE-150 |
| F-02 | Spatial Keyboard Navigator | Frontend | Scoped |
| F-03 | Reverse Mortgage Calculator | Frontend + Data | ✅ Approved → FE-151, DAT-150 |
| F-04 | StreetView Context Node | Frontend | Scoped |
| F-05 | Vendor Motivation Radar | Data Analyst | Scoped |
| F-06 | Portfolio Path Simulator | Frontend + Data | Scoped |
| F-07 | 5-Year Capital Appreciation Model | Frontend + Data | ✅ Approved → FE-152, DAT-151 |
| F-08 | Investment Thesis Tags | Frontend | ✅ Approved → FE-153 |
| F-09 | Live Price Watchdog | Data Engineer | Scoped |
| F-10 | Viewing Ledger | Frontend | Scoped |
| F-11 | Walk/Bike/Transit Score | Data Analyst | Scoped |
| F-12 | Agent Tier Classification | Data Analyst | Scoped |
| F-13 | Unified Filter State (URL) | Frontend | Scoped |

---

Maintained by: Product Owner & Strategic Lead
Review cycle: Monthly or on feature completion

---

## F-14: Monte Carlo Property Price Simulator → **→ Tasks (FE-154, DAT-152)**
**Owner:** Frontend Engineer + Data Analyst
**Status:** Approved

### What
A probabilistic price simulation engine that runs 1,000+ Monte Carlo iterations per property, projecting price distributions over a configurable time horizon (1–5 years). Moves beyond single-point "Bear/Base/Bull" scenarios to a full probability distribution — giving the user confidence intervals rather than three arbitrary points.

### Why It Matters
Real markets don't follow clean three-scenario forecasts. A Monte Carlo engine captures the *range* of outcomes with statistical rigor. It answers: "What is the probability this property is worth £2.5M+ in 3 years?" rather than "Will it be worth £2.5M?"

### Feature Scope

**Part A — Simulation Engine (FE-154 — Client-side):**
- Number of iterations: 1,000 (configurable up to 10,000)
- Time horizon: 1–5 years (slider, default 3 years)
- Per-iteration draw from probability distributions:
  - Annual appreciation: Normal distribution centered on base HPI growth, std dev from historical postcode volatility
  - Rental yield: Triangular distribution (min/base/max by area)
  - Interest rate path: sampled from BoE rate fan consensus (from DAT-152)
- Outputs per iteration:
  - Year-N property value
  - Total return (capital gain + cumulative rental income)
  - IRR vs. deposit
- Aggregate outputs:
  - P10 / P25 / P50 (median) / P75 / P90 price bounds
  - Probability of exceeding a user-defined price target
  - Expected value and standard deviation

**Part B — Visualization (FE-154):**
- **Probability Distribution Histogram:** Shows distribution of Year-N prices across all iterations — the "cone of uncertainty"
- **Fan Chart Overlay:** Replaces the simple three-band chart with continuous percentile bands (P10–P90 shaded in gradient)
- **"Probability of Target" Card:** User sets a price target (e.g., "Will this be worth £3M in 3 years?"); engine shows probability %
- **Comparison Mode:** Run simulation on 2 properties side-by-side to compare probability distributions

**Part C — Data Inputs (DAT-152):**
- Postcode-level HPI volatility (variance/std dev of annual returns) — sourced from Land Registry historical data
- Quarterly rental yield estimates by area (Rightmove/ONS data)
- BoE rate path fan (forward curve from DAT-120) for interest rate sensitivity
- Consumer confidence index (optional, for macro overlay)
- All data sources logged with citation and last-refreshed timestamp

### UI Spec
- New "Simulation" tab in PropertyDetail (replaces or enhances the F-07 panel)
- Dark glassmorphism histogram chart with gradient fills
- "Configure Simulation" drawer: iteration count, time horizon, target price input
- "Probability of Target" badge prominently displayed: "67% probability of exceeding £2.5M in 3 years"
- Comparison mode: Split view with two overlapping distribution curves

### Data Dependencies
- HPI historical volatility: Land Registry Price Paid Data (open, monthly)
- Rental yield by area: ONS Private Rental Market Statistics (open, quarterly)
- BoE rate fan: Bank of England Real Time Database (open, quarterly)
- CITATION REQUIRED: Every data field in macro_trend.json must carry a `source` and `last_refreshed` tag

### Acceptance Criteria
- [ ] Simulation runs 1,000 iterations in <2 seconds (client-side)
- [ ] P10/P50/P90 bands displayed on fan chart
- [ ] "Probability of Target" card renders for any user-defined price
- [ ] Simulation configurable (iterations, horizon, target)
- [ ] Comparison mode: two properties overlaid
- [ ] All data sources documented with citations in macro_trend.json

---

## F-15: Data Provenance & Source Attribution → **→ Tasks (DAT-153, FE-155)**
**Owner:** Data Analyst + Frontend Engineer
**Status:** Approved

### What
A formal data provenance layer that attaches a verifiable source citation and freshness timestamp to every calculated metric and data field in the system. The goal: any number shown in the dashboard can be traced back to its origin, methodology, and last refresh date.

### Why It Matters
A decision to spend £2.1M on a property must be grounded in trustworthy data. Without provenance, there's no way to:
1. Audit where a figure came from
2. Re-validate if a source has updated
3. Distinguish live scraped data from hallucinated estimates
4. Satisfy the "Empirical Standard" mandate in the agent protocol

### Feature Scope

**Part A — Provenance Schema (DAT-153):**
Every field in `macro_trend.json`, `propSearch.db`, and property records must carry provenance metadata:

```json
{
  "boe_base_rate": {
    "value": 4.75,
    "unit": "percent",
    "source": "Bank of England Official Bank Rate",
    "source_url": "https://www.bankofengland.uk/monetary-policy/the-rate",
    "methodology": "Official Bank of England base rate as set by MPC",
    "last_refreshed": "2026-03-30T08:00:00Z",
    "freshness_hours": 4
  },
  "hpi_annual_change_london": {
    "value": 2.3,
    "unit": "percent",
    "source": "HM Land Registry UK House Price Index",
    "source_url": "https://landregistry.data.gov.uk/ppi/",
    "methodology": "Mix-adjusted annual change in residential property prices for Greater London",
    "last_refreshed": "2026-03-01T00:00:00Z",
    "freshness_hours": 720
  }
}
```

Key provenance fields per metric:
- `value` — the metric itself
- `unit` — percent, GBP, days, etc.
- `source` — human-readable source name
- `source_url` — live URL to source data
- `methodology` — how the metric is derived (including any normalisation steps)
- `last_refreshed` — ISO 8601 timestamp of last data fetch
- `freshness_hours` — age in hours (UI uses this for freshness indicators)

**Part B — Source Citation Database (DAT-153):**
- Maintain a `data/sources/` directory with one JSON file per data source:
  - `sources/land_registry_hpi.json` — HPI by borough, with date range and methodology
  - `sources/ons_rental_yields.json` — Rental yield statistics
  - `sources/boe_rates.json` — BoE base rate and forward curve
  - `sources/zoopla_rightmove.json` — Portal scrape metadata (scrape date, URL, listing ID)
  - `sources/walk_score.json` — Walk/Bike/Transit scores by postcode
- Each source file includes:
  - `institution` — source organisation
  - `url` — where it was fetched from
  - `accessed_at` — when it was fetched
  - `licence` — open/closed/commercial
  - `coverage` — geographic and temporal scope

**Part C — UI: "Source Evidence" Panel (FE-155):**
- Every KPI, chart, and metric in the dashboard gets a subtle **(?)** info icon
- Hover/click reveals a "Source Evidence" tooltip:
  - Source name and institution logo (if available)
  - Methodology summary (1-2 sentences)
  - Last refreshed timestamp with freshness indicator:
    - Green: <24 hours
    - Amber: 24–168 hours (1 week)
    - Red: >168 hours
    - ⚠️ "Estimate" badge if field is calculated, not observed
  - Link to live source URL (opens in new tab)
- PropertyDetail: Dedicated "Data Provenance" collapsible section listing every field on the page with its source
- Dashboard/Market Pulse: Aggregate "Data Quality" indicator per section

**Part D — Automated Freshness Validation (DAT-153):**
- At every data sync, compare `last_refreshed` against expected frequency:
  - BoE rates: expected daily
  - HPI: expected monthly
  - Rental yields: expected quarterly
- If a source is stale (>2x expected frequency), surface a warning in the Market Pulse:
  - "⚠️ HPI data is 47 days old (expected: 30 days). Last update: Feb 2026."
- Flag hallucinated/estimated fields with a distinct `is_estimated: true` tag

### UI Spec
- Info icon (ⓘ) inline with every metric label
- "Source Evidence" popover: dark glass panel, max-width 320px, institutional typography
- Freshness badge: colored dot (green/amber/red) + text
- PropertyDetail "Data Provenance" section: collapsible accordion, full field list
- Market Pulse aggregate quality indicator: top-right of each chart section

### Data Dependencies
- All existing data sources (Land Registry, ONS, BoE, Rightmove/Zoopla scrapes)
- New: Walk Score API or open alternative
- Agent protocol: Data Analyst must complete provenance entry for every new field added

### Acceptance Criteria
- [ ] Every metric on PropertyDetail has a source tooltip
- [ ] Every field in macro_trend.json carries source + last_refreshed metadata
- [ ] Freshness warnings surface when data exceeds 2x expected update frequency
- [ ] "Data Provenance" section renders on PropertyDetail
- [ ] Source files in data/sources/ directory maintained for all active data feeds
- [ ] "Estimate" badge shown on any calculated (non-observed) field

---

## Updated Feature Status Summary

| ID | Feature | Owner | Status |
|----|---------|-------|--------|
| F-01 | Global Command Palette | Frontend | ✅ Approved → FE-150 |
| F-02 | Spatial Keyboard Navigator | Frontend | Scoped |
| F-03 | Reverse Mortgage Calculator | Frontend + Data | ✅ Approved → FE-151, DAT-150 |
| F-04 | StreetView Context Node | Frontend | Scoped |
| F-05 | Vendor Motivation Radar | Data Analyst | Scoped |
| F-06 | Portfolio Path Simulator | Frontend + Data | Scoped |
| F-07 | 5-Year Capital Appreciation Model | Frontend + Data | ✅ Approved → FE-152, DAT-151 |
| F-08 | Investment Thesis Tags | Frontend | ✅ Approved → FE-153 |
| F-09 | Live Price Watchdog | Data Engineer | Scoped |
| F-10 | Viewing Ledger | Frontend | Scoped |
| F-11 | Walk/Bike/Transit Score | Data Analyst | Scoped |
| F-12 | Agent Tier Classification | Data Analyst | Scoped |
| F-13 | Unified Filter State (URL) | Frontend | Scoped |
| F-14 | Monte Carlo Price Simulator | Frontend + Data | ✅ Approved → FE-154, DAT-152 |
| F-15 | Data Provenance & Source Attribution | Data Analyst + Frontend | ✅ Approved → DAT-153, FE-155 |

---

## Implementation Priority for Approved Features

| Priority | Task ID | Feature | Owner | Dependencies |
|----------|---------|---------|-------|-------------|
| 1 | FE-150 | ⌘K Command Palette | Frontend | None |
| 2 | DAT-150 | SDLT Tiers + LTV Match Score | Data Analyst | None |
| 3 | FE-151 | Reverse Mortgage Calculator | Frontend | DAT-150 |
| 4 | DAT-151 | Appreciation Engine Data | Data Analyst | DAT-120, DE-120 |
| 5 | FE-152 | Appreciation Fan Chart | Frontend | DAT-151 |
| 6 | FE-153 | Investment Thesis Tags | Frontend | None |
| 7 | DAT-152 | Monte Carlo Data Inputs | Data Analyst | DAT-120, DE-120 |
| 8 | FE-154 | Monte Carlo Simulator UI | Frontend | DAT-151, DAT-152 |
| 9 | DAT-153 | Provenance Schema + Source DB | Data Analyst | None |
| 10 | FE-155 | Provenance UI (tooltips + panel) | Frontend | DAT-153 |

---

*Maintained by: Product Owner & Strategic Lead*
*Last updated: 2026-03-30*
