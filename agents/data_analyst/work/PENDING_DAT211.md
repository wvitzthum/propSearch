# DAT-211 Hand-Off: Macro Rate Data Refresh

## Task ID
**DAT-211** (High Priority)

## Title
Refresh mortgage rate data ahead of May 7 MPC meeting — BoE base rate, 2yr/5yr swap, mortgage history through March 2026

## Status
**Todo** — assigned to Data Analyst

## Priority Rationale
MPC meeting May 7-8 is approaching fast. All rate data in macro_trend.json is stale.

## Current Data State

| Field | Last Refreshed | Current Value |
|-------|---------------|---------------|
| boe_base_rate | 2026-03-20 | 4.50% |
| swap_rates (current) | 2026-03-30 | 2yr=3.92%, 5yr=4.05% (noted as "estimated") |
| mortgage_rates | 2026-03-20 | various |
| mortgage_history | ends 2026-02 | — |
| _last_full_refresh | 2026-04-04 | — |

## Required Updates

### 1. boe_base_rate
- Source: https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate
- Pull latest official Bank Rate
- Update `boe_base_rate.value` and `boe_base_rate.last_refreshed`

### 2. boe_rate_consensus (forward path)
- Refresh scenarios with latest SONIA futures pricing for Q3 2026-Q2 2027
- Source: https://www.lme.com/ or broker feeds

### 3. swap_rates
- Source: https://www.theice.com/marketdata/reports/143 (ICE Swap Rate)
- Add April 2026 entry to `swap_rates.history`
- If live data unavailable, document estimate methodology in provenance

### 4. economic_indicators.mortgage_rates
- Source: https://www.bankofengland.co.uk/boeapps/database/
- Refresh all LTV tier rates (90_ltv_2yr_fixed, 90_ltv_5yr_fixed, etc.)

### 5. mortgage_history
- Add 2026-03 row with boe_rate and all mortgage_2yr_*/mortgage_5yr_* fields
- Also add 2026-04 if you can get April data before May MPC

### 6. Metadata updates
- `_last_full_refresh` → today's date
- `_meta.last_refreshed` → today
- `_meta.days_since_refresh` → 0
- All field-level `last_refreshed` timestamps → today

## File to Edit
`/workspaces/propSearch/frontend/public/data/macro_trend.json`

Also check if there's a separate `data/macro_trend.json` that needs syncing.

## On Completion
1. Mark DAT-211 as Done: `jq '.tasks[] | select(.id=="DAT-211") | .status = "Done"' tasks/tasks.json` then save
2. Run `make tasks-regen`
3. Create backup: `mkdir -p data/backups/snapshot_$(date +%Y-%m-%d_%H%M%S) && cp frontend/public/data/macro_trend.json data/backups/snapshot_$(date +%Y-%m-%d_%H%M%S)/`

## After This — DAT-212
Once DAT-211 is done, work on **DAT-212** (Source SONIA/BoE forward curve data) — this is the foundation for PO-008 (Bank Rate Short-Term Forecasting feature).

## Notes
- Swap rates field noted as "Requires live data feed - values estimated" — try to get real ICE data
- Deadline: have data refreshed by May 6 at latest, ahead of May 7-8 MPC meeting
