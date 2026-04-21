
const fs = require("fs");
const c = require("crypto");
const Database = require("better-sqlite3");
const db = new Database("data/propSearch.db");
const leads = JSON.parse(fs.readFileSync("data/archive/imports/1776023926053_user_submissions_2026-04-12T19-56-25-466Z.json", "utf8"));
const today = new Date().toISOString().split("T")[0];
const dedup = db.prepare("SELECT id FROM properties WHERE address = ? AND area = ?");
const hist = db.prepare("INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)");
const cols = ["id","address","area","image_url","gallery","streetview_url","floorplan_url","list_price","realistic_price","sqft","price_per_sqm","nearest_tube_distance","park_proximity","commute_paternoster","commute_canada_square","is_value_buy","epc","tenure","service_charge","ground_rent","lease_years_remaining","dom","neg_strategy","alpha_score","appreciation_potential","links","metadata","floor_level","source","source_name","vetted","analyst_notes","price_reduction_amount","price_reduction_percent","days_since_reduction","epc_improvement_potential","est_capex_requirement","waitrose_distance","whole_foods_distance","wellness_hub_distance","ltv_match_score","appr_bear_5yr","appr_base_5yr","appr_bull_5yr","appr_p10","appr_p50","appr_p90","rental_yield_gross","rental_yield_net","bedrooms","bathrooms","archived","archive_reason","market_status","last_checked","pipeline_status","property_rank","council_tax_band"];
const insert = db.prepare("INSERT INTO properties (" + cols.join(",") + ") VALUES (" + cols.map(()=>"?").join(",") + ")");

let imported = 0, skipped = 0;
for (const l of leads) {
  const ex = dedup.get(l.address, l.area);
  if (ex) { console.log("SKIP:" + l.address); skipped++; continue; }
  const id = c.randomUUID();
  const lp = l.list_price || 0;
  const rp = l.realistic_price || lp;
  
  // col  0-3: id, address, area, image_url
  const c00 = id;
  const c01 = l.address;
  const c02 = l.area;
  const c03 = l.image_url ? l.image_url : null;
  
  // col  4-6: gallery, streetview_url, floorplan_url
  const c04 = JSON.stringify(l.gallery || []);
  const c05 = l.streetview_url ? l.streetview_url : null;
  const c06 = l.floorplan_url ? l.floorplan_url : null;
  
  // col  7-11: list_price, realistic_price, sqft, price_per_sqm, nearest_tube
  const c07 = l.list_price ? l.list_price : null;
  const c08 = l.realistic_price ? l.realistic_price : null;
  const c09 = l.sqft ? l.sqft : null;
  const c10 = null;
  const c11 = l.nearest_tube_distance ? l.nearest_tube_distance : null;
  
  // col 12-16: park_prox, commute_pat, commute_canada, is_value_buy, epc
  const c12 = l.park_proximity ? l.park_proximity : null;
  const c13 = l.commute_paternoster ? l.commute_paternoster : null;
  const c14 = l.commute_canada_square ? l.commute_canada_square : null;
  const c15 = (rp < lp ? 1 : 0);
  const c16 = l.epc ? l.epc : null;
  
  // col 17-21: tenure, service_charge, ground_rent, lease_years, dom
  const c17 = l.tenure ? l.tenure : null;
  const c18 = l.service_charge ? l.service_charge : 0;
  const c19 = l.ground_rent ? l.ground_rent : 0;
  const c20 = l.lease_years_remaining ? l.lease_years_remaining : 0;
  const c21 = l.dom ? l.dom : null;
  
  // col 22-26: neg_strategy, alpha_score, appreciation_potential, links, metadata
  const c22 = l.neg_strategy ? l.neg_strategy : null;
  const c23 = null;
  const c24 = null;
  const c25 = JSON.stringify([{url: l.url, source: l.source_name}]);
  const c26 = JSON.stringify({first_seen: today, last_seen: today, discovery_count: 1, is_new: true});
  
  // col 27-31: floor_level, source, source_name, vetted, analyst_notes
  const c27 = l.floor_level ? l.floor_level : null;
  const c28 = l.source || "USER_SUBMISSION";
  const c29 = l.source_name ? l.source_name : null;
  const c30 = 0;
  const c31 = l.analyst_notes ? l.analyst_notes : null;
  
  // col 32-37: price_reduction_*, epc_improvement, est_capex, waitrose, whole_foods, wellness_hub
  const c32 = l.price_reduction_amount ? l.price_reduction_amount : null;
  const c33 = l.price_reduction_percent ? l.price_reduction_percent : null;
  const c34 = l.days_since_reduction ? l.days_since_reduction : null;
  const c35 = null;
  const c36 = null;
  const c37 = null;
  const c38 = null;
  const c39 = null;
  
  // col 40-51: appreciation/rental metrics + bedrooms/bathrooms
  const c40 = null;
  const c41 = null;
  const c42 = null;
  const c43 = null;
  const c44 = null;
  const c45 = null;
  const c46 = null;
  const c47 = null;
  const c48 = null;
  const c49 = l.bedrooms ? l.bedrooms : null;
  const c50 = l.bathrooms ? l.bathrooms : null;
  
  // col 51-57: archived, archive_reason, market_status, last_checked, pipeline_status, property_rank, council_tax_band
  const c51 = 0;
  const c52 = null;
  const c53 = "active";
  const c54 = today;
  const c55 = "discovered";
  const c56 = null;
  const c57 = l.council_tax_band ? l.council_tax_band : null;
  
  const vals = [
    c00,c01,c02,c03,c04,c05,c06,c07,c08,c09,c10,c11,c12,c13,c14,c15,c16,c17,c18,c19,c20,
    c21,c22,c23,c24,c25,c26,c27,c28,c29,c30,c31,c32,c33,c34,c35,c36,c37,c38,c39,c40,
    c41,c42,c43,c44,c45,c46,c47,c48,c49,c50,c51,c52,c53,c54,c55,c56,c57
  ];
  
  if (vals.length !== 58) {
    console.error("BAD:" + l.address + " count=" + vals.length);
    process.exit(1);
  }
  
  insert.run(...vals);
  if (l.list_price) hist.run(id, l.list_price, today);
  const p = l.list_price ? "GBP" + l.list_price : "TBC";
  console.log("OK:" + l.address + " | " + p + " | " + (l.bedrooms || "?") + "bed | " + id.substring(0, 8));
  imported++;
}
console.log("Done:" + imported + " imported, " + skipped + " skipped");
