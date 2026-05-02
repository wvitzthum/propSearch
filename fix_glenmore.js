const Database = require('better-sqlite3');
const db = new Database('/workspaces/propSearch/data/propSearch.db');
const crypto = require('crypto');

const oldId = '13cb1730-d117-4df2-b989-f76f825d0871';
const newId = crypto.randomUUID();

console.log('=== Creating corrected Rightmove property record ===\n');

// Get the old record data
const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(oldId);

const links = JSON.stringify(['https://www.rightmove.co.uk/properties/169488674']);
const now = new Date().toISOString().split('T')[0];

// Check for related records in other tables
const tables = ['price_history', 'images'];
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t} WHERE property_id = ?`).get(oldId)?.c || 0;
  console.log(`${t}: ${count} related records`);
});

// Insert new record with only the essential fields
db.prepare(`
  INSERT INTO properties (
    id, address, area, list_price, realistic_price, sqft, price_per_sqm,
    bedrooms, bathrooms, tenure, lease_years_remaining, epc,
    lat, lng, source, source_id, links, analyst_notes, pipeline_status,
    archived, market_status, last_checked, metadata, alpha_score,
    nearest_tube_distance, park_proximity, image_url, gallery,
    floor_level, floorplan_url, service_charge, ground_rent, dom,
    council_tax_band
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  newId,
  prop.address,
  prop.area,
  prop.list_price,
  prop.realistic_price,
  prop.sqft,
  prop.price_per_sqm,
  prop.bedrooms,
  prop.bathrooms,
  prop.tenure,
  prop.lease_years_remaining,
  prop.epc,
  prop.lat,
  prop.lng,
  'rightmove',
  '169488674',
  links,
  prop.analyst_notes + ' | 2026-04-26: Split from contamination. This is the separate £800k Rightmove property.',
  'discovered',
  0,
  'active',
  now,
  prop.metadata,
  prop.alpha_score,
  prop.nearest_tube_distance,
  prop.park_proximity,
  prop.image_url,
  prop.gallery,
  prop.floor_level,
  prop.floorplan_url,
  prop.service_charge,
  prop.ground_rent,
  prop.dom,
  prop.council_tax_band
);

console.log('\nNew record created with ID:', newId);

// Migrate ALL related records
db.prepare('UPDATE price_history SET property_id = ? WHERE property_id = ?').run(newId, oldId);
console.log('Migrated price_history');

db.prepare('UPDATE images SET property_id = ? WHERE property_id = ?').run(newId, oldId);
console.log('Migrated images');

// Delete the old contaminated record
db.prepare('DELETE FROM properties WHERE id = ?').run(oldId);
console.log('Deleted contaminated record:', oldId);

console.log('\n=== VERIFICATION ===\n');

// Check both records
const rec1 = db.prepare("SELECT id, address, list_price, links, tenure, sqft, bedrooms, bathrooms FROM properties WHERE id = 'zo-70438237'").get();
const rec2 = db.prepare("SELECT id, address, list_price, links, tenure, sqft, bedrooms, bathrooms FROM properties WHERE id = ?").get(newId);

console.log('Record 1 (Zoopla - £675k SoFH):');
console.log('  ID:', rec1.id);
console.log('  Price: £' + rec1.list_price.toLocaleString());
console.log('  Tenure:', rec1.tenure);
console.log('  Size:', rec1.sqft + ' sqft, ' + rec1.bedrooms + 'bd/' + rec1.bathrooms + 'ba');
console.log('  Links:', rec1.links);

console.log('\nRecord 2 (Rightmove - £800k):');
console.log('  ID:', rec2.id.substring(0, 8) + '...');
console.log('  Price: £' + rec2.list_price.toLocaleString());
console.log('  Tenure:', rec2.tenure);
console.log('  Size:', rec2.sqft + ' sqft, ' + rec2.bedrooms + 'bd/' + rec2.bathrooms + 'ba');
console.log('  Links:', rec2.links);
