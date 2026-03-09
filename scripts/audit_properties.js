const duckdb = require('duckdb');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/propSearch.duckdb');
const db = new duckdb.Database(DB_PATH);

db.all('SELECT * FROM properties', (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  
  console.log(`Total Properties: ${rows.length}`);
  
  rows.forEach(p => {
    const issues = [];
    if (!p.image_url && (!p.gallery || p.gallery === '[]')) issues.push('Missing Image/Gallery');
    if (p.list_price <= 0) issues.push('Invalid List Price');
    if (!p.address) issues.push('Missing Address');
    if (!p.area) issues.push('Missing Area');
    if (!p.sqft) issues.push('Missing SQFT');
    if (!p.epc) issues.push('Missing EPC');
    
    if (issues.length > 0) {
      console.log(`Property ID ${p.id} (${p.address || 'Unknown'}): ${issues.join(', ')}`);
    }
  });
  
  process.exit(0);
});
