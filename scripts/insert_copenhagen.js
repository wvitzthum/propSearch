const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

async function insertCopenhagen() {
  const property = {
    id: crypto.randomUUID(),
    address: 'Copenhagen Street, Kings Quarter',
    area: 'Islington (N1)',
    image_url: 'https://media.rightmove.co.uk/dir/crop/10:9-16:9/property-photo/b7f1d03d5/172342250/b7f1d03d582b7ce72893bfe6fc09443d_max_1176x786.jpeg', 
    gallery: [
      'https://media.rightmove.co.uk/dir/crop/10:9-16:9/property-photo/b7f1d03d5/172342250/b7f1d03d582b7ce72893bfe6fc09443d_max_1176x786.jpeg',
      'https://media.rightmove.co.uk/dir/crop/10:9-16:9/property-photo/b7f1d03d5/172342250/b7f1d03d582b7ce72893bfe6fc09443d_max_1176x786.jpeg',
      'https://media.rightmove.co.uk/dir/crop/10:9-16:9/property-photo/b7f1d03d5/172342250/b7f1d03d582b7ce72893bfe6fc09443d_max_1176x786.jpeg',
      'https://media.rightmove.co.uk/dir/crop/10:9-16:9/property-photo/b7f1d03d5/172342250/b7f1d03d582b7ce72893bfe6fc09443d_max_1176x786.jpeg',
      'https://media.rightmove.co.uk/dir/crop/10:9-16:9/property-photo/b7f1d03d5/172342250/b7f1d03d582b7ce72893bfe6fc09443d_max_1176x786.jpeg'
    ],
    streetview_url: 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=51.5345,-0.1178',
    list_price: 700000,
    realistic_price: 679000,
    sqft: 840,
    price_per_sqm: 8974,
    nearest_tube_distance: 650, 
    park_proximity: 100, 
    commute_paternoster: 22,
    commute_canada_square: 32,
    is_value_buy: 1,
    epc: 'B',
    tenure: 'Leasehold (115 yrs)',
    dom: 45,
    neg_strategy: 'Strategic: -3% bid (Reduced recently)',
    alpha_score: 8.2,
    appreciation_potential: 7.5,
    links: ['https://www.rightmove.co.uk/properties/172342250'],
    metadata: {
      first_seen: '2026-03-09',
      last_seen: '2026-03-09',
      discovery_count: 1,
      is_new: 1
    },
    floor_level: '4th Floor',
    source: 'Automated Scrape',
    source_name: 'Rightmove'
  };

  const stmt = db.prepare(`
    INSERT INTO properties (
      id, address, area, image_url, gallery, streetview_url, 
      list_price, realistic_price, sqft, price_per_sqm, 
      nearest_tube_distance, park_proximity, commute_paternoster, 
      commute_canada_square, is_value_buy, epc, tenure, dom, 
      neg_strategy, alpha_score, appreciation_potential, links, 
      metadata, floor_level, source, source_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    property.id, property.address, property.area, property.image_url, JSON.stringify(property.gallery), property.streetview_url,
    property.list_price, property.realistic_price, property.sqft, property.price_per_sqm,
    property.nearest_tube_distance, property.park_proximity, property.commute_paternoster,
    property.commute_canada_square, property.is_value_buy, property.epc, property.tenure, property.dom,
    property.neg_strategy, property.alpha_score, property.appreciation_potential, JSON.stringify(property.links),
    JSON.stringify(property.metadata), property.floor_level, property.source, property.source_name
  );
  console.log('Inserted Copenhagen Street property into SQLite.');
}

insertCopenhagen().catch(console.error);
