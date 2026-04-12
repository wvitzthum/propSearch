# Metric Clarity Audit Report
**Date:** 2026-04-02  
**Auditor:** UI/UX QA Agent  
**Scope:** All dashboard metrics vs. `METRIC_DEFINITIONS.md` — tooltip coverage, methodology accuracy, and strategic value context

---

## Executive Summary

| Metric Category | Coverage | Status |
|---|---|---|
| Alpha Score (primary) | ✅ Tooltip with 3-component breakdown | PASS |
| Months of Supply / Inventory Velocity | ✅ Tooltip + methodology string | PASS |
| Area Heat Index | ✅ Tooltip + methodology string | PASS |
| Negotiation Delta | ✅ Tooltip + methodology string | PASS |
| BoE Rate | ✅ Tooltip + methodology string | PASS |
| Property Table (7 columns) | ✅ Tooltips on all headers | PASS |
| KPICard (generic) | ✅ `tooltip` + `methodology` props supported | PASS |
| LTV Match Score | ✅ Custom tooltip with match level + reasons | PASS |
| **MarketConditionsBar (7 metrics)** | ❌ **ZERO tooltips** | **FAIL — QA-186** |
| MicroMarketVelocityPills | ❌ No tooltips on area pills | MARGINAL |
| SwapRateSignal | ⚠️ Needs verification on /rates page | UNVERIFIED |
| BoERatePathChart | ⚠️ Needs verification on /rates page | UNVERIFIED |

**Verdict:** Tooltip infrastructure is well-built (shared `Tooltip.tsx` component with `content` + `methodology` props). Coverage is excellent in MarketPulse, PropertyTable, and AlphaBadge. **Critical gap: MarketConditionsBar is completely missing all 7 metric tooltips** despite being one of the highest-visibility components on the dashboard.

---

## Methodology

1. Cross-referenced every metric rendered in `Dashboard.tsx`, `MarketPulse.tsx`, `MarketConditionsBar.tsx`, `AlphaBadge.tsx`, `PropertyTable.tsx`, `LTVMatchBadge.tsx`, `KPICard.tsx`, and `MicroMarketVelocityPills.tsx` against the formal definitions in `METRIC_DEFINITIONS.md`.
2. Inspected tooltip implementation in each component source file.
3. Assessed whether tooltip text includes: (a) definition, (b) formula/methodology, (c) strategic value.
4. Verified smoke test coverage (56 tests, 0 failures, 3 skipped responsive tests).

---

## Detailed Findings

### ✅ PASS: Alpha Score (AlphaBadge.tsx)

**Tooltips:** Yes — 3 sub-components shown with bar indicators  
**Definition:** Shown implicitly via badge tiers  
**Formula:** Component breakdown shown (Tenure Quality / Price Efficiency / Spatial Alpha) but **exact 40/30/30 weighting not displayed**  
**Strategic Value:** Not explicitly stated  

**Assessment:** Acceptable for current state. Bar breakdown gives users enough signal to understand the composition. However, for institutional-grade transparency, the exact weights should be added to the tooltip content.

---

### ✅ PASS: Months of Supply (MOS) — MarketPulse.tsx

```
methodology="Active Listings / Avg. Monthly Sales. < 4m = Seller's Market, > 6m = Buyer's Market."
```
**Assessment:** Excellent. Includes formula, thresholds, and market mode interpretation. Fully compliant with METRIC_DEFINITIONS.md.

---

### ✅ PASS: Area Heat Index — MarketPulse.tsx

```
methodology="Aggregated data from Rightmove/Zoopla on search volume vs. listing duration."
```
**Assessment:** Good. Explains data source and what drives the score. METRIC_DEFINITIONS.md doesn't define a specific formula, so this is appropriately high-level.

---

### ✅ PASS: Negotiation Delta — MarketPulse.tsx

```
methodology="Calculation based on Land Registry sold data vs. initial portal asking price."
```
**Assessment:** Accurate. References Land Registry (correct authoritative source). METRIC_DEFINITIONS.md defines as "average difference between Asking Price and Sold Price in current quarter" — matches.

---

### ✅ PASS: BoE Rate — MarketPulse.tsx

```
methodology="Directly sourced from the BoE Monetary Policy Committee (MPC) latest release."
```
**Assessment:** Correct attribution. Source is BoE MPC.

---

### ✅ PASS: Property Table Tooltips (PropertyTable.tsx)

All 7 tracked columns have tooltip text on column headers:
- Address — definition included
- Alpha — definition included
- Price/SQM — methodology included
- Appreciation Potential — methodology included
- Commute Utility — methodology included
- Realistic Price — methodology included
- Value Gap — definition included

**Assessment:** All PropertyTable columns are compliant.

---

### ❌ FAIL: MarketConditionsBar — ALL 7 Metrics (QA-186)

**Status:** ZERO tooltips — no `Tooltip` component used anywhere in the file.

The MarketConditionsBar is one of the most prominent elements on the dashboard. It shows 7 metrics that all have formal definitions in METRIC_DEFINITIONS.md:

| Metric | METRIC_DEFINITIONS.md Definition | Tooltip Status |
|---|---|---|
| **Market Mode (MOS)** | `Active Listings / Avg. Monthly Sales` — < 4 Seller, 4-6 Balanced, > 6 Buyer | ❌ Missing |
| **Negotiation Room** | "Average difference between Asking Price and Sold Price in current quarter" | ❌ Missing |
| **Rate Signal** | Swap rate trend (rising/falling/holding) | ❌ Missing |
| **Seasonal Window** | "Optimal Buy Window" indicator based on historical price dips | ❌ Missing |
| **Buyer Favour Score** | Composite score (custom formula, not in METRIC_DEFINITIONS.md) | ❌ Missing (and formula itself may need documentation) |
| **MPC Date** | "Next Bank of England MPC meeting" | ❌ Missing |
| **SDLT Badge** | SDLT tier thresholds (Q2 2026 milestones) | ❌ Missing |

**Root Cause:** MarketConditionsBar was built as a compact status strip without institutional tooltip context. It was added to the dashboard to surface market mode at a glance, but the tooltip layer was never implemented.

**Fix Required:** Wrap each metric segment (lines 71-144 of MarketConditionsBar.tsx) in `<Tooltip content={...} methodology={...}>` tags. The market mode threshold logic already exists in the code — the tooltip strings just need to be added.

---

### ⚠️ UNVERIFIED: SwapRateSignal and BoERatePathChart

These components will be moved to `/rates` (UX-011). Their tooltip coverage should be verified when the `/rates` page is implemented. Currently on the dashboard, they are duplicated with MarketPulse sparklines (per UX-DASH-04).

---

### ⚠️ MARGINAL: MicroMarketVelocityPills

This compact component (which replaces the large MicroMarketVelocityMap per UX-DASH-02) shows area heat pills but has no tooltips. The data is identical to what was in the Area Heat section of MarketPulse, which does have tooltips. Low priority — the pill strip is intentionally glanceable and non-interactive.

---

## Test Suite Status

```
Running 59 tests using 6 workers
✓ 56 passed
- 3 skipped (responsive design — pending QA-187)
0 failures
Total runtime: 42.1s
```

**Smoke Tests:** 9/9 passing (3 responsive skipped)  
**Accessibility Tests:** 6/6 passing  
**Component Tests:** AlphaBadge — 1/1 passing  
**Page Tests:** Dashboard, Comparison, Landing, MortgageTracker, AffordabilitySettings, PropertyDetail, MarketConditionsViewport — all passing  
**Known Bugs (filtered in smoke tests, not causing failures):**
- `hpi_forecasts.map` type error (QA-164)
- `Failed to fetch` PropertyContext hardcoded URL (QA-166)
- `Objects are not valid as a React child` MarketConditionsBar (QA-172)
- `same key` Inbox.tsx duplicate filename (QA-171)
- SVG NaN coords in CapitalAppreciationChart + SparklineChart (no ticket — QA-185 opened)
- Null `p.area` in PropertyContext / Layout (no ticket — QA-185 covers)

---

## New QA Tasks Logged

| ID | Priority | Title | Owner |
|---|---|---|---|
| QA-185 | High | Bug: SVG NaN rendering — CapitalAppreciationChart + SparklineChart | Frontend Engineer |
| QA-186 | High | Metric Clarity: MarketConditionsBar — all 7 market metrics lack institutional tooltips | Frontend Engineer |
| QA-187 | Medium | Responsive Layout Audit: Sidebar (pl-64) not mobile-optimised | Frontend Engineer + QA |

---

## Recommendations

1. **FE (QA-186):** Prioritize MarketConditionsBar tooltip implementation. This is the highest-visibility gap and the most impactful for the institutional UX mandate.

2. **FE (QA-185):** Guard SVG rendering in CapitalAppreciationChart and SparklineChart with NaN checks before setting `d`, `cx`, `cy` attributes.

3. **FE (QA-187):** Conduct mobile viewport audit first before implementing responsive design fix. QA will provide viewport breakpoints and expected behavior.

4. **FE (UX-011):** When `/rates` page is built, verify SwapRateSignal and BoERatePathChart tooltip coverage.

5. **QA (revisit):** Re-audit after all three open QA tasks are resolved. Target: full metric tooltip coverage across all dashboard components.
