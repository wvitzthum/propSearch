# Duplicate Detection & Enrichment Protocol
*Reference from: agents/data_analyst/README.md — section "Duplicate Detection & Existing Record Enrichment"*

MANDATORY — execute for every new lead before creating a new record.

## Step 1 — Duplicate Check (Two-Phase)

### Phase 1A — URL Cross-Check (MUST run before address matching)
**This phase prevents cross-property URL contamination — the most dangerous merge failure mode.**

For every new lead with a portal URL (`url` field), check whether that URL is already stored in any other property's `links` array:
```bash
sqlite3 data/propSearch.db "SELECT id, address, links FROM properties WHERE archived != 1;"
```
Then scan for the URL in the returned `links` JSON arrays.

**Decision rules:**
| Scenario | Action |
|----------|--------|
| URL not in any property → `links` | Proceed normally |
| URL already exists in another property AND addresses match (same building) | Merge — same property, different enrichment source |
| **URL already exists in another property AND addresses differ (different units or wrong)** | **DO NOT merge. Log warning. Append URL to new record only.** |
| URL appears twice in the same incoming lead | Deduplicate — take first occurrence only |

> ⚠️ **This rule is non-negotiable.** A portal listing URL belongs to exactly one property. If two properties in the database claim the same portal URL with different addresses, one (or both) links are wrong. Never merge on address while ignoring URL.

**Example of the failure this prevents:**
- `d4e5f6a7` (Lower Ground, Gloucester Terrace, Bayswater W2 — £740k Leasehold) had `links: [zoopla/71985792, zoopla/71985792, zoopla/72349745]`
- `ps-2cdf2f33` (Gloucester Terrace, Lancaster Gate, W2 — £675k SoFH) had `links: [zoopla/72349745]`
- Both URLs were wrong for `d4e5f6a7`: `71985792` = Hoxton Square (Islington N1, wrong address entirely); `72349745` = `ps-2cdf2f33` (same street, different unit)
- This occurred because `demo_master.json` was seeded with incorrect legacy data

### Phase 1B — Address + Area Match (Normalized)
**Address normalization is mandatory.** Raw addresses from portals and scrapers often differ slightly — trailing commas, spacing, unit prefixes (e.g. "Flat 1," vs "1," vs "Ground Floor") — but refer to the same property.

**Normalization rules (apply to both incoming lead AND database addresses):**
1. Strip: double commas `,,`, trailing commas, leading/trailing whitespace
2. Collapse multiple spaces to single space
3. Normalize unit prefixes: strip `Flat `, `Apt `, `Unit ` prefixes before numbers (e.g. `"Flat 1, King's Road"` → `"1 King's Road"`)
4. Standardise: `St` → `Street`, `Ave` → `Avenue`, `Gdns` → `Gardens`, `Terr` → `Terrace`
5. Case-insensitive comparison after normalization

**Query with normalized match:**
```bash
# Normalize incoming address, then use SQLite LOWER(TRIM()) for comparison
# Use a fuzzy match: strip common suffixes first
```

**Decision rules:**
| Scenario | Action |
|----------|--------|
| Normalized address + area matches existing record | **Duplicate** — proceed to Step 2 |
| Normalized address matches but area differs significantly | Investigate — same building may span postcodes |
| No match | Treat as net-new record |

> **Known false-positive traps (DAT-216):** The following addresses appear in multiple properties and must NOT be treated as duplicates without additional verification:
> - `"Chelsea Manor Gardens"` vs `"Chelsea Manor Gardens, , Chelsea, SW3"` — same property, malformed address string (double comma). Normalize first.
> - `"Kings Road, London, SW3"` appears in multiple Chelsea properties — same street, different buildings. Require postcode or building number for deduplication.
> - `"Warwick Avenue, London, W9"` spans multiple buildings. Require building name or postcode.
> - `"Dovehouse Street, London, SW3"` — multiple units in same building possible. Require flat/unit identifier.

**Practical approach:** If two records have the same postcode outcode (e.g. SW3, W9, NW3) AND the normalized address matches within 3 Levenshtein distance, treat as a likely duplicate. If not, investigate before merging.

## Step 2 — Link Enrichment (Priority)

Extract any `links` from the new lead that are **not already present** in the existing record:
- Estate agent direct links (Savills, Knight Frank, Dexters, Hamptons) — these are higher-fidelity than portal links and extend listing longevity
- Alternative portal URLs (Rightmove vs Zoopla)
- Append new links to the existing `links` array. Do NOT replace — merge only new entries.

**Cross-check before appending:** Before adding any portal URL to an existing record's `links` array, verify the URL's portal page confirms the same address or is consistent with the existing property. A URL scraped from one address must not be blindly appended to a different property's links.

### `url` field → `links[]` Gap (DAT-216)
Frontend submissions write the portal URL to the `url` field, not `links[]`. If an
inbox file or new record has `url` present but `links[]` empty, the URL must be
injected into `links[]` before duplicate detection runs — otherwise Phase 1A
(URL cross-check) cannot detect cross-contaminations.

The fixes are implemented in `enrich_leads.js`, `sync_data.js`, and `scrape_visuals.js`.

### `links[]` Field Format — CRITICAL (DAT-216)
The `links` column MUST be stored as a JSON string array of plain URL strings:
```sql
links = '["https://rightmove.co.uk/123", "https://zoopla.co.uk/456"]'  -- CORRECT
links = '[{"url":"...","source":"Rightmove"}]'                           -- WRONG
```
**Root cause of mixed format (2026-04-17):** Multiple pipeline iterations wrote
`{url, source}` objects into `links[]` as a misguided attempt to track portal source.
The frontend `SourceHub.tsx` component expects `string[]` — it filters `typeof l === 'string'`
and ignores all object elements. This means 55 properties had broken links in the UI
while appearing linked in the DB.

**Fix applied:** All 55 affected properties normalized to plain string arrays.
All three pipeline scripts (`enrich_leads.js`, `sync_data.js`) now write URL strings only.

**Rule (non-negotiable):** Never store objects in `links[]`. The portal source is
determinable from the URL domain. If source-tracking is needed, use a separate column.
If a record reaches SQLite with `links = []` despite having a valid `url`, it is a
pipeline regression — investigate `enrich_leads.js` first.

## Step 3 — Visual Enrichment (If Better) + Local Image Capture

If the new lead contains `gallery`, `floorplan_url`, or `streetview_url` that the existing record lacks or that are higher-resolution:
- Update `image_url` if the new image is ≥1024px and the existing is lower-resolution
- Add missing `floorplan_url` entries
- Append missing gallery images (deduplicate by URL)

**After merging any new image URLs, always run image capture:**
```bash
node scripts/capture_images.js
```
This downloads and localises all new remote CDN URLs (especially zoocdn) to `data/images/`. See `10_IMAGE_STORAGE.md`.

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
