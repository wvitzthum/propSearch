const { chromium } = require('playwright');
const fs = require('fs');

const newLeads = JSON.parse(fs.readFileSync('/tmp/chelsea_rightmove_leads.json', 'utf8'));

// Deduplicate against DB addresses
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

const filtered = newLeads.filter(s => {
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

async function enrichLead(lead) {
  const detailUrl = `https://www.rightmove.co.uk/properties/${lead.source_id.replace('rm-chelsea-', '')}.html`;
  
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();
  
  let sqft = null, tenure = null, floorLevel = null, epc = null, propType = null, postcode = null;
  let images = [], floorplanUrl = null;
  
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000); // Wait for React hydration
    
    // Try __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      const s = document.getElementById('__NEXT_DATA__');
      if (s) return JSON.parse(s.textContent);
      return null;
    });
    
    if (nextData) {
      const pd = nextData?.props?.pageProps?.propertyData || nextData?.props?.pageProps?.listingDetails || {};
      
      // Sqft from floorplan/rooms
      const rooms = pd?.rooms || [];
      const floorArea = rooms.find(r => r.type === 'FLOORPLAN') || rooms.find(r => r.type === 'GROUND_FLOOR_PLAN');
      if (floorArea?.dimension?.floorArea?.sqft) sqft = parseInt(floorArea.dimension.floorArea.sqft);
      
      // Also try to extract from description or features
      const text = await page.evaluate(() => document.body.innerText);
      
      // Sqft from text
      const sqftMatch = text.match(/(\d[\d,]+)\s*(?:sq\.?\s*ft|sqft|sq\s*ft|square\s*feet)/i);
      if (sqftMatch) sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
      
      // Floor level from text
      const floorMatch = text.match(/\b(ground|first|second|third|fourth|fifth|sixth|top|penthouse|lower\s+ground|gallery)\s+floor\b/i) ||
                        text.match(/\b(1st|2nd|3rd|4th|5th|6th)\s+floor\b/i);
      if (floorMatch) floorLevel = floorMatch[0].toLowerCase();
      
      // EPC from text
      const epcMatch = text.match(/EPC\s*Rating[:\s]*([A-G])\b/i) || text.match(/\bEPC\s+([A-G])\b/i);
      if (epcMatch) epc = epcMatch[1].toUpperCase();
      
      // Tenure from text
      const tenureMatch = text.match(/\b(share\s+of\s+freehold|share\s+freehold|freehold|leasehold)\b/i);
      if (tenureMatch) tenure = tenureMatch[0].toLowerCase();
      
      // Postcode
      const pcMatch = text.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
      if (pcMatch) postcode = pcMatch[0].toUpperCase();
      
      // Property type
      if (pd?.propertyType) propType = pd.propertyType;
      const typeMatch = text.match(/\b(flat|apartment|maisonette|house|terrace|studio|penthouse)\b/i);
      if (typeMatch && !propType) propType = typeMatch[0];
      
      // Images
      const imgData = nextData?.props?.pageProps?.propertyData?.images || [];
      images = imgData.slice(0,5).map(img => img.url || img.src);
      const fpData = nextData?.props?.pageProps?.propertyData?.floorplans || [];
      if (fpData.length > 0) floorplanUrl = fpData[0].url || fpData[0].src;
    }
    
    // Heuristic fallback: look in page text for sqft
    if (!sqft) {
      const text = await page.evaluate(() => document.body.innerText);
      // Try multiple patterns
      const patterns = [
        /(\d{3,4})\s*(?:sq\.?\s*ft|sqft|sq\s*ft|square\s*feet)/i,
        /(?:size|floor\s*area|approx|impressive)\s*:?\s*(\d[\d,]+)\s*(?:sq\.?\s*ft|sqft)/i,
      ];
      for (const p of patterns) {
        const m = text.match(p);
        if (m) { sqft = parseInt(m[1].replace(/,/g,'')); break; }
      }
    }
    
    // Heuristic tenure from text
    if (!tenure) {
      const text = await page.evaluate(() => document.body.innerText);
      const m = text.match(/\b(share\s+of\s+freehold|share\s+freehold|freehold|leasehold)\b/i);
      if (m) tenure = m[0].toLowerCase();
    }
    
  } catch(e) {
    console.log(`  Error enriching ${lead.address}: ${e.message}`);
  }
  
  await browser.close();
  
  return {
    ...lead,
    sqft,
    tenure,
    floor_level: floorLevel,
    epc,
    property_type: propType,
    postcode,
    image_url: images[0] || lead.image_url,
    gallery: images,
    floorplan_url: floorplanUrl,
    detail_url: detailUrl
  };
}

(async () => {
  console.log(`Enriching ${filtered.length} new Chelsea leads...\n`);
  const enriched = [];
  
  for (let i = 0; i < filtered.length; i++) {
    const lead = filtered[i];
    process.stdout.write(`[${i+1}/${filtered.length}] ${lead.address}... `);
    const result = await enrichLead(lead);
    enriched.push(result);
    process.stdout.write(`sqft=${result.sqft||'?'} tenure=${result.tenure||'?'} epc=${result.epc||'?'}\n`);
  }
  
  fs.writeFileSync('/tmp/chelsea_enriched_leads.json', JSON.stringify(enriched, null, 2));
  console.log('\nDone! Saved to /tmp/chelsea_enriched_leads.json');
})().catch(console.error);
