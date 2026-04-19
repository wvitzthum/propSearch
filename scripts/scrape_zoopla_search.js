/**
 * scrape_zoopla_search.js
 * ========================
 * Searches Zoopla for listings and extracts card-level data (price, beds, address, ID).
 * Uses FlareSolverr with curl subprocess for reliability.
 * 
 * Usage:
 *   node scripts/scrape_zoopla_search.js <search_url> [area_name]
 *   node scripts/scrape_zoopla_search.js "https://www.zoopla.co.uk/for-sale/property/nw3/?price=500000-900000&bedrooms=2" "Belsize Park NW3"
 *   node scripts/scrape_zoopla_search.js "https://www.zoopla.co.uk/for-sale/property/london-n1/?price=500000-900000&bedrooms=2" "Islington N1"
 *
 * Output: JSON array of { id, price, address, beds, area }
 * The ID must be prefixed with 'zo-' when used as property ID.
 */

const { execSync } = require('child_process');
const FS = require('fs');
const PATH = require('path');

const FLARESOLVR = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const SESSION = 'ps_zsearch_' + Date.now();
const DEFAULT_TIMEOUT = 90000;

function fsGet(url, timeout) {
  timeout = timeout || DEFAULT_TIMEOUT;
  const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: timeout, session: SESSION });
  const tmp = PATH.join('/tmp', 'fs_zsearch_' + process.pid + '.json');
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

/**
 * Extract listings from Zoopla search page card HTML.
 * Zoopla renders listings as React components with data-testid="listing-card-content".
 * Each card contains: price (from CSS class), beds, address link, and the detail URL.
 */
function extractFromCards(html, area) {
  const cards = html.split('data-testid="listing-card-content"');
  const listings = [];
  
  for (const card of cards) {
    // Get detail page URL and extract ID
    const urlMatch = card.match(/\/for-sale\/details\/(\d+)\//);
    if (!urlMatch) continue;
    const id = urlMatch[1];
    
    // Price from the card — Zoopla uses a specific CSS class for the price text
    const priceMatch = card.match(/price_priceText[^>]*>£([\d,]+)/);
    if (!priceMatch) continue;
    const price = parseInt(priceMatch[1].replace(/,/g, ''));
    
    // Address from the listing link
    const addressMatch = card.match(/ListingDetailsSquareLink_link__[a-zA-Z0-9_]+"[^>]*>([^<]{5,80})/);
    const address = addressMatch ? addressMatch[1].replace(/&amp;/g, '&').replace(/&#[0-9]+;/g, '').trim() : '';
    
    // Bedrooms
    const bedsMatch = card.match(/(\d+)\s*bed/i);
    const beds = bedsMatch ? bedsMatch[1] : null;
    
    listings.push({ id, price, address, beds, area });
  }
  
  // Deduplicate by ID (keep first occurrence — lowest price)
  const seen = {};
  return listings.filter(l => {
    if (seen[l.id]) return false;
    seen[l.id] = true;
    return true;
  }).sort((a, b) => a.price - b.price);
}

function main() {
  const url = process.argv[2];
  const area = process.argv[3] || 'Unknown';
  
  if (!url) {
    console.error('Usage: node scripts/scrape_zoopla_search.js <search_url> [area_name]');
    console.error('Example: node scripts/scrape_zoopla_search.js "https://www.zoopla.co.uk/for-sale/property/nw3/?price=500000-900000&bedrooms=2" "Belsize Park NW3"');
    process.exit(1);
  }
  
  console.error(`Fetching: ${url} (session: ${SESSION})`);
  const html = fsGet(url);
  
  if (!html) {
    console.error('FlareSolverr request failed — service may be down or URL blocked');
    process.exit(1);
  }
  
  console.error(`HTML length: ${html.length} chars`);
  const listings = extractFromCards(html, area);
  console.error(`Extracted ${listings.length} listings`);
  
  // Output to stdout as JSON
  console.log(JSON.stringify(listings, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { fsGet, extractFromCards };
