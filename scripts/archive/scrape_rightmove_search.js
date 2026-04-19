/**
 * scrape_rightmove_search.js
 * ===========================
 * Searches Rightmove for listings using Playwright (headless Chrome).
 * Extracts: price, beds, address, property ID, URL.
 * 
 * Usage:
 *   node scripts/scrape_rightmove_search.js <search_url> [area_name]
 *   node scripts/scrape_rightmove_search.js "https://www.rightmove.co.uk/property-for-sale/London/N1.html?maxPrice=700000&minBedrooms=2" "Islington N1"
 *
 * Requires: playwright (npm install playwright)
 * The chromium browser must be installed: npx playwright install chromium
 */

const { chromium } = require('playwright');

const DEFAULT_TIMEOUT = 60000;

async function scrapeRightmove(url, area) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-GB'
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  const page = await context.newPage();
  
  // Capture console errors only
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('Browser error:', msg.text());
  });
  
  console.error(`Navigating: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
  await page.waitForTimeout(3000); // Wait for React hydration
  
  // Extract __NEXT_DATA__ (Next.js data payload)
  const nextData = await page.evaluate(() => {
    const script = document.querySelector('script[id="__NEXT_DATA__"]');
    if (script) {
      try { return JSON.parse(script.textContent); } catch (e) { return null; }
    }
    return null;
  });
  
  const listings = [];
  
  if (nextData && nextData.props && nextData.props.pageProps) {
    const pp = nextData.props.pageProps;
    const results = pp.properties || pp.results || [];
    
    for (const prop of results) {
      listings.push({
        id: prop.id ? String(prop.id) : null,
        price: prop.price?.amount || prop.displayPrice?.replace(/[£,]/g, '') || null,
        address: prop.address || prop.propertyType || '',
        beds: prop.bedrooms || prop.bedroomCount || null,
        baths: prop.bathrooms || prop.bathroomCount || null,
        sqft: prop.squareFootage || null,
        url: prop.propertyUrl ? 'https://www.rightmove.co.uk' + prop.propertyUrl : null,
        area
      });
    }
  }
  
  // Fallback: extract from DOM if __NEXT_DATA__ didn't work
  if (listings.length === 0) {
    const domListings = await page.evaluate(() => {
      const cards = document.querySelectorAll('.propertyCard');
      return Array.from(cards).map(card => {
        const priceEl = card.querySelector('.propertyCard-price .price');
        const bedsEl = card.querySelector('.propertyCard-bed-bath-room span[data-testid="bedroom-value"]');
        const addressEl = card.querySelector('.propertyCard-address');
        const linkEl = card.querySelector('.propertyCard-details a');
        return {
          price: priceEl ? priceEl.textContent.replace(/[£,]/g, '').trim() : null,
          beds: bedsEl ? bedsEl.textContent.trim() : null,
          address: addressEl ? addressEl.textContent.trim() : '',
          url: linkEl ? 'https://www.rightmove.co.uk' + linkEl.getAttribute('href') : null
        };
      });
    });
    
    for (const l of domListings) {
      listings.push({
        id: l.url ? l.url.match(/[0-9]+/)?.[0] || null : null,
        price: l.price ? parseInt(l.price) : null,
        address: l.address,
        beds: l.beds ? parseInt(l.beds) : null,
        url: l.url,
        area
      });
    }
  }
  
  await browser.close();
  return listings.filter(l => l.id && l.price);
}

async function main() {
  const url = process.argv[2];
  const area = process.argv[3] || 'Unknown';
  
  if (!url) {
    console.error('Usage: node scripts/scrape_rightmove_search.js <search_url> [area_name]');
    console.error('Example: node scripts/scrape_rightmove_search.js "https://www.rightmove.co.uk/property-for-sale/London/N1.html?maxPrice=700000&minBedrooms=2" "Islington N1"');
    process.exit(1);
  }
  
  try {
    const listings = await scrapeRightmove(url, area);
    console.error(`Found ${listings.length} listings`);
    console.log(JSON.stringify(listings, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scrapeRightmove };
