#!/usr/bin/env node
/**
 * split_bb934eac_v2.js
 * Archive 2 wrong-address manual records + create 4 new proper records.
 * Each new record: 1 Zoopla link as unique identifier.
 *
 * Usage: node scripts/split_bb934eac_v2.js [--dry-run]
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);
const DRY_RUN = process.argv.includes('--dry-run');

const TODAY = new Date().toISOString().split('T')[0];

// The 4 Zoopla URLs
const LINKS = [
  'https://www.zoopla.co.uk/for-sale/details/72712138/',
  'https://www.zoopla.co.uk/for-sale/details/71214551/',
  'https://www.zoopla.co.uk/for-sale/details/72837853/',
  'https://www.zoopla.co.uk/for-sale/details/72712624/',
];

// Records to archive
const TO_ARCHIVE = [
  { id: 'ps-bb934eac', reason: 'SPLIT: incorrect aggregation of 4 different properties. Split into new records.' },
  { id: 'man-02f23f4fbc2e', reason: 'SPLIT: wrong address (Ralph Court). Links 72712138/71214551 belong to Westbourne Crescent, W2.' },
  { id: 'man-1574bea3fe0f', reason: 'SPLIT: wrong address (Gloucester Terrace). Links 72837853/72712624 belong to Westbourne Crescent, W2.' },
];

function newId() {
  return 'ps-' + crypto.randomBytes(4).toString('hex');
}

function archiveRecord(id, reason) {
  const existing = db.prepare('SELECT id, pipeline_status FROM properties WHERE id = ?').get(id);
  if (!existing) { console.warn(`  [SKIP] ${id} not found`); return null; }
  const wasWatchlisted = existing.pipeline_status === 'watchlist';
  db.prepare(`UPDATE properties SET archived = 1, archive_reason = ?, analyst_notes = analyst_notes || ' | ARCHIVED: ' || ? WHERE id = ?`)
    .run(reason, reason, id);
  return wasWatchlisted;
}

function insertRecord(rec) {
  const cols = Object.keys(rec).join(', ');
  const placeholders = Object.keys(rec).map(() => '?').join(', ');
  db.prepare(`INSERT INTO properties (${cols}) VALUES (${placeholders})`).run(...Object.values(rec));
  return rec.id;
}

function makeRecord(url, watchlisted = false) {
  const id = newId();
  const zooplaId = url.match(/details\/(\d+)/)?.[1];
  return {
    id,
    address: `Westbourne Crescent, Lancaster Gate, London W2`,
    area: 'Bayswater (W2)',
    image_url: null,
    gallery: '[]',
    streetview_url: null,
    list_price: null,
    realistic_price: null,
    sqft: null,
    price_per_sqm: null,
    nearest_tube_distance: 146,
    park_proximity: 569,
    commute_paternoster: null,
    commute_canada_square: null,
    is_value_buy: null,
    epc: null,
    tenure: 'leasehold',
    dom: null,
    neg_strategy: null,
    alpha_score: null,
    appreciation_potential: null,
    links: JSON.stringify([url]),
    metadata: JSON.stringify({ split_from: 'ps-bb934eac', zoopla_id: zooplaId }),
    floor_level: null,
    floorplan_url: null,
    source: 'Zoopla / Manual (user-submitted)',
    source_name: null,
    service_charge: null,
    ground_rent: null,
    lease_years_remaining: null,
    vetted: 0,
    analyst_notes: `Split from ps-bb934eac. Zoopla listing: ${url}. Needs full enrichment (price, sqft, bedrooms, tenure, EPC, floor level, service charge, ground rent, lease years).`,
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
    bedrooms: null,
    bathrooms: null,
    archived: 0,
    archive_reason: null,
    market_status: 'unknown',
    last_checked: TODAY,
    pipeline_status: watchlisted ? 'watchlist' : 'discovered',
    council_tax_band: null,
    source_id: `zoopla-${zooplaId}`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== split_bb934eac_v2.js ===');
  console.log('DRY_RUN:', DRY_RUN, '\n');

  // 1. Verify original records exist
  console.log('Checking records to archive...');
  for (const r of TO_ARCHIVE) {
    const row = db.prepare('SELECT id, address, archived FROM properties WHERE id = ?').get(r.id);
    if (!row) { console.error(`  ERROR: ${r.id} not found in DB`); process.exit(1); }
    console.log(`  ${r.id}: ${row.address} [archived=${row.archived}]`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would archive:');
    for (const r of TO_ARCHIVE) console.log(`  - ${r.id}`);
    console.log('Would create:');
    for (const url of LINKS) console.log(`  - ${url}`);
    return;
  }

  // 2. Archive records (check watchlist status before)
  console.log('\nArchiving records...');
  const watchlistedIds = new Set();
  for (const r of TO_ARCHIVE) {
    const wasWl = archiveRecord(r.id, r.reason);
    if (wasWl) watchlistedIds.add(r.id);
    console.log(`  Archived: ${r.id}`);
  }

  // 3. Create 4 new records
  console.log('\nCreating new records...');
  const newRecords = [];
  for (const url of LINKS) {
    const watchlisted = watchlistedIds.size > 0; // if any were watchlisted, apply to all new ones
    const rec = makeRecord(url, watchlisted);
    const newId = insertRecord(rec);
    newRecords.push({ id: newId, url });
    console.log(`  Created: ${newId} — ${url}`);
  }

  // 4. Summary
  console.log('\n=== Summary ===');
  console.log('  Archived:', TO_ARCHIVE.map(r => r.id).join(', '));
  console.log('  New records:', newRecords.length);
  for (const { id, url } of newRecords) {
    const row = db.prepare('SELECT id, address, pipeline_status, market_status FROM properties WHERE id = ?').get(id);
    console.log(`    ${row.id} | ${row.pipeline_status} | ${row.market_status}`);
    console.log(`      URL: ${url}`);
  }

  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
