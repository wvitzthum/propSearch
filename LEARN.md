# LEARN.md — Analyst Session Corrections Log
## Last updated: 2026-05-02

---

## Choropleth Data — Population Density (2026-05-02)

### DAT-259: Population Density Sourced from ONS
**Problem:** Choropleth "Density" mode was showing UC claimant rate (%) instead of actual population density (people/km²).

**Source:** ONS "Population density for Lower layer Super Output Areas in England and Wales, mid-2022 to mid-2024"
**URL:** `https://www.ons.gov.uk/.../lowersuperoutputareapopulationdensity/mid2022revisednov2025tomid2024/sapelsoapopulationdensity20222024.xlsx`
**Download date:** 2026-05-02
**File:** `data/sources/lsoa_density_2022_2024.xlsx` (3.7 MB, Excel)

**New fields added to `data/lsoa_choropleth_london.geojson`:**
- `population` — Census 2021 mid-2024 population estimate (integer)
- `area_sq_km` — LSOA area in km² (float, 6 decimal places)
- `pop_density` — people/km², computed as population / area_sq_km (float, 1 decimal)

**Coverage:** 4,659/4,835 London LSOAs matched (176 missing: LSOA boundary changes between Census 2011 and 2021 census rebasing — 2011 LSOAs that were split/merged in 2021 boundaries).

**Frontend update:** `frontend/src/pages/MapView.tsx`
- `CHOROPLETH_RANGES.pop_density: { min: 0, max: 25000 }` (London avg ~10,000 people/km²)
- `choroplethStyle()`: claimants mode now uses `pop_density` (orange density palette)
- Tooltip: shows `X people/km²`, population, area, and density level (low/moderate/dense/very dense)
- Legend button: label changed from "UC Claimants" → "Population Density"

**London density stats (people/km²):**
- Min: 134 (very suburban, e.g., Bromley rural fringe)
- Max: 56,154 (very dense inner city, e.g., parts of Islington/Tower Hamlets)
- Average: 10,172
- Median: 8,953

**Source documentation:** `data/SOURCES_CHOROPLETH.md`

---

## Choropleth Data — Household Income (2026-05-02)

### DAT-258: Research Complete — LSOA-level Household Income NOT Available from ONS

**Finding:** ONS "Income estimates for small areas" are published at **MSOA level only** (5,000–15,000 people per MSOA, ~7,264 MSOAs in England and Wales). LSOA-level (1,000–3,000 people) income estimates are NOT produced by ONS.

**Known source:** HMRC "PAYE median income by LSOA" exists but URL not located (searched 2026-05-02).
**Commercial option:** CACI PayCheck (£)
**Interim workaround:** `imd_score` (Income Deprivation component of IMD) as proxy.

**See:** task DAT-258 notes in `tasks/tasks.json` for full research log and next steps.

---

## ONS Dataset Discovery Notes (2026-05-02)

### Finding ONS Download URLs
ONS dataset download pages require JavaScript rendering. To find direct download URLs:
1. Navigate to ONS dataset page (e.g., `https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/lowersuperoutputareapopulationdensity`)
2. View page source or fetch HTML
3. Search for `"/file?uri=..."` patterns — these are the actual download URLs
4. Pattern: `https://www.ons.gov.uk/file?uri={path}/{dataset}/{version}/...`

**LSOA Population Density downloads:**
- `mid2022revisednov2025tomid2024/sapelsoapopulationdensity20222024.xlsx` — 3.7 MB, mid-2022 to mid-2024 (recommended)
- `mid2021andmid2022/sapelsoapopdensitytablefinal.xlsx` — Census 2021-based

**ONS API:** `api.beta.ons.gov.uk` has 337 datasets — does NOT include all ONS datasets.
Best approach: Navigate ONS website to find dataset page → view source → find download URL.

**London LSOAs** have LAD codes starting with `E09` (e.g., E09000012 = Camden).
**England LSOAs** have codes starting with `E01`.
**Wales LSOAs** have codes starting with `W01`.



---

## Portal Status Detection (2026-04-26)

### Rightmove Status Check — WRONG method vs CORRECT method
**Discovered:** 2026-04-26  
**Symptom:** 27 properties incorrectly flagged as "SOLD" when checking Rightmove.

**Wrong method:** Grepping for "sold" text in page content:
```bash
curl -s "https://www.rightmove.co.uk/properties/$ID" | grep -i "sold"
# WRONG - "sold" appears in ALL pages (nav links like "Sold house prices")
```

**Correct method:** Look for "This property has been" message:
```bash
curl -s "https://www.rightmove.co.uk/properties/$ID" | grep -qi "This property has been"
if [ $? -eq 0 ]; then
  echo "REMOVED/SOLD"
else
  echo "ACTIVE"
fi
```

**Root cause:** Rightmove pages always contain "sold house prices" in navigation, causing false positives.

**See:** `PROTOCOLS/11_PORTAL_STATUS_CHECK.md` for full detection methods per portal.

---

## Cross-Property URL Contamination (2026-04-26)

### Glenmore Road Contamination — Two Different Properties, One URL
**Discovered:** 2026-04-26  
**Symptom:** Two properties shared the same Rightmove URL but were completely different units.

**Records involved:**
- `zo-70438237`: £675k, SoFH, 714 sqft, 2bd/1ba — correct Zoopla link
- `13cb1730`: £800k, Leasehold 999yr, 675 sqft, 2bd/2ba — had contaminated Rightmove link

**Both claimed Rightmove URL `169488674`** but:
- That URL points to a 2-bed/2-bath at £800k
- One record was a 2-bed/1-bath at £675k

**Fix applied (2026-04-26):**
1. Removed contaminated link from `zo-70438237`
2. Created new record `57a9ecac...` for the correct Rightmove property
3. Updated `PROTOCOLS/07_DUPLICATE_DETECTION.md` with Step 0 for similar property checks

**Prevention (NEW):** Before any import, verify:
- URL is unique to this property (not in any other record)
- Address + postcode + sqft + bedrooms match the URL's actual content
- Tenure is consistent with the URL's listing

---

## Scripts / Data Bugs

### `datetime('now')` in better-sqlite3 prepared statements (CRITICAL)
**Discovered:** 2026-04-19  
**Applies to:** `scripts/capture_zoopla_images.js`  
**Symptom:** `SqliteError: no such column: "now"` when using `datetime('now')` with `.run()` parameter binding.

**Root cause:** better-sqlite3 treats `'?'' as an identifier, not a string literal. `datetime(?), 'now'` passes `now` as a bare identifier. The statement never errors on PREPARE (SQLite prepares it), only on RUN.

**Fix:** Use `datetime(?), 'now'` — pass `'now'` as a parameter value:
```javascript
// WRONG — causes SqliteError at runtime
db.prepare("... VALUES (?, datetime('now'), ?)").run(a, b);

// CORRECT
db.prepare("... VALUES (?, datetime(?), ?)").run(a, 'now', b);
```

**Scope:** Only `capture_zoopla_images.js` uses this pattern. All other scripts use direct datetime literals (no parameterization) and are unaffected.

---

### `capture_zoopla_images.js` propertyId UUID mismatch (CRITICAL)
**Discovered:** 2026-04-19  
**Symptom:** `SqliteError: FOREIGN KEY constraint failed` on every image insert.

**Root cause:** Script was using `propertyId = 'zo-' + zooplaId` for the DB foreign key, but imported properties use UUIDs (e.g., `b0e9c67e-...`). Files were saved to `data/images/zo-70438237/` but DB entries referenced non-existent `zo-70438237` property records.

**Fix:** Always pass the internal property UUID as the 2nd argument:
```bash
node scripts/capture_zoopla_images.js 70438237 b0e9c67e-668e68a0b2ba-31c0d3b7
```
Usage string updated: `node scripts/capture_zoopla_images.js <zoopla_id> [internal_property_id]`

**Effect:** b0e9c67e, a2b981dd, 01b5130d all had 0 images despite having `image_url` pointing to stale remote zoocdn URLs. Fixed by re-running capture with correct UUIDs.

---

## Enrichment Notes

### Zoopla detail page — beds/baths sourcing
- `numBeds` JSON field absent from server-rendered HTML (not available without JS)
- Fall back to `og:title` regex: `/(\d+)\s*bed/i`
- Bathrooms: extract from listing spec JSON embedded in HTML, fallback to listing spec text

### Alpha score recalculation — watchlist/shortlisted
- Recalculated all 17 watchlist/shortlisted properties 2026-04-19
- Formula: tenure (40%) + spatial (30%) + price_efficiency (30%)
- All scores recalculated using inline formula from `import_comparables.js`
- Area benchmarks: Belsize Park £12k/sqm, Islington £11k/sqm, others £10-10.5k/sqm

### Watchlist DOM update
- DOM recalculated from `price_history` for all watchlist/shortlisted properties
- 4 properties with null DOM fixed: man-0402-01805 (15d), man-0402-79113 (15d), ps-2cdf2f33 (74d), 35e20765... (7d)
- 3 properties still null DOM: zo-72878094, zo-72798843, zo-72936048 (no listing date in price_history)

### Bedroom corrections applied (2026-04-19)
- zo-72878094: baths 1→2 (listed as 2 bath)
- man-0402-79113: baths 1→2 (listed as 2 bath)
- 35e20765-5d38-46ae-90d4-ff00a06e024c: beds 1→2 (listing upgraded from 1-bed to 2-bed)

---

## FlareSolverr Notes

### Node `http` module — socket hang up
Node's built-in `http` module causes intermittent `socket hang up` errors when proxying through FlareSolverr. Use curl subprocess instead:
```bash
echo '{"cmd":"request.get","url":"...","maxTimeout":90000,"session":"..."}' > /tmp/fs_req.json
curl -s -X POST http://nas.home:8191/v1 -d @/tmp/fs_req.json
```

### Session naming
Use unique session names per campaign to avoid Cloudflare escalating against reused sessions.
