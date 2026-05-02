const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/propSearch.db');
const db = new Database(DB_PATH);

try {
  const columns = db.prepare("PRAGMA table_info(properties)").all();
  console.log('--- Properties Table Schema ---');
  columns.forEach(c => {
    console.log(`${c.name}: ${c.type} ${c.pk ? '(PK)' : ''}`);
  });
} catch (err) {
  console.error(err);
}
