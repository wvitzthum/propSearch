# Lead Import Protocol
*Reference from: agents/data_analyst/README.md — section "Lead Import Policy"*

## Core Rule: Always Import as Active. User Decides.

**All leads are imported into `properties` with `archived = 0` (active).** No record is ever pre-archived. The user owns the decision to keep or remove a property from the active pipeline.

## Step-by-Step Import Workflow

### Step 1 — Write to inbox as JSON (always, every time)
- When leads are received (portal scrape, user paste, agent email, external import), write them to `data/inbox/new_leads_YYYYMMDD_batch.json` as a JSON array immediately.
- Do NOT skip this step. The inbox is the system of record before processing.

### Step 2 — Import to DB with `archived = 0`
- Insert every lead into `properties` with `archived = 0`.
- Include all fields available: address, price, area, url, source, tenure, bedrooms, sqft, floor_level.
- Do NOT pre-screen for acquisition criteria. Import everything. Let the user decide.

### Step 3 — Set `analyst_flag` honestly (not `archive_reason`)
- Off-market: `analyst_flag = 'off_market'`
- Needs enrichment: `analyst_flag = 'needs_enrichment'`
- Fails criteria: `analyst_flag = 'fails_criteria'`
- Unknown: `analyst_flag = null` (clean import)
- Document context in `analyst_notes` for any flagged record.

### Step 4 — Frontend triage
- All imported leads appear in the Properties page as active `discovered` records.
- The user reviews flagged records and decides to shortlist, vet, or archive.
- The analyst enriches records on request.

## EPC Data Enrichment
EPC ratings cannot be reliably scraped from portal listings. For properties missing `epc`:
1. Attempt manual lookup via UK EPC Register: https://www.mezh.org/ or https://www.epcregister.com/
2. If unverifiable, set `analyst_flag = 'needs_enrichment'` with a note in `analyst_notes`. Do NOT fabricate or estimate an EPC rating.

## Realistic Price Policy (Effective 2026-04-04)

### New Leads (User-Submitted or Scraper-Derived)
**Default `realistic_price = list_price`.** There is no empirical basis to estimate a property is worth more than its asking price without:
- A recent comparable sale at the same address or in the same block
- A formal surveyor valuation
- A confirmed asking-price reduction that makes it genuinely cheap

Do NOT compute `realistic_price = area_£psqm × sqft` where the sqft was estimated (not measured from a floorplan).

### Updating Existing Records
- `realistic_price` is recalculated when: (a) a comparable sale is confirmed, or (b) `sqft` is updated with a measured value from a floorplan or EPC.
- Always document the basis for `realistic_price` changes in `analyst_notes`.

### When realistic_price CAN exceed list_price
Only when there is independent empirical evidence: confirmed comparable sale, formal RICS valuation, or documented market evidence.

### When realistic_price MUST be below list_price
When area comparables consistently show `list_price > realistic_price` — flag in `analyst_notes`.

### Import-Time Safe Harbor
On first import, always set `realistic_price = list_price` unless the lead contains an explicit surveyor valuation.

## User-Submitted Leads — Guardrails Suspended

When a lead arrives with `source: 'MANUAL_INJECTION'` or `source: 'USER_SUBMISSION'`:
1. **Import immediately** — write to `data/inbox/` and sync to DB with `archived = 0`
2. **Never pre-archive** — even if `sqft` is missing, tenure unknown, or outside acquisition zones
3. **Never skip or reject** — no acquisition criteria filtering
4. **Enrich opportunistically** — leave the record active regardless of enrichment outcome
5. **Still merge duplicates** — merge links/gallery but do not flag or archive
6. **Document in analyst_notes** — "User-submitted lead — guardrails suspended. [Enrichment notes]"

The user's decision to submit a property is their explicit signal that they want it in the pipeline.
