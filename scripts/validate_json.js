const duckdb = require('duckdb');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.duckdb');
const db = new duckdb.Database(DB_PATH);

db.all('SELECT * FROM properties', (err, rows) => {
  if (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
  console.log('Successfully fetched all rows:', rows.length);
  rows.forEach((r, i) => {
    try {
      if (r.gallery) JSON.parse(r.gallery);
      if (r.links) JSON.parse(r.links);
      if (r.metadata) JSON.parse(r.metadata);
    } catch (e) {
      console.error(`Row ${i} (ID: ${r.id}) has invalid JSON: ${e.message}`);
    }
  });
  console.log('JSON validation complete');
  process.exit(0);
});
