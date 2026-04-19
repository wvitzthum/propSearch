
const { chromium } = require('playwright');
const fs = require('fs');

const FLOOR_PROPS = [
  { uid: '5e98a19c', addr: 'Northways, College Crescent', url: 'https://www.rightmove.co.uk/properties/144785342' },
  { uid: 'f6a7b8c9', addr: 'Danbury Street, Angel', url: 'https://www.rightmove.co.uk/properties/146669591' },
  { uid: 'a9b0c1d2', addr: 'Spenlow Apartments, Wenlock Road', url: 'https://www.rightmove.co.uk/properties/156060572' },
  { uid: 'c3d4e5f6', addr: 'Peters Court, Porchester Road', url: 'https://www.zoopla.co.uk/for-sale/details/71650400/' },
];

async function extractFloorLevel(url, source) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    
    // Accept cookies
    try {
      await page.getByRole('button', { name: /accept/i }).click().catch(() => {});
    } catch(e) {}
    
    const result = await page.evaluate(() => {
      // Try __NEXT_DATA__ JSON
      const nextData = document.querySelector('script#__NEXT_DATA__');
      if (nextData) {
        try {
          const parsed = JSON.parse(nextData.textContent);
          const text = JSON.stringify(parsed);
          // Look for floor level patterns
          const patterns = [
            /floor[_\s]?(?:level|position)[^"]*?"([^"]+)"/gi,
            /"(?:floor|level)":\s*"([^"]+)"/gi,
            /"(ground|first|second|third|fourth|fifth|lower ground|upper|mezzanine|basement|penthouse|maisonette|top)[\s-]?(?:floor|level)"/gi,
            /"(?:top|ground|first|second|third|lower|upper|mezzanine)[\s-]?floor"/gi,
            /"(?:basement|lower ground|upper floor|penthouse)"/gi,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) return { floor: m[0].replace(/"/g, '').trim(), source: 'NEXT_DATA' };
          }
        } catch(e) {}
      }
      
      // Try page text
      const body = document.body.innerText;
      const floorPatterns = [
        /((?:top|ground|first|second|third|fourth|fifth|lower ground|upper|mezzanine|basement|penthouse|maisonette|raised)[\s-]?(?:floor|level|garden))/gi,
        /(?:floor|level|position)[\s:]+((?:top|ground|first|second|third|lower ground|upper|mezzanine|basement|penthouse))/gi,
        /((?:G|GRD|FF|1F|2F|3F|4F|LGF|UGF|PH|M)\s*[\/\-]?\s*(?:Floor|floor|F|FL))/gi,
        /((?:ground|fIRST|fLOOR|gROUND|basement|maisonette))/gi,
      ];
      for (const p of floorPatterns) {
        const m = body.match(p);
        if (m) return { floor: m[0].trim(), source: 'PAGE_TEXT' };
      }
      
      // Try specific elements
      const floorEl = document.querySelector('[data-testid="floor-level"], .floor-level, .floorLevel, .spec__floor, [class*="floor"]');
      if (floorEl) return { floor: floorEl.innerText.trim(), source: 'ELEMENT' };
      
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
  for (const prop of FLOOR_PROPS) {
    const source = prop.url.includes('rightmove') ? 'Rightmove' : 'Zoopla';
    process.stdout.write('[' + source + '] ' + prop.addr + '... ');
    const r = await extractFloorLevel(prop.url, source);
    if (r && r.floor) {
      console.log(r.floor + ' (' + r.source + ')');
      results.push({ uid: prop.uid, addr: prop.addr, floor_level: r.floor, source: r.source });
    } else {
      console.log('NOT FOUND');
      results.push({ uid: prop.uid, addr: prop.addr, floor_level: null });
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  fs.writeFileSync('/workspaces/propSearch/scripts/floor_level_results.json', JSON.stringify(results, null, 2));
  console.log('\nDone.');
}
main().catch(console.error);
