# Data Guardrails Protocol
*Reference from: agents/data_engineer/README.md — section "Data Integrity, Approval & Guardrails"*

**READ THIS FIRST before any read/write to `data/` or SQLite.**

## Required Pre-Operation Checklist

Before modifying `data/propSearch.db`, running `sync_data.js`, or deleting any file in `data/`:

1. [ ] Confirm operation is scoped to the intended table/records
2. [ ] Run a dry-run if the script supports it
3. [ ] Create a backup in `data/backups/` with dated filename
4. [ ] Verify backup integrity: `tar -tzf <backup>.tar.gz | head -10`
5. [ ] Log the operation in `data/backups/LOG.md`
6. [ ] Notify user of backup: "Backup created: YYYY-MM-DD (N records)"

## Approval Protocol

| Action | Requires User Approval |
|--------|----------------------|
| Deleting property records | ALWAYS — no exceptions |
| Modifying SQLite schema | ALWAYS — no exceptions |
| Bulk updates (e.g. re-syncing `dom` for all items) | ALWAYS — no exceptions |
| Deleting JSON data files | ALWAYS |
| Zero-byte file deletions | ALWAYS |
| Bulk import from `data/import/` | Always |

## No-Deletion Policy

**User directive (2026-04-01):** No production data is ever deleted from `properties`.

Instead of DELETE, use:
```sql
UPDATE properties SET archived = 1, archive_reason = '<reason>' WHERE id = ?;
```

### Flagging Reasons
| Situation | `archive_reason` |
|-----------|-----------------|
| Record cannot be immediately verified/enriched | `Shallow data: Needs Enrichment` |
| Record cannot ever be verified | `Cannot Verify — Discard` |
| Duplicate of a richer record | `Duplicate — Superseded` |
| Off-market confirmed | `Off-Market — Listing Removed` |

### Never Run
- `DELETE FROM properties` — ever
- Any SQL that removes data rather than flags it

## Backup Discipline
- **Frequency:** At minimum once per week and before any major operation
- **Location:** `data/backups/YYYY-MM-DD_backup.tar.gz`
- **Retention:** Last 4 weekly snapshots minimum
