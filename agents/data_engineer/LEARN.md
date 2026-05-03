# Learnings — agent-specific corrections

**Read on every launch.** Append new entries below when the user corrects you.
**Format:** `## YYYY-MM-DD` + `**Trigger:**` + `**Was:**` + `**Now:**` + `**Scope:**` + `**Status:**`
**Never delete.** Mark `Superseded` when a later correction replaces a rule.
**PO formalises** stable entries into PROTOCOLS/ or README.md.

> **Shared rules** (server ports, /tmp/, no-delete) are in `AGENTS.md` — not duplicated here.

---

## 2026-04-07

**Trigger:** User-initiated enrichment requests — users can now request property data refresh via frontend
**Was:** No formal queue; no server-side infrastructure for enrichment requests
**Now:** New `enrichment_requests` SQLite table + API endpoints per ADR-018. Tasks: DE-218 (server), FE-229 (UI), DAT-189 (analyst workflow)
**Scope:** Data Engineer — implement `enrichment_requests` table and REST endpoints per DECISIONS.md ADR-018
**Status:** Resolved (DE-218 Done) — table created, all endpoints live in server/index.js: GET/POST/PATCH/DELETE /api/enrichment-requests + GET /api/properties/:id/enrichment-request

---

## 2026-04-21

**Trigger:** DE-242 — LSOA ArcGIS service (`lsoa_london_refactored`) requires field name `LONG_` not `LONG`
**Was:** Script used `LONG` as field name in ArcGIS `outFields`, causing 400 error on that field and 0 features returned
**Now:** Use `LONG_` for longitude coordinate field in this service. Always verify actual field names via `?f=json` endpoint inspection before using.
**Scope:** `scripts/fetch_map_overlays.js` — arcgisPage() calls
**Status:** Active

---

## 2026-04-21

**Trigger:** DE-242 — ArcGIS server 400 error with `where=1%3D1` encoded
**Was:** URL-encoded `=` as `%3D` in `1=1` filter caused "Invalid query parameters" (while `2=2` worked)
**Now:** Use SQL-safe filter `LAD23CD IS NOT NULL` or `FID > 0` instead of numeric identity `1=1`/`2=2`
**Scope:** All ArcGIS FeatureServer queries in propSearch data scripts
**Status:** Active

---

## 2026-04-21

**Trigger:** DE-242 — Crime API (data.police.uk) returned 429 rate limit aggressively
**Was:** Default rate limit of 250ms between requests was too fast
**Now:** `await sleep(200)` between grid-point crime requests. Falls back to retry on 429.
**Scope:** `scripts/fetch_map_overlays.js` — fetchCrimeRates()
**Status:** Active

---

## 2026-05-03

**Trigger:** DE-245 — Two large LSOA GeoJSON files (~220MB each) exceeded GitHub's 100MB limit, blocking git push
**Was:** Raw .geojson files committed to git history; BFG Repo-Cleaner unavailable in this environment
**Now:** Solution via DE-244/DE-245: (1) Strip large files from git history via `git filter-branch --index-filter 'git rm --cached lsoa_choropleth_london.geojson lsoa_london.geojson' -- --all`. (2) Add raw files to .gitignore (`data/*.geojson`). (3) Commit only `.gz` versions (38MB compressed vs 220MB raw). (4) Server auto-decompresses on first boot via lazy decompress block. (5) `/api/static/` serves `.gz` directly with `Content-Encoding: gzip` when client accepts gzip.
**Scope:** `server/index.js` (lazy decompress + gz static serving), `.gitignore`, `data/` (gzipped overlay files)
**Status:** Active — on fresh clone, run `node server/index.js` first to decompress; then map layers load normally
