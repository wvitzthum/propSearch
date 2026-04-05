# Duplicate Detection & Enrichment Protocol
*Reference from: agents/data_analyst/README.md — section "Duplicate Detection & Existing Record Enrichment"*

MANDATORY — execute for every new lead before creating a new record.

## Step 1 — Duplicate Check

For every new lead, query the SQLite database by address + area or by matching portal URL:
```bash
sqlite3 data/propSearch.db "SELECT id, address, area, links, gallery, image_url, floorplan_url, alpha_score, analyst_notes, archived FROM properties WHERE address LIKE '%<address_fragment>%' AND area LIKE '%<area>%';"
```
If a match is found, this is a **duplicate lead** — proceed to Step 2. If no match, treat as a net-new record.

## Step 2 — Link Enrichment (Priority)

Extract any `links` from the new lead that are **not already present** in the existing record:
- Estate agent direct links (Savills, Knight Frank, Dexters, Hamptons) — these are higher-fidelity than portal links and extend listing longevity
- Alternative portal URLs (Rightmove vs Zoopla)
- Append new links to the existing `links` array. Do NOT replace — merge only new entries.

## Step 3 — Visual Enrichment (If Better)

If the new lead contains `gallery`, `floorplan_url`, or `streetview_url` that the existing record lacks or that are higher-resolution:
- Update `image_url` if the new image is ≥1024px and the existing is lower-resolution
- Add missing `floorplan_url` entries
- Append missing gallery images (deduplicate by URL)

## Step 4 — Price and Status Re-verification

If the existing record has an `analyst_flag` set (e.g., `off_market`, `needs_enrichment`) and the new lead shows the property is still actively listed:
- Clear `analyst_flag` (set to null) and update `market_status = 'active'`
- Update `list_price`, `realistic_price`, `dom`, and `price_reduction_*` fields
- Re-run Alpha Score calculation (see Alpha Score protocol)
- Do NOT touch `archived` or `pipeline_status` — those are the user's pipeline decisions, not the analyst's

## Step 5 — Analyst Notes Preservation (Non-Negotiable)

**The following fields are NEVER overwritten by incoming leads:**
- `alpha_score` (analyst-calculated)
- `analyst_notes` (qualitative judgment)
- `appreciation_potential` (analyst-calculated)
- `archive_reason` (unless Step 4 explicitly reactivates the record)
- `nearest_tube_distance`, `park_proximity`, `commute_paternoster`, `commute_canada_square` (only updated if the new lead contains a verified, more precise value)

## Step 6 — Flag Low-Value Duplicates

If the new lead is a duplicate with no new links, no improved visuals, and no price/status change:
```bash
sqlite3 data/propSearch.db "UPDATE properties SET analyst_flag = 'duplicate', analyst_notes = analyst_notes || ' | [Duplicate protocol: no new data, superseded by newer scrape]' WHERE id = '<existing_id>';"
```
Flagging (not archiving) keeps the database clean and signals the record has been reviewed against a fresh scrape. Archiving is the user's decision — the analyst flags, the user acts.
