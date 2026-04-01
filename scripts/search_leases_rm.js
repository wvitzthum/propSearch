
const { chromium } = require('playwright');
const fs = require('fs');

const SEARCHES = [
  { addr: 'Lofting Road, Islington N1', search: 'Lofting Road Islington N1 flat zoopla' },
  { addr: 'Pentonville Road, Angel N1', search: 'Pentonville Road Angel N1 flat zoopla' },
  { addr: 'Hoxton Square, London N1', search: 'Hoxton Square London N1 flat zoopla' },
  { addr: 'Wellesley Terrace, Angel N1', search: 'Wellesley Terrace Angel London N1 flat' },
  { addr: 'Queens Court Queensway W2', search: 'Queens Court Queensway London W2 flat zoopla' },
  { addr: 'Kendal Steps Marble Arch W2', search: 'Kendal Steps Marble Arch London W2 flat zoopla' },
  { addr: 'Leinster Gardens London W2', search: 'Leinster Gardens Bayswater London W2 flat zoopla' },
];

async function searchRightmove(searchTerm) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    const searchUrl = 'https://www.rightmove.co.uk/properties/search.html?searchLocation=' + encodeURIComponent(searchTerm.split(' ').slice(0,3).join('+'));
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      // Look for "X years" lease mentions
      const m = body.match(/(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to run|on lease)/i);
      if (m) return { lease: parseInt(m[1]), source: 'search_results' };
      
      // Try listing cards
      const cards = document.querySelectorAll('[data-testid="search-result"], .propertyCard');
      for (const card of cards) {
        const text = card.innerText;
        const cm = text.match(/(\d{3})\s*(?:years?|yrs?)/i);
        if (cm) return { lease: parseInt(cm[1]), source: 'listing_card' };
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

async function main() {
  const results = [];
  for (const item of SEARCHES) {
    process.stdout.write('[RM SEARCH] ' + item.addr + '... ');
    const r = await searchRightmove(item.search);
    if (r) {
      console.log(r.lease + ' yrs (' + r.source + ')');
      results.push({ address: item.addr, lease_years: r.lease, source: r.source });
    } else {
      console.log('NOT FOUND');
      results.push({ address: item.addr, lease_years: null, source: 'not_found' });
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Append to existing results
  let prev = JSON.parse(fs.readFileSync('scripts/lease_results.json', 'utf8'));
  fs.writeFileSync('scripts/lease_results.json', JSON.stringify([...prev, ...results], null, 2));
  console.log('Updated.');
}
main().catch(console.error);
