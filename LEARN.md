# LEARN.md — Analyst Session Corrections Log
## Last updated: 2026-04-19

---

## Scripts / Data Bugs

### `datetime('now')` in better-sqlite3 prepared statements (CRITICAL)
**Discovered:** 2026-04-19  
**Applies to:** `scripts/capture_zoopla_images.js`  
**Symptom:** `SqliteError: no such column: "now"` when using `datetime('now')` with `.run()` parameter binding.

**Root cause:** better-sqlite3 treats `'?'' as an identifier, not a string literal. `datetime(?), 'now'` passes `now` as a bare identifier. The statement never errors on PREPARE (SQLite prepares it), only on RUN.

**Fix:** Use `datetime(?), 'now'` — pass `'now'` as a parameter value:
```javascript
// WRONG — causes SqliteError at runtime
db.prepare("... VALUES (?, datetime('now'), ?)").run(a, b);

// CORRECT
db.prepare("... VALUES (?, datetime(?), ?)").run(a, 'now', b);
```

**Scope:** Only `capture_zoopla_images.js` uses this pattern. All other scripts use direct datetime literals (no parameterization) and are unaffected.

---

### `capture_zoopla_images.js` propertyId UUID mismatch (CRITICAL)
**Discovered:** 2026-04-19  
**Symptom:** `SqliteError: FOREIGN KEY constraint failed` on every image insert.

**Root cause:** Script was using `propertyId = 'zo-' + zooplaId` for the DB foreign key, but imported properties use UUIDs (e.g., `b0e9c67e-...`). Files were saved to `data/images/zo-70438237/` but DB entries referenced non-existent `zo-70438237` property records.

**Fix:** Always pass the internal property UUID as the 2nd argument:
```bash
node scripts/capture_zoopla_images.js 70438237 b0e9c67e-668e68a0b2ba-31c0d3b7
```
Usage string updated: `node scripts/capture_zoopla_images.js <zoopla_id> [internal_property_id]`

**Effect:** b0e9c67e, a2b981dd, 01b5130d all had 0 images despite having `image_url` pointing to stale remote zoocdn URLs. Fixed by re-running capture with correct UUIDs.

---

## Enrichment Notes

### Zoopla detail page — beds/baths sourcing
- `numBeds` JSON field absent from server-rendered HTML (not available without JS)
- Fall back to `og:title` regex: `/(\d+)\s*bed/i`
- Bathrooms: extract from listing spec JSON embedded in HTML, fallback to listing spec text

### Alpha score recalculation — watchlist/shortlisted
- Recalculated all 17 watchlist/shortlisted properties 2026-04-19
- Formula: tenure (40%) + spatial (30%) + price_efficiency (30%)
- All scores recalculated using inline formula from `import_comparables.js`
- Area benchmarks: Belsize Park £12k/sqm, Islington £11k/sqm, others £10-10.5k/sqm

### Watchlist DOM update
- DOM recalculated from `price_history` for all watchlist/shortlisted properties
- 4 properties with null DOM fixed: man-0402-01805 (15d), man-0402-79113 (15d), ps-2cdf2f33 (74d), 35e20765... (7d)
- 3 properties still null DOM: zo-72878094, zo-72798843, zo-72936048 (no listing date in price_history)

### Bedroom corrections applied (2026-04-19)
- zo-72878094: baths 1→2 (listed as 2 bath)
- man-0402-79113: baths 1→2 (listed as 2 bath)
- 35e20765-5d38-46ae-90d4-ff00a06e024c: beds 1→2 (listing upgraded from 1-bed to 2-bed)

---

## FlareSolverr Notes

### Node `http` module — socket hang up
Node's built-in `http` module causes intermittent `socket hang up` errors when proxying through FlareSolverr. Use curl subprocess instead:
```bash
echo '{"cmd":"request.get","url":"...","maxTimeout":90000,"session":"..."}' > /tmp/fs_req.json
curl -s -X POST http://nas.home:8191/v1 -d @/tmp/fs_req.json
```

### Session naming
Use unique session names per campaign to avoid Cloudflare escalating against reused sessions.
