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

// Initialize SQLite
const db = new Database(DB_PATH);

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
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const sortBy = url.searchParams.get('sortBy') || 'alpha_score';
      const sortOrder = url.searchParams.get('sortOrder') || 'DESC';

      let sql = 'SELECT * FROM properties WHERE 1=1';
      const params = [];
      if (area) {
        sql += ' AND area = ?';
        params.push(area);
      }

      const validSortColumns = ['alpha_score', 'list_price', 'price_per_sqm', 'dom', 'appreciation_potential'];
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
        vetted: Boolean(row.vetted)
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
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
        try {
          const parsed = JSON.parse(row.data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to parse metro data' }));
        }
      }
    }
    // 5. Inbox
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
