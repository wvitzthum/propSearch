/**
 * scrape_zoopla_detail.js
 * ========================
 * Fetches full detail data for a single Zoopla listing.
 * Extracts: price, address, beds, baths, sqft, tenure, floor level, lat/lng, EPC, service charge.
 * 
 * Uses FlareSolverr via curl subprocess — the most reliable approach.
 * 
 * Usage:
 *   node scripts/scrape_zoopla_detail.js <zoopla_id> [session_name]
 *   node scripts/scrape_zoopla_detail.js 72947017
 * 
 * Returns JSON to stdout:
 *   { id, price, address, beds, baths, sqft, tenure, floorLevel, lat, lng, epc, sc, dom }
 */

const { execSync } = require('child_process');
const FS = require('fs');
const PATH = require('path');

const FLARESOLVR = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const SESSION = process.argv[3] || 'ps_zdetail_' + Date.now();
const DEFAULT_TIMEOUT = 90000;

function fsGet(url, timeout, session) {
  timeout = timeout || DEFAULT_TIMEOUT;
  const sess = session || SESSION;
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: timeout, session: sess });
  const tmp = PATH.join('/tmp', 'fs_zdetail_' + process.pid + '.json');
  FS.writeFileSync(tmp, body);
  try {
    const out = execSync(
      `curl -s -X POST ${FLARESOLVR}/v1 -H "Content-Type: application/json" -d @${tmp}`,
      { timeout: timeout + 15000, maxBuffer: 10 * 1024 * 1024 }
    );
    FS.unlinkSync(tmp);
    const data = JSON.parse(out.toString());
    return data.solution && data.solution.response ? data.solution.response : null;
  } catch (e) {
    try { FS.unlinkSync(tmp); } catch (e2) {}
    return null;
  }
}

function extract(html, zooplaId) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  
  // Price: from calc-price-input value (most reliable)
  const priceInput = html.match(/id="price"[^>]*value="(\d+)"/) ||
                     html.match(/data-testid="calc-price-input"[^>]*value="(\d+)"/);
  let price = priceInput ? parseInt(priceInput[1]) : null;
  // Fallback: first large GBP amount (£500k+ range)
  if (!price) {
    const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
    for (const m of gbpMatches) {
      const v = parseInt(m[1].replace(/,/g, ''));
      if (v >= 100000 && v <= 50000000) { price = v; break; }
    }
  }
  
  // Address from og:title
  const og = m(/<meta property="og:title" content="([^"]+)"/);
  let address = null;
  if (og) {
    address = og
      .replace(/£[\d,]+.*/, '')                        // strip price
      .replace(/,\s*(for sale|property for sale)[^,]*$/i, '')  // strip suffix
      .trim();
  }
  
  // Beds/baths
  const beds = m(/"numBeds"\s*:\s*(\d+)/) ||
               m(/"numberOfBedrooms"\s*:\s*(\d+)/) ||
               m(/(\d+)\s*bed/i);
  const baths = m(/"numBaths"\s*:\s*(\d+)/) ||
                m(/"numberOfBathrooms"\s*:\s*(\d+)/) ||
                m(/(\d+)\s*bath/i);
  
  // Floor area — try floorArea JSON first, then regex
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) ||
                  m(/(\d[\d,]+)\s*sq/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;
  
  // Tenure
  const tenure = m(/"tenure"\s*:\s*"([^"]+)"/i);
  
  // Floor level
  const floorLevel = m(/"floorLevel"\s*:\s*"([^"]+)"/i);
  
  // Lat/lng
  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  
  // EPC
  const epc = m(/"currentEnergyRating"\s*:\s*"([A-G])"/i) ||
               m(/data-epc-rating[^>]*>([A-G])/i);
  
  // Service charge
  const sc = m(/"serviceCharge"\s*:\s*"?([\d,]+)/);
  
  // Days on market
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/) ||
              m(/(\d+)\s*days on market/i);
  
  return {
    id: 'zo-' + zooplaId,
    price,
    address,
    beds,
    baths,
    sqft,
    tenure,
    floorLevel,
    lat,
    lng,
    epc,
    sc,
    dom
  };
}

function main() {
  const zooplaId = process.argv[2];
  
  if (!zooplaId) {
    console.error('Usage: node scripts/scrape_zoopla_detail.js <zoopla_id> [session]');
    console.error('Example: node scripts/scrape_zoopla_detail.js 72947017');
    process.exit(1);
  }
  
  const url = `https://www.zoopla.co.uk/for-sale/details/${zooplaId}/`;
  console.error(`Fetching: ${url}`);
  
  const html = fsGet(url);
  if (!html) {
    console.error('FlareSolverr request failed');
    process.exit(1);
  }
  
  console.error(`HTML length: ${html.length} chars`);
  const data = extract(html, zooplaId);
  
  console.log(JSON.stringify(data, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { fsGet, extract };
