
const { chromium } = require('playwright');
const fs = require('fs');

const LEADS = [
  { addr: 'Eton Place, Belsize Park NW3', url: 'https://www.zoopla.co.uk/for-sale/details/68090936/' },
  { addr: 'Glenloch Road, London NW3', url: 'https://www.zoopla.co.uk/for-sale/details/72498302/' },
  { addr: 'Dennington Park Road, NW6', url: 'https://www.zoopla.co.uk/for-sale/details/72563501/' },
  { addr: 'Lofting Road, Islington N1', url: 'https://www.zoopla.co.uk/for-sale/details/72566261/' },
  { addr: 'East Road, London N1', url: 'https://www.zoopla.co.uk/for-sale/details/72565150/' },
  { addr: 'Pentonville Road, Angel N1', url: 'https://www.zoopla.co.uk/for-sale/details/72556280/' },
  { addr: 'Gainsborough Studios, N1', url: 'https://www.zoopla.co.uk/for-sale/details/72265957/' },
  { addr: 'Hoxton Square, London N1', url: 'https://www.zoopla.co.uk/for-sale/details/72543070/' },
  { addr: 'Wellesley Terrace, Angel N1', url: 'https://www.zoopla.co.uk/for-sale/details/71733465/' },
  { addr: 'Queens Court, Queensway W2', url: 'https://www.zoopla.co.uk/for-sale/details/72565797/' },
  { addr: 'Kendal Steps, Marble Arch W2', url: 'https://www.zoopla.co.uk/for-sale/details/72537410/' },
  { addr: 'Leinster Gardens, London W2', url: 'https://www.zoopla.co.uk/for-sale/details/72516087/' },
];

async function extractLease(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(() => {
      // Try __NEXT_DATA__ JSON
      const nextData = document.querySelector('script#__NEXT_DATA__');
      if (nextData) {
        try {
          const parsed = JSON.parse(nextData.textContent);
          const text = JSON.stringify(parsed);
          // Look for lease-related fields
          const patterns = [
            /leasehold[^"]*?remaining["\s:]+(\d+)/i,
            /lease\s*(?:term\s*)?remaining["\s:]+(\d+)/i,
            /"lease(?:_years?)?_?(remaining|term)"[^}]*?(\d{2,3})/i,
            /(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to go)/i,
            /remaining[^)]*?(\d{2,3})\s*(?:years?|yrs?)/i,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) return { value: parseInt(m[1]), source: 'NEXT_DATA' };
          }
        } catch(e) {}
      }
      // Try page text
      const body = document.body.innerText;
      const textPatterns = [
        /(\d{3})\s*(?:years?|yrs?)\s*(?:remaining|left|to go)/i,
        /(?:lease|tenure).*?(\d{3})\s*(?:years?|yrs?)/i,
        /(\d{3})\s*(?:years?|yrs?).*?(?:lease|remaining)/i,
        /(?:remaining|left).*?(\d{3})\s*(?:years?|yrs?)/i,
        /(\d{3})\s*(?:yr|y)\s*(?:lease|tenure)/i,
      ];
      for (const p of textPatterns) {
        const m = body.match(p);
        if (m) return { value: parseInt(m[1]), source: 'PAGE_TEXT' };
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
  for (const lead of LEADS) {
    process.stdout.write('[ZOOPLA] ' + lead.addr + '... ');
    const result = await extractLease(lead.url);
    if (result) {
      console.log(result.value + ' yrs remaining (' + result.source + ')');
      results.push({ address: lead.addr, url: lead.url, lease_years: result.value, source: result.source });
    } else {
      console.log('NOT FOUND');
      results.push({ address: lead.addr, url: lead.url, lease_years: null, source: 'not_found' });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync('scripts/lease_results.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to scripts/lease_results.json');
}
main().catch(console.error);
