# PO-008: Bank Rate Short-Term Forecasting Feature Scope

**Status:** In Progress (Product Owner)
**Blocked by:** DAT-211 (Done), DAT-212 (In Progress)
**Blocking:** FE implementation tasks

---

## Overview

Give propSearch users a probabilistic view of where BoE rates are headed in the next 12 months — not just the base case consensus, but the **market-implied probability distribution** at each MPC meeting. This is a material information advantage: mortgage rate uncertainty is the #1 variable in affordability calculation.

---

## Data Foundation

**DAT-211 (Done):** Refreshed BoE base rate, swap rates, mortgage history through March 2026.
- Current base rate: 4.50% (as of March 20)
- Swap rates: 2yr=3.92%, 5yr=4.05% (March 30)
- MPC next meeting: **May 7-8, 2026**

**DAT-212 (In Progress):** Source SONIA/BoE forward curve data for short-term bank rate prediction model.
- SONIA futures prices for next 4 MPC meetings
- Market-implied rate probabilities
- SONIA forward curve: discrete forward rates per inter-meeting period

---

## PROPOSED COMPONENTS

### 1. MPC Probability Matrix
**Location:** MarketConditionsBar + RatesPage

A table showing the next 4 MPC meetings with Cut/Hold/Raise probability bars.

| Meeting | Cut | Hold | Raise | Confidence |
|---------|-----|------|-------|------------|
| May 7-8 2026 | 35% | 58% | 7% | High |
| Jun 12 2026 | 40% | 52% | 8% | Medium |
| Aug 7 2026 | 45% | 48% | 7% | Low |
| Sep 18 2026 | 50% | 45% | 5% | Low |

**Visual:** 3-segment horizontal bar per row — green (cut) / grey (hold) / red (raise). Widths proportional to probabilities. Click-to-expand shows:
- Volume/liquidity of each market (confidence signal)
- Historical accuracy of prediction (from DAT-215)
- Source attribution with live link

**Data source:** SONIA futures (DAT-212) + Polymarket (DAT-214 — parallel track)

---

### 2. SONIA Forward Curve Chart
**Location:** RatesPage (below BoERatePathChart)

SVG area chart showing implied daily/weekly forward rates from today through Q2 2027.

**X-axis:** Monthly intervals (May 2026 → Jun 2027)
**Y-axis:** Rate % (3.00% – 5.00%)
**Shape:** Stepped line (rate holds between MPC meetings, jumps on decision day)

**Overlay options:**
- Analyst scenarios (bear/base/bull) from existing BoERatePathChart
- Market consensus from Polymarket categorical markets
- Shaded uncertainty band (±1 std dev from SONIA)

**Implementation:** Extend existing `BoERatePathChart.tsx` with a `mode` prop: `'scenarios' | 'forwardCurve' | 'both'`

---

### 3. Rate Decision Bet Calculator
**Location:** AffordabilitySettings (new accordion section)

Interactive widget: *"Should I lock a fixed rate today or wait?"*

**Inputs:**
- Decision horizon: 1mo / 3mo / 6mo toggle
- Loan type: 2yr / 5yr fixed toggle
- Current expected rate (from SONIA forward curve)

**Calculates:**
- Probability-weighted expected rate at decision horizon
- Expected cost/saving vs locking today
- Break-even probability (what cut probability makes waiting worthwhile?)

**Output:**
```
Rate Wait Calculator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lock today at 4.40% (2yr fixed)?
Probability of lower rate in 3mo: 45%
Expected saving if rates fall 25bps: £2,100
Break-even cut probability: 52%

→ Recommendation: LOCK NOW
  (upside outweighs 45% wait benefit)
```

Integrates with existing `BorrowingPowerCalculator.tsx`.

---

### 4. Mortgage Timing Signal
**Location:** SwapRateSignal component (extends existing)

Derived indicator: *"Fixed rates likely to [FALL/RISE/HOLD] in next 3 months"*

**Logic:**
- If SONIA forward curve slopes down → FALL signal (green)
- If SONIA forward curve slopes up → RISE signal (red)
- Rate of change in SONIA → signal strength

**Enhancement to existing SwapRateSignal.tsx:**
- Add `timing_signal` field from DAT-212 data
- Add `rate_outlook_3m` badge: "Rates seen falling to ~X% by Q3 2026"
- Add confidence indicator (high/medium/low from market liquidity)

---

### 5. Rate Horizon Selector
**Location:** AffordabilitySettings

Toggle on the affordability calculator: *"Should I do 2yr or 5yr fixed?"*

**Decision logic:**
- Compare 2yr forward rate (implied from SONIA 2yr swap) vs 5yr current rate
- If 5yr rate premium > 50bps → "Consider 2yr and remortgage"
- If 5yr rate premium < 20bps → "5yr provides certainty, worth the premium"
- Show probability-weighted outcome for each choice

**UI:** Segmented control above the mortgage rate display:
```
[ 2yr Fixed ] [ 5yr Fixed ] [ 2yr → Remortgage ]
```

---

## INTEGRATION POINTS

| Component | What Changes |
|-----------|-------------|
| `MarketConditionsBar.tsx` | Add MPC Probability Matrix strip |
| `SwapRateSignal.tsx` | Add Mortgage Timing Signal + Rate Outlook badge |
| `BoERatePathChart.tsx` | Add SONIA Forward Curve mode + market consensus overlay |
| `AffordabilitySettings.tsx` | Add Rate Decision Bet Calculator + Rate Horizon Selector |
| `types/macro.ts` | Add `MPCProbability`, `SoniaForwardCurve`, `RateDecision` interfaces |
| `useMacroData.ts` | Normalize new SONIA and prediction market fields |

---

## DATA SCHEMA (for DAT-212/DAT-214)

```typescript
// MPC Probability per meeting
interface MPCProbability {
  meeting_date: string;        // "2026-05-07"
  meeting_label: string;      // "May 2026"
  cut_prob: number;            // 0.35
  hold_prob: number;           // 0.58
  raise_prob: number;          // 0.07
  source: 'SONIA' | 'Polymarket' | 'Composite';
  confidence: 'high' | 'medium' | 'low';
  last_refreshed: string;
}

// SONIA Forward Curve
interface SoniaForwardCurve {
  _provenance: Provenance;
  points: Array<{
    date: string;             // "2026-05-01"
    implied_rate: number;     // 4.40
    source: string;
  }>;
}

// Rate Decision Recommendation
interface RateDecision {
  horizon_3m: {
    current_2yr_rate: number;
    implied_3m_rate: number;
    cut_probability: number;
    expected_saving: number;
    recommendation: 'lock_now' | 'wait' | 'neutral';
  };
}
```

---

## PRIORITY ORDER

1. **MPC Probability Matrix** — most actionable, clearest user value
2. **Rate Horizon Selector** — directly affects affordability calculation
3. **Mortgage Timing Signal** — extends SwapRateSignal with minimal new UI
4. **SONIA Forward Curve Chart** — visualization of DAT-212 data
5. **Rate Decision Bet Calculator** — advanced, lowest priority

---

## BLOCKERS

- DAT-211 ✅ (rate refresh) — DONE
- DAT-212 (SONIA forward curve) — must complete before FE work
- DAT-214 (Polymarket) — optional enhancement for Polymarket overlay
- DAT-215 (prediction market accuracy) — feeds confidence signals

---

## OUT OF SCOPE

- Live brokerage API integration (too complex, maintainers require credentials)
- AI-generated rate predictions (ML models — no training data)
- Integration with mortgage broker portals (out of scope for propSearch)
- Real-time WebSocket updates (Polymarket doesn't support WS; polling sufficient)
