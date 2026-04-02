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
 * Recursively find all import files (json + jsonl) in a directory tree,
 * excluding the archive subdirectory.
 */
function findImportFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'archive' && entry.name !== 'processed' && entry.name !== 'snapshots') {
        results.push(...findImportFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.jsonl'))) {
      results.push(fullPath);
    }
  }
  return results;
}

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

  // 2a. Process JSONL Import Files (newline-delimited JSON — one record per line)
  // Recursively scans all subdirectories under IMPORT_DIR (excludes archive/processed/snapshots)
  if (fs.existsSync(IMPORT_DIR)) {
    const allFiles = findImportFiles(IMPORT_DIR);
    const jsonlFiles = allFiles.filter(f => f.endsWith('.jsonl'));
    const jsonFiles = allFiles.filter(f => f.endsWith('.json'));

    for (const file of jsonlFiles) {
      const relPath = path.relative(DATA_DIR, file);
      // Guards: skip metadata/reporting files — never process these as property records
      if (relPath.includes('REJECTIONS_REPORT') || relPath.includes('VERIFICATION_REPORT')) {
        console.log(`Skipping metadata file: ${relPath}`);
        continue;
      }
      console.log(`Processing JSONL: ${relPath}...`);
      try {
        const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(l => l.trim());
        let skipped = 0, imported = 0;
        for (const line of lines) {
          const item = JSON.parse(line);
          // Guard: skip CONDITIONAL records that need sqft verification — do NOT auto-promote
          if (item.acquisition_status === 'CONDITIONAL — sqft required (≥600 sqft)' || item.needs_sqft_verification === true) {
            skipped++;
            continue;
          }
          // Guard: skip REJECTED records — these have been analysed and should not enter master DB
          const status = (item.acquisition_status || '').toLowerCase();
          if (status.includes('rejected') || status.includes('reject') || status === 'reject') {
            skipped++;
            continue;
          }
          // Guard: skip records without address (null/missing) — these are non-property artefacts
          if (!item.address || item.address.trim() === '') {
            skipped++;
            console.error(`  WARNING: Skipping record with null/empty address from ${path.basename(file)}`);
            continue;
          }
          const enrichedItem = enrichVisuals(item);
          const processedItem = processItem(enrichedItem);
          dailySnapshot.push(processedItem);
          imported++;
        }
        console.log(`  -> Imported: ${imported}, Skipped: ${skipped}`);

        // Archive JSONL (preserve subdirectory structure in archive path)
        const archiveDir = path.join(DATA_DIR, 'archive/imports');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        const archiveName = `${Date.now()}_${path.basename(file)}`;
        fs.renameSync(file, path.join(archiveDir, archiveName));
      } catch (e) {
        console.error(`Failed to process JSONL ${relPath}: ${e.message}`);
      }
    }

    for (const file of jsonFiles) {
      const relPath = path.relative(DATA_DIR, file);
      // Guards: skip metadata/reporting files
      if (relPath.includes('REJECTIONS_REPORT') || relPath.includes('VERIFICATION_REPORT')) {
        console.log(`Skipping metadata file: ${relPath}`);
        continue;
      }
      console.log(`Importing JSON: ${relPath}...`);
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const items = JSON.parse(raw);
        const itemsArray = Array.isArray(items) ? items : [items];
        let skipped = 0, imported = 0;
        for (const item of itemsArray) {
          // Guard: skip CONDITIONAL records that need sqft verification
          if (item.acquisition_status === 'CONDITIONAL — sqft required (≥600 sqft)' || item.needs_sqft_verification === true) {
            skipped++;
            continue;
          }
          // Guard: skip REJECTED records
          const status = (item.acquisition_status || '').toLowerCase();
          if (status.includes('rejected') || status.includes('reject') || status === 'reject') {
            skipped++;
            continue;
          }
          // Guard: skip records without address
          if (!item.address || item.address.trim() === '') {
            skipped++;
            console.error(`  WARNING: Skipping record with null/empty address from ${path.basename(file)}`);
            continue;
          }
          const enrichedItem = enrichVisuals(item);
          const processedItem = processItem(enrichedItem);
          dailySnapshot.push(processedItem);
          imported++;
        }
        console.log(`  -> Imported: ${imported}, Skipped: ${skipped}`);

        // Archive JSON (preserve subdirectory structure in archive path)
        const archiveDir = path.join(DATA_DIR, 'archive/imports');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        const archiveName = `${Date.now()}_${path.basename(file)}`;
        fs.renameSync(file, path.join(archiveDir, archiveName));
      } catch (e) {
        console.error(`Failed to import JSON ${relPath}: ${e.message}`);
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
  // DE-165: INSERT includes market_status='active' and last_checked for new properties
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
      waitrose_distance, whole_foods_distance, wellness_hub_distance,
      archived, archive_reason, market_status, last_checked, pipeline_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // UPDATE preserves archived/archive_reason/pipeline_status — analyst-set and user pipeline flags must not be overwritten by sync
  // DE-164: Updated to merge links/gallery and promote higher-res images on duplicate detection
  // DE-165: Updated to update last_checked on every re-seen property
  // FE-186: Updated to preserve pipeline_status — user's pipeline decisions are never overwritten by the sync pipeline
  const updateStmt = db.prepare(`
    UPDATE properties SET
      list_price = ?, realistic_price = ?, dom = ?, metadata = ?,
      price_reduction_amount = ?, price_reduction_percent = ?, days_since_reduction = ?,
      epc_improvement_potential = ?, est_capex_requirement = ?,
      waitrose_distance = ?, whole_foods_distance = ?, wellness_hub_distance = ?,
      links = ?, image_url = ?, gallery = ?, floorplan_url = COALESCE(?, floorplan_url),
      streetview_url = COALESCE(?, streetview_url), last_checked = ?
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
      const existing = db.prepare("SELECT id, metadata, list_price, links, image_url, gallery, floorplan_url, streetview_url FROM properties WHERE address = ? AND area = ?").get(newItem.address, newItem.area);

      if (existing) {
        // DE-164: Fetch and merge visual/link fields from existing record
        const existingLinks = (() => {
          try { return typeof existing.links === 'string' ? JSON.parse(existing.links) : (existing.links || []); } catch { return []; }
        })();
        const existingGallery = (() => {
          try { return typeof existing.gallery === 'string' ? JSON.parse(existing.gallery) : (existing.gallery || []); } catch { return []; }
        })();
        const existingImageUrl = existing.image_url || null;
        const existingFloorplan = existing.floorplan_url || null;
        const existingStreetview = existing.streetview_url || null;

        // (a) Merge new links into existing — dedupe by URL string
        const newLinks = Array.isArray(newItem.links) ? newItem.links : [];
        const mergedLinks = [...existingLinks];
        for (const link of newLinks) {
          if (link && typeof link === 'object' && link.url && !mergedLinks.find(l => l && l.url === link.url)) {
            mergedLinks.push(link);
          }
        }

        // (b) Merge new gallery images into existing — dedupe by URL
        const newGallery = Array.isArray(newItem.gallery) ? newItem.gallery : [];
        const mergedGallery = [...existingGallery];
        for (const img of newGallery) {
          if (img && !mergedGallery.includes(img)) mergedGallery.push(img);
        }

        // (c) Promote image_url if new value is higher-res (≥1024px wide) and existing is lower/missing
        let promotedImageUrl = existingImageUrl;
        const isHighRes = (url) => url && (url.includes('/1024/') || url.includes('/1280/') || url.includes('/1440/') || url.includes('/1920/') || /\/[12]\d{3}[_\/]/.test(url));
        if (newItem.image_url) {
          const existingIsHighRes = isHighRes(existingImageUrl);
          const newIsHighRes = isHighRes(newItem.image_url);
          if (!existingImageUrl || (!existingIsHighRes && newIsHighRes)) {
            promotedImageUrl = newItem.image_url;
          }
        }

        // (d) Keep existing floorplan/streetview if set; fill in missing ones
        const promotedFloorplan = existingFloorplan || newItem.floorplan_url || null;
        const promotedStreetview = existingStreetview || newItem.streetview_url || null;

        // Update metadata
        const metadata = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {});
        metadata.last_seen = new Date().toISOString().split('T')[0];
        metadata.discovery_count = (metadata.discovery_count || 1) + 1;
        metadata.is_new = false;

        const mergedLinksChanged = mergedLinks.length !== existingLinks.length;
        const mergedGalleryChanged = mergedGallery.length !== existingGallery.length;
        const imagePromoted = promotedImageUrl !== existingImageUrl;

        // DE-165: Update last_checked on every re-seen property
        const today = new Date().toISOString().split('T')[0];
        updateStmt.run(
          newItem.list_price, newItem.realistic_price, newItem.dom || null, JSON.stringify(metadata),
          newItem.price_reduction_amount || null, newItem.price_reduction_percent || null, newItem.days_since_reduction || null,
          newItem.epc_improvement_potential || null, newItem.est_capex_requirement || null,
          newItem.waitrose_distance || null, newItem.whole_foods_distance || null, newItem.wellness_hub_distance || null,
          JSON.stringify(mergedLinks),
          promotedImageUrl,
          JSON.stringify(mergedGallery),
          promotedFloorplan,
          promotedStreetview,
          today,
          existing.id
        );

        if (mergedLinksChanged) console.log(`  [DE-164] Links merged for ${newItem.address}: ${existingLinks.length} -> ${mergedLinks.length}`);
        if (mergedGalleryChanged) console.log(`  [DE-164] Gallery merged for ${newItem.address}: ${existingGallery.length} -> ${mergedGallery.length}`);
        if (imagePromoted) console.log(`  [DE-164] Image promoted for ${newItem.address}: ${existingImageUrl ? 'upgraded' : 'new'}`);

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
          newItem.waitrose_distance || null, newItem.whole_foods_distance || null, newItem.wellness_hub_distance || null,
          // DE-162 fix: preserve archived/archive_reason on new pipeline inserts (default active)
          newItem.archived !== undefined ? newItem.archived : 0,
          newItem.archive_reason || null,
          // DE-165: new property is 'active', last_checked set to today
          'active',
          new Date().toISOString().split('T')[0],
          // FE-186: new property enters at 'discovered' — user pipeline default
          'discovered'
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
