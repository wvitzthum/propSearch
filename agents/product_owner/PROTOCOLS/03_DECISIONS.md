# Architectural Decisions Reference
*Reference from: DECISIONS.md (root — single source of truth for all ADRs)*

## Key Decisions (Summary)

| ID | Decision | Rationale |
|----|----------|-----------|
| ADR-001 | Bloomberg + Linear aesthetic | High data density, dark mode, precision typography |
| ADR-002 | No-auth architecture | Private single-user tool; no login overhead |
| ADR-003 | Area expansion | SW3, SW10, NW1 in primary research scope |
| ADR-004 | Ownership cost modeling | Integrate BoE rates and property-specific running costs |
| ADR-005 | Comparative intelligence | Global comparison basket and analytics matrix |
| ADR-006 | Local API + SQLite inbox | Active listing capture with SQLite backend |
| ADR-007 | Strict ingestion enforcement | Schema validation and mandatory metric extraction |
| ADR-008 | DuckDB deprecated | JSONL master file + SQLite; DuckDB removed |
| ADR-009 | JSONL format mandate | Line-oriented format for token-efficient processing |
| ADR-010 | Role specialization | Analyst vs Data Engineer territory separation |
| ADR-011 | SQLite over DuckDB | WAL mode, better-sqlite3 performance, simpler deployment |
| ADR-012 | No Express | Simple Node HTTP server; no middleware ecosystem |
| ADR-013 | 5-page navigation | Dashboard/Properties/Map/Inbox/Comparison routing structure |
| ADR-014 | market_status taxonomy | Two-axis model: pipeline_status + market_status |
| ADR-015 | @visx for all charts | Airbnb visx over raw SVG — composability and DX |
| ADR-016 | Floorplan extraction | Dedicated floorplan_url field and preview component |
| ADR-017 | Seasonal phase table | Compact lookup table replacing card grid |
| ADR-018 | Seasonal phase strip | Compact /market page view of seasonal market cycle |
| ADR-019 | Acquisition strategy section | Bid ladder, thesis tagging, negotiation strategy |
| ADR-020 | *(reserved)* | — |
| ADR-021 | Alpha Score v2 | Multi-axis framework: deal quality + market dynamics + TCO + appreciation |

## Full Decision Log

## Canonical Source
**Always reference `DECISIONS.md` (root) for the full text of any ADR.**
When proposing a change, check if an existing ADR covers it — if so, follow it or propose an amendment.
