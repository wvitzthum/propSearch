const HTTP = require('http');
const HTTPS = require('https');
const FS = require('fs');
const PATH = require('path');
const CRYPTO = require('crypto');

const FLARESOLVR_URL = process.env.FLARESOLVR_URL || 'http://nas.home:8191';
const FLARESOLVR_SESSION = process.env.FLARESOLVR_SESSION || 'propSearch';
const TARGET_URL = 'https://www.zoopla.co.uk/for-sale/details/59131907/';
const PROPERTY_ID = '35e20765-5d38-46ae-90d4-ff00a06e024c';
const IMAGES_DIR = PATH.join(__dirname, '..', 'data', 'images');
const DB_PATH = PATH.join(__dirname, '..', 'data', 'propSearch.db');

function flaresolverrGet(targetUrl, cb) {
  var body = JSON.stringify({cmd:'request.get',url:targetUrl,maxTimeout:90000,session:FLARESOLVR_SESSION});
  var u = new URL(FLARESOLVR_URL);
  var opts = {hostname:u.hostname,port:u.port||8191,path:'/v1',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
  var req = HTTP.request(opts, function(res) {
    var data = '';
    res.on('data', function(c) { data += c; });
    res.on('end', function() {
      try { cb(JSON.parse(data).solution.response); }
      catch(e) { cb(null); }
    });
  });
  req.write(body); req.end();
}

function fetchBuffer(url, cb) {
  var lib = url.startsWith('https') ? HTTPS : HTTP;
  var req = lib.get(url, {timeout:15000}, function(res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      fetchBuffer(res.headers.location, cb);
      return;
    }
    if (res.statusCode !== 200) { cb(new Error('HTTP ' + res.statusCode)); return; }
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() { cb(null, Buffer.concat(chunks)); });
  });
  req.on('error', cb);
  req.on('timeout', function() { req.destroy(); cb(new Error('Timeout')); });
}

flaresolverrGet(TARGET_URL, function(html) {
  if (!html) { console.log('Failed to get HTML'); process.exit(1); }
  console.log('HTML length:', html.length);

  // Extract all lid.zoocdn.com URLs from HTML, deduplicate, prefer 1024/768
  var zoocdnMatches = html.match(/lid\.zoocdn\.com\/[^\s"]+/g) || [];
  var seen = {};
  var candidates = {};
  for (var i = 0; i < zoocdnMatches.length; i++) {
    var raw = zoocdnMatches[i].replace(/&amp;/g, '&');
    // Strip size suffix like :p 480w or just 480w
    var clean = raw.replace(/:\s*\d+w$/, '').replace(/\s+\d+w$/, '');
    // Remove any trailing junk
    clean = clean.replace(/[^a-z0-9/._-]$/, '');
    // Extract base hash (last path segment before extension)
    var hashMatch = clean.match(/\/([a-f0-9]{32,})\./);
    if (!hashMatch) continue;
    var hash = hashMatch[1];
    // Prefer 1024/768 resolution
    var isHiRes = clean.indexOf('/1024/') !== -1;
    if (!candidates[hash] || isHiRes) {
      var baseUrl = clean.split('/u/')[0] + '/u/' + clean.split('/u/')[1].split('/').slice(0,2).join('/') + '/' + hash + '.jpg';
      // Actually just use the full clean URL
      candidates[hash] = {url: 'https://' + clean, hiRes: isHiRes};
    }
  }

  var imgs = [];
  for (var h in candidates) imgs.push(candidates[h].url);
  // Deduplicate by URL
  var seen2 = {};
  var uniq = [];
  for (var j = 0; j < imgs.length; j++) {
    var u = imgs[j];
    if (!seen2[u]) { seen2[u] = true; uniq.push(u); }
  }
  imgs = uniq;

  console.log('Found', imgs.length, 'unique images');
  for (var k = 0; k < imgs.length; k++) {
    console.log(' [' + k + ']', imgs[k].slice(0, 100));
  }

  var Database = require('better-sqlite3');
  var db = new Database(DB_PATH);
  var propDir = PATH.join(IMAGES_DIR, PROPERTY_ID);
  if (!FS.existsSync(propDir)) FS.mkdirSync(propDir, {recursive: true});

  var captured = 0;
  var errors = 0;

  function downloadNext(idx) {
    if (idx >= imgs.length) {
      // Update DB
      var firstImg = db.prepare('SELECT file_path FROM images WHERE property_id = ? AND image_index = 0').get(PROPERTY_ID);
      if (firstImg) {
        db.prepare('UPDATE properties SET image_url = ? WHERE id = ?').run(firstImg.file_path, PROPERTY_ID);
        console.log('image_url =>', firstImg.file_path);
      }
      var allImages = db.prepare('SELECT file_path FROM images WHERE property_id = ? ORDER BY image_index').all(PROPERTY_ID);
      var gallery = JSON.stringify(allImages.map(function(r) { return r.file_path; }));
      db.prepare('UPDATE properties SET gallery = ? WHERE id = ?').run(gallery, PROPERTY_ID);
      console.log('gallery =>', allImages.length, 'images');
      db.close();
      console.log('Done - captured', captured, ', errors:', errors);
      return;
    }

    var url = imgs[idx];
    var hash = CRYPTO.createHash('sha256').update(url).digest('hex').substring(0, 16);
    var ext = '.jpg';
    var filename = String(idx).padStart(4, '0') + '_' + hash + ext;
    var filepath = PATH.join(propDir, filename);
    var relPath = 'data/images/' + PROPERTY_ID + '/' + filename;

    var existing = db.prepare('SELECT file_path FROM images WHERE property_id = ? AND image_index = ?').get(PROPERTY_ID, idx);
    var existingLocal = existing ? PATH.join(__dirname, '..', existing.file_path) : null;
    if (existing && existingLocal && FS.existsSync(existingLocal)) {
      console.log('  [SKIP] Already captured:', filename);
      downloadNext(idx + 1);
      return;
    }

    console.log('  Downloading [' + idx + ']:', url.slice(0, 90));
    fetchBuffer(url, function(err, buf) {
      if (err) {
        console.log('  FAIL:', err.message);
        errors++;
        downloadNext(idx + 1);
        return;
      }
      FS.writeFileSync(filepath, buf);
      db.prepare(
        "INSERT OR REPLACE INTO images (property_id, image_index, file_path, original_url, captured_at, file_size, mime_type) VALUES (?, ?, ?, ?, datetime('now'), ?, ?)"
      ).run(PROPERTY_ID, idx, relPath, url, buf.length, 'image/jpeg');
      console.log('  Saved:', filename, buf.length, 'bytes');
      captured++;
      setTimeout(function() { downloadNext(idx + 1); }, 400);
    });
  }

  downloadNext(0);
});
