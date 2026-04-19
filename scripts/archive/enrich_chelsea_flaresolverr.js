const http = require('http');
const fs = require('fs');

const FLARESOLVR_URL = 'http://nas.home:8191';
const SESSION = 'propSearch';
const TIMEOUT = 120; // seconds

const leads = JSON.parse(fs.readFileSync('/tmp/chelsea_rightmove_leads.json', 'utf8'));

// Deduplicate against DB
const sqlite3 = require('better-sqlite3');
const db = sqlite3('/workspaces/propSearch/data/propSearch.db');
const existing = db.prepare('SELECT id, address, links FROM properties WHERE archived=0').all();
const existingLinks = new Set();
const existingAddresses = new Set();
existing.forEach(r => {
  existingLinks.add(r.id);
  if (r.links) { try { JSON.parse(r.links).forEach(u => existingLinks.add(u)); } catch(e) {} }
  if (r.address) existingAddresses.add(r.address.toLowerCase().trim());
});
const filtered = leads.filter(s => {
  const addr = (s.address || '').toLowerCase().trim();
  const linkId = s.source_id.replace('rm-chelsea-', '');
  if (existingLinks.has(linkId)) return false;
  const addrWords = addr.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const threshold = addrWords.length >= 3 ? 3 : 2;
  let matched = false;
  existingAddresses.forEach(existing => {
    const exWords = existing.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const common = addrWords.filter(w => exWords.includes(w) && w.length > 3);
    if (common.length >= threshold) matched = true;
  });
  return !matched;
});
db.close();

async function scrapeFlare(url) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ cmd: 'request.get', url, maxTimeout: TIMEOUT * 1000, session: SESSION });
    const u = new URL(FLARESOLVR_URL);
    const opts = { hostname: u.hostname, port: u.port || 8191, path: '/v1', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
    const req = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { const j = JSON.parse(d); resolve(j.status === 'ok' ? j.solution.response : reject(new Error(j.message || j.status))); } catch(e) { reject(e); } }); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function extractFields(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  // Sqft — multiple patterns
  let sqft = null;
  const sqftPatterns = [
    /(?:approximately|approx\.?|about|size|floor\s*area|spanning)\s*:?\s*(\d{3,4})\s*(?:sq\.?\s*ft|sqft|sq\s*ft|square\s*feet)/i,
    /(\d{3,4})\s*(?:sq\.?\s*ft|sqft|sq\s*ft|square\s*feet)/i,
    /(?:sq\.?\s*ft|sqft)\s*:?\s*(\d{3,4})/i,
  ];
  for (const p of sqftPatterns) {
    const m = text.match(p);
    if (m) { sqft = parseInt(m[1].replace(/,/g,'')); break; }
  }
  
  // Tenure
  const tenureM = text.match(/\b(share\s+of\s+freehold|share\s+freehold|freehold|leasehold)\b/i);
  const tenure = tenureM ? tenureM[0].toLowerCase() : null;
  
  // EPC
  const epcM = text.match(/EPC\s*Rating[:\s]*([A-G])\b/i) || text.match(/\bEPC\s+Rating\s+([A-G])\b/i);
  const epc = epcM ? epcM[1].toUpperCase() : null;
  
  // Floor level
  const floorM = text.match(/\b(ground|first|second|third|fourth|fifth|sixth|seventh|top|penthouse|lower\s+ground|gallery)\s+(?:floor|level)\b/i) ||
                text.match(/\b(1st|2nd|3rd|4th|5th|6th|7th)\s+floor\b/i);
  const floor_level = floorM ? floorM[0].toLowerCase() : null;
  
  // Postcode
  const pcM = text.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
  const postcode = pcM ? pcM[0].toUpperCase() : null;
  
  // Property type
  const typeM = text.match(/\b(flat|apartment|maisonette|house|terrace|townhouse|studio|penthouse|duplex)\b/i);
  const property_type = typeM ? typeM[0] : null;
  
  return { sqft, tenure, epc, floor_level, postcode, property_type };
}

async function enrichLead(lead) {
  const id = lead.source_id.replace('rm-chelsea-', '');
  const detailUrl = `https://www.rightmove.co.uk/properties/${id}.html`;
  
  console.log(`[FlareSolverr] ${lead.address}...`);
  let html;
  try {
    html = await scrapeFlare(detailUrl);
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
    return { ...lead, enrichment_error: e.message };
  }
  
  const extracted = extractFields(html);
  return { ...lead, ...extracted, detail_url: detailUrl };
}

(async () => {
  console.log(`Enriching ${filtered.length} leads via FlareSolverr...\n`);
  const results = [];
  
  for (let i = 0; i < filtered.length; i++) {
    const result = await enrichLead(filtered[i]);
    results.push(result);
    console.log(`  sqft=${result.sqft||'?'} tenure=${result.tenure||'?'} epc=${result.epc||'?'} floor=${result.floor_level||'?'} postcode=${result.postcode||'?'} type=${result.property_type||'?'}`);
    await new Promise(r => setTimeout(r, 1000)); // 1s pause between requests
  }
  
  fs.writeFileSync('/tmp/chelsea_enriched_flare.json', JSON.stringify(results, null, 2));
  console.log('\nDone! Saved to /tmp/chelsea_enriched_flare.json');
})().catch(console.error);
