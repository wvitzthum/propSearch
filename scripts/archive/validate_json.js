const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

try {
  const rows = db.prepare('SELECT * FROM properties').all();
  console.log('Successfully fetched all rows:', rows.length);
  rows.forEach((r, i) => {
    try {
      if (r.gallery && typeof r.gallery === 'string') JSON.parse(r.gallery);
      if (r.links && typeof r.links === 'string') JSON.parse(r.links);
      if (r.metadata && typeof r.metadata === 'string') JSON.parse(r.metadata);
    } catch (e) {
      console.error(`Row ${i} (ID: ${r.id}) has invalid JSON: ${e.message}`);
    }
  });
  console.log('JSON validation complete');
} catch (err) {
  console.error('ERROR:', err);
  process.exit(1);
}
