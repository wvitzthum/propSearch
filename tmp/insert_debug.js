
const fs=require("fs"),c=require("crypto"),Database=require("better-sqlite3");
const db=new Database("data/propSearch.db");
const leads=JSON.parse(fs.readFileSync("data/archive/imports/1776023926053_user_submissions_2026-04-12T19-56-25-466Z.json","utf8"));
const today=new Date().toISOString().split("T")[0];
const dedup=db.prepare("SELECT id FROM properties WHERE address=? AND area=?");
const hist=db.prepare("INSERT INTO price_history (property_id,price,date) VALUES(?,?,?)");
const cols=["id","address","area","image_url","gallery","streetview_url","floorplan_url","list_price","realistic_price","sqft","price_per_sqm","nearest_tube_distance","park_proximity","commute_paternoster","commute_canada_square","is_value_buy","epc","tenure","service_charge","ground_rent","lease_years_remaining","dom","neg_strategy","alpha_score","appreciation_potential","links","metadata","floor_level","source","source_name","vetted","analyst_notes","price_reduction_amount","price_reduction_percent","days_since_reduction","epc_improvement_potential","est_capex_requirement","waitrose_distance","whole_foods_distance","wellness_hub_distance","ltv_match_score","appr_bear_5yr","appr_base_5yr","appr_bull_5yr","appr_p10","appr_p50","appr_p90","rental_yield_gross","rental_yield_net","bedrooms","bathrooms","archived","archive_reason","market_status","last_checked","pipeline_status","property_rank","council_tax_band"];
const insert=db.prepare("INSERT INTO properties ("+cols.join(",")+") VALUES ("+cols.map(()=>"?").join(",")+")");
let imported=0,skipped=0;
for(const l of leads){
  const ex=dedup.get(l.address,l.area);
  if(ex){console.log("SKIP:"+l.address);skipped++;continue}
  const id=c.randomUUID(),lp=l.list_price||0,rp=l.realistic_price||lp;
  const vals=[
    id,l.address,l.area,l.image_url?l.image_url:null,
    JSON.stringify(l.gallery?l.gallery:[]),l.streetview_url?l.streetview_url:null,l.floorplan_url?l.floorplan_url:null,
    l.list_price?l.list_price:null,l.realistic_price?l.realistic_price:null,l.sqft?l.sqft:null,null,
    l.nearest_tube_distance?l.nearest_tube_distance:null,l.park_proximity?l.park_proximity:null,
    l.commute_paternoster?l.commute_paternoster:null,l.commute_canada_square?l.commute_canada_square:null,
    (rp<lp?1:0),l.epc?l.epc:null,l.tenure?l.tenure:null,
    l.service_charge?l.service_charge:0,l.ground_rent?l.ground_rent:0,l.lease_years_remaining?l.lease_years_remaining:0,
    l.dom?l.dom:null,l.neg_strategy?l.neg_strategy:null,null,null,
    JSON.stringify([{url:l.url,source:l.source_name}]),
    JSON.stringify({first_seen:today,last_seen:today,discovery_count:1,is_new:true}),
    l.floor_level?l.floor_level:null,l.source?l.source:"USER_SUBMISSION",l.source_name?l.source_name:null,
    0,l.analyst_notes?l.analyst_notes:null,
    l.price_reduction_amount?l.price_reduction_amount:null,l.price_reduction_percent?l.price_reduction_percent:null,l.days_since_reduction?l.days_since_reduction:null,
    null,null,null,null,null,null,null,null,null,
    l.bedrooms?l.bedrooms:null,l.bathrooms?l.bathrooms:null,
    0,null,"active",today,"discovered",null,l.council_tax_band?l.council_tax_band:null
  ];
  console.error("vals.length="+vals.length);if(vals.length!==58){console.error("BAD:"+l.address+" count="+vals.length);process.exit(1)}
  insert.run.apply(insert,vals);
  if(l.list_price)hist.run(id,l.list_price,today);
  console.log("OK:"+l.address+"|"+(l.list_price?"GBP"+l.list_price:"TBC")+"|"+(l.bedrooms?l.bedrooms:"?")+"bed|"+id);
  imported++
}
console.log("Done:"+imported+" imported,"+skipped+" skipped");
