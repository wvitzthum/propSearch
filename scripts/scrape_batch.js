/**
 * scrape_batch.js
 * ================
 * Batch scraper for all property links in data/image_scraping_required.json.
 * Detects portal from URL and routes to the appropriate scraper,
 * then updates propSearch.db with enriched data.
 *
 * Usage:
 *   node scripts/scrape_batch.js [--dry-run]
 * 
 * For each property:
 *   1. Fetch all URLs in the links[] array
 *   2. Take best data from all sources (prefer more complete records)
 *   3. Update DB with enriched fields
 *   4. Write raw JSON to data/inbox/ as audit trail
 */

const FS = require('fs');
const PATH = require('path');
const DATABASE = require('better-sqlite3');

const DB_PATH = process.env.SQLITE_PATH || PATH.join(__dirname, '..', 'data', 'propSearch.db');
const INPUT_FILE = PATH.join(__dirname, '..', 'data', 'image_scraping_required.json');
const INBOX_DIR = PATH.join(__dirname, '..', 'data', 'inbox');
const SCRAPE_LOG = PATH.join(__dirname, '..', 'data', 'inbox', 'scrape_batch_log.jsonl');

const SCRAPERS = {
  'zoopla.co.uk': require('./scrape_zoopla_detail'),
  'rightmove.co.uk': require('./scrape_rightmove'),
  'jitty.com': require('./scrape_jitty'),
  'johndwood.co.uk': require('./scrape_jdw'),
};

// Portal routing based on URL patterns
function detectPortal(url) {
  for (const [portal, scraper] of Object.entries(SCRAPERS)) {
    if (url.includes(portal)) return portal;
  }
  return null;
}

// Extract Zoopla ID from URL
function extractZooplaId(url) {
  const m = url.match(/details\/(\d+)/);
  return m ? m[1] : null;
}

// Normalize scraped data to canonical format
function normalize(scrapeResult, portal) {
  const r = scrapeResult;
  return {
    portal,
    price: r.price || null,
    address: r.address || null,
    beds: r.beds ? String(r.beds).replace(/\D/g, '') : null,
    baths: r.baths ? String(r.baths).replace(/\D/g, '') : null,
    sqft: r.sqft ? parseInt(String(r.sqft).replace(/,/g, '')) : null,
    tenure: r.tenure || null,
    floorLevel: r.floorLevel || null,
    lat: r.lat ? parseFloat(r.lat) : null,
    lng: r.lng ? parseFloat(r.lng) : null,
    epc: r.epc || null,
    sc: r.sc ? parseInt(String(r.sc).replace(/,/g, '')) : null,
    dom: r.dom ? parseInt(r.dom) : null,
    scrapedAt: new Date().toISOString()
  };
}

// Merge multiple scrape results, picking best value for each field
function mergeResults(results) {
  const merged = { sources: [], scrapedAt: new Date().toISOString() };
  
  for (const r of results) {
    if (!r) continue;
    merged.sources.push(r.portal);
    
    for (const [key, val] of Object.entries(r)) {
      if (key === 'sources' || key === 'scrapedAt') continue;
      if (val !== null && val !== undefined && merged[key] === undefined) {
        merged[key] = val;
      }
    }
  }
  
  return merged;
}

// Update a property in the DB with scraped data
function updateProperty(db, propertyId, mergedData) {
  const updates = [];
  const values = [];
  
  const fieldMap = {
    price: 'list_price',
    beds: 'bedrooms',
    baths: 'bathrooms',
    sqft: 'sqft',
    tenure: 'tenure',
    floorLevel: 'floor_level',
    lat: 'lat',
    lng: 'lng',
    epc: 'epc',
    sc: 'service_charge',
  };
  
  for (const [src, dst] of Object.entries(fieldMap)) {
    if (mergedData[src] !== undefined && mergedData[src] !== null) {
      updates.push(`${dst} = ?`);
      values.push(mergedData[src]);
    }
  }
  
  // Also update metadata with raw scraped data
  const metadata = { sources: mergedData.sources, scrapedAt: mergedData.scrapedAt };
  updates.push('metadata = ?');
  values.push(JSON.stringify(metadata));
  
  if (updates.length > 1) { // more than just metadata
    values.push(propertyId);
    const sql = `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`;
    try {
      db.prepare(sql).run(...values);
      return true;
    } catch (e) {
      console.error(`  DB update failed for ${propertyId}: ${e.message}`);
      return false;
    }
  }
  return false;
}

// Scrape a single URL and return normalized result
function scrapeUrl(url, portal) {
  return new Promise((resolve) => {
    const scraper = SCRAPERS[portal];
    if (!scraper) { resolve(null); return; }
    
    // Use the scraper's fsGet + extract in-process
    // We'll use a simpler approach: invoke node inline
    const { execSync } = require('child_process');
    const FS = require('fs');
    const PATH = require('path');
    const FLARESOLVR = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
    const SESSION = 'ps_batch_' + process.pid + '_' + Date.now();
    
    const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: 90000, session: SESSION });
    const tmp = PATH.join('/tmp', 'fs_batch_' + process.pid + '.json');
    
    try {
      FS.writeFileSync(tmp, body);
      const out = execSync(
        `curl -s -X POST ${FLARESOLVR}/v1 -H "Content-Type: application/json" -d @${tmp}`,
        { timeout: 105000, maxBuffer: 10 * 1024 * 1024 }
      );
      FS.unlinkSync(tmp);
      const data = JSON.parse(out.toString());
      const html = data.solution && data.solution.response ? data.solution.response : null;
      
      if (!html) { resolve(null); return; }
      
      // Extract using inline logic for each portal
      let result = null;
      if (portal === 'zoopla.co.uk') {
        result = extractZooplaDetail(html, url);
      } else if (portal === 'rightmove.co.uk') {
        result = extractRightmoveDetail(html, url);
      } else if (portal === 'jitty.com') {
        result = extractJittyDetail(html, url);
      } else if (portal === 'johndwood.co.uk') {
        result = extractJdwDetail(html, url);
      }
      
      if (result) resolve(normalize(result, portal));
      else resolve(null);
    } catch (e) {
      try { FS.unlinkSync(tmp); } catch (e2) {}
      resolve(null);
    }
  });
}

// Inline extraction functions for each portal

function extractZooplaDetail(html, url) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  const id = m(/\/for-sale\/details\/(\d+)\//);

  const priceInput = html.match(/id="price"[^>]*value="(\d+)"/);
  let price = priceInput ? parseInt(priceInput[1]) : null;
  if (!price) {
    const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
    for (const mm of gbpMatches) {
      const v = parseInt(mm[1].replace(/,/g, ''));
      if (v >= 100000 && v <= 50000000) { price = v; break; }
    }
  }

  const og = m(/<meta property="og:title" content="([^"]+)"/);
  const address = og ? og.replace(/£[\d,]+.*/, '').replace(/,\s*,?\s*(for sale|property for sale)[^,]*$/i, '').trim() : null;

  const beds = m(/"numBeds"\s*:\s*(\d+)/) || m(/(\d+)\s*bed/i);
  const baths = m(/"numBaths"\s*:\s*(\d+)/) || m(/(\d+)\s*bath/i);
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) || m(/(\d[\d,]+)\s*sq/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;
  const tenure = m(/"tenure"\s*:\s*"([^"]+)"/i);
  const floorLevel = m(/"floorLevel"\s*:\s*"([^"]+)"/i);
  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  const epc = m(/"currentEnergyRating"\s*:\s*"([A-G])"/i) || m(/data-epc-rating[^>]*>([A-G])/i);
  // Service charge: only capture GBP amounts in realistic range (£500–£50,000/yr)
  // Skip "Ask agent" false positives
  const scRaw = m(/Service charge(?:[^£]*?)£([\d,]+)/i);
  const sc = scRaw ? (() => { const v = parseInt(scRaw.replace(/,/g, '')); return v >= 500 && v <= 50000 ? v : null; })() : null;
  const dom = m(/"daysOnMarket"\s*:\s*"?(\d+)/) || m(/(\d+)\s*days on market/i);

  return { id: 'zo-' + id, price, address, beds, baths, sqft, tenure, floorLevel, lat, lng, epc, sc, dom };
}

function extractRightmoveDetail(html, url) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  const idMatch = url.match(/property[-/](\d+)/) || url.match(/properties\/(\d+)/);
  const listingId = idMatch ? idMatch[1] : 'unknown';

  // Skip rental listings — they show RESALEPRICE as weekly rent, not sale price
  const channel = html.match(/"channel"\s*:\s*"([^"]+)"/);
  if (channel && channel[1] !== 'SALE') {
    // For non-sale channels, price field is NOT the sale price — skip
    return null;
  }

  let price = null;
  const resalePrice = html.match(/"RESALEPRICE","value"\s*:\s*\["(\d+)"\]/);
  if (resalePrice) price = parseInt(resalePrice[1]);
  // Fallback: extract from og:title (sale price shown in title like "£750,000 - 2 bed flat...")
  if (!price) {
    const og = m(/<meta property="og:title" content="([^"]+)"/);
    if (og) {
      const ogPrice = og.match(/£([\d,]+)/);
      if (ogPrice) price = parseInt(ogPrice[1].replace(/,/g, ''));
    }
  }
  // Fallback: first large GBP amount (£100k–£50m)
  if (!price) {
    const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
    for (const mm of gbpMatches) {
      const v = parseInt(mm[1].replace(/,/g, ''));
      if (v >= 100000 && v <= 50000000) { price = v; break; }
    }
  }

  const og = m(/<meta property="og:title" content="([^"]+)"/);
  let address = og ? og.replace(/£[\d,]+.*/, '').replace(/,\s*(for sale|property for sale)[^,]*$/i, '').replace(/\s*-\s*Rightmove\s*$/i, '').trim() : null;

  // Beds/baths from structured data
  const beds = m(/"numBedrooms"\s*:\s*(\d+)/) || m(/"bedrooms"\s*:\s*(\d+)/i) || m(/(\d+)\s*bed/i);
  const baths = m(/"numBathrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*bath/i);

  // Sqft from infoReel
  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) ||
                  m(/SIZE<\/span><\/dt><dd[^>]*>.*?<p[^>]*>(\d[\d,]+)\s*sq/i) ||
                  m(/(\d[\d,]+)\s*sq[^m]/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;

  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  const epc = m(/data-epc-rating[^>]*>([A-G])/i) || m(/<meta name="epc-rating" content="([A-G])"/i);
  const scRaw = m(/"serviceCharge"\s*:\s*"?([\d,]+)/) || m(/Service charge[^£]*£([\d,]+)/i);
  const sc = scRaw ? parseInt(scRaw.replace(/,/g, '')) : null;

  return { id: 'rm-' + listingId, price, address, beds, baths, sqft, tenure: null, floorLevel: null, lat, lng, epc, sc, dom: null };
}

function extractJittyDetail(html, url) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  const idMatch = url.match(/properties\/([A-Za-z0-9_-]+)/);
  const listingId = idMatch ? idMatch[1] : 'unknown';

  let price = null;
  const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
  for (const mm of gbpMatches) {
    const v = parseInt(mm[1].replace(/,/g, ''));
    if (v >= 100000 && v <= 50000000) { price = v; break; }
  }

  const og = m(/<meta property="og:title" content="([^"]+)"/);
  const address = og ? og.trim() : null;

  const beds = m(/"numBedrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*Bed/i);
  const baths = m(/"numBathrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*Bath/i);

  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) || m(/(\d[\d,]+)\s*sq/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;

  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  const scRaw = m(/"serviceCharge"\s*:\s*"?([\d,]+)/) || m(/Service charge[^£]*£([\d,]+)/i);
  const sc = scRaw ? parseInt(scRaw.replace(/,/g, '')) : null;

  return { id: 'jitty-' + listingId, price, address, beds, baths, sqft, tenure: null, floorLevel: null, lat, lng, epc: null, sc, dom: null };
}

function extractJdwDetail(html, url) {
  const m = (re, g = 1) => { const r = html.match(re); return r ? r[g].trim() : null; };
  const idMatch = url.match(/properties\/(\d+)/);
  const listingId = idMatch ? idMatch[1] : 'unknown';

  let price = null;
  const gbpMatches = [...html.matchAll(/£([\d,]+)/g)];
  for (const mm of gbpMatches) {
    const v = parseInt(mm[1].replace(/,/g, ''));
    if (v >= 100000 && v <= 50000000) { price = v; break; }
  }

  const og = m(/<meta property="og:title" content="([^"]+)"/);
  const addrRaw = m(/"streetAddress"\s*:\s*"([^"]+)"/) || m(/"address"\s*:\s*"([^"]{10,150})"/i);
  let address = og ? og.replace(/£[\d,]+.*/, '').replace(/,\s*for sale[^,]*$/i, '').trim() : null;
  if (!address && addrRaw) address = addrRaw.replace(/\n/g, ', ');

  const beds = m(/"numBedrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*bed/i);
  const baths = m(/"numBathrooms"\s*:\s*(\d+)/) || m(/(\d+)\s*bath/i);

  const sqftRaw = m(/"floorArea"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+)/) || m(/(\d[\d,]+)\s*sq/i) || m(/(\d{3,4})\s*sqft/i);
  const sqft = sqftRaw ? parseInt(sqftRaw.replace(/,/g, '')) : null;

  const lat = m(/"latitude"\s*:\s*([-\d.]+)/);
  const lng = m(/"longitude"\s*:\s*([-\d.]+)/);
  const epc = m(/data-epc-rating[^>]*>([A-G])/i) || m(/EPC[^>]*\s+([A-G])\s*\/\s*\[A-G\]/i);
  const scRaw = m(/"serviceCharge"\s*:\s*"?([\d,]+)/) || m(/Service charge[^£]*£([\d,]+)/i);
  const sc = scRaw ? parseInt(scRaw.replace(/,/g, '')) : null;

  return { id: 'jdw-' + listingId, price, address, beds, baths, sqft, tenure: null, floorLevel: null, lat, lng, epc, sc, dom: null };
}

// Main
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.error('=== propSearch Batch Scraper ===');
  console.error('Reading:', INPUT_FILE);
  
  const inputData = JSON.parse(FS.readFileSync(INPUT_FILE, 'utf8'));
  console.error(`Found ${inputData.length} properties to scrape`);
  
  const db = new DATABASE(DB_PATH, { readonly: false });
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  const logStream = FS.existsSync(SCRAPE_LOG)
    ? FS.createWriteStream(SCRAPE_LOG, { flags: 'a' })
    : FS.createWriteStream(SCRAPE_LOG, { flags: 'w' });
  
  for (const property of inputData) {
    const propId = property.id;
    const links = property.links || [];
    
    if (links.length === 0) continue;
    
    console.error(`\n[${processed + 1}/${inputData.length}] ${propId} — ${property.address}`);
    
    const results = [];
    
    for (const url of links) {
      const portal = detectPortal(url);
      if (!portal) {
        console.error(`  Unknown portal for: ${url}`);
        continue;
      }
      
      console.error(`  Scraping [${portal}]: ${url.slice(0, 80)}`);
      
      try {
        const result = await scrapeUrl(url, portal);
        if (result) {
          console.error(`  → price=${result.price}, beds=${result.beds}, sqft=${result.sqft}, epc=${result.epc}, sc=${result.sc}`);
          results.push(result);
        } else {
          console.error(`  → FAILED (no data extracted)`);
        }
      } catch (e) {
        console.error(`  → ERROR: ${e.message}`);
        errors++;
      }
      
      // Brief delay between URLs to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
    
    if (results.length > 0) {
      const merged = mergeResults(results);
      
      // Write to inbox as audit trail
      const inboxFile = PATH.join(INBOX_DIR, `${propId.replace(/[^a-z0-9_-]/gi, '_')}_scrape.json`);
      FS.writeFileSync(inboxFile, JSON.stringify({ propertyId: propId, ...merged }, null, 2));
      
      if (!dryRun) {
        const changed = updateProperty(db, propId, merged);
        if (changed) { updated++; console.error(`  ✓ DB updated`); }
        else console.error(`  - No DB changes needed`);
      } else {
        console.error(`  [DRY RUN] Would update DB with:`, JSON.stringify(merged, null, 2).slice(0, 300));
      }
      
      // Log to stream
      logStream.write(JSON.stringify({ propId, sources: merged.sources, price: merged.price, beds: merged.beds, sqft: merged.sqft, epc: merged.epc, sc: merged.sc, scrapedAt: merged.scrapedAt }) + '\n');
    }
    
    processed++;
    
    // Pause between properties to be respectful
    await new Promise(r => setTimeout(r, 2000));
  }
  
  logStream.end();
  db.close();
  
  console.error(`\n=== Done ===`);
  console.error(`Processed: ${processed}`);
  console.error(`Updated: ${updated}`);
  console.error(`Errors: ${errors}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
