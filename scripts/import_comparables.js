/**
 * import_comparables.js
 * =====================
 * Imports comparable properties into propSearch.db with full enrichment.
 * Uses card data from Zoopla search scrapes + spatial enrichment.
 *
 * Usage:
 *   node scripts/import_comparables.js <json_file>
 *   node scripts/import_comparables.js /tmp/candidates_to_import.json
 *
 * Input JSON format:
 *   [{
 *     "id": "zo-72947017",
 *     "address": "Geffrye Court, London N1",
 *     "area": "Islington (N1)",
 *     "list_price": 650000,
 *     "sqft": 775,
 *     "bedrooms": 2,
 *     "bathrooms": 1,
 *     "tenure": "leasehold",
 *     "floor_level": "second floor",
 *     "lat": 51.528,
 *     "lng": -0.0888,
 *     "service_charge": null,
 *     "source": "zoopla",
 *     "source_id": "72947017",
 *     "metadata": { "original_card_beds": "2", "original_card_price": 650000 }
 *   }]
 *
 * Enrichment computed:
 *   - price_per_sqm from list_price / (sqft * 10.764)
 *   - alpha_score via scripts/alphaScore.ts
 *   - nearest_tube_distance via haversine
 *   - park_proximity (nearest park from hardcoded set)
 *   - streetview_url from lat/lng
 *   - realistic_price (estimated at list_price)
 *   - analyst_notes (template-based)
 */

const Database = require('better-sqlite3');
const FS = require('fs');
const PATH = require('path');
const CRYPTO = require('crypto');

const DB_PATH = process.env.SQLITE_PATH || PATH.join(__dirname, '..', 'data', 'propSearch.db');
const db = new Database(DB_PATH);

// Haversine distance in metres
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Hardcoded tube stations (pre-seeded — Overpass API unavailable)
const TUBE_STATIONS = {
  // NW3 / Belsize Park
  'Belsize Park':     { lat: 51.5463, lng: -0.1579 },
  'Hampstead':        { lat: 51.5579, lng: -0.1786 },
  'Swiss Cottage':    { lat: 51.5432, lng: -0.1733 },
  'Finchley Road':    { lat: 51.5472, lng: -0.1801 },
  // Islington / Angel
  'Angel':            { lat: 51.5296, lng: -0.1057 },
  'King\'s Cross':   { lat: 51.5308, lng: -0.1238 },
  'Highbury & Islington': { lat: 51.5478, lng: -0.1078 },
  'Canonbury':        { lat: 51.5455, lng: -0.0863 },
  'Essex Road':       { lat: 51.5428, lng: -0.0878 },
  'Old Street':       { lat: 51.5257, lng: -0.0874 },
};

// Hardcoded parks (pre-seeded)
const PARKS = {
  // NW3
  'Hampstead Heath':  { lat: 51.5561, lng: -0.1590 },
  'Belsize Park':     { lat: 51.5446, lng: -0.1534 },
  'Swiss Cottage':    { lat: 51.5431, lng: -0.1762 },
  // Islington
  'Regent\'s Canal':  { lat: 51.5350, lng: -0.0870 },
  'Canonbury Square': { lat: 51.5461, lng: -0.0870 },
  'Islington Green':   { lat: 51.5360, lng: -0.1020 },
};

function nearestTube(lat, lng) {
  let nearest = null, minDist = Infinity;
  for (const [name, coords] of Object.entries(TUBE_STATIONS)) {
    const d = haversine(lat, lng, coords.lat, coords.lng);
    if (d < minDist) { minDist = d; nearest = { name, distance: Math.round(d) }; }
  }
  return nearest;
}

function nearestPark(lat, lng) {
  let nearest = null, minDist = Infinity;
  for (const [name, coords] of Object.entries(PARKS)) {
    const d = haversine(lat, lng, coords.lat, coords.lng);
    if (d < minDist) { minDist = d; nearest = { name, distance: Math.round(d) }; }
  }
  return nearest;
}

function estimateSqft(listPrice, area) {
  // Rough £/sqft estimates by area for estimating sqft when unknown
  const ppSqftEst = {
    'Belsize Park (NW3)': 850,
    'Islington (N1)':       750,
    'Angel (N1)':          750,
  };
  const est = ppSqftEst[area] || 800;
  return Math.round(listPrice / est);
}

function generateStreetviewUrl(lat, lng, heading) {
  const key = CRYPTO.createHash('sha256').update(`${lat},${lng}`).digest('hex').substring(0, 16);
  const sig = CRYPTO.createHash('sha256').update(key).digest('hex').substring(0, 8);
  const headingVal = heading || Math.floor(Math.random() * 360);
  return `https://streetview.google.com/?ll=${lat},${lng}&heading=${headingVal}&pitch=0&fov=90`;
}

function importProperty(data) {
  const sqft = data.sqft || estimateSqft(data.list_price, data.area);
  const sqm = sqft / 10.764;
  const price_per_sqm = Math.round(data.list_price / sqm);
  
  const tube = nearestTube(data.lat, data.lng);
  const park = nearestPark(data.lat, data.lng);
  
  // Inline alpha score calculation (avoids TypeScript ESM require in CJS context)
  const AREA_BENCHMARKS = {
    'Belsize Park (NW3)': 12000,
    'Islington (N1)': 11000,
    'Angel (N1)': 11000,
  };
  const benchmark = AREA_BENCHMARKS[data.area] || 10000;
  const discountPct = ((benchmark - price_per_sqm) / benchmark) * 100;
  const priceScore = Math.min(10, Math.max(0, discountPct / 10));
  const tenureScore = data.tenure === 'share_of_freehold' ? 8 : 5;
  const tubeDist = tube?.distance || 1000;
  const spatialScore = tubeDist <= 300 ? 8 : tubeDist <= 500 ? 5 : tubeDist <= 800 ? 3 : 0;
  const overall = Math.round((tenureScore * 0.4 + spatialScore * 0.3 + priceScore * 0.3) / 10 * 8 * 10) / 10;
  const bd = { overall, tenure: { score: tenureScore }, spatial: { score: spatialScore }, price: { score: priceScore } };
  
  const links = JSON.stringify([
    `https://www.zoopla.co.uk/for-sale/details/${data.source_id}/`
  ]);
  
  const streetview_url = generateStreetviewUrl(data.lat, data.lng);
  
  // Merge lat/lng into metadata (schema has no lat/lng columns)
  const meta = { ...(data.metadata || {}), lat: data.lat, lng: data.lng };
  
  const analystNotes = [
    `COMPARABLE — imported ${new Date().toISOString().split('T')[0]}`,
    `Source: Zoopla card data + spatial enrichment`,
    `Near tube: ${tube?.name || '?'} (${tube?.distance || '?'}m)`,
    `Near park: ${park?.name || '?'} (${park?.distance || '?'}m)`,
    `Alpha: ${bd.overall.toFixed(1)} | T:${bd.tenure.score}/S:${bd.spatial.score}/P:${bd.price.score}`,
    `Note: Awaiting full detail page enrichment — EPC/SC/unexpired lease TBC`,
    data.analyst_notes || ''
  ].filter(Boolean).join('\n');
  
  const insert = db.prepare(`
    INSERT INTO properties (
      id, address, area, list_price, realistic_price, sqft, price_per_sqm,
      nearest_tube_distance, park_proximity, alpha_score,
      tenure, floor_level, streetview_url, links, analyst_notes,
      source, source_id, metadata,
      market_status, pipeline_status, bedrooms, bathrooms,
      service_charge, vetted
    ) VALUES (
      @id, @address, @area, @list_price, @realistic_price, @sqft, @price_per_sqm,
      @nearest_tube_distance, @park_proximity, @alpha_score,
      @tenure, @floor_level, @streetview_url, @links, @analyst_notes,
      @source, @source_id, @metadata,
      'active', 'discovered', @bedrooms, @bathrooms,
      @service_charge, 0
    )
  `);
  
  try {
    insert.run({
      id: data.id,
      address: data.address,
      area: data.area,
      list_price: data.list_price,
      realistic_price: data.list_price,
      sqft,
      price_per_sqm,
      nearest_tube_distance: tube?.distance || null,
      park_proximity: park?.name || null,
      alpha_score: Math.round(bd.overall * 10) / 10,
      tenure: data.tenure || null,
      floor_level: data.floor_level || null,
      streetview_url,
      links,
      analyst_notes: analystNotes,
      source: data.source || 'zoopla',
      source_id: data.source_id,
      metadata: JSON.stringify(meta),
      market_status: 'active',
      pipeline_status: 'discovered',
      bedrooms: data.bedrooms || null,
      bathrooms: data.bathrooms || null,
      lat: data.lat || null,
      lng: data.lng || null,
      service_charge: data.service_charge || null,
    });
    console.log(`✓ Imported: ${data.id} | ${data.address} | £${(data.list_price/1000).toFixed(0)}k | alpha: ${bd.overall.toFixed(1)}`);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      console.log(`⚠ Already exists: ${data.id} — skipping`);
    } else {
      throw e;
    }
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/import_comparables.js <candidates.json>');
    process.exit(1);
  }
  
  const candidates = JSON.parse(FS.readFileSync(file));
  
  if (!Array.isArray(candidates)) {
    console.error('Input must be a JSON array of candidates');
    process.exit(1);
  }
  
  console.error(`Importing ${candidates.length} candidates into ${DB_PATH}`);
  for (const c of candidates) {
    importProperty(c);
  }
  console.error('Done.');
}

if (require.main === module) {
  main();
}

module.exports = { importProperty, nearestTube, nearestPark, estimateSqft };
