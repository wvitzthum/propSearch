
const { chromium } = require('playwright');
const fs = require('fs');

const PROPS = [
  { uid: 'f6911aa8', addr: 'Belsize Avenue, London NW3', sqft: 938, postcode: 'NW3' },
  { uid: '91d727d9', addr: 'Coleridge Court, Dibden Street, Islington N1', sqft: 780, postcode: 'N1' },
  { uid: 'cbbddd70', addr: 'Hillmarton Road, London N7', sqft: 864, postcode: 'N7' },
  { uid: 'b2c3d4e5', addr: 'Blackthorn Avenue, Arundel Square, London N1', sqft: 948, postcode: 'N1' },
  { uid: 'e5f6a7b8', addr: 'Weech Road, London NW6', sqft: 786, postcode: 'NW6' },
  { uid: 'c250e495', addr: 'Hatherley Grove, Bayswater, London W2', sqft: 538, postcode: 'W2' },
];

async function searchByAddress(prop) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  
  try {
    const searchQuery = prop.addr.replace(/,/g, '').replace(/  /g, ' ').trim();
    const searchUrl = 'https://www.rightmove.co.uk/properties/#/?searchLocation=' + encodeURIComponent(searchQuery.split(' ').slice(0, 4).join('+')) + '&locationIdentifier=&useLocationIdentifier=false';
    
    await page.goto('https://www.rightmove.co.uk/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    // Type in search box
    try {
      await page.fill('#searchLocation', searchQuery, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    } catch(e) {}
    
    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      // Look for bedroom in results
      const patterns = [
        /(\d)\s*(?:bed|bedroom)/i,
        /bed(?:room)?s?\s*:?\s*(\d)/i,
      ];
      for (const p of patterns) {
        const m = body.match(p);
        if (m) return parseInt(m[1]);
      }
      return null;
    });
    
    await browser.close();
    return result;
  } catch(e) {
    await browser.close();
    return null;
  }
}

async function tryRightmoveDirect(uid, addr, sqft) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  
  try {
    // Try searching via rightmove search
    const searchTerms = addr.replace(/,/g, ' ').replace(/  /g, ' ').trim();
    await page.goto('https://www.rightmove.co.uk/property-for-sale/search.html?searchLocation=' + encodeURIComponent(searchTerms) + '&useLocationIdentifier=false', 
      { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(() => {
      // Get first listing card
      const card = document.querySelector('.propertyCard, [data-testid="search-result"], .l-searchResult');
      if (!card) return null;
      const text = card.innerText;
      const m = text.match(/(\d)\s*(?:bed|bedroom)/i);
      if (m) return parseInt(m[1]);
      
      // Also try URL
      const link = card.querySelector('a');
      return link ? { hasCard: true, href: link.href } : { hasCard: true };
    });
    
    await browser.close();
    return result;
  } catch(e) {
    await browser.close();
    return null;
  }
}

async function main() {
  const results = [];
  for (const prop of PROPS) {
    process.stdout.write('[RM] ' + prop.addr + '... ');
    const r = await tryRightmoveDirect(prop.uid, prop.addr, prop.sqft);
    if (r && r.bedrooms) {
      console.log(r.bedrooms + ' bed(s)');
      results.push({ uid: prop.uid, addr: prop.addr, bedrooms: r.bedrooms });
    } else if (r && r.hasCard && r.href) {
      console.log('FOUND card, href=' + r.href.substring(0, 60));
      // Try to get bedrooms from the href
      const bedrooms = await getBedroomsFromUrl(r.href);
      if (bedrooms) {
        results.push({ uid: prop.uid, addr: prop.addr, bedrooms: bedrooms });
      } else {
        results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null, href: r.href });
      }
    } else {
      console.log('NOT FOUND');
      results.push({ uid: prop.uid, addr: prop.addr, bedrooms: null });
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  
  fs.writeFileSync('/workspaces/propSearch/scripts/bedroom_offmarket_results.json', JSON.stringify(results, null, 2));
  console.log('\nSaved.');
}

async function getBedroomsFromUrl(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0' });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const bedrooms = await page.evaluate(() => {
      const body = document.body.innerText;
      const m = body.match(/(\d)\s*(?:bed(?:room)?s?)\b/i);
      return m ? parseInt(m[1]) : null;
    });
    await browser.close();
    return bedrooms;
  } catch(e) {
    await browser.close();
    return null;
  }
}

main().catch(console.error);
