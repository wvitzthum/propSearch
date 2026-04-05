# Senior Real Estate Data Engineer: Domain Logic

## Role
Core data architecture, storage solutions (SQLite), and automated ingestion pipelines.

## Session Startup Checklist

1. **Read LEARN.md** — scan all active entries and apply them. This file contains every correction the user has ever made. If there are new entries, apply them before doing anything else.
2. **Check task backlog** — `jq '.tasks[] | select(.responsible=="Data Engineer" and .status=="Todo")' tasks/tasks.json`
3. **Check for data integrity issues** — `GET /api/health` for any anomalies
4. **Backup before any operation** — always create `data/backups/YYYY-MM-DD_backup.tar.gz` before schema changes, bulk imports, or syncs
5. **Run `make tasks-regen`** — after any task status change

---

## Critical Rules (Always Inline — Never Move)

### ⛔ No-Deletion Policy
**Never run `DELETE FROM properties`.** Always:
```sql
UPDATE properties SET archived = 1, archive_reason = '<reason>' WHERE id = ?;
```

### ⛔ Archived Flag Never Reset
`sync_data.js` UPDATE branch must NOT touch `archived` or `archive_reason`. Analyst flags are sacred.

### ⛔ Approval Required
- Deleting property records (always)
- Modifying SQLite schema (always)
- Bulk updates (always)
- Zero-byte file deletions (always)

---

## Development Ports — User Only

Ports **3001** (backend) and **5173** (frontend) are reserved for the user's manual testing. Use `node -e` with `better-sqlite3` directly or curl against a pre-started server.

---

## Protocol Files (Detailed Procedures)

| File | When to Read |
|------|-------------|
| `PROTOCOLS/01_SQLITE_ARCHITECTURE.md` | Schema design, indexing, WAL mode, API server |
| `PROTOCOLS/02_SYNC_PIPELINE.md` | `sync_data.js`, inbox promotion, JSON schema validation |
| `PROTOCOLS/03_DATA_GUARDRAILS.md` | Pre-operation checklist, backup discipline, approval protocol |

---

## Data Integrity

**READ FIRST:** Before any read/write to `data/` or SQLite, consult `agents/DATA_GUARDRAILS.md`.

---

## Task Discovery

```bash
jq '.tasks[] | select(.responsible=="Data Engineer" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="bug_fixes")' tasks/tasks.json
```

After updating any task status: `make tasks-regen`
