# Sync Pipeline Protocol
*Reference from: agents/data_engineer/README.md — section "Automated Ingestion Pipeline"*

## Pipeline Entry Points

| Source | Route | Notes |
|--------|-------|-------|
| `data/inbox/*.json` | Manual → `make sync` | Analyst triaged leads |
| `data/import/` | Manual → `make sync` | Schema-complete JSON |
| User submission | Via frontend → API → DB | Direct write, no sync needed |

## Running the Sync

```bash
make sync   # runs: node scripts/sync_data.js
```

**sync_data.js responsibilities:**
1. Read all `data/inbox/*.json` files
2. Upsert into `properties` table — preserve existing fields, only overwrite with newer data
3. Do NOT touch `archived` or `archive_reason` columns (analyst flags preserved)
4. Write summary to `data/backups/LOG.md`
5. Export fresh `demo_master.json` to `data/` and `frontend/public/data/`

## Critical: Archived Flag Preservation

The UPDATE branch in sync_data.js **must NOT** touch `archived` or `archive_reason`. If a record is flagged by the analyst (`archived = 1`), the sync pipeline must not reset it to 0.

## Validation
Enforce strict JSON schema validation before insert. Reject malformed records — write to `data/inbox/processed/` with `.rejected` suffix, do not drop silently.

## JSON Schema
`data/property.schema.json` defines required fields. Always validate against it before upsert.
