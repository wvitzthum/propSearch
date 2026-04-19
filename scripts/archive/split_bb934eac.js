#!/usr/bin/env node
/**
 * split_bb934eac.js
 * Splits ps-bb934eac (4 aggregated Zoopla URLs for Westbourne Crescent, W2)
 * into 4 separate property records.
 *
 * Each new record: unique Zoopla ID as source_id + own links[], own details.
 * Original record: archived.
 *
 * Usage: node scripts/split_bb934eac.js [--dry-run] [--enrich]
 *   --dry-run : show what would be created without writing to DB
 *   --enrich  : scrape each Zoopla URL for enriched details (requires FlareSolverr)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { chromium } = require('playwright');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

const DRY_RUN = process.argv.includes('--dry-run');
const DO_ENRICH = process.argv.includes('--enrich');

// The 4 Zoopla URLs that were incorrectly merged
const SOURCE_LINKS = [
  'https://www.zoopla.co.uk/for-sale/details/72712138/',
  'https://www.zoopla.co.uk/for-sale/details/71214551/',
  'https://www.zoopla.co.uk/for-sale/details/72837853/',
  'https://www.zoopla.co.uk/for-sale/details/72712624/',
];

// ── FlareSolverr Proxy ────────────────────────────────────────────────────────
const FLARESOLVR_URL = process.env.FLARESOLVR_URL || 'http://localhost:8191';
const FLARESOLVR_SESSION = process.env.FLARESOLVR_SESSION || 'propSearch';
const FLARESOLVR_TIMEOUT = parseInt(process.env.FLARESOLVR_TIMEOUT || '90');

function scrapeFlare(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      cmd: 'request.get',
      url,
      maxTimeout: FLARESOLVR_TIMEOUT * 1000,
      session: FLARESOLVR_SESSION
    });
    const u = new URL(FLARESOLVR_URL);
    const opts = {
      hostname: u.hostname,
      port: u.port || 8191,
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
          if (j.status !== 'ok') return reject(new Error(j.message || 'FlareSolverr: ' + j.status));
          resolve(j.solution.response);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Extract Zoopla property data from HTML ──────────────────────────────────
function extractZoopla(html, url) {
  const clean = html.split('\\"').join('"');
  const result = { url, source_id: null, address: null, list_price: null,
    bedrooms: null, bathrooms: null, sqft: null, epc: null,
    tenure: null, service_charge: null, ground_rent: null,
    floor_level: null, postcode: null, date_first_listed: null,
    status: null, listing_id: null };

  // Listing ID
  const listingIdMatch = clean.match(/"listingId"\s*:\s*"([^"]+)"/);
  result.listing_id = listingIdMatch?.[1] || null;
  result.source_id = 'zoopla-' + result.listing_id;

  // Address
  const addrMatch = clean.match(/"streetAddress"\s*:\s*"([^"]+)"/) ||
                   clean.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  result.address = addrMatch?.[1]?.trim() || null;

  // Price
  const priceMatch = clean.match(/"originalPrice"\s*:\s*"?(\d+)"?/) ||
                     clean.match(/"internalValue"\s*:\s*"?(\d+)"?/) ||
                     clean.match(/"listingPrice"\s*:\s*"?(\d+)"?/);
  result.list_price = priceMatch ? parseInt(priceMatch[1]) : null;

  // Bedrooms / bathrooms
  const floorAreaIdx = clean.indexOf('"floorArea"');
  if (floorAreaIdx >= 0) {
    const ctx = clean.substring(Math.max(0, floorAreaIdx - 200), floorAreaIdx + 2000);
    result.bedrooms = parseInt(ctx.match(/"numBedrooms"\s*:\s*(\d)/)?.[1]) || null;
    result.bathrooms = parseInt(ctx.match(/"numBathrooms"\s*:\s*(\d)/)?.[1]) || null;
    result.sqft = parseInt(ctx.match(/"sizeSqFt"\s*:\s*"?(\d+)"?/?)?.[1]) || null;
  }

  // Tenure
  const tenureMatch = clean.match(/"tenureType"\s*:\s*"([^"]+)"/);
  result.tenure = tenureMatch?.[1] || null;

  // EPC
  const epcMatch = clean.match(/"efficiencyRating"\s*:\s*"([A-G])"/);
  result.epc = epcMatch?.[1] || null;

  // Postcode
  const pcMatch = clean.match(/"postalCode"\s*:\s*"([^"]+)"/);
  result.postcode = pcMatch?.[1] || null;

  // Service charge / ground rent
  const scMatch = clean.match(/"annualServiceCharge"\s*:\s*"?(\d+)"?/);
  result.service_charge = scMatch ? parseInt(scMatch[1]) : null;
  const grMatch = clean.match(/"annualGroundRent"\s*:\s*"?(\d+)"?/);
  result.ground_rent = grMatch ? parseInt(grMatch[1]) : null;

  // Floor level
  const floorMatch = clean.match(/"floorLevel"\s*:\s*"([^"]+)"/);
  result.floor_level = floorMatch?.[1] || null;

  // Date first listed
  const dflMatch = clean.match(/"dateFirstListed"\s*:\s*"([^"]+)"/);
  result.date_first_listed = dflMatch?.[1] || null;

  // Market status
  const statusMatch = clean.match(/"status"\s*:\s*"([^"]+)"/);
  result.status = statusMatch?.[1] || null;

  return result;
}

// ── Scrape one URL via FlareSolverr ─────────────────────────────────────────
async function enrichWithFlare(url) {
  try {
    const html = await scrapeFlare(url);
    return extractZoopla(html, url);
  } catch(e) {
    return { url, source_id: 'zoopla-' + url.match(/details\/(\d+)/)?.[1], error: e.message };
  }
}

// ── Scrape one URL via Playwright ────────────────────────────────────────────
async function enrichWithPlaywright(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-gpu']
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();
  const result = { url, source_id: null, address: null, list_price: null,
    bedrooms: null, bathrooms: null, sqft: null, epc: null,
    tenure: null, service_charge: null, ground_rent: null,
    floor_level: null, postcode: null, date_first_listed: null,
    status: null, listing_id: null };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const data = await page.evaluate(() => {
      // Try to find JSON in script tags
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        try {
          const t = s.textContent;
          if (t.includes('listingId') && t.includes('floorArea')) {
            return t;
          }
        } catch(e) {}
      }
      return document.body.innerText.substring(0, 5000);
    });

    if (data && data.includes('listingId')) {
      const extracted = extractZoopla(data, url);
      Object.assign(result, extracted);
    } else {
      result.error = 'No structured data found on page';
    }
  } catch(e) {
    result.error = 'Playwright error: ' + e.message;
  } finally {
    await browser.close();
  }
  return result;
}

// ── Generate new property ID ─────────────────────────────────────────────────
function newId() {
  return 'ps-' + require('crypto').randomBytes(4).toString('hex');
}

// ── Create a new property record ─────────────────────────────────────────────
function createRecord(enriched, idx) {
  const id = newId();
  const zooplaId = enriched.source_id?.split('-')[1] || url.match(/details\/(\d+)/)?.[1] || '';
  const address = enriched.address || `Westbourne Crescent, Lancaster Gate, London W2 (Unit ${idx + 1})`;
  const area = 'Bayswater (W2)';

  const record = {
    id,
    address,
    area,
    image_url: null,
    gallery: '[]',
    streetview_url: null,
    list_price: enriched.list_price || null,
    realistic_price: enriched.list_price || null,
    sqft: enriched.sqft || null,
    price_per_sqm: enriched.list_price && enriched.sqft
      ? parseFloat(((enriched.list_price * 10.764) / enriched.sqft).toFixed(2)) : null,
    nearest_tube_distance: 146,  // Keep same tube (Lancaster Gate) — spatially same
    park_proximity: 569,          // Same park proximity
    commute_paternoster: null,
    commute_canada_square: null,
    is_value_buy: null,
    epc: enriched.epc || null,
    tenure: enriched.tenure || 'leasehold',
    dom: null,
    neg_strategy: null,
    alpha_score: null,           // Recalculate after enrichment
    appreciation_potential: null,
    links: JSON.stringify([enriched.url]),  // Single link per record
    metadata: JSON.stringify({ split_from: 'ps-bb934eac', enriched: !!enriched.list_price }),
    floor_level: enriched.floor_level || null,
    floorplan_url: null,
    source: 'Zoopla / Manual (user-submitted)',
    source_name: 'Foxtons - Notting Hill',
    service_charge: enriched.service_charge || null,
    ground_rent: enriched.ground_rent || null,
    lease_years_remaining: null,
    vetted: 0,
    analyst_notes: `Split from ps-bb934eac (original merged record). Zoopla ID: ${zooplaId}. ` +
      (enriched.status ? `Market status: ${enriched.status}. ` : '') +
      (enriched.list_price ? `Price sourced from Zoopla. ` : 'Price not confirmed — needs enrichment.') +
      (enriched.error ? `[Enrichment failed: ${enriched.error}]` : ''),
    price_reduction_amount: null,
    price_reduction_percent: null,
    days_since_reduction: null,
    waitrose_distance: 400,
    whole_foods_distance: 700,
    wellness_hub_distance: null,
    epc_improvement_potential: null,
    est_capex_requirement: null,
    ltv_match_score: null,
    appr_bear_5yr: null,
    appr_base_5yr: null,
    appr_bull_5yr: null,
    appr_p10: null,
    appr_p50: null,
    appr_p90: null,
    rental_yield_gross: null,
    rental_yield_net: null,
    bedrooms: enriched.bedrooms || null,
    bathrooms: enriched.bathrooms || null,
    archived: enriched.status === 'sold' || enriched.status === 'withdrawn' ? 1 : 0,
    archive_reason: enriched.status === 'sold' || enriched.status === 'withdrawn'
      ? `Delisted — market status ${enriched.status} (${enriched.date_first_listed || 'no date'})`
      : null,
    market_status: enriched.status || 'unknown',
    last_checked: new Date().toISOString().split('T')[0],
    pipeline_status: 'discovered',
    council_tax_band: null,
    source_id: enriched.source_id || `zoopla-${zooplaId}`
  };

  return record;
}

// ── Insert record into properties table ──────────────────────────────────────
function insertRecord(record) {
  const cols = Object.keys(record).join(', ');
  const placeholders = Object.keys(record).map(() => '?').join(', ');
  const values = Object.values(record);

  db.prepare(`INSERT INTO properties (${cols}) VALUES (${placeholders})`).run(...values);
  return record.id;
}

// ── Archive original record ───────────────────────────────────────────────────
function archiveOriginal(reason) {
  db.prepare(`UPDATE properties SET archived = 1, archive_reason = ?, analyst_notes = analyst_notes || ' | ARCHIVED: ' || ? WHERE id = 'ps-bb934eac'`)
    .run(reason, reason);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== split_bb934eac.js ===');
  console.log('DRY_RUN:', DRY_RUN, '| DO_ENRICH:', DO_ENRICH);
  console.log('Source record: ps-bb934eac (to be archived)');
  console.log('Target URLs:', SOURCE_LINKS.length, '\n');

  // Verify original exists
  const original = db.prepare('SELECT id, address, list_price FROM properties WHERE id = ?').get('ps-bb934eac');
  if (!original) {
    console.error('ERROR: ps-bb934eac not found in DB.');
    process.exit(1);
  }
  console.log('Found original record:', original.address, '—', original.list_price, '\n');

  if (DRY_RUN) {
    console.log('[DRY RUN] Would create', SOURCE_LINKS.length, 'new records:\n');
    for (let i = 0; i < SOURCE_LINKS.length; i++) {
      console.log(`  [${i + 1}] ${SOURCE_LINKS[i]}`);
    }
    console.log('\n[DRY RUN] Would archive ps-bb934eac');
    return;
  }

  // ── Enrichment ──────────────────────────────────────────────────────────────
  const enriched = [];
  let method = 'none';

  if (DO_ENRICH) {
    // Try FlareSolverr first
    console.log('Attempting FlareSolverr enrichment...\n');
    const flarePromises = SOURCE_LINKS.map(url => enrichWithFlare(url));
    const flareResults = await Promise.allSettled(flarePromises.map(p => p.catch(e => ({ url: p.url, error: e.message }))));
    
    const flareData = flareResults.map((r, i) => {
      if (r.status === 'rejected') return { url: SOURCE_LINKS[i], error: r.reason?.message || String(r.reason) };
      return r.value;
    });

    const allFailed = flareData.every(r => r.error);
    if (!allFailed) {
      method = 'flaresolverr';
      enriched.push(...flareData);
    } else {
      console.log('FlareSolverr failed for all URLs. Trying Playwright...\n');
      for (const url of SOURCE_LINKS) {
        try {
          const data = await enrichWithPlaywright(url);
          enriched.push(data);
          console.log(`  Playwright: ${url} → ${data.list_price ? '£' + data.list_price.toLocaleString() : 'no price'} | ${data.bedrooms ? data.bedrooms + 'bed' : 'no beds'}`);
        } catch(e) {
          enriched.push({ url, error: e.message });
          console.log(`  Playwright FAILED: ${url} → ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      method = 'playwright';
    }
  }

  if (enriched.length === 0) {
    // No enrichment — create stub records from link data
    console.log('No enrichment available. Creating stub records from link metadata.\n');
    for (let i = 0; i < SOURCE_LINKS.length; i++) {
      const zooplaId = SOURCE_LINKS[i].match(/details\/(\d+)/)?.[1];
      enriched.push({
        url: SOURCE_LINKS[i],
        source_id: `zoopla-${zooplaId}`,
        list_price: null,
        bedrooms: null,
        sqft: null,
        epc: null,
        tenure: 'leasehold',
        service_charge: null,
        ground_rent: null,
        floor_level: null,
        postcode: null,
        date_first_listed: null,
        status: 'unknown',
        listing_id: zooplaId,
        error: 'Not enriched — needs manual data entry'
      });
    }
    method = 'stub';
  }

  // ── Create new records ───────────────────────────────────────────────────────
  console.log('\nCreating new records...\n');
  const newIds = [];

  for (let i = 0; i < enriched.length; i++) {
    const rec = createRecord(enriched[i], i);
    const newId = insertRecord(rec);
    newIds.push(newId);
    console.log(`  [${i + 1}] ${newId}`);
    console.log(`       URL:    ${rec.links}`);
    console.log(`       Price:  ${rec.list_price ? '£' + rec.list_price.toLocaleString() : 'TBC'}`);
    console.log(`       Beds:   ${rec.bedrooms || 'TBC'}`);
    console.log(`       Area:   ${rec.area}`);
    console.log(`       Status: ${rec.market_status}`);
    console.log(`       Alpha:  ${rec.alpha_score || 'TBC (needs calculation)'}`);
    console.log('');
  }

  // ── Archive original ─────────────────────────────────────────────────────────
  const newIdList = newIds.join(', ');
  const archiveReason = `SPLIT into ${newIds.length} separate records: ${newIdList}. ` +
    `4 Zoopla URLs for Westbourne Crescent, Lancaster Gate, W2 were incorrectly merged into one record. ` +
    `They represent different properties. Enrichment method: ${method}.`;

  archiveOriginal(archiveReason);
  console.log('Archived ps-bb934eac:', archiveReason.split('\n')[0], '\n');

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('=== Summary ===');
  console.log('  Method:         ', method);
  console.log('  New records:    ', newIds.length);
  console.log('  Original:       archived');
  for (const id of newIds) {
    const r = db.prepare('SELECT id, address, list_price, market_status FROM properties WHERE id = ?').get(id);
    console.log(`  ${r.id}: ${r.address} — £${r.list_price?.toLocaleString() || 'TBC'} [${r.market_status}]`);
  }

  console.log('\n[OK] Split complete. Run alpha_score recalculation for new records when enriched.');
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
