const { chromium } = require('playwright');

const AREA = 'Chelsea';
const OUTCODE = 'SW3';
const URL = `https://www.rightmove.co.uk/property-for-sale/Chelsea/london.html?minPrice=500000&maxPrice=775000&minBedrooms=2&maxBedrooms=2&radius=0.5`;

async function scrapeRightmoveSearch() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
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
  
  console.log('Fetching:', URL);
  
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000); // Wait for React hydration
  
  // Extract __NEXT_DATA__
  const nextData = await page.evaluate(() => {
    const script = document.getElementById('__NEXT_DATA__');
    if (script) return JSON.parse(script.textContent);
    return null;
  });
  
  if (!nextData) {
    console.log('No __NEXT_DATA__ found — page may be blocked');
    await browser.close();
    return [];
  }
  
  const props = nextData?.props?.pageProps?.searchResults?.properties || [];
  const resultCount = nextData?.props?.pageProps?.searchResults?.resultCount || 0;
  const totalPages = nextData?.props?.pageProps?.searchResults?.pagination?.totalPages || 1;
  
  console.log(`Result count: ${resultCount}, Pages: ${totalPages}, Properties on this page: ${props.length}`);
  
  const leads = props.map(prop => {
    const priceObj = prop.price || {};
    const price = priceObj.amount || priceObj;
    const images = prop.images || [];
    const firstImg = images[0]?.srcUrl || images[0]?.url || null;
    
    return {
      source_id: `rm-chelsea-${prop.id}`,
      address: prop.displayAddress || null,
      postcode: extractPostcode(prop.displayAddress),
      list_price: price,
      bedrooms: prop.bedrooms || null,
      bathrooms: prop.bathrooms || null,
      sqft: null, // Will need floorplan scraping
      tenure: null, // Will need detail page scrape
      property_type: prop.propertyType || null,
      epc: null,
      floor_level: null,
      image_url: firstImg,
      link: `https://www.rightmove.co.uk/properties/${prop.id}`,
      summary: prop.summary ? prop.summary.substring(0, 300) : null,
      lat: prop.location?.latitude || null,
      lon: prop.location?.longitude || null,
      source: 'rightmove_search',
      date_scraped: new Date().toISOString().split('T')[0]
    };
  });
  
  console.log('\n=== SCRAPED LEADS ===');
  leads.forEach((l, i) => {
    console.log(`\n[${i+1}] ${l.address}`);
    console.log(`    Price: £${l.list_price?.toLocaleString()} | Beds: ${l.bedrooms} | Baths: ${l.bathrooms}`);
    console.log(`    Type: ${l.property_type} | Postcode: ${l.postcode}`);
    console.log(`    Link: ${l.link}`);
    console.log(`    Image: ${l.image_url ? 'YES' : 'NO'}`);
    console.log(`    Coords: ${l.lat}, ${l.lon}`);
    if (l.summary) console.log(`    Summary: ${l.summary.substring(0, 120)}...`);
  });
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('/tmp/chelsea_rightmove_leads.json', JSON.stringify(leads, null, 2));
  console.log(`\nSaved ${leads.length} leads to /tmp/chelsea_rightmove_leads.json`);
  
  await browser.close();
  return leads;
}

function extractPostcode(address) {
  if (!address) return null;
  // Match UK postcode pattern
  const match = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
  return match ? match[0].toUpperCase() : null;
}

scrapeRightmoveSearch().catch(console.error);
