# Dashboard UX Redesign Assessment
**Date:** 2026-04-02  
**Auditor:** UI/UX QA Agent  
**Scope:** Full /dashboard page UX redesign

---

## Current State: Diagnosis

### The Page is Structurally Broken

The dashboard is a ~650-line page with 9 major content sections, each over-engineered and many duplicating each other. At typical viewport heights (768–1080px), the page requires 3–4 full scrolls to reach the Research Terminal CTA. The Micro-Market Velocity Map alone consumes ~35% of the viewport.

### The Fundamental Problem: One Page Trying to Be Six Pages

| Section | What it does | Duplicate of |
|---|---|---|
| **KPI Cards** | Institutional Inventory, Alpha, Pipeline, Vetted | None (unique) |
| **MarketPulse (365 lines)** | 4 KPIs + Area Heat + 4 sparkline charts + Analyst Summary | Everything below |
| **MarketConditionsBar** | 7 market mode metrics | Part of MarketPulse KPIs |
| **MicroMarketVelocityMap** | SVG map of area heat | Area Heat in MarketPulse |
| **AreaPerformanceTable** | Full table of area heat/growth | Area Heat in MarketPulse + Map |
| **SwapRateSignal** | 2yr/5yr swap + implied rate + 6M history table | Sparklines in MarketPulse |
| **BoERatePathChart** | BoE rate scenario paths | BoE rate in MarketPulse |
| **Market Data Indicator** | London HPI YoY + last updated | KPI + MarketPulse |
| **Comparison Basket** | Portfolio shortlist preview | None (unique) |
| **Quick-Add** | URL paste to add property | None (unique) |
| **Navigation CTA** | Card prompt to go to /properties | Redundant |

### Root Cause

MarketPulse is the original "everything widget." Over iterations, engineers kept adding more market data widgets rather than removing what was in MarketPulse. The result: MarketPulse is 365 lines with sparklines, SwapRateSignal has a 6-month rate table that's identical to MarketPulse's sparklines section, BoERatePathChart shows the same BoE rate that appears as a KPI in MarketPulse, and the Micro-Market Velocity SVG is a larger, visual version of the area heat bar that already appears inside MarketPulse.

---

## Specific UX Defects

### UX-DASH-01: MarketPulse is a Monolith (CRITICAL)
- 365 lines, 4 distinct content zones, 4 sparkline charts
- Sparklines + Rate Trajectory section duplicates SwapRateSignal entirely
- Area Heat section inside MarketPulse duplicates MicroMarketVelocityMap entirely
- "Analyst Summary Ticker" is narrative text in a Bloomberg-style dashboard — wrong aesthetic
- "Liquidity: High / Sentiment: Opportunistic" hardcoded badges belong in analyst notes, not a pro tool
- **Fix:** Strip MarketPulse to its 4 KPI blocks + compact area heat row. Remove sparklines (they belong in SwapRateSignal on /rates). Remove analyst summary.

### UX-DASH-02: Micro-Market Velocity Map Consumes ~35% of Viewport (CRITICAL)
- 500px SVG height, full-width, with a data strip below it
- Same data shown in MarketPulse Area Heat section AND AreaPerformanceTable
- On a 1080p viewport, the map alone is >40% of visible area before scrolling
- The SVG is decorative at this scale — circles at fixed coordinates, no interactivity
- **Fix:** Replace with a compact horizontal pill strip (~48px tall) showing top 8 areas with color-coded heat. Full interactive map moves to /rates or a dedicated /market-map page.

### UX-DASH-03: Redundant Data Row — London HPI Displayed 3 Times (HIGH)
- KPI Card: avgAlpha = alpha score
- London HPI YoY appears in MarketPulse → KPI: London HPI
- Market Data Indicator card: London HPI YoY + last updated
- **Fix:** Remove Market Data Indicator card. London HPI is in MarketPulse already.

### UX-DASH-04: SwapRateSignal + BoERatePathChart Belong on /rates, Not Dashboard (HIGH)
- SwapRateSignal: 6M rate history table = identical to MarketPulse sparklines section → duplication
- BoERatePathChart: BoE base rate = also in MarketPulse KPI block
- These are specialist rate intelligence components. The dashboard's job is strategic overview, not deep-dive analysis.
- **Fix:** Move to a new `/rates` page. Add nav link in sidebar under Market Intelligence.

### UX-DASH-05: AreaPerformanceTable Duplicates MicroMarketVelocityMap (MEDIUM)
- Same area names, heat scores, growth data
- **Fix:** Remove from dashboard. AreaPerformanceTable moves to /market (consolidated with MicroMarketVelocityMap on a dedicated page).

### UX-DASH-06: Bottom Navigation CTA is Redundant (LOW)
- Users navigate via sidebar. A full-width card pushing to /properties wastes space.
- **Fix:** Remove. Link stays accessible in sidebar and Comparison Basket section header.

### UX-DASH-07: Quick-Add Supporting Paragraph (LOW)
- "Supports Rightmove, Zoopla..." text is noise after first use.
- **Fix:** Remove the paragraph.

---

## Target State: Compact Dashboard

### Three Visible Sections, One Scroll

```
┌─────────────────────────────────────────────────────┐
│  KPI HEADER — 4 cards (unchanged)                   │
├─────────────────────────────────────────────────────┤
│  MARKET PULSE (compact) — 4 KPIs + Area Heat pills   │
│  MARKET CONDITIONS BAR (unchanged, below it)         │
├─────────────────────────────────────────────────────┤
│  PORTFOLIO SNAPSHOT — Comparison Basket │ Inbox     │
│  QUICK-ADD — compact strip (kept, para removed)     │
│  MICRO-MARKET HEAT — horizontal pills, ~48px tall   │
└─────────────────────────────────────────────────────┘
```

### What's Removed
- Market Data Indicator card (duplicate London HPI)
- Micro-Market Velocity Map full SVG
- AreaPerformanceTable
- SwapRateSignal (→ /rates page)
- BoERatePathChart (→ /rates page)
- Bottom navigation CTA card

### What's New
- `MicroMarketVelocityPills.tsx` — horizontal compact pills (top 8 areas, ~48px)
- `/rates` page — SwapRateSignal + BoERatePathChart + AreaPerformanceTable consolidated
- Sidebar nav: "Market Intelligence →" expands to "Rates & Scenarios"

---

## Component Changes

| File | Action |
|---|---|
| `MarketPulse.tsx` | Strip to 4 KPIs + area heat pills. Remove sparklines, analyst summary, rate trajectory section. ~100 lines |
| `MicroMarketVelocityMap.tsx` | **Replace** with `MicroMarketVelocityPills.tsx` — compact horizontal pill strip |
| `Dashboard.tsx` | Remove Market Data Indicator, AreaPerformanceTable, SwapRateSignal, BoERatePathChart, bottom CTA. Import MicroMarketVelocityPills |
| New: `MicroMarketVelocityPills.tsx` | Horizontal scrollable pill row, top 8 areas, color-coded heat, ~48px tall |
| New: `/rates` page | SwapRateSignal + BoERatePathChart + AreaPerformanceTable |

---

## Rationale

The dashboard is a **strategic overview**, not a Bloomberg terminal. Bloomberg Terminal packs density because traders need every data point visible simultaneously. This tool's user is a single private buyer making one high-stakes decision — they need a clean signal, not every data point visible at once.

Bloomberg Terminal aesthetic is achieved through **precision typography, dark theme, tight spacing, and monospaced numbers** — not by dumping every data set onto one page. Linear's influence is restraint: clean, focused, one thing per section.

The redesigned dashboard:
- Loads in **one scroll** at standard viewport
- Gives immediate strategic signal (KPIs + Market Pulse + Conditions)
- Shows portfolio status without clutter
- Keeps Quick-Add as a useful tool widget
- Provides market heat in a glanceable pill strip
- Pushes deep-dive rate analysis to `/rates` where it belongs
