/**
 * propSearch: Weekly Price Monitor
 * 
 * Compares current list_prices against price_history to detect:
 * - Price reductions (updates price_reduction_amount, price_reduction_percent)
 * - New price history snapshots
 * - Days since last reduction
 * 
 * Run weekly via: node scripts/price_monitor.js
 * Or add to crontab: 0 9 * * 1 node scripts/price_monitor.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/propSearch.db');
const db = new Database(DB_PATH);

// ── Config ────────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// ── Helpers ─────────────────────────────────────────────────────────────────
function getLatestPriceHistory(propertyId) {
  return db.prepare(`
    SELECT price, date FROM price_history 
    WHERE property_id = ? 
    ORDER BY date DESC LIMIT 1
  `).get(propertyId);
}

function getAllActiveProperties() {
  return db.prepare(`
    SELECT id, address, list_price, price_reduction_amount, price_reduction_percent, 
           days_since_reduction, dom
    FROM properties 
    WHERE archived = 0 AND list_price IS NOT NULL
  `).all();
}

function getPropertyDetails(propertyId) {
  return db.prepare(`
    SELECT sqft, dom, source, source_name FROM properties WHERE id = ?
  `).get(propertyId);
}

/**
 * Insert an enriched price_history entry.
 * DE-221/DE-222: Writes full schema including status, reduction_pct, price_per_sqm,
 * days_on_market, source, and portal_price_id.
 */
function insertPriceSnapshot(propertyId, price, date, opts = {}) {
  const { status = 'listed', reductionPct = null, source = 'price_monitor' } = opts;

  // Check if we already have this date
  const existing = db.prepare(`
    SELECT id FROM price_history WHERE property_id = ? AND date = ?
  `).get(propertyId, date);

  if (existing) return false;

  const details = getPropertyDetails(propertyId);
  const pricePerSqm = (details && details.sqft > 0)
    ? parseFloat(((price * 10.764) / details.sqft).toFixed(2))
    : null;
  const daysOnMarket = details?.dom ?? null;

  db.prepare(`
    INSERT INTO price_history
      (property_id, price, date, status, reduction_pct, price_per_sqm, days_on_market, source, portal_price_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(propertyId, price, date, status, reductionPct, pricePerSqm, daysOnMarket, source, opts.portalPriceId || null);

  return true;
}

function updatePropertyReduction(propId, reductionAmount, reductionPct, daysSince) {
  db.prepare(`
    UPDATE properties 
    SET price_reduction_amount = ?, price_reduction_percent = ?, days_since_reduction = ?
    WHERE id = ?
  `).run(reductionAmount, reductionPct, daysSince, propId);
}

function clearReduction(propId) {
  db.prepare(`
    UPDATE properties 
    SET price_reduction_amount = NULL, price_reduction_percent = NULL, days_since_reduction = NULL
    WHERE id = ?
  `).run(propId);
}

// ── Main Logic ───────────────────────────────────────────────────────────────
function runPriceMonitor() {
  console.log(`\n=== propSearch Price Monitor — ${TODAY} ===\n`);
  
  const properties = getAllActiveProperties();
  console.log(`Monitoring ${properties.length} active properties...\n`);
  
  let snapshotsAdded = 0;
  let reductionsFound = 0;
  let reductionsCleared = 0;
  
  for (const prop of properties) {
    const latestHistory = getLatestPriceHistory(prop.id);
    
    // Always record today's snapshot if price has changed
    if (!latestHistory || latestHistory.price !== prop.list_price) {
      let insertOpts = { source: 'price_monitor' };

      // Detect price reduction — set status and reduction_pct for the new entry
      if (latestHistory && prop.list_price < latestHistory.price) {
        const reductionAmount = latestHistory.price - prop.list_price;
        const reductionPct = parseFloat(((reductionAmount / latestHistory.price) * 100).toFixed(2));
        const prevDate = latestHistory.date;
        const daysSince = Math.round((new Date(TODAY) - new Date(prevDate)) / (1000 * 60 * 60 * 24));
        insertOpts = { status: 'reduced', reductionPct, source: 'price_monitor' };

        updatePropertyReduction(prop.id, reductionAmount, reductionPct, daysSince);
        reductionsFound++;
        console.log(`  [REDUCED]  £${reductionAmount.toLocaleString()} (${reductionPct}%) | ${daysSince} days since last price | ${prop.address.substring(0, 45)}`);
      }

      // Detect price increase — clear reduction fields
      if (latestHistory && prop.list_price > latestHistory.price) {
        clearReduction(prop.id);
        reductionsCleared++;
        console.log(`  [INCREASED] Price back up — reduction flags cleared for ${prop.address.substring(0, 45)}`);
      }

      const inserted = insertPriceSnapshot(prop.id, prop.list_price, TODAY, insertOpts);
      if (inserted) {
        snapshotsAdded++;
        console.log(`  [SNAPSHOT] ${prop.address.substring(0, 50)}`);
        console.log(`            £${(latestHistory?.price || 'N/A')} → £${prop.list_price.toLocaleString()}`);
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`  New snapshots recorded: ${snapshotsAdded}`);
  console.log(`  Price reductions detected: ${reductionsFound}`);
  console.log(`  Reduction flags cleared (price up): ${reductionsCleared}`);
  console.log(`  Monitored: ${properties.length} properties`);
  console.log(`  Run date: ${TODAY}`);
  
  if (snapshotsAdded === 0 && reductionsFound === 0) {
    console.log(`\n  [OK] No price changes detected. All properties stable.`);
  }
}

// Run if executed directly
if (require.main === module) {
  runPriceMonitor();
}

module.exports = { runPriceMonitor, getLatestPriceHistory, insertPriceSnapshot };
