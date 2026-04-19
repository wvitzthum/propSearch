/**
 * capture_zoopla_images.js
 * =========================
 * Downloads all images for a Zoopla listing into data/images/{property_id}/.
 * Stores entries in the images table and updates properties.image_url + gallery.
 *
 * Usage:
 *   node scripts/capture_zoopla_images.js <zoopla_id> [session_name]
 *   node scripts/capture_zoopla_images.js 72947017
 *   node scripts/capture_zoopla_images.js 72841780 my_session
 *
 * Dependencies:
 *   - FlareSolverr at http://nas.home:8191 (or FLARESOLVR_URL env var)
 *   - better-sqlite3 (via node scripts/capture_zoopla_images.js)
 *   - Node.js built-in modules: http, https, fs, path, crypto
 *
 * Output:
 *   - Images saved to data/images/{zo-{id}}/0000_{hash}.jpg etc.
 *   - DB entries in images table
 *   - properties.image_url and properties.gallery updated
 *
 * Note: FlareSolverr must be healthy. Run `curl http://nas.home:8191/v1` to probe.
 */

const HTTP = require('http');
const HTTPS = require('https');
const FS = require('fs');
const PATH = require('path');
const CRYPTO = require('crypto');

const FLARESOLVR_URL = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const SESSION = process.argv[3] || 'ps_img_' + Date.now();
const IMAGES_DIR = PATH.join(__dirname, '..', 'data', 'images');
const DB_PATH = process.env.SQLITE_PATH || PATH.join(__dirname, '..', 'data', 'propSearch.db');

function flaresolverrGet(targetUrl, cb) {
  const body = JSON.stringify({ cmd: 'request.get', url: targetUrl, maxTimeout: 90000, session: SESSION });
  const u = new URL(FLARESOLVR_URL);
  const opts = {
    hostname: u.hostname,
    port: u.port || 8191,
    path: '/v1',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  const req = HTTP.request(opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try { cb(JSON.parse(data).solution.response); }
      catch (e) { cb(null); }
    });
  });
  req.on('error', e => cb(null));
  req.write(body);
  req.end();
}

function fetchBuffer(url, cb) {
  const lib = url.startsWith('https') ? HTTPS : HTTP;
  const req = lib.get(url, { timeout: 15000 }, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      fetchBuffer(res.headers.location, cb);
      return;
    }
    if (res.statusCode !== 200) { cb(new Error('HTTP ' + res.statusCode)); return; }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  });
  req.on('error', cb);
  req.on('timeout', () => { req.destroy(); cb(new Error('Timeout')); });
}

function extractImageUrls(html) {
  // Extract all lid.zoocdn.com URLs from the HTML
  const matches = html.match(/lid\.zoocdn\.com\/[^\s"]+/g) || [];
  const seen = {};
  const candidates = {};
  
  for (const raw of matches) {
    const clean = raw.replace(/&amp;/g, '&')
      .replace(/:\s*\d+w$/, '')
      .replace(/\s+\d+w$/, '')
      .replace(/[^a-z0-9/._-]$/, '');
    
    const hashMatch = clean.match(/\/([a-f0-9]{32,})\./);
    if (!hashMatch) continue;
    const hash = hashMatch[1];
    
    // Prefer 1024/768 resolution
    const isHiRes = clean.includes('/1024/') || clean.includes('/1280/') || clean.includes('/2200/');
    if (!candidates[hash] || isHiRes) {
      candidates[hash] = { url: 'https://' + clean, hiRes: isHiRes };
    }
  }
  
  const imgs = Object.values(candidates).map(c => c.url);
  
  // Deduplicate by URL
  const uniq = [];
  const seen2 = {};
  for (const u of imgs) {
    if (!seen2[u]) { seen2[u] = true; uniq.push(u); }
  }
  return uniq;
}

function main() {
  const zooplaId = process.argv[2];
  if (!zooplaId) {
    console.error('Usage: node scripts/capture_zoopla_images.js <zoopla_id> [internal_property_id]');
    console.error('Example: node scripts/capture_zoopla_images.js 72947017');
    console.error('         node scripts/capture_zoopla_images.js 72947017 35e20765-5d38-46ae-90d4-ff00a06e024c');
    process.exit(1);
  }

  // Second arg is the internal property UUID (e.g. from properties.id). Required.
  // If omitted, falls back to 'zo-{zooplaId}' for backward compatibility.
  const propertyId = process.argv[3] || (zooplaId.startsWith('zo-') ? zooplaId : 'zo-' + zooplaId);
  const targetUrl = `https://www.zoopla.co.uk/for-sale/details/${zooplaId.replace('zo-', '')}/`;
  
  console.error(`Fetching ${targetUrl} (session: ${SESSION})`);
  
  flaresolverrGet(targetUrl, function(html) {
    if (!html) { console.error('Failed to get HTML'); process.exit(1); }
    console.error('HTML length:', html.length);
    
    const imgs = extractImageUrls(html);
    console.error(`Found ${imgs.length} unique images`);
    
    if (imgs.length === 0) {
      console.error('No images found — listing may not have photos or page is blocked');
      process.exit(1);
    }
    
    for (const img of imgs) {
      console.error(' -', img.slice(0, 80));
    }
    
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    const propDir = PATH.join(IMAGES_DIR, propertyId);
    if (!FS.existsSync(propDir)) FS.mkdirSync(propDir, { recursive: true });
    
    let captured = 0, errors = 0;
    
    function downloadNext(idx) {
      if (idx >= imgs.length) {
        const firstImg = db.prepare('SELECT file_path FROM images WHERE property_id = ? AND image_index = 0').get(propertyId);
        if (firstImg) {
          db.prepare('UPDATE properties SET image_url = ? WHERE id = ?').run(firstImg.file_path, propertyId);
          console.error('image_url =>', firstImg.file_path);
        }
        const allImages = db.prepare('SELECT file_path FROM images WHERE property_id = ? ORDER BY image_index').all(propertyId);
        const gallery = JSON.stringify(allImages.map(r => r.file_path));
        db.prepare('UPDATE properties SET gallery = ? WHERE id = ?').run(gallery, propertyId);
        console.error('gallery =>', allImages.length, 'images');
        db.close();
        console.error(`Done — captured ${captured}, errors: ${errors}`);
        return;
      }
      
      const url = imgs[idx];
      const hash = CRYPTO.createHash('sha256').update(url).digest('hex').substring(0, 16);
      const ext = '.jpg';
      const filename = String(idx).padStart(4, '0') + '_' + hash + ext;
      const filepath = PATH.join(propDir, filename);
      const relPath = 'data/images/' + propertyId + '/' + filename;
      
      const existing = db.prepare('SELECT file_path FROM images WHERE property_id = ? AND image_index = ?').get(propertyId, idx);
      if (existing && FS.existsSync(PATH.join(__dirname, '..', existing.file_path))) {
        console.error('  [SKIP] Already captured:', filename);
        downloadNext(idx + 1);
        return;
      }
      
      console.error(`  [${idx}/${imgs.length}] Downloading: ${url.slice(0, 80)}`);
      fetchBuffer(url, (err, buf) => {
        if (err) {
          console.error('  FAIL:', err.message);
          errors++;
        } else {
          try {
            FS.writeFileSync(filepath, buf);
            db.prepare(
              "INSERT OR REPLACE INTO images (property_id, image_index, file_path, original_url, captured_at, file_size, mime_type) VALUES (?, ?, ?, ?, datetime(?), ?, ?)"
            ).run(propertyId, idx, relPath, url, 'now', buf.length, 'image/jpeg');
            console.error('  Saved:', filename, buf.length, 'bytes');
            captured++;
          } catch(dbErr) {
            console.error('  DB ERR at idx', idx, ':', dbErr.message, '|', dbErr.code);
            console.error('  Params:', JSON.stringify({pid: propertyId, idx, rel: relPath.slice(0,30), url: url.slice(0,30), sz: buf.length}));
            errors++;
          }
        }
        setTimeout(() => downloadNext(idx + 1), 400);
      });
    }
    
    downloadNext(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = { extractImageUrls, flaresolverrGet, fetchBuffer };
