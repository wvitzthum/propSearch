# Property State Model: Two Independent Axes
*Reference from: agents/data_analyst/README.md — sections "Record Flagging & No-Deletion Policy" and "Property State Model"*

## Two Independent State Axes

Every property has two independent state axes that must not be conflated:

| Axis | Column | Owner | Values |
|------|--------|-------|--------|
| **User Pipeline** | `pipeline_status` | User (frontend) | `discovered` → `shortlisted` → `vetted` → `archived` |
| **Market Reality** | `market_status` | Analyst | `active` · `under_offer` · `sold_stc` · `sold_completed` · `withdrawn` · `unknown` |

## What Each State Means

**pipeline_status (User's decision — set by user in UI):**
- `discovered` — New in the pipeline, not yet reviewed
- `shortlisted` — User is interested, actively reviewing
- `vetted` — User has vetted this property seriously
- `archived` — User is not interested / deprioritised

**market_status (Market reality — set by analyst on research):**
- `active` — Property is listed on Rightmove/Zoopla/agent site
- `under_offer` — Offer accepted, not yet completed
- `sold_stc` — Sold subject to contract
- `sold_completed` — Land Registry confirmed
- `withdrawn` — Removed from market (agent/portal delisted)
- `unknown` — Cannot determine market status

## Analyst Rules for Flagging

| Situation | Analyst Action |
|-----------|---------------|
| **Incomplete / shallow data** | Set `analyst_flag = 'needs_enrichment'` and enrich what you can. Do NOT archive. |
| **Off-market / listing withdrawn** | Set `analyst_flag = 'off_market'` with a note in `analyst_notes`. Do NOT archive. |
| **Fails acquisition criteria** | Set `analyst_flag = 'fails_criteria'` with the reason in `analyst_notes`. Do NOT archive. |
| **Cannot verify** | Set `analyst_flag = 'unverifiable'` and document the reason in `analyst_notes`. Do NOT archive. |
| **Duplicate** | Flag the weaker record with `analyst_flag = 'duplicate'`. Do NOT archive. |

## Critical Rule: Never Set pipeline_status or archived

**Do NOT set `archived = 1` or `pipeline_status = 'archived'` under any circumstance.** Archiving is a pipeline action that belongs exclusively to the user. If you believe a record should be archived, raise it as a recommendation in `analyst_notes` and flag it — the user acts on it via the frontend.

## Analyst Flag Values

| Value | Meaning |
|-------|---------|
| `off_market` | Listing confirmed removed / delisted |
| `needs_enrichment` | Incomplete data — analyst should fill what they can |
| `fails_criteria` | Does not meet acquisition criteria |
| `unverifiable` | Cannot determine status from available data |
| `duplicate` | Duplicated by a richer record |
| `pre_enrichment_duplicate` | Pre-enrichment check flagged duplicate |

## The Three-Axis Model

| `pipeline_status` | `market_status` | Meaning |
|---|---|---|
| discovered/shortlisted/vetted | active | Active pipeline. Shown in main Properties UI. |
| archived | active | Archived by user — property was valid but not selected. User can reactivate. |
| archived | withdrawn | Off-market. User archived after discovery. Can be rechecked. |
| archived | unknown | Unable to determine market state. User reviews and reclassifies. |

The analyst sets `analyst_flag` and `market_status`. The user sets `pipeline_status` and `archived`. These are independent — the frontend shows both axes so the user can make an informed decision.
