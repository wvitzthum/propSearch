const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'propSearch.db');
const INBOX_DIR = path.join(DATA_DIR, 'inbox');
const TRIAGED_DIR = path.join(DATA_DIR, 'triaged');
const IMPORT_DIR = path.join(DATA_DIR, 'import');

const db = new Database(DB_PATH);

/**
 * Call the visual scraper to enrich property data.
 */
function enrichVisuals(item) {
  if (!item.url) return item;
  
  // Only enrich if images or floorplan are missing
  if (item.image_url && item.floorplan_url && item.gallery && item.gallery.length > 0) {
    return item;
  }

  console.log(`Enriching visuals for: ${item.address || item.url}`);
  try {
    const output = execSync(`node ${path.join(__dirname, 'scrape_visuals.js')} "${item.url}"`, { encoding: 'utf8' });
    const match = output.match(/--- Extraction Complete ---\n([\s\S]*)/);
    if (match) {
      const result = JSON.parse(match[1]);
      return {
        ...item,
        image_url: item.image_url || result.image_url,
        floorplan_url: item.floorplan_url || result.floorplan_url,
        gallery: (item.gallery && item.gallery.length > 0) ? item.gallery : result.gallery
      };
    }
  } catch (e) {
    console.error(`Visual enrichment failed for ${item.url}: ${e.message}`);
  }
  return item;
}

async function sync() {
  console.log('--- propSearch Data Sync Cycle (SQLite) Started ---');

  const dailySnapshot = [];

  // 1. Process Manual Queue
  try {
    const pendingItems = db.prepare("SELECT * FROM manual_queue WHERE status = 'Pending' OR status IS NULL").all();
    
    if (pendingItems.length > 0) {
      console.log(`Processing ${pendingItems.length} pending manual leads...`);
      
      for (const item of pendingItems) {
        try {
          const rawData = typeof item.raw_data === 'string' ? JSON.parse(item.raw_data) : item.raw_data;
          const mergedItem = { ...rawData, url: item.url, source: item.source || 'MANUAL_INJECTION' };
          
          if (!mergedItem.address || !mergedItem.area) throw new Error('Missing address or area');
          
          const enrichedItem = enrichVisuals(mergedItem);
          const processedItem = processItem(enrichedItem);
          dailySnapshot.push(processedItem);
          
          db.prepare("UPDATE manual_queue SET status = 'Completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?").run(item.id);
        } catch (e) {
          console.error(`Failed to process manual item ${item.id}: ${e.message}`);
          db.prepare("UPDATE manual_queue SET status = 'Failed', processed_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?").run(e.message, item.id);
        }
      }
    }
  } catch (e) {
    console.error('Error processing manual queue:', e.message);
  }

  // 2. Process Import Directory
  if (fs.existsSync(IMPORT_DIR)) {
    const importFiles = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith('.json'));
    for (const file of importFiles) {
      console.log(`Importing ${file}...`);
      try {
        const items = JSON.parse(fs.readFileSync(path.join(IMPORT_DIR, file), 'utf8'));
        const itemsArray = Array.isArray(items) ? items : [items];
        for (const item of itemsArray) {
          const enrichedItem = enrichVisuals(item);
          const processedItem = processItem(enrichedItem);
          dailySnapshot.push(processedItem);
        }
        
        // Archive imports
        const archiveDir = path.join(DATA_DIR, 'archive/imports');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        fs.renameSync(path.join(IMPORT_DIR, file), path.join(archiveDir, `${Date.now()}_${file}`));
      } catch (e) {
        console.error(`Failed to import ${file}: ${e.message}`);
      }
    }
  }

  // 3. Process Triaged Inbox Leads
  if (fs.existsSync(TRIAGED_DIR)) {
    const triagedFiles = fs.readdirSync(TRIAGED_DIR).filter(f => f.endsWith('.json'));
    if (triagedFiles.length > 0) {
      console.log(`Processing ${triagedFiles.length} triaged inbox leads...`);
      
      for (const file of triagedFiles) {
        try {
          const item = JSON.parse(fs.readFileSync(path.join(TRIAGED_DIR, file), 'utf8'));
          const enrichedItem = enrichVisuals(item);
          const processedItem = processItem(enrichedItem);
          dailySnapshot.push(processedItem);
          
          // Archive triaged lead
          const archiveDir = path.join(DATA_DIR, 'archive/triaged');
          if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
          fs.renameSync(path.join(TRIAGED_DIR, file), path.join(archiveDir, `${Date.now()}_${file}`));
        } catch (e) {
          console.error(`Failed to sync triaged lead ${file}: ${e.message}`);
        }
      }
    }
  }

  // 4. Update Properties in SQLite
  const insertStmt = db.prepare(`
    INSERT INTO properties (
      id, address, area, image_url, gallery, streetview_url, floorplan_url,
      list_price, realistic_price, sqft, price_per_sqm, 
      nearest_tube_distance, park_proximity, commute_paternoster, 
      commute_canada_square, is_value_buy, epc, tenure, 
      service_charge, ground_rent, lease_years_remaining,
      dom, neg_strategy, alpha_score, appreciation_potential, links, 
      metadata, floor_level, source, source_name, vetted, analyst_notes,
      price_reduction_amount, price_reduction_percent, days_since_reduction,
      epc_improvement_potential, est_capex_requirement,
      waitrose_distance, whole_foods_distance, wellness_hub_distance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE properties SET 
      list_price = ?, realistic_price = ?, dom = ?, metadata = ?,
      price_reduction_amount = ?, price_reduction_percent = ?, days_since_reduction = ?,
      epc_improvement_potential = ?, est_capex_requirement = ?,
      waitrose_distance = ?, whole_foods_distance = ?, wellness_hub_distance = ?
    WHERE id = ?
  `);

  const historyStmt = db.prepare(`
    INSERT INTO price_history (property_id, price, date) VALUES (?, ?, ?)
  `);

  // Ensure price_history table exists for independent script execution
  db.prepare(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT,
      price REAL,
      date TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    )
  `).run();

  for (const newItem of dailySnapshot) {
    try {
      const existing = db.prepare("SELECT id, metadata, list_price FROM properties WHERE address = ? AND area = ?").get(newItem.address, newItem.area);
      
      if (existing) {
        const metadata = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {});
        metadata.last_seen = new Date().toISOString().split('T')[0];
        metadata.discovery_count = (metadata.discovery_count || 1) + 1;
        metadata.is_new = false;

        updateStmt.run(
          newItem.list_price, newItem.realistic_price, newItem.dom || null, JSON.stringify(metadata),
          newItem.price_reduction_amount || null, newItem.price_reduction_percent || null, newItem.days_since_reduction || null,
          newItem.epc_improvement_potential || null, newItem.est_capex_requirement || null,
          newItem.waitrose_distance || null, newItem.whole_foods_distance || null, newItem.wellness_hub_distance || null,
          existing.id
        );

        // DAT-140: Track price changes
        if (newItem.list_price && newItem.list_price !== existing.list_price) {
          console.log(`Price change detected for ${newItem.address}: £${existing.list_price} -> £${newItem.list_price}`);
          historyStmt.run(existing.id, newItem.list_price, new Date().toISOString().split('T')[0]);
        }
      } else {
        const id = newItem.id || crypto.randomUUID();
        const metadata = {
          first_seen: new Date().toISOString().split('T')[0],
          last_seen: new Date().toISOString().split('T')[0],
          discovery_count: 1,
          is_new: true
        };

        insertStmt.run(
          id, newItem.address, newItem.area, newItem.image_url, JSON.stringify(newItem.gallery || []), newItem.streetview_url || null, newItem.floorplan_url || null,
          newItem.list_price || null, newItem.realistic_price || null, newItem.sqft || null, newItem.price_per_sqm || null,
          newItem.nearest_tube_distance || null, newItem.park_proximity || null, newItem.commute_paternoster || null,
          newItem.commute_canada_square || null, newItem.is_value_buy ? 1 : 0, newItem.epc || null, newItem.tenure || null,
          newItem.service_charge || 0, newItem.ground_rent || 0, newItem.lease_years_remaining || 0,
          newItem.dom || null, newItem.neg_strategy || null, newItem.alpha_score || null, newItem.appreciation_potential || null, JSON.stringify(newItem.links || []),
          JSON.stringify(metadata), newItem.floor_level || null, newItem.source || 'Automated Scrape', 
          newItem.source_name || null, newItem.vetted ? 1 : 0, newItem.analyst_notes || null,
          newItem.price_reduction_amount || null, newItem.price_reduction_percent || null, newItem.days_since_reduction || null,
          newItem.epc_improvement_potential || null, newItem.est_capex_requirement || null,
          newItem.waitrose_distance || null, newItem.whole_foods_distance || null, newItem.wellness_hub_distance || null
        );

        // DAT-140: Record initial price
        if (newItem.list_price) {
          historyStmt.run(id, newItem.list_price, new Date().toISOString().split('T')[0]);
        }
      }
    } catch (e) {
      console.error(`Failed to update SQLite for ${newItem.address}: ${e.message}`);
    }
  }

  // 5. Save Daily Snapshot
  if (dailySnapshot.length > 0) {
    const TODAY_SNAPSHOT = new Date().toISOString().split('T')[0].split('-').reverse().join('_'); // DD_MM_YYYY
    const filename = `${TODAY_SNAPSHOT}.json`;
    db.prepare("INSERT OR REPLACE INTO snapshots (filename, data, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(filename, JSON.stringify(dailySnapshot));
  }

  // 6. Sync Global Context
  const GLOBAL_FILES = [
    { key: 'macro_trend', path: 'macro_trend.json' },
    { key: 'financial_context', path: 'financial_context.json' },
    { key: 'london_metro', path: 'london_metro.geojson' }
  ];

  for (const file of GLOBAL_FILES) {
    const filePath = path.join(DATA_DIR, file.path);
    if (fs.existsSync(filePath)) {
      console.log(`Syncing ${file.path} to global_context...`);
      const content = fs.readFileSync(filePath, 'utf8');
      // All global context files stored as raw JSON — no wrapping envelope
      db.prepare("INSERT OR REPLACE INTO global_context (key, data, updated_at) VALUES (?, ?, datetime('now'))").run(file.key, content);
    }
  }

  console.log(`--- Sync Cycle Complete. Processed ${dailySnapshot.length} assets ---`);
}

function processItem(item) {
  const listPrice = item.list_price || 0;
  const realisticPrice = item.realistic_price || (listPrice * 0.97); 
  
  return {
    ...item,
    realistic_price: Math.round(realisticPrice),
    is_value_buy: item.is_value_buy !== undefined ? item.is_value_buy : (realisticPrice < listPrice)
  };
}

sync();
