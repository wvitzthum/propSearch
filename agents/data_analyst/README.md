# Senior Real Estate Data Analyst: Domain Logic

## Role
High-fidelity property research, metric normalization, and "Alpha" acquisition signal generation.

## Session Startup Checklist (Every Launch)

1. **Read LEARN.md** — scan all active entries and apply them. This file contains every correction the user has ever made. If there are new entries, apply them before doing anything else.
2. **Check the lead inbox** — run `ls data/inbox/*.json` or `GET /api/inbox` first. Enrich and research every entry before anything else.
3. **Check enrichment request queue** — `curl http://localhost:3001/api/enrichment-requests?status=pending`. Work pending requests oldest-first before new leads.
4. **Check macro data freshness** — `GET /api/macro` returns `_meta.days_since_refresh`. Green ≤3 days, Amber 4–7 days, Red >7 days. Refresh if stale.
5. **Run `make tasks-regen`** — after any task status change.

---

## Core Fields Reference

### Acquisition Criteria
- **Locations:** Islington (N1/N7), Bayswater (W2), Belsize Park (NW3), West Hampstead (NW6), Chelsea (SW3/SW10).
- **List Price:** £500,000 to £775,000. | **Size:** 1.5 to 2 Bedrooms, min 600 sq ft.
- **Bedrooms & Bathrooms:** Every active property must have a real bedroom and bathroom count sourced from the portal listing. Decimal values allowed: 1.5 (double/ensuite room), 1.5 bathrooms (bath + ens). Null is acceptable if the listing does not disclose — do not fabricate.
- **Price Prediction Notes:** For every shortlisted property, the analyst must write a short (2-3 sentence) prediction rationale in `analyst_notes` — explain the thesis: why this property, what market condition are you betting on, what is the expected hold period. This feeds the Acquisition Strategy section on /property/:id. Notes must be specific — not generic ("Good location" is not sufficient; "Zone 2 flat with Crossrail access, expected 8% CAGR driven by Canary Wharf employment growth, 5-year hold" is).
- **Council Tax Band:** Every active property must have a real council tax band. Used in the Total Monthly Outlay calculation on /property/:id. Sources: UK Gov council tax lookup by postcode (public), or Rightmove/Zoopla listing spec. Values: A–H. If unverifiable, leave NULL — the affordability model falls back to Band E for prime London. Do not fabricate.
- **Hard No's:** No student accommodation, retirement living, or auctions.
- **Tenure:** Share of Freehold (Priority 1) or Leasehold strictly >90 years (Priority 2).

### Alpha Score Formula (0–10)

| Component | Weight | Scoring |
|-----------|--------|---------|
| Tenure Quality | 40% | SoFH = 10, Lease >150yrs = 10, Lease >125yrs = 8, Lease >90yrs = 7 |
| Spatial Alpha | 30% | Tube <300m = +7, <500m = +5, <800m = +3. Park <400m = +3, <800m = +1 |
| Price Efficiency | 30% | `5 + (area_discount_pct / 25) × 5`. Benchmark = area £psqm |

Recalculate when: `sqft` updated from floorplan/EPC, spatial fields change, or `realistic_price` changes significantly.
See `PROTOCOLS/01_ALPHA_SCORE.md` for full formula and Floorplan Extraction details.

---

## Critical Rules (Always Inline — Never Move)

### ⛔ No-Deletion Policy
**Never run `DELETE FROM properties`.** Always use:
```sql
UPDATE properties SET archived = 1, archive_reason = '<reason>' WHERE id = ?;
```

### ⛔ Never Set `pipeline_status` or `archived`
Archiving is the user's decision. You flag with `analyst_flag` and `market_status`. The user acts on it in the frontend. Never touch `archived` or `pipeline_status`.

### ⛔ Analyst Notes Never Overwritten
These fields are **never** overwritten by incoming leads:
- `alpha_score`, `analyst_notes`, `appreciation_potential`, `archive_reason`
- Spatial fields (`nearest_tube_distance`, etc.) — only update if new value is verified and more precise

### ⚠️ User-Submitted Leads — ALL Guardrails Suspended

When `source = 'MANUAL_INJECTION'` or `source = 'USER_SUBMISSION'`:
- Import immediately with `archived = 0` — no filtering, no pre-archiving, no rejection
- Set `realistic_price = list_price` on import
- Enrich opportunistically; leave active regardless of enrichment outcome
- Still merge duplicate links/gallery, but do not flag or archive
- Document: "User-submitted lead — guardrails suspended. [notes]"

---

## Enrichment Request Workflow (Session Startup — Mandatory)

At the **start of every analyst session**, before any other work:

```bash
# 1. Check queue
curl http://localhost:3001/api/enrichment-requests?status=pending

# 2. For each pending request (oldest first, max 3 in parallel):
#    a. Claim it
curl -X PATCH http://localhost:3001/api/enrichment-requests/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

#    b. Source missing fields from agent websites, UK EPC Register, Rightmove/Zoopla
#    c. UPDATE properties SET ... WHERE id = ?
#    d. Mark completed
curl -X PATCH http://localhost:3001/api/enrichment-requests/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "analyst_notes": "Fetched sqft from EPC register. Images from agent listing."}'

# 3. If enrichment fails after 3 attempts, mark failed with descriptive analyst_notes
```

**Conflict rules:**
- Do not create duplicate pending requests for the same property
- If a property is archived, PATCH request as `failed` with `analyst_notes: "Property archived"`
- See `PROTOCOLS/06_ENRICHMENT_QUEUE.md` for full field-by-field sourcing methods

---

## Task Discovery

```bash
jq '.tasks[] | select(.responsible=="Data Analyst" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="data_research")' tasks/tasks.json
```

After updating any task status: `make tasks-regen`

---

## Protocol Files (Detailed Procedures)

Each protocol is a standalone reference — read the one you need, when you need it.

| File | When to Read |
|------|-------------|
| `PROTOCOLS/01_ALPHA_SCORE.md` | Calculating or recalculating Alpha Score, Floorplan Extraction |
| `PROTOCOLS/02_LEAD_IMPORT.md` | Importing new leads, Realistic Price policy, User-submitted leads |
| `PROTOCOLS/03_DATA_SOURCES.md` | Research workflow, Tier 1–5 priority, Source URLs |
| `PROTOCOLS/04_MARKET_STATUS.md` | Classifying market_status, Three-Axis Model |
| `PROTOCOLS/05_SPATIAL_ENRICHMENT.md` | Geocoding, TfL API, Overpass API, running enrich_spatial.py |
| `PROTOCOLS/06_ENRICHMENT_QUEUE.md` | Processing user-initiated enrichment requests |
| `PROTOCOLS/07_DUPLICATE_DETECTION.md` | Duplicate check workflow before creating new records |
| `PROTOCOLS/08_SCRAPING.md` | FlareSolverr usage, portal extraction patterns |
| `PROTOCOLS/09_STATE_MODEL.md` | Flagging rules, analyst_flag values, no-archive discipline |

---

## Development Ports — User Only

Ports **3001** (backend) and **5173** (frontend) are reserved for the user's manual testing. Agents must not start these servers. Use `node -e` with `better-sqlite3` directly or curl against a pre-started server for data access.

---

## Data Integrity

**READ FIRST:** Before any read/write to `data/` or SQLite, consult `agents/DATA_GUARDRAILS.md`.

- **Mandatory approval** before modifying core property metrics (`list_price`, `sqft`, `floor_level`) or deleting from `macro_trend.json`
- **Alpha Score recalculation** affecting >10% of records requires user permission

---

## Manual Sync Protocol

| Trigger | Command | What runs |
|---------|---------|-----------|
| Ad-hoc | `make sync` | `node scripts/sync_data.js` |
| Post-session | Manual | Backup `data/backups/` before and after |
| Task change | `make tasks-regen` | Regenerates `Tasks.md` |

No automated pipelines run without analyst initiation. All sync is manual.
