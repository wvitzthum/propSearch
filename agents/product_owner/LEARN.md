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
