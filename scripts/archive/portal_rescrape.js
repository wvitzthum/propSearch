/**
 * propSearch: Portal Re-scrape Loop (DE-220)
 * 
 * Re-fetches active properties from Rightmove and Zoopla using their portal listing IDs,
 * detects price changes, and writes enriched price_history entries.
 * 
 * Workflow:
 * 1. Load all active properties with portal links from SQLite
 * 2. Re-scrape each portal URL (Playwright for Rightmove, FlareSolverr for Zoopla)
 * 3. Compare current list_price in DB vs portal price
 * 4. On change: write enriched price_history entry + update properties reduction fields
 * 5. Update source_id if newly discovered from portal
 * 
 * Run: node scripts/portal_rescrape.js [--dry-run]
 */

const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

// FlareSolverr config (same as scrape_visuals.js)
const FLARESOLVR_URL = process.env.FLARESOLVR_URL || 'http://localhost:8191';
const FLARESOLVR_SESSION = process.env.FLARESOLVR_SESSION || 'propSearch';
const FLARESOLVR_TIMEOUT = parseInt(process.env.FLARESOLVR_TIMEOUT || '90');

// ── FlareSolverr Proxy ────────────────────────────────────────────────────────
function scrapeWithFlaresolverr(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      cmd: 'request.get',
      url,
      maxTimeout: FLARESOLVR_TIMEOUT * 1000,
      session: FLARESOLVR_SESSION
    });
    const fsUrl = new URL(FLARESOLVR_URL);
    const opts = {
      hostname: fsUrl.hostname,
      port: fsUrl.port || 8191,
      path: '/v1',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.status !== 'ok') return reject(new Error(j.message || 'FlareSolverr failed: ' + j.status));
          resolve(j.solution.response);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Zoopla Extraction (from scrape_visuals.js DAT-205 patterns) ───────────────
function extractZooplaData(html) {
  const unesc = html.split('\\"').join('"');
  const result = {};

  // Current price
  const price = unesc.match(/"originalPrice"\s*:\s*"?(\d+)"?/) ||
                unesc.match(/"internalValue"\s*:\s*"?(\d+)"?/) ||
                unesc.match(/"listingPrice"\s*:\s*"?(\d+)"?/);
  result.list_price = price ? parseInt(price[1]) : null;

  // Price history array
  const priceHistMatch = unesc.match(/"priceHistory"\s*:\s*(\[[^\]]*\])/);
  result.priceHistory = [];
  if (priceHistMatch) {
    try { result.priceHistory = JSON.parse(priceHistMatch[1]); } catch(e) {}
  }

  // Listing ID and date first listed
  result.listingId = unesc.match(/"listingId"\s*:\s*"?([^",}]+)"?/)?.[1] || null;
  result.dateFirstListed = unesc.match(/"dateFirstListed"\s*:\s*"([^"]+)"/)?.[1] || null;

  // Bedrooms / bathrooms from floorArea context
  const idx = unesc.indexOf('"floorArea"');
  if (idx >= 0) {
    const ctx = unesc.substring(Math.max(0, idx - 300), idx + 2000);
    const numBeds = ctx.match(/"numBedrooms"\s*:\s*(\d)/);
    const numBaths = ctx.match(/"numBathrooms"\s*:\s*(\d)/);
    result.bedrooms = numBeds ? parseInt(numBeds[1]) : null;
    result.bathrooms = numBaths ? parseInt(numBaths[1]) : null;
  }

  return result;
}

// ── Rightmove Extraction (from enrich_chelsea_detail.js DAT-204 patterns) ─────
async function scrapeRightmoveDetail(browser, url) {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();

  const result = { url, list_price: null, listingId: null, bedrooms: null, bathrooms: null };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(8000);

    const pd = await page.evaluate(() => {
      const model = window.PAGE_MODEL || window.jsonModel || window.__PRELOADED_STATE__;
      return model?.propertyData || null;
    });

    if (pd) {
      result.listingId = pd.listingId || null;
      const rawPrice = pd.prices?.primaryPrice || pd.prices?.price?.amount;
      if (rawPrice) {
        result.list_price = parseInt(String(rawPrice).replace(/[£,\s]/g, '')) || null;
      }
      result.bedrooms = pd.bedrooms || null;
      result.bathrooms = pd.bathrooms || null;
    }
  } finally {
    await ctx.close();
  }

  return result;
}

// ── Scrape a single portal URL ───────────────────────────────────────────────
async function scrapePortalUrl(browser, url) {
  if (url.includes('zoopla.co.uk')) {
    try {
      const html = await scrapeWithFlaresolverr(url);
      return extractZooplaData(html);
    } catch (e) {
      return { error: 'Zoopla FlareSolverr failed: ' + e.message };
    }
  } else if (url.includes('rightmove.co.uk')) {
    return scrapeRightmoveDetail(browser, url);
  }
  return { error: 'Unknown portal: ' + url };
}

// ── HPI Helper ───────────────────────────────────────────────────────────────
function getLatestHpi() {
  try {
    const row = db.prepare("SELECT data FROM global_context WHERE key = 'macro_trend'").get();
    if (!row) return null;
    const ctx = JSON.parse(row.data);
    // macro_trend.json structure: find the most recent HPI value
    const hpiArr = ctx?.data?.[0]?.HPI;
    if (Array.isArray(hpiArr) && hpiArr.length > 0) {
      return hpiArr[hpiArr.length - 1]?.value || null;
    }
    return null;
  } catch (e) { return null; }
}

// ── Insert enriched price history entry ─────────────────────────────────────
function insertPriceEntry(propertyId, price, date, opts = {}) {
  const {
    status = 'listed',
    reductionPct = null,
    portalPriceId = null,
    pricePerSqm = null,
    daysOnMarket = null,
    hpi = null
  } = opts;

  const existing = db.prepare('SELECT id FROM price_history WHERE property_id = ? AND date = ?')
    .get(propertyId, date);
  if (existing) return false;

  db.prepare(`
    INSERT INTO price_history
      (property_id, price, date, status, reduction_pct, price_per_sqm, days_on_market, london_hpi, source, portal_price_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'portal_rescrape', ?)
  `).run(propertyId, price, date, status, reductionPct, pricePerSqm, daysOnMarket, hpi, portalPriceId);

  return true;
}

// ── Update property reduction fields ─────────────────────────────────────────
function updateReduction(propId, reductionAmount, reductionPct, daysSince) {
  db.prepare(`
    UPDATE properties
    SET price_reduction_amount = ?, price_reduction_percent = ?, days_since_reduction = ?
    WHERE id = ?
  `).run(reductionAmount, reductionPct, daysSince, propId);
}

function clearReduction(propId) {
  db.prepare(`
    UPDATE properties
    SET price_reduction_amount = NULL, price_reduction_percent = NULL, days_since_reduction = NULL
    WHERE id = ?
  `).run(propId);
}

// ── Update source_id if newly discovered ────────────────────────────────────
function upsertSourceId(propId, newSourceId, portal) {
  const existing = db.prepare('SELECT source_id FROM properties WHERE id = ?').get(propId);
  if (existing && existing.source_id) return; // don't overwrite
  if (!newSourceId) return;
  const formatted = `${portal.toLowerCase()}-${newSourceId}`;
  db.prepare('UPDATE properties SET source_id = ? WHERE id = ?').run(formatted, propId);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function runRescrape() {
  const DRY_RUN = process.argv.includes('--dry-run');
  console.log(`\n=== propSearch Portal Re-scrape (DE-220) — ${new Date().toISOString().split('T')[0]} ===`);
  console.log(DRY_RUN ? '[DRY RUN] No changes will be written\n' : '');

  // 1. Load active properties
  const properties = db.prepare(`
    SELECT id, address, list_price, links, source_id, sqft, dom, bedrooms, bathrooms
    FROM properties
    WHERE archived = 0 AND list_price IS NOT NULL
  `).all();

  // 2. Filter to those with portal links
  const toScrape = [];
  for (const prop of properties) {
    if (!prop.links) continue;
    let links;
    try { links = JSON.parse(prop.links); } catch(e) { continue; }
    if (!Array.isArray(links)) continue;
    const portalLinks = links.filter(u =>
      u.includes('rightmove.co.uk') || u.includes('zoopla.co.uk')
    );
    if (portalLinks.length > 0) {
      toScrape.push({ ...prop, portalLinks });
    }
  }

  console.log(`Active properties with portal links: ${toScrape.length} / ${properties.length}\n`);

  if (toScrape.length === 0) {
    console.log('[OK] No properties with portal links to rescrape.');
    return;
  }

  // 3. Launch browser once
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-gpu']
  });

  const hpi = getLatestHpi();
  console.log(`HPI benchmark: ${hpi ? hpi.toFixed(1) : 'not available'}\n`);

  let priceChanges = 0, sourceIdUpdates = 0, errors = 0, skipped = 0;

  for (const prop of toScrape) {
    const TODAY = new Date().toISOString().split('T')[0];
    let changed = false;

    for (const url of prop.portalLinks) {
      try {
        const portal = url.includes('zoopla') ? 'Zoopla' : 'Rightmove';
        const portalData = await scrapePortalUrl(browser, url);

        if (portalData.error) {
          errors++;
          console.log(`  [ERROR] ${prop.address}: ${portalData.error}`);
          continue;
        }

        const newPrice = portalData.list_price;
        const newListingId = portalData.listingId;
        const newBeds = portalData.bedrooms;
        const newBaths = portalData.bathrooms;

        // Upsert source_id if newly discovered
        if (newListingId && !prop.source_id) {
          if (!DRY_RUN) upsertSourceId(prop.id, newListingId, portal);
          sourceIdUpdates++;
          console.log(`  [source_id] ${prop.address}: ${newListingId}`);
        }

        // Price change detection
        if (newPrice && newPrice !== prop.list_price) {
          const change = newPrice - prop.list_price;
          const changePct = ((change / prop.list_price) * 100).toFixed(2);
          const portalPriceId = newListingId || null;

          // Get previous price from price_history
          const prevEntry = db.prepare(`
            SELECT price, date FROM price_history
            WHERE property_id = ? ORDER BY date DESC LIMIT 1
          `).get(prop.id);

          if (change < 0) {
            // Price reduction
            const reductionAmount = Math.abs(change);
            const reductionPct = parseFloat(((reductionAmount / prop.list_price) * 100).toFixed(2));
            const daysSince = prevEntry
              ? Math.round((new Date(TODAY) - new Date(prevEntry.date)) / (1000 * 60 * 60 * 24))
              : null;
            const pricePerSqm = (prop.sqft && prop.sqft > 0)
              ? parseFloat(((newPrice * 10.764) / prop.sqft).toFixed(2))
              : null;

            if (!DRY_RUN) {
              const inserted = insertPriceEntry(prop.id, newPrice, TODAY, {
                status: 'reduced',
                reductionPct,
                portalPriceId,
                pricePerSqm,
                daysOnMarket: prop.dom || null,
                hpi
              });
              if (inserted) {
                updateReduction(prop.id, reductionAmount, reductionPct, daysSince);
              }
            }

            console.log(`  [REDUCED] ${prop.address}`);
            console.log(`           £${prop.list_price?.toLocaleString()} → £${newPrice?.toLocaleString()}`);
            console.log(`           -£${reductionAmount.toLocaleString()} (${reductionPct}%)`);
            priceChanges++;
            changed = true;
          } else {
            // Price increase — clear reduction flags
            if (!DRY_RUN) {
              clearReduction(prop.id);
              insertPriceEntry(prop.id, newPrice, TODAY, {
                status: 'listed',
                portalPriceId,
                pricePerSqm: (prop.sqft && prop.sqft > 0)
                  ? parseFloat(((newPrice * 10.764) / prop.sqft).toFixed(2))
                  : null,
                daysOnMarket: prop.dom || null,
                hpi
              });
            }
            console.log(`  [INCREASED] ${prop.address}`);
            console.log(`              £${prop.list_price?.toLocaleString()} → £${newPrice?.toLocaleString()}`);
            priceChanges++;
            changed = true;
          }

          // Also update list_price on properties if we have a reliable scrape
          if (!DRY_RUN) {
            db.prepare('UPDATE properties SET list_price = ?, last_checked = ? WHERE id = ?')
              .run(newPrice, TODAY, prop.id);
          }
        }

        // Update bedrooms/bathrooms if DB is null/missing and portal has data
        if (!DRY_RUN && (newBeds || newBaths)) {
          const updates = [];
          const params = [];
          if (newBeds && !prop.bedrooms) { updates.push('bedrooms = ?'); params.push(newBeds); }
          if (newBaths && !prop.bathrooms) { updates.push('bathrooms = ?'); params.push(newBaths); }
          if (updates.length > 0) {
            params.push(prop.id);
            db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            console.log(`  [ENRICHED] ${prop.address}: beds=${newBeds ?? prop.bedrooms} baths=${newBaths ?? prop.bathrooms}`);
          }
        }

      } catch (e) {
        errors++;
        console.log(`  [ERROR] ${prop.address}: ${e.message}`);
      }

      // Rate limit between URLs
      await new Promise(r => setTimeout(r, 3000));
    }

    if (!changed && errors === 0) {
      skipped++;
    }
  }

  await browser.close();

  console.log(`\n=== Summary ===`);
  console.log(`  Properties scanned: ${toScrape.length}`);
  console.log(`  Price changes detected: ${priceChanges}`);
  console.log(`  Source IDs discovered: ${sourceIdUpdates}`);
  console.log(`  Scrapes errors: ${errors}`);
  console.log(`  No change: ${skipped}`);
  if (DRY_RUN) console.log('  [DRY RUN — no data written]');
}

// ── Bootstrap: create price_history if missing ───────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id TEXT,
    price REAL,
    date TEXT,
    status TEXT,
    reduction_pct REAL,
    price_per_sqm REAL,
    days_on_market INTEGER,
    london_hpi REAL,
    source TEXT,
    portal_price_id TEXT,
    FOREIGN KEY(property_id) REFERENCES properties(id)
  )
`).run();

runRescrape().catch(e => { console.error(e); process.exit(1); });
