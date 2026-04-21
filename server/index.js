const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = (process.env.PORT ? parseInt(process.env.PORT) : 3001);
const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = process.env.SQLITE_PATH
  ?? path.join(DATA_DIR, 'propSearch.db');
const INBOX_DIR = path.join(DATA_DIR, 'inbox');
const TRIAGED_DIR = path.join(DATA_DIR, 'triaged');
const ARCHIVE_INBOX_DIR = path.join(DATA_DIR, 'archive/inbox');

// Ensure directories exist
[INBOX_DIR, TRIAGED_DIR, ARCHIVE_INBOX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize SQLite with stabilization
let db;

function initializeDB() {
  console.log('Stabilizing SQLite database...');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // 1. properties table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      address TEXT,
      area TEXT,
      image_url TEXT,
      gallery TEXT,
      streetview_url TEXT,
      list_price REAL,
      realistic_price REAL,
      sqft REAL,
      price_per_sqm REAL,
      nearest_tube_distance REAL,
      park_proximity REAL,
      commute_paternoster REAL,
      commute_canada_square REAL,
      is_value_buy INTEGER,
      epc TEXT,
      tenure TEXT,
      dom INTEGER,
      neg_strategy TEXT,
      alpha_score REAL,
      appreciation_potential REAL,
      links TEXT,
      metadata TEXT,
      floor_level TEXT,
      floorplan_url TEXT,
      source TEXT,
      source_name TEXT,
      service_charge REAL,
      ground_rent REAL,
      lease_years_remaining REAL,
      vetted INTEGER DEFAULT 0,
      analyst_notes TEXT,
      price_reduction_amount REAL,
      price_reduction_percent REAL,
      days_since_reduction INTEGER
    )
  `).run();

  // 2. Add missing columns (DAT-081 & others)
  const columns = db.prepare("PRAGMA table_info(properties)").all();
  const columnNames = columns.map(c => c.name);

  const missingColumns = [
    { name: 'epc_improvement_potential', type: 'TEXT' },
    { name: 'est_capex_requirement', type: 'REAL' },
    { name: 'waitrose_distance', type: 'REAL' },
    { name: 'whole_foods_distance', type: 'REAL' },
    { name: 'wellness_hub_distance', type: 'REAL' },
    { name: 'floorplan_url', type: 'TEXT' },
    // FE-186: pipeline_status — user pipeline decisions, persisted server-side
    // DE-231: Added 'watchlist' to enum
    { name: 'pipeline_status', type: "TEXT DEFAULT 'discovered' CHECK(pipeline_status IN ('discovered','shortlisted','vetted','watchlist','archived'))" },
    // ADR-014: market_status — market reality (active/under_offer/sold_stc/sold_completed/withdrawn/unknown)
    { name: 'market_status', type: "TEXT DEFAULT 'unknown' CHECK(market_status IN ('active','under_offer','sold_stc','sold_completed','withdrawn','unknown'))" },
    // ADR-014: last_checked — last date property was verified against live portal
    { name: 'last_checked', type: 'TEXT' },
    // UX-034: property_rank — DEPRECATED by DE-231. Column removed in v2026-04-18 migration.
  ];

  for (const col of missingColumns) {
    if (!columnNames.includes(col.name)) {
      console.log(`Adding missing column: ${col.name}`);
      db.prepare(`ALTER TABLE properties ADD COLUMN ${col.name} ${col.type}`).run();
    }
  }

  // DE-231: Drop deprecated property_rank column (SQLite 3.35+ supports DROP COLUMN)
  // Property rank functionality is removed from the pipeline — status is now ordinal.
  if (columnNames.includes('property_rank')) {
    try {
      db.prepare('ALTER TABLE properties DROP COLUMN property_rank').run();
      console.log('DE-231: Dropped deprecated property_rank column');
    } catch (e) {
      console.error('DE-231: Failed to drop property_rank column (SQLite version may not support DROP COLUMN):', e.message);
    }
  }

  // DE-231: Migrate pipeline_status CHECK constraint to include 'watchlist'
  // SQLite doesn't support ALTER CONSTRAINT, so we recreate the column safely.
  // Detect by checking if current schema still has old CHECK (without 'watchlist').
  try {
    const schemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='properties'").get();
    if (schemaRow && schemaRow.sql && !schemaRow.sql.includes("'watchlist'")) {
      console.log('DE-231: Migrating pipeline_status CHECK constraint to include watchlist...');
      // Pre-fix: correct misclassified market_status values (data issue from prior pipeline_status/market_status confusion)
      const fixed = db.prepare("UPDATE properties SET market_status = 'unknown' WHERE market_status = 'discovered'").run();
      if (fixed.changes > 0) console.log(`DE-231: Fixed ${fixed.changes} rows with market_status='discovered' (should be pipeline_status)`);
      // Clean up any stale temp table from a previous failed migration attempt
      db.exec('DROP TABLE IF EXISTS properties_new');
      // Re-add column with new CHECK: SQLite allows ADD COLUMN on same name after DROP
      // We use a rename-and-recreate pattern for safety within a transaction
      db.exec('PRAGMA legacy_alter_table = ON');
      db.pragma('foreign_keys = OFF'); // Disable FK checks during table recreation
      db.exec(`
        CREATE TABLE properties_new (
          id TEXT PRIMARY KEY,
          address TEXT,
          area TEXT,
          image_url TEXT,
          gallery TEXT,
          streetview_url TEXT,
          list_price REAL,
          realistic_price REAL,
          sqft REAL,
          price_per_sqm REAL,
          nearest_tube_distance REAL,
          park_proximity REAL,
          commute_paternoster REAL,
          commute_canada_square REAL,
          is_value_buy INTEGER,
          epc TEXT,
          tenure TEXT,
          dom INTEGER,
          neg_strategy TEXT,
          alpha_score REAL,
          appreciation_potential REAL,
          links TEXT,
          metadata TEXT,
          floor_level TEXT,
          floorplan_url TEXT,
          source TEXT,
          source_name TEXT,
          service_charge REAL,
          ground_rent REAL,
          lease_years_remaining REAL,
          vetted INTEGER DEFAULT 0,
          analyst_notes TEXT,
          price_reduction_amount REAL,
          price_reduction_percent REAL,
          days_since_reduction INTEGER,
          waitrose_distance REAL,
          whole_foods_distance REAL,
          wellness_hub_distance REAL,
          epc_improvement_potential TEXT,
          est_capex_requirement REAL,
          ltv_match_score REAL,
          appr_bear_5yr REAL,
          appr_base_5yr REAL,
          appr_bull_5yr REAL,
          appr_p10 REAL,
          appr_p50 REAL,
          appr_p90 REAL,
          rental_yield_gross REAL,
          rental_yield_net REAL,
          bedrooms INTEGER,
          archived INTEGER DEFAULT 0,
          archive_reason TEXT,
          market_status TEXT DEFAULT 'unknown' CHECK(market_status IN ('active','under_offer','sold_stc','sold_completed','withdrawn','unknown')),
          last_checked TEXT,
          pipeline_status TEXT DEFAULT 'discovered' CHECK(pipeline_status IN ('discovered','shortlisted','vetted','watchlist','archived')),
          bathrooms INTEGER,
          council_tax_band TEXT,
          source_id TEXT
        )
      `);
      db.exec(`INSERT INTO properties_new SELECT * FROM properties`);
      db.exec(`DROP TABLE properties`);
      db.exec(`ALTER TABLE properties_new RENAME TO properties`);
      db.pragma('foreign_keys = ON'); // Re-enable FK checks after migration
      console.log('DE-231: pipeline_status CHECK constraint migrated successfully');
    }
  } catch (e) {
    console.error('DE-231: Failed to migrate pipeline_status CHECK constraint:', e.message);
  }

  // 3. global_context table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS global_context (
      key TEXT PRIMARY KEY,
      data TEXT,
      updated_at TEXT
    )
  `).run();

  // Ensure updated_at column exists in existing DB (schema drift guard)
  const gcCols = db.prepare("PRAGMA table_info(global_context)").all().map(c => c.name);
  if (!gcCols.includes('updated_at')) {
    console.log('Migrating global_context: adding updated_at column');
    db.prepare("ALTER TABLE global_context ADD COLUMN updated_at TEXT").run();
  }

  // 4. manual_queue table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS manual_queue (
      id TEXT PRIMARY KEY,
      url TEXT,
      source TEXT,
      raw_data TEXT,
      status TEXT,
      queued_at TEXT,
      processed_at TEXT,
      notes TEXT
    )
  `).run();

  // 5. snapshots table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS snapshots (
      filename TEXT PRIMARY KEY,
      data TEXT,
      created_at TEXT
    )
  `).run();

  // 6. price_history table (DAT-140)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT,
      price REAL,
      date TEXT,
      FOREIGN KEY(property_id) REFERENCES properties(id)
    )
  `).run();

  // 7. archived_properties table (Historical — pre-2026-04-01)
  // NOTE: No longer written to. Retained for historical record. The server init's
  // idempotent restore ensures records are NOT re-inserted on restart (NOT EXISTS guard).
  db.prepare(`
    CREATE TABLE IF NOT EXISTS archived_properties (
      id TEXT PRIMARY KEY,
      address TEXT,
      area TEXT,
      image_url TEXT,
      gallery TEXT,
      streetview_url TEXT,
      list_price REAL,
      realistic_price REAL,
      sqft REAL,
      price_per_sqm REAL,
      nearest_tube_distance REAL,
      park_proximity REAL,
      commute_paternoster REAL,
      commute_canada_square REAL,
      is_value_buy INTEGER,
      epc TEXT,
      tenure TEXT,
      dom INTEGER,
      neg_strategy TEXT,
      alpha_score REAL,
      appreciation_potential REAL,
      links TEXT,
      metadata TEXT,
      floor_level TEXT,
      floorplan_url TEXT,
      source TEXT,
      source_name TEXT,
      service_charge REAL,
      ground_rent REAL,
      lease_years_remaining REAL,
      vetted INTEGER DEFAULT 0,
      analyst_notes TEXT,
      price_reduction_amount REAL,
      price_reduction_percent REAL,
      days_since_reduction INTEGER,
      epc_improvement_potential TEXT,
      est_capex_requirement REAL,
      waitrose_distance REAL,
      whole_foods_distance REAL,
      wellness_hub_distance REAL,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archive_reason TEXT
    )
  `).run();

  // 8. DE-120: regional_velocity analytical view
  // Calculates Listings vs. Sales intensity per area to determine Buyer's/Seller's Market
  // Note: JOIN excludes archive_reason='Needs Enrichment' — those are pre-enrichment
  // duplicates, not genuinely sold transactions. Only properly archived (sold) records count.
  // IMPORTANT: Must DROP before CREATE to ensure schema changes propagate on restart.
  db.exec('DROP VIEW IF EXISTS regional_velocity');
  db.prepare(`
    CREATE VIEW IF NOT EXISTS regional_velocity AS
    SELECT
      COALESCE(p.area, 'Unknown') AS area,
      COUNT(DISTINCT p.id) AS active_listings,
      COUNT(DISTINCT a.id) AS sold_count,
      COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id) AS total_transactions,
      ROUND(
        CAST(COUNT(DISTINCT p.id) AS REAL) /
        NULLIF(COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id), 0),
        4
      ) AS supply_ratio,
      -- supply_ratio > 0.65: Buyer's Market (high supply = buyer leverage)
      -- supply_ratio < 0.35: Seller's Market (tight supply = seller leverage)
      CASE
        WHEN ROUND(
          CAST(COUNT(DISTINCT p.id) AS REAL) /
          NULLIF(COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id), 0),
          4
        ) >= 0.65 THEN 'Buyer''s Market'
        WHEN ROUND(
          CAST(COUNT(DISTINCT p.id) AS REAL) /
          NULLIF(COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id), 0),
          4
        ) <= 0.35 THEN 'Seller''s Market'
        ELSE 'Neutral'
      END AS market_signal,
      -- Days-on-market avg as a secondary velocity signal
      ROUND(AVG(CAST(p.dom AS REAL)), 1) AS avg_dom,
      -- Average alpha score as quality signal for the area
      ROUND(AVG(CAST(p.alpha_score AS REAL)), 2) AS avg_alpha_score
    FROM properties p
    LEFT JOIN archived_properties a ON a.area = p.area
      AND a.archive_reason NOT LIKE '%Needs Enrichment%'
    GROUP BY p.area
    UNION ALL
    SELECT
      'Market-Wide' AS area,
      COUNT(DISTINCT p.id) AS active_listings,
      COUNT(DISTINCT a.id) AS sold_count,
      COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id) AS total_transactions,
      ROUND(
        CAST(COUNT(DISTINCT p.id) AS REAL) /
        NULLIF(COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id), 0),
        4
      ) AS supply_ratio,
      CASE
        WHEN ROUND(
          CAST(COUNT(DISTINCT p.id) AS REAL) /
          NULLIF(COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id), 0),
          4
        ) >= 0.65 THEN 'Buyer''s Market'
        WHEN ROUND(
          CAST(COUNT(DISTINCT p.id) AS REAL) /
          NULLIF(COUNT(DISTINCT p.id) + COUNT(DISTINCT a.id), 0),
          4
        ) <= 0.35 THEN 'Seller''s Market'
        ELSE 'Neutral'
      END AS market_signal,
      ROUND(AVG(CAST(p.dom AS REAL)), 1) AS avg_dom,
      ROUND(AVG(CAST(p.alpha_score AS REAL)), 2) AS avg_alpha_score
    FROM properties p
    LEFT JOIN archived_properties a ON a.area IS NOT NULL
      AND a.archive_reason NOT LIKE '%Needs Enrichment%'
  `).run();

  // 9. DE-120: Performance index on price_history.property_id for fast lookups
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_history_property_id ON price_history(property_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date)`).run();

  // Policy (2026-04-01): NO record is ever deleted from properties.
  // Shallow/incomplete records are flagged with archived=1 + archive_reason
  // for Data Analyst enrichment. No auto-purge — analyst reviews flagged records.
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties(archived)`).run();

  // Restore archived_properties → properties idempotently (once-only on first run, no-op on restart).
  // Only restores records NOT already in properties to avoid resetting analyst-set flags.
  // IMPORTANT: Must include archived=1 flag to preserve enrichment-pending status.
  try {
    const restore = db.prepare(`
      INSERT INTO properties (
        id, address, area, image_url, gallery, streetview_url, floorplan_url,
        list_price, realistic_price, sqft, price_per_sqm,
        nearest_tube_distance, park_proximity, commute_paternoster,
        commute_canada_square, is_value_buy, epc, tenure,
        dom, neg_strategy, alpha_score, appreciation_potential,
        links, metadata, floor_level, source, source_name,
        service_charge, ground_rent, lease_years_remaining,
        vetted, analyst_notes,
        price_reduction_amount, price_reduction_percent, days_since_reduction,
        epc_improvement_potential, est_capex_requirement,
        waitrose_distance, whole_foods_distance, wellness_hub_distance,
        archived, archive_reason
      )
      SELECT
        a.id, a.address, a.area, a.image_url, a.gallery, a.streetview_url, a.floorplan_url,
        a.list_price, a.realistic_price, a.sqft, a.price_per_sqm,
        a.nearest_tube_distance, a.park_proximity, a.commute_paternoster,
        a.commute_canada_square, a.is_value_buy, a.epc, a.tenure,
        a.dom, a.neg_strategy, a.alpha_score, a.appreciation_potential,
        a.links, a.metadata, a.floor_level, a.source, a.source_name,
        a.service_charge, a.ground_rent, a.lease_years_remaining,
        a.vetted, a.analyst_notes,
        a.price_reduction_amount, a.price_reduction_percent, a.days_since_reduction,
        a.epc_improvement_potential, a.est_capex_requirement,
        a.waitrose_distance, a.whole_foods_distance, a.wellness_hub_distance,
        1, a.archive_reason
      FROM archived_properties a
      WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.id = a.id)
    `);
    const info = restore.run();
    if (info.changes > 0) console.log(`Restored ${info.changes} archived records (idempotent — new only)`);
  } catch (e) {
    console.error('Restore from archived_properties failed:', e.message);
  }

  console.log('Database initialization complete.');
}

initializeDB();

function safeParse(val, defaultVal = []) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultVal;
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`${req.method} ${url.pathname}`);

  try {
    // 1. Properties
    if (url.pathname === '/api/properties' && req.method === 'GET') {
      const area = url.searchParams.get('area');
      const isValueBuy = url.searchParams.get('is_value_buy');
      const vetted = url.searchParams.get('vetted');
      // DE-241: Increased default limit from 100 to 300 to ensure all properties are returned.
      // With LIMIT 100, ASC/DESC sorts returned different property sets (properties with alpha scores
      // in different ranges fell outside the 100-row window). At 222 total properties, limit=300
      // guarantees full coverage regardless of sort direction.
      const limit = parseInt(url.searchParams.get('limit') || '300');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const sortBy = url.searchParams.get('sortBy') || 'alpha_score';
      const sortOrder = url.searchParams.get('sortOrder') || 'DESC';

      let sql = 'SELECT * FROM properties WHERE 1=1';
      const params = [];

      // Default: show active records only (archived=0)
      // Pass ?archived=true to include flagged/enrichment-pending records
      const showArchived = url.searchParams.get('archived') === 'true';
      if (!showArchived) {
        sql += ' AND (archived IS NULL OR archived = 0)';
      }

      if (area && area !== 'All Areas') {
        sql += ' AND area LIKE ?';
        params.push(`%${area}%`);
      }

      if (isValueBuy === 'true') {
        sql += ' AND is_value_buy = 1';
      }

      if (vetted === 'true') {
        sql += ' AND vetted = 1';
      }

      const validSortColumns = ['alpha_score', 'list_price', 'realistic_price', 'price_per_sqm', 'dom', 'appreciation_potential', 'pipeline_status'];
      // DE-231: property_rank removed — sortBy 'user_priority' now falls back to default sort
      let finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'alpha_score';
      const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      // DE-241: When sorting by alpha_score ASC, NULL values should sort last (not first).
      // SQLite doesn't support NULLS LAST directly, so use a CASE expression to push NULLs to end.
      const orderByClause = finalSortBy === 'alpha_score' && finalSortOrder === 'ASC'
        ? `CASE WHEN alpha_score IS NULL THEN 1 ELSE 0 END, alpha_score ASC`
        : `${finalSortBy} ${finalSortOrder}`;

      sql += ` ORDER BY ${orderByClause} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const rows = db.prepare(sql).all(...params);
      // Also fetch price_history for all returned property IDs in one query
      const ids = rows.map(r => r.id);
      const priceHistoryMap = {};
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const phRows = db.prepare(
          `SELECT property_id, date, price, price_per_sqm, status, reduction_pct, days_on_market, london_hpi, source
           FROM price_history WHERE property_id IN (${placeholders}) ORDER BY date ASC`
        ).all(...ids);
        for (const h of phRows) {
          if (!priceHistoryMap[h.property_id]) priceHistoryMap[h.property_id] = [];
          priceHistoryMap[h.property_id].push(h);
        }
      }
      const results = rows.map(row => {
        const base = {
          ...row,
          gallery: safeParse(row.gallery, []),
          links: safeParse(row.links, []),
          metadata: safeParse(row.metadata, {}),
          is_value_buy: Boolean(row.is_value_buy),
          vetted: Boolean(row.vetted),
          archived: Boolean(row.archived),
          price_history: priceHistoryMap[row.id] ?? []
        };
        // BUG-005: Rewrite local image_url (data/images/) to server endpoint path
        if (base.image_url && base.image_url.startsWith('data/')) {
          // e.g. "data/images/{property_id}/{filename}" → "/api/images/{property_id}/{filename}"
          base.image_url = '/' + base.image_url;
        }
        // Also rewrite gallery items that are local paths
        if (Array.isArray(base.gallery)) {
          base.gallery = base.gallery.map(g =>
            (typeof g === 'string' && g.startsWith('data/')) ? '/' + g : g
          );
        }
        return base;
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    }
    // 1.5. Single Property Detail (DAT-140)
    // NOTE: must come after POST /api/properties/:id/check — route more specific first
    // 1.5a. POST /api/properties/:id/check — DE-165: re-check a property, update last_checked
    else if (url.pathname.match(/^\/api\/properties\/[^/]+\/check$/) && req.method === 'POST') {
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 2]; // /api/properties/{id}/check
      const today = new Date().toISOString().split('T')[0];
      const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
      if (!existing) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Property not found' }));
      } else {
        // Update last_checked to today; market_status unchanged (set by analyst/pipeline)
        db.prepare('UPDATE properties SET last_checked = ? WHERE id = ?').run(today, id);
        const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
        const history = db.prepare('SELECT date, price, price_per_sqm, status, reduction_pct, days_on_market, london_hpi, source FROM price_history WHERE property_id = ? ORDER BY date ASC').all(id);
        const result = {
          ...updated,
          gallery: safeParse(updated.gallery, []),
          links: safeParse(updated.links, []),
          metadata: safeParse(updated.metadata, {}),
          is_value_buy: Boolean(updated.is_value_buy),
          vetted: Boolean(updated.vetted),
          archived: Boolean(updated.archived),
          price_history: history,
          _check: { checked_at: today, property_id: id }
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }
    }
    // FE-186: PATCH /api/properties/:id/status — persist pipeline_status to SQLite
    // DE-231: Valid values: discovered | shortlisted | vetted | watchlist | archived
    else if (url.pathname.match(/^\/api\/properties\/[^/]+\/status$/) && req.method === 'PATCH') {
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 2]; // /api/properties/{id}/status
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const validStatuses = ['discovered', 'shortlisted', 'vetted', 'watchlist', 'archived']; // DE-231
          if (!data.pipeline_status || !validStatuses.includes(data.pipeline_status)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `pipeline_status must be one of: ${validStatuses.join('|')}` }));
            return;
          }
          const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
          if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Property not found' }));
            return;
          }
          db.prepare('UPDATE properties SET pipeline_status = ? WHERE id = ?').run(data.pipeline_status, id);
          const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
          const history = db.prepare('SELECT date, price, price_per_sqm, status, reduction_pct, days_on_market, london_hpi, source FROM price_history WHERE property_id = ? ORDER BY date ASC').all(id);
          const result = {
            ...updated,
            gallery: safeParse(updated.gallery, []),
            links: safeParse(updated.links, []),
            metadata: safeParse(updated.metadata, {}),
            is_value_buy: Boolean(updated.is_value_buy),
            vetted: Boolean(updated.vetted),
            archived: Boolean(updated.archived),
            price_history: history
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
        }
      });
    }
    // UX-034: PATCH /api/properties/:id/rank — DEPRECATED by DE-231
    // property_rank column has been dropped. This endpoint is retained but always returns 410 Gone.
    else if (url.pathname.match(/^\/api\/properties\/[^/]+\/rank$/) && req.method === 'PATCH') {
      res.writeHead(410, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'property_rank is deprecated (DE-231). The column has been removed from the schema.',
        hint: 'Use pipeline_status to manage property progression: discovered → shortlisted → vetted → watchlist → archived'
      }));
    }
    // FE-233: PATCH /api/properties/:id — partial field update for manual data editing
    // Only allows listed fields to be updated. archive_reason, archived, pipeline_status
    // are protected — analyst flags and pipeline decisions are never overwritten.
    else if (url.pathname.match(/^\/api\/properties\/[^/]+\/?$/) && req.method === 'PATCH') {
      const id = url.pathname.split('/').pop();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
          if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Property not found' }));
            return;
          }

          // Allowed fields — explicit whitelist.
          // image_url and floorplan_url are plain URL strings — user can correct bad scrapes.
          // Complex JSON fields (gallery, links, metadata) and analyst flags are protected.
          const allowed = [
            'address', 'area', 'list_price', 'realistic_price', 'sqft',
            'price_per_sqm', 'nearest_tube_distance', 'park_proximity',
            'commute_paternoster', 'commute_canada_square', 'epc', 'tenure',
            'service_charge', 'ground_rent', 'lease_years_remaining',
            'dom', 'neg_strategy', 'alpha_score', 'appreciation_potential',
            'floor_level', 'source', 'source_name', 'analyst_notes',
            'epc_improvement_potential', 'est_capex_requirement',
            'waitrose_distance', 'whole_foods_distance', 'wellness_hub_distance',
            'price_reduction_amount', 'price_reduction_percent', 'days_since_reduction',
            'market_status', 'last_checked',
            'image_url', 'floorplan_url', 'streetview_url', 'links',
            'bedrooms', 'bathrooms', 'council_tax_band'
          ];

          const protected_ = ['archived', 'archive_reason', 'pipeline_status',
                               'vetted', 'metadata', 'gallery']; // DE-231: property_rank removed
          // BUG-002 fix: image_url, floorplan_url, and links are plain URL / URL-struct fields
          // that users should be able to correct. gallery is a complex multi-image JSON array —
          // keep protected. Analyst flags always remain protected.
          const attemptedProtected = protected_.filter(f => f in data);
          if (attemptedProtected.length > 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Protected fields cannot be updated via this endpoint',
              attempted_protected_fields: attemptedProtected,
              hint: 'Use /api/properties/{id}/status for pipeline_status. Note: property_rank is deprecated (DE-231).'
            }));
            return;
          }

          const updates = [];
          const params = [];
          for (const field of allowed) {
            if (field in data) {
              updates.push(`${field} = ?`);
              params.push(data[field]);
            }
          }

          if (updates.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No allowed fields provided' }));
            return;
          }

          // Append last_checked to now
          updates.push('last_checked = ?');
          params.push(new Date().toISOString().split('T')[0]);
          params.push(id);

          db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...params);
          const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
          const history = db.prepare('SELECT date, price, price_per_sqm, status, reduction_pct, days_on_market, london_hpi, source FROM price_history WHERE property_id = ? ORDER BY date ASC').all(id);
          const result = {
            ...updated,
            gallery: safeParse(updated.gallery, []),
            links: safeParse(updated.links, []),
            metadata: safeParse(updated.metadata, {}),
            is_value_buy: Boolean(updated.is_value_buy),
            vetted: Boolean(updated.vetted),
            archived: Boolean(updated.archived),
            price_history: history
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
        }
      });
    }
    else if (url.pathname.startsWith('/api/properties/') && req.method === 'GET') {
      const id = url.pathname.split('/').pop();
      const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
      
      if (!property) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Property not found' }));
      } else {
        const history = db.prepare('SELECT date, price, price_per_sqm, status, reduction_pct, days_on_market, london_hpi, source FROM price_history WHERE property_id = ? ORDER BY date ASC').all(id);
        const result = {
          ...property,
          gallery: safeParse(property.gallery, []),
          links: safeParse(property.links, []),
          metadata: safeParse(property.metadata, {}),
          is_value_buy: Boolean(property.is_value_buy),
          vetted: Boolean(property.vetted),
          archived: Boolean(property.archived),
          price_history: history
        };
        // BUG-005: Rewrite local image_url and gallery to server endpoint paths
        if (result.image_url && result.image_url.startsWith('data/')) {
          result.image_url = '/' + result.image_url;
        }
        if (Array.isArray(result.gallery)) {
          result.gallery = result.gallery.map(g =>
            (typeof g === 'string' && g.startsWith('data/')) ? '/' + g : g
          );
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }
    }
    // 2. Macro — DE-162: enriched with freshness metadata
    else if (url.pathname === '/api/macro' && req.method === 'GET') {
      const row = db.prepare("SELECT data, updated_at FROM global_context WHERE key = 'macro_trend'").get();
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Macro data not found' }));
      } else {
        // Parse stored JSON and inject freshness envelope
        let payload;
        try {
          payload = JSON.parse(row.data);
        } catch (e) {
          payload = { _raw: row.data };
        }

        // Days since last refresh
        const lastRefresh = row.updated_at ? new Date(row.updated_at) : null;
        const now = new Date();
        const daysSince = lastRefresh ? Math.floor((now - lastRefresh) / (1000 * 60 * 60 * 24)) : null;

        // Freshness signal: green ≤3 days, amber 4-7 days, red >7 days
        let freshness = 'unknown';
        if (daysSince !== null) {
          if (daysSince <= 3) freshness = 'green';
          else if (daysSince <= 7) freshness = 'amber';
          else freshness = 'red';
        }

        // Next expected refresh: next Monday 09:00 UTC
        const nextMonday = new Date(now);
        nextMonday.setUTCDate(nextMonday.getUTCDate() + ((1 + 7 - nextMonday.getUTCDay()) % 7 || 7));
        nextMonday.setUTCHours(9, 0, 0, 0);
        if (nextMonday <= now) nextMonday.setDate(nextMonday.getDate() + 7);

        const enriched = {
          ...payload,
          _meta: {
            last_full_refresh: row.updated_at || null,
            days_since_refresh: daysSince,
            data_freshness: freshness,
            next_expected_refresh: nextMonday.toISOString().replace('.000Z', 'Z'),
            refreshed_by: 'server/index.js / GET /api/macro'
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(enriched));
      }
    }
    // 3. Financials
    else if (url.pathname === '/api/financials' && req.method === 'GET') {
      const row = db.prepare("SELECT data FROM global_context WHERE key = 'financial_context'").get();
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Financial data not found' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(row.data);
      }
    }
    // FE-254: Appreciation model — served from data file (not SQLite global_context)
    else if (url.pathname === '/api/appreciation' && req.method === 'GET') {
      // Read directly from data/appreciation_model.json (maintained by Data Analyst)
      const appreciationPath = path.join(DATA_DIR, 'appreciation_model.json');
      if (!fs.existsSync(appreciationPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Appreciation model not found' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(fs.readFileSync(appreciationPath, 'utf8'));
      }
    }
    // 4. London Metro
    else if (url.pathname === '/api/london-metro' && req.method === 'GET') {
      const row = db.prepare("SELECT data FROM global_context WHERE key = 'london_metro'").get();
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Metro data not found' }));
      } else {
        // Raw GeoJSON stored directly — send as-is with correct content type
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(row.data);
      }
    }
    // 4.5. DE-120: Regional Velocity (Buyer's Market intensity per area)
    else if (url.pathname === '/api/regional-velocity' && req.method === 'GET') {
      try {
        const rows = db.prepare('SELECT * FROM regional_velocity ORDER BY area ASC').all();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load regional velocity data: ' + e.message }));
      }
    }
    // DE-214: Unified /api/market-data endpoint — reads from SQLite, falls back to global_context
    // Unifies market_indicators, appreciation_model, financial_context, research_archives
    else if (url.pathname === '/api/market-data' && req.method === 'GET') {
      try {
        const marketData = {};

        // 1. Reconstruct macro from market_indicators table
        const indicators = db.prepare('SELECT indicator_key, sub_key, date, value, source, source_url, methodology, raw_json FROM market_indicators ORDER BY indicator_key, date').all();
        for (const row of indicators) {
          if (!marketData[row.indicator_key]) marketData[row.indicator_key] = {};
          if (row.raw_json) {
            // Store as raw JSON object for complex indicators
            try { marketData[row.indicator_key] = JSON.parse(row.raw_json); } catch { /* skip */ }
          } else if (row.sub_key) {
            // Time-series with sub_key (area, etc.)
            if (!marketData[row.indicator_key].data) marketData[row.indicator_key].data = [];
            if (row.date !== null) {
              marketData[row.indicator_key].data.push({ date: row.date, value: row.value, area: row.sub_key });
            }
          } else if (row.date === null && row.value !== null) {
            // Scalar indicator
            marketData[row.indicator_key] = { value: row.value, source: row.source, source_url: row.source_url, methodology: row.methodology };
          }
        }

        // 2. Reconstruct appreciation_model
        const appreciationRows = db.prepare('SELECT area, metric_key, value, label, scenario, probability, trigger_condition FROM appreciation_model').all();
        const appreciation = { scenario_definitions: {}, property_adjustments: {}, postcode_volatility: {}, rental_yield_estimates: {}, boe_rate_path_fan: { scenarios: [] } };
        for (const row of appreciationRows) {
          if (row.metric_key.startsWith('scenario_')) {
            const scen = row.metric_key.replace('scenario_', '');
            if (!appreciation.scenario_definitions[scen]) appreciation.scenario_definitions[scen] = {};
            appreciation.scenario_definitions[scen][row.metric_key.replace(`scenario_${scen}_`, '')] = row.value;
            if (row.probability !== null) appreciation.scenario_definitions[scen].probability = row.probability;
            if (row.trigger_condition) appreciation.scenario_definitions[scen].trigger = row.trigger_condition;
          } else if (row.metric_key.startsWith('adjustment_')) {
            const parts = row.metric_key.split('_');
            const adjType = parts[1];
            if (!appreciation.property_adjustments[adjType]) appreciation.property_adjustments[adjType] = {};
            appreciation.property_adjustments[adjType][row.metric_key.replace(`adjustment_${adjType}_`, '')] = row.value;
          } else if (row.metric_key.startsWith('volatility_') && row.area) {
            if (!appreciation.postcode_volatility[row.area]) appreciation.postcode_volatility[row.area] = {};
            appreciation.postcode_volatility[row.area][row.metric_key.replace('volatility_', '')] = row.value;
          } else if (row.metric_key.startsWith('rental_yield_') && row.area) {
            if (!appreciation.rental_yield_estimates[row.area]) appreciation.rental_yield_estimates[row.area] = {};
            appreciation.rental_yield_estimates[row.area][row.metric_key.replace('rental_yield_', '')] = row.value;
          } else if (row.metric_key.startsWith('boe_rate_path_') && row.area) {
            const scenario = row.metric_key.replace('boe_rate_path_', '');
            const existing = appreciation.boe_rate_path_fan.scenarios.find(s => s.q === row.area);
            if (existing) {
              existing[scenario] = row.value;
            } else {
              appreciation.boe_rate_path_fan.scenarios.push({ q: row.area, [scenario]: row.value });
            }
          } else if (row.metric_key.startsWith('appreciation_') && row.area === null) {
            appreciation[row.metric_key.replace('appreciation_', '')] = row.value;
          }
        }
        marketData.appreciation_model = appreciation;

        // 3. Reconstruct financial_context
        const finRows = db.prepare('SELECT metric_key, value, json_value, label, area FROM financial_context').all();
        const financialContext = {};
        for (const row of finRows) {
          if (row.json_value) {
            try { financialContext[row.metric_key] = JSON.parse(row.json_value); } catch { /* skip */ }
          } else if (row.value !== null) {
            financialContext[row.metric_key] = row.value;
          }
        }
        marketData.financial_context = financialContext;

        // 4. Market meta provenance
        const metaRows = db.prepare('SELECT key, value FROM market_meta ORDER BY key').all();
        for (const row of metaRows) {
          try { marketData[row.key] = JSON.parse(row.value); } catch { marketData[row.key] = row.value; }
        }

        // 5. Legacy fallback: if global_context.macro_trend still exists (pre-migration), inject it for compatibility
        const legacy = db.prepare("SELECT data FROM global_context WHERE key = 'macro_trend'").get();
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy.data);
            // Only use legacy for fields not yet in marketData (backward compat)
            for (const k of Object.keys(parsed)) {
              if (!marketData[k] && k !== 'appreciate') marketData[k] = parsed[k];
            }
          } catch { /* skip */ }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(marketData));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load market data: ' + e.message }));
      }
    }
    // 5. Inbox
    else if (url.pathname === '/api/inbox/batch' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body); // { action: 'approve' | 'reject', filenames: string[] }
          if (data.action && Array.isArray(data.filenames)) {
            const results = { success: [], failed: [] };
            const targetDir = data.action === 'approve' ? TRIAGED_DIR : ARCHIVE_INBOX_DIR;
            
            for (const filename of data.filenames) {
              const sourcePath = path.join(INBOX_DIR, filename);
              const targetPath = path.join(targetDir, filename);
              if (fs.existsSync(sourcePath)) {
                try {
                  fs.renameSync(sourcePath, targetPath);
                  results.success.push(filename);
                } catch (e) {
                  results.failed.push({ filename, error: e.message });
                }
              } else {
                results.failed.push({ filename, error: 'File not found' });
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Batch ${data.action} completed`, results }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing action or filenames array' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
    else if (url.pathname === '/api/inbox' && req.method === 'GET') {
      const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
      // Reconstruct portal URL from propertyId + portal when url field is absent.
      // rightmove: propertyId = "man-{agentId}-{listingId}" → rightmove.co.uk/property/{listingId}.html
      // zoopla:    no reliable listing-ID URL pattern without the full URL slug
      // jitty:     no reliable pattern — fall back to Google search by address
      const constructUrl = (item) => {
        if (item.url) return item.url;
        if (!item.propertyId || !item.portal) return null;
        if (item.portal === 'rightmove.co.uk') {
          const parts = item.propertyId.split('-');
          const listingId = parts[parts.length - 1]; // last segment = Rightmove listing ID
          return `https://www.rightmove.co.uk/property/${listingId}.html`;
        }
        if (item.portal === 'zoopla.co.uk') {
          // Zoopla uses non-predictable slug-based URLs — fall back to search
          return `https://www.zoopla.co.uk/search/?q=${encodeURIComponent(item.address || '')}`;
        }
        if (item.portal === 'jitty.com') {
          return `https://www.jitty.com/properties?q=${encodeURIComponent(item.address || '')}`;
        }
        return null;
      };
      const fileData = files.map(filename => {
        try {
          const content = fs.readFileSync(path.join(INBOX_DIR, filename), 'utf8');
          const parsed = JSON.parse(content);
          const url = constructUrl(parsed);
          return { ...parsed, filename, url };
        } catch (e) {
          return { filename, error: 'Malformed JSON' };
        }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fileData));
    }
    else if (url.pathname === '/api/inbox' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.action && data.filename) {
            const sourcePath = path.join(INBOX_DIR, data.filename);
            const targetDir = data.action === 'approve' ? TRIAGED_DIR : ARCHIVE_INBOX_DIR;
            const targetPath = path.join(targetDir, data.filename);
            if (fs.existsSync(sourcePath)) {
              fs.renameSync(sourcePath, targetPath);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: `Listing ${data.action}ed` }));
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Not found' }));
            }
          } else {
            // FE-214: Server-side URL dedup — check inbox files and manual_queue
            const submittedUrl = (data.url || '').trim().toLowerCase();
            if (submittedUrl) {
              // 1. Scan inbox files for existing URL
              const existingInbox = (() => {
                try {
                  const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
                  for (const file of files) {
                    try {
                      const content = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, file), 'utf8'));
                      const urls = [];
                      if (Array.isArray(content)) {
                        content.forEach(item => { if (item.url) urls.push(item.url); });
                      } else if (content.url) {
                        urls.push(content.url);
                      }
                      for (const u of urls) {
                        if ((u || '').trim().toLowerCase() === submittedUrl) {
                          return { source: 'inbox', filename: file };
                        }
                      }
                    } catch { /* skip malformed files */ }
                  }
                } catch { /* dir may not exist */ }
                return null;
              })();

              if (existingInbox) {
                res.writeHead(409, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'Duplicate URL',
                  duplicate_found: true,
                  existing: existingInbox,
                  hint: 'This URL already exists in your inbox. Remove the existing entry first or submit a different URL.'
                }));
                return;
              }

              // 2. Check manual_queue table
              try {
                const mqRows = db.prepare('SELECT id, url, source, status, queued_at FROM manual_queue WHERE LOWER(TRIM(url)) = ?').all(submittedUrl);
                if (mqRows.length > 0) {
                  res.writeHead(409, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    error: 'Duplicate URL',
                    duplicate_found: true,
                    existing: { source: 'manual_queue', entry: mqRows[0] },
                    hint: 'This URL is already in your manual queue. Check /api/manual-queue for the existing entry.'
                  }));
                  return;
                }
              } catch { /* table may not exist */ }
            }

            const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}_RAW.json`;
            fs.writeFileSync(path.join(INBOX_DIR, filename), JSON.stringify(data, null, 2));
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Saved' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
    // 6. Manual Queue
    else if (url.pathname === '/api/manual-queue' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const newItem = JSON.parse(body);
          const { url: itemUrl, source, ...rest } = newItem;
          const id = `q-${Math.random().toString(36).substr(2, 9)}`;
          db.prepare(
            'INSERT INTO manual_queue (id, url, source, raw_data, status, queued_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
          ).run(id, itemUrl, source || 'MANUAL', JSON.stringify(rest), 'Pending');
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Added to manual queue', id }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
    else if (url.pathname === '/api/manual-queue' && req.method === 'GET') {
      // Normalise legacy status values to canonical frontend labels
      const statusMap = {
        'completed': 'completed',
        'Completed': 'completed',
        'Closed': 'completed',
        'closed': 'completed',
        'failed': 'failed',
        'Failed': 'failed',
        'pending': 'pending',
        'Pending': 'pending',
        'processing': 'processing',
        'Processing': 'processing',
      };
      const rows = db.prepare('SELECT * FROM manual_queue ORDER BY queued_at DESC').all();
      const results = rows.map(row => ({
        ...row,
        status: statusMap[row.status] ?? 'pending',
        completed_at: row.processed_at ?? null, // alias for frontend compatibility
        raw_data: safeParse(row.raw_data, {}),
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    }
    // 7. Health check (infrastructure monitoring)
    else if (url.pathname === '/api/health' && req.method === 'GET') {
      try {
        const counts = {
          properties: db.prepare('SELECT COUNT(*) as n FROM properties').get().n,
          // DE-162 fix: count flagged records from properties.archived=1, not old archived_properties table
          archived: db.prepare('SELECT COUNT(*) as n FROM properties WHERE archived = 1').get().n,
          price_history: db.prepare('SELECT COUNT(*) as n FROM price_history').get().n,
          manual_queue: db.prepare("SELECT COUNT(*) as n FROM manual_queue WHERE LOWER(status) IN ('pending','processing')").get().n,
          // Historical reference: pre-migration archived_properties table (legacy, no longer written to)
          archived_properties_legacy: db.prepare('SELECT COUNT(*) as n FROM archived_properties').get().n,
        };
        const contextKeys = db.prepare("SELECT key, updated_at, LENGTH(data) as len FROM global_context").all();
        const dbSize = require('fs').statSync(DB_PATH).size;
        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          db: {
            path: DB_PATH,
            size_kb: Math.round(dbSize / 1024),
            journal_mode: db.pragma('journal_mode', { simple: true }),
            foreign_keys: db.pragma('foreign_keys', { simple: true }),
          },
          counts,
          context_freshness: contextKeys.reduce((acc, r) => {
            acc[r.key] = { updated_at: r.updated_at, bytes: r.len };
            return acc;
          }, {}),
          views: ['regional_velocity'],
          indexes: ['idx_price_history_property_id', 'idx_price_history_date']
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
      } catch (e) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: e.message }));
      }
    }
    // 6.5 DE-218: Enrichment Requests
    // GET /api/enrichment-requests — list all requests (filter by property_id, status)
    else if (url.pathname === '/api/enrichment-requests' && req.method === 'GET') {
      const propertyId = url.searchParams.get('property_id');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let sql = 'SELECT * FROM enrichment_requests WHERE 1=1';
      const params = [];
      if (propertyId) { sql += ' AND property_id = ?'; params.push(propertyId); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      try {
        const rows = db.prepare(sql).all(...params);
        const results = rows.map(row => ({
          ...row,
          result_data: safeParse(row.result_data, null)
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load enrichment requests: ' + e.message }));
      }
    }
    // POST /api/enrichment-requests — create a new enrichment request
    else if (url.pathname === '/api/enrichment-requests' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { property_id, request_type, field, value, notes, requested_by, priority } = data;

          if (!property_id || !request_type) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'property_id and request_type are required' }));
            return;
          }

          // Verify property exists
          const prop = db.prepare('SELECT id FROM properties WHERE id = ?').get(property_id);
          if (!prop) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Property not found: ' + property_id }));
            return;
          }

          const validTypes = ['sqft_verify', 'lease_verify', 'epc_lookup', 'price_confirm', 'tenure_confirm', 'general'];
          if (!validTypes.includes(request_type)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `request_type must be one of: ${validTypes.join('|')}` }));
            return;
          }

          const id = `er-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          const now = new Date().toISOString();
          const validPriorities = ['low', 'normal', 'high', 'urgent'];
          const p = validPriorities.includes(priority) ? priority : 'normal';

          db.prepare(`
            INSERT INTO enrichment_requests
              (id, property_id, request_type, field, value, notes, requested_by, priority, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
          `).run(id, property_id, request_type, field || null, value || null, notes || null,
                 requested_by || 'user', p, now, now);

          const created = db.prepare('SELECT * FROM enrichment_requests WHERE id = ?').get(id);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...created, result_data: null }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
        }
      });
    }
    // GET /api/enrichment-requests/:id — get single request
    else if (url.pathname.match(/^\/api\/enrichment-requests\/[^/]+$/) && req.method === 'GET') {
      const id = url.pathname.split('/').pop();
      const row = db.prepare('SELECT * FROM enrichment_requests WHERE id = ?').get(id);
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Enrichment request not found' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...row, result_data: safeParse(row.result_data, null) }));
      }
    }
    // PATCH /api/enrichment-requests/:id — update status / result_data
    else if (url.pathname.match(/^\/api\/enrichment-requests\/[^/]+$/) && req.method === 'PATCH') {
      const id = url.pathname.split('/').pop();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const existing = db.prepare('SELECT * FROM enrichment_requests WHERE id = ?').get(id);
          if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Enrichment request not found' }));
            return;
          }

          const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
          const updates = [];
          const params = [];

          if (data.status && validStatuses.includes(data.status)) {
            updates.push('status = ?');
            params.push(data.status);
            if (data.status === 'completed' || data.status === 'failed') {
              updates.push('processed_at = ?');
              params.push(new Date().toISOString());
            }
          }

          if (data.result_data !== undefined) {
            updates.push('result_data = ?');
            params.push(JSON.stringify(data.result_data));
          }

          if (data.notes !== undefined) {
            updates.push('notes = ?');
            params.push(data.notes);
          }

          updates.push('updated_at = ?');
          params.push(new Date().toISOString());
          params.push(id);

          db.prepare(`UPDATE enrichment_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
          const updated = db.prepare('SELECT * FROM enrichment_requests WHERE id = ?').get(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...updated, result_data: safeParse(updated.result_data, null) }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
        }
      });
    }
    // DELETE /api/enrichment-requests/:id — cancel a request
    else if (url.pathname.match(/^\/api\/enrichment-requests\/[^/]+$/) && req.method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      const existing = db.prepare('SELECT * FROM enrichment_requests WHERE id = ?').get(id);
      if (!existing) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Enrichment request not found' }));
      } else {
        db.prepare("UPDATE enrichment_requests SET status = 'cancelled', updated_at = ? WHERE id = ?")
          .run(new Date().toISOString(), id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, status: 'cancelled' }));
      }
    }
    // DE-226: Area-level price/sqft quartile data for PriceAssessment range bar
    // Fix: price_per_sqm column stores £/sqft × 10.764 — divide by 10.764 to get £/sqft
    else if (url.pathname === '/api/area-price-bands' && req.method === 'GET') {
      try {
        const rows = db.prepare(`
          SELECT area, price_per_sqm
          FROM properties
          WHERE (archived IS NULL OR archived = 0)
            AND sqft > 0
            AND price_per_sqm > 0
          ORDER BY area, price_per_sqm
        `).all();

        // Group by area, compute quartiles
        // price_per_sqm stored as true £/sqm — convert to £/sqft for display comparison
        const byArea = {};
        for (const r of rows) {
          if (!byArea[r.area]) byArea[r.area] = [];
          byArea[r.area].push((r.price_per_sqm ?? 0) * 10.764);
        }

        // Merge sub-areas into postcode-level bands
        // e.g. "Chelsea (SW3)", "Chelsea (SW3/SW10)", "Chelsea (SW10)" → "SW3" bucket
        const pcBuckets = {}; // pc -> { areas: [], allValues: [] }
        for (const [area, values] of Object.entries(byArea)) {
          const pcMatch = area.match(/(NW\d|N\d|EC\d|W\d{1,2}|SW\d)/);
          const pc = pcMatch ? pcMatch[1] : area;
          if (!pcBuckets[pc]) pcBuckets[pc] = { areas: [], allValues: [] };
          pcBuckets[pc].areas.push(area);
          pcBuckets[pc].allValues.push(...values);
        }

        const bands = {};
        for (const [pc, bucket] of Object.entries(pcBuckets)) {
          if (bucket.allValues.length < 4) continue;
          const sorted = [...bucket.allValues].sort((a, b) => a - b);
          const n = sorted.length;
          const q1 = sorted[Math.floor(n * 0.25)];
          const median = sorted[Math.floor(n * 0.50)];
          const q3 = sorted[Math.floor(n * 0.75)];
          bands[pc] = {
            areas: [...new Set(bucket.areas)],
            q1: Math.round(q1),
            median: Math.round(median),
            q3: Math.round(q3),
            n,
            last_refreshed: new Date().toISOString().split('T')[0],
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bands));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to compute area price bands: ' + e.message }));
      }
    }
    // DE-230: Serve lending_rules.json via API
    else if (url.pathname === '/api/lending-rules' && req.method === 'GET') {
      try {
        const row = db.prepare("SELECT data FROM global_context WHERE key = 'lending_rules'").get();
        if (row) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(row.data);
        } else {
          // Fallback: serve directly from file
          const filePath = path.join(DATA_DIR, 'sources/lending_rules.json');
          if (fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(fs.readFileSync(filePath, 'utf8'));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'lending_rules.json not found' }));
          }
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load lending rules: ' + e.message }));
      }
    }
    // BUG-005: Serve local images via /api/images/{property_id}/{filename}
    else if (url.pathname.startsWith('/api/images/') && req.method === 'GET') {
      const imagePath = url.pathname.slice('/api/images/'.length); // e.g. "man-0402-79113/0000_8bc17bcca7d934b3.jpg"
      const safePath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))/, '');
      const absolutePath = path.join(DATA_DIR, 'images', safePath);

      // Guard: ensure resolved path is still under DATA_DIR/images/
      if (!absolutePath.startsWith(path.join(DATA_DIR, 'images'))) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      if (!fs.existsSync(absolutePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image not found' }));
        return;
      }

      const ext = path.extname(absolutePath).toLowerCase();
      const contentTypes = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      fs.readFile(absolutePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
        res.end(data);
      });
    }
    // BUG-005 alt route: /api/data/images/* (Vite dev proxy target: /data/images/*)
    else if (url.pathname.startsWith('/api/data/images/') && req.method === 'GET') {
      const imagePath = url.pathname.slice('/api/data/images/'.length);
      const safePath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))/, '');
      const absolutePath = path.join(DATA_DIR, 'images', safePath);

      if (!absolutePath.startsWith(path.join(DATA_DIR, 'images'))) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
      if (!fs.existsSync(absolutePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image not found' }));
        return;
      }
      const ext = path.extname(absolutePath).toLowerCase();
      const contentTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      fs.readFile(absolutePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
        res.end(data);
      });
    }
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  } catch (err) {
    console.error('API Error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`propSearch Data API (SQLite) running at http://localhost:${PORT}`);
});
