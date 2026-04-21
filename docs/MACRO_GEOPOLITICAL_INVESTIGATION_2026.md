# Macro & Geopolitical Data Integration — Investigation Report
**Task:** PO-007  
**Date:** 2026-04-21  
**Author:** Product Owner  
**Status:** Complete — recommendation below

---

## 1. Trigger

Analysis of ps-2cdf2f33 (Gloucester Terrace, W2) surfaced the need for real-time macro context to inform negotiation strategy and property valuation. Currently analyst manually overlays macro conditions (BoE rates, tariff escalation, geopolitical risk) — ad hoc, non-reproducible, invisible to the user.

---

## 2. Scope of Investigation

1. **Data sources:** Which macro/geopolitical indicators are actionable for London prime property buyers?
2. **Dashboard placement:** New /macro route? Integrated into /market? Collapsible overlay on /property/:id?
3. **Visualisation:** How to make complex macro data accessible?
4. **Data pipeline:** Public APIs vs data vendor? Refresh frequency?
5. **Integration:** Can macro signals feed into appreciation_potential, realistic_price, neg_strategy, or remain advisory-only?

---

## 3. Actionable Data Sources

### 3.1 Central Bank & Monetary Policy (Available — no key needed)

| Source | Indicator | Update | API |
|--------|-----------|--------|-----|
| Bank of England | Base rate, OIS yield curve, MPC decisions | Event-driven | https://www.bankofengland.co.uk/boeapps/iia/ |
| BoE SPENCER | 5yr gilt yield (proxy for swap rates) | Daily | BoE API |
| ONS | CPI, GDP growth, unemployment rate | Monthly |
| HM Treasury | Government borrowing, fiscal stance | Quarterly |

**Already integrated:** BoE base rate, mortgage rates, swap rates in `/api/macro`. This covers the monetary policy dimension.

### 3.2 Currency & International Capital (Available — no key)

| Source | Indicator | Update | API |
|--------|-----------|--------|-----|
| ExchangeRate-API (free tier) | GBP/USD, GBP/EUR | Hourly | No key for limited calls |
| Bank of England | Effective exchange rate index (ERI) | Daily | BoE API |
| IMF World Economic Outlook | Global GDP forecasts | Quarterly |
| World Bank | UK productivity, FDI flows | Annual |

**Already integrated:** GBP/USD in `/api/macro` (via macro_trend.json). ERI not yet present.

### 3.3 Geopolitical Risk Indices (Partial — API key needed)

| Source | Indicator | Update | Cost |
|--------|-----------|--------|------|
| EPU Index (Baker-Dalimotte-Aurora) | Economic Policy Uncertainty — UK | Monthly | Free |
| VIX (CBOE) | US market fear gauge | Real-time | Free |
| GeoQuant /卡斯 | Geopolitical risk indices | Daily | Paid |
| ACLED / Peace研究所 | Conflict/geopolitical instability | Real-time | Free tier |

**Note:** EPU index for UK is available monthly from https://www.policyuncertainty.com/ — free, no key. Could be surfaced as a "Geopolitical Risk" indicator in the market dashboard.

### 3.4 Real Estate Specific (Available)

| Source | Indicator | Update | API |
|--------|-----------|--------|-----|
| Rightmove / Zoopla | Asking price trends, demand metrics | Weekly | No key |
| Land Registry | Transaction volumes, prices paid | Monthly |
| RICS | Surveyor sentiment (market balance) | Monthly | Free |
| Halifax / Nationwide | National HPI | Monthly | Free |

**Already integrated:** Land Registry HPI, transaction volumes in `/api/macro`.

### 3.5 Energy & Commodity (Partially relevant)

| Source | Indicator | Update | Cost |
|--------|-----------|--------|------|
| Brent Crude (ICE) | Energy cost pressure → inflation | Real-time | Free |
| OFGEM energy price cap | Household energy cost (affordability) | Quarterly | Free |

**Relevance:** Energy cost spikes → inflation → BoE response → mortgage rates. Worth a single "Energy Pressure" indicator on the market conditions strip, not a full data feed.

### 3.6 Summary: What We Can Already Do vs What Requires New Work

| Indicator | Already in `/api/macro`? | New source needed? |
|-----------|--------------------------|---------------------|
| BoE base rate | ✅ Yes | — |
| Mortgage rates (2yr/5yr) | ✅ Yes | — |
| GBP/USD | ✅ Yes | — |
| UK CPI | ✅ Yes | — |
| HPI (London + UK) | ✅ Yes | — |
| Transaction volumes | ✅ Yes | — |
| Negotiation delta | ✅ Yes | — |
| EPU Index (UK) | ❌ No | ✅ Free, monthly — scrape policyuncertainty.com |
| Brent crude | ❌ No | ✅ Free, real-time — public commodity API |
| VIX | ❌ No | ✅ Free, real-time — CBOE free endpoint |
| ERI (effective exchange rate) | ❌ No | ✅ Free, daily — BoE API |

---

## 4. Dashboard Placement Recommendation

### Recommended: /market page (existing), expandable "Macro Conditions" section

**Rationale:**
- The `/market` page already shows market conditions. Adding macro context here is a natural extension.
- Users are already on `/market` when thinking about market timing and acquisition strategy.
- Avoids a new route (navigation complexity) while making the information available.

**Alternative considered — /property/:id overlay:** Less appropriate. Macro context affects *market timing* and *multiple properties*, not individual property decisions. The negotiation strategy feeds into AcquisitionStrategy (already on PropertyDetail). A macro overlay on PropertyDetail would be noisy.

**Alternative considered — dedicated /macro route:** Appropriate only if the volume of macro content grows significantly (GeoQuant, EPU index, commodity feeds). MVP does not warrant a new route.

**Recommendation for MVP:** Expand the existing `MarketConditionsBar` or `MarketSituationRoom` on `/market` with a collapsible "Macro Context" sub-panel that shows:
1. BoE rate + rate path fan (already in data)
2. GBP/USD + effective exchange rate trend
3. EPU Index (UK geopolitical uncertainty — 0-100 scale)
4. Energy pressure indicator (Brent crude direction)
5. VIX (optional — US proxy, relevant for USD buyer activity)

---

## 5. Visualisation Approach

### Indicator Cards (not full charts)
Macro context should not be a dashboard of charts. The user needs *signals*, not raw data:

```
┌─────────────────────────────────────────────────────────┐
│  MACRO CONDITIONS                    [expanded] ▼      │
│                                                         │
│  BOE RATE   GBP/USD    EPU(UK)    BRENT    VIX        │
│   3.75%      1.34       42.1     $78.4    18.2       │
│   ▲ +0      ▼ -1.2%    Moderate   ▼-3%     Low        │
└─────────────────────────────────────────────────────────┘
```

- **Green/Amber/Red** labels for each indicator (direction + level)
- **Trend arrow** showing direction of change (24h or 1M)
- **Tooltip** with 30-char explanation of what the value means for property buyers
- **Colour coding:** geopolitical risk (EPU) in amber above 40, VIX above 25 in red

### Geopolitical Risk Indicator
EPU Index levels:
- < 30: Low (green)
- 30–60: Moderate (amber)
- > 60: High (red)

Rationale: UK EPU above 60 coincides with major policy uncertainty events (Brexit referendum: 150+, COVID shock: 80+, Trump tariffs 2025: ~70).

---

## 6. Data Pipeline

### MVP (no new infrastructure)
- **EPU Index:** Scrape policyuncertainty.com/ch_usi Monthly spreadsheet. Run monthly via `sync_data.js` — same pipeline as HPI refresh. No API key needed.
- **Brent crude:** Public commodity API (e.g. https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT — or just use Yahoo Finance CSV: https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD — or simpler: hardcode daily spot from a reliable public source). Actually: use `https://query1.finance.yahoo.com/v8/finance/chart/CL=F` for WTI crude (free, no key).
- **VIX:** `https://cdn.cboe.com/api/global/us_indices/options/vix.json` — free, no key, JSON.

**Refresh cadence:** Monthly for EPU. Daily for Brent/VIX (or weekly — these move slowly enough that daily is unnecessary for a property buyer dashboard).

### Production (if EPU/VIX prove valuable)
Consider Bloomberg API or Eikon (Refinitiv) for professional-grade geopolitical risk data. Cost: £1,500–5,000/month. Not warranted for MVP.

---

## 7. Integration with Property Analysis

### Option A — Advisory Only (lowest complexity)
Macro signals are displayed as context only. They do not influence appreciation_potential, realistic_price, or neg_strategy. The user makes the connection manually.

**Pros:** No model changes, no risk of stale signals overriding fresh data.  
**Cons:** Analyst manually does this; not reproducible for all properties.

### Option B — Soft Influence on Appreciation Model (medium complexity)
Add a `macro_adjustment_pct` parameter to the appreciation model derived from EPU + rate path scenario. When EPU > 60, subtract 0.5% from base case annual return. When VIX > 25, subtract 0.3%.

**Pros:** Systematic, applied to all properties, reflects market conditions.  
**Cons:** Adds complexity to the model. EPU/Brent/VIX are leading indicators but their causal relationship to London property prices is uncertain.

### Option C — neg_strategy context tags (lowest complexity, highest value)
Add macro context tags to the acquisition strategy display on PropertyDetail. For example:
- "BoE held — rate-cut deferred" (from latest analyst statement)
- "EPU elevated — buyer's market signal"
- "GBP weak — USD buyer discount reduced"

These are sourced from the latest `analyst_statements[0]` tag context, not from live feeds. Feeds provide the raw numbers; analyst statements provide the synthesis.

**Recommendation:** Start with Option C. The analyst statements (PO-003) already do the synthesis work. The macro indicator cards provide the raw numbers. Option B (soft model influence) can be a separate scoping task (FE-XXX) if the user finds the advisory approach insufficient.

---

## 8. MVP Implementation Roadmap

### Phase 1 — Immediate (2 days, FE work)
1. Add macro indicator strip to MarketPage (above AnalystStatementPanel or below MarketVerdict)
   - BoE rate, GBP/USD, EPU(UK), Brent crude, VIX
   - Each as a compact card with current value + trend arrow + colour
   - "Expand" toggle to show 30-day mini sparkline
2. Data Engineer: add Brent crude and VIX to macro_trend.json (or hardcode in frontend)
3. Data Engineer: scrape EPU index monthly (scripts/fetch_epu_index.js)

### Phase 2 — Short term (1-2 weeks, separate task)
4. EPU/B Brent/VIX in sync_data.js pipeline
5. Add macro context tags to PropertyDetail AcquisitionStrategy (sourced from analyst_statements)

### Phase 3 — Future (out of scope for MVP)
6. Soft influence on appreciation model (FE-XXX)
7. Dedicated /macro route if data volume justifies it

---

## 9. Decision

**Recommendation: Implement Phase 1 + Phase 2 (MVP)**

Rationale:
- All data sources are free and public. No API cost.
- Visualisation is low-complexity indicator cards, not full charts.
- Integration with property analysis (Option C) leverages the PO-003 AnalystStatement panel without new model complexity.
- The gap identified in ps-2cdf2f33 analysis is exactly this: the user cannot see at a glance that macro conditions have shifted (rate hold, tariff shock) without reading a paragraph. Indicator cards solve this.

**Not recommended:** Dedicated /macro route (premature). Bloomberg/Eikon data feeds (cost not justified). Soft model influence (adds complexity without clear ROI until Phase 1 is validated).

**Out of scope for this investigation:** Real-time streaming data, NLP-based news sentiment analysis, AI-generated market summaries.

---

## 10. Action Items

| ID | Task | Responsible | Priority |
|----|------|-------------|----------|
| FE-278 | Build MacroConditionsStrip component for MarketPage — EPU, Brent, VIX cards | Frontend Engineer | Medium |
| DE-240 | Add EPU index scraper to scripts/fetch_epu_index.js (monthly pipeline) | Data Engineer | Medium |
| DE-241 | Add Brent/VIX to macro_trend.json via sync_data.js | Data Engineer | Low |
| PO-008 | Scope: integrate macro context tags into PropertyDetail AcquisitionStrategy (sourced from latest analyst_statement) | Product Owner | Low |

*This investigation document is the deliverable for PO-007. No implementation work beyond documentation was performed.*
