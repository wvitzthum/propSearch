const duckdb = require('duckdb');
const db = new duckdb.Database('data/propSearch.duckdb');

db.all("SELECT table_name FROM information_schema.tables", (err, res) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Tables:", res);
  
  res.forEach(table => {
    db.all(`PRAGMA table_info(${table.table_name})`, (err, columns) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`Schema for ${table.table_name}:`, columns);
    });
  });
});
