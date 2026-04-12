# Session Startup Protocol
*Formalised from: agents/product_owner/LEARN.md — 2026-04-04*

## Rule: Do Not Start Dev Servers on Ports 3001 and 5173

**Scope:** All agents (PO, Analyst, Data Engineer, Frontend Engineer, QA)

### Context

Ports 3001 (API server) and 5173 (Vite frontend dev server) are reserved for the user's own running development environment. The user starts these manually. Agents must never start, restart, or attempt to bind these ports — doing so causes port conflicts and disrupts the active session.

### Correct Approaches

**For data operations against the live server:**
```bash
# Use node -e with better-sqlite3 directly (no server needed)
node -e "
const db = require('better-sqlite3')('data/propSearch.db');
const rows = db.prepare('SELECT * FROM properties LIMIT 5').all();
console.log(JSON.stringify(rows, null, 2));
"

# Or curl against the pre-started server
curl -s http://localhost:3001/api/properties | jq '.'
```

**For scraping/enrichment tasks:**
```bash
# Use FlareSolverr or direct HTTP via scripts (not npm run dev / node server/index.js)
node scripts/scrape_rightmove.js
```

### Incorrect (Never Do)
```bash
# NEVER start the dev server during task execution
npm run dev                  # ❌
node server/index.js         # ❌
PORT=3001 node server/        # ❌
```

### Why This Matters

The propSearch system runs on the user's local machine alongside active development. The API server and frontend are stateful — restarting them loses in-memory state and interrupts the user's workflow.

### Enforcement

This rule is enforced by:
- LEARN.md entry (audit trail)
- PO formalisation into PROTOCOLS/04
- DATA_GUARDRAILS.md awareness

If a task genuinely requires starting a server (e.g., a background sync daemon), it must be on a **different port** and documented in DECISIONS.md before proceeding.

---

## Quarterly Review Cadence

The PO reviews all LEARN.md entries on a quarterly cycle:

| Quarter | Review Date | Formalisations |
|---------|-------------|----------------|
| Q1 2026 | 2026-04-04 | Rule: Dev server ports (PROTOCOLS/04) |
| Q2 2026 | 2026-07-04 | — scheduled |

Next review: **2026-07-04**

Add a recurring calendar reminder for the quarterly review.
