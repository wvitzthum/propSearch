
CHART SVG vs visx MIGRATION AUDIT
==================================
Date: 2026-04-16
Auditor: ui_ux_qa
System: /frontend/src/components/

AUDIT METHODOLOGY
-----------------
For each chart component, checked for:
  <svg>         — raw SVG element present
  viewBox=      — SVG coordinate system in use (the problematic pattern)
  @visx         — visx library usage
  ParentSize    — responsive width via @visx/responsive
  <Group>       — visx coordinate group
  <Grid>        — visx grid primitives (@visx/grid)

PATTERN GUIDE
-------------
  ✅ GOOD:   visx + ParentSize + <Group>  — responsive, screen-pixel coords
  ⚠️ MIXED:  visx + viewBox               — visx primitives but SVG viewBox causes coord bugs
  ❌ RAW:    <svg> + viewBox, no visx     — hand-rolled SVG, not maintainable

FINDINGS
--------
  MIXED        HPIHistoryChart.tsx              visx+ParentSize but viewBox on SVG causes PPI-008 bug
  MIXED        CapitalAppreciationChart.tsx     visx shapes but viewBox SVG coordinate system
  MIXED        SparklineChart.tsx               visx primitives but raw SVG viewBox
  MIXED        SwapRateSignal.tsx               visx primitives but raw SVG viewBox
  RAW SVG      FloorplanViewer.tsx              pure SVG, no visx at all
  RAW SVG      MarketSituationRoom.tsx          pure SVG, no visx at all
  ✅ GOOD       LondonPrimePremiumChart.tsx      visx + ParentSize + GridRows
  ✅ GOOD       AreaPerformanceChart.tsx         visx + ParentSize + Group
  ✅ GOOD       BoERatePathChart.tsx             visx + ParentSize + GridRows + Axis
  ✅ GOOD       LTVBandComparisonChart.tsx       visx + ParentSize + Group
  ✅ GOOD       PipelineFunnelChart.tsx          visx + ParentSize + Group
  ✅ GOOD       PropertyPriceEvolution.tsx       visx + ParentSize + GridRows
  ✅ GOOD       PropertyTypePerformanceChart.tsx visx + ParentSize + Group
  ✅ GOOD       RentalYieldVsGiltChart.tsx       visx + ParentSize + Group
  ✅ GOOD       AreaMetricHeatmap.tsx            visx + ParentSize + Group
  ✅ GOOD       PurchasingPowerChart.tsx         visx + ParentSize + Group
  ✅ GOOD       SeasonalMarketCycle.tsx          visx + ParentSize + Group

ANALYSIS
--------
✅ 11 charts — correctly migrated to visx + ParentSize pattern
⚠️  4 charts — visx migrated but still using viewBox on <svg> (MIXED pattern)
   The viewBox attribute on the SVG element causes TWO known bugs:
   1. tooltipLeft/Top coords are in viewBox space but TooltipWithBounds
      expects screen pixel coords → mispositioned tooltips
   2. SVG font sizes in pt/px are interpreted as viewBox units and scale
      with the SVG, making labels near-invisible at small viewBox sizes
   3. ParentSize is used for width responsiveness but viewBox locks the
      height-to-width ratio, making the chart non-responsive vertically

❌  2 charts — entirely raw SVG, no visx migration at all

TASKS REQUIRED
--------------
VISX-029  HIGH  Frontend  HPIHistoryChart.tsx — remove viewBox from <svg>, use explicit height={SVG_H}
                              (note: xMax bug also filed as PPI-008, same component)
VISX-030  HIGH  Frontend  CapitalAppreciationChart.tsx — remove viewBox, adopt full visx ParentSize pattern
VISX-031  MED   Frontend  SparklineChart.tsx — remove viewBox, adopt visx with ParentSize
VISX-032  MED   Frontend  SwapRateSignal.tsx — remove viewBox, adopt visx with ParentSize
VISX-033  HIGH  Frontend  FloorplanViewer.tsx — rebuild as visx (floorplan is a simple grid/scale)
VISX-034  HIGH  Frontend  MarketSituationRoom.tsx — assess and migrate to visx

REFERENCE IMPLEMENTATION (canonical correct pattern)
------------------------------------------------------
BoERatePathChart.tsx:
  1. MARGIN = { top: 12, right: 8, bottom: 40, left: 32 }
  2. <ParentSize>{ ({ width }) => { ... }}</ParentSize>
  3. <svg width={width} height={INNER_HEIGHT}>
  4. NO viewBox attribute on <svg>
  5. <Group left={MARGIN.left} top={MARGIN.top}>
  6. <GridRows> from @visx/grid
  7. <AxisBottom> from @visx/axis for x-axis labels
  8. All coords in screen pixels via scaleLinear + getX/getY helpers

SUMMARY
-------
  Total chart components: 17
  Correctly migrated:     11  (65%)
  viewBox + visx mixed:     4  (24%)  — known UX bugs from coord mismatch
  Raw SVG, no visx:         2  (12%)  — unmaintainable, no interactivity hooks
  New tasks to create:       6
