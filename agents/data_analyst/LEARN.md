# Learnings — user corrections made permanent

**Read on every launch.** Append new entries below when the user corrects you.
**Format:** `## YYYY-MM-DD` + `**Trigger:**` + `**Was:**` + `**Now:**` + `**Scope:**` + `**Status:**`
**Never delete.** Mark `Superseded` when a later correction replaces a rule.
**PO formalises** stable entries into PROTOCOLS/ or README.md.

---

## 2026-04-04

**Trigger:** Ports 3001 and 5173 are the user's own dev servers — agents must not start them
**Was:** Agent started `npm run dev` or `node server/index.js` during tasks
**Now:** Uses `node -e` with `better-sqlite3` or curls against a pre-started server. Never starts servers.
**Scope:** All agents
**Status:** Formalised — see PROTOCOLS/04_SESSION_STARTUP.md

---

## 2026-04-07

**Trigger:** User-initiated enrichment requests — users can now request property data refresh via frontend
**Was:** No formal queue; user had no way to flag incomplete properties for analyst attention
**Now:** User clicks "Request Enrichment" on any property with missing data. Request lands in `enrichment_requests` table. Analyst must check `GET /api/enrichment-requests?status=pending` at session start (README step 3). Requests are worked oldest-first, max 3 in parallel.
**Scope:** Data Analyst (workflow), Data Engineer (server endpoints), Frontend Engineer (UI modal)
**Status:** Active — tasks DE-218 (server), FE-229 (UI), DAT-189 (workflow) filed

---

## 2026-04-09

**Trigger:** Corinne Road, Tufnell Park N19 (gh-203a0d3b) — a terraced house flagged for user review
**Was:** Acquisition criteria listed "1.5 to 2 Bedrooms" with flat/maisonette implication
**Now:** Terraced houses are explicitly included in acquisition criteria alongside flats. Any 2-bed house in target zones is eligible. Do not flag houses for exclusion — they are welcomed.
**Scope:** All agents flagging/filtering properties
**Status:** Active

---

**Trigger:** Arundel Court, Jubilee Place SW3 (chelsea-mnryz319) — sqft=492 flagged as too small
**Was:** Listed as potential Chelsea acquisition
**Now:** User decision: SKIP. sqft=492 is below the 600 sqft minimum threshold. Additionally confirmed SOLD via Rightmove. Excluded from all acquisition consideration.
**Scope:** All agents reviewing this property
**Status:** Active

---

## 2026-04-11

**Trigger:** DAT-191 enrichment — FlareSolverr HTML extraction for bedroom/bathroom counts across 115 properties
**Was:** No systematic approach; different portal structures caused repeated extraction failures
**Now:** Verified extraction patterns for each portal:
  - **Rightmove detail pages:** `html.match(/"bedrooms":\s*(\d+)/)?.[1]` and `html.match(/"bathrooms":\s*(\d+)/)?.[1]` — present directly in HTML, not only in PAGE_MODEL
  - **Zoopla:** `clean.match(/"numBedrooms":\s*(\d+)/)` and `clean.match(/"numBathroom":\s*(\d+)/)` — JSON-embedded; council tax: `"Council tax band</p>...<p>D</p>"` (letter in next element)
  - **G&H:** `html.match(/(\d+)\s*bedroom/i)` and `html.match(/(\d+)\s*bathroom/i)`
  - **Purplebricks:** beds/baths often NOT in HTML; council tax in `data-bind="text: $data.value()">F</p>` pattern
  - **Chancellors:** blocked — no beds/baths/CT in HTML
  - **Rightmove councilTaxBand:** can be `"TBC"` — regex must filter: `/"councilTaxBand":\s*"([A-H])"/`
**Scope:** All future portal scraping
**Status:** Active

---

## 2026-04-11

**Trigger:** DAT-192 enrichment — council tax band lookup for 115 properties
**Was:** No council_tax_band data in DB; UK Gov /api/council-tax-by-postcode endpoint deprecated (returns 404)
**Now:** 73/115 populated (63%). Remaining blockers: Zoopla agent TBC, Rightmove TBC/sold, Purplebricks no HTML, agent-blocked (Chancellors, Ellis, KFH, Jitty), 2 no-link. Column added, PATCH whitelist updated.
**Scope:** DAT-192 ongoing
**Status:** In Progress

---

## 2026-04-11

**Trigger:** Barness Court enrichment — tenure correction and neg_strategy
**Was:** tenure="Share of Freehold", neg_strategy=null, bathrooms=2
**Now:** tenure="Leasehold" (171yr), bathrooms=1, neg_strategy set. Alpha 7.9 unchanged.
**Scope:** Barness Court record
**Status:** Active
