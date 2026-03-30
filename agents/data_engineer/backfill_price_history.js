const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/propSearch.db');
const db = new Database(DB_PATH);

console.log('--- Backfilling Price History (DE-140) ---');

try {
  // Ensure table exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT,
      price REAL,
      date TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    )
  `).run();

  // Get all properties that don't have any price history yet
  const properties = db.prepare(`
    SELECT p.id, p.list_price, p.metadata 
    FROM properties p
    LEFT JOIN price_history ph ON p.id = ph.property_id
    WHERE ph.id IS NULL AND p.list_price IS NOT NULL
  `).all();

  console.log(`Found ${properties.length} properties to backfill.`);

  const insertStmt = db.prepare(`
    INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)
  `);

  for (const prop of properties) {
    const metadata = JSON.parse(prop.metadata || '{}');
    const firstSeen = metadata.first_seen || new Date().toISOString().split('T')[0];
    
    console.log(`Backfilling ${prop.id} with price £${prop.list_price} (Date: ${firstSeen})`);
    insertStmt.run(prop.id, prop.list_price, firstSeen);
  }

  console.log('--- Backfill Complete ---');
} catch (e) {
  console.error(`Backfill failed: ${e.message}`);
}
