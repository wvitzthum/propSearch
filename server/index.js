const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = 3001;
const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'propSearch.db');
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
  db = new Database(DB_PATH, { verbose: console.log });
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
    { name: 'floorplan_url', type: 'TEXT' }
  ];

  for (const col of missingColumns) {
    if (!columnNames.includes(col.name)) {
      console.log(`Adding missing column: ${col.name}`);
      db.prepare(`ALTER TABLE properties ADD COLUMN ${col.name} ${col.type}`).run();
    }
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

  // 7. archived_properties table (Fidelity & History)
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
  `).run();

  // 9. DE-120: Performance index on price_history.property_id for fast lookups
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_history_property_id ON price_history(property_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date)`).run();

  // Policy (2026-04-01): NO record is ever deleted from properties.
  // Shallow/incomplete records are flagged with archived=1 + archive_reason
  // for Data Analyst enrichment. No auto-purge — analyst reviews flagged records.
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties(archived)`).run();

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      const limit = parseInt(url.searchParams.get('limit') || '100');
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

      const validSortColumns = ['alpha_score', 'list_price', 'realistic_price', 'price_per_sqm', 'dom', 'appreciation_potential'];
      const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'alpha_score';
      const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      sql += ` ORDER BY ${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const rows = db.prepare(sql).all(...params);
      const results = rows.map(row => ({
        ...row,
        gallery: safeParse(row.gallery, []),
        links: safeParse(row.links, []),
        metadata: safeParse(row.metadata, {}),
        is_value_buy: Boolean(row.is_value_buy),
        vetted: Boolean(row.vetted),
        archived: Boolean(row.archived)
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    }
    // 1.5. Single Property Detail (DAT-140)
    else if (url.pathname.startsWith('/api/properties/') && req.method === 'GET') {
      const id = url.pathname.split('/').pop();
      const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
      
      if (!property) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Property not found' }));
      } else {
        const history = db.prepare('SELECT price, date FROM price_history WHERE property_id = ? ORDER BY date ASC').all(id);
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }
    }
    // 2. Macro
    else if (url.pathname === '/api/macro' && req.method === 'GET') {
      const row = db.prepare("SELECT data FROM global_context WHERE key = 'macro_trend'").get();
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Macro data not found' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(row.data);
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
      const fileData = files.map(filename => {
        try {
          const content = fs.readFileSync(path.join(INBOX_DIR, filename), 'utf8');
          return { ...JSON.parse(content), filename };
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
      const rows = db.prepare('SELECT * FROM manual_queue ORDER BY queued_at DESC').all();
      const results = rows.map(row => ({
        ...row,
        raw_data: safeParse(row.raw_data, {})
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    }
    // 7. Health check (infrastructure monitoring)
    else if (url.pathname === '/api/health' && req.method === 'GET') {
      try {
        const counts = {
          properties: db.prepare('SELECT COUNT(*) as n FROM properties').get().n,
          archived: db.prepare('SELECT COUNT(*) as n FROM archived_properties').get().n,
          price_history: db.prepare('SELECT COUNT(*) as n FROM price_history').get().n,
          manual_queue: db.prepare('SELECT COUNT(*) as n FROM manual_queue WHERE status = ?').get('Pending').n,
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
