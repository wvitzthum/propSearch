
const { chromium } = require('playwright');

const CHECK = [
  { uid: '5e98a19c', addr: 'Northways', url: 'https://www.rightmove.co.uk/properties/144785342' },
  { uid: 'a9b0c1d2', addr: 'Spenlow', url: 'https://www.rightmove.co.uk/properties/156060572' },
  { uid: 'c3d4e5f6', addr: 'Peters Court', url: 'https://www.zoopla.co.uk/for-sale/details/71650400/' },
];

async function deepFloorCheck(prop) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    await page.goto(prop.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    
    const result = await page.evaluate(() => {
      // Get all text snippets near bedroom/floor indicators
      const body = document.body.innerText;
      const snippets = [];
      
      // Get surrounding context of bedroom mentions
      const bedroomMatches = body.match(/.{0,50}(?:bed|bedroom).{0,200}/gi) || [];
      snippets.push(...bedroomMatches.slice(0, 3));
      
      // Get all 1-3 word patterns that might be floor indicators
      const floorMatches = body.match(/(?:^|\s)([A-Za-z]+\s+(?:Floor|floor|Level|level))(?:$|\s|,|\.)/gm) || [];
      snippets.push(...floorMatches.slice(0, 3));
      
      // Get text from specific labels
      const labels = document.querySelectorAll('dt, th, [class*="label"], [class*="heading"], [data-testid*="label"]');
      for (const l of labels) {
        const text = l.innerText.trim();
        if (/floor|level|position/i.test(text)) {
          snippets.push(text + ': ' + (l.nextElementSibling ? l.nextElementSibling.innerText.trim() : ''));
        }
      }
      
      return snippets.slice(0, 8);
    });
    
    await browser.close();
    return result;
  } catch(e) {
    await browser.close();
    return [];
  }
}

async function main() {
  for (const prop of CHECK) {
    console.log('\n=== ' + prop.addr + ' ===');
    const snippets = await deepFloorCheck(prop);
    snippets.forEach(s => console.log('  ' + s.substring(0, 120)));
    await new Promise(r => setTimeout(r, 3000));
  }
}
main().catch(console.error);
