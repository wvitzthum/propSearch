# PO-009: Prediction Market Intelligence Feature Scope

**Status:** In Progress (Product Owner)
**Blocked by:** DAT-213 (research), DAT-214 (Polymarket data pipeline), DAT-215 (accuracy backtest)
**Blocking:** FE implementation tasks

---

## Overview

Prediction market prices are the most liquid, real-time distillation of collective market intelligence on BoE rate decisions. Polymarket prices are already priced as probabilities — price 0.35 = 35% implied probability. This gives propSearch users a material information advantage: real-time probability estimates from liquid markets, rather than waiting for analyst consensus or lagged survey data.

**Key insight:** Polymarket binary market prices = probabilities. A market priced at 0.40 means the crowd believes 40% probability. This is directly usable in PO-008's rate decision framework.

---

## DATA FOUNDATION

**DAT-213 (Todo):** Research Polymarket + document scraping method
- Polymarket API scraping via FlareSolverr
- Active BoE-related markets: https://polymarket.com/event/bank-of-england-decision-in-april, https://polymarket.com/event/bank-of-england-rate-hike-in-2026
- Other sources: Metaculus, Smarkets, Betfair

**DAT-214 (Todo):** Integrate Polymarket data into macro_trend.json
- `prediction_markets` section with boe_decisions, boe_rate_2026 arrays
- Refresh daily during MPC weeks, weekly otherwise

**DAT-215 (Todo):** Backtest prediction market accuracy 2023-2026
- Hit rate, Brier score, calibration analysis
- Feeds confidence signals in UI

---

## PROPOSED COMPONENTS

### 1. MPC Probability Strip
**Location:** MarketConditionsBar + RatesPage (primary), SwapRateSignal (secondary)

The flagship component — **probability bars** for the next MPC decision.

**Data:** From Polymarket BoE decision markets (DAT-214) + SONIA futures (DAT-212)

**Visual design:**
```
┌──────────────────────────────────────────────────────────────┐
│ Next MPC: May 7-8 2026                    Confidence: HIGH ● │
├──────────────────────────────────────────────────────────────┤
│ [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│ Cut 35%         Hold 58%           Raise 7%                   │
│ ████████████                                                 │
└──────────────────────────────────────────────────────────────┘
```
- 3-segment bar: green / grey / red
- Percentage labels on each segment
- Expandable on click: shows market details, source link

**Secondary view (SwapRateSignal):**
- Compact strip: "May MPC: HLD 58% | CUT 35% | RISK 7%"
- Color-coded text: Hold / Cut / Raise

---

### 2. Market Confidence Signal

Display market liquidity/confidence alongside probabilities.

**Logic:**
```javascript
const confidence = volume_total > 100000 ? 'high' : 
                   volume_total > 25000  ? 'medium' : 'low';
```

**UI:** Dot indicator next to probability strip:
- High (>$100k): Green dot "HIGH CONFIDENCE"
- Medium ($25k–$100k): Yellow dot "MEDIUM"
- Low (<$25k): Grey dot "LOW LIQUIDITY — use caution"

**This prevents users from over-weighting thin markets.**

---

### 3. Polymarket Overlay on BoERatePathChart

Extend existing `BoERatePathChart.tsx` to overlay market consensus from Polymarket categorical markets.

**Example categorical market:**
"Will BoE base rate end 2026 above 5.0%?"
- Outcomes: [">5.5%", "5.0-5.5%", "4.5-5.0%", "4.0-4.5%", "<4.0%"]
- Prices: [0.05, 0.15, 0.30, 0.35, 0.15]

**Map to chart points:**
- Extract expected rate: sum(price_i × bucket_midpoint)
- Plot as dashed "Market Consensus" line
- Shaded uncertainty band from bucket spread

**Visual:** Dashed blue line with "Market Consensus" label in legend

---

### 4. Rate Alert / Threshold System

User-configurable alerts: *"Alert me when Cut probability > 60%"*

**Implementation:**
```javascript
// Stored in localStorage
const rateAlerts = [
  { id: '1', type: 'cut_prob', threshold: 0.60, meeting: 'May 2026', triggered: false },
  { id: '2', type: 'rate_fall', threshold: 4.0, horizon: '3m', triggered: false },
];
```

**Display:** In MarketPulse as a "Rate Alert" badge when triggered:
```
[RATE ALERT] Cut probability hit 62% — consider locking mortgage rate
```
Click to dismiss or adjust threshold.

**Management UI:** Settings cog on MarketConditionsBar → alert config modal

---

### 5. Prediction Accuracy Panel (Expandable)

Accessible from MPC Probability Matrix click-through.

**Content:**
```
Prediction Market Track Record
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: 2023-01 to 2026-04
Markets analyzed: 24 BoE decisions
Hit rate: 72% (17/24 correct)
Mean Brier Score: 0.19 (0 = perfect)

Calibration: Markets priced at 70%
hit 72% of the time. Well-calibrated.

[Source: Polymarket archive + BoE MPC records]
[View individual markets →]
```

**Source:** DAT-215 historical accuracy research

---

### 6. "Rate Outlook" Combined Panel

**Location:** AffordabilitySettings — new "Rate Outlook" accordion section

Combines SONIA forward curve (PO-008) + Polymarket probabilities (PO-009) side by side:

```
┌─ Rate Outlook ─────────────────────────────────────┐
│ SONIA Forward          │  Polymarket Probabilities │
│ ──────────────         │  ──────────────────────── │
│ May: 4.40% → 4.35%     │  Cut 35% / Hold 58% / ▲7%│
│ Q3:  4.35% → 4.25%     │  End-2026 rate: 4.0-4.5% │
│ Q4:  4.25% → 4.20%     │  Confidence: HIGH ●      │
│                          │                          │
│ [Show forward curve]    │  [Show markets]          │
└────────────────────────┴───────────────────────────┘
```

---

## POLYMARKET MARKETS TO TRACK

| Market URL | Question | Type | Decision Date |
|-----------|----------|------|---------------|
| bank-of-england-decision-in-april | BoE cut/hold/raise at Apr meeting | Binary/Categorical | Apr 2026 |
| bank-of-england-rate-hike-in-2026 | Rate hike in 2026 (any meeting) | Binary | Dec 2026 |
| [TBD by DAT-213] | BoE rate by end of 2026 | Categorical | Dec 2026 |
| [TBD by DAT-213] | UK recession in 2026 | Binary | Variable |

---

## DATA SCHEMA (macro_trend.json)

```json
{
  "prediction_markets": {
    "_provenance": {
      "source": "Polymarket.com + SONIA futures composite",
      "source_url": "https://polymarket.com",
      "methodology": "Polymarket CLOB prices = probabilities. SONIA futures converted to rate path. Composite weighted by market liquidity.",
      "last_refreshed": "2026-04-23"
    },
    "boe_decisions": [
      {
        "market_id": "bank-of-england-decision-in-may",
        "market_url": "https://polymarket.com/event/...",
        "question": "Will BoE cut rates at the May 7-8 2026 MPC meeting?",
        "source": "Polymarket",
        "outcomes": [
          { "label": "Cut", "price": 0.35, "implied_probability": 0.35 },
          { "label": "Hold", "price": 0.58, "implied_probability": 0.58 },
          { "label": "Raise", "price": 0.07, "implied_probability": 0.07 }
        ],
        "volume_24h": 45000,
        "volume_total": 180000,
        "liquidity": 55000,
        "event_date": "2026-05-07",
        "last_refreshed": "2026-04-23"
      }
    ],
    "boe_rate_2026": [
      {
        "market_id": "boe-rate-end-2026",
        "question": "Where will BoE base rate end 2026?",
        "outcomes": [
          { "label": ">5.5%", "price": 0.05 },
          { "label": "4.5-5.5%", "price": 0.45 },
          { "label": "3.5-4.5%", "price": 0.40 },
          { "label": "<3.5%", "price": 0.10 }
        ],
        "expected_rate": 4.10
      }
    ],
    "historical_accuracy": {
      "boe_mpc": {
        "hit_rate": 0.72,
        "brier_score": 0.19,
        "n_markets": 24,
        "period": "2023-01 to 2026-04",
        "calibration_note": "Markets priced at 70% hit 72% of the time. Well-calibrated."
      }
    },
    "last_updated": "2026-04-23T00:00:00Z"
  }
}
```

---

## INTEGRATION POINTS

| Component | Change |
|-----------|--------|
| `MarketConditionsBar.tsx` | Add `MPCProbabilityMatrix` sub-component |
| `SwapRateSignal.tsx` | Add compact probability strip below swap rates |
| `BoERatePathChart.tsx` | Add Polymarket categorical overlay + Market Consensus line |
| `MarketPulse.tsx` | Add Rate Alert badge when threshold triggered |
| `AffordabilitySettings.tsx` | Add Rate Outlook combined panel |
| `types/macro.ts` | Add `PredictionMarket`, `MarketOutcome`, `HistoricalAccuracy` interfaces |
| `useMacroData.ts` | Normalize `prediction_markets` section |

---

## REFRESH FREQUENCY

| Context | Frequency |
|---------|-----------|
| Daily during MPC decision week (2 weeks before) | Every 4 hours |
| Weekly during normal periods | Daily |
| On-demand | Button in UI |

**MPC Calendar (2026):**
- May 7-8
- Jun 11-12
- Aug 6-7
- Sep 17-18
- Nov 5-6
- Dec 17-18

---

## OUT OF SCOPE

- WebSocket live updates (Polymarket doesn't support; polling sufficient)
- Integration with betting exchanges (Betfair API requires credentials)
- Real-money trading guidance (propSearch is informational only)
- Metaculus integration beyond BoE markets (too broad)

---

## RELATIONSHIP TO PO-008

PO-008 and PO-009 are **complementary intelligence tracks:**

| Track | Data Source | Type |
|-------|-----------|------|
| PO-008: SONIA Rate Path | SONIA futures, financial markets | Financial engineering |
| PO-009: Prediction Markets | Polymarket, crowdsourced | Collective intelligence |

Both feed into the same **Rate Timing Advisor** on AffordabilitySettings.
Consider combining into one "Rate Outlook" section with two tabs: Financial | Crowdsourced.
