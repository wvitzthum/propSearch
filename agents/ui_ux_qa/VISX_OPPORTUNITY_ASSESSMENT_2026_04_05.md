# @visx Opportunity Assessment — 2026-04-05
**Auditor:** UI/UX QA
**Purpose:** Identify where @visx can be leveraged far more aggressively to create Bloomberg-grade analytical visualizations

---

## Installed @visx Packages

```
@visx/axis       ✅ INSTALLED — UNUSED
@visx/curve      ✅ INSTALLED — PARTIALLY USED (curveMonotoneX in sparklines)
@visx/event      ✅ INSTALLED — USED (localPoint)
@visx/gradient   ✅ INSTALLED — UNUSED
@visx/grid      ✅ INSTALLED — PARTIALLY USED (GridRows in PropertyPriceEvolution, BoERatePathChart)
@visx/group      ✅ INSTALLED — USED
@visx/responsive ✅ INSTALLED — PARTIALLY USED (ParentSize only — no useParentSize hook)
@visx/scale     ✅ INSTALLED — USED
@visx/shape     ✅ INSTALLED — PARTIALLY USED (LinePath, AreaClosed, Bar — but missing Pie, Arc, LineRadial, etc.)
@visx/tooltip    ✅ INSTALLED — USED

NOT INSTALLED — RECOMMENDED:
@visx/annotation  ← KEY: Chart annotations (event lines, range highlights, callouts)
@visx/curve       ← Already installed
@visx/legend      ← Axis legend component
@visx/pattern     ← UNUSED but installed
@visx/heatmap     ← Heatmap visualization
@visx/stats       ← Histogram / density estimation (perfect for Monte Carlo chart)
@visx/threshold    ← Confidence interval bands
@visx/voronoi     ← Voronoi diagram for scatter plot hover zones
@visx/brush       ← Interactive zoom/selection on time series
@visx/drag        ← Interactive drag on charts
```

---

## Part 1: Current State — What Needs Better @visx

### 1.1 CapitalAppreciationChart — Monte Carlo Histogram

**Current:** Uses raw `<rect>` elements for the Monte Carlo histogram bins (FE-203 comment says "uses Bar primitives" but the histogram section actually uses hand-drawn rects).

**Problem:** No proper axis, no label formatting, no density curve overlay.

**Opportunity — VISX-001:**
Use `@visx/shape Bar` + `@visx/stats Histogram` + `@visx/axis Axis` for the Monte Carlo distribution:

```tsx
import { histogram, density } from '@visx/stats';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { LinePath } from '@visx/shape';
import { density1d } from '@visx/stats';

// Show Monte Carlo distribution as:
// 1. Histogram bars (properly sized via @visx/stats histogram())
// 2. Density curve overlay (kernel density estimation)
// 3. P10/P50/P90 percentile lines (via @visx/annotation)
// 4. Professional axes with £ formatting
```

**Impact:** The Monte Carlo histogram is currently the most analytically sophisticated chart on the site — it deserves to look the part.

---

### 1.2 All Charts — Missing @visx/axis

**Current:** Every chart uses raw `<text>` elements for axis labels (e.g., `{fmt(tick)}` in `PriceEvolutionChart.tsx` line 292, `{v.toFixed(0)}` in `HPIHistoryChart.tsx` line 273).

**Problem:** 
- Inconsistent axis label formatting across components
- No axis lines, ticks, or grid integration
- Every component re-invents the same axis rendering code

**Opportunity — VISX-002:**
Replace all hand-written axis rendering with `@visx/axis`:

```tsx
import { AxisLeft, AxisBottom, AxisRight } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';

// BEFORE (every chart):
{[0, 0.25, 0.5, 0.75, 1].map(pct => {
  const v = minV + (maxV - minV) * pct;
  return (
    <g key={pct}>
      <line x1={PAD} y1={getY(v)} x2={W-PAD} y2={getY(v)} stroke="..." />
      <text x={PAD-1} y={getY(v)+1} className="text-[3px] fill-...">
        {v.toFixed(0)}
      </text>
    </g>
  );
})}

// AFTER (unified, reusable):
<Group left={PAD} top={MARGIN}>
  <GridRows scale={yScale} numTicks={5} stroke="rgba(255,255,255,0.04)" />
  <AxisLeft
    scale={yScale}
    numTicks={5}
    tickFormat={v => `£${(v/1000).toFixed(0)}K`}
    stroke="rgba(255,255,255,0.1)"
    tickStroke="rgba(255,255,255,0.1)"
    tickLabelProps={() => ({
      fill: 'rgba(255,255,255,0.4)',
      fontSize: 8,
      fontFamily: 'Inter, monospace',
      textAnchor: 'end',
    })}
  />
</Group>
```

**Files to update:** HPIHistoryChart, LondonPrimePremiumChart, PropertyPriceEvolution, CapitalAppreciationChart, BoERatePathChart, RentalYieldVsGiltChart

---

### 1.3 AreaPerformanceTable — Hand-Rolled HTML Bars

**Current:** `AreaPerformanceTable` uses CSS `width` percentages and div-based bars (see line 85-94: `{[1,2,3,4,5].map(...) => <div className="h-1.5 w-2 rounded-full">`).

**Opportunity — VISX-003:**
Replace with `@visx/shape` horizontal bar chart using `ParentSize` for responsive width:

```tsx
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { ParentSize } from '@visx/responsive';
import { LinearGradient } from '@visx/gradient';

// Color-coded bars using @visx/gradient
<LinearGradient
  id="heat-gradient"
  from="#ef4444"   // rose — cold
  to="#22c55e"     // green — hot
  fromOffset="0%"
  toOffset="100%"
/>
<Bar
  rx={4}
  fill="url(#heat-gradient)"
  // Scale fill position to show actual heat value
/>
```

This would also fix the data duplication identified in the UX audit (UX-029) — one visx chart replacing the table + the static dot-bar pattern.

---

## Part 2: New @visx Visualizations — Unbuilt Opportunities

### 2.1 @visx/annotation — Chart Callouts & Event Markers (VISX-004)

**What it is:** `@visx/annotation` provides `Annotation`, `LineSubject`, `CircleSubject`, `CurveSubject`, `Rect`, `Label`, `Callout`, and `Bracket` components for overlaying editorial annotations on charts.

**Where to use it:**

**HPIHistoryChart** — annotate key events:
```tsx
import { Annotation, CircleSubject, LineSubject, Label } from '@visx/annotation';

<Annotation
  x={xScale(annotationX['2020-09'])}
  y={yScale(hpiAt2020)}
  dx={20}
  dy={-20}
>
  <LineSubject
    stroke="#22c55e"
    strokeWidth={1}
    strokeDasharray="4,2"
  />
  <CircleSubject radius={6} fill="#22c55e" />
  <Label
    title="SDLT Holiday"
    subtitle="Jun 2020"
    width={80}
    height={40}
    style={{ background: '#18181b', color: '#fff' }}
  />
</Annotation>
```

**CapitalAppreciationChart** — mark P10/P50/P90 on the Monte Carlo histogram:
```tsx
<Annotation
  x={xScale(p50Value)}
  y={chartHeight * 0.5}
>
  <LineSubject orientation="vertical" />
  <Label title="P50" subtitle="Median outcome" />
</Annotation>
```

**Affordability page** — mark rate pivot points on historical rate charts.

---

### 2.2 @visx/heatmap — Area vs. Metric Matrix (VISX-005)

**What it is:** `@visx/heatmap` creates a heatmap grid where cells are coloured by value — perfect for cross-dimensional data.

**Where to use it:**

On `/market` page — **Area × Metric Heatmap** showing multiple metrics per area simultaneously:

```
              YoY Growth | HPI Forecast | Negotiation | MOS
NW3           ██████████ | ██████████  | ████████    | █████
W2            █████████  | █████████   | ██████████  | ████
SW3           ████████   | ████████   | ████████    | ████
Islington N1  ███████    | ███████    | ████████    | ██████
```

This would replace the `MarketPulse` area strip on the dashboard and give users a richer multi-dimensional view of area performance.

**Installation:** `npm install @visx/heatmap`

---

### 2.3 @visx/stats + @visx/threshold — Monte Carlo Distribution (VISX-006)

**What it is:** `@visx/stats` provides `histogram()` and `density1d()` functions — mathematically correct binning and kernel density estimation. `@visx/threshold` draws confidence interval bands between two series.

**Where to use it:**

**CapitalAppreciationChart** — upgrade the Monte Carlo histogram:
```tsx
import { histogram, density1d } from '@visx/stats';
import { Threshold } from '@visx/threshold';

// Create properly-binned histogram from raw Monte Carlo samples
const bins = histogram(finalValues, { binCount: 20 });

// Compute kernel density estimate for smooth overlay
const kde = density1d({
  values: finalValues,
  bandwidth: 30, // pounds
  bins: 100,
});

// Threshold band for P10-P90 range
<Threshold<{x: number; y: number}>
  data={p90Data}
  yScales={{ y: yScale }}
  clipToBounds
  aboveArea={({ color }) => (
    <AreaClosed fill={color} opacity={0.1} />
  )}
  belowArea={({ color }) => (
    <AreaClosed fill={color} opacity={0.05} />
  )}
/>
```

This replaces the current hand-rolled histogram rects with mathematically rigorous statistical visualization.

**Installation:** `npm install @visx/stats @visx/threshold`

---

### 2.4 @visx/brush — Interactive Time Series Zoom (VISX-007)

**What it is:** `@visx/brush` lets users drag to select a range on a time series and zoom in.

**Where to use it:**

**HPIHistoryChart** — on desktop, add a brush selector below the main chart so users can zoom into any 2-year window of the 10-year history. On mobile, hide the brush (responsive).

```tsx
import { Brush } from '@visx/brush';
import { Bounds } from '@visx/brush/lib/types';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

const brushMargin = { top: 0, bottom: 20, left: 50, right: 20 };

<Brush
  xScale={xScale}
  height={60}
  margin={brushMargin}
  handleSize={8}
  innerRef={brushRef}
  resizeTriggerAreas={['left', 'right']}
  brushDirection="horizontal"
  onChange={(domain) => {
    if (!domain) return;
    setZoomRange([domain.x0, domain.x1]);
  }}
/>
```

**Installation:** `npm install @visx/brush`

---

### 2.5 @visx/voronoi — Hover Zones for Line Charts (VISX-008)

**What it is:** `@visx/voronoi` computes a Voronoi diagram from data points — every point in the chart is closer to its own data point than any other. This gives pixel-perfect hover targets for line charts without needing to click exactly on the line.

**Where to use it:**

**HPIHistoryChart, LondonPrimePremiumChart** — currently these charts use a full-width invisible `<rect>` for hover detection. This works but has no precision — you can't hover "between" data points.

```tsx
import { VoronoiPolygon, VoronoiMesh } from '@visx/voronoi';
import { localPoint } from '@visx/event';

// Compute Voronoi from data points
const voronoiLayout = useMemo(() => {
  const points = history.map((h, i) => ({ x: xScale(i), y: yScale(h.index_uk), d: h }));
  return voronoi<typeof points[0]>()(points);
}, [history]);

// Render Voronoi cells as invisible hover targets
<VoronoiMesh
  nodes={voronoiLayout}
  fill="transparent"
  stroke="transparent"
  onMouseMove={(event, node) => {
    setHoverDate(node.data.date);
  }}
/>
```

**Installation:** `npm install @visx/voronoi`

---

### 2.6 @visx/legend — Chart Legends (VISX-009)

**What it is:** `@visx/legend` provides `LegendLinear`, `LegendQuantile`, `LegendOrdinal`, and `LegendSize` for rendering chart legends programmatically from scale functions.

**Where to use it:**

**PropertyTypePerformanceChart** — the risk-free threshold legend is currently hand-coded HTML. Replace with `LegendLinear` tied to the `scaleLinear` used for bar widths — if the scale changes, the legend updates automatically.

**LondonPrimePremiumChart** — the UK/PCL legend is static text. Replace with `LegendLinear` that automatically reflects the chart's actual value range.

```tsx
import { LegendLinear } from '@visx/legend';

<LegendLinear
  scale={yScale}
  labelFormat={v => `£${v.toFixed(0)}K`}
  style={{
    labels: { fill: 'rgba(255,255,255,0.4)', fontSize: 8 },
  }}
/>
```

**Installation:** `npm install @visx/legend`

---

### 2.7 Pipeline Funnel Chart — New Component with @visx/shape Bar (VISX-010)

**Current:** The Dashboard pipeline funnel uses raw `<div>` width percentages (`style={{ width: \`${...}%\` }}`) — no axes, no proper scaling, no hover interactivity.

**Opportunity:**
Create a proper `PipelineFunnelChart` using `@visx/shape` `Bar` + `ParentSize`:

```tsx
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';

const xScale = scaleBand({
  domain: ['Discovered', 'Shortlisted', 'Vetted'],
  range: [0, width],
  padding: 0.3,
});

const yScale = scaleLinear({
  domain: [0, max(stats.discovered, stats.shortlisted, stats.vetted) * 1.2],
  range: [height, 0],
});

// Trapezoid funnel effect using clipPath or layered bars
// Gradient fill: blue (discovered) → amber (shortlisted) → green (vetted)
// Add count labels at bar centres
// Hover: highlight bar, show percentage of total
```

Also add a **Sankey-style transition** showing how properties move between pipeline stages over time — using `@visx/shape` `LinkHorizontal` or `LinkVertical` for the connection paths.

---

### 2.8 Purchasing Power Index Chart — New Component (VISX-011)

**From UX-032:** R12 requires a "Purchasing Power Index" chart showing max loan for a fixed monthly budget over time.

**Design:** Dual-axis time series:
- Primary axis: Max loan amount (£K) — solid line, @visx `LinePath`
- Secondary axis: Interest rate (%) — dashed line, @visx `LinePath`
- Fan band: show the range of max loans across different rate scenarios (using `@visx/threshold` AreaClosed between best/worst case)

```tsx
import { scaleTime } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Threshold } from '@visx/threshold';
import { curveMonotoneX } from '@visx/curve';

const xScale = scaleTime({
  domain: [oldestDate, newestDate],
  range: [0, width],
});

// Best/worst case band for purchasing power range
<Threshold<{date: Date; value: number}>
  data={rangeData}
  x={d => xScale(d.date)}
  y0={d => yScale(d.worstCase)}
  y1={d => yScale(d.bestCase)}
  clipToBounds
/>
```

---

### 2.9 Affordability LTV Band Comparison — New Component (VISX-012)

Show monthly payment across LTV bands as a stacked or grouped bar chart with `@visx/shape` `Bar`:

```tsx
import { scaleLinear, scaleBand, scaleOrdinal } from '@visx/scale';
import { Bar, BarGroup } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisLeft, AxisBottom } from '@visx/axis';

// X: property price tiers (£500K, £750K, £1M, £1.5M)
// Y: monthly payment
// Grouped bars: 90% LTV | 80% LTV | 75% LTV | 60% LTV
// Color: green (75%+) vs amber (80%) vs red (90%) — clear LTV risk signal
```

---

### 2.10 Comparative Radar/Spider Chart — Property Comparison (VISX-013)

**From R7 (Comparison Engine):** Show 4-5 key metrics for 2-3 properties as a radar chart — perfect for comparing alpha breakdowns, price efficiency, location score, and rental yield simultaneously.

**@visx doesn't have a native radar — but here's how to build one with @visx/shape:**

```tsx
import { LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';

// 5 axes: Alpha Score | Price/m² | Appreciation | Commute | Running Costs
const axes = ['Alpha', 'Efficiency', 'Growth', 'Commute', 'Running'];
const n = axes.length;
const radius = 100;

// Convert polar to cartesian
const toXY = (angle: number, r: number) => ({
  x: radius + r * Math.cos(angle - Math.PI / 2),
  y: radius + r * Math.sin(angle - Math.PI / 2),
});

// Property 1 radar polygon
const prop1Points = metrics.map((v, i) => {
  const angle = (i / n) * 2 * Math.PI;
  const r = (v / maxValue) * radius;
  return toXY(angle, r);
});

// Use @visx/LinePath with curve="linear" to connect the points
// Render multiple polygons overlaid with semi-transparent fills
// Use @visx/shape Line for axis lines from center to each vertex
```

This would make the `/comparison` page dramatically more compelling — one glance shows which property dominates across all dimensions.

---

## Part 3: Visual Design Improvements Using @visx

### 3.1 @visx/gradient — Richer Chart Gradients (VISX-014)

**Currently:** Only basic `linearGradient` definitions in SVG defs, manually written.

**Opportunity:** Use `@visx/gradient` to create reusable gradient components for all charts:

```tsx
import { LinearGradient, RadialGradient } from '@visx/gradient';

// Scenario fan area gradients — not just flat blue:
<LinearGradient
  id="bull-zone"
  from="#22c55e"
  to="#22c55e"
  fromOpacity={0.15}
  toOpacity={0.02}
/>

// Monte Carlo histogram fill:
<RadialGradient
  id="mc-histogram-fill"
  from="#a855f7"
  to="#a855f7"
  fromOpacity={0.3}
  toOpacity={0.05}
/>
```

Use gradients consistently across: CapitalAppreciationChart, HPIHistoryChart, PropertyPriceEvolution, LondonPrimePremiumChart.

---

### 3.2 @visx/grid — Consistent Grid Lines (VISX-015)

**Currently:** Every chart has its own hand-written grid line rendering.

**Opportunity:** Create a shared `<ChartGrid>` component using `@visx/grid` `GridRows` + `GridColumns`:

```tsx
// components/ChartGrid.tsx
export const ChartGrid: React.FC<{
  xScale: ScaleType;
  yScale: ScaleType;
  width: number;
  height: number;
  xTicks?: number;
  yTicks?: number;
}> = ({ xScale, yScale, width, height, xTicks = 5, yTicks = 5 }) => (
  <Group>
    <GridRows scale={yScale} numTicks={yTicks} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
    <GridColumns scale={xScale} numTicks={xTicks} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
  </Group>
);
```

Then replace all inline grid rendering across 6+ chart files with one reusable component.

---

## Part 4: Missing @visx Primitives We Should Install

| Package | Use Case | Priority |
|---|---|---|
| `@visx/annotation` | Event markers on HPI chart, P10/P50/P90 on Monte Carlo | **High** |
| `@visx/stats` | Monte Carlo histogram binning + density estimation | **High** |
| `@visx/brush` | Interactive zoom on time series (HPI, rates) | Medium |
| `@visx/heatmap` | Area × Metric heatmap matrix on /market | Medium |
| `@visx/legend` | Auto-updating chart legends tied to scale functions | Medium |
| `@visx/voronoi` | Precise hover zones on all line charts | Medium |
| `@visx/threshold` | Confidence interval bands (Monte Carlo P10-P90) | Medium |
| `@visx/drag` | Interactive chart handles (brush, range sliders) | Low |
| `@visx/pattern` | Already installed — use in chart backgrounds | Low |

---

## Summary: Tasks for FE Engineer

| ID | Priority | Title | Effort |
|---|---|---|---|
| VISX-001 | High | Monte Carlo histogram — upgrade with @visx/stats Histogram + density1d + threshold bands | Medium |
| VISX-002 | High | Replace all hand-written axis/grid with @visx/axis + @visx/grid across 6+ chart files | Medium |
| VISX-003 | High | AreaPerformanceTable — replace CSS bars with @visx/shape Bar + @visx/gradient | Medium |
| VISX-004 | High | Install @visx/annotation — add event markers to HPI chart + percentile callouts | Low |
| VISX-005 | Medium | Install @visx/heatmap — Area × Metric heatmap on /market page | Medium |
| VISX-006 | Medium | Install @visx/threshold — confidence bands on Monte Carlo fan chart | Low |
| VISX-007 | Medium | Install @visx/brush — interactive time series zoom on HPIHistoryChart | Medium |
| VISX-008 | Medium | Install @visx/voronoi — pixel-precise hover on all line charts | Low |
| VISX-009 | Medium | Install @visx/legend — auto-updating legends tied to scale functions | Low |
| VISX-010 | Medium | PipelineFunnelChart — new component with @visx/shape Bar + ParentSize | Medium |
| VISX-011 | Medium | PurchasingPowerIndex — new chart with @visx/threshold dual-axis fan bands | Medium |
| VISX-012 | Low | LTV Band Comparison — grouped @visx/shape Bar chart on /affordability | Low |
| VISX-013 | Low | Radar chart — new component for /comparison page property comparison | Medium |
| VISX-014 | Low | Shared ChartGrid + gradient library — reusable components across all charts | Low |
| VISX-015 | Low | Rich gradient fills — @visx/gradient across CapitalAppreciation, HPI, PriceEvolution | Low |

---

## Recommended Execution Order

**Phase 1 — Quick Wins (this sprint)**
1. VISX-002: Replace hand-written axes with @visx/axis across all charts (medium, high impact)
2. VISX-014: Add rich gradient fills using @visx/gradient (low effort, high visual improvement)
3. VISX-004: Install @visx/annotation + add event markers to HPIHistoryChart (low effort, high impact)
4. VISX-003: AreaPerformanceTable → @visx bar chart (part of UX-029)

**Phase 2 — Analytical Depth (next sprint)**
5. VISX-001: Monte Carlo upgrade with @visx/stats + @visx/threshold (high analytical value)
6. VISX-006: Confidence bands on CapitalAppreciationChart
7. VISX-010: PipelineFunnelChart with @visx
8. VISX-011: PurchasingPowerIndex chart

**Phase 3 — Interactive Power (backlog)**
9. VISX-007: @visx/brush zoom on time series
10. VISX-005: @visx/heatmap for /market page
11. VISX-013: Radar chart for /comparison page
12. VISX-008: @visx/voronoi for all line chart hover zones
