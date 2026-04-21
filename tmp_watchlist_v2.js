const { execSync } = require('child_process');
const FS = require('fs');
const FLARESOLVR = 'http://nas.home:8191';
const SESSION = 'ps_watch_v2';

function fsGet(url) {
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: 90000, session: SESSION });
  const tmp = '/tmp/fs_wv2_' + Date.now() + '.json';
  FS.writeFileSync(tmp, body);
  try {
    const out = execSync(`curl -s -X POST ${FLARESOLVR}/v1 -H "Content-Type: application/json" -d @${tmp}`, { timeout: 100000, maxBuffer: 10 * 1024 * 1024 });
    FS.unlinkSync(tmp);
    const data = JSON.parse(out.toString());
    return data.solution && data.solution.response ? data.solution.response : null;
  } catch (e) { try { FS.unlinkSync(tmp); } catch (e2) {} return null; }
}

function extract(html, zooplaId) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  
  // Price from og:title (most reliable)
  const og = m(/<meta property="og:title" content="([^"]+)"/);
  let price = null, address = null;
  if (og) {
    const pm = og.match(/£([\d,]+)/);
    if (pm) price = parseInt(pm[1].replace(/,/g, ''));
    address = og.replace(/£[\d,]+.*/, '').replace(/,\s*(for sale|property for sale)[^,]*$/i, '').trim();
  }
  
  // Beds from og:title
  const bedsTitle = og ? (og.match(/(\d+)\s*bed/i) || [])[1] : null;
  // Beds from numBeds field
  const bedsField = m(/"numBeds"\s*:\s*(\d+)/);
  const beds = bedsField || bedsTitle;
  
  // Baths
  const baths = m(/"numBaths"\s*:\s*(\d+)/) || m(/(\d+)\s*bath/i);
  
  // Floor area
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/);
  const sqft = sqftRaw ? parseInt(sqftRaw) : null;
  
  // Tenure
  const tenure = m(/"tenure"\s*:\s*"([^"]+)"/i);
  
  // Floor level
  const floorLevel = m(/"floorLevel"\s*:\s*"([^"]+)"/i);
  
  // Lat/lng
  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  
  // EPC
  const epc = m(/"currentEnergyRating"\s*:\s*"([A-G])"/i) || m(/data-epc-rating[^>]*>([A-G])/i);
  
  // Service charge
  const sc = m(/"serviceCharge"\s*:\s*"?([\d,]+)/);
  
  // Days on market
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/) || m(/(\d+)\s*days on market/i);
  
  return { id: 'zo-' + zooplaId, price, address, beds, baths, sqft, tenure, floorLevel, lat, lng, epc, sc, dom };
}

const candidates = [
  { db_id: 'ps-2cdf2f33', zoopla_id: '72349745', expected_price: 675000, db_sqft: 671, db_beds: 2 },
  { db_id: 'man-0402-01805', zoopla_id: '72706165', expected_price: 745000, db_sqft: 678, db_beds: 2 },
  { db_id: '35e20765-5d38-46ae-90d4-ff00a06e024c', zoopla_id: '59131907', expected_price: 675000, db_sqft: 505, db_beds: 1 },
  { db_id: 'zo-72878094', zoopla_id: '72878094', expected_price: 800000, db_sqft: 721, db_beds: 2 },
  { db_id: 'man-0402-79113', zoopla_id: '71918591', expected_price: 750000, db_sqft: 587, db_beds: 2 },
  { db_id: 'zo-72798843', zoopla_id: '72798843', expected_price: 500000, db_sqft: 529, db_beds: 2 },
  { db_id: 'zo-72936048', zoopla_id: '72936048', expected_price: 778000, db_sqft: 571, db_beds: 2 },
];

const results = [];
for (const c of candidates) {
  const url = `https://www.zoopla.co.uk/for-sale/details/${c.zoopla_id}/`;
  process.stdout.write(`${c.db_id} (zo-${c.zoopla_id}): `);
  const html = fsGet(url);
  if (html) {
    const d = extract(html, c.zoopla_id);
    results.push({ ...c, ...d });
    const issues = [];
    if (d.price !== c.expected_price) issues.push('PRICE changed to £' + d.price);
    if (d.beds !== String(c.db_beds)) issues.push('BEDS ' + c.db_beds + '->' + d.beds);
    if (d.sqft !== c.db_sqft && d.sqft !== null) issues.push('SQFT ' + c.db_sqft + '->' + d.sqft);
    const flags = issues.length ? ' *** ' + issues.join(', ') : ' OK';
    console.log(`£${(d.price||'?')/1000}k | ${d.beds||'?'}bed/${d.baths||'?'}bath | ${d.sqft||'?'}sqft | ${d.tenure||'?'} | ${d.address||c.db_id}${flags}`);
  } else {
    console.log('FAILED (listing removed?)');
    results.push({ ...c, failed: true });
  }
}

FS.writeFileSync('/tmp/watchlist_v2.json', JSON.stringify(results, null, 2));
console.log('\nSaved to /tmp/watchlist_v2.json');
