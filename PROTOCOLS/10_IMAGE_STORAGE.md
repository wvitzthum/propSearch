# Protocol 10: Image Storage

## Overview
Property images are downloaded locally to `data/images/{property_id}/` and tracked in the `images` table. Zoopla `lid.zoocdn.com` CDN URLs are the highest priority — they rotate frequently and must be localised immediately after any scrape.

## Directory Structure
```
data/images/
  {property_id}/          ← one subdirectory per property
    0000_{hash}.jpg       ← zero-padded index + SHA256 hash of original URL
    0001_{hash}.jpg
    ...
```

## Database Schema
```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT NOT NULL REFERENCES properties(id),
  image_index INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  original_url TEXT NOT NULL,
  captured_at TEXT NOT NULL,  -- ISO datetime
  file_size INTEGER,
  mime_type TEXT,
  UNIQUE(property_id, image_index)
);
```

## Usage

### Zoopla images
```bash
# CRITICAL: Always pass the INTERNAL property UUID (from properties.id), NOT the zoopla ID
node scripts/capture_zoopla_images.js <zoopla_id> [internal_property_id]
node scripts/capture_zoopla_images.js 70438237 b0e9c67e-668e68a0b2ba-31c0d3b7
```

If the internal UUID is omitted, the script defaults to `zo-{zoopla_id}`, which does NOT match imported property IDs and causes `FOREIGN KEY constraint failed` errors on every insert.

### Rightmove images
```bash
node scripts/capture_images.js
```
Rightmove URLs in `properties.gallery` are already in the DB. The script downloads them, saves locally, and updates `image_url` and `gallery`.

## `datetime(?)` Bug in better-sqlite3

**Critical:** When using `datetime()` with parameterised queries in better-sqlite3, pass the value as a parameter — not inline:

```javascript
// WRONG — compiles, fails at runtime with SqliteError "no such column: now"
db.prepare("INSERT INTO images ... VALUES (?, datetime('now'), ?)").run(id, idx, size);

// CORRECT
db.prepare("INSERT INTO images ... VALUES (?, datetime(?), ?)").run(id, 'now', size);
```

better-sqlite3 treats `'now'` as a column identifier in the first form, not a string literal. The SQL parses fine but fails when `.run()` is called.

## Property `image_url` and `gallery`
After image capture:
- `properties.image_url` → path to `0000_{hash}.{ext}` (first image = hero)
- `properties.gallery` → JSON array of all `data/images/{property_id}/...` paths

## CDN Resilience
Zoopla zoocdn URLs rotate frequently. Any image URL stored in `properties.image_url` or `properties.gallery` as a remote `https://lid.zoocdn.com/...` URL will eventually break. The fix:
1. Run `node scripts/capture_zoopla_images.js <zoopla_id> <internal_id>` for every active listing
2. Set `properties.image_url = NULL` and `properties.gallery = NULL` for any property with stale remote URLs
3. Verify images table has entries for the property before assuming images are present
