# Market Status Classification Protocol
*Reference from: agents/data_analyst/README.md — section "Market Status Classification (DAT-173)"*

Effective: 2026-04-02

## Valid Values (per schema CHECK constraint)

| Value | Meaning |
|-------|---------|
| `active` | Property is actively listed for sale in the acquisition pipeline |
| `under_offer` | Offer accepted, sale not yet completed |
| `sold_stc` | Sold subject to contract |
| `sold_completed` | Sale has completed (Land Registry confirmed) |
| `withdrawn` | Listing removed from market — no longer available |
| `unknown` | Market status cannot be determined from available data |

## Classification Rules

All newly imported leads enter as `market_status = 'active'` (enforced by sync pipeline).

For archived records, apply the following taxonomy:

| `archive_reason` pattern | `market_status` |
|------------------------|-----------------|
| `Still Active — Rightmove RES_BUY*` | `active` |
| `Off-Market — Let Agreed` | `withdrawn` |
| `Off-Market — Listing Removed` | `withdrawn` |
| `Off-Market — New Build Sold*` | `withdrawn` |
| `Off-Market — Reclassified Overseas` | `withdrawn` |
| `Off-Market — Student Let` | `withdrawn` |
| `Off-Market — Wrong Channel` | `withdrawn` |
| `Cannot Verify — Discard*` | `withdrawn` |
| `Pre-enrichment Duplicate*` | `unknown` |
| `Duplicate — superseded*` | `unknown` |
| `Data Discrepancy*` | `unknown` |

Asterisk (*) = wildcard suffix permitted.

## Reclassification Triggers

If new data arrives (e.g., a scraper re-sights a withdrawn property):
1. Update `market_status = 'active'` and clear `analyst_flag`
2. Update `list_price`, `realistic_price`, `dom` from fresh scrape
3. Re-run Alpha Score if spatial data changed
4. Clear `archive_reason`
5. Do NOT touch `archived` or `pipeline_status` — user acts on these via the frontend

## Three Independent Axes

| Axis | Column | Owner | Purpose |
|------|--------|-------|---------|
| `pipeline_status` | User (frontend) | `discovered` → `shortlisted` → `vetted` → `archived` |
| `analyst_flag` | Analyst | `off_market`, `needs_enrichment`, `fails_criteria`, `unverifiable`, `duplicate` |
| `market_status` | Analyst | `active`, `under_offer`, `sold_stc`, `sold_completed`, `withdrawn`, `unknown` |

**The analyst NEVER sets `pipeline_status` or `archived`.** Archiving is a pipeline action that belongs exclusively to the user.

**`fails_criteria` is NOT a `market_status` value.** All manually imported or user-submitted leads enter as `market_status = 'active'`, regardless of acquisition zone or criteria fit.
