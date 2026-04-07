# Rates & Market Page UX Redesign — UX Assessment & Implementation Briefs
**Date:** 2026-04-05
**Auditor:** UI/UX QA
**Scope:** `/rates` page and `/market` page — Area Performance, Property Type Performance, London Prime Premium, and overall page architecture

---

## Executive Summary

The `/rates` and `/market` pages contain valuable data presented in fragmented, competing layouts that fail to tell a coherent story. The primary issues are:

1. **No visual hierarchy** — 6+ components of equal weight competing for attention
2. **Cramped chart dimensions** — SVG viewBoxes too small for legible analytics
3. **Area Performance buried in a dense table** — hard to scan, no visual storytelling
4. **Property Type chart undersells itself** — good data, poor presentation
5. **Missing narrative layer** — raw numbers without "so what?" context
6. **London Prime Premium illegible** — 200×80 viewBox is unreadable

**New tasks created:** UX-029, UX-030, UX-031, UX-032, UX-033

---

## Part 1: Area Performance — UX Redesign

### Current State

**Component:** `AreaPerformanceTable` (lines 1-146)
**Location:** `/rates` page — cramped 1/3-width column in 3-column grid

**What it does well:**
- Shows area name, heat score, YoY growth, 12M forecast, Δ vs benchmark
- Heat score dot-bar is clever (5 dots showing 1-10 scale visually)
- Delta icon (TrendingUp/Down/Minus) with colour coding
- Legend explaining outperforming/in-line/underperforming

**What it does poorly:**

#### Issue 1.1: Dense HTML Table — Zero Visual Storytelling
The data is a wall of numbers. Users cannot answer "which area is the best opportunity?" at a glance — they must read and compare 5 numeric columns across every row.

**Evidence:** The table renders 5 columns in a narrow container. The 5px heat dots are the only visual element.

#### Issue 1.2: No Ranked Visual — Heat Score Isn't Prominent
The heat score is shown as 5 tiny coloured dots in a cell. A user scanning the page cannot see relative performance — only absolute values.

**What users need:** A ranked horizontal bar chart showing areas ordered by heat score, with the bar length communicating magnitude.

#### Issue 1.3: Benchmark Delta Buried
The "Δ vs Benchmark" column is the most actionable data point — it tells you whether an area is outperforming London — but it's the last column, competing with 4 other numeric columns.

#### Issue 1.4: Area Names Truncated, No Area Colour Coding
Areas like "West Hampstead NW6" appear in plain text with no visual identity. Each area should have a consistent colour code that maps to the heat map on `/market`.

#### Issue 1.5: No Drill-Down
Users see "NW3 outperforming by +2.1pp" but cannot click through to see NW3 properties.

---

### UX-029: Area Performance — Ranked Horizontal Bar Chart

**Task ID:** UX-029
**Priority:** High
**Effort:** Medium
**Owner:** Frontend Engineer
**Component:** `AreaPerformanceTable` → replace/enhance to `AreaPerformanceChart`

**Implementation Brief:**

Transform `AreaPerformanceTable` into a ranked horizontal bar chart. Each area is a row with:
- **Left:** Area name badge with consistent area colour code
- **Middle:** Horizontal bar showing heat score (or YoY growth) — bar length proportional to score
- **Right:** YoY % + Δ vs benchmark in two compact cells

```tsx
// Layout concept (approximate):
┌──────────────────────────────────────────────────────────────┐
│ NW3        ████████████████░░░░  +3.2%   Δ+1.8pp ▲         │
│ W2         ███████████████░░░░░  +2.8%   Δ+1.4pp ▲         │
│ SW3        █████████████░░░░░░  +2.4%   Δ+1.0pp ▲         │
│ N1         ████████████░░░░░░░  +1.9%   Δ+0.5pp ▲         │
│ NW6        ███████████░░░░░░░░  +1.4%   Δ+0.0pp —         │
│ SW10       ██████████░░░░░░░░░  +0.8%   Δ-0.6pp ▼         │
│ W8         ████████░░░░░░░░░░░  +0.2%   Δ-1.2pp ▼         │
└──────────────────────────────────────────────────────────────┘
```

**Specific changes:**
1. Replace HTML `<table>` with a custom flex/SVG row layout
2. Each row is a horizontal bar — bar length = heat score / max heat × available width
3. Bar fill colour: gradient from rose (low heat) → amber (mid) → green (high heat)
4. Show delta as a compact badge: "+1.8pp" in green or "-0.6pp" in rose
5. Area names use consistent colour codes from the London heat map (NW3=green, W2=amber, etc.)
6. Make rows clickable — click navigates to `/properties?area=NW3` filtered view
7. Keep the footer legend (TrendingUp/Down/Minus explanation)
8. Use `@visx/responsive` ParentSize for full-width responsiveness

**Design standards:**
- Row height: 32-36px for scanability
- Bar height: 8px with 2px border-radius
- Font: 10px area names, 10px bold for percentages
- Smooth hover highlight on rows
- Mobile: show top 5 areas only with "View all →" link

---

## Part 2: London Prime Premium Chart — Enlarge to Full Width

### Current State

**Component:** `LondonPrimePremiumChart` (lines 1-291)
**SVG viewBox:** `0 0 200 80` — **critically undersized**
**Container height:** 120px

**What it does well:**
- KPI strip shows PCL Premium, 12M Change, Peak
- Premium area fill (amber shading between UK and PCL lines)
- YoY Premium Δ bar below chart
- Tooltip with date/UK/PCL/Premium values

**What it does poorly:**

#### Issue 2.1: SVG ViewBox 200×80 Is Illegible
The chart is essentially decorative — at 200×80 units, the line strokes are sub-pixel, year labels are invisible, and hover interaction has almost no precision. This is the worst-sized chart on the page.

#### Issue 2.2: "(18% premium proxy)" Disclaimer Undermines Trust
The footer shows "(18% premium proxy)" — this tells users the key metric is an approximation. Either source real PCL data or remove the disclaimer and label it as "implied premium."

#### Issue 2.3: KPI Strip Doesn't Explain Methodology
PCL Premium = +18.0% — what does this mean? A user seeing this for the first time doesn't know if that's good or bad.

#### Issue 2.4: Chart Below KPI Strip — No Visual Connection
The 3 KPIs and the chart feel like separate components. They should be visually unified.

---

### UX-030: London Prime Premium — Full-Width Hero Chart

**Task ID:** UX-030
**Priority:** High
**Effort:** Medium
**Owner:** Frontend Engineer
**Component:** `LondonPrimePremiumChart`

**Implementation Brief:**

Give this chart a **full-width hero placement** on the `/rates` page (like FE-219 for HPI), or at minimum make it a **2/3-width prominent card**. Increase SVG dimensions dramatically.

**Changes to `LondonPrimePremiumChart`:**

```tsx
// BEFORE:
const W = 200, H = 80;
<div style={{ height: 120 }}>

// AFTER:
const W = 600, H = 200;     // 3x larger viewBox
<div style={{ height: 280 }} // larger container
```

**Layout restructure:**
```
┌──────────────────────────────────────────────────────────────┐
│ London Prime Premium Tracker              Source: Land Reg  │
├───────────────┬─────────────────────┬──────────────────────┤
│ PCL Premium   │ 12M Change           │ Peak Premium         │
│ +18.0%        │ +1.2pp ▲            │ 24.3% (2021-Q3)      │
├───────────────┴─────────────────────┴──────────────────────┤
│                                                              │
│   [Large area chart: UK Index vs PCL Implied — 200px tall]   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ PCL premium widening: +1.2pp over 12 months. Prime London   │
│ outperforming UK average by 18.0% — highest premium in       │
│ 3 years.                                                    │
└──────────────────────────────────────────────────────────────┘
```

**Key improvements:**
1. Increase viewBox: `200×80` → `600×200` minimum (3x current)
2. Increase container height: `120px` → `280px`
3. Scale all internal elements proportionally (stroke widths, font sizes, grid)
4. Add narrative context below chart — a 1-sentence summary of what the premium trend means
5. Remove "(18% premium proxy)" disclaimer or relabel as "Implied premium vs UK" (transparent)
6. Add peak annotation marker on chart (vertical dashed line at peak date)
7. Make chart hover tooltip more informative: show date, both index values, and premium %

---

## Part 3: Property Type Performance — Elevate to Hero Status

### Current State

**Component:** `PropertyTypePerformanceChart` (lines 1-245)
**Location:** `/market` page — standalone full-width section
**Chart type:** Horizontal bar chart with `@visx`

**What it does well:**
- Horizontal bar chart is the right chart type for this data
- Risk-free threshold line (BoE rate) for alpha framing
- Alpha value (return - risk-free) clearly shown
- 5-year total in footer column
- Volatility data shown per bar
- Tooltip on hover
- Responsive via `ParentSize`

**What it does poorly:**

#### Issue 3.1: Volatility Numbers Are Meaningless Without Context
"vol 0.80" is shown under each bar label. A user has no idea if 0.80 is high or low volatility. This needs either:
- A visual volatility range indicator
- Better labelling: "Low vol" / "Medium vol" / "High vol"
- Or remove the raw number and replace with a risk tier badge

#### Issue 3.2: No "Best Value" Signal
The chart shows 4 bars of different colours, but doesn't clearly identify which is the best risk-adjusted opportunity. Add a "Best Alpha" badge or highlight the top-performing bar.

#### Issue 3.3: Footer "5yr Total" Is Underused
"+16.5%" is shown in the right column, but users don't have an intuitive sense of compounding. Could show £ impact: "£100K → £116.5K in 5yr" or similar.

#### Issue 3.4: No Data Story
"Studio/1-Bed outperforms detached houses by +1.9pp annually" — this is a key insight that should be highlighted on the chart itself, not hidden in a tooltip.

#### Issue 3.5: Missing From /rates Page
Users researching affordability on `/rates` would benefit enormously from property type performance data. The chart is isolated on `/market`.

---

### UX-031: Property Type Performance — Hero-Level Redesign

**Task ID:** UX-031
**Priority:** High
**Effort:** Medium
**Owner:** Frontend Engineer
**Components:** `PropertyTypePerformanceChart`, `MarketPage`

**Implementation Brief:**

**Option A (Recommended):** Move the chart to `/rates` as a full-width hero section alongside the HPI trajectory (FE-219). Keep a summary on `/market`.

**Option B:** Redesign in place on `/market` with a full-width layout.

**Key improvements:**

```tsx
// Conceptual layout:
// ┌──────────────────────────────────────────────────────────────┐
// │ Property Type Segment Performance — London Prime             │
// ├──────────────────────────────────────────────────────────────┤
// │                                                              │
// │  Studio/1-Bed  ████████████████████████████████  +3.1%     │
// │                                                     ★ BEST  │
// │  2-Bed Flat   ████████████████████████████       +2.3%     │
// │                                                              │
// │  3-Bed/Terr   █████████████████████████         +1.8%     │
// │                                                              │
// │  Detached     ████████████████                      +1.2% │
// │             ───────────────────────────────────────         │
// │               Risk-free (BoE 3.75%)                        │
// │                                                              │
// ├──────────────────────────────────────────────────────────────┤
// │ KEY INSIGHT: Studio/1-Bed generates +1.9pp more annual     │
// │ return than Detached — best risk-adjusted opportunity.      │
// │ Alpha vs risk-free: +1.1% for top segment.                 │
// └──────────────────────────────────────────────────────────────┘
```

**Specific changes:**
1. Increase bar height: `14px` → `24px` (much more prominent)
2. Scale SVG width to at least 500px in the viewBox
3. Replace raw "vol 0.80" with text labels: "High vol" / "Med vol" / "Low vol" — use color coding
4. Add "BEST ALPHA" badge on the top-performing bar (Studio/1-Bed)
5. Show 5yr total as compounding: "+16.5% → £100K → £116.5K"
6. Add a prominent risk-free threshold line (currently dashed, should be bolder)
7. Add a KEY INSIGHT callout below the chart — one sentence summarizing the data story
8. On `/market` page, show a compact version; full version lives on `/rates`
9. Add segment rank badge: "Rank 1 of 4" for the top performer

**Design standards:**
- Bar height: 24px (3x current)
- Rank badge: small coloured pill (gold/silver/bronze) on the right of top bar
- Key insight: amber/green highlighted text block below chart
- Font: 11px bold for bar labels
- Risk-free line: 1px solid white/30% with "Risk-free: BoE 3.75%" label

---

## Part 4: /rates Page Architecture — Narrative Layer

### Current State

The `/rates` page has 6 components placed without a coherent narrative structure. A user landing on this page sees:
1. Swap Rate Signal (top banner)
2. 3-column grid: BoE | HPI | Area Performance
3. London Prime Premium (full width below)

**Problem:** No "so what?" — users see numbers without understanding what they mean for their acquisition decision.

### UX-032: /rates Page — Market Verdict Hero + Affordability Signal

**Task ID:** UX-032
**Priority:** High
**Effort:** Medium
**Owner:** Frontend Engineer
**Page:** `RatesPage.tsx`

**Implementation Brief:**

Add a **Market Verdict Hero** section at the top of the `/rates` page — above all charts. This is a high-impact, single-row component that synthesises the page's data into one actionable headline.

```tsx
// Layout: inserted as first child of max-w-7xl container
<div className="bg-linear-card border border-linear-border rounded-2xl p-6">
  <div className="flex items-center gap-4">
    {/* Left: Verdict badge */}
    <div className="shrink-0">
      <div className="px-4 py-2 bg-retro-green/10 border border-retro-green/30 rounded-xl">
        <div className="text-[9px] font-black text-retro-green uppercase tracking-widest mb-0.5">Market Verdict</div>
        <div className="text-lg font-black text-retro-green tracking-tighter">BUYER'S WINDOW</div>
      </div>
    </div>

    {/* Middle: Key metrics row */}
    <div className="flex-1 grid grid-cols-4 gap-4">
      <Metric label="MOS" value="7.2mo" sub="+18% vs Q4" />
      <Metric label="Rate Signal" value="Falling" sub="GBP 5yr -0.3pp" />
      <Metric label="Buyer Favour" value="7.8/10" sub="Best since 2023" />
      <Metric label="HPI Momentum" value="+2.1%" sub="vs +1.2% London" />
    </div>

    {/* Right: Affordability CTA */}
    <div className="shrink-0 text-right">
      <div className="text-[9px] text-linear-text-muted uppercase tracking-widest mb-0.5">Affordability</div>
      <div className="text-xl font-black text-retro-green">-£370/mo</div>
      <div className="text-[8px] text-linear-text-muted">vs peak rates</div>
    </div>
  </div>

  {/* Narrative strip */}
  <div className="mt-4 pt-4 border-t border-linear-border">
    <p className="text-[10px] text-linear-text-muted leading-relaxed">
      BoE rate cuts underway. Swap rates falling (−0.3pp 5yr). Mortgage affordability improving. 
      Studio/1-Bed in NW3 offers best alpha (+3.1% vs +1.2% detached). HPI momentum exceeding London benchmark.
    </p>
  </div>
</div>
```

**Data sources (pull from existing hooks):**
- MOS: from `useMacroData` → `market_conditions.mos`
- Rate Signal: from `SwapRateSignal` component state or `useMacroData`
- Buyer Favour: from `MarketConditionsBar` data
- Affordability delta: computed from `useAffordability` — compare peak rate vs current rate for £600K mortgage

**Acceptance criteria:**
- [ ] Hero section renders above all other components on `/rates`
- [ ] All 4 metrics pull from live data (no hardcoded values)
- [ ] Affordability delta is computed from actual rate data
- [ ] Narrative strip updates reactively as data changes
- [ ] Compact layout works on tablet (collapse to 2-col grid)
- [ ] On mobile, hero collapses to a single stacked card

---

## Part 5: /market Page — Information Architecture

### Current State

The `/market` page currently has 3 sections:
1. `LondonMicroMarketHeatMap` — geographic heat map
2. `MicroMarketVelocityMap` — ranked velocity bars
3. `PropertyTypePerformanceChart` — property type performance

**Issues:**
- Page feels incomplete — it's mostly a geographic map with a table below
- Property Type Performance isolated here but more useful on `/rates`
- No "Market Verdict" for the `/market` page specifically
- The page title says "Area Heat Map" but the page is about micro-market intelligence

### UX-033: /market Page — Market Verdict + Property Type Summary

**Task ID:** UX-033
**Priority:** Medium
**Effort:** Low
**Owner:** Frontend Engineer
**Page:** `MarketPage.tsx`

**Implementation Brief:**

Add a **Market Verdict strip** at the top of `/market` (mirroring UX-032 on `/rates`), and create a **compact Property Type summary** card that links to the full version on `/rates`.

**Market Verdict for /market:**
```
┌──────────────────────────────────────────────────────────────┐
│ 🏆 MARKET VERDICT: ACTIVE SHORTLIST WINDOW                  │
│                                                              │
│ 6 of 6 target areas outperforming London benchmark.           │
│ Top velocity: NW3 (+3.2% YoY, MOS 6.1mo).                   │
│ Studio/1-Bed segment leads appreciation.                    │
└──────────────────────────────────────────────────────────────┘
```

**Compact Property Type card (replaces the full chart on /market):**
Show a compact 4-row horizontal summary of property type returns — same data as `PropertyTypePerformanceChart` but in a condensed card format (no chart, just ranked list with key numbers). Link to `/rates` for the full analysis.

```tsx
// Compact card (replaces PropertyTypePerformanceChart on /market):
<div className="bg-linear-card border border-linear-border rounded-2xl p-4">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
      Segment Alpha — Top Performer: Studio/1-Bed (+3.1%)
    </h3>
    <Link to="/rates" className="text-[9px] text-blue-400 hover:underline">
      Full analysis →
    </Link>
  </div>
  {/* 4 rows of compact data */}
  <PropertyTypeRow type="Studio/1-Bed" return="+3.1%" alpha="+1.1pp" rank={1} />
  <PropertyTypeRow type="2-Bed Flat"  return="+2.3%" alpha="+0.3pp" rank={2} />
  <PropertyTypeRow type="3-Bed/Terr"  return="+1.8%" alpha="-0.2pp" rank={3} />
  <PropertyTypeRow type="Detached"    return="+1.2%" alpha="-0.8pp" rank={4} />
</div>
```

---

## Summary: New Tasks for FE Engineer

| ID | Priority | Title | Effort | Component |
|---|---|---|---|---|
| FE-219 | Medium | HPI Trajectory — full-width hero placement on /rates | Low | HPIHistoryChart, RatesPage |
| UX-029 | High | Area Performance — replace table with ranked horizontal bar chart | Medium | AreaPerformanceTable → AreaPerformanceChart |
| UX-030 | High | London Prime Premium — full-width hero + 3× larger viewBox | Medium | LondonPrimePremiumChart |
| UX-031 | High | Property Type Performance — hero redesign with key insight + move to /rates | Medium | PropertyTypePerformanceChart, RatesPage |
| UX-032 | High | /rates page — add Market Verdict hero + affordability signal | Medium | RatesPage |
| UX-033 | Medium | /market page — Market Verdict strip + compact Property Type summary | Low | MarketPage |
| FE-215 | Medium | MarketConditionsBar overflow — compact mode | Low | MarketConditionsBar, Dashboard |

---

## Layout Vision: /rates Page After Redesign

```
┌────────────────────────────────────────────────────────────────┐
│  MARKET VERDICT: BUYER'S WINDOW · MOS 7.2mo · -£370/mo ▼    │
│  BoE cuts underway. Studio/1-Bed in NW3 leads appreciation.  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  HPI HISTORICAL TRAJECTORY (full width — 600×300 viewBox)    │
│  UK Index 2015-2026 · Scenario fan · Event annotations       │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SWAP RATE SIGNAL          │  LONDON PRIME PREMIUM (full-wd) │
│  GBP 2yr 4.25% ▼          │  PCL +18.0% · 3yr trend chart   │
│  GBP 5yr 3.95% ▼          │  Narrative below chart         │
│  6mo sparklines            │                                │
│                            │                                │
├────────────────────────────┼─────────────────────────────────┤
│                            │                                 │
│  BOE RATE PATH             │  AREA PERFORMANCE               │
│  3 scenario fans           │  Ranked bar chart               │
│  Q3 2026 → Q2 2027         │  NW3, W2, SW3, N1...           │
│                            │                                 │
└────────────────────────────┴─────────────────────────────────┘
```

This redesigned layout tells a clear story: **"Rates are falling, London prime is outperforming, here's your mortgage impact, here's where to look."**
