
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

// Count the expected nulls for the extra 11 columns (38-48)
// [epc_improvement_potential, est_capex_requirement, waitrose, whole_foods, wellness_hub,
//  ltv_match_score, appr_bear, appr_base, appr_bull, appr_p10, appr_p50, appr_p90, rental_yield_gross, rental_yield_net] = 14 nulls
// [bedrooms, bathrooms] = 2 from above
// [archived, archive_reason, market_status, last_checked, pipeline_status, property_rank, council_tax_band] = 7 from above
// Total extra nulls = 14+2+7 = 23 nulls
// Wait - let me count again:
// Col 38 epc_improvement_potential = null
// Col 39 est_capex_requirement = null
// Col 40 waitrose_distance = null
// Col 41 whole_foods_distance = null
// Col 42 wellness_hub_distance = null
// Col 43 ltv_match_score = null
// Col 44 appr_bear_5yr = null
// Col 45 appr_base_5yr = null
// Col 46 appr_bull_5yr = null
// Col 47 appr_p10 = null
// Col 48 appr_p50 = null
// Col 49 appr_p90 = null
// Col 50 rental_yield_gross = null
// Col 51 rental_yield_net = null
// Col 52 bedrooms = null (placeholder - will be l.bedrooms)
// Col 53 bathrooms = null (placeholder - will be l.bathrooms)
// Col 54 archived = 0
// Col 55 archive_reason = null
// Col 56 market_status = 'active'
// Col 57 last_checked = today
// Col 58 pipeline_status = 'discovered'
// Col 59 property_rank = null
// Col 60 council_tax_band = null

console.log("col count:", cols.length);
let imported = 0, skipped = 0;
for (const l of leads) {
  const ex = dedup.get(l.address, l.area);
  if (ex) { console.log("SKIP:" + l.address); skipped++; continue; }
  const id = c.randomUUID();
  const lp = l.list_price || 0;
  const rp = l.realistic_price || lp;
  
  // Build value arrays for each section, print counts
  const sec1 = [id, l.address, l.area, l.image_url ? l.image_url : null];
  const sec2 = [JSON.stringify(l.gallery || []), l.streetview_url ? l.streetview_url : null, l.floorplan_url ? l.floorplan_url : null];
  const sec3 = [l.list_price ? l.list_price : null, l.realistic_price ? l.realistic_price : null, l.sqft ? l.sqft : null, null];
  const sec4 = [l.nearest_tube_distance ? l.nearest_tube_distance : null, l.park_proximity ? l.park_proximity : null, l.commute_paternoster ? l.commute_paternoster : null, l.commute_canada_square ? l.commute_canada_square : null, (rp < lp ? 1 : 0)];
  const sec5 = [l.epc ? l.epc : null, l.tenure ? l.tenure : null];
  const sec6 = [l.service_charge ? l.service_charge : 0, l.ground_rent ? l.ground_rent : 0, l.lease_years_remaining ? l.lease_years_remaining : 0];
  const sec7 = [l.dom ? l.dom : null, l.neg_strategy ? l.neg_strategy : null, null, null];
  const sec8 = [JSON.stringify([{url: l.url, source: l.source_name}]), JSON.stringify({first_seen: today, last_seen: today, discovery_count: 1, is_new: true})];
  const sec9 = [l.floor_level ? l.floor_level : null, l.source || "USER_SUBMISSION", l.source_name ? l.source_name : null, 0, l.analyst_notes ? l.analyst_notes : null];
  const sec10 = [l.price_reduction_amount ? l.price_reduction_amount : null, l.price_reduction_percent ? l.price_reduction_percent : null, l.days_since_reduction ? l.days_since_reduction : null];
  const sec11 = [null, null, null, null, null, null, null, null, null]; // cols 38-46 (9 nulls)
  const sec12 = [null, null, null, null, null, null, null, null, null]; // cols 47-55 (9 nulls)
  const sec13 = [l.bedrooms ? l.bedrooms : null, l.bathrooms ? l.bathrooms : null];
  const sec14 = [0, null, "active", today, "discovered", null, l.council_tax_band ? l.council_tax_band : null];
  
  const total = sec1.length+sec2.length+sec3.length+sec4.length+sec5.length+sec6.length+sec7.length+sec8.length+sec9.length+sec10.length+sec11.length+sec12.length+sec13.length+sec14.length;
  if (imported === 0) {
    console.log("sec counts:", sec1.length, sec2.length, sec3.length, sec4.length, sec5.length, sec6.length, sec7.length, sec8.length, sec9.length, sec10.length, sec11.length, sec12.length, sec13.length, sec14.length, "| total=", total);
  }
  
  const vals = [
    ...sec1, ...sec2, ...sec3, ...sec4, ...sec5, ...sec6, ...sec7, ...sec8, ...sec9, ...sec10, ...sec11, ...sec12, ...sec13, ...sec14
  ];
  
  if (vals.length !== 58) { console.error("BAD:"+l.address+" count="+vals.length); process.exit(1); }
  insert.run(...vals);
  if (l.list_price) hist.run(id, l.list_price, today);
  const p = l.list_price ? "GBP"+l.list_price : "TBC";
  console.log("OK:" + l.address + "|" + p + "|"+(l.bedrooms||"?")+"bed|"+id.substring(0,8));
  imported++;
}
console.log("Done:" + imported + " imported," + skipped + " skipped");
