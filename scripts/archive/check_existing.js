const db = require('better-sqlite3')('data/propSearch.db');
var rows = db.prepare("SELECT id, address, list_price, sqft, bedrooms, tenure, source, links FROM properties WHERE archived = 0 AND (area LIKE '%Belsize%' OR area LIKE '%NW3%' OR area LIKE '%Angel%' OR area LIKE '%Islington%' OR area LIKE '%N1%' OR area LIKE '%N7%') ORDER BY area").all();
console.log('Already tracked (' + rows.length + '):');
rows.forEach(function(r) {
  var links = [];
  try { links = JSON.parse(r.links || '[]'); } catch(e) {}
  console.log(' ' + r.id + ' | ' + r.address.substring(0,60) + ' | £' + r.list_price.toLocaleString() + ' | ' + r.sqft + 'sqft | ' + (r.bedrooms||'?') + 'bd | ' + (r.tenure||'?').substring(0,15) + ' | src=' + r.source);
  if (links.length) console.log('   Links: ' + links.slice(0,3).join(', '));
});
db.close();
