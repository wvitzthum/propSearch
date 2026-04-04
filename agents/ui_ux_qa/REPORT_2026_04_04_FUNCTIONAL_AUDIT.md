# UI/UX QA Functional Audit Report
**Date:** 2026-04-04
**Auditor:** UI/UX QA
**Scope:** Full-stack functional audit — data integrity, UI rendering, metric accuracy, and requirements compliance

---

## Executive Summary

| Category | Finding | Severity | Owner |
|---|---|---|---|
| Data Integrity | 10 active properties have `market_status='unknown'` — inbox sync bug | High | Data Analyst |
| Data Freshness | SDLT countdown stale (2026-04-01, 3 days ago) | High | Data Analyst |
| Data Integrity | 36 archived properties marked `market_status='unknown'` (pre-enrichment duplicates) | Low | Data Analyst |
| UI/Responsive | MarketConditionsBar overflow persists after QA-187 | Medium | Frontend Engineer |
| Test Coverage | Responsive tests skipped — QA-187 not verified in CI | Medium | QA |

**Test Suite Status:** 142 tests pass, 3 skipped, 0 failures ✅

---

## 1. Data Integrity Audit

### 1.1 Property Database (SQLite) Summary

```
Total properties:     101
Active (archived=0):  29
Archived (archived=1): 72
Null/zero price:       3 (all correctly archived=1, market_status='withdrawn')
Null alpha_score:      31 (all correctly archived=1 — archived records not scored)
```

**✅ PASS:** No active properties are missing prices or alpha scores.

### 1.2 market_status Distribution

```
active:     24  ← Correct for active, enriched properties
unknown:    36  ← 10 active + 26 archived pre-enrichment duplicates
withdrawn:  31  ← Correct
discovered: 10  ← Archived only (archived=1, pipeline_status='discovered')
null:        0  ← No null values
```

### 1.3 CRITICAL: 10 Active Properties with market_status='unknown' (DAT-189)

**Issue:** 10 properties approved from the Inbox (batch `man-0404-*`) have `market_status='unknown'` instead of `'active'`.

**Root Cause:** The inbox-to-master sync pipeline sets `market_status` from the raw scrape data without defaulting to `'active'` for promoted leads. Since these properties were approved without enrichment, `market_status` was never populated.

**Affected properties:**
- `man-0404-9ca80037` — Caledonian Road, Hillmarton Conservation Area, N7 (£525K, α=6.5)
- `man-0404-f5a85913` — Caledonian Road (Pub Conversion), Islington, N7 (£500K, α=6.5)
- `man-0404-f3ff9a51` — Downside Crescent, Belsize Park, NW3 (£750K, α=6.8)
- `man-0404-c031987d` — 1 Albert Road, Queen's Park, NW6 (£675K, α=7.2)
- `man-0404-55ce09b2` — Cavendish Road, Kilburn, NW6 (£650K, α=5.2)
- `man-0404-82ad5dba` — Redcliffe Gardens, Earl's Court, SW10 (£650K, α=8.0)
- `man-0404-e26af162` — Alexandra Mansions, 333 Kings Road, SW3 (£625K, α=8.8)
- `man-0404-1d3c01c4` — Kings Road (Renovated), Chelsea, SW3 (£600K, α=8.8)
- `man-0404-adc64104` — Maitland Court, Lancaster Terrace, W2 (£750K, α=5.0)
- `man-0404-069a1729` — Edgware Road, Little Venice, W2 (£500K, α=6.5)

**Per Requirement 23:** "Populate `market_status='active'` for all active (non-archived) records."

**Fix:** Run UPDATE on SQLite: `UPDATE properties SET market_status='active' WHERE archived=0 AND market_status IS NULL OR market_status='unknown';`

---

## 2. Data Freshness Audit

### 2.1 macro_trend.json

```
Last full refresh: 2026-04-01
Market pulse last_refreshed: 2026-04-01 (3 days ago)
SDLT countdown: 2026-04-01 ⚠️ EXPIRED
MPC next meeting: 2026-05-07/08 (34 days away — OK)
```

### 2.2 CRITICAL: SDLT Countdown Stale (DAT-189)

**Issue:** The SDLT countdown in `macro_trend.json` shows `2026-04-01` — this date has already passed (today is 2026-04-04). The `MarketConditionsBar` component renders this as a badge with an `AlertCircle` icon.

**Evidence from macro_trend.json:**
```json
"sdlt_countdown": {
  "value": "2026-04-01",
  "last_refreshed": "2026-04-01",
  ...
}
```

**Impact:** The SDLT tier milestone specified in DAT-150 has been hit. The Data Analyst must:
1. Update `macro_trend.json` with the new SDLT tier thresholds effective from 2026-04-01
2. Update the `sdlt_countdown` to the next milestone date
3. Recalculate LTV Match Scores for all properties under the new regime

**Per DAT-150 (Done):** "Data: Add SDLT tier thresholds to `macro_trend.json` and calculate LTV Match Score for all properties based on current mortgage rates."

**Verdict:** The task was marked Done but the milestone date has passed without a refresh. Requires immediate Data Analyst attention.

---

## 3. UI / Responsive Layout Audit

### 3.1 MarketConditionsBar Overflow (FE-215)

**Status:** QA-187 is marked Done, but overflow persists.

**Evidence (from ResponsiveLayoutAudit.spec.ts diagnostic test output):**
```
[mobile] MarketConditionsBar overflow: 742px  (bar width=1085px, viewport=375px)
[tablet] MarketConditionsBar overflow: 349px  (bar width=1085px, viewport=768px)
[laptop] MarketConditionsBar overflow: 93px   (bar width=1085px, viewport=1280px)
Desktop: sidebar=256px, overflow=0px ✓
```

**Root Cause:** The MarketConditionsBar uses `overflow-x-auto` which allows horizontal scroll but the bar is always 1085px wide regardless of container. The MarketConditionsBar is a flex row with 7 metric groups separated by dividers — it cannot wrap without breaking the institutional layout.

**Current behavior:**
- Desktop (1920px): No overflow ✅
- Laptop (1280px): 93px overflow — marginal, `overflow-x-auto` handles it
- Tablet (768px): 349px overflow — `overflow-x-auto` handles but jarring UX
- Mobile (375px): 742px overflow — scrollbar is almost as wide as the screen

**Fix Options:**
1. **Compact mode on mobile/tablet:** Show only 3-4 key metrics (Market Mode, Buyer Favour, MPC) instead of all 7
2. **Wrap layout:** Allow metrics to stack at narrow widths
3. **Responsive threshold:** Trigger `compact=true` prop on MarketConditionsBar below 1024px

**Recommendation:** Option 3 (FE-215) — add responsive threshold in the parent component (`Dashboard.tsx`) to pass `compact={true}` to MarketConditionsBar when viewport < 1024px.

### 3.2 Responsive Tests Skipped in CI

**Issue:** The 3 responsive design tests in `smoke.spec.ts` are marked with `test.skip()` and always skipped:
- `Smoke Tests - All Pages › Responsive Design › dashboard works on mobile`
- `Smoke Tests - All Pages › Responsive Design › dashboard works on tablet`
- `Smoke Tests - All Pages › Responsive Design › dashboard works on desktop`

**Verdict:** QA-187 was closed with the ResponsiveLayoutAudit.spec.ts file as the test suite, but the smoke.spec.ts responsive tests were left skipped. This means CI passes but doesn't catch responsive regressions. Not a blocker but should be noted.

---

## 4. Metric Clarity Audit (Re-verification)

### 4.1 MarketConditionsBar Tooltips (QA-186 Re-check)

All 7 metrics in MarketConditionsBar now have institutional tooltips ✅:

| Metric | Tooltip Content | Methodology | Status |
|---|---|---|---|
| Market Mode (MOS) | ✅ | ✅ | PASS |
| Negotiation Room | ✅ | ✅ | PASS |
| Rate Signal | ✅ | ✅ | PASS |
| Seasonal Window | ✅ | ✅ | PASS |
| Buyer Favour Score | ✅ | ✅ | PASS |
| MPC Date | ✅ | ✅ | PASS |
| SDLT Badge | ✅ | ✅ | PASS |

**QA-186: VERIFIED ✅**

### 4.2 Tooltip Expansion Disclosure (QA-186 Feature)

The MarketConditionsBar now includes a toggle-able "Methodology" disclosure section (lines 186-214) that expands to show all 7 metric formulas. This is excellent institutional UX — **exceeds** the original QA-186 requirement.

---

## 5. Aesthetic Audit (Bloomberg/Linear)

### 5.1 MarketConditionsBar Design

- **Font weights:** 8-10px, font-black for key metrics ✅
- **Color coding:** Market mode (green/amber/red), Rate signal (red/green/grey) ✅
- **Dividers:** 1px `bg-linear-border` separators ✅
- **Compact mode:** Uses `shrink-0` to prevent wrapping ✅
- **Stale indicator:** SDLT countdown shows `AlertCircle` amber icon ⚠️ (badge shows expired date)

### 5.2 Bloomberg Terminal Aesthetic

The MarketConditionsBar follows the Bloomberg institutional pattern:
- Monospaced font for numeric values (`font-mono`)
- Uppercase labels with wide tracking (`uppercase tracking-widest`)
- Pulse animation on market mode indicator ✅
- No decorative elements — pure data density ✅

---

## 6. Functional Testing (Smoke)

| Page | Load | Console Errors |
|---|---|---|
| `/dashboard` | ✅ | Filtered (API errors when backend off) |
| `/properties` | ✅ | Filtered |
| `/map` | ✅ | Filtered |
| `/inbox` | ✅ | Filtered |
| `/comparison` | ✅ | Filtered |
| `/affordability` | ✅ | Filtered |
| `/rates` | ✅ | Filtered |
| `/market` | ✅ | Filtered |
| Navigation | ✅ | — |

**Full suite:** 142 passed, 3 skipped (responsive design — pending FE-215)

---

## 7. Requirements Compliance Check

| Requirement | Status | Notes |
|---|---|---|
| R1: Alpha Score | ✅ Active | 29 properties scored (range: 5.0–9.4) |
| R2: Data Authenticity | ✅ | No mock/placeholder images found |
| R2: floor_level | ⚠️ Check | Need to verify in property schema |
| R4: Multi-Source Linkage | ✅ | Direct agent links prioritized |
| R8: Metric Tooltips | ✅ | All dashboard metrics have tooltips (QA-186 Done) |
| R11: Pipeline Persistence | ✅ | Pipeline status persisted in SQLite |
| R21: 5-Page Structure | ✅ | All 5 pages implemented |
| R22: Archived Visibility | ✅ | Archive review page working |
| R23: market_status taxonomy | ❌ FAIL | 10 active properties = 'unknown' (see §1.3) |
| R24: Data Freshness | ❌ FAIL | SDLT countdown stale (see §2.2) |

---

## New Tasks Logged

| ID | Priority | Title | Owner |
|---|---|---|---|
| DAT-189 | High | Data: Fix market_status='unknown' for 10 active properties. Update to 'active'. | Data Analyst |
| DAT-189b | High | Data: Refresh SDLT countdown in macro_trend.json — Q2 2026 milestone has passed. | Data Analyst |
| FE-215 | Medium | UI: MarketConditionsBar overflow on tablet/mobile — add compact mode at <1024px. | Frontend Engineer |

---

## Recommendations

1. **DA (DAT-189):** Run the SQLite UPDATE immediately to fix 10 properties with market_status='unknown'. Verify the sync pipeline sets market_status='active' for all new inbox promotions going forward.

2. **DA (DAT-189b):** Refresh macro_trend.json with the post-2026-04-01 SDLT tier data. The milestone has passed and the countdown is showing an expired date.

3. **FE (FE-215):** Add `compact` prop to MarketConditionsBar at tablet/mobile widths. The existing `compact` mode (already implemented) shows only 3 metrics and would solve the overflow.

4. **QA:** Re-open QA-187 in the task system and mark it as partially done — the sidebar fix is complete but the MarketConditionsBar overflow remains.

---

## Sign-Off

**Auditor:** UI/UX QA Agent
**Date:** 2026-04-04
**Test Suite:** 142 passed, 3 skipped
**Critical Issues:** 2 (DAT-189, DAT-189b)
**High Issues:** 1 (FE-215)
**Low Issues:** 1 (36 archived unknown — pre-enrichment duplicates, informational)
