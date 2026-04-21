
const fs = require("fs");
const c = require("crypto");
const Database = require("better-sqlite3");
const db = new Database("data/propSearch.db");

const leads = [
  {
    url: "https://www.marshandparsons.co.uk/properties-for-sale/london/property/CSG211027/warwick-avenue/",
    source: "USER_SUBMISSION",
    source_name: "Mars & Parsons",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    analyst_notes: "User-submitted lead - guardrails suspended. Site blocked by Cloudflare. Needs enrichment. Warwick Avenue W9 target area."
  },
  {
    url: "https://www.chestertons.co.uk/properties/20311641/sales/VEN250013",
    source: "USER_SUBMISSION",
    source_name: "Chestertons",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    analyst_notes: "User-submitted lead - guardrails suspended. Site blocked by Cloudflare. Needs enrichment. Warwick Avenue W9 target area."
  }
];

const today = new Date().toISOString().split("T")[0];
const dedup = db.prepare("SELECT id, links FROM properties WHERE address = ? AND area = ?");
const hist = db.prepare("INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)");
const cols = ["id","address","area","image_url","gallery","streetview_url","floorplan_url","list_price","realistic_price","sqft","price_per_sqm","nearest_tube_distance","park_proximity","commute_paternoster","commute_canada_square","is_value_buy","epc","tenure","service_charge","ground_rent","lease_years_remaining","dom","neg_strategy","alpha_score","appreciation_potential","links","metadata","floor_level","source","source_name","vetted","analyst_notes","price_reduction_amount","price_reduction_percent","days_since_reduction","epc_improvement_potential","est_capex_requirement","waitrose_distance","whole_foods_distance","wellness_hub_distance","ltv_match_score","appr_bear_5yr","appr_base_5yr","appr_bull_5yr","appr_p10","appr_p50","appr_p90","rental_yield_gross","rental_yield_net","bedrooms","bathrooms","archived","archive_reason","market_status","last_checked","pipeline_status","property_rank","council_tax_band"];
const insert = db.prepare("INSERT INTO properties (" + cols.join(",") + ") VALUES (" + cols.map(()=>"?").join(",") + ")");

function makeVals(l) {
  return [
    l.id, l.address, l.area, l.image_url,
    l.gallery, l.streetview_url, l.floorplan_url,
    l.list_price, l.realistic_price, l.sqft, l.price_per_sqm,
    l.nearest_tube_distance, l.park_proximity, l.commute_paternoster, l.commute_canada_square,
    l.is_value_buy, l.epc, l.tenure, l.service_charge, l.ground_rent, l.lease_years_remaining,
    l.dom, l.neg_strategy, l.alpha_score, l.appreciation_potential, l.links, l.metadata,
    l.floor_level, l.source, l.source_name, l.vetted, l.analyst_notes,
    l.price_reduction_amount, l.price_reduction_percent, l.days_since_reduction,
    l.epc_improvement_potential, l.est_capex_requirement,
    l.waitrose_distance, l.whole_foods_distance, l.wellness_hub_distance,
    l.ltv_match_score, l.appr_bear_5yr, l.appr_base_5yr, l.appr_bull_5yr,
    l.appr_p10, l.appr_p50, l.appr_p90, l.rental_yield_gross, l.rental_yield_net,
    l.bedrooms, l.bathrooms,
    l.archived, l.archive_reason, l.market_status, l.last_checked, l.pipeline_status,
    l.property_rank, l.council_tax_band
  ];
}

function buildLeadVals(l) {
  const vals = new Array(58);
  vals[0] = l.id;
  vals[1] = l.address;
  vals[2] = l.area;
  vals[3] = l.image_url !== undefined ? l.image_url : null;
  vals[4] = l.gallery !== undefined ? l.gallery : null;
  vals[5] = l.streetview_url !== undefined ? l.streetview_url : null;
  vals[6] = l.floorplan_url !== undefined ? l.floorplan_url : null;
  vals[7] = l.list_price !== undefined ? l.list_price : null;
  vals[8] = l.realistic_price !== undefined ? l.realistic_price : null;
  vals[9] = l.sqft !== undefined ? l.sqft : null;
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

let imported = 0, skipped = 0;
for (const l of leads) {
  const rows = dedup.all(l.address, l.area);
  let dupFound = false;
  for (const row of rows) {
    try {
      const links = JSON.parse(row.links || "[]");
      if (links.some(link => link.url === l.url)) {
        console.log("SKIP (URL dup):" + l.url);
        dupFound = true;
        break;
      }
    } catch(e) {}
  }
  if (dupFound) { skipped++; continue; }

  const id = c.randomUUID();
  const leadVals = buildLeadVals({
    id: id,
    address: l.address,
    area: l.area,
    image_url: null,
    gallery: "[]",
    streetview_url: null,
    floorplan_url: null,
    list_price: null,
    realistic_price: null,
    sqft: null,
    nearest_tube_distance: null,
    park_proximity: null,
    commute_paternoster: null,
    commute_canada_square: null,
    is_value_buy: 0,
    epc: null,
    tenure: null,
    service_charge: 0,
    ground_rent: 0,
    lease_years_remaining: 0,
    dom: null,
    neg_strategy: null,
    alpha_score: null,
    appreciation_potential: null,
    links: JSON.stringify([{url: l.url, source: l.source_name}]),
    metadata: JSON.stringify({first_seen: today, last_seen: today, discovery_count: 1, is_new: true}),
    floor_level: null,
    source: l.source,
    source_name: l.source_name,
    vetted: 0,
    analyst_notes: l.analyst_notes,
    price_reduction_amount: null,
    price_reduction_percent: null,
    days_since_reduction: null,
    epc_improvement_potential: null,
    est_capex_requirement: null,
    waitrose_distance: null,
    whole_foods_distance: null,
    wellness_hub_distance: null,
    ltv_match_score: null,
    appr_bear_5yr: null,
    appr_base_5yr: null,
    appr_bull_5yr: null,
    appr_p10: null,
    appr_p50: null,
    appr_p90: null,
    rental_yield_gross: null,
    rental_yield_net: null,
    bedrooms: null,
    bathrooms: null,
    archived: 0,
    archive_reason: null,
    market_status: "active",
    last_checked: today,
    pipeline_status: "discovered",
    property_rank: null,
    council_tax_band: null
  });

  if (leadVals.length !== 58) {
    console.error("BAD count=" + leadVals.length + " for " + l.url);
    process.exit(1);
  }

  insert.run(...leadVals);
  console.log("OK:" + l.address + " | TBC | ?bed | " + l.source_name + " | " + id.substring(0, 8));
  imported++;
}
console.log("Done:" + imported + " imported, " + skipped + " skipped");
