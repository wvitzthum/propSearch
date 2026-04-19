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

### Step 4 — Capture images locally (mandatory, every import)
Portal CDN URLs (especially zoopla's `lid.zoocdn.com`) rotate frequently and go 404 within days. **Always run image capture immediately after import:**
```bash
node scripts/capture_images.js
```
This downloads all new remote image URLs to `data/images/{property_id}/` and updates `image_url` / `gallery` to local paths. See `PROTOCOLS/10_IMAGE_STORAGE.md`.

### Step 5 — Frontend triage
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

## Known Failure Mode: Cross-Property URL Contamination

A portal listing URL (Zoopla, Rightmove, etc.) maps to exactly one property listing. The same URL must never appear in the `links` array of two different properties with inconsistent addresses.

**How it happens:** Legacy import files or `demo_master.json` seeded during initial migration can carry incorrect `links` arrays — a URL scraped from address A was accidentally written into address B's data. When a new scrape re-finds the URL and tries to merge, it cross-contaminates.

**Example (d4e5f6a7):** `demo_master.json` pre-seeded `links: [zoopla/71985792, zoopla/71985792, zoopla/72349745]` into the Lower Ground Floor unit. But:
- `71985792` belonged to Hoxton Square (Islington N1) — completely wrong address
- `72349745` belonged to `ps-2cdf2f33` (Gloucester Terrace, Lancaster Gate, SoFH £675k) — same street, different unit

**Prevention rules:**
1. Before seeding any `links` array from a legacy file, verify each URL resolves to the same address
2. In `sync_data.js`, the URL cross-check in `PROTOCOLS/07_DUPLICATE_DETECTION.md` Step 1 Phase 1A must run before any merge
3. `demo_master.json` and all import seed files must be validated: no URL appears in two different address records

**Cleanup:** If contamination is found, remove all incorrect URLs from the affected `links` arrays and from any source JSON files. See DAT-216 cleanup log (2026-04-16).

## User-Submitted Leads — Guardrails Suspended

When a lead arrives with `source: 'MANUAL_INJECTION'` or `source: 'USER_SUBMISSION'`:
1. **Import immediately** — write to `data/inbox/` and sync to DB with `archived = 0`
2. **Never pre-archive** — even if `sqft` is missing, tenure unknown, or outside acquisition zones
3. **Never skip or reject** — no acquisition criteria filtering
4. **Enrich opportunistically** — leave the record active regardless of enrichment outcome
5. **Still merge duplicates** — merge links/gallery but do not flag or archive
6. **Document in analyst_notes** — "User-submitted lead — guardrails suspended. [Enrichment notes]"

The user's decision to submit a property is their explicit signal that they want it in the pipeline.

## Critical: `url` vs `links[]` — The Portal URL Gap (DAT-216)

**The frontend stores the submission portal URL in the `url` field, NOT in `links[]`.**
This gap has caused multiple properties to import into SQLite with empty `links[]`, making them unresolvable in the UI.

**Three ingestion layers, three places this gap must be closed:**

### 1. `enrich_leads.js` — First line of defense ✅ FIXED
When `enrich_leads.js` processes inbox files, it now:
- Reads the `url` field from the inbox JSON
- Injects it into `links[]` before any other processing
- Saves the updated inbox file so `sync_data.js` picks it up
- Also captures the URL from the scrape result on successful scrapes

### 2. `scripts/scrape_visuals.js` — Defensive capture
When a scrape succeeds, the URL is already in the result object. This URL is now
captured into the inbox file's `links[]` by `enrich_leads.js`.

### 3. `scripts/sync_data.js` — Last resort backstop ✅ FIXED
`sync_data.js` now also checks for `links[]` being empty + `url` present at
insert time and auto-injects the URL into `links[]`. This covers the case where
a lead reaches SQLite via an unexpected path.

**The gap cannot be fixed by changing the frontend** because the frontend writes
to inbox directly and the inbox JSON is what `enrich_leads.js` and `sync_data.js`
consume. All three pipeline scripts must handle the gap defensively.

**Failure mode this prevents:** A user submits `https://www.rightmove.co.uk/properties/123`
from the frontend. The inbox JSON has `url: "https://..."` and `links: []`. Without
the fixes above, this property imports to SQLite with no portal link. The analyst
sees "No portal link" in the UI. The property is harder to cross-reference and
impossible to deep-link back to the listing.
