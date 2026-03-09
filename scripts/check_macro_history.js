const duckdb = require('duckdb');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.duckdb');
const db = new duckdb.Database(DB_PATH);

db.all("SELECT data FROM global_context WHERE key = 'macro_trend'", (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  
  if (rows.length > 0) {
    const data = JSON.parse(rows[0].data);
    console.log('Mortgage History Entry Count:', data.mortgage_history?.length || 0);
    if (data.mortgage_history && data.mortgage_history.length > 0) {
      console.log('First Entry:', data.mortgage_history[0]);
      console.log('Last Entry:', data.mortgage_history[data.mortgage_history.length - 1]);
    }
  } else {
    console.log('No macro_trend data found');
  }
  process.exit(0);
});
