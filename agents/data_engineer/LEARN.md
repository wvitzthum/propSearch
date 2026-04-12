# Learnings — user corrections made permanent

**Read on every launch.** Append new entries below when the user corrects you.
**Format:** `## YYYY-MM-DD` + `**Trigger:**` + `**Was:**` + `**Now:**` + `**Scope:**` + `**Status:**`
**Never delete.** Mark `Superseded` when a later correction replaces a rule.
**PO formalises** stable entries into PROTOCOLS/ or README.md.

---

## 2026-04-05

**Trigger:** Deposit shown in AffordabilityNode sidebar (£222K) didn't match user's configured fixed deposit (£75K)
**Was:** `getBudgetProfile` in useAffordability.ts always derived deposit from monthly budget, ignoring `depositMode` and `depositPct`
**Now:** `getBudgetProfile` checks `depositMode` first: fixed uses `depositPct`, auto uses budget derivation
**Scope:** `useAffordability.ts` — getBudgetProfile
**Status:** Active

---

## 2026-04-07

**Trigger:** User-initiated enrichment requests — users can now request property data refresh via frontend
**Was:** No formal queue; no server-side infrastructure for enrichment requests
**Now:** New `enrichment_requests` SQLite table + API endpoints per ADR-018. Tasks: DE-218 (server), FE-229 (UI), DAT-189 (analyst workflow)
**Scope:** Data Engineer — implement `enrichment_requests` table and REST endpoints per DECISIONS.md ADR-018
**Status:** Resolved (DE-218 Done) — table created, all endpoints live in server/index.js: GET/POST/PATCH/DELETE /api/enrichment-requests + GET /api/properties/:id/enrichment-request
