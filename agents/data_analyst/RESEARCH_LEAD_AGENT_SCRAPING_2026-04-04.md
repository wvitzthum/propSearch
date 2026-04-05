# Lead Agent Scraping Research

**Date:** 2026-04-04  
**Task:** Extract leads from agent websites directly  
**Target:** Goldschmidt & Howland (g-h.co.uk), Purplebricks

---

## Purplebricks: ✅ Successfully Scraped

### Approach
Used FlareSolverr proxy with Next.js SSR data extraction.

### Method
1. Request page via FlareSolverr (bypasses Cloudflare)
2. Parse `__NEXT_DATA__` embedded JSON from SSR response
3. Extract `properties` array from `ssrResultData`
4. Map to internal lead format

### Discovery
```javascript
// URL pattern
https://www.purplebricks.co.uk/search/property-for-sale/greater-london/{area}?page=1&priceFrom=500000&priceTo=800000&bedroomsFrom=1

// Key extraction point
const data = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)[1]);
const properties = data.props.pageProps.ssrResultData.properties;

// Property fields
{
  id: 1724954,
  title: "2 bedroom apartment",
  address: "40 Melville Place, London, N1 8ND",
  marketPrice: 735000,
  image: { mediumImage: "...", imageCount: 14 },
  description: "...",
  postcode: "N1 8ND"
}
```

### Results
- **17 qualified leads imported** (all within price range)
- Areas covered: Chelsea, Islington, West Hampstead, Bayswater, Notting Hill
- Images extracted directly from listing data

### Code Snippet
```javascript
async function scrapePurplebricks(url, area) {
  const html = await scrapeWithFlaresolverr(url);
  
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  const data = JSON.parse(match[1]);
  const properties = data.props.pageProps.ssrResultData.properties;
  
  return properties.map(p => ({
    id: `pb-${p.id}`,
    address: p.address,
    price: p.marketPrice,
    image_url: p.image?.mediumImage,
    url: `https://www.purplebricks.co.uk/property-for-sale/${p.id}`
  }));
}
```

### Search URLs Used
```
Chelsea:       https://www.purplebricks.co.uk/search/property-for-sale/greater-london/chelsea
South Kensington: https://www.purplebricks.co.uk/search/property-for-sale/greater-london/south-kensington
Islington:     https://www.purplebricks.co.uk/search/property-for-sale/greater-london/islington
Holloway:      https://www.purplebricks.co.uk/search/property-for-sale/greater-london/holloway
West Hampstead: https://www.purplebricks.co.uk/search/property-for-sale/greater-london/west-hampstead
Belsize Park:  https://www.purplebricks.co.uk/search/property-for-sale/greater-london/belsize-park
Hampstead:     https://www.purplebricks.co.uk/search/property-for-sale/greater-london/hampstead
Notting Hill:  https://www.purplebricks.co.uk/search/property-for-sale/greater-london/notting-hill
Bayswater:     https://www.purplebricks.co.uk/search/property-for-sale/greater-london/bayswater
```

### Qualifying Criteria Applied
- Price: £500,000 - £800,000
- Bedrooms: 1-2 (including 1 bed with box room)
- Location: Target postcodes (NW1, NW3, NW6, W2, SW3, SW10)

---

## Goldschmidt & Howland: ❌ Blocked by SPA Rendering

### Issue
G&H uses **pure SPA (Single Page Application)** rendering where:
1. Initial HTML is just the cookie banner
2. React app loads and fetches data client-side
3. Listings are not present in static HTML response

### Evidence
```bash
# Initial response (83KB) contains only:
- Cookie banner
- CSS styles
- Empty body with React mount point
- No property listings
```

### What Was Tried
1. ✅ FlareSolverr (gets past Cloudflare but returns empty listing container)
2. ✅ FlareSolverr with cookies (still SPA issue)
3. ❌ Direct sitemap - only contains static pages, no property URLs
4. ❌ API endpoint guessing - no public API discovered
5. ❌ HTML pattern matching - no listing data in response

### Page Response Analysis
```html
<!-- This is ALL that renders server-side -->
<html>
<head><!-- CSS, meta tags --></head>
<body>
  <div id="cookie-consent">Cookie Policy...</div>
  <!-- No listings rendered -->
  <div id="root"></div>
  <!-- React bundle loads here -->
</body>
</html>
```

### Required Approach: Full Browser Automation

To scrape G&H requires running a real browser that:
1. Executes all JavaScript
2. Waits for React to hydrate
3. Waits for API calls to complete
4. Captures rendered DOM

Options:
1. **Playwright with FlareSolverr proxy** - Configure Playwright to route through FlareSolverr
2. **Playwright with stealth mode** - Launch own browser, set realistic fingerprints
3. **Puppeteer with FlareSolverr headers** - Similar to Playwright approach

---

## Next Steps: G&H Browser Automation

### Option 1: Playwright + FlareSolverr Proxy

```javascript
const { chromium } = require('playwright');

async function scrapeWithBrowser(url) {
  const browser = await chromium.launch({ headless: true });
  
  // Route through FlareSolverr proxy
  const context = await browser.newContext({
    proxy: {
      server: 'http://nas.home:8191',
      username: 'propSearch',
      password: 'propSearch'
    }
  });
  
  const page = await context.newPage();
  
  // Add FlareSolverr session header
  await page.setExtraHTTPHeaders({
    'X-FlareSolverr-Session': 'propSearch'
  });
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Wait for listings to render
  await page.waitForSelector('.property-listing, .listing-card', { timeout: 30000 });
  
  const listings = await page.$$eval('.listing-card', cards => 
    cards.map(card => ({
      url: card.querySelector('a')?.href,
      price: card.querySelector('.price')?.textContent,
      address: card.querySelector('.address')?.textContent
    }))
  );
  
  await browser.close();
  return listings;
}
```

**Issue Found:** Direct proxy routing failed with `ERR_TUNNEL_CONNECTION_FAILED`. Need to investigate proper FlareSolverr integration with Playwright.

### Option 2: FlareSolverr Pre-rendered HTML + DOM Parsing

```javascript
// Instead of using as proxy, get pre-rendered HTML
async function getRenderedHTML(url) {
  const body = JSON.stringify({
    cmd: 'request.get',
    url,
    maxTimeout: 90000 * 1000,
    session: 'propSearch',
    cookies: [] // Optional: pass stored cookies
  });
  
  const response = await fetch('http://nas.home:8191/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  
  const result = await response.json();
  return result.solution.response; // Pre-rendered HTML
}
```

**Issue:** Returns same empty SPA shell - React hasn't executed yet.

### Option 3: Stealth Browser with Custom Fingerprints

```javascript
const { chromium } = require('playwright');

async function scrapeGHStealth(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-GB'
  });
  
  // Add realistic browser fingerprints
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { 
      get: () => [1, 2, 3, 4, 5] 
    });
  });
  
  const page = await context.newPage();
  
  // Track network requests to find API endpoints
  const apiCalls = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      apiCalls.push(req.url());
    }
  });
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Wait for React to hydrate
  await page.waitForTimeout(3000);
  
  console.log('API calls found:', apiCalls);
  
  await browser.close();
}
```

### Option 4: Intercept API Calls

Since G&H is a React app, it likely makes API calls to fetch listings. We can:
1. Launch browser and monitor network
2. Capture the API endpoint and parameters
3. Replicate API calls directly

```javascript
// Monitor for listing API calls
page.on('request', req => {
  const url = req.url();
  if (url.includes('property') || url.includes('listing') || url.includes('search')) {
    console.log('Found API endpoint:', url);
    // Store for later use
  }
});
```

---

## Investigation Tasks (TODO)

1. **Discover G&H API endpoint**
   - Run Playwright with network monitoring
   - Capture all API calls during page load
   - Identify the endpoint that returns listings

2. **Test stealth browser approach**
   - Launch Playwright without proxy
   - See if Cloudflare blocks direct access
   - If blocked, determine challenge type

3. **Cookie jar approach**
   - Visit homepage first to get cookies
   - Pass cookies to FlareSolverr
   - Request search page with session cookies

4. **Script injection**
   - Use FlareSolverr to get initial HTML
   - Inject JavaScript to trigger API calls
   - Extract data from DOM after hydration

---

## Files Generated

- `data/leads_purplebricks.json` - Raw scraped leads (17 records)
- `data/archive/imports/purplebricks_leads_2026-04-04.json` - Imported records
- `data/demo_master.json` - Updated frontend data (53 records)

---

## Agent Website Patterns Discovered

### Purplebricks
- **Framework:** Next.js (SSR with `__NEXT_DATA__`)
- **Data Location:** `window.__NEXT_DATA__` or `<script id="__NEXT_DATA__">`
- **Key Path:** `props.pageProps.ssrResultData.properties`
- **Bypassed:** Cloudflare via FlareSolverr

### Goldschmidt & Howland
- **Framework:** React SPA (Gatsby or Next.js SPA mode)
- **Data Location:** Fetched client-side after hydration
- **Bypassed:** Cloudflare via FlareSolverr (but SPA issue remains)
- **Solution:** Requires full browser automation or API discovery

---

## Lead Quality

### Purplebricks Leads
| Alpha Score | Count | Notes |
|-------------|-------|-------|
| 9.0 | 8 | Excellent value (price/sqm ratio) |
| 8.0 | 2 | Good value |
| 7.0 | 5 | Moderate value |
| 6.0 | 2 | Borderline (higher price/sqm) |

### Sample High-Quality Leads
1. **Park West Place, W2 2QL** - £539,000 (Alpha: 9.0)
2. **Dalston Square, E8 3GP** - £600,000 (Alpha: 9.0)
3. **Tufnell Park Road, N7** - £575,000 (Alpha: 9.0)
4. **Riffel Road, NW2** - £515,000 (Alpha: 9.0)
