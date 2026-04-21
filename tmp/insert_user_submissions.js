const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = 'data/propSearch.db';
const db = new Database(DB_PATH);

const archiveFile = 'data/archive/imports/1776023926053_user_submissions_2026-04-12T19-56-25-466Z.json';
const leads = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));

const today = new Date().toISOString().split('T')[0];
const historyStmt = db.prepare('INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)');
const dedupStmt = db.prepare("SELECT id FROM properties WHERE address = ? AND area = ?");

// 58-col INSERT matching live schema (all columns from PRAGMA table_info)
const insertStmt = db.prepare(`
  INSERT INTO properties (
    id, address, area, image_url, gallery, streetview_url, floorplan_url,
    list_price, realistic_price, sqft, price_per_sqm,
    nearest_tube_distance, park_proximity, commute_paternoster,
    commute_canada_square, is_value_buy, epc, tenure,
    service_charge, ground_rent, lease_years_remaining,
    dom, neg_strategy, alpha_score, appreciation_potential, links,
    metadata, floor_level, source, source_name, vetted, analyst_notes,
    price_reduction_amount, price_reduction_percent, days_since_reduction,
    epc_improvement_potential, est_capex_requirement,
    waitrose_distance, whole_foods_distance, wellness_hub_distance,
    ltv_match_score, appr_bear_5yr, appr_base_5yr, appr_bull_5yr,
    appr_p10, appr_p50, appr_p90, rental_yield_gross, rental_yield_net,
    bedrooms, bathrooms,
    archived, archive_reason, market_status, last_checked, pipeline_status,
    property_rank, council_tax_band
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

let imported = 0, skipped = 0;
for (const lead of leads) {
  const existing = dedupStmt.get(lead.address, lead.area);
  if (existing) {
    console.log('SKIP (duplicate): ' + lead.address);
    skipped++;
    continue;
  }

  const id = crypto.randomUUID();
  const galleryJson = JSON.stringify(lead.gallery || []);
  const linksJson = JSON.stringify([{ url: lead.url, source: lead.source_name }]);
  const metadata = JSON.stringify({ first_seen: today, last_seen: today, discovery_count: 1, is_new: true });
  const listPrice = lead.list_price || 0;
  const realisticPrice = lead.realistic_price || listPrice;

  try {
    insertStmt.run(
      id,
      lead.address,
      lead.area,
      lead.image_url || null,
      galleryJson,
      lead.streetview_url || null,
      lead.floorplan_url || null,
      lead.list_price || null,
      lead.realistic_price || null,
      lead.sqft || null,
      null,               // price_per_sqm
      lead.nearest_tube_distance || null,
      lead.park_proximity || null,
      lead.commute_paternoster || null,
      lead.commute_canada_square || null,
      realisticPrice < listPrice ? 1 : 0,
      lead.epc || null,
      lead.tenure || null,
      lead.service_charge || 0,
      lead.ground_rent || 0,
      lead.lease_years_remaining || 0,
      lead.dom || null,
      lead.neg_strategy || null,
      null,               // alpha_score
      null,               // appreciation_potential
      linksJson,
      metadata,
      lead.floor_level || null,
      lead.source || 'USER_SUBMISSION',
      lead.source_name || null,
      0,                  // vetted
      lead.analyst_notes || null,
      lead.price_reduction_amount || null,
      lead.price_reduction_percent || null,
      lead.days_since_reduction || null,
      null,               // epc_improvement_potential
      null,               // est_capex_requirement
      null,               // waitrose_distance
      null,               // whole_foods_distance
      null,               // wellness_hub_distance
      null,               // ltv_match_score
      null, null, null, null, null, null, null, null,  // appr_* + rental_yield_*
      lead.bedrooms || null,
      lead.bathrooms || null,
      0,                  // archived
      null,               // archive_reason
      'active',
      today,
      'discovered',
      null,               // property_rank
      lead.council_tax_band || null
    );

    if (lead.list_price) {
      historyStmt.run(id, lead.list_price, today);
    }

    const priceStr = lead.list_price ? 'GBP' + lead.list_price.toLocaleString() : 'TBC';
    console.log('IMPORTED: ' + lead.address + ' | ' + priceStr + ' | ' + (lead.bedrooms || '?') + ' bed | id=' + id.substring(0, 8));
    imported++;
  } catch (e) {
    console.error('ERROR: ' + lead.address + ' -> ' + e.message);
  }
}

console.log('\nResult: ' + imported + ' imported, ' + skipped + ' skipped');
