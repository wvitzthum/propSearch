const { execSync } = require('child_process');
const FS = require('fs');
const FLARESOLVR = 'http://nas.home:8191';
const SESSION = 'ps_watch_' + Date.now();

function fsGet(url) {
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: 90000, session: SESSION });
  const tmp = '/tmp/fs_w_' + Date.now() + '.json';
  FS.writeFileSync(tmp, body);
  try {
    const out = execSync(`curl -s -X POST ${FLARESOLVR}/v1 -H "Content-Type: application/json" -d @${tmp}`, { timeout: 100000, maxBuffer: 10 * 1024 * 1024 });
    FS.unlinkSync(tmp);
    const data = JSON.parse(out.toString());
    return data.solution && data.solution.response ? data.solution.response : null;
  } catch (e) {
    try { FS.unlinkSync(tmp); } catch (e2) {}
    return null;
  }
}

function extract(html, id) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  
  // Price from og:title
  const og = m(/<meta property="og:title" content="([^"]+)"/);
  let price = null, address = null;
  if (og) {
    const pm = og.match(/£([\d,]+)/);
    if (pm) price = parseInt(pm[1].replace(/,/g, ''));
    address = og.replace(/£[\d,]+.*/, '').replace(/,\s*(for sale|property for sale)[^,]*$/i, '').trim();
  }
  
  const beds = m(/"numBeds"\s*:\s*(\d+)/) || m(/(\d+)\s*bed/i);
  const baths = m(/"numBaths"\s*:\s*(\d+)/) || m(/(\d+)\s*bath/i);
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) || m(/(\d[\d,]+)\s*sq/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;
  const tenure = m(/"tenure"\s*:\s*"([^"]+)"/i);
  const floorLevel = m(/"floorLevel"\s*:\s*"([^"]+)"/i);
  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  const epc = m(/"currentEnergyRating"\s*:\s*"([A-G])"/i) || m(/data-epc-rating[^>]*>([A-G])/i);
  const sc = m(/"serviceCharge"\s*:\s*"?([\d,]+)/);
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/) || m(/(\d+)\s*days on market/i);
  
  // Price history from the listing history section
  const priceHistory = [];
  // Find price changes in the page
  const historyMatches = html.match(/(\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})[^£]*£([\d,]+)/gi) || [];
  
  // Status check
  const status = html.includes('List') || html.includes('listed') ? 'active' : 'unknown';
  
  return { id, price, address, beds, baths, sqft, tenure, floorLevel, lat, lng, epc, sc, dom, status };
}

const candidates = [
  { db_id: 'ps-2cdf2f33', zoopla_id: '72349745', expected_price: 675000 },
  { db_id: 'man-0402-01805', zoopla_id: '72706165', expected_price: 745000 },
  { db_id: '35e20765-5d38-46ae-90d4-ff00a06e024c', zoopla_id: '59131907', expected_price: 675000 },
  { db_id: 'zo-72878094', zoopla_id: '72878094', expected_price: 800000 },
  { db_id: 'man-0402-79113', zoopla_id: '71918591', expected_price: 750000 },
  { db_id: 'zo-72798843', zoopla_id: '72798843', expected_price: 500000 },
  { db_id: 'zo-72936048', zoopla_id: '72936048', expected_price: 778000 },
];

let done = 0;
const results = [];

for (const c of candidates) {
  const url = `https://www.zoopla.co.uk/for-sale/details/${c.zoopla_id}/`;
  process.stdout.write(`${c.db_id} (zo-${c.zoopla_id})... `);
  const html = fsGet(url);
  if (html) {
    const d = extract(html, c.zoopla_id);
    results.push({ ...c, html, ...d });
    const priceChanged = d.price && d.price !== c.expected_price;
    console.log(`£${(d.price||'null')/1000||'?'}k | beds:${d.beds||'?'} | sqft:${d.sqft||'?'} | tenure:${d.tenure||'?'} | floor:${d.floorLevel||'?'} | dom:${d.dom||'?'} | epc:${d.epc||'?'} | ${priceChanged ? '*** PRICE CHANGED to £'+d.price+' ***' : 'OK'}`);
  } else {
    console.log('FAILED (listing may be removed)');
    results.push({ ...c, failed: true });
  }
  done++;
}

FS.writeFileSync('/tmp/watchlist_results.json', JSON.stringify(results));
console.log('\nSaved to /tmp/watchlist_results.json');
