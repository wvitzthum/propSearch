# Image Local Storage Protocol
*Reference from: agents/data_analyst/README.md — section "Session Startup Checklist"*

## Overview

Property portal CDNs (notably Zoopla's `lid.zoocdn.com`) rotate image URLs frequently, causing saved URLs to 404 within days or weeks. **All scraped images must be downloaded and stored locally** at time of import/enrichment. The remote CDN URL alone is not sufficient.

## Storage Architecture

| Component | Detail |
|-----------|--------|
| Location | `data/images/{property_id}/{index:04d}_{url_hash}.{ext}` |
| DB table | `images(property_id, image_index, file_path, original_url, captured_at, file_size, mime_type)` |
| Idempotent | Re-running never re-downloads already-captured images |
| Hash | SHA256 of original URL (first 16 chars) — stable across re-runs |

**Image paths in `properties` table:**
- `image_url` → local path for primary image (e.g. `data/images/{id}/0000_abc123.jpg`)
- `gallery` → JSON array of local paths for all gallery images

## Run After Every Scrape / Import

```bash
# Normal run: download only newly discovered remote images
node scripts/capture_images.js

# Re-download failed ones (e.g. after property relists with new images)
node scripts/capture_images.js --force

# Preview what would run without downloading
node scripts/capture_images.js --dry-run
```

**Frequency:** Every analyst session that touches new or updated property links must end with running `capture_images.js`.

## Workflow: After Import / Enrichment

Every time images are scraped from a portal URL:

```
1. Lead imported or enriched → image_url/gallery contains remote CDN URLs
2. Run: node scripts/capture_images.js
3. Script:
   a. Detects remote URLs in image_url and gallery
   b. Downloads each to data/images/{property_id}/
   c. Records in images table with original_url for audit
   d. Updates properties.image_url and properties.gallery to local paths
4. Done — images now served from local store, CDN rotation harmless
```

## Gallery Cleanup (Post-Capture)

After capture, properties that had `image_url` migrated to local path but `gallery` still contains remote URLs get their gallery rebuilt from the `images` table automatically. No manual gallery update needed.

## Failure Handling

| Failure Type | Action |
|--------------|--------|
| HTTP 404 — listing removed | Mark as failed in images table; property keeps whatever local image was captured before failure |
| HTTP 404 — zoocdn URL rotated | Expected; images captured before rotation remain safe. Run `--force` if property relists. |
| Malformed URL (e.g. `:443` in path) | Fix in properties.gallery before re-running capture script |
| Timeout | Skipped; run again on next session |

## Schema: `images` table

```sql
CREATE TABLE IF NOT EXISTS images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id   TEXT    NOT NULL,
  image_index   INTEGER NOT NULL,          -- 0 = primary, 1+ = gallery
  file_path     TEXT    NOT NULL,          -- e.g. data/images/{id}/0000_hash.jpg
  original_url  TEXT    NOT NULL,          -- CDN URL at time of capture (audit trail)
  captured_at   TEXT    NOT NULL,          -- ISO date
  file_size     INTEGER,
  mime_type     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_prop_idx ON images(property_id, image_index);
```

## Performance Notes

- Rate limited to 2 requests/second (500ms sleep between properties)
- 89 properties × ~2 images each ≈ ~90 seconds full run
- ~134MB for 194 images at ~80KB average (varies by resolution)
- Zoopla zoocdn URLs are prioritised first (most volatile) then Rightmove

## No-Overwrite Discipline

- `file_path` and `original_url` are never overwritten for existing records
- `capture_images.js` uses `INSERT OR REPLACE` — only new `image_index` values replace null entries
- Existing local images are never re-fetched unless `--force` is explicitly passed
