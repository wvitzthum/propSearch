
const fs = require("fs");
const c = require("crypto");
const Database = require("better-sqlite3");
const db = new Database("data/propSearch.db");
const today = new Date().toISOString().split("T")[0];

const dedupExact = db.prepare("SELECT id, links FROM properties WHERE address = ? AND list_price = ?");
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

// 3 remaining leads
const leads = [
  // Zoopla 72722616: Warwick Avenue W9 at GBP650,000 (different price from Chestertons GBP700k)
  {
    url: "https://www.zoopla.co.uk/for-sale/details/72722616/",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    list_price: 650000, realistic_price: 650000,
    bedrooms: 2, bathrooms: 1, sqft: null,
    tenure: "Leasehold", service_charge: 3493,
    floor_level: "Top Floor", epc: "E",
    source_name: "Zoopla",
    analyst_notes: "User-submitted lead - guardrails suspended. Zoopla via FlareSolverr: 2 bed, 1 bath, Top fl, Leasehold, SC GBP3493/pa, EPC E, Warwick Ave W9. Guardrails suspended. sqft unknown - needs floorplan/EPC. Leasehold tenure below SoFH preference but guardrails suspended. W9 target zone."
  },
  // Zoopla 72832075: Warwick Avenue W9 at GBP675,000 (different price from 72722616 GBP650k and Chestertons GBP700k)
  {
    url: "https://www.zoopla.co.uk/for-sale/details/72832075/",
    address: "Warwick Avenue, Little Venice, London W9",
    area: "Little Venice (W9)",
    list_price: 675000, realistic_price: 675000,
    bedrooms: 2, bathrooms: 1, sqft: 726,
    tenure: "Share Of Freehold", service_charge: 3595,
    floor_level: "Third Floor",
    source_name: "Zoopla",
    analyst_notes: "User-submitted lead - guardrails suspended. Zoopla via FlareSolverr: 2 bed, 1 bath, 726 sqft, 3rd fl, SoFH, SC GBP3595/pa, Warwick Ave Little Venice W9. Guardrails suspended. sqft=726 meets 600 minimum. SoFH tenure. W9 target zone. Needs EPC, council tax, tube distance."
  },
  // Mars & Parsons: Warwick Avenue W9 - images confirmed, no price yet
  // Address from FlareSolverr: "Warwick Avenue" / "Little Venice W9"
  {
    url: "https://www.marshandparsons.co.uk/properties-for-sale/london/property/CSG211027/warwick-avenue/",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    list_price: null, realistic_price: null,
    bedrooms: null, bathrooms: null, sqft: null,
    tenure: null, service_charge: null,
    source_name: "Mars & Parsons",
    image_url: "https://dx-mail-items.s3.eu-west-2.amazonaws.com/webimg/mpa/d12dcd1d901fb94899d922514e3b9eb7",
    gallery: JSON.stringify([
      "https://www.marshandparsons.co.uk/wp-content/uploads/2022/02/guzman-barquin-FkKClUPUURU-unsplash@2x.png",
      "https://www.marshandparsons.co.uk/wp-content/uploads/2022/02/david-ramirez-9pyvot7HKjk-unsplash@2x.png",
      "https://www.marshandparsons.co.uk/wp-content/uploads/2022/02/minh-pham-OtXADkUh3-I-unsplash@2x.png",
      "https://www.marshandparsons.co.uk/wp-content/uploads/2022/02/brad-starkey-9pyvot7HKjk-unsplash@2x.png",
      "https://www.marshandparsons.co.uk/wp-content/uploads/2022/02/xl_191182_637317179402670000@2x.png",
    ]),
    analyst_notes: "User-submitted lead - guardrails suspended. FlareSolverr: site partially accessible, images captured, address Warwick Ave W9 confirmed. No price/bedrooms extracted. Needs FlareSolverr retry or Rightmove/Zoopla cross-reference. Guardrails suspended. W9 target zone."
  },
];

let imported = 0, skipped = 0;
for (const l of leads) {
  const ex = dedupExact.get(l.address, l.list_price);
  if (ex) {
    console.log("SKIP (exact match): " + l.address + (l.list_price ? " GBP"+l.list_price : ""));
    skipped++;
    continue;
  }
  
  const id = c.randomUUID();
  const linksJson = JSON.stringify([{url: l.url, source: l.source_name}]);
  const metadata = JSON.stringify({first_seen: today, last_seen: today, discovery_count: 1, is_new: true});
  
  const vals = buildLeadVals({
    id: id,
    address: l.address,
    area: l.area,
    image_url: l.image_url || null,
    gallery: l.gallery || "[]",
    list_price: l.list_price,
    realistic_price: l.realistic_price,
    sqft: l.sqft || null,
    is_value_buy: (l.list_price && l.realistic_price && l.realistic_price < l.list_price) ? 1 : 0,
    epc: l.epc || null,
    tenure: l.tenure || null,
    service_charge: l.service_charge || 0,
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
