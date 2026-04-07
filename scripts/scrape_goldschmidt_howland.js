const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  const allListings = [];
  
  const searches = [
    { area: 'West Hampstead', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-west-hampstead?layout=list&page=1' },
    { area: 'West Hampstead', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-west-hampstead?layout=list&page=2' },
    { area: 'West Hampstead', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-west-hampstead?layout=list&page=3' },
    { area: 'Islington', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-islington?layout=list&page=1' },
    { area: 'Islington', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-islington?layout=list&page=2' },
    { area: 'Bayswater', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-bayswater?layout=list&page=1' },
    { area: 'Bayswater', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-bayswater?layout=list&page=2' },
    { area: 'Chelsea', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-chelsea?layout=list&page=1' },
    { area: 'Chelsea', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-chelsea?layout=list&page=2' },
    { area: 'Hampstead', url: 'https://g-h.co.uk/sales/2-bedroom-properties-between-500000-and-1000000-for-sale-in-hampstead-belsize-park?layout=list&page=1' },
  ];
  
  console.log('=== G&H Lead Generation ===\n');
  
  for (const search of searches) {
    const page = await context.newPage();
    
    try {
      console.log(`Loading ${search.area}...`);
      await page.goto(search.url, { waitUntil: 'load', timeout: 60000 });
      
      try {
        await page.waitForSelector('.propertyListItem', { timeout: 20000 });
      } catch(e) {}
      
      await page.waitForTimeout(3000);
      
      const listings = await page.evaluate(() => {
        const items = document.querySelectorAll('.propertyListItem');
        const results = [];
        
        for (const item of items) {
          try {
            const links = item.querySelectorAll('a');
            let url = null;
            for (const link of links) {
              const href = link.getAttribute('href');
              if (href && href.startsWith('sales/')) {
                url = 'https://g-h.co.uk/' + href;
                break;
              }
            }
            
            const img = item.querySelector('img');
            const image = img ? 'https://g-h.co.uk' + img.getAttribute('src') : null;
            
            const h3 = item.querySelector('h3');
            const address = h3 ? h3.textContent.trim() : null;
            
            const priceEl = item.querySelector('.propertyCaption p');
            const priceText = priceEl ? priceEl.textContent.trim() : null;
            let price = null;
            if (priceText) {
              const match = priceText.match(/£([\d,]+)/);
              if (match) price = parseInt(match[1].replace(/,/g, ''));
            }
            
            const details = item.querySelectorAll('.details li');
            const beds = details[0] ? parseInt(details[0].textContent.trim()) : null;
            
            let postcode = null;
            if (address) {
              const pcMatch = address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i);
              if (pcMatch) postcode = pcMatch[0].toUpperCase().replace(/\s+/g, ' ');
            }
            
            if (url || address) {
              results.push({
                url,
                image,
                address,
                price,
                price_text: priceText,
                beds,
                postcode,
                area: search.area,
                source: 'Goldschmidt & Howland'
              });
            }
          } catch(e) {}
        }
        
        return results;
      });
      
      const pageNum = search.url.match(/page=(\d)/)?.[1] || '1';
      console.log(`  Found ${listings.length} listings`);
      allListings.push(...listings);
      
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
    
    await page.close();
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await browser.close();
  
  // Deduplicate
  const seen = new Set();
  const unique = allListings.filter(l => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
  
  console.log(`\n=== Total: ${unique.length} unique listings ===\n`);
  
  for (const l of unique) {
    const priceStr = l.price ? `£${l.price.toLocaleString()}` : 'N/A';
    console.log(`[${l.area}] ${l.address} - ${priceStr} (${l.beds} beds) ${l.postcode || ''}`);
    if (l.url) console.log(`  URL: ${l.url}`);
  }
  
  fs.writeFileSync('/workspaces/propSearch/data/leads_goldschmidt_howland.json', JSON.stringify(unique, null, 2));
  console.log('\nSaved to data/leads_goldschmidt_howland.json');
  
  const qualified = unique.filter(l => l.price && l.price >= 500000 && l.price <= 800000 && l.beds <= 2);
  console.log(`\nQualified (≤2 beds, £500k-£800k): ${qualified.length}`);
  
  // Import qualified leads
  if (qualified.length > 0) {
    console.log('\n=== Importing to database ===\n');
    // Import logic would go here
  }
}

main().catch(console.error);
