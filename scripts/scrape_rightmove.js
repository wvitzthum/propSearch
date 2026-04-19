/**
 * scrape_rightmove.js
 * ====================
 * Fetches detail data for a Rightmove listing URL.
 * Extracts: price, address, beds, baths, sqft, tenure, lat/lng, EPC, service charge.
 * 
 * Uses FlareSolverr at http://nas.home:8191.
 * 
 * Usage:
 *   node scripts/scrape_rightmove.js <rightmove_url> [internal_property_id]
 * 
 * Output: JSON to stdout:
 *   { id, price, address, beds, baths, sqft, tenure, lat, lng, epc, sc, dom }
 */

const HTTP = require('http');
const HTTPS = require('https');
const FS = require('fs');
const PATH = require('path');

const FLARESOLVR = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const SESSION = 'ps_rm_' + Date.now();
const DEFAULT_TIMEOUT = 90000;

function fsGet(url, timeout, session) {
  timeout = timeout || DEFAULT_TIMEOUT;
  const sess = session || SESSION;
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: timeout, session: sess });
  const tmp = PATH.join('/tmp', 'fs_rm_' + process.pid + '.json');
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
  const idMatch = url.match(/property[-/](\d+)/) || url.match(/properties\/(\d+)/);
  const listingId = idMatch ? idMatch[1] : 'unknown';

  // Skip rental/letting listings — they show weekly rent as "price", not sale price
  const channel = html.match(/"channel"\s*:\s*"([^"]+)"/);
  let price = null;
  if (!channel || channel[1] === 'SALE') {
    // Sale listing: use RESALEPRICE from dataLayer
    const resalePrice = html.match(/"RESALEPRICE","value"\s*:\s*\["(\d+)"\]/);
    if (resalePrice) price = parseInt(resalePrice[1]);
    // Fallback: extract from og:title
    if (!price) {
      const og = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (og) { const ogPrice = og[1].match(/£([\d,]+)/); if (ogPrice) price = parseInt(ogPrice[1].replace(/,/g, '')); }
    }
    // Fallback: first large GBP amount (£100k–£50m)
    if (!price) {
      const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
      for (const mm of gbpMatches) {
        const v = parseInt(mm[1].replace(/,/g, ''));
        if (v >= 100000 && v <= 50000000) { price = v; break; }
      }
    }
  }
  // For non-sale channels, price stays null — this is a rental listing

  // Address from og:title
  const og = m(/<meta property="og:title" content="([^"]+)"/);
  let address = null;
  if (og) {
    address = og
      .replace(/£[\d,]+.*/, '')
      .replace(/,\s*(for sale|property for sale)[^,]*$/i, '')
      .replace(/\s*-\s*Rightmove\s*$/i, '')
      .trim();
  }

  // Beds/baths from infoReel or JSON
  const beds = m(/"numBedrooms"\s*:\s*(\d+)/) ||
               m(/"bedrooms"\s*:\s*(\d+)/i) ||
               m(/BEDROOMS<\/span><\/dt><dd[^>]*>[^<]*<p[^>]*>(\d+)/i) ||
               m(/(\d+)\s*bed/i);
  const baths = m(/"numBathrooms"\s*:\s*(\d+)/) ||
                m(/BATHROOMS<\/span><\/dt><dd[^>]*>[^<]*<p[^>]*>(\d+)/i) ||
                m(/(\d+)\s*bath/i);

  // Floor area from infoReel (SIZE field) or structured data
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) ||
                  m(/SIZE<\/span><\/dt><dd[^>]*>[^<]*<p[^>]*>(\d[\d,]+)\s*sq/i) ||
                  m(/(\d[\d,]+)\s*sq[^m]/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;

  // Tenure
  const tenure = m(/"(tenure|tenancyType)"\s*:\s*"([^"]+)"/i);

  // Lat/lng
  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);

  // EPC rating
  const epc = m(/data-epc-rating[^>]*>([A-G])/i) ||
               m(/<meta name="epc-rating" content="([A-G])"/i) ||
               m(/"currentEnergyRating"\s*:\s*"([A-G])"/i);

  // Service charge: only capture GBP amounts in realistic range (£500–£50,000/yr)
  const scRaw = m(/Service charge(?:[^£]*?)£([\d,]+)/i);
  const sc = scRaw ? (() => { const v = parseInt(scRaw.replace(/,/g, '')); return v >= 500 && v <= 50000 ? v : null; })() : null;

  // Days on market
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/) ||
              m(/(\d+)\s*days on market/i);

  return {
    id: 'rm-' + listingId,
    price,
    address,
    beds,
    baths,
    sqft,
    tenure,
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
    console.error('Usage: node scripts/scrape_rightmove.js <rightmove_url> [internal_id]');
    process.exit(1);
  }

  console.error(`Fetching: ${url} (session: ${SESSION})`);
  const html = fsGet(url);
  if (!html) {
    console.error('FlareSolverr request failed');
    process.exit(1);
  }

  console.error(`HTML length: ${html.length} chars`);
  const data = extract(html, url);
  console.log(JSON.stringify(data, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { fsGet, extract };
