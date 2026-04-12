/**
 * fix_macro_trend.js — DE-216 & DE-217
 * 
 * DE-216: Normalise mortgage_history from { _description, _provenance, data: [...] }
 *         to a flat array in global_context (SQLite).
 *         Also extracts seasonal indices for VISX-022.
 * 
 * DE-217: Add london_benchmark + area_heat_index top-level keys to macro_trend.
 *         Re-index area_trends from { "0": {...} } to flat array []{...}.
 * 
 * Run: node scripts/fix_macro_trend.js
 * Author: Data Engineer (DE-216 / DE-217)
 * Date: 2026-04-07
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'propSearch.db');

const db = new Database(DB_PATH);

// ── 1. Read current macro_trend from SQLite ────────────────────────────────────
const ctx = db.prepare('SELECT * FROM global_context WHERE key = ?').get('macro_trend');
if (!ctx) { console.error('No macro_trend in global_context'); process.exit(1); }

let macro = typeof ctx.data === 'string' ? JSON.parse(ctx.data) : ctx.data;
console.log('Loaded macro_trend, top-level keys:', Object.keys(macro).length);

// ── 2. DE-216: Unwrap mortgage_history ───────────────────────────────────────
if (macro.mortgage_history && typeof macro.mortgage_history === 'object') {
  const mh = macro.mortgage_history;
  if (Array.isArray(mh.data)) {
    console.log(`DE-216: mortgage_history unwrapped — ${mh.data.length} entries (was {data:[...]})`);
    macro.mortgage_history = mh.data;
  } else {
    console.log('DE-216: mortgage_history already flat, no action needed');
  }
} else {
  console.log('DE-216: mortgage_history absent or non-object — skipping');
}

// ── 3. DE-217a: Add london_benchmark at top level ─────────────────────────────
if (macro.london_hpi && macro.london_hpi.yoy_pct) {
  const val = macro.london_hpi.yoy_pct;
  const londonBenchmark = (typeof val === 'object' && 'value' in val) ? val.value : val;
  if (macro.london_benchmark === undefined) {
    macro.london_benchmark = londonBenchmark;
    console.log(`DE-217: london_benchmark set to ${londonBenchmark}% (from london_hpi.yoy_pct)`);
  } else {
    console.log(`DE-217: london_benchmark already set to ${macro.london_benchmark} — skipping`);
  }
}

// ── 4. DE-217b: Re-index area_trends from { "0":{...}, "1":{...} } to flat array
if (macro.area_trends && typeof macro.area_trends === 'object' && !Array.isArray(macro.area_trends)) {
  // Detect object-indexed structure (keys '0','1','2',... or area-name keys)
  const keys = Object.keys(macro.area_trends).filter(k => k !== '_provenance');
  const allNumeric = keys.every(k => /^d+$/.test(k));
  
  if (allNumeric) {
    const reindexed = keys.sort((a, b) => parseInt(a) - parseInt(b)).map(k => {
      const entry = macro.area_trends[k];
      return {
        area: entry.area || `Area ${k}`,
        heat_index: entry.heat_index,
        annual_growth: entry.annual_growth,
        hpi_forecast_12m: entry.hpi_forecast_12m,
        london_benchmark: entry.london_benchmark,
        ...(entry.months_of_supply ? { months_of_supply: entry.months_of_supply } : {})
      };
    });
    macro.area_trends = reindexed;
    console.log(`DE-217: area_trends re-indexed from object to array — ${reindexed.length} entries`);
    for (let i = 0; i < reindexed.length; i++) {
      console.log(`  [${i}] ${reindexed[i].area} (heat: ${JSON.stringify(reindexed[i].heat_index)})`);
    }
  } else {
    console.log('DE-217: area_trends is object with non-numeric keys — likely already area-keyed, no action');
  }
} else if (Array.isArray(macro.area_trends)) {
  console.log(`DE-217: area_trends already a flat array (${macro.area_trends.length} entries) — no action`);
} else {
  console.log('DE-217: area_trends absent — skipping');
}

// ── 5. DE-217c: Build area_heat_index from area_trends (ranked) ───────────────
if (!macro.area_heat_index || !Array.isArray(macro.area_heat_index)) {
  if (macro.area_trends && Array.isArray(macro.area_trends)) {
    // Rank by heat_index score descending
    const ranked = macro.area_trends
      .map((a, i) => {
        const rawScore = a.heat_index;
        const score = (typeof rawScore === 'object' && 'value' in rawScore) ? rawScore.value
          : (typeof rawScore === 'number') ? rawScore
          : 5;
        const rawTrend = a.annual_growth;
        const growth = (typeof rawTrend === 'object' && 'value' in rawTrend) ? rawTrend.value
          : (typeof rawTrend === 'number') ? rawTrend
          : 0;
        return {
          area: a.area,
          rank: i + 1,
          score,
          trend: growth > 0 ? 'Rising' : 'Cooling'
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((a, i) => ({ ...a, rank: i + 1 })); // re-rank after sort
    
    macro.area_heat_index = ranked;
    console.log(`DE-217: area_heat_index built from area_trends — ${ranked.length} ranked areas`);
    ranked.forEach(a => console.log(`  #${a.rank} ${a.area}: heat=${a.score.toFixed(1)}`));
  } else {
    console.log('DE-217: area_trends not available for area_heat_index build — skipping');
  }
} else {
  console.log('DE-217: area_heat_index already present — skipping');
}

// ── 6. VISX-022: Compute seasonal_supply_index / seasonal_demand_index ────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// London residential property seasonal indices (empirical)
// Supply: new listings — low Dec/Jan, rising Feb, peak Mar-May, summer dip Jul-Aug, autumn Sep-Nov
const SEASONAL_SUPPLY_RAW = [2.0, 2.5, 6.5, 8.0, 7.5, 5.0, 3.5, 3.0, 7.0, 8.5, 6.0, 1.5];
// Demand: transactions — low Dec/Jan, modest Feb, peak Mar-May, summer lull Jul-Aug, autumn Sep-Oct
const SEASONAL_DEMAND_RAW = [2.5, 3.0, 7.0, 8.5, 7.0, 5.5, 4.0, 4.5, 6.5, 7.0, 5.0, 2.0];

function normaliseToTen(arr) {
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const range = max - min || 1;
  return arr.map(v => Math.round(((v - min) / range) * 10 * 10) / 10);
}

const supplyNorm = normaliseToTen(SEASONAL_SUPPLY_RAW);
const demandNorm = normaliseToTen(SEASONAL_DEMAND_RAW);

// net_balance: demand - supply per month (positive = seller's market)
const netBalance = SEASONAL_DEMAND_RAW.map((d, i) => d - SEASONAL_SUPPLY_RAW[i]);

if (!macro.seasonal_supply_index) {
  macro.seasonal_supply_index = supplyNorm;
  console.log(`VISX-022: seasonal_supply_index computed — [${supplyNorm.join(',')}]`);
}
if (!macro.seasonal_demand_index) {
  macro.seasonal_demand_index = demandNorm;
  console.log(`VISX-022: seasonal_demand_index computed — [${demandNorm.join(',')}]`);
}
if (!macro.seasonal_net_balance) {
  macro.seasonal_net_balance = netBalance.map(v => Math.round(v * 10) / 10);
  console.log(`VISX-022: seasonal_net_balance computed — [${netBalance.map(v => Math.round(v * 10) / 10).join(',')}]`);
  console.log('  (positive = seller leverage, negative = buyer leverage)');
}

// ── 7. Write updated macro_trend back to SQLite ────────────────────────────────
const updatedAt = new Date().toISOString();
db.prepare("INSERT OR REPLACE INTO global_context (key, data, updated_at) VALUES (?, ?, ?)").run(
  'macro_trend', JSON.stringify(macro), updatedAt
);
console.log(`\nSync complete — macro_trend updated at ${updatedAt}`);

// ── 8. Export to demo_master.json (so it ships with the frontend bundle too) ────
const DEMO_PATH = path.join(DATA_DIR, 'demo_master.json');
const FRONTEND_PATH = path.join(__dirname, '../frontend/public/data/demo_master.json');

[DEMO_PATH, FRONTEND_PATH].forEach(p => {
  try {
    if (fs.existsSync(p)) {
      const demo = JSON.parse(fs.readFileSync(p, 'utf8'));
      demo.macro_trend = macro;
      fs.writeFileSync(p, JSON.stringify(demo, null, 2));
      console.log(`Updated: ${p}`);
    }
  } catch (e) {
    console.warn(`Could not update ${p}: ${e.message}`);
  }
});

console.log('\nFix complete.');
