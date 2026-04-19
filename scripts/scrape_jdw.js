/**
 * scrape_jdw.js
 * =================
 * Fetches detail data for a John D Wood listing URL.
 * Extracts: price, address, beds, baths, sqft, tenure, lat/lng, EPC, service charge.
 * 
 * Uses FlareSolverr at http://nas.home:8191.
 */

const FS = require('fs');
const PATH = require('path');
const { execSync } = require('child_process');

const FLARESOLVR = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const SESSION = 'ps_jdw_' + Date.now();

function fsGet(url, timeout) {
  timeout = timeout || 90000;
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: timeout, session: SESSION });
  const tmp = PATH.join('/tmp', 'fs_jdw_' + process.pid + '.json');
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

function extract(html, url) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };

  const idMatch = url.match(/properties\/(\d+)/);
  const listingId = idMatch ? idMatch[1] : 'unknown';

  let price = null;
  // First large GBP amount (£100k–£50m)
  const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
  for (const m of gbpMatches) {
    const v = parseInt(m[1].replace(/,/g, ''));
    if (v >= 100000 && v <= 50000000) { price = v; break; }
  }

  const og = m(/<meta property="og:title" content="([^"]+)"/);
  // Also try structured address
  const addrRaw = m(/"streetAddress"\s*:\s*"([^"]+)"/) ||
                 m(/"address"\s*:\s*"([^"]{10,150})"/i);
  let address = og ? og.replace(/£[\d,]+.*/, '').replace(/,\s*for sale[^,]*$/i, '').trim() : null;
  if (!address && addrRaw) address = addrRaw.replace(/\n/g, ', ');

  const beds = m(/"numBedrooms"\s*:\s*(\d+)/) || m(/"numberOfBedrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*bed/i);
  const baths = m(/"numBathrooms"\s*:\s*(\d+)/) || m(/"numberOfBathrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*bath/i);

  // Better sqft extraction: handle "637sqft" format
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/) ||
                  m(/(\d[\d,]+)\s*sq/i) ||
                  m(/(\d{3,4})\s*sqft/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;

  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  const epc = m(/data-epc-rating[^>]*>([A-G])/i) || m(/EPC[^>]*\s+([A-G])\s*\/\s*\[A-G\]/i) || m(/"currentEnergyRating"\s*:\s*"([A-G])"/i);
  const sc = m(/"serviceCharge"\s*:\s*"?([\d,]+)/) || m(/Service charge[^£]*£([\d,]+)/i);
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/);

  return { id: 'jdw-' + listingId, price, address, beds, baths, sqft, tenure: null, floorLevel: null, lat, lng, epc, sc, dom };
}

function main() {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node scripts/scrape_jdw.js <jdw_url>'); process.exit(1); }

  console.error(`Fetching: ${url}`);
  const html = fsGet(url);
  if (!html) { console.error('FlareSolverr request failed'); process.exit(1); }

  console.error(`HTML: ${html.length} chars`);
  const data = extract(html, url);
  console.log(JSON.stringify(data, null, 2));
}

if (require.main === module) main();
module.exports = { fsGet, extract };
