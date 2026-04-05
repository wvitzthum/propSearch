# Enrichment Request Queue Protocol
*Reference from: agents/data_analyst/README.md — section "Enrichment Request Queue (FE-207)"*

Updated: 2026-04-04

Users can explicitly request enrichment for specific properties. These requests are queued in the `enrichment_requests` table and must be picked up by the analyst.

## Workflow: Start of Every Analyst Session

Before processing inbox leads or running enrichment scripts, check the enrichment request queue:

```bash
# 1. Fetch all pending requests
curl http://localhost:3001/api/enrichment-requests?status=pending

# 2. For each request (work top-to-bottom, oldest first):
#    a. Mark as in_progress
curl -X PATCH http://localhost:3001/api/enrichment-requests/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

#    b. Fetch the data (see field-specific methods below)

#    c. Mark as completed with analyst_notes
curl -X PATCH http://localhost:3001/api/enrichment-requests/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "analyst_notes": "Fetched sqft from EPC register. Images scraped from agent direct listing."}'
```

## Field-Specific Enrichment Methods

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `images` / `gallery` | 1 | FlareSolverr on agent URL from `links`, then Rightmove/Zoopla | Look for `/1024/` or `/1280/` for high-res |
| `floorplan_url` | 1 | Same as images — check `floorplans` array in PAGE_MODEL | |
| `sqft` | 2 | EPC Register (mezh.org), agent listing | Cross-reference multiple sources |
| `bedrooms` | 2 | Agent listing, EPC register | |
| `epc` | 2 | EPC Register (mezh.org or epcregister.com) | Cannot fabricate — set `status: 'failed'` if unverifiable |
| `tenure` | 2 | Land Registry, agent listing | Look for "share of freehold" mentions |

## Rules

1. **Max 3 concurrent in-progress requests** — avoid overwhelming FlareSolverr / scraping infra
2. **Priority order** — work oldest-first (`created_at ASC`)
3. **Never fabricate data** — if unverifiable, set `status: 'failed'` with reason in `analyst_notes`
4. **Update the property in-place** — use `UPDATE properties SET ... WHERE id = ?` in SQLite
5. **Preserve existing data** — only overwrite if new data is verified and better
6. **Analyst notes are mandatory on completion** — document what was fetched and from where

## Conflict Detection

If a property already has a `pending` or `in_progress` enrichment request:
- Do not create a duplicate request
- The frontend will show "Enrichment already requested" to the user

## Enrichment Request vs. Manual Queue

| | Enrichment Request | Manual Queue |
|--|--|--|
| For | Existing property | New lead URL |
| Triggered by | User (frontend button) | Analyst or pipeline |
| Goal | Fill missing fields | Scrape and import new listing |
| Table | `enrichment_requests` | `manual_queue` |
