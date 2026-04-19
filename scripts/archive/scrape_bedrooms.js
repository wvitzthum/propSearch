const { chromium } = require('playwright');
const fs = require('fs');

const PORTAL_URLS = [
  { uid: '91d727d9', addr: 'Coleridge Court', url: 'https://www.rightmove.co.uk/properties/145107342', src: 'Rightmove' },
  { uid: '5e98a19c', addr: 'Northways', url: 'https://www.rightmove.co.uk/properties/144785342', src: 'Rightmove' },
  { uid: 'cbbddd70', addr: 'Hillmarton Road', url: 'https://www.rightmove.co.uk/properties/148496943', src: 'Rightmove' },
  { uid: 'c3d4e5f6', addr: 'Peters Court', url: 'https://www.zoopla.co.uk/for-sale/details/71650400/', src: 'Zoopla' },
  { uid: 'd4e5f6a7', addr: 'Gloucester Terrace', url: 'https://www.zoopla.co.uk/for-sale/details/71985792/', src: 'Zoopla' },
  { uid: 'f6a7b8c9', addr: 'Danbury Street', url: 'https://www.rightmove.co.uk/properties/146669591', src: 'Rightmove' },
  { uid: 'a9b0c1d2', addr: 'Spenlow Apartments', url: 'https://www.rightmove.co.uk/properties/156060572', src: 'Rightmove' },
  { uid: '1f55a0c4', addr: 'Highbury New Park', url: 'https://www.rightmove.co.uk/properties/172342250', src: 'Rightmove' },
];

async function extractBedrooms(url, source) {
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

    const bedroom = await page.evaluate((src) => {
      if (src === 'Rightmove') {
        // Rightmove embeds listing data in __NEXT_DATA__
        const nextData = document.querySelector('script#__NEXT_DATA__');
        if (nextData) {
          try {
            const parsed = JSON.parse(nextData.textContent);
            // Search deep in the props tree
            const text = JSON.stringify(parsed);
            const m = text.match(/"bedrooms"\s*:\s*(\d+)/);
            if (m) return parseInt(m[1]);
          } catch(e) {}
        }
        // Try page title or meta
        const title = document.title;
        const m = title.match(/(\d+)\s*(bed|bedroom)/i);
        if (m) return parseInt(m[1]);
        return null;
      } else {
        // Zoopla
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const s of scripts) {
          const text = s.textContent;
          const m = text.match(/"bedrooms"\s*:\s*(\d+)/);
          if (m) return parseInt(m[1]);
        }
        const title = document.title;
        const m = title.match(/(\d+)\s*(bed|bedroom)/i);
        if (m) return parseInt(m[1]);
        return null;
      }
    }, source);

    await browser.close();
    return bedroom;
  } catch(e) {
    await browser.close();
    return null;
  }
}

async function main() {
  const results = [];
  
  for (const item of PORTAL_URLS) {
    process.stdout.write(`[${item.src}] ${item.addr}... `);
    const bedroom = await extractBedrooms(item.url, item.src);
    if (bedroom) {
      console.log(`${bedroom} bed(s)`);
      results.push({ uid: item.uid, addr: item.addr, bedrooms: bedroom });
    } else {
      console.log('NOT FOUND');
      results.push({ uid: item.uid, addr: item.addr, bedrooms: null });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  fs.writeFileSync('scripts/bedroom_results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to scripts/bedroom_results.json');
}

main().catch(console.error);
