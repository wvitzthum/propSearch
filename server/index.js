const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_DIR = path.join(__dirname, '../data');
const INBOX_DIR = path.join(DATA_DIR, 'inbox');
const TRIAGED_DIR = path.join(DATA_DIR, 'triaged');
const ARCHIVE_INBOX_DIR = path.join(DATA_DIR, 'archive/inbox');

// Ensure directories exist
[INBOX_DIR, TRIAGED_DIR, ARCHIVE_INBOX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 1. GET /api/properties -> Serve master.json
  if (url.pathname === '/api/properties' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'master.json'), res);
  }
  // 2. GET /api/macro -> Serve macro_trend.json
  else if (url.pathname === '/api/macro' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'macro_trend.json'), res);
  }
  // 3. GET /api/financials -> Serve financial_context.json
  else if (url.pathname === '/api/financials' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'financial_context.json'), res);
  }
  // 4. GET /api/inbox -> List inbox files with metadata
  else if (url.pathname === '/api/inbox' && req.method === 'GET') {
    fs.readdir(INBOX_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read inbox' }));
        return;
      }
      
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const fileData = jsonFiles.map(filename => {
        try {
          const content = fs.readFileSync(path.join(INBOX_DIR, filename), 'utf8');
          const data = JSON.parse(content);
          return { ...data, filename };
        } catch (e) {
          return { filename, error: 'Malformed JSON' };
        }
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fileData));
    });
  }
  // 5. POST /api/inbox -> Handle Triage Action (Approve/Reject) or Save New
  else if (url.pathname === '/api/inbox' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // CASE A: Triage Action from Frontend
        if (data.action && data.filename) {
          const sourcePath = path.join(INBOX_DIR, data.filename);
          const targetDir = data.action === 'approve' ? TRIAGED_DIR : ARCHIVE_INBOX_DIR;
          const targetPath = path.join(targetDir, data.filename);

          if (!fs.existsSync(sourcePath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Source file not found' }));
            return;
          }

          // Move the file
          fs.rename(sourcePath, targetPath, (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to move file' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Listing ${data.action}ed`, filename: data.filename }));
          });
        } 
        // CASE B: Save New Raw Listing from Scraper
        else {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${timestamp}_RAW_${data.source || 'UNKNOWN'}.json`;
          const filePath = path.join(INBOX_DIR, filename);

          fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) throw err;
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Saved to inbox', filename }));
          });
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
  // 6. POST /api/manual-queue -> Add to manual_queue.json
  else if (url.pathname === '/api/manual-queue' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const newItem = JSON.parse(body);
        const queuePath = path.join(DATA_DIR, 'manual_queue.json');
        
        let queue = [];
        if (fs.existsSync(queuePath)) {
          queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
        }
        
        queue.push({
          ...newItem,
          queued_at: new Date().toISOString()
        });

        fs.writeFile(queuePath, JSON.stringify(queue, null, 2), (err) => {
          if (err) throw err;
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Added to manual queue' }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

function serveJsonFile(filePath, res) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`immoSearch Data API running at http://localhost:${PORT}`);
});
