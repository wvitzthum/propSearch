# UX Research: Page Architecture & Navigation Patterns
**Date:** 2026-04-02  
**Task:** QA-175  
**Scope:** 5-page restructured navigation for propSearch  
**Design Direction:** Bloomberg Terminal density + Linear precision  

---

## Executive Summary

Current propSearch suffers from **navigation sprawl** — 7 routes with overlapping purposes, inconsistent information hierarchy, and no clear mental model for property research workflow. This document proposes a streamlined **5-page architecture** that maps directly to the acquisition research workflow: **Discover → Analyze → Decide → Act**.

### Current State Analysis

| Current Route | Purpose | Issues |
|---------------|---------|--------|
| `/` LandingPage | Entry/discovery | Generic landing page adds no value — user wants to dive straight into data |
| `/dashboard` | Everything dashboard | Overloaded — KPIs, map, property table, market conditions all compete for space |
| `/compare` | Comparison matrix | Functionally correct but buried under 4 other nav items |
| `/affordability` | Mortgage calculator | Isolated from property workflow — user must context-switch |
| `/mortgage` | Mortgage tracker | Redundant with Affordability — two pages covering mortgage intel |
| `/inbox` | Lead triage | Functionally isolated from main research flow |
| `/property/:id` | Property detail | Deep-dive OK but not integrated with affordability |

**Navigation cognitive load:** 6 top-level nav items + dynamic area list = sidebar fatigue

---

## Part A: Current Pain Points Audit

### What Works ✅

1. **Command Palette (⌘K)** — Excellent discovery mechanism; Linear-style quick navigation
2. **ComparisonBar** — Persistent comparison tray; always accessible without navigation
3. **Breadcrumb navigation** — Context preserved across pages
4. **Dark theme** — Bloomberg/Linear aesthetic applied consistently
5. **MarketConditionsBar** — High-density market signal strip; appropriate density

### What Breaks Navigation Flow ❌

| Pain Point | Severity | Description |
|------------|----------|-------------|
| **Split mortgage flows** | High | `/affordability` and `/mortgage` cover overlapping territory — user doesn't know which to use |
| **Dashboard bloat** | High | 43KB Dashboard.tsx tries to be Market Pulse + Map + Table + Filters simultaneously |
| **Discovery disconnected** | High | Landing page adds friction before user can access any data |
| **Area nav clutter** | Medium | Dynamic area list grows unbounded in sidebar; should be a filter, not nav |
| **Property detail isolation** | Medium | Property detail page doesn't preserve affordability context |
| **Inbox disconnection** | Medium | Lead inbox is isolated from property workflow — no quick "investigate this lead" path |
| **No dedicated map route** | Medium | Map is embedded in Dashboard but deserves full-viewport treatment |

---

## Part B: Benchmark Analysis

### Linear (Precision Productivity)

**URL:** linear.app

**Key Patterns:**
1. **Sidebar-first navigation** — Left rail is the primary navigation; content fills remaining space
2. **Inbox = command center** — Linear's Inbox IS the product; everything routes through it
3. **Keyboard-first** — ⌘K, ⌘T, ⌘P shortcuts for everything; mouse optional
4. **Dense but breathable** — 14px base font; tight line-height; generous whitespace between sections
5. **Split-pane detail views** — List on left, detail on right; never lose context
6. **Filter bar as first-class UI** — Filters live above the table, not hidden in a dropdown

**Applicable to propSearch:**
- Adopt Linear's sidebar collapse pattern (icon-only → expanded)
- Make Inbox a first-class entry point (it IS the acquisition pipeline)
- Property detail should be a slide-over or split-pane, not a full route

### Notion (Information Architecture)

**URL:** notion.so

**Key Patterns:**
1. **Database = everything** — Properties should be a "database" with table/grid/board/card views
2. **Inline editing** — Double-click to edit any field; no "edit mode" required
3. **Relation properties** — Link properties to deals, notes, contacts
4. **Sidebar collapsible** — Nested pages; workspace → space → page hierarchy
5. **Slash commands** — `/` to insert any block type

**Applicable to propSearch:**
- Properties page as a proper database with multiple view modes
- Property detail as inline-expanded view, not separate route
- Use Notion's "relation" concept for linking properties to deals

### Bloomberg Terminal (Data Density)

**URL:** bloomberg.com/markets

**Key Patterns:**
1. **Information density is the product** — No whitespace waste; every pixel earns its place
2. **Color = signal** — Green/red for up/down, yellow for caution, blue for neutral
3. **Real-time data streams** — Live quotes, ticking numbers, pulsing indicators
4. **Customizable layouts** — Bloomberg lets users drag/drop modules
5. **Keyboard navigation** — traders never touch mouse; propSearch should enable this
6. **Monospace for data** — Tabular data in monospace; proportional for labels

**Applicable to propSearch:**
- Dashboard should be Bloomberg-style module grid (configurable KPIs)
- Live market signals need pulsing indicators and real-time feel
- Property table should use monospace for numbers (prices, scores)
- Enable keyboard-only navigation for power users

---

## Part C: Key Patterns Applicable to propSearch

| # | Pattern | Source | Implementation |
|---|---------|--------|----------------|
| 1 | **Sidebar-first nav** | Linear | Persistent 64px icon rail + 256px expanded panel |
| 2 | **Split-pane detail** | Linear/Notion | Property detail as slide-over panel from right |
| 3 | **Database views** | Notion | Properties page: Table | Grid | Kanban (Pipeline) |
| 4 | **Module grid dashboard** | Bloomberg | Configurable KPI cards in responsive grid |
| 5 | **Command palette** | Linear/Spotlight | ⌘K for everything; already implemented ✅ |
| 6 | **Filter bar** | Linear | Persistent filter row above data tables |
| 7 | **Breadcrumb + tabs** | Linear | Context preserved; secondary navigation within pages |

---

## Part D: Proposed Sidebar Navigation Structure

### Design Principles
- **Icon-first** — 64px collapsed, 256px expanded
- **Grouped by workflow stage** — Discovery → Analysis → Decision → Tools
- **Badge counts** — Show unread inbox count, active comparison count

### Proposed Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] ▼                                    [⌘K]  [Search] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ○ Dashboard    (📊)     ← Market overview + KPIs          │
│  ○ Properties   (🏠)     ← Property database (Table/Grid)  │
│  ○ Map          (🗺️)      ← Full-viewport map              │
│  ○ Inbox        (📥)      ← Lead pipeline (badge: 3)        │
│  ○ Comparison   (⚖️)      ← Side-by-side matrix             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 Affordability  ← Financial tools (collapsed group)      │
│    └ Dashboard (market)                                      │
│    └ Properties (filters)                                   │
│    └ Calculator (standalone)                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [⚙️ Settings]                                              │
│  [?] Help                                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Icon Selection

| Page | Icon | Rationale |
|------|------|-----------|
| Dashboard | `LayoutDashboard` | Market overview — the command center |
| Properties | `Building2` | Property database — the core asset |
| Map | `Map` | Spatial context — geo-first exploration |
| Inbox | `Inbox` | Pipeline — leads awaiting action |
| Comparison | `Scale` | Decision — side-by-side analysis |
| Settings | `Settings` | Configuration |

---

## Part E: Per-Page Wireframe Descriptions

### 1. Dashboard — Market Command Center

**Route:** `/dashboard`

**Purpose:** High-density market overview — answer "what's happening in my target markets right now?"

**Layout Priority:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ [MarketConditionsBar — full width, horizontal signal strip]          │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ Institutional│ │ Avg Days on  │ │ Alpha Score  │ │ Negotiating  │  │
│ │ Inventory    │ │ Market       │ │ Distribution │ │ Leverage     │  │
│ │ 47 assets    │ │ 23 days      │ │ 8.2 avg      │ │ -4.2% room   │  │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌───────────────────────────┐│
│ │         Market Pulse Chart          │ │     Swap Rate Signal      ││
│ │   (CapitalAppreciationChart.tsx)    │ │   (SwapRateSignal.tsx)    ││
│ │   ~60% width                        │ │   ~40% width              ││
│ └─────────────────────────────────────┘ └───────────────────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌───────────────────────────┐│
│ │       Area Performance Table         │ │    BoE Rate Path          ││
│ │   (AreaPerformanceTable.tsx)        │ │   (BoERatePathChart.tsx)  ││
│ │   ~55% width                        │ │   ~45% width              ││
│ └─────────────────────────────────────┘ └───────────────────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Quick-Scan Properties (horizontal scroll, top 6 by Alpha)       │ │
│ │ [Card] [Card] [Card] [Card] [Card] [Card] →                     │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Components:**
- `MarketConditionsBar` — Full-width horizontal strip (already exists)
- `KPICard` × 4 — Institutional Inventory, Avg DOM, Alpha Distribution, Negotiation Room
- `CapitalAppreciationChart` — Market trend line
- `SwapRateSignal` — Rate signal with sparklines
- `AreaPerformanceTable` — Area heat vs benchmark
- `BoERatePathChart` — BoE fan chart
- Quick-scan property cards (horizontal scroll, top 6 alpha scores)

**Information Hierarchy:**
1. **Immediate market signals** — Top row (MOS, rates, HPI)
2. **Medium-term context** — Charts (trends, forecasts)
3. **Actionable leads** — Bottom (quick-scan properties)

---

### 2. Properties — Asset Database

**Route:** `/properties`

**Purpose:** Dedicated property research workspace — filter, sort, compare, manage

**Layout Priority:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Filter Bar]                                                        │
│ [Search] [Area ▼] [Price ▼] [Alpha ▼] [Beds ▼] [Tags ▼] [+ Add]    │
├──────────────────────────────────────────────────────────────────────┤
│ View: [Table] [Grid] [Kanban]     Sort: [Alpha ▼]    [Export CSV]  │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │                    Property Table / Grid                         │ │
│ │                                                                   │ │
│ │ Address      │ Area     │ Price   │ Alpha │ DOM  │ EPC │ Actions │ │
│ │ ─────────────────────────────────────────────────────────────── │ │
│ │ 12 Porchest… │ NW3      │ £760K   │ 9.4   │ 5d   │ D   │ [★][📋]│ │
│ │ Cavendish…   │ NW6      │ £600K   │ 8.9   │ 80d  │ D   │ [★][📋]│ │
│ │ Finchley Rd  │ NW6      │ £750K   │ 8.8   │ 1d   │ C   │ [★][📋]│ │
│ │                                                                   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**View Modes:**
1. **Table** — Column-based, sortable, dense data (default)
2. **Grid** — Card-based, visual-first, image-heavy
3. **Kanban** — Pipeline stages (Discovered → Shortlisted → Vetted → Won/Lost)

**Key Components:**
- `PropertyTable` — Existing table with enhanced filtering
- `ThesisTagFilter` — Filter by investment thesis
- `AlphaBadge` — Score visualization
- `PreviewDrawer` — Slide-over property detail without navigation

**Information Hierarchy:**
1. **Filters** — Reduce dataset first
2. **Sort** — Order by priority (Alpha, Price, DOM)
3. **Action** — Compare, shortlist, detail

---

### 3. Map — Spatial Intelligence

**Route:** `/map`

**Purpose:** Full-viewport geo exploration — understand location context at a glance

**Layout Priority:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Full-Viewport Leaflet Map]                                          │
│                                                                      │
│  • Property markers (color-coded by alpha score)                     │
│  • Metro line overlay (tube connectivity)                           │
│  • Park proximity rings (步行距离)                                  │
│  • Custom POI markers (commute hubs, supermarkets)                  │
│                                                                      │
│ ┌─────────────────┐                                                 │
│ │ [Property List] │  ← Collapsible panel, right side               │
│ │ • Porchester Rd │                                                 │
│ │ • Goldhurst Ter │                                                 │
│ │ • Danbury Street│                                                 │
│ └─────────────────┘                                                 │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ [Map Controls: Layers ▼] [Zoom +] [Center] [Fullscreen]       │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Full-viewport map (no header chrome)
- Property markers with alpha-score color coding
- Metro line overlay with station labels
- Isochrone rings for commute time
- Collapsible property list sidebar

**Information Hierarchy:**
1. **Geography** — Where are properties relative to each other?
2. **Connectivity** — Tube access, commute times
3. **Amenities** — Parks, supermarkets, wellness

---

### 4. Inbox — Lead Pipeline

**Route:** `/inbox`

**Purpose:** Property lead triage — evaluate, categorize, enrich

**Layout Priority:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Inbox Header: 3 new leads]                        [Filter] [Sort]│
├─────────────────────────────────┬────────────────────────────────────┤
│         Lead List               │        Lead Detail (Slide-over)   │
│                                 │                                    │
│ ┌─────────────────────────────┐│ ┌────────────────────────────────┐│
│ │ 📄 Rightmove: NW3 Flat      ││ │ [PropertyImage]                 ││
│ │ £760K | Alpha: 9.4         ││ │                                ││
│ │ Added: 2h ago | Source: RM ││ │ Address: Northways, College…   ││
│ └─────────────────────────────┘│ │ Price: £760,000                ││
│ ┌─────────────────────────────┐│ │ Alpha: 9.4 ████████░░          ││
│ │ 📄 Zoopla: NW6 Flat         ││ │                                ││
│ │ £599K | Alpha: 8.9          ││ │ [View Full Detail →]           ││
│ │ Added: 5h ago | Source: ZP  ││ │ [Shortlist] [Dismiss] [Snooze] ││
│ └─────────────────────────────┘│ │                                ││
│                                 │ └────────────────────────────────┘│
│                                 │                                    │
└─────────────────────────────────┴────────────────────────────────────┘
```

**Key Components:**
- `Inbox.tsx` — Existing lead triage interface
- Split-pane: list left, detail right
- Quick actions: Shortlist, Dismiss, Snooze
- Source indicators (Rightmove, Zoopla, manual)

**Information Hierarchy:**
1. **New leads** — Fresh opportunities requiring evaluation
2. **Action** — Shortlist or dismiss
3. **Detail** — Full property context on demand

---

### 5. Comparison — Decision Matrix

**Route:** `/comparison`

**Purpose:** Side-by-side property analysis — objective comparison for decision-making

**Layout Priority:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Comparison Header: 3 properties]           [Add Property] [Clear]│
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │                        Comparison Matrix                          │ │
│ │                                                                   │ │
│ │                          │ Prop A  │ Prop B  │ Prop C  │           │ │
│ │ ─────────────────────────────────────────────────────────────── │ │
│ │ Price                    │ £760K   │ £600K   │ £750K   │           │ │
│ │ Alpha Score              │ 9.4 ★   │ 8.9 ★   │ 8.8 ★   │           │ │
│ │ Price per sqm            │ £7,600  │ £8,797  │ £8,146  │           │ │
│ │ Days on Market           │ 5       │ 80 ⚠    │ 1       │           │ │
│ │ Tube Distance            │ 150m    │ 280m    │ 300m    │           │ │
│ │ EPC Rating               │ D       │ D       │ C ✓     │           │ │
│ │ Service Charge           │ £4,500  │ £3,339  │ £4,692  │           │ │
│ │ Tenure                   │ Leaseh… │ SoF ✓   │ SoF ✓   │           │ │
│ │ CapEx Estimate           │ £15K    │ —       │ —       │           │ │
│ │                                                   [Remove]        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ [Affinity Analysis]                                                 │
│ "Based on your criteria, Property A offers the best value..."      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Components:**
- `ComparisonPage` — Existing comparison matrix
- Metric rows with visual diff indicators
- "Best value" affinity analysis
- Add/remove property controls

**Information Hierarchy:**
1. **Price** — Primary filter
2. **Alpha Score** — Quality signal
3. **Supporting metrics** — DOM, EPC, location, costs
4. **Recommendation** — AI-assisted affinity analysis

---

## Part F: Routing Schema

### New Routes

| Route | Page | Parent Layout | Description |
|-------|------|---------------|-------------|
| `/dashboard` | Dashboard | Sidebar | Market overview command center |
| `/properties` | Properties | Sidebar | Property database with views |
| `/map` | MapView | Fullscreen | Dedicated map page |
| `/inbox` | Inbox | Split-pane | Lead pipeline |
| `/comparison` | Comparison | Sidebar | Decision matrix |
| `/affordability` | AffordabilitySettings | Sidebar | Budget & mortgage calculator |
| `/property/:id` | PropertyDetail | Slide-over | Deep-dive (not full route) |

### Redirect Mappings

| Old Route | New Route | Notes |
|-----------|-----------|-------|
| `/` | `/dashboard` | Remove landing page; go straight to data |
| `/mortgage` | `/affordability` | Consolidate; single mortgage intel page |
| `/compare` | `/comparison` | Rename for clarity |

### Route Transition Plan

```typescript
// Phase 1: Add new routes (no breaking changes)
// - Add /properties route (new page component)
// - Add /map route (new page component)

// Phase 2: Redirect old routes
// - / → /dashboard (redirect)
// - /mortgage → /affordability (redirect)

// Phase 3: Remove deprecated routes
// - Remove LandingPage component
// - Remove MortgageTracker component (merge into AffordabilitySettings)

// Phase 4: Convert PropertyDetail to slide-over
// - PropertyDetail becomes a slide-over panel component
// - Route /property/:id becomes optional (for direct links)
```

---

## Part G: Implementation Gating

### Dependencies

| Task | Blocked By | Blocking |
|------|------------|----------|
| FE-175: Dashboard refactor | QA-175 approval | FE-176, FE-177 |
| FE-176: Properties page | FE-175 | FE-178 |
| FE-177: Map page | FE-175 | FE-179 |
| FE-178: Inbox split-pane | FE-176 | FE-180 |
| FE-179: Comparison enhancement | FE-176, FE-177 | — |
| FE-180: Sidebar nav rebuild | FE-178, FE-179 | — |

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User disorientation | High | Preserve ⌘K command palette; add onboarding tooltip |
| Breaking external links | Low | /property/:id remains functional as deep-link fallback |
| Performance regression | Medium | Lazy-load non-critical pages; keep Dashboard fast |

---

## Appendix A: Icon Library

Using `lucide-react` icons throughout:

```typescript
import {
  LayoutDashboard,    // Dashboard
  Building2,          // Properties
  Map,                // Map
  Inbox,              // Inbox
  Scale,              // Comparison
  Settings,           // Settings
  HelpCircle,         // Help
  Calculator,         // Affordability
  Landmark,           // Mortgage
} from 'lucide-react';
```

---

## Appendix B: Migration Checklist

- [ ] Create new `/properties` route and `PropertiesPage.tsx`
- [ ] Create new `/map` route and `MapView.tsx`
- [ ] Refactor `Dashboard.tsx` to module grid layout
- [ ] Convert `PropertyDetail.tsx` to slide-over component
- [ ] Merge `MortgageTracker.tsx` into `AffordabilitySettings.tsx`
- [ ] Update `Layout.tsx` sidebar with new nav structure
- [ ] Add route redirects for deprecated routes
- [ ] Update `CommandPalette.tsx` to include new routes
- [ ] Run Playwright tests — update affected test selectors
- [ ] User acceptance testing — verify mental model

---

**Document Status:** Ready for approval  
**Next Step:** Frontend Engineer to begin FE-175 (Dashboard refactor)  
