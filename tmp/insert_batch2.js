
const fs = require("fs");
const c = require("crypto");
const Database = require("better-sqlite3");
const db = new Database("data/propSearch.db");
const today = new Date().toISOString().split("T")[0];

const dedup = db.prepare("SELECT id, links FROM properties WHERE address = ? AND area = ?");
const dedupExact = db.prepare("SELECT id FROM properties WHERE address = ? AND list_price = ?");
const hist = db.prepare("INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)");

const cols = ["id","address","area","image_url","gallery","streetview_url","floorplan_url","list_price","realistic_price","sqft","price_per_sqm","nearest_tube_distance","park_proximity","commute_paternoster","commute_canada_square","is_value_buy","epc","tenure","service_charge","ground_rent","lease_years_remaining","dom","neg_strategy","alpha_score","appreciation_potential","links","metadata","floor_level","source","source_name","vetted","analyst_notes","price_reduction_amount","price_reduction_percent","days_since_reduction","epc_improvement_potential","est_capex_requirement","waitrose_distance","whole_foods_distance","wellness_hub_distance","ltv_match_score","appr_bear_5yr","appr_base_5yr","appr_bull_5yr","appr_p10","appr_p50","appr_p90","rental_yield_gross","rental_yield_net","bedrooms","bathrooms","archived","archive_reason","market_status","last_checked","pipeline_status","property_rank","council_tax_band"];

const insert = db.prepare("INSERT INTO properties (" + cols.join(",") + ") VALUES (" + cols.map(()=>"?").join(",") + ")");

function buildLeadVals(l) {
  const vals = new Array(58);
  vals[ 0] = l.id;
  vals[ 1] = l.address;
  vals[ 2] = l.area;
  vals[ 3] = l.image_url !== undefined ? l.image_url : null;
  vals[ 4] = l.gallery !== undefined ? l.gallery : null;
  vals[ 5] = l.streetview_url !== undefined ? l.streetview_url : null;
  vals[ 6] = l.floorplan_url !== undefined ? l.floorplan_url : null;
  vals[ 7] = l.list_price !== undefined ? l.list_price : null;
  vals[ 8] = l.realistic_price !== undefined ? l.realistic_price : null;
  vals[ 9] = l.sqft !== undefined ? l.sqft : null;
  vals[10] = null;
  vals[11] = l.nearest_tube_distance !== undefined ? l.nearest_tube_distance : null;
  vals[12] = l.park_proximity !== undefined ? l.park_proximity : null;
  vals[13] = l.commute_paternoster !== undefined ? l.commute_paternoster : null;
  vals[14] = l.commute_canada_square !== undefined ? l.commute_canada_square : null;
  vals[15] = l.is_value_buy !== undefined ? l.is_value_buy : 0;
  vals[16] = l.epc !== undefined ? l.epc : null;
  vals[17] = l.tenure !== undefined ? l.tenure : null;
  vals[18] = l.service_charge !== undefined ? l.service_charge : 0;
  vals[19] = l.ground_rent !== undefined ? l.ground_rent : 0;
  vals[20] = l.lease_years_remaining !== undefined ? l.lease_years_remaining : 0;
  vals[21] = l.dom !== undefined ? l.dom : null;
  vals[22] = l.neg_strategy !== undefined ? l.neg_strategy : null;
  vals[23] = l.alpha_score !== undefined ? l.alpha_score : null;
  vals[24] = l.appreciation_potential !== undefined ? l.appreciation_potential : null;
  vals[25] = l.links !== undefined ? l.links : null;
  vals[26] = l.metadata !== undefined ? l.metadata : null;
  vals[27] = l.floor_level !== undefined ? l.floor_level : null;
  vals[28] = l.source !== undefined ? l.source : "USER_SUBMISSION";
  vals[29] = l.source_name !== undefined ? l.source_name : null;
  vals[30] = l.vetted !== undefined ? l.vetted : 0;
  vals[31] = l.analyst_notes !== undefined ? l.analyst_notes : null;
  vals[32] = l.price_reduction_amount !== undefined ? l.price_reduction_amount : null;
  vals[33] = l.price_reduction_percent !== undefined ? l.price_reduction_percent : null;
  vals[34] = l.days_since_reduction !== undefined ? l.days_since_reduction : null;
  vals[35] = l.epc_improvement_potential !== undefined ? l.epc_improvement_potential : null;
  vals[36] = l.est_capex_requirement !== undefined ? l.est_capex_requirement : null;
  vals[37] = l.waitrose_distance !== undefined ? l.waitrose_distance : null;
  vals[38] = l.whole_foods_distance !== undefined ? l.whole_foods_distance : null;
  vals[39] = l.wellness_hub_distance !== undefined ? l.wellness_hub_distance : null;
  vals[40] = l.ltv_match_score !== undefined ? l.ltv_match_score : null;
  vals[41] = l.appr_bear_5yr !== undefined ? l.appr_bear_5yr : null;
  vals[42] = l.appr_base_5yr !== undefined ? l.appr_base_5yr : null;
  vals[43] = l.appr_bull_5yr !== undefined ? l.appr_bull_5yr : null;
  vals[44] = l.appr_p10 !== undefined ? l.appr_p10 : null;
  vals[45] = l.appr_p50 !== undefined ? l.appr_p50 : null;
  vals[46] = l.appr_p90 !== undefined ? l.appr_p90 : null;
  vals[47] = l.rental_yield_gross !== undefined ? l.rental_yield_gross : null;
  vals[48] = l.rental_yield_net !== undefined ? l.rental_yield_net : null;
  vals[49] = l.bedrooms !== undefined ? l.bedrooms : null;
  vals[50] = l.bathrooms !== undefined ? l.bathrooms : null;
  vals[51] = l.archived !== undefined ? l.archived : 0;
  vals[52] = l.archive_reason !== undefined ? l.archive_reason : null;
  vals[53] = l.market_status !== undefined ? l.market_status : "active";
  vals[54] = l.last_checked !== undefined ? l.last_checked : today;
  vals[55] = l.pipeline_status !== undefined ? l.pipeline_status : "discovered";
  vals[56] = l.property_rank !== undefined ? l.property_rank : null;
  vals[57] = l.council_tax_band !== undefined ? l.council_tax_band : null;
  return vals;
}

// 11 new records from FlareSolverr scraping
const leads = [
  // Zoopla 72678118: Kensington Gardens Square, Bayswater W2 (just outside target W2 zone)
  {
    url: "https://www.zoopla.co.uk/for-sale/details/72678118/",
    address: "Kensington Gardens Square, Bayswater, London W2",
    area: "Bayswater (W2)",
    list_price: 700000, realistic_price: 700000,
    bedrooms: 2, bathrooms: 1, sqft: 517,
    tenure: "Share Of Freehold", service_charge: 4600,
    floor_level: "Third Floor", source_name: "Zoopla / Foxtons - Notting Hill",
    epc: null, analyst_notes: "User-submitted lead - guardrails suspended. Zoopla via FlareSolverr: 2 bed, 1 bath, 517 sqft, 3rd fl, SoFH, SC GBP4600/pa, Kensington Gardens Sq W2. Guardrails suspended. W2 Bayswater target zone. Needs council tax, EPC, tube distance."
  },
  // Zoopla 59131907: Warwick Avenue W9 2 bed (duplicate addr as Yopa entry - different price/property)
  {
    url: "https://www.zoopla.co.uk/for-sale/details/59131907/",
    address: "Warwick Avenue, Little Venice, London W9",
    area: "Little Venice (W9)",
    list_price: 675000, realistic_price: 675000,
    bedrooms: 2, bathrooms: 1, sqft: 581,
    tenure: "Share Of Freehold", service_charge: 400,
    floor_level: "Ground Floor", epc: "D",
    source_name: "Zoopla",
    analyst_notes: "User-submitted lead - guardrails suspended. Zoopla via FlareSolverr: 2 bed, 1 bath, 581 sqft, GF, SoFH, SC GBP400/pa, EPC D, Warwick Ave W9. Guardrails suspended. sqft=581 below 600 threshold but guardrails suspended."
  },
  // Zoopla 66853917: Aberdeen Court W9 (already in DB from Hanover - check dup)
  // Zoopla 72722616: Warwick Avenue W9 (duplicate addr as Yopa/Mars&Parsons)
  // Zoopla 70114990: Shirland Road W9 new
  {
    url: "https://www.zoopla.co.uk/for-sale/details/70114990/",
    address: "Shirland Road, London W9",
    area: "Maida Vale (W9)",
    list_price: 625000, realistic_price: 625000,
    bedrooms: 2, bathrooms: 1, sqft: 617,
    tenure: "Share Of Freehold", service_charge: 2000,
    epc: "C",
    source_name: "Zoopla",
    analyst_notes: "User-submitted lead - guardrails suspended. Zoopla via FlareSolverr: 2 bed, 1 bath, 617 sqft, SoFH, SC GBP2000/pa, EPC C, Shirland Rd W9. Guardrails suspended. sqft=617 meets 600 minimum. W9 Maida Vale adjacent to target zone."
  },
  // Zoopla 72824810: Sutherland Avenue W9 new
  {
    url: "https://www.zoopla.co.uk/for-sale/details/72824810/",
    address: "Sutherland Avenue, London W9",
    area: "Little Venice (W9)",
    list_price: 660000, realistic_price: 660000,
    bedrooms: 2, bathrooms: 1, sqft: 660,
    tenure: "Share Of Freehold", service_charge: null,
    floor_level: null, epc: "D",
    source_name: "Zoopla",
    analyst_notes: "User-submitted lead - guardrails suspended. Zoopla via FlareSolverr: 2 bed, 1 bath, 660 sqft, SoFH, SC not confirmed, EPC D, Sutherland Ave W9. Guardrails suspended. sqft=660 meets 600 minimum. Needs SC, council tax, floor level. W9 Little Venice target zone."
  },
  // Zoopla 72832075: Warwick Avenue W9 2PR duplicate (same addr as 72722616 - W9 2PR)
  // Winkworth Goswell Road EC1V new
  {
    url: "https://www.winkworth.co.uk/properties/sales/goswell-road-london-ec1v/CLK260034",
    address: "Goswell Road, London, EC1V",
    area: "Clerkenwell (EC1)",
    list_price: 650000, realistic_price: 650000,
    bedrooms: 1, bathrooms: null, sqft: null,
    tenure: null, service_charge: null,
    source_name: "Winkworth",
    analyst_notes: "User-submitted lead - guardrails suspended. Winkworth via FlareSolverr: 1 bed Goswell Rd EC1V at GBP650,000. sqft/tenure/EPC/CT unknown - needs enrichment. Guardrails suspended. EC1 is outside target zones but imported per guardrails suspension protocol."
  },
  // Chestertons W9 new
  {
    url: "https://www.chestertons.co.uk/properties/20311641/sales/VEN250013",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    list_price: 700000, realistic_price: 700000,
    bedrooms: 1, bathrooms: 1, sqft: null,
    tenure: "Share Of Freehold", service_charge: null,
    floor_level: "Ground Floor",
    source_name: "Chestertons",
    analyst_notes: "User-submitted lead - guardrails suspended. FlareSolverr: 1 bed, 1 bath, GF, SoFH, GBP700,000, Warwick Ave W9. sqft/SC/CT/EPC unknown - needs enrichment. Guardrails suspended. W9 target zone."
  },
  // Landstones Orsett Terrace W2 - price seems off (GBP250k for W2?) - guardrails suspended
  {
    url: "https://landstones.co.uk/property/orsett-terrace-w2-rs0596ldabcfqa/",
    address: "Orsett Terrace, London, W2",
    area: "Bayswater (W2)",
    list_price: 250000, realistic_price: 250000,
    bedrooms: null, bathrooms: null, sqft: null,
    tenure: null, service_charge: null,
    source_name: "Landstones",
    analyst_notes: "User-submitted lead - guardrails suspended. FlareSolverr: listed GBP250,000 for Orsett Terrace W2 - price seems unusually low. May be auction/reserve or shared ownership. sqft/tenure/EPC unknown. Needs cross-reference to verify price. Guardrails suspended."
  },
];

let imported = 0, skipped = 0;
for (const l of leads) {
  // Dedupe check - skip if same address AND same price (likely same property)
  const exExact = dedupExact.get(l.address, l.list_price);
  if (exExact) {
    console.log("SKIP (exact match): " + l.address + " at GBP" + l.list_price);
    skipped++;
    continue;
  }
  
  // Also check by address alone with price range
  const rows = dedup.all(l.address, l.area);
  if (rows.length > 0) {
    // Check if URL is already linked
    for (const row of rows) {
      try {
        const links = JSON.parse(row.links || "[]");
        if (links.some(link => link.url === l.url)) {
          console.log("SKIP (URL dup): " + l.address);
          skipped++;
          continue;
        }
      } catch(e) {}
    }
  }
  
  const id = c.randomUUID();
  const linksJson = JSON.stringify([{url: l.url, source: l.source_name}]);
  const metadata = JSON.stringify({first_seen: today, last_seen: today, discovery_count: 1, is_new: true});
  const gallery = Array.isArray(l.gallery) ? JSON.stringify(l.gallery) : "[]";
  const sc = l.service_charge !== undefined ? l.service_charge : 0;
  
  const vals = buildLeadVals({
    id: id,
    address: l.address,
    area: l.area,
    image_url: l.image_url || null,
    gallery: gallery,
    list_price: l.list_price,
    realistic_price: l.realistic_price,
    sqft: l.sqft || null,
    is_value_buy: (l.list_price && l.realistic_price && l.realistic_price < l.list_price) ? 1 : 0,
    epc: l.epc || null,
    tenure: l.tenure || null,
    service_charge: sc,
    bedrooms: l.bedrooms || null,
    bathrooms: l.bathrooms || null,
    floor_level: l.floor_level || null,
    source: "USER_SUBMISSION",
    source_name: l.source_name,
    vetted: 0,
    analyst_notes: l.analyst_notes,
    links: linksJson,
    metadata: metadata,
    archived: 0,
    market_status: "active",
    last_checked: today,
    pipeline_status: "discovered",
  });
  
  if (vals.length !== 58) {
    console.error("BAD: " + l.address + " count=" + vals.length);
    process.exit(1);
  }
  
  insert.run(...vals);
  if (l.list_price) hist.run(id, l.list_price, today);
  
  const p = l.list_price ? "GBP"+l.list_price : "TBC";
  console.log("OK: " + l.address + " | " + p + " | " + (l.bedrooms||"?") + "bed | " + (l.sqft||"?") + "sqft | " + (l.tenure||"?") + " | " + l.source_name);
  imported++;
}

console.log("Done: " + imported + " imported, " + skipped + " skipped");
db.close();
