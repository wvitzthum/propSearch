
const { chromium } = require('playwright');

const CHECK = [
  { uid: '5e98a19c', addr: 'Northways', url: 'https://www.rightmove.co.uk/properties/144785342' },
  { uid: 'a9b0c1d2', addr: 'Spenlow', url: 'https://www.rightmove.co.uk/properties/156060572' },
  { uid: 'c3d4e5f6', addr: 'Peters Court', url: 'https://www.zoopla.co.uk/for-sale/details/71650400/' },
];

async function ultraDeepCheck(prop) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    await page.goto(prop.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);
    
    const result = await page.evaluate(() => {
      const title = document.title;
      const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : '';
      // Get listing details section
      const details = [];
      const allText = document.body.innerText;
      
      // Look for floor/floor level in specific patterns
      const patterns = [
        /(?:floor|level|floorplan|floor plan)[^\n]{0,100}/gi,
        /(?:ground|first|second|third|lower|upper|mezzanine|basement|penthouse|top|maisonette)[^\n]{0,100}/gi,
      ];
      for (const p of patterns) {
        const matches = allText.match(p) || [];
        details.push(...matches.slice(0, 2));
      }
      
      // Try data attributes
      const dataEls = document.querySelectorAll('[data-testid], [data-e2e]');
      for (const el of dataEls) {
        const dt = el.getAttribute('data-testid') || el.getAttribute('data-e2e') || '';
        if (/floor|level|bedroom|position/i.test(dt)) {
          details.push(dt + ': ' + el.innerText.trim());
        }
      }
      
      return {
        title,
        h1,
        snippets: details.slice(0, 10)
      };
    });
    
    await browser.close();
    return result;
  } catch(e) {
    await browser.close();
    return { error: e.message };
  }
}

async function main() {
  for (const prop of CHECK) {
    console.log('\n=== ' + prop.addr + ' ===');
    const r = await ultraDeepCheck(prop);
    if (r.error) { console.log('Error: ' + r.error); continue; }
    console.log('Title: ' + r.title.substring(0, 100));
    console.log('H1: ' + r.h1.substring(0, 100));
    console.log('Floor-related snippets:');
    r.snippets.slice(0, 8).forEach(s => console.log('  ' + s.substring(0, 120)));
    await new Promise(r => setTimeout(r, 4000));
  }
}
main().catch(console.error);
