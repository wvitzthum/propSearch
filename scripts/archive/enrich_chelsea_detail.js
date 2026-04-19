const { chromium } = require('playwright');
const fs = require('fs');

// Deduplication logic
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

// Load all scraped
const allScraped = JSON.parse(fs.readFileSync('/tmp/chelsea_rightmove_leads.json', 'utf8'));

const filtered = allScraped.filter(s => {
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
  const id = lead.source_id.replace('rm-chelsea-', '');
  // CORRECT URL FORMAT: no .html suffix
  const detailUrl = `https://www.rightmove.co.uk/properties/${id}`;
  
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();
  
  let result = { ...lead, enrichment_source: 'rightmove_detail' };
  
  try {
    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(10000); // Long wait for React to fully hydrate
    
    const propertyData = await page.evaluate(() => {
      const pm = window.PAGE_MODEL;
      if (!pm?.propertyData) return null;
      const pd = pm.propertyData;
      return {
        bedrooms: pd.bedrooms,
        bathrooms: pd.bathrooms,
        price: pd.prices?.primaryPrice || pd.prices?.price?.amount,
        pricePerSqFt: pd.prices?.pricePerSqFt,
        sqft: pd.sizings?.find(s => s.unit === 'sqft')?.minimumSize || null,
        sqm: pd.sizings?.find(s => s.unit === 'sqm')?.minimumSize || null,
        postcode: pd.address?.outcode + ' ' + pd.address?.incode || null,
        outcode: pd.address?.outcode || null,
        tenureType: pd.tenure?.tenureType || null,
        yearsRemaining: pd.tenure?.yearsRemainingOnLease || null,
        floorLevel: pd.entranceFloor || null,
        propertyType: pd.propertySubType || null,
        description: pd.text?.description || null,
        keyFeatures: pd.keyFeatures || [],
        councilTaxBand: pd.livingCosts?.councilTaxBand || null,
        annualServiceCharge: pd.livingCosts?.annualServiceCharge || null,
        annualGroundRent: pd.livingCosts?.annualGroundRent || null,
        floorplanUrl: pd.floorplans?.[0]?.url || null,
        epcGraphUrl: pd.epcGraphs?.[0]?.url || null,
        images: pd.images?.slice(0,5).map(img => img.url) || [],
        lat: pd.location?.latitude || null,
        lon: pd.location?.longitude || null,
        nearestTube: pd.nearestStations?.[0]?.name || null,
        nearestTubeDistance: pd.nearestStations?.[0]?.distance ? Math.round(pd.nearestStations[0].distance * 1609.34) : null, // miles to metres
        listingUpdateReason: pd.listingHistory?.listingUpdateReason || null,
        agent: pd.customer?.branchDisplayName || null,
        agentPhone: pd.customer?.contactInfo?.telephoneNumbers?.localNumber || null,
        // DAT-204: Price history, listing ID, and confirmed list price
        listingId: pd.listingId || null,
        listPrice: (() => {
          const raw = pd.prices?.primaryPrice || '';
          const parsed = parseInt(raw.replace(/[£,\s]/g, ''));
          return isNaN(parsed) ? null : parsed;
        })(),
        pricePerSqFtPortal: pd.prices?.pricePerSqFt || null,
        listingHistory: (Array.isArray(pd.listingHistory) ? pd.listingHistory : []).map(entry => ({
          listingUpdateReason: entry.listingUpdateReason || null,
          listingDate: entry.listingDate || null,
          priceChangeData: entry.priceChangeData ? {
            previousPrice: entry.priceChangeData.previousPrice || null,
            newPrice: entry.priceChangeData.newPrice || null,
            date: entry.priceChangeData.date || null
          } : null
        })),
      };
    });
    
    if (propertyData) {
      // Extract floor level from keyFeatures if not in entranceFloor
      let floorLevel = propertyData.floorLevel;
      if (!floorLevel && propertyData.keyFeatures) {
        const floorMatch = propertyData.keyFeatures.join(' ').match(/\b(ground|first|second|third|fourth|fifth|sixth|seventh|top|penthouse|lower\s+ground|gallery|mezzanine)\s+floor\b/i) ||
                          propertyData.keyFeatures.join(' ').match(/\b(1st|2nd|3rd|4th|5th|6th|7th)\s+floor\b/i);
        if (floorMatch) floorLevel = floorMatch[0].toLowerCase();
      }
      
      // Extract EPC rating from description or key features
      const text = propertyData.description || propertyData.keyFeatures?.join(' ') || '';
      const epcMatch = text.match(/\bEPC\s+Rating[:\s]*([A-G])\b/i) || text.match(/\bEPC\s+([A-G])\b/i);
      const epc = epcMatch ? epcMatch[1].toUpperCase() : null;
      
      result = {
        ...result,
        sqft: propertyData.sqft,
        sqm: propertyData.sqm,
        tenure: propertyData.tenureType ? propertyData.tenureType.toLowerCase() : null,
        lease_years_remaining: propertyData.yearsRemaining,
        floor_level: floorLevel,
        property_type: propertyData.propertyType,
        postcode: propertyData.postcode,
        epc: epc,
        epc_graph_url: propertyData.epcGraphUrl,
        council_tax: propertyData.councilTaxBand,
        service_charge: propertyData.annualServiceCharge,
        ground_rent: propertyData.annualGroundRent,
        floorplan_url: propertyData.floorplanUrl,
        gallery: propertyData.images,
        image_url: propertyData.images?.[0] || result.image_url,
        lat: propertyData.lat,
        lon: propertyData.lon,
        nearest_tube: propertyData.nearestTube,
        nearest_tube_distance: propertyData.nearestTubeDistance,
        price_per_sqft_rm: propertyData.pricePerSqFt,
        agent: propertyData.agent,
        agent_phone: propertyData.agentPhone,
        key_features: propertyData.keyFeatures,
        description: propertyData.description,
        listing_update: propertyData.listingUpdateReason,
        detail_url: detailUrl,
        // DAT-204: Price history + listing ID
        listing_id: propertyData.listingId,
        list_price: propertyData.listPrice || result.list_price,
        price_per_sqft_portal: propertyData.pricePerSqFtPortal,
        listing_history: propertyData.listingHistory || []
      };
    }
  } catch(e) {
    result.enrichment_error = e.message;
  }
  
  await browser.close();
  return result;
}

(async () => {
  console.log(`Enriching ${filtered.length} Chelsea leads via PAGE_MODEL...\n`);
  const results = [];
  
  for (let i = 0; i < filtered.length; i++) {
    const lead = filtered[i];
    process.stdout.write(`[${i+1}/${filtered.length}] ${lead.address?.substring(0,40)}... `);
    const result = await enrichLead(lead);
    results.push(result);
    
    const sqft = result.sqft ?? '?';
    const tenure = result.tenure ?? '?';
    const years = result.lease_years_remaining ?? '?';
    const floor = result.floor_level ?? '?';
    const postcode = result.postcode ?? '?';
    const tubes = result.nearest_tube ?? '?';
    console.log(`sqft=${sqft} tenure=${tenure}(${years}yr) floor=${floor} pc=${postcode} tube=${tubes}`);
    
    // Respectful pause
    await new Promise(r => setTimeout(r, 1500));
  }
  
  fs.writeFileSync('/tmp/chelsea_enriched_detail.json', JSON.stringify(results, null, 2));
  console.log(`\nDone! Saved to /tmp/chelsea_enriched_detail.json`);
})().catch(console.error);
