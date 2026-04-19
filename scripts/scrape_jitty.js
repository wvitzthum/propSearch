/**
 * scrape_jitty.js
 * =================
 * Fetches detail data for a Jitty listing URL.
 * Extracts: price, address, beds, baths, sqft, tenure, lat/lng, EPC, service charge.
 * 
 * Uses FlareSolverr at http://nas.home:8191.
 * 
 * Usage:
 *   node scripts/scrape_jitty.js <jitty_url> [internal_property_id]
 */

const HTTP = require('http');
const FS = require('fs');
const PATH = require('path');

const FLARESOLVR = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const SESSION = 'ps_jitty_' + Date.now();

function fsGet(url, timeout, session) {
  timeout = timeout || 90000;
  const sess = session || SESSION;
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: timeout, session: sess });
  const tmp = PATH.join('/tmp', 'fs_jitty_' + process.pid + '.json');
  FS.writeFileSync(tmp, body);
  try {
    const { execSync } = require('child_process');
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

  // Extract listing ID from URL
  const idMatch = url.match(/properties\/([A-Za-z0-9_-]+)/);
  const listingId = idMatch ? idMatch[1] : 'unknown';

  // Price: first large GBP amount (£100k–£50m)
  let price = null;
  const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
  for (const m of gbpMatches) {
    const v = parseInt(m[1].replace(/,/g, ''));
    if (v >= 100000 && v <= 50000000) { price = v; break; }
  }

  // Address from og:title
  const og = m(/<meta property="og:title" content="([^"]+)"/);
  let address = og ? og.trim() : null;
  // Fix missing street number for Jitty (address often lacks number)
  // Also try address meta tag
  if (!address) {
    const addrMeta = m(/<meta name="address" content="([^"]+)"/);
    if (addrMeta) address = addrMeta;
  }

  // Beds/baths from structured data or text
  const beds = m(/"numBedrooms"\s*:\s*(\d+)/) ||
               m(/(\d+)\s*bed/i);
  const baths = m(/"numBathrooms"\s*:\s*(\d+)/) ||
                m(/(\d+)\s*bath/i);

  // Floor area — match "637 sq ft" style
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)/) ||
                  m(/(\d[\d,]+)\s*sq/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;

  // Lat/lng
  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);

  // EPC
  const epc = m(/data-epc-rating[^>]*>([A-G])/i) ||
               m(/"currentEnergyRating"\s*:\s*"([A-G])"/i);

  // Service charge
  const sc = m(/"serviceCharge"\s*:\s*"?([\d,]+)/);

  // DOM
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/);

  return {
    id: 'jitty-' + listingId,
    price,
    address,
    beds,
    baths,
    sqft,
    tenure: null,
    floorLevel: null,
    lat,
    lng,
    epc,
    sc,
    dom
  };
}

function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/scrape_jitty.js <jitty_url> [internal_id]');
    process.exit(1);
  }

  console.error(`Fetching: ${url}`);
  const html = fsGet(url);
  if (!html) {
    console.error('FlareSolverr request failed');
    process.exit(1);
  }

  console.error(`HTML: ${html.length} chars`);
  const data = extract(html, url);
  console.log(JSON.stringify(data, null, 2));
}

if (require.main === module) main();
module.exports = { fsGet, extract };
