const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

try {
  const row = db.prepare("SELECT data FROM global_context WHERE key = 'macro_trend'").get();
  if (row) {
    const data = JSON.parse(row.data);
    console.log('Macro History Found:', data.mortgage_history.length, 'months');
    data.mortgage_history.forEach(m => {
      console.log(`${m.date}: 90 LTV: ${m.rate_90}%, 60 LTV: ${m.rate_60}%`);
    });
  } else {
    console.log('No macro trend data found in SQLite.');
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
