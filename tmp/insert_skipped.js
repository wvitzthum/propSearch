
const fs = require("fs");
const c = require("crypto");
const Database = require("better-sqlite3");
const db = new Database("data/propSearch.db");
const today = new Date().toISOString().split("T")[0];
// Check links JSON for URL match
const dedup = db.prepare("SELECT id, links FROM properties WHERE address = ? AND area = ?");
const hist = db.prepare("INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)");
const cols = ["id","address","area","image_url","gallery","streetview_url","floorplan_url","list_price","realistic_price","sqft","price_per_sqm","nearest_tube_distance","park_proximity","commute_paternoster","commute_canada_square","is_value_buy","epc","tenure","service_charge","ground_rent","lease_years_remaining","dom","neg_strategy","alpha_score","appreciation_potential","links","metadata","floor_level","source","source_name","vetted","analyst_notes","price_reduction_amount","price_reduction_percent","days_since_reduction","epc_improvement_potential","est_capex_requirement","waitrose_distance","whole_foods_distance","wellness_hub_distance","ltv_match_score","appr_bear_5yr","appr_base_5yr","appr_bull_5yr","appr_p10","appr_p50","appr_p90","rental_yield_gross","rental_yield_net","bedrooms","bathrooms","archived","archive_reason","market_status","last_checked","pipeline_status","property_rank","council_tax_band"];
const insert = db.prepare("INSERT INTO properties (" + cols.join(",") + ") VALUES (" + cols.map(()=>"?").join(",") + ")");

const leads = [
  {
    url: "https://www.marshandparsons.co.uk/properties-for-sale/london/property/CSG211027/warwick-avenue/",
    source: "USER_SUBMISSION",
    source_name: "Mars & Parsons",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    analyst_notes: "User-submitted lead - guardrails suspended. Site blocked by Cloudflare - no data extracted. Needs enrichment via FlareSolverr or Rightmove/Zoopla cross-reference. Warwick Avenue W9 is target area."
  },
  {
    url: "https://www.chestertons.co.uk/properties/20311641/sales/VEN250013",
    source: "USER_SUBMISSION",
    source_name: "Chestertons",
    address: "Warwick Avenue, London, W9",
    area: "Little Venice (W9)",
    analyst_notes: "User-submitted lead - guardrails suspended. Site blocked by Cloudflare - no data extracted. Needs enrichment via FlareSolverr or Rightmove/Zoopla cross-reference. Warwick Avenue W9 is target area."
  }
];

let imported = 0, skipped = 0;
for (const l of leads) {
  // Check for existing by address+area, then verify URL
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
  const vals = [
    id, l.address, l.area, null,
    "[]", null, null, null, null, null, null, null, null, null, null, 0, null, null,
    0, 0, 0, null, null, null, null,
    JSON.stringify([{url: l.url, source: l.source_name}]),
    JSON.stringify({first_seen: today, last_seen: today, discovery_count: 1, is_new: true}),
    null, l.source, l.source_name, 0, l.analyst_notes,
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null, null, null,
    null, null, 0, null, "active", today, "discovered", null, null
  ];
  
  if (vals.length !== 58) { console.error("BAD:" + l.url + " count=" + vals.length); process.exit(1); }
  insert.run(...vals);
  console.log("OK:" + l.address + " | TBC | ?bed | " + l.source_name + " | " + id.substring(0, 8));
  imported++;
}
console.log("Done:" + imported + " imported, " + skipped + " skipped");
