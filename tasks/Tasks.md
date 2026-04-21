# propSearch — Task Board

Auto-generated — do not edit manually.


## Frontend


### 📋 Todo

| ID | Priority | Effort | Title | Dependencies |
|---|---|---|---|---|
| FE-250 | Low | Small | FE: Clean up TS6133 unused variable/import warnings — 23 remaining across 7 files |  |
| PED-001 | Critical | Small | FE: Add min=0 to all number inputs in PropertyEdit — negative values corrupt data |  |
| PED-003 | High | Small | FE: Add step attributes to price and number inputs in PropertyEdit — prevent sub-unit accidental values |  |
| PED-006 | Medium | Small | FE: Replace window.confirm in PropertyEdit cancel with inline discard confirmation |  |
| SORT-001 | High | Small | FE: Fix PropertyTable user_priority sort — ranks appear out of order, direction not synced |  |

### ✅ Done

| ID | Priority | Effort | Title | Dependencies |
|---|---|---|---|---|
| PPI-001 | Critical | Small | FE: Add x-axis date labels to PurchasingPowerChart — chart is unreadable without time reference |  |
| PPI-002 | High | Small | FE: Surface mortgage rate annotations on PurchasingPowerChart — rate drives purchasing power but is invisible | PPI-001 |
| PPI-003 | High | Trivial | FE: Fix number formatting in PurchasingPowerChart — use toLocaleString('en-GB') for UK amounts |  |
| PPI-004 | Medium | Small | FE: Add starting-point reference line to PurchasingPowerChart — baseline context missing | PPI-001 |
| PPI-005 | Medium | Trivial | FE: Add mortgage product type to PurchasingPowerChart subtitle — 5yr fixed must be visible |  |
| PPI-006 | Medium | Trivial | FE: Add date range to PurchasingPowerChart header — time scope is invisible | PPI-001 |
| PPI-007 | Medium | Trivial | FE: Increase PurchasingPowerChart grid line opacity for better scanability |  |
| PPI-008 | High | Small | FE: Fix HPIHistoryChart x-axis — data only fills 63% of chart width due to inflated xScale domain |  |
| VISX-024 | High | Medium | FE: Migrate LondonPrimePremiumChart to full visx pattern — replace raw SVG with ParentSize/Group/GridRows |  |
| VISX-029 | High | Medium | FE: Remove viewBox from HPIHistoryChart — migrate to pure visx ParentSize pattern | PPI-008 |
| VISX-030 | High | Medium | FE: Remove viewBox from CapitalAppreciationChart — migrate to pure visx ParentSize pattern |  |
| VISX-031 | Medium | Small | FE: Remove viewBox from SparklineChart — migrate to pure visx ParentSize pattern |  |
| VISX-032 | Medium | Small | FE: Remove viewBox from SwapRateSignal — migrate to pure visx ParentSize pattern |  |
| VISX-033 | High | Medium | FE: Migrate FloorplanViewer.tsx from raw SVG to visx — no visx usage at all |  |
| VISX-034 | High | Large | FE: Migrate MarketSituationRoom.tsx from raw SVG to visx — complex multi-panel chart |  |

---
*Generated from tasks/tasks.json*
