#!/usr/bin/env node
/**
 * Scrape leasehold data (service charge, ground rent, lease years)
 * from all 29 property URLs via FlareSolverr.
 */
const http = require('http');

const FSV_BASE = { hostname: 'nas.home', port: 8191 };

const DB_UPDATE = `
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/workspaces/propSearch/data/propsearch.db');

const rows = [];
`;

function flareraw(url, session) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: 90000, session });
    const opts = { hostname: FSV_BASE.hostname, port: FSV_BASE.port, path: '/v1', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch(e) { resolve({ error: 'parse error', raw: d.slice(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function extract(html, sourceType) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  // Service charge
  let sc = null;
  const scMatch = text.match(/(?:annual\s+)?service\s+charge[:\s]*[£]?([\d,]+)|[£]([\d,]+)\s*(?:per\s+month|\/month|pa|per\s+annum)/i);
  if (scMatch) {
    const val = (scMatch[1] || scMatch[2] || '').replace(/,/g, '');
    if (/^\d{3,5}$/.test(val)) {
      // Per annum — if it's a monthly figure like £250 it comes as per month
      sc = parseInt(val);
    }
  }
  
  // Look for explicit service charge pattern
  const scExp = /(?:annual\s+)?service\s+charge[:\s]*[£]?([\d,]+)/i;
  const scMatch2 = text.match(scExp);
  if (scMatch2) {
    const val = scMatch2[1].replace(/,/g,'');
    if (/^\d{3,5}$/.test(val)) sc = parseInt(val);
  }
  
  // Ground rent
  let gr = null;
  const grExp = /(?:annual\s+)?ground\s+rent[:\s]*[£]?([\d,]+)/i;
  const grMatch = text.match(grExp);
  if (grMatch) {
    const val = grMatch[1].replace(/,/g,'');
    if (/^\d{1,5}$/.test(val)) gr = parseInt(val);
  }
  
  // Lease years remaining
  let lease = null;
  const leaseExp = /(?:number\s+of\s+)?years?\s+(?:remaining|left|unexpired)[:\s]*(\d+)|lease[:\s]*(\d+)\s*years?\s*(?:remaining|left|unexpired)/i;
  const leaseMatch = text.match(leaseExp);
  if (leaseMatch) {
    lease = parseInt(leaseMatch[1] || leaseMatch[2]);
  }
  
  // Floor level
  let floor = null;
  if (/lower\s*ground/i.test(text)) floor = 'Lower Ground';
  else if (/ground\s*floor/i.test(text)) floor = 'Ground';
  else if (/first\s*floor/i.test(text)) floor = 'First';
  else if (/second\s*floor/i.test(text)) floor = 'Second';
  else if (/third\s*floor/i.test(text)) floor = 'Third';
  else if (/upper\s*ground/i.test(text)) floor = 'Upper Ground';
  else if (/top\s*floor/i.test(text)) floor = 'Top';
  
  // Also check JSON
  let jsonData = {};
  try {
    const nextMatch = html.match(/__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (nextMatch) jsonData = JSON.parse(nextMatch[1]);
  } catch(e) {}
  
  return { sc, gr, lease, floor, textLength: html.length };
}

async function main() {
  const fs = require('fs');
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('/workspaces/propSearch/data/propsearch.db');
  
  // Get all properties with their links
  const props = await new Promise((res, rej) => {
    db.all("SELECT id, address, links FROM properties WHERE archived=0", [], (e, rows) => e ? rej(e) : res(rows));
  });
  
  const results = [];
  let session = 'lease' + Date.now();
  
  for (const p of props) {
    let links = [];
    try { links = JSON.parse(p.links || '[]'); } catch(e) { links = []; }
    
    const urls = links.filter(l => l && typeof l === 'string');
    if (urls.length === 0) {
      console.log(`${p.id}: no links, skipping`);
      results.push({ id: p.id, status: 'no_links' });
      continue;
    }
    
    // Try each URL
    let best = { sc: null, gr: null, lease: null, floor: null, url: null };
    for (const url of urls) {
      try {
        console.log(`${p.id}: fetching ${url.slice(0,70)}`);
        const r = await flareraw(url, session);
        const html = (r.solution && r.solution.response) ? r.solution.response : (r.response || '');
        if (!html || html.length < 500) {
          console.log(`  empty response`);
          continue;
        }
        const data = extract(html);
        if (data.sc || data.gr || data.lease || data.floor) {
          console.log(`  FOUND: sc=${data.sc} gr=${data.gr} lease=${data.lease} floor=${data.floor}`);
          if (data.sc) best.sc = data.sc;
          if (data.gr) best.gr = data.gr;
          if (data.lease) best.lease = data.lease;
          if (data.floor) best.floor = data.floor;
          best.url = url;
        } else {
          console.log(`  no lease data in ${html.length} chars`);
        }
      } catch(e) {
        console.log(`  error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 2000)); // 2s between requests
    }
    
    // Update DB
    if (best.sc || best.gr || best.lease || best.floor) {
      const sql = `UPDATE properties SET service_charge=?, ground_rent=?, lease_years_remaining=?, floor_level=? WHERE id=?`;
      db.run(sql, [best.sc, best.gr, best.lease, best.floor, p.id], function(e) {
        if (e) console.error(`  DB error: ${e.message}`);
        else console.log(`  DB updated for ${p.id}`);
      });
    }
    
    results.push({ id: p.id, ...best });
  }
  
  db.close();
  
  // Save results
  fs.writeFileSync('/tmp/leasehold_results.json', JSON.stringify(results, null, 2));
  console.log('\nDone. Results saved to /tmp/leasehold_results.json');
}

main().catch(console.error);
