#!/usr/bin/env node
/**
 * capture_images.js
 * Downloads and stores property images locally in data/images/
 * to protect against CDN URL rotation (esp. zoocdn).
 *
 * Usage: node scripts/capture_images.js [--dry-run] [--force]
 *   --dry-run  : show what would be downloaded without downloading
 *   --force    : re-download even if already captured
 *
 * Storage layout: data/images/{property_id}/{index:04d}_{hash}.{ext}
 * Hash = first 16 chars of SHA256 of original URL (stable across re-runs)
 *
 * Key features:
 * - Idempotent: re-running won't re-download already-captured images
 * - Remote URLs only: skips properties already pointing to local files
 * - Original URL preserved in DB for audit trail
 * - Image MIME types auto-detected
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const DB_PATH = path.join(__dirname, '..', 'data', 'propSearch.db');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
};

function urlToExt(url) {
  if (url.includes('.png')) return '.png';
  if (url.includes('.webp')) return '.webp';
  return '.jpg';
}

function isLocalPath(val) {
  return val && (val.startsWith('data/') || val.startsWith('/'));
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function capturePropertyImages(prop, db) {
  const urls = [];

  // Only process remote URLs (not already-local file paths)
  if (prop.image_url && !isLocalPath(prop.image_url)) {
    urls.push({ idx: 0, url: prop.image_url });
  }

  try {
    const gallery = JSON.parse(prop.gallery || '[]');
    gallery.forEach((url, i) => {
      if (url && !isLocalPath(url)) urls.push({ idx: i + 1, url });
    });
  } catch(e) {}

  if (urls.length === 0) return { captured: 0, failed: 0, skipped: 0 };

  const propDir = path.join(IMAGES_DIR, prop.id);
  let captured = 0, failed = 0, skipped = 0;

  for (const { idx, url } of urls) {
    const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
    const ext = urlToExt(url);
    const filename = String(idx).padStart(4, '0') + '_' + hash + ext;
    const filepath = path.join(propDir, filename);
    const relPath = 'data/images/' + prop.id + '/' + filename;

    // Check if already captured
    const existing = db.prepare(
      'SELECT file_path FROM images WHERE property_id = ? AND image_index = ?'
    ).get(prop.id, idx);

    if (existing && !FORCE) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log('  [DRY] Would download: ' + url.substring(0, 80));
      continue;
    }

    try {
      if (!fs.existsSync(propDir)) fs.mkdirSync(propDir, { recursive: true });
      const buf = await fetchBuffer(url);
      fs.writeFileSync(filepath, buf);
      captured++;

      db.prepare(`
        INSERT OR REPLACE INTO images (property_id, image_index, file_path, original_url, captured_at, file_size, mime_type)
        VALUES (?, ?, ?, ?, date('now'), ?, ?)
      `).run(prop.id, idx, relPath, url, buf.length, EXT_TO_MIME[ext] || 'image/jpeg');
    } catch(e) {
      console.log('  FAIL: ' + url.substring(0, 80) + ' — ' + e.message);
      failed++;
    }
  }
  return { captured, failed, skipped };
}

async function main() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);

  console.log('Image capture — Dry: ' + DRY_RUN + ', Force: ' + FORCE);
  console.log('Images dir: ' + IMAGES_DIR);

  const props = db.prepare(`
    SELECT id, address, image_url, gallery
    FROM properties
    WHERE archived = 0
      AND image_url IS NOT NULL
      AND image_url != ''
    ORDER BY
      CASE WHEN image_url LIKE '%zoocdn%' THEN 0 ELSE 1 END,
      id
  `).all();

  console.log('Properties to process: ' + props.length);
  let totalCap = 0, totalFail = 0, totalSkip = 0;

  for (const prop of props) {
    const result = await capturePropertyImages(prop, db);
    if (result.captured || result.failed) {
      console.log(prop.id + ': cap=' + result.captured + ' fail=' + result.failed + ' skip=' + result.skipped);
    }
    totalCap += result.captured;
    totalFail += result.failed;
    totalSkip += result.skipped;

    // Rate limit: max 2 per second
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nDone — captured: ' + totalCap + ', failed: ' + totalFail + ', skipped: ' + totalSkip);

  // Update image_url to local paths for any newly captured properties
  // Only update if image_url is still a remote URL (don't overwrite already-migrated)
  if (!DRY_RUN && totalCap > 0) {
    const updated = db.prepare(`
      UPDATE properties
      SET image_url = (
        SELECT file_path FROM images
        WHERE property_id = properties.id AND image_index = 0
        LIMIT 1
      )
      WHERE archived = 0
        AND image_url IS NOT NULL
        AND image_url != ''
        AND image_url NOT LIKE 'data/%'
        AND image_url NOT LIKE '/%'
        AND EXISTS (
          SELECT 1 FROM images
          WHERE property_id = properties.id AND image_index = 0
        )
    `).run();
    console.log('Updated image_url for ' + updated.changes + ' additional properties');
  }

  const stats = db.prepare('SELECT COUNT(*) as total, SUM(file_size) as bytes FROM images').get();
  console.log('Total images in store: ' + stats.total + ' (' + Math.round(stats.bytes/1024/1024*10)/10 + ' MB)');

  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
