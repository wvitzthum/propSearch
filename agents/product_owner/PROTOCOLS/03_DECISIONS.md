# Architectural Decisions Reference
*Reference from: agents/product_owner/DECISIONS.md*

## Key Decisions (Summary)

| ID | Decision | Rationale |
|----|----------|-----------|
| ADR-001 | SQLite over DuckDB | Simpler deployment, WAL mode, better-sqlite3 performance |
| ADR-011 | Deprecate DuckDB | Inconsistency with primary store, maintenance overhead |
| ADR-012 | No Express | Simpler Node HTTP server for SQLite queries |
| ADR-014 | market_status taxonomy | Three-axis model: pipeline_status, analyst_flag, market_status |
| ADR-015 | @visx for all charts | airbnb/visx over Recharts — better DX, TypeScript, composability |
| ADR-016 | No automated sync | Manual sync only — analyst-initiated for data integrity |
| ADR-017 | Analyst sets market_status | Analyst owns market reality; user owns pipeline status |
| ADR-018 | Command Palette over sidebar quick-add | Better UX, keyboard shortcut (⌘K), extensible |
| ADR-019 | Archived flag over hard delete | User directive — no production data ever deleted |
| ADR-020 | No pre-archiving of user-submitted leads | User intent is authoritative — import as active |

## Full Decision Log
Always reference `agents/product_owner/DECISIONS.md` for the full context behind any architectural choice. When proposing a change, check if an existing ADR covers it — if so, either follow it or propose an amendment via the same PR process.
