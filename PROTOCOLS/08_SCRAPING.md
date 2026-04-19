# Protocol 08: Portal Scraping

## FlareSolverr

**Endpoint:** `http://nas.home:8191/v1`  
**Health check:** `curl http://nas.home:8191/v1` → expects `405 Method not allowed`  
**Env var:** `FLARESOLVR_URL` to override (default `http://nas.home:8191`)

### Request Format

```javascript
{
  cmd: 'request.get',
  url: '<target_url>',
  maxTimeout: 90000,       // milliseconds
  session: '<session_name>' // must be unique per long-running scrape
}
```

### Session Management

- Sessions persist cookies between requests — good for authenticated or Cloudflare-challenged pages.
- **Always use a unique session suffix** for new scrape campaigns (e.g., `ps_campaign_${Date.now()}`).
- To clear a stuck session: `curl -X POST http://nas.home:8191/v1 -d '{"cmd":"sessions.destroy","session":"<name>"}'`
- All sessions can be cleared: repeatedly destroy known session names.
- FlareSolverr version: check `curl -X POST http://nas.home:8191/v1 -d '{"cmd":"ping"}'`

### Reliability Patterns

1. **Use curl subprocess** — Node's built-in `http` module can cause `socket hang up` errors under load. Use `execSync` with a temp file for FlareSolverr requests:

```javascript
function fsGet(url, session) {
  const body = JSON.stringify({cmd:'request.get',url,maxTimeout:90000,session});
  const tmp = '/tmp/fs_req.json';
  FS.writeFileSync(tmp, body);
  try {
    const out = execSync(`curl -s -X POST ${FLARESOLVR}/v1 -H "Content-Type: application/json" -d @${tmp}`,
      {timeout: 100000, maxBuffer: 10*1024*1024});
    const data = JSON.parse(out.toString());
    return data.solution?.response ?? null;
  } catch (e) { return null; }
}
```

2. **Retry once** on failure — most transient issues resolve on retry.
3. **Rate limit:** 600ms between requests to the same domain.
4. **Search pages vs detail pages:** Detail pages are faster to fetch (~15-30s via FlareSolverr). Search pages with Cloudflare challenges may take 60-90s+.

## Zoopla

### Search Page Extraction (Card Data)

Zoopla search pages render listings client-side (React). The HTML contains listing cards with `data-testid="listing-card-content"`.

```javascript
// Split HTML by card boundary, extract fields from each card
const cards = html.split('data-testid="listing-card-content"');
for (const card of cards) {
  const id = card.match(/\/for-sale\/details\/(\d+)\//)?.[1];
  const price = card.match(/price_priceText[^>]*>£([\d,]+)/)?.[1].replace(/,/g,'');
  const beds = card.match(/(\d+)\s*bed/i)?.[1];
  const address = card.match(/ListingDetailsSquareLink[^>]*>([^<]{5,80})/)?.[1].replace(/&amp;/g,'&');
}
```

**⚠️ Card prices are reliable.** The card price `£650,000` extracted from the listing card matches the actual listing price. Do not trust the card's `beds` field for mixed-listing cards (different property types share the same price row).

### Detail Page Extraction

Detail pages contain structured data in meta tags and JSON-LD:

```javascript
// Priority order for price:
1. <meta property="product:price:amount" content="...">  // most reliable
2. <meta property="og:price:amount" content="...">
3. <meta property="og:title" content="..."> — extract £XXX,XXX via regex
4. JSON-LD: ldJson.offers.price

// Other fields:
const beds    = html.match(/"numBeds"\s*:\s*(\d+)/)?.[1];
const baths   = html.match(/"numBaths"\s*:\s*(\d+)/)?.[1];
const sqft    = html.match(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/)?.[1];
const tenure  = html.match(/"tenure"\s*:\s*"([^"]+)"/i)?.[1];
const floor   = html.match(/"floorLevel"\s*:\s*"([^"]+)"/i)?.[1];
const lat     = html.match(/"latitude"\s*:\s*([-\d.]+)/)?.[1];
const lng     = html.match(/"longitude"\s*:\s*([-\d.]+)/)?.[1];
const epc     = html.match(/"currentEnergyRating"\s*:\s*"([A-G])"/i)?.[1];
const sc      = html.match(/"serviceCharge"\s*:\s*"?([\d,]+)/)?.[1];
```

### Image Extraction

```javascript
// Extract all lid.zoocdn.com URLs (dedupe by hash, prefer 1024px+)
const matches = html.match(/lid\.zoocdn\.com\/[^\s"]+/g) || [];
const candidates = {};
for (const raw of matches) {
  const clean = raw.replace(/&amp;/g,'&').replace(/:\s*\d+w$/,'');
  const hash = clean.match(/\/([a-f0-9]{32,})\./)?.[1];
  const isHiRes = clean.includes('/1024/') || clean.includes('/1280/');
  if (hash && (!candidates[hash] || isHiRes)) candidates[hash] = clean;
}
```

## Rightmove

Rightmove blocks headless Chrome reliably. Use FlareSolverr if available, or the Rightmove search page with `__NEXT_DATA__` extraction via Playwright.

### Playwright Extraction

```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
// Try __NEXT_DATA__ first
const nextData = await page.evaluate(() => {
  const s = document.querySelector('script[id="__NEXT_DATA__"]');
  return s ? JSON.parse(s.textContent) : null;
});
const props = nextData?.props?.pageProps?.properties || [];
```

## Quick Reference: Search URL Patterns

| Area | URL |
|------|-----|
| Belsize Park NW3 | `https://www.zoopla.co.uk/for-sale/property/nw3/?price=X-Y&bedrooms=2` |
| Islington N1 | `https://www.zoopla.co.uk/for-sale/property/london-n1/?price=X-Y&bedrooms=2` |
| Angel/Upper Street | `https://www.zoopla.co.uk/for-sale/property/upper-street-islington/?price=X-Y&bedrooms=2` |

## Script Locations

- `scripts/scrape_zoopla_search.js` — card-based search extraction
- `scripts/scrape_zoopla_detail.js` — detail page extraction
- `scripts/scrape_rightmove_search.js` — Rightmove search (Playwright)
- `scripts/capture_zoopla_images.js` — image download + DB recording
- `scripts/import_comparables.js` — import with spatial enrichment
