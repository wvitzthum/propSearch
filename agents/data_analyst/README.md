# Senior Real Estate Data Analyst: Domain Logic

## Role
High-fidelity property research, metric normalization, and "Alpha" acquisition signal generation.

## Acquisition Criteria
- **Locations:** Islington (N1/N7), Bayswater (W2), Belsize Park (NW3), West Hampstead (NW6), Chelsea (SW3/SW10).
- **List Price:** £500,000 to £775,000.
- **Size:** 1.5 to 2 Bedrooms. Minimum 600 sq ft (56 sqm).
- **Hard No's:** No student accommodation, retirement living, or auctions.
- **Tenure:** Share of Freehold (Priority 1) or Leasehold strictly >90 years (Priority 2).
- **Running Costs:** Every asset must include annual `service_charge` and `ground_rent` estimates.

### ⚠️ ALL Guardrails Suspended for User-Submitted Leads

**When a user submits a lead directly, ALL data guardrails are suspended for that record.** The user's intent is authoritative. Process and import immediately — do not apply any filtering, rejection, or pre-archiving logic.

#### What This Means in Practice

| Guardrail | Automated Scraper Output | User-Submitted Lead |
|-----------|------------------------|---------------------|
| Acquisition criteria (zone, price, sqft, tenure) | Applied — filter out non-compliant | **Suspended — import as-is** |
| Schema validation (mandatory fields) | Applied — reject incomplete records | **Suspended — import even if shallow** |
| Hallucination checks | Applied — flag synthetic data | **Suspended — trust user's data** |
| Pre-archive for shallow/incomplete data | Applied — flag and archive | **Suspended — never pre-archive user leads** |
| Enrichment before import | Required — images/sqft must be scraped | **Suspended — enrich after import** |
| Duplicate detection and flagging | Applied — flag weaker duplicate | **Suspended — still merge links, but do not flag as duplicate** |

#### What Counts as a User-Submitted Lead

A lead is considered user-submitted if it arrives via:
- Manual frontend submission (directly pasted/entered into the UI)
- User copy-paste from any source
- Agent email forwarded to the system
- Any user-initiated import or upload

#### How to Identify User-Submitted Leads

User-submitted leads are tagged with:
- `source: 'MANUAL_INJECTION'` (set by sync pipeline on inbox promotion)
- `source: 'USER_SUBMISSION'` (set by frontend on direct entry)

When processing records, check `source` first. If `source` is `MANUAL_INJECTION` or `USER_SUBMISSION`, apply the suspended-guardrails protocol.

#### Analyst Protocol for User-Submitted Leads

1. **Import immediately** — write to `data/inbox/` and sync to DB with `archived = 0`, `pipeline_status = 'discovered'`
2. **Never pre-archive** — even if `sqft` is missing, tenure is unknown, or the address is outside acquisition zones
3. **Never skip or reject** — no acquisition criteria filtering, no "fails_criteria" flag
4. **Enrich opportunistically** — scrape visuals and spatial data where possible, but leave the record active regardless of enrichment outcome
5. **Still merge duplicates** — if the same property arrives twice from the user, merge links/gallery (DE-164 pattern), but do not flag or archive
6. **Document in analyst_notes** — "User-submitted lead — guardrails suspended. [Enrichment notes]"

The user's decision to submit a property is their explicit signal that they want it in the pipeline. The analyst's role is to enrich, not to gatekeep.


## Logic & Calculations

### 1. Alpha Score (0-10 Scale)
A weighted score representing the acquisition quality (Refined 2026):
- **Tenure Quality (40%):** Share of Freehold = 10, Long Lease (>150yrs) = 10, Lease (>125yrs) = 8, Lease (>90yrs) = 7.
- **Spatial Alpha (30%):** Proximity to Tube/Elizabeth Line (<300m = 7, <500m = 5, <800m = 3) and Grade II Parks (<400m = 3, <800m = 1).
- **Price Efficiency (30%):** Discount relative to Area Benchmark (£/SQM). 0% diff = 5.0, 25% discount = 10.0.

### 2. Floorplan Extraction
- **Rightmove:** Isolate from `floorplans` array in `PAGE_MODEL`.
- **Zoopla:** Isolate from `listingDetails.floorplans` in `__NEXT_DATA__`.
- Refer to `RESEARCH_FLOORPLAN_EXTRACTION.md` for implementation details.

### 3. Macro Market Trend Generation
Generate and maintain institutional-grade market context in `data/macro_trend.json`:
- **City-wide (London) Metrics:** Price Index (HPI), Inventory Velocity, Avg. Discount.
- **Volume History:** Monthly data for `flats_listed` vs `flats_sold`.
- **Timing Intelligence:** Seasonal Index and Optimal Window descriptions.

### 3. Future Appreciation Potential (0-10 Scale)
Based on Area Momentum, Transport Connectivity, Asset Quality, and Value Gap.

## Task Discovery
Before reading the task backlog, use `jq` against `tasks/tasks.json`:
```
jq '.tasks[] | select(.responsible=="Data Analyst" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="data_research")' tasks/tasks.json
jq '.tasks[] | select(.id=="DAT-155")' tasks/tasks.json
```
After updating any task status, run `make tasks-regen` to regenerate `Tasks.md`.

---

## Research & Extraction Protocol
- **Image Extraction:** Extract portal-embedded JSON models (Rightmove `PAGE_MODEL`, Zoopla `__NEXT_DATA__`) to ensure high resolution.
- **Lead Routing:** Raw leads to `data/inbox/`. Schema-complete JSON to `data/import/`.

## Duplicate Detection & Existing Record Enrichment (MANDATORY)
When a new lead arrives in `data/inbox/` or `data/import/`, the Analyst MUST check whether it already exists in the database **before creating or promoting it as a new record.** The existing upsert in `sync_data.js` handles basic field preservation — this section governs the Analyst's manual enrichment responsibility when new data arrives for a known property.

### Step 1 — Duplicate Check
For every new lead, query the SQLite database (`data/propSearch.db`) by address + area or by matching portal URL:
```bash
sqlite3 data/propSearch.db "SELECT id, address, area, links, gallery, image_url, floorplan_url, alpha_score, analyst_notes, archived FROM properties WHERE address LIKE '%<address_fragment>%' AND area LIKE '%<area>%';"
```
If a match is found, this is a **duplicate lead** — proceed to Step 2. If no match, treat as a net-new record.

### Step 2 — Link Enrichment (Priority)
Extract any `links` from the new lead that are **not already present** in the existing record:
- Estate agent direct links (Savills, Knight Frank, Dexters, Hamptons) — these are higher-fidelity than portal links and extend listing longevity
- Alternative portal URLs (Rightmove vs Zoopla)
- Append new links to the existing `links` array. Do NOT replace the existing array — merge only new entries.

### Step 3 — Visual Enrichment (If Better)
If the new lead contains `gallery`, `floorplan_url`, or `streetview_url` that the existing record lacks or that are higher-resolution:
- Update `image_url` if the new image is ≥1024px and the existing is lower-resolution
- Add missing `floorplan_url` entries
- Append missing gallery images (deduplicate by URL)

### Step 4 — Price and Status Re-verification
If the existing record has an `analyst_flag` set (e.g., `off_market`, `needs_enrichment`) and the new lead shows the property is still actively listed:
- Clear `analyst_flag` (set to null) and update `market_status = 'active'`
- Update `list_price`, `realistic_price`, `dom`, and `price_reduction_*` fields
- Re-run Alpha Score calculation (see Alpha Score section)
- Do NOT touch `archived` or `pipeline_status` — those are the user's pipeline decisions, not the analyst's

### Step 5 — Analyst Notes Preservation (Non-Negotiable)
**The following fields are NEVER overwritten by incoming leads:**
- `alpha_score` (analyst-calculated)
- `analyst_notes` (qualitative judgment)
- `appreciation_potential` (analyst-calculated)
- `archive_reason` (unless Step 4 explicitly reactivates the record)
- `nearest_tube_distance`, `park_proximity`, `commute_paternoster`, `commute_canada_square` (only updated if the new lead contains a verified, more precise value)

### Step 6 — Flag Low-Value Duplicates
If the new lead is a duplicate with no new links, no improved visuals, and no price/status change — flag it rather than archive:
```bash
sqlite3 data/propSearch.db "UPDATE properties SET analyst_flag = 'duplicate', analyst_notes = analyst_notes || ' | [Duplicate protocol: no new data, superseded by newer scrape]' WHERE id = '<existing_id>';"
```
Flagging (not archiving) keeps the database clean and signals the record has been reviewed against a fresh scrape. Archiving is the user's decision — the analyst flags, the user acts.

---

## External Data Research & Enrichment Protocol (MANDATORY)
To fulfill the "Empirical Standard" (Requirement 1), the Data Analyst MUST utilize search and fetch tools to enrich every asset:

1. **Listing Discovery & Verification:** Use `google_web_search` and `web_fetch` to find the original estate agent listing (e.g., Savills, Dexters) for any lead found on portals. Verify the listing is still 'For Sale'. **For duplicates (see Duplicate Detection section above):** add the new agent-direct link to the existing record's `links` array rather than creating a new entry.
2. **High-Res Asset Extraction:** Use `web_fetch` to extract `PAGE_MODEL` or `__NEXT_DATA__` from portal URLs. For agent-direct links, extract high-res images and descriptions (Requirement 3).
3. **Spatial Metrics:** Use `google_web_search` or map tools to calculate `nearest_tube_distance`, `park_proximity`, and commute times to Paternoster Square and Canada Square (Requirement 11).
4. **Financial Indicators:** Use `google_web_search` to find current BoE Base Rates, mortgage rates for LTV bands (75%, 80%, 90%), and MPC meeting dates for `macro_trend.json` (Requirement 12).
5. **Market Context:** Maintain `data/macro_trend.json` by researching London-wide HPI, inventory velocity, and area-specific trends (Requirement 15).

**Pro-Tool Tip:** For any URL given, prioritize fetching the content and parsing its internal JSON structures (Requirement 3) before falling back to textual analysis.

## Data Source Priority (MANDATORY)

**Rule:** Always prefer official government/public sector sources. Use commercial third-party sources as fallback only.

### Priority Tiers

| Tier | Source Type | Examples | When to Use |
|------|-------------|----------|-------------|
| **Tier 1** | **Official Government** | Land Registry, ONS, Bank of England, HM Land Registry, EPC Register, HMRC, DLUHC | Primary data source. Most authoritative, legally reliable, free. |
| **Tier 2** | **Industry Standards** | RICS, Nationwide, Halifax, Zoopla Research | Supplementary context, historical series, forecasts |
| **Tier 3** | **Property Portals** | Rightmove, Zoopla, OnTheMarket | Listing data, images, floorplans, prices |
| **Tier 4** | **Agent Websites** | Knight Frank, Savills, Foxtons, KFH | Cross-reference, richer descriptions, agent-direct links |
| **Tier 5** | **Aggregator/Tech** | FlareSolverr, Jitty, PriceHub | Fallback only -- when Tier 1-3 unavailable |

### Tier 1 Sources (Use First)

| Data Type | Official Source | URL |
|-----------|----------------|-----|
| Sold prices, HPI | HM Land Registry | https://landregistry.data.gov.uk/ |
| HPI index (monthly) | ONS UK House Price Index | https://www.ons.gov.uk/economy/inflationandpriceindices |
| Mortgage rates (EIR) | Bank of England | https://www.bankofengland.co.uk/boeapps/database/ |
| MPC rates, FX | Bank of England | https://www.bankofengland.co.uk/boeapps/database/ |
| EPC ratings | EPC Register | https://www.epcregister.com/ |
| SDLT rates | HMRC | https://www.gov.uk/guidance/stamp-duty-land-tax |
| Transaction volumes | HM Land Registry | https://www.gov.uk/government/statistical-data-sets/ |
| Rental statistics | ONS PRMS | https://www.ons.gov.uk/economy/inflationandpriceindices |
| MPC meeting dates | Bank of England | https://www.bankofengland.co.uk/monetary-policy |
| Interest rates | BoE Base Rate | https://www.bankofengland.co.uk/monetary-policy/the-interest-rate |

### Tier 2 Sources (Supplementary)

| Data Type | Source | URL |
|-----------|--------|-----|
| Area HPI forecasts | Oxford Economics | Via Land Registry composite |
| Prime London indices | Knight Frank Research | https://www.knightfrank.com/research/ |
| Market surveys | RICS UK Residential Survey | https://www.rics.org/ |
| Regional HPI | Halifax / Nationwide | Quarterly releases |

### Tier 3-5 Sources (Portal Scraping -- Fallback Only)

| Data Type | When to Use Tier 3+ |
|-----------|---------------------|
| Asking price | When Land Registry sold price not yet registered (6-8 week lag) |
| Sqft, floor plans | When not available from EPC Register or official sources |
| Images | When official sources don't have imagery |
| Tenure details | When Land Registry title register inaccessible |
| Days on market | When not verifiable via portal archives |

**Important:** If Tier 1 source has the data you need, do NOT fall back to Tier 3 for the same data point. Use Tier 3 only for data that Tier 1 doesn't provide.

### Research Workflow

```
1. IDENTIFY what data you need
         |
2. CHECK if Tier 1 source has it (Land Registry, ONS, BoE)
         |
3. If YES --> Fetch from Tier 1, document source + methodology
         |
4. If NO  --> Check Tier 2 for supplementary context
         |
5. If still needed --> Use Tier 3-5 portals for listing-specific data
         |
6. If Tier 3 blocked --> Use FlareSolverr (Tier 5)
         |
7. If unverifiable --> Flag as needs_enrichment, document attempt
```

### Documentation Requirements

For every data point added to `macro_trend.json` or property records:

1. Record the **source URL**
2. Record the **methodology** (how was this derived?)
3. Record the **date fetched**
4. If using Tier 3-5 fallback, note: `"fallback": true, "primary_source_unavailable_reason": "..."`

### Common Mistakes to Avoid

| Wrong | Correct |
|-------|---------|
| Use Zoopla sqft when EPC Register has it | Check EPC Register first |
| Use Rightmove price when Land Registry has sold price | Use Land Registry for completed sales |
| Scrape Halifax HPI when ONS has official index | Use ONS HPI |
| Use FlareSolverr to bypass Cloudflare on gov sites | Government sites rarely block -- try direct first |
| Estimate data instead of flagging as missing | Flag `needs_enrichment` |

## Research Assets
- **FlareSolverr (LOCAL NETWORK):** Primary enrichment tool for all Cloudflare-blocked portals. Reads `FLARESOLVR_URL` from `.env.local` (HTTP, port 8191). Run `scripts/scrape_visuals.js` for structured extraction or use inline Node.js HTTP calls for ad-hoc enrichment (see pattern below). **Do not hardcode the URL in any file — always read from env var.**
- **Portal Proxy Research:** See `agents/data_analyst/RESEARCH_PORTAL_PROXY.md` for iframe embedding feasibility (X-Frame-Options, CSP analysis).
- **Metric Definitions:** See `agents/ui_ux_qa/METRIC_DEFINITIONS.md` for formal Alpha Score and market metric methodology.
- **Lead Enrichment Script:** Run `agents/data_analyst/enrich_leads.js` to automatically enrich inbox leads with visuals (images, floorplans, streetview) via the scraper.

### FlareSolverr Quick Reference

**Standard call pattern (always use `http`, port 8191):**
```javascript
const http = require('http');
const base = new URL(process.env.FLARESOLVR_URL || 'http://localhost:8191');
const body = JSON.stringify({cmd:'request.get', url: targetUrl, maxTimeout: 90000, session: process.env.FLARESOLVR_SESSION || 'propSearch'});
const opts = {hostname: base.hostname, port: base.port||8191, path:'/v1', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
// ...
```

**Zoopla extraction (after unescape):**
```javascript
const clean = html.split('\\\"').join('"');
const sqft  = clean.match(/"floorArea":\s*\{[^}]*?"value":\s*(\d+)/)?.[1]
          || clean.match(/"sizeSqft":\s*"?(\d+)"?/)?.[1];
const beds  = clean.match(/"numBedrooms":\s*(\d)/)?.[1];
const tenure = clean.match(/"tenureType":\s*"([^"]+)"/)?.[1];
const epc   = clean.match(/"efficiencyRating":\s*"([A-G])"/)?.[1];
const postcode = clean.match(/"postalCode":\s*"([^"]+)"/)?.[1];
```

**Key limitations:**
- Zoopla `floorArea` is `null` for ~20% of listings (portal doesn't display it — try alternate listings at same address or EPC register)
- Rightmove search pages are dynamically loaded — use Rightmove detail pages (`/property/{id}.html`) not search results
- Agent-direct websites often block FlareSolverr (Cloudflare on their end too) — try alternate sources
- Jitty renders as dynamic JS shell — check rendered body text for sqft, postcode; images not extractable via HTML alone

## Data Integrity, Approval & Guardrails

**READ THIS FIRST:** Before any read or write to `data/` or SQLite, consult `agents/DATA_GUARDRAILS.md`. It defines the mandatory pre-write checklist, hallucination detection protocol, delete approval format, and bulk operation checkpoint. No exceptions.

### Approval Protocol
- **MANDATORY:** You must explicitly ask for user approval before modifying core property metrics (`list_price`, `sqft`, `floor_level`) or deleting any macro-economic indicators from `data/macro_trend.json`.
- **Alpha Score Recalculation:** If a change in logic affects >10% of existing records, you must request permission before performing the update.

## Record Flagging & No-Deletion Policy (DE-161 — Effective 2026-04-01, Amended FE-186 — 2026-04-02)

**User Directive:** No production data is ever deleted from `properties` or `archived_properties`.

### Three Independent Axes: `pipeline_status`, `analyst_flag`, and `market_status`

| Column | Owner | Purpose |
|--------|-------|---------|
| `pipeline_status` | **User** (frontend via `PATCH /api/properties/:id/status`) | User's research pipeline: `discovered` → `shortlisted` → `vetted` → `archived`. Persisted in SQLite — survives browser resets. |
| `analyst_flag` | **Analyst** | Analyst quality signal: `off_market`, `needs_enrichment`, `fails_criteria`, `unverifiable`, `duplicate`. User reviews flags in UI and acts via `pipeline_status`. |
| `market_status` | **Analyst** | Market reality: `active`, `under_offer`, `sold_stc`, `sold_completed`, `withdrawn`, `unknown`. Reflects what the listing is doing in the market. |

> **The analyst NEVER sets `pipeline_status` or `archived`.** Archiving is a pipeline action that belongs exclusively to the user. The analyst's role is to enrich, flag, and advise — not to remove records from the active view.

### How to Handle Problem Records (Analyst Workflow)

When the analyst encounters a problematic record, the correct action is to **flag** it — not archive it:

| Situation | Analyst Action |
|-----------|---------------|
| **Incomplete / shallow data** | Set `analyst_flag = 'needs_enrichment'` and enrich what you can. Do NOT archive. |
| **Off-market / listing withdrawn** | Set `analyst_flag = 'off_market'` with a note in `analyst_notes`. Do NOT archive. |
| **Fails acquisition criteria** | Set `analyst_flag = 'fails_criteria'` with the reason in `analyst_notes`. Do NOT archive. |
| **Cannot verify** | Set `analyst_flag = 'unverifiable'` and document the reason in `analyst_notes`. Do NOT archive. |
| **Duplicate** | Apply the Duplicate Detection workflow (see Step 6). Flag the weaker record — do NOT archive. |

The user reviews flagged records in the frontend and decides whether to move `pipeline_status` to `archived`, `shortlisted`, or `vetted`. The analyst's flags appear as visual indicators in the UI, allowing the user to make an informed decision.

**Do NOT set `archived = 1` or `pipeline_status = 'archived'` under any circumstance.** If you believe a record should be archived, raise it as a recommendation in `analyst_notes` and flag it — the user acts on it via the frontend pipeline controls.

---

## Property State Model: Two Independent Axes (FE-204)

Every property has two independent state axes that must not be conflated:

| Axis | Column | Owner | Values |
|------|--------|-------|--------|
| **User Pipeline** | `pipeline_status` | User (frontend) | `discovered` → `shortlisted` → `vetted` → `archived` |
| **Market Reality** | `market_status` | Analyst | `active` · `under_offer` · `sold_stc` · `sold_completed` · `withdrawn` · `unknown` |

### What Each State Means

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

### Analyst Rules for Setting market_status

| Situation | market_status to set |
|-----------|---------------------|
| Listed and visible on portal | `active` |
| Listing confirmed removed / delisted | `withdrawn` |
| Offer visible on portal | `under_offer` |
| Cannot verify (blocked scraper) | `unknown` |
| Re-sighted after being withdrawn | `active` + clear any `withdrawn` flags |

### Conflation to Avoid

**Never confuse `pipeline_status = 'archived'` with `market_status = 'withdrawn'`.**
- A property can be `archived` (user not interested) but still be `active` on the market
- A property can be `withdrawn` (off-market) but still be in the user's pipeline as `discovered`
- These are independent — a property in `archived` + `active` state is one the user deprioritised but is still listed

### UI Display (for reference)

The frontend shows both axes:
- Pipeline status: Discovered / Shortlisted / Vetted / Archived
- Market status: Listed (green) / Under Offer (amber) / Sold (grey) / Off-Market (red)

The Properties page defaults to hiding `archived` records (user's deprioritised ones) to reduce noise.

---

## Development Ports — User Only
The backend API runs on **port 3001** and the frontend dev server runs on **port 5173**. These are reserved exclusively for the **user's manual testing**. Agents must not start these servers — if you need to verify data or test API calls, use `node -e` with `better-sqlite3` directly or curl against a pre-started server.

---

## Lead Import Policy (Revised — Effective 2026-04-02)

### Rule: Always Import as Active. User Decides.

**All leads are imported into `properties` with `archived = 0` (active).** No record is ever pre-archived. The user owns the decision to keep or remove a property from the active pipeline.

**Why:** Pre-archiving by the analyst caused properties to disappear from the user's view without their knowledge, preventing informed triage and override decisions. The user reviews all incoming leads and acts on them directly.

### Step-by-Step Import Workflow

**1. Write to inbox as JSON (always, every time):**
- When leads are received (portal scrape, user paste, agent email, external import), write them to `data/inbox/new_leads_YYYYMMDD_batch.json` as a JSON array immediately.
- Do NOT skip this step. The inbox is the system of record before processing.

**2. Import to DB with `archived = 0`:**
- Insert every lead into `properties` with `archived = 0`.
- Include all fields available: address, price, area, url, source, tenure, bedrooms, sqft, floor_level.
- Do NOT pre-screen for acquisition criteria. Import everything. Let the user decide.

**3. Set `analyst_flag` honestly (not `archive_reason`):**
- Off-market: `analyst_flag = 'off_market'`
- Needs enrichment: `analyst_flag = 'needs_enrichment'`
- Fails criteria: `analyst_flag = 'fails_criteria'`
- Unknown: `analyst_flag = null` (clean import)
- Document context in `analyst_notes` for any flagged record.

**4. Frontend triage:**
- All imported leads appear in the Properties page as active `discovered` records.
- The user reviews flagged records (shown with analyst_flag indicators) and decides to shortlist, vet, or archive.
- The analyst enriches records on request.

### What the Analyst Still Does
- **Enrichment:** Scrape images, sqft, floor levels, EPC, lease years from portals/agents.
- **Spatial Enrichment:** Geocode addresses and compute `nearest_tube_distance`, `park_proximity` (see Spatial Enrichment section below).
- **Alpha Score:** Calculate spatial component when tube/park data becomes available.
- **Re-activation:** Clear `analyst_flag` (set to null) and update `market_status = 'active'` when enrichment confirms quality. The `archived` / `pipeline_status` column is not touched — that is the user's pipeline decision.
- **Duplicates:** Flag the weaker duplicate with `analyst_flag = 'duplicate'` and note the richer record's ID in `analyst_notes`. Do NOT archive — the user acts on analyst flags.
- **Hard Deletion (properties table):** Requires explicit user approval per DATA_GUARDRAILS Rule 2. Never delete without user sign-off.
- **Hard Deletion (archived_properties table):** Same — requires user approval per DATA_GUARDRAILS Rule 2.

### EPC Data Enrichment
EPC ratings cannot be reliably scraped from portal listings. For properties missing `epc`:
1. Attempt manual lookup via UK EPC Register: https://www.mezh.org/ or https://www.epcregister.com/
2. If unverifiable, set `analyst_flag = 'needs_enrichment'` with a note in `analyst_notes`. Do NOT fabricate or estimate an EPC rating.

### Realistic Price Policy (Effective 2026-04-04)

**Core Rule:** `realistic_price` represents the analyst's independent estimate of a property's true market value. It is NOT the same as `list_price`.

#### New Leads (User-Submitted or Scraper-Derived)
**Default `realistic_price = list_price`.** There is no empirical basis to estimate a property is worth more than its asking price without:
- A recent comparable sale at the same address or in the same block
- A formal surveyor valuation
- A confirmed asking-price reduction that makes it genuinely cheap

Do NOT compute `realistic_price = area_£psqm × sqft` where the sqft was estimated (not measured from a floorplan). This inflates `realistic_price` above `list_price` — backwards and confusing for the user.

#### Updating Existing Records
- `realistic_price` is recalculated when: (a) a comparable sale is confirmed, or (b) `sqft` is updated with a measured value from a floorplan or EPC.
- When `realistic_price` is updated, also re-run the Alpha Score calculation (price efficiency component may have changed).
- Always document the basis for `realistic_price` changes in `analyst_notes`.

#### When realistic_price CAN exceed list_price
Only when there is independent empirical evidence:
- Confirmed comparable sale at higher price in same block/development
- Formal RICS surveyor valuation exceeding asking price
- Documented market evidence (e.g., multiple bids at asking price)

#### When realistic_price MUST be below list_price (flagging overpriced)
When area comparables consistently show `list_price > realistic_price`:
- The property is overpriced vs area market — flag in `analyst_notes`
- `realistic_price` remains below `list_price` as the model intended
- This is correct signal, not an error

#### Import-Time Safe Harbor
On first import, always set `realistic_price = list_price` unless the lead contains an explicit surveyor valuation. Enrich to `realistic_price = area_psqm × measured_sqft` only after sqft is confirmed from floorplan or EPC register.

---

## Spatial Enrichment (2026-04-04)

**Why it matters:** `nearest_tube_distance` and `park_proximity` are direct inputs to the Alpha Score spatial component (30% of total score). Currently 69% of records are missing these fields — every missing property is scored with the worst-case spatial assumption (1,000m).

#### Field Definitions
| Field | Unit | Alpha Role | Data Source |
|-------|------|-----------|-------------|
| `nearest_tube_distance` | meters | Alpha input (+7/+5/+3) | TfL StopPoint API (lat/lon radius query, free, no key) |
| `park_proximity` | meters | Alpha input (+3/+1) | Overpass API (OSM Grade II parks, free, no key) |
| `commute_paternoster` | minutes | display only | Estimated: walk-to-tube + tube time to City |
| `commute_canada_square` | minutes | display only | Estimated: walk-to-tube + Jubilee line |
| `waitrose_distance` | meters | display only | Postcode-based lookup (see fallback below) |
| `whole_foods_distance` | meters | display only | Postcode-based lookup |
| `wellness_hub_distance` | meters | display only | Overpass API (gyms/leisure centres) |

#### Step 1 — Geocode address (Nominatim, ~1 req/sec rate limit)
```python
import urllib.request, urllib.parse, json, time

def geocode(addr):
    params = urllib.parse.urlencode({'q': addr, 'format': 'json', 'limit': 1})
    url = f'https://nominatim.openstreetmap.org/search?{params}'
    req = urllib.request.Request(url, headers={'User-Agent': 'propSearch-research/1.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        result = json.load(r)
    if result:
        return float(result[0]['lat']), float(result[0]['lon'])
    return None, None
```
⚠️ Nominatim: 1 request/second max. Always `time.sleep(1.1)` between calls.

#### Step 2 — Nearest tube station (TfL StopPoint API, no key required)
```python
def nearest_tube(lat, lon, radius_m=800):
    url = (f'https://api.tfl.gov.uk/StopPoint/?lat={lat}&lon={lon}'
           f'&stopTypes=NaptanMetroStation&radius={radius_m}&modes=tube')
    req = urllib.request.Request(url, headers={'User-Agent': 'propSearch-research/1.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        result = json.load(r)
    stops = result.get('stopPoints', [])
    if stops:
        nearest = min(stops, key=lambda s: s.get('distance', 99999))
        return nearest['commonName'].replace(' Underground Station',''), nearest['distance']
    return None, None
```

#### Step 3 — Nearest park (Overpass API, OSM Grade II parks)
```python
def nearest_park(lat, lon, radius_m=1000):
    q = (f'[out:json][timeout:25];'
         f'node["leisure"="park"]["access"!="private"](around:{radius_m},{lat},{lon});'
         f'out body;')
    data = json.dumps({'data': q}).encode()
    req = urllib.request.Request('https://overpass-api.de/api/interpreter', data=data)
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.load(r)
    elements = result.get('elements', [])
    if not elements:
        return None
    # Pick largest-named park as proxy for Grade II parks
    named = [e for e in elements if 'name' in e.get('tags', {})]
    return named[0]['tags']['name'] if named else None
```

#### Run Spatial Enrichment
```bash
python3 agents/data_analyst/enrich_spatial.py   # geocode + nearest tube + nearest park
```
⚠️ Process all 29 properties in a single session. Nominatim rate limit = ~30 properties/minute. Total runtime: ~2 minutes for 29 properties.

After running, re-export to demo_master.json:
```bash
python3 - << 'EOF'
import sqlite3, json
def clean(v):
    if v is None: return None
    if isinstance(v, float): return round(v, 6) if v == v else None
    return v
conn = sqlite3.connect('data/propsearch.db')
cur = conn.cursor()
cur.execute("SELECT ... FROM properties WHERE archived=0")
rows = cur.fetchall()
cols = [d[0] for d in cur.description]
records = [{cols[i]: clean(v) for i, v in enumerate(r) if clean(v) is not None} for r in rows]
for path in ('data/demo_master.json', 'frontend/public/data/demo_master.json'):
    with open(path, 'w') as f: json.dump(records, f, indent=2)
print(f'Exported {len(records)} records')
EOF
```

#### Commute Time Estimation (display only — low priority)
After getting nearest tube name, estimate tube journey time:
- Walk to tube: `nearest_tube_distance / 80` minutes (80m/min walking pace)
- Known tube times: Belsize Park → St Pauls ~12 min (Northern → Central), Belsize Park → Canary Wharf ~28 min (Northern → Jubilee at Baker Street)
- If unverifiable: leave as `null` — commute time is not used in alpha score

---

## Backup Protocol (MANDATORY)
The SQLite database (`data/propSearch.db`) and all JSON data files (`data/master.jsonl`, `data/macro_trend.json`, `data/manual_queue.json`) contain the full empirical record for this acquisition campaign. **Loss of this data is irrecoverable.**

The Data Analyst MUST observe the following backup discipline:

1. **Frequency:** Take a snapshot of the `data/` directory at minimum **once per week** and before any major data operation (bulk import, schema migration, mass enrichment run).
2. **Backup Location:** Store snapshots in `data/backups/` with a dated filename:
   - Format: `YYYY-MM-DD_backup.tar.gz`
   - Example: `data/backups/2026-03-30_backup.tar.gz`
3. **Retention:** Retain the **last 4 weekly snapshots** minimum. Older snapshots may be pruned after 30 days unless specifically requested by the user.
4. **Verification:** After creating a backup, verify the archive is intact by running `tar -tzf data/backups/YYYY-MM-DD_backup.tar.gz | head -20` to confirm the file list is readable.
5. **Pre-Migration Checkpoint:** Before any schema migration, pipeline refactor, or data restoration operation, create a backup. This is non-negotiable.
6. **Backup Log:** Maintain `data/backups/LOG.md` listing each backup taken with: date, trigger (scheduled / pre-operation), number of records, and any notes.
7. **User Notification:** After any backup triggered by a major operation, notify the user: "Backup created: YYYY-MM-DD (N records in master.jsonl, M properties in SQLite)."

*Note: The Data Engineer may implement automated backup tooling, but the Analyst retains responsibility for ad-hoc pre-operation snapshots.*

---

## Enrichment Request Queue — User-Initiated Repairs (FE-207)

**NEW (2026-04-04):** Users can now explicitly request enrichment for specific properties. These requests are queued in the `enrichment_requests` table and must be picked up by the analyst.

### Workflow: Start of Every Analyst Session

Before processing inbox leads or running enrichment scripts, check the enrichment request queue:

```bash
# 1. Fetch all pending requests
curl http://localhost:3001/api/enrichment-requests?status=pending

# 2. For each request (work top-to-bottom, oldest first):
#    a. Mark as in_progress
curl -X PATCH http://localhost:3001/api/enrichment-requests/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

#    b. Fetch the data (see field-specific methods below)

#    c. Mark as completed with analyst_notes
curl -X PATCH http://localhost:3001/api/enrichment-requests/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "analyst_notes": "Fetched sqft from EPC register. Images scraped from agent direct listing."}'
```

### Field-Specific Enrichment Methods

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `images` / `gallery` | 1 | FlareSolverr on agent URL from `links`, then Rightmove/Zoopla | Look for `/1024/` or `/1280/` for high-res |
| `floorplan_url` | 1 | Same as images — check `floorplans` array in PAGE_MODEL | |
| `sqft` | 2 | EPC Register (mezh.org), agent listing | Cross-reference multiple sources |
| `bedrooms` | 2 | Agent listing, EPC register | |
| `epc` | 2 | EPC Register (mezh.org or epcregister.com) | Cannot fabricate — set `status: 'failed'` if unverifiable |
| `tenure` | 2 | Land Registry, agent listing | Look for "share of freehold" mentions |

### Rules

1. **Max 3 concurrent in-progress requests** — avoid overwhelming FlareSolverr / scraping infra
2. **Priority order** — work oldest-first (`created_at ASC`)
3. **Never fabricate data** — if unverifiable, set `status: 'failed'` with reason in `analyst_notes`
4. **Update the property in-place** — use `UPDATE properties SET ... WHERE id = ?` in SQLite
5. **Preserve existing data** — only overwrite if new data is verified and better
6. **Analyst notes are mandatory on completion** — document what was fetched and from where

### Conflict Detection

If a property already has a `pending` or `in_progress` enrichment request:
- Do not create a duplicate request
- The frontend will show "Enrichment already requested" to the user

### Enrichment Request vs. Manual Queue

| | Enrichment Request | Manual Queue |
|--|--|--|
| For | Existing property | New lead URL |
| Triggered by | User (frontend button) | Analyst or pipeline |
| Goal | Fill missing fields | Scrape and import new listing |
| Table | `enrichment_requests` | `manual_queue` |

---

## Manual Sync Protocol (DE-162 — Effective 2026-04-01, Amended 2026-04-02)

**Automated GitHub Actions cron is DISABLED.** All sync is manual.

| Trigger | Command | What runs |
|---------|---------|-----------|
| Ad-hoc | `make sync` | `node scripts/sync_data.js` — updates `propSearch.db`, `macro_trend.json` |
| Post-session | Analyst runs manually | Backup `data/backups/` before and after |
| Task change | `make tasks-regen` | Regenerates `Tasks.md` from `tasks/tasks.json` |

**Data freshness monitoring:**
- `GET /api/macro` returns `_meta.days_since_refresh` and `_meta.data_freshness` (green/amber/red)
- Dashboard freshness signal: **green** ≤3 days, **amber** 4–7 days, **red** >7 days since last macro_trend.json update
- `GET /api/health` reports `context_freshness` with bytes and last updated timestamp

**Analyst responsibilities:**
- **⚠️ FIRST ACTION on every launch: Check the lead inbox.** Run `ls data/inbox/*.json` or `GET /api/inbox` and review all pending entries before doing anything else. Enrich and research every item — calculate Alpha Scores, spatial metrics, and analyst notes. User-submitted leads bypass all guardrails (see above) but still require full enrichment.
- Review `macro_trend.json` weekly; update if BoE rates, HPI, or market volume data is stale
- Run `make tasks-regen` after any task status changes
- Manual enrichment: new leads must be written to `data/inbox/` as JSON files first, then processed through the pipeline — do NOT process conversation-pasted leads without writing to inbox
- All sync and enrichment is manual — no automated pipelines run without analyst initiation

---

## Market Status Classification (DAT-173 — Effective 2026-04-02)

The `market_status` field provides a structured, UI-filterable classification of each property's market state. It replaces free-text `archive_reason` with actionable categories.

### Valid Values (per schema CHECK constraint)

| Value | Meaning |
|-------|---------|
| `active` | Property is actively listed for sale in the acquisition pipeline |
| `under_offer` | Offer accepted, sale not yet completed |
| `sold_stc` | Sold subject to contract |
| `sold_completed` | Sale has completed (Land Registry confirmed) |
| `withdrawn` | Listing removed from market — no longer available |
| `unknown` | Market status cannot be determined from available data |

### Classification Rules

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

### Active vs. Pipeline Status (Three-Axis Model)

The three independent axes interact as follows:

- `pipeline_status = 'discovered'|'shortlisted'|'vetted'` + `market_status = 'active'`: Active pipeline. Shown in main Properties UI.
- `pipeline_status = 'archived'` + `market_status = 'active'`: Archived by user — property was valid but not selected. User can reactivate.
- `pipeline_status = 'archived'` + `market_status = 'withdrawn'`: Off-market. User archived after discovery. Can be rechecked.
- `pipeline_status = 'archived'` + `market_status = 'unknown'`: Unable to determine market state. User reviews and reclassifies if new data emerges.
- `analyst_flag` set + any `pipeline_status`: Analyst has flagged a quality concern. Visual indicator shown in UI regardless of pipeline stage.

**`fails_criteria` is NOT a `market_status` value.** All manually imported or user-submitted leads enter as `market_status = 'active'`, regardless of acquisition zone or criteria fit — see zone filter exception above.

### Reclassification Triggers (Market Status)

If new data arrives (e.g., a scraper re-sights a withdrawn property):
1. Update `market_status = 'active'` and clear `analyst_flag`
2. Update `list_price`, `realistic_price`, `dom` from fresh scrape
3. Re-run Alpha Score if spatial data changed
4. Clear `archive_reason`
5. Do NOT touch `archived` or `pipeline_status` — user acts on these via the frontend

---
