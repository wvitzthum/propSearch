
PURCHASING POWER INDEX — UX AUDIT
=================================
File: frontend/src/components/PurchasingPowerChart.tsx
Page: /affordability (AffordabilitySettings.tsx)
Date: 2026-04-16
Auditor: ui_ux_qa

CONTEXT
-------
PurchasingPowerChart shows max loan achievable at a given monthly budget
over historical 5yr mortgage rates. It uses @visx ParentSize correctly and
compiles without errors. The UX problems are not about code quality — they
are about interpretability and user comprehension.

FINDINGS
--------

[PPI-001] 🔴 CRITICAL: X-axis has NO labels whatsoever
  The chart shows 24 months of mortgage history (last 24 entries from
  mortgage_history). The xScale maps index [0..23] to pixel positions, but
  NO tick marks, date labels, or month/year indicators are ever rendered.
  
  The user cannot answer: "What time period does this cover?" or
  "When did purchasing power start improving?"
  
  Compare with HPIHistoryChart.tsx which explicitly renders:
    yearLabels.map(({ x, label }) => <text x={getX(x)} ...>{label}</text>)
  
  The 32px bottom padding is reserved (line 122: bottom: 32) but
  nothing is drawn there.
  
  IMPACT: Chart is not interpretable without referring to external data.

[PPI-002] 🟠 HIGH: Rate data is calculated but never shown on the chart
  The chart computes `rate` per data point (line 49):
    rate = extractValue(h.mortgage_5yr ?? ...)
  
  This rate is shown in the tooltip, but the chart area itself shows
  ONLY the maxLoan line — no rate annotations, no secondary axis,
  no reference to which rate drives the purchasing power.
  
  A purchasing power chart's core value proposition is showing how
  rate changes move purchasing power. The rate MUST be visible on
  or near the chart, either as:
  - Rate value labels at key points (start, end, inflection)
  - A secondary right-side rate axis
  - Annotations at min/max rate points
  
  Without this, the user cannot connect rate movements to loan changes.

[PPI-003] 🟠 HIGH: Number formatting inconsistent across the component
  - Header current max: £{(currentMaxLoan / 1000).toFixed(0)}K
    → "£296K" (rounded, no comma)
  - Y-axis labels: £{(v / 1000).toFixed(0)}K
    → "£296K" (same format)
  - Tooltip: £{(tooltipData.maxLoan / 1000).toFixed(0)}K
    → "£296K" (same format)
  
  UK convention for amounts this large: £296,000 (comma separator).
  All three locations should use consistent formatting.
  Use toLocaleString('en-GB') for proper UK number formatting.
  
  At minimum the header (line 110) should say £XXX,XXX not £XXXK
  to avoid ambiguity at a glance.

[PPI-004] 🟡 MEDIUM: No starting-point reference line
  The component calculates:
    earliestMaxLoan = chartData[0].maxLoan
    currentMaxLoan  = chartData[last].maxLoan
    deltaPct        = +X.X%
  
  But the chart shows only the current line — no reference line
  or area marking where it started. The user sees a blue area
  with no baseline context. Compare with CapitalAppreciationChart
  fan charts which always show a starting reference.
  
  A thin dashed horizontal line at the starting loan amount
  would let the user immediately see how far purchasing power
  has moved in either direction.

[PPI-005] 🟡 MEDIUM: Chart subtitle ambiguous — mortgage type not specified
  Subtitle (line 94):
    "Max loan at £X/mo budget · 25yr term"
  
  Which mortgage product rate drives this?
  The code uses mortgage_5yr (5-year fixed) but this is invisible
  to the user. The subtitle should read:
    "Max loan at £X/mo · 5yr fixed rate · 25yr term"
  
  Different products (2yr, 5yr, SVR) will have different purchasing
  power implications. The chart title is misleading without this.

[PPI-006] 🟡 MEDIUM: Date range not communicated in header
  The chart covers 24 months (last 24 entries of mortgage_history).
  The header shows the current max loan and % change, but not:
  - "Last 24 months" or "2023–2025"
  - The actual date range covered
  
  Add a small date range label to the header, e.g.:
  "Jan 2023 – Dec 2024 · 5yr fixed"

[PPI-007] 🟡 MEDIUM: Grid lines too faint at strokeOpacity 0.05
  Line 157: strokeOpacity is implicit (default 1) with value 0.05
  Other charts in the system (HPIHistoryChart, BoERatePathChart) use
  0.06–0.10 for grid line opacity. The current value makes horizontal
  grid lines nearly invisible, reducing the chart's scanability.
  Recommendation: increase to 0.08.

SUMMARY
-------
PPI-001 is a showstopper. A chart with no x-axis labels cannot be read.
PPI-002 and PPI-003 are high priority — rate visibility and number
formatting are fundamental to the chart's purpose.
PPI-004, 005, 006, 007 are medium polish improvements.

All tasks are frontend implementation work. Total new tasks: 7.
