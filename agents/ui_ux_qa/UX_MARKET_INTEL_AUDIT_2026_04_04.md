# UX Market Intel Pages Audit Report
**Date:** 2026-04-04
**Auditor:** UI/UX QA
**Scope:** MarketPage (`/market`), RatesPage (`/rates`)

---

## Executive Summary

The Market Intel pages (MarketPage, RatesPage) have significant UX issues:
1. **Data Duplication** — Same data rendered in multiple components
2. **No Information Architecture** — No clear hero message or primary insight
3. **Information Overload** — 6+ dense components competing for attention
4. **Missing Data Storytelling** — Raw numbers without narrative context

### Tasks Created: 10 (UX-001 through UX-010)

| Priority | Task | Effort |
|----------|------|--------|
| Critical | UX-001: Consolidate Area Data | High |
| High | UX-002: Market Hero Section | Medium |
| High | UX-003: Affordability Narrative | Medium |
| Medium | UX-004: Consolidate Benchmark Calc | Medium |
| Medium | UX-005: Market Mode Summary | Low |
| Medium | UX-006: Drill-Down Capability | Medium |
| Low | UX-007: Dashboard Audit | High |
| Low | UX-008: Scenario Tooltips | Low |
| Medium | UX-009: Data Freshness Indicator | Medium |
| Low | UX-010: Tooltip Standardization | Low |

---

## CRITICAL ISSUE: Data Duplication

### 1. Area Performance Data (Most Severe)

**Problem:** The same area data is rendered in **FOUR** components:

| Component | Page | Metrics Shown |
|-----------|------|---------------|
| `MicroMarketVelocityMap` | MarketPage | Area, Heat, YoY, +12M, Delta |
| `AreaPerformanceTable` | MarketPage | Area, Heat, YoY, +12M, Delta |
| `LondonMicroMarketHeatMap` | MarketPage | Geographic view |
| `MarketPulse` | Dashboard | Area, Heat (top 5) |
| `MarketSituationRoom` | Archive | Area, Heat |
| `MicroMarketVelocityPills` | Various | Area, Heat |

**Impact:** Users see identical information 4+ times with no additional value.

**Root Cause:** Components built independently without cross-component coordination.

**UX-001 Fix:** Remove `AreaPerformanceTable` from MarketPage, keep `MicroMarketVelocityMap` (better visual design).

---

### 2. London Benchmark Calculation

**Problem:** The London HPI benchmark is calculated independently in 3 components:

```typescript
// AreaPerformanceTable.tsx:9
extractValue(data?.london_hpi?.annual_change ?? data?.london_hpi?.yoy_pct) ?? 1.2

// MicroMarketVelocityMap.tsx:38
extractValue(data?.london_hpi?.annual_change ?? 1.2) ?? 1.2

// LondonMicroMarketHeatMap.tsx:41
extractValue(data?.london_hpi?.annual_change ?? data?.london_hpi?.yoy_pct) ?? 1.2
```

**UX-004 Fix:** Create `getLondonBenchmark(data)` helper in `useMacroData.ts`.

---

### 3. HPI Data Fragmentation

| Component | Data Used | Location |
|-----------|-----------|----------|
| `HPIHistoryChart` | Historical HPI + scenarios | RatesPage |
| `CapitalAppreciationChart` | Scenario projections | Dashboard |
| `LondonPrimePremiumChart` | HPI-based premium | RatesPage |
| `AreaPerformanceTable` | Benchmark reference | Both pages |

---

### 4. Rate Data Fragmentation

| Component | Data | Location |
|-----------|------|----------|
| `SwapRateSignal` | Swap rates | RatesPage |
| `BoERatePathChart` | BoE scenarios | RatesPage |
| `MarketConditionsBar` | Rate signal | Header (all pages) |

---

## UX ISSUES

### Issue 1: No Hero Message

**Current State:**
- MarketPage: 6+ components of equal visual weight
- No clear entry point or primary insight
- Users must parse dense information to understand market state

**What Users Need:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🏆 MARKET VERDICT: BUYER'S MARKET — STRONG ENTRY WINDOW   │
│                                                             │
│ MOS: 7.2 months (+18% vs Q4) · Premium: -8% compression│
│ 5 of 6 target areas outperforming London benchmark         │
└─────────────────────────────────────────────────────────────┘
```

**UX-002 Fix:** Add Market Verdict hero section to MarketPage.

---

### Issue 2: No Data Storytelling on RatesPage

**Current State:**
- SwapRateSignal shows: GBP 2yr 4.25%, trend rising
- Users must manually calculate: "What does this mean for my mortgage?"

**What Users Need:**
```
📉 RATE DECLINE = £370/mo SAVINGS
£600K mortgage at peak (5.25%): £3,580/mo
£600K mortgage at current (4.25%): £3,210/mo
SAVINGS: £370/mo (£4,440/yr, £22,200 over 5yr fix)
```

**UX-003 Fix:** Add Affordability Impact card to RatesPage.

---

### Issue 3: Missing Data Freshness

**Problem:** No visible indicator of when data was last updated.

**Impact:** Users don't know if rates data is from today or last week.

**UX-009 Fix:** Add freshness indicator (LIVE/RECENT/STALE) to page header.

---

### Issue 4: No Drill-Down Capability

**Current State:**
- Users see "NW3 outperforming benchmark by +2.1%"
- No way to click through to NW3 properties

**UX-006 Fix:** Make area rows clickable, navigate to filtered properties.

---

## RECOMMENDATIONS

### Immediate (This Sprint)
1. **UX-001**: Remove AreaPerformanceTable duplication (Critical)
2. **UX-002**: Add Market Verdict hero (High impact)
3. **UX-003**: Add Affordability Impact narrative (High impact)

### Short-term (Next Sprint)
4. **UX-004**: Consolidate London Benchmark calculation
5. **UX-009**: Add data freshness indicator
6. **UX-006**: Add drill-down to properties

### Medium-term (Backlog)
7. **UX-007**: Dashboard duplication audit
8. **UX-008**: Scenario methodology tooltips
9. **UX-010**: Tooltip standardization
10. **UX-005**: Market mode context for area data

---

## Component Inventory

### MarketPage Components
1. `LondonMicroMarketHeatMap` - Geographic area view
2. `MicroMarketVelocityMap` - Ranked bar chart (KEEP)
3. `AreaPerformanceTable` - Table view (REMOVE - duplicate)
4. Section header for Area Performance

### RatesPage Components
1. `SwapRateSignal` - Swap rate display
2. `BoERatePathChart` - BoE rate scenarios
3. `HPIHistoryChart` - Historical HPI
4. `AreaPerformanceTable` - Area comparison
5. `LondonPrimePremiumChart` - Premium tracker

---

## Audit Files
- **Tasks:** `tasks/tasks.json` (UX-001 through UX-010)
- **This Report:** `agents/ui_ux_qa/UX_MARKET_INTEL_AUDIT_2026_04_04.md`
