# Metric Definitions Reference
*Reference from: agents/ui_ux_qa/METRIC_DEFINITIONS.md*

## Alpha Score (0–10)
**Definition:** Weighted composite rating representing overall acquisition quality.
**Methodology:**
- Tenure Quality (40%): SoFH=10, >150yr lease=10, >125yr=8, >90yr=7
- Spatial Alpha (30%): Tube <300m=+7, <500m=+5, <800m=+3. Park <400m=+3, <800m=+1
- Price Efficiency (30%): `5 + (area_discount_pct / 25) × 5`

**Tooltip requirement:** Must explain all three components and their weights.

## Value Gap
**Definition:** Delta between list price and realistic acquisition target.
**Methodology:** `list_price − realistic_price`
**Display:** Negative = overpriced (red), positive = underpriced (green).

## Price Efficiency (£/SQM)
**Definition:** Pricing efficiency relative to micro-location benchmarks.
**Methodology:** `list_price / sqm`
**Tooltip requirement:** Must reference area benchmark comparison.

## Appreciation Potential
**Definition:** 5-year capital appreciation forecast.
**Methodology:** Area Momentum × Transport Connectivity × Asset Quality × Value Gap (composite score normalized to 0–10%).
**Tooltip requirement:** Must explain scenario assumptions (p10/p50/p90).

## LTV Match Score
**Definition:** Affordability fit between user's budget and property price.
**Methodology:** Based on deposit %, monthly budget, current mortgage rates.
**Display:** Green = within budget, Amber = 10% over, Red = >10% over.
