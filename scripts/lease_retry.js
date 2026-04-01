
const { chromium } = require('playwright');
const fs = require('fs');

const PENDING_LEADS = [
  { addr: 'Eton Place, London NW3', postcode: 'NW3', price: 625000, zooplaId: '68090936' },
  { addr: 'Dennington Park Road, London NW6', postcode: 'NW6', price: 675000, zooplaId: '72563501' },
  { addr: 'Lofting Road, London N1', postcode: 'N1', price: 650000, zooplaId: '72566261' },
  { addr: 'Pentonville Road, London N1', postcode: 'N1', price: 775000, zooplaId: '72556280' },
  { addr: 'Gainsborough Studios, 1 Poole Street, London N1', postcode: 'N1', price: 575000, zooplaId: '72265957' },
  { addr: 'Hoxton Square, London N1', postcode: 'N1', price: 599950, zooplaId: '72543070' },
  { addr: 'Wellesley Terrace, London N1', postcode: 'N1', price: 525000, zooplaId: '71733465' },
  { addr: 'Queens Court, Queensway, London W2', postcode: 'W2', price: 700000, zooplaId: '72565797' },
  { addr: 'Kendal Steps, London W2', postcode: 'W2', price: 750000, zooplaId: '72537410' },
  { addr: 'Leinster Gardens, London W2', postcode: 'W2', price: 640000, zooplaId: '72516087' },
];

async function tryZooplaAgain(zooplaId, addr) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    const url = 'https://www.zoopla.co.uk/for-sale/details/' + zooplaId + '/';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    
    // Accept cookies if banner appears
    try {
      const acceptBtn = await page.$('button[data-testid="accept-cookies"], button:has-text("Accept")');
      if (acceptBtn) await acceptBtn.click().catch(() => {});
    } catch(e) {}
    
    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      // Look for lease patterns in full text
      const patterns = [
        /(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to run|to go)/i,
        /(?:lease|tenure)[^a-z]{0,5}(\d{3})\s*(?:years?|yrs?)/i,
        /(?:remaining|left)[^a-z]{0,5}(\d{3})\s*(?:years?|yrs?)/i,
        /(\d{3})-year\s*(?:lease|tenure)/i,
      ];
      for (const p of patterns) {
        const m = body.match(p);
        if (m) {
          return { lease: parseInt(m[1]), match: m[0] };
        }
      }
      // Check if removed
      if (body.includes('no longer available') || body.includes('has been removed') || body.includes('withdrawn')) {
        return { status: 'withdrawn' };
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
  for (const lead of PENDING_LEADS) {
    process.stdout.write('[RETRY] ' + lead.addr + '... ');
    const r = await tryZooplaAgain(lead.zooplaId, lead.addr);
    if (r && r.lease) {
      console.log(r.lease + ' yrs');
      results.push({ ...lead, lease_years: r.lease });
    } else if (r && r.status === 'withdrawn') {
      console.log('WITHDRAWN');
      results.push({ ...lead, lease_years: null, status: 'withdrawn' });
    } else {
      console.log('NOT FOUND');
      results.push({ ...lead, lease_years: null });
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  
  fs.writeFileSync('scripts/lease_retry_results.json', JSON.stringify(results, null, 2));
  console.log('Done. Saved to lease_retry_results.json');
}
main().catch(console.error);
