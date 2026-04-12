# UI/UX Audit Report: 2026-03-09 (Data Residue & UI Stability)

## Audit Objective
Verify dashboard stability and data fidelity following the SQLite migration and system refactor.

## 1. Findings: UNRESOLVED DATA POLLUTION
Empirical audit of the new SQLite instance (`node scripts/audit_properties.js`) reveals that the "Data Pollution" identified on 2026-03-08 has persisted through the database migration.

- **Total Asset Count:** 52
- **Shallow Leads:** 32 (61% of database)
- **Deficiencies:** Missing `sqft`, `epc`, and proper `alpha_score` components.
- **Impact:** These assets appear as "broken" nodes in the UI, with missing metrics and potential runtime errors.

## 2. Critical UI Stability Risks
The frontend TypeScript interfaces (`Property`) define several fields as mandatory, but the database is returning `NULL` for shallow leads.

| Component | Risk | Potential Failure |
| --- | --- | --- |
| `AlphaBadge.tsx` | **CRITICAL** | `score.toFixed(1)` will throw an exception if `score` is null. |
| `PropertyTable.tsx` | **HIGH** | `price_per_sqm.toLocaleString()` will throw if null. |
| `MortgageTracker.tsx` | **MEDIUM** | Calculations relying on `mortgage_history` averages will be skewed if data is incomplete. |

## 3. Recommended Fixes & Tasks

| Task ID | Priority | Summary |
| --- | --- | --- |
| FE-075 | Critical | UI Resilience: Implement null-safety in `AlphaBadge`, `PropertyTable`, and `PreviewDrawer` to prevent crashes on shallow data. |
| DAT-075 | EMERGENCY | Data Purge: Remove all assets from SQLite `properties` table that lack `sqft` or `epc` to restore institutional fidelity. |
| FE-076 | Medium | UI: Add "Data Quality" indicator to assets in the Table view (e.g., a "Shallow" or "Needs Enrichment" tag). |

## Audit Status
**SYSTEM UNSTABLE.** While the infrastructure is refactored, the underlying data remains corrupted, posing a direct crash risk to the UI.
