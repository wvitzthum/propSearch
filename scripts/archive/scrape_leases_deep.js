
const { chromium } = require('playwright');
const fs = require('fs');

const MISSING = [
  { addr: 'Lofting Road, Islington N1', url: 'https://www.zoopla.co.uk/for-sale/details/72566261/' },
  { addr: 'Pentonville Road, Angel N1', url: 'https://www.zoopla.co.uk/for-sale/details/72556280/' },
  { addr: 'Hoxton Square, London N1', url: 'https://www.zoopla.co.uk/for-sale/details/72543070/' },
  { addr: 'Wellesley Terrace, Angel N1', url: 'https://www.zoopla.co.uk/for-sale/details/71733465/' },
  { addr: 'Queens Court, Queensway W2', url: 'https://www.zoopla.co.uk/for-sale/details/72565797/' },
  { addr: 'Kendal Steps, Marble Arch W2', url: 'https://www.zoopla.co.uk/for-sale/details/72537410/' },
  { addr: 'Leinster Gardens, London W2', url: 'https://www.zoopla.co.uk/for-sale/details/72516087/' },
];

async function deepExtract(url, addr) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  const result = { address: addr, url: url, lease_years: null, page_status: 'unknown' };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    result.page_status = resp ? resp.status() : 'no_response';
    await page.waitForTimeout(3000);
    
    const content = await page.evaluate(() => {
      // Check if listing exists or page says "no longer available"
      const bodyText = document.body.innerText.toLowerCase();
      const isRemoved = bodyText.includes('no longer available') 
        || bodyText.includes('listing has been removed')
        || bodyText.includes('this property is no longer on');
      
      if (isRemoved) return { isRemoved: true };
      
      // Try all scripts for JSON data
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent;
        // Look for lease data
        const patterns = [
          /(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to run)/i,
          /(?:lease|tenure)[^a-z]*?(\d{3})\s*(?:years?|yrs?)/i,
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m) return { isRemoved: false, lease: parseInt(m[1]), foundIn: 'script' };
        }
      }
      
      // Try meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const text = metaDesc.content;
        const m = text.match(/(\d{3})\s*(?:years?|yrs?)/i);
        if (m) return { isRemoved: false, lease: parseInt(m[1]), foundIn: 'meta' };
      }
      
      return { isRemoved: false, lease: null };
    });
    
    result.is_removed = content.isRemoved;
    if (content.lease) result.lease_years = content.lease;
    result.found_in = content.foundIn || null;
    
  } catch(e) {
    result.error = e.message;
  }
  await browser.close();
  return result;
}

async function main() {
  const results = [];
  for (const item of MISSING) {
    process.stdout.write('[DEEP] ' + item.addr + '... ');
    const r = await deepExtract(item.url, item.addr);
    if (r.lease_years) {
      console.log(r.lease_years + ' yrs (status=' + r.page_status + ', removed=' + r.isRemoved + ')');
    } else if (r.is_removed) {
      console.log('LISTING WITHDRAWN (HTTP ' + r.page_status + ')');
    } else {
      console.log('NOT FOUND (HTTP ' + r.page_status + ')');
    }
    results.push(r);
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Load previous results and merge
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync('scripts/lease_results.json', 'utf8')); } catch(e) {}
  const merged = [...prev, ...results];
  fs.writeFileSync('scripts/lease_results.json', JSON.stringify(merged, null, 2));
  console.log('\nUpdated scripts/lease_results.json');
}
main().catch(console.error);
