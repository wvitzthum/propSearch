
const { chromium } = require('playwright');
const fs = require('fs');

const AGENT_URLS = [
  { uid: 'f6911aa8', addr: 'Belsize Avenue', url: 'https://www.knightfrank.co.uk/properties/residential/for-sale/belsize-avenue-london-nw3/BelsizeAvenue' },
  { uid: '91d727d9', addr: 'Coleridge Court', url: 'https://www.hotblackdesiato.co.uk/property/dibden-street-islington-n1-2/' },
  { uid: 'cbbddd70', addr: 'Hillmarton Road', url: 'https://www.winkworth.co.uk/properties/sales/hillmarton-road-islington-london-n7/12711096/' },
];

async function extractBedrooms(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const bedroom = await page.evaluate(() => {
      const body = document.body.innerText;
      const patterns = [
        /(\d+)\s*(?:bed(?:room)?s?)\b/i,
        /bed(?:room)?s?\s*:?\s*(\d+)/i,
      ];
      for (const p of patterns) {
        const m = body.match(p);
        if (m) return parseInt(m[1]);
      }
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        const m = meta.content.match(/(\d+)\s*(?:bed|bedroom)/i);
        if (m) return parseInt(m[1]);
      }
      return null;
    });
    await browser.close();
    return bedroom;
  } catch(e) {
    await browser.close();
    return null;
  }
}

async function main() {
  const results = [];
  for (const item of AGENT_URLS) {
    process.stdout.write('[AGENT] ' + item.addr + '... ');
    const bedroom = await extractBedrooms(item.url);
    if (bedroom) {
      console.log(String(bedroom) + ' bed(s)');
      results.push({ uid: item.uid, addr: item.addr, bedrooms: bedroom });
    } else {
      console.log('NOT FOUND');
      results.push({ uid: item.uid, addr: item.addr, bedrooms: null });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync('scripts/agent_bedroom_results.json', JSON.stringify(results, null, 2));
  console.log('Done.');
}
main().catch(console.error);
