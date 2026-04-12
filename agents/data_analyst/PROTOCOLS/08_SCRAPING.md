# Research & Scraping Assets
*Reference from: agents/data_analyst/README.md — section "Research Assets"*

## FlareSolverr (LOCAL NETWORK)
Primary enrichment tool for all Cloudflare-blocked portals. Reads `FLARESOLVR_URL` from `.env.local` (HTTP, port 8191). Run `scripts/scrape_visuals.js` for structured extraction or use inline Node.js HTTP calls for ad-hoc enrichment. **Do not hardcode the URL in any file — always read from env var.**

### Standard call pattern (always use `http`, port 8191):
```javascript
const http = require('http');
const base = new URL(process.env.FLARESOLVR_URL || 'http://localhost:8191');
const body = JSON.stringify({cmd:'request.get', url: targetUrl, maxTimeout: 90000, session: process.env.FLARESOLVR_SESSION || 'propSearch'});
const opts = {hostname: base.hostname, port: base.port||8191, path:'/v1', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
// ...
```

### Zoopla extraction (after unescape):
```javascript
const clean = html.split('\\\"').join('"');
const sqft  = clean.match(/"floorArea":\s*\{[^}]*?"value":\s*(\d+)/)?.[1]
          || clean.match(/"sizeSqft":\s*"?(\d+)"?/)?.[1];
const beds  = clean.match(/"numBedrooms":\s*(\d)/)?.[1];
const tenure = clean.match(/"tenureType":\s*"([^"]+)"/)?.[1];
const epc   = clean.match(/"efficiencyRating":\s*"([A-G])"/)?.[1];
const postcode = clean.match(/"postalCode":\s*"([^"]+)"/)?.[1];
```

### Key limitations:
- Zoopla `floorArea` is `null` for ~20% of listings — try alternate listings at same address or EPC register
- Rightmove search pages are dynamically loaded — use Rightmove detail pages (`/property/{id}.html`) not search results
- Agent-direct websites often block FlareSolverr — try alternate sources
- Jitty renders as dynamic JS shell — check rendered body text for sqft, postcode; images not extractable via HTML alone

---

## Rightmove Scraping (2026-04-10 Verified — Complete Rewrite)

### Two-Phase Approach

Rightmove has **two distinct rendering patterns** requiring different extraction methods:

| Page Type | Extraction Method | URL Format |
|-----------|------------------|------------|
| **Search results** (`/property-for-sale/...`) | `__NEXT_DATA__` JSON blob | `.html` suffix required |
| **Detail pages** (`/properties/{id}`) | `window.PAGE_MODEL.propertyData` | **NO `.html` suffix** |

### Phase 1: Search Results — `__NEXT_DATA__` Extraction

```javascript
const { chromium } = require('playwright');

async function scrapeRightmoveSearch(url) {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000); // Wait for React hydration

  const nextData = await page.evaluate(() => {
    const script = document.getElementById('__NEXT_DATA__');
    return script ? JSON.parse(script.textContent) : null;
  });

  await browser.close();

  if (!nextData?.props?.pageProps?.searchResults?.properties) return [];

  return nextData.props.pageProps.searchResults.properties.map(prop => ({
    source_id:  `rm-${prop.id}`,
    address:    prop.displayAddress,
    list_price: prop.price?.amount || prop.price,
    bedrooms:   prop.bedrooms,
    bathrooms:  prop.bathrooms,
    summary:    prop.summary,
    link:       `https://www.rightmove.co.uk/properties/${prop.id}`,
    image_url:  prop.images?.[0]?.srcUrl || null,
    lat:        prop.location?.latitude,
    lon:        prop.location?.longitude
  }));
}
```

### Phase 2: Detail Pages — `PAGE_MODEL.propertyData` Extraction

> ⚠️ **CRITICAL FIX (2026-04-10):** Rightmove detail pages use `window.PAGE_MODEL.propertyData` — NOT `__NEXT_DATA__`. The `__NEXT_DATA__` ID does not exist on detail pages. Also, the `.html` suffix returns "property not found" — use bare `/properties/{id}` format.

```javascript
const { chromium } = require('playwright');

async function enrichRightmoveDetail(propertyId, baseLeadData) {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();

  // URL FORMAT: /properties/{id} — NO .html suffix!
  await page.goto(`https://www.rightmove.co.uk/properties/${propertyId}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(10000); // 10s for full React render

  const propertyData = await page.evaluate(() => {
    const pd = window.PAGE_MODEL?.propertyData;
    if (!pd) return null;
    return {
      bedrooms:           pd.bedrooms,
      bathrooms:           pd.bathrooms,
      sqft:               pd.sizings?.find(s => s.unit === 'sqft')?.minimumSize || null,
      sqm:                pd.sizings?.find(s => s.unit === 'sqm')?.minimumSize || null,
      postcode:            pd.address ? (pd.address.outcode + ' ' + pd.address.incode) : null,
      tenureType:         pd.tenure?.tenureType || null,
      yearsRemaining:     pd.tenure?.yearsRemainingOnLease || null,
      floorLevel:         pd.entranceFloor || null, // Fallback: parse keyFeatures
      propertyType:       pd.propertySubType || null,
      councilTaxBand:      pd.livingCosts?.councilTaxBand || null,
      annualServiceCharge: pd.livingCosts?.annualServiceCharge || null,
      annualGroundRent:    pd.livingCosts?.annualGroundRent || null,
      floorplanUrl:       pd.floorplans?.[0]?.url || null,
      epcGraphUrl:        pd.epcGraphs?.[0]?.url || null,
      images:              pd.images?.slice(0, 5).map(img => img.url) || [],
      lat:                 pd.location?.latitude || null,
      lon:                 pd.location?.longitude || null,
      nearestTube:         pd.nearestStations?.[0]?.name || null,
      nearestTubeMetres:   pd.nearestStations?.[0]?.distance ? Math.round(pd.nearestStations[0].distance * 1609.34) : null,
      agent:               pd.customer?.branchDisplayName || null,
      agentPhone:          pd.customer?.contactInfo?.telephoneNumbers?.localNumber || null,
      keyFeatures:        pd.keyFeatures || [],
      description:         pd.text?.description || null,
      listingUpdate:       pd.listingHistory?.listingUpdateReason || null
    };
  });

  await browser.close();
  return propertyData;
}
```

### `PAGE_MODEL.propertyData` Full Schema (2026-04-10)

```
window.PAGE_MODEL.propertyData
├── bedrooms              ← Integer
├── bathrooms             ← Integer
├── prices.primaryPrice   ← "£765,000" string
├── prices.pricePerSqFt  ← "£1388.38 per sq ft"
├── sizings[]            ← [{unit: "sqft", minimumSize: 551, maximumSize: 551}, ...]
├── address.outcode      ← "SW3"
├── address.incode       ← "2DB"
├── tenure.tenureType    ← "LEASEHOLD" | "FREEHOLD" | "SHARE_OF_FREEHOLD"
├── tenure.yearsRemainingOnLease ← Integer
├── entranceFloor        ← null for most; fallback to keyFeatures parse
├── nearestStations[]    ← [{name, types, distance (miles), unit}]
├── livingCosts.annualServiceCharge
├── livingCosts.annualGroundRent
├── livingCosts.councilTaxBand
├── floorplans[].url
├── epcGraphs[].url
├── images[].url
├── keyFeatures[]        ← Array of strings e.g. "Second Floor (Lift)", "Two Bedrooms"
└── text.description     ← Full HTML description
```

### Floor Level Fallback (when `entranceFloor` is null)
```javascript
const floorLevel = pd.entranceFloor ||
  pd.keyFeatures?.join(' ').match(/\b(ground|first|second|third|fourth|fifth|sixth|seventh|top|penthouse|lower\s+ground|gallery)\s+floor\b/i)?.[0];
```

### Rightmove URL Patterns

| Phase | Area | URL Pattern |
|-------|------|-------------|
| Search | Chelsea | `https://www.rightmove.co.uk/property-for-sale/Chelsea/london.html?minPrice=500000&maxPrice=775000&minBedrooms=2&maxBedrooms=2&radius=0.5` |
| Search | SW10 | Same with `radius=0.25` for tighter Chelsea SW10 focus |
| Detail | Any | `https://www.rightmove.co.uk/properties/{id}` ← **NO `.html`** |

**IMPORTANT:** `locationIdentifier=REGION%5E...` format returns 0 results. Always use keyword-based paths.

### Known Gotchas

1. **`.html` suffix on detail pages = "property not found"** — always use `https://www.rightmove.co.uk/properties/{id}` without `.html`
2. **`__NEXT_DATA__` does not exist on detail pages** — always use `window.PAGE_MODEL.propertyData`
3. **`propertyData` may be empty `{}` if page hasn't fully hydrated** — always wait 10s after `networkidle`
4. **FlareSolverr cannot extract Rightmove detail page data** — returns empty `propertyData`. Always use Playwright for detail pages.
5. **Rightmove search pages DO use `__NEXT_DATA__`** — use the search scraper for discovery, Playwright PAGE_MODEL for enrichment.
6. **Pagination on search** — add `&index=24` for page 2, `&index=48` for page 3, etc. (24 results per page).
7. **`prop.price` may be an object `{amount: 750000}` not a raw number** — always use `prop.price?.amount`.

---

## Goldschmidt & Howland Scraping

G&H uses standard CSS selectors but results may be sparse depending on their inventory.

### Verified Selector Pattern

```javascript
const listings = await page.evaluate(() => {
  const items = document.querySelectorAll('.propertyListItem');
  return Array.from(items).map(item => ({
    url: item.querySelector('a[href^="sales/"]')?.href ? 'https://g-h.co.uk/' + item.querySelector('a[href^="sales/"]').getAttribute('href') : null,
    image: item.querySelector('img')?.src ? 'https://g-h.co.uk' + item.querySelector('img').getAttribute('src') : null,
    address: item.querySelector('h3')?.textContent?.trim(),
    price: parseInt(item.querySelector('.propertyCaption p')?.textContent?.match(/£([\d,]+)/)?.[1]?.replace(/,/g, '') || '0'),
    beds: parseInt(item.querySelector('.details li')?.[0]?.textContent?.trim() || '0'),
    postcode: /* extract from address with regex */
  }));
});
```

### G&H URL Patterns

| Search | URL |
|--------|-----|
| Chelsea 2+ bed £500k-£800k | `https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-800000-for-sale-in-chelsea?layout=list&page=1` |
| West Hampstead | `https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-west-hampstead?layout=list&page=1` |

---

## Other Research Assets

- **Metric Definitions:** See `agents/ui_ux_qa/METRIC_DEFINITIONS.md` for formal Alpha Score and market metric methodology.
- **Lead Enrichment Script:** Run `agents/data_analyst/enrich_leads.js` to automatically enrich inbox leads with visuals via the scraper.

## External Data Research Workflow

To fulfill the "Empirical Standard", the Analyst MUST use search and fetch tools to enrich every asset:

1. **Listing Discovery & Verification:** Use `google_web_search` and `web_fetch` to find the original estate agent listing. Verify the listing is still 'For Sale'. For duplicates: add the new agent-direct link to the existing record's `links` array.
2. **High-Res Asset Extraction:** Use `web_fetch` to extract `PAGE_MODEL` or `__NEXT_DATA__` from portal URLs.
3. **Spatial Metrics:** Use `google_web_search` or map tools to calculate `nearest_tube_distance`, `park_proximity`, and commute times.
4. **Financial Indicators:** Use `google_web_search` to find BoE Base Rates, mortgage rates for LTV bands (75%, 80%, 90%), and MPC meeting dates for `macro_trend.json`.
5. **Market Context:** Maintain `data/macro_trend.json` by researching London-wide HPI, inventory velocity, and area-specific trends.

**Pro-Tool Tip:** For any URL given, prioritize fetching the content and parsing its internal JSON structures before falling back to textual analysis.
