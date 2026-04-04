# propSearch: Data Guardrails
> Enforced by: All Agents
> Last updated: 2026-03-30
> Status: MANDATORY — No exceptions permitted

---

## Purpose

These guardrails protect the empirical integrity of the propSearch dataset. They exist to prevent three classes of catastrophic failure:

1. **Hallucination** — Fabricated property listings, metrics, or market data injected into the store.
2. **Accidental Destruction** — Unintended deletion or corruption of records during bulk operations.
3. **Data Drift** — Cumulative introduction of unverified or estimated data presented as empirical.

Every agent operating in this codebase is bound by these rules. Violation is grounds for rollback and task reassignment.

---

## Rule 1: Zero-Tolerance No-Hallucination Policy

### The Rule
**No agent may introduce synthetic, estimated, or unverified data into `data/`, the SQLite database, or `macro_trend.json`.**

### What Is Forbidden (Hallucination = Immediate Rollback)

| Forbidden Action | Example | Consequence |
|-----------------|---------|-------------|
| Inventing property listings | Creating a record for "45 Cadogan Gardens, SW3" that was never scraped or verified | Full rollback, data audit required |
| Fabricating prices or metrics | Setting `list_price: 2150000` without a live source | Immediate flag + rollback |
| Guessing Alpha Scores | Assigning a score without running the calculation formula | Score invalidated, recalculation required |
| Estimating HPI values | Filling in a missing HPI figure with a "reasonable guess" | Field nullified, source citation required |
| Backdating price reductions | Creating a price reduction event without source evidence | Record flagged, Data Analyst review required |
| Inventing service charges | Adding `service_charge: 4500` without a verified source | Record quarantined until verified |
| Embedding placeholder images | Using stock photos or Unsplash as property thumbnails | All placeholder images must be removed |
| Synthesizing IDs | Any record with a randomly generated UUID not assigned by the pipeline | Record rejected at schema validation |

### What Is Permitted (Calculated Estimates — Clearly Labelled)

| Permitted Action | Requirement |
|-----------------|-------------|
| Alpha Score calculation | Must use the documented formula in `agents/data_analyst/README.md` |
| Appreciation scenario projection | Must carry `is_estimated: true` and provenance tag (F-15) |
| Commute time calculation | Must be sourced from Google Maps / TfL API or clearly labelled |
| Rental yield estimate | Must carry `is_estimated: true` + source citation |
| Interpolation of missing HPI months | Permitted only if bounded by real data on both sides; must be flagged |

### Hallucination Detection Protocol

Before writing any new record to `data/` or SQLite, the agent MUST confirm:

```
PRE-WRITE CHECK (answer all three):
  1. SOURCED:   Does this data come from a live scrape, verified URL, or official dataset?
  2. VERIFIED:  Have I personally confirmed this record exists in the source (not assumed)?
  3. ATTRIBUTED: Does this field carry a source citation and timestamp?
  
  If ANY answer is NO → DO NOT WRITE. Seek the data or leave the field null.
```

---

## Rule 2: Delete & Destroy Protocol

### The Rule
**No agent may delete records from `data/propSearch.db`, `data/master.jsonl`, `data/macro_trend.json`, or any SQLite table without explicit user approval.**

### Thresholds Requiring User Approval

| Operation | Approval Required? |
|-----------|-------------------|
| Delete a single property record | **YES** — State the property ID, address, and reason |
| Delete a batch of records (>1) | **YES** — State count, criteria, and reason |
| Truncate or empty a JSON/JSONL file | **YES** — State why, state backup exists |
| Drop a SQLite table or column | **YES** — Schema change, non-negotiable |
| Re-index or rebuild the DB | **YES** if data loss risk, **NO** if safe offline operation |
| Restore from a backup | **YES** — State which backup, what will be overwritten |
| Delete a field from `macro_trend.json` | **YES** — Removing metrics requires user sign-off |

### Approval Format

When requesting deletion approval, the agent must state:
1. **What** — Exact record IDs or file paths affected
2. **Why** — Business reason for deletion
3. **Backup** — Confirmation that a snapshot exists before deletion
4. **Impact** — How many records will be removed

Example approval request:
> "Request to delete 3 duplicate inbox records: `[inbox_id_abc123, inbox_id_def456, inbox_id_ghi789]`. These are confirmed duplicates of verified master records. Backup snapshot exists at `data/backups/2026-03-30_backup.tar.gz`. Proceed?"

### Post-Delete Audit

After any approved deletion, the agent must:
1. Confirm the deletion in writing to the user
2. Update `data/backups/LOG.md` with the operation
3. Run a `SELECT COUNT(*)` on the affected table and report the new count

---

## Rule 3: Bulk Operation Checkpoint

### The Rule
**Any operation that modifies or risks modifying more than 5 records simultaneously must have a pre-operation backup and explicit user notification.**

### What Counts as a Bulk Operation

| Operation | Bulk Threshold |
|-----------|----------------|
| Alpha Score recalculation | >1 record |
| Price reduction backfill | >1 record |
| Schema migration | Always |
| JSONL conversion / reformat | Always |
| `sync_data.js` full pipeline run | Always |
| Data restoration from backup | Always |
| Bulk import from `data/import/` | Always |
| DELETE or UPDATE with no WHERE clause | Always (prohibited without backup) |

### Bulk Operation Protocol

```
BULK OPERATION CHECKLIST:
  [ ] Pre-operation backup created (per DAT-154 / analyst README)
  [ ] Backup confirmed: tarball verified, LOG.md updated
  [ ] Affected record count estimated
  [ ] Rollback procedure documented before starting
  [ ] User notified: "Starting bulk operation: [description]. 
       Estimated [N] records affected. Backup: [path]. Will confirm on completion."
  [ ] Dry-run completed (if pipeline supports --dry-run)
  [ ] Post-operation record count verified
  [ ] Post-operation backup created
```

---

## Rule 4: Schema Enforcement at Write Time

### The Rule
**All writes to the SQLite database must pass schema validation before committing. Records with missing mandatory fields must be rejected, not patched with invented values.**

### Mandatory Fields (Write Block — Cannot Be Null or 0)

| Table | Mandatory Fields |
|-------|-----------------|
| `properties` | `id`, `list_price`, `area`, `sqft`, `tenure`, `link`, `source` |
| `macro_trend.json` | `source`, `last_refreshed`, `methodology` (per F-15) |
| Inbox leads | `id`, `list_price`, `source_url`, `scraped_at` |

### Write Validation Sequence

```
WRITE VALIDATION (every write, every time):
  1. Run schema check — any null/zero mandatory field? → REJECT, do not patch
  2. Run hallucination check — any synthetic-looking ID or value? → QUARANTINE, alert user
  3. Run provenance check — does field carry source metadata? → ADD metadata if missing
  4. Commit only if all three pass
```

### Pipeline-Level Enforcement (Data Engineer)

`scripts/sync_data.js` MUST implement:
- A schema validation step before any INSERT or UPDATE
- A dry-run flag (`--dry-run`) that outputs what would change without committing
- A `--strict` mode that halts on any validation failure (recommended default)

---

## Rule 5: Read-Before-Write Discipline

### The Rule
**Before modifying any existing record, the agent must read the current value and confirm the change is intentional, not an accident.**

### Specific Rules

| Situation | Required Action |
|-----------|----------------|
| Updating `list_price` | Read current value, state old → new, cite source for new value |
| Changing `alpha_score` | Read current value, state formula being applied, confirm recalculation |
| Modifying `macro_trend.json` | Read the current field value before overwriting |
| Editing SQLite directly | Run `SELECT` first to confirm record exists and current values |
| Overwriting a JSON/JSONL file | Read the file first (do not assume its current state) |

### Rationale
Many data corruption events in single-user systems result from an agent overwriting a file without checking its current state. Always reading first prevents accidental full-file replacement.

---

## Rule 6: ID Integrity

### The Rule
**Property IDs must only be generated by the pipeline. No agent may assign or modify a property ID manually.**

- IDs from the scraper pipeline are authoritative.
- IDs from `manual_queue.json` are authoritative.
- Any record received with an `a1b2c3d4-...` pattern or a clearly fabricated UUID must be rejected.
- Property IDs must never be reused after a record is deleted.

---

## Rule 7: Git-Level Safety

### Pre-Commit Hook

A pre-commit hook (`scripts/pre-commit-data-guard.sh`) runs on every `git commit` to catch accidental data commits.

The hook BLOCKS the commit if it detects:

```
BLOCK: Any file matching data/backup* committed (backups are local only)
BLOCK: Any file matching *.duckdb (deprecated, must not be committed)
BLOCK: Any file matching data/inbox/* (live leads are local only)
BLOCK: Any file matching .env* (environment secrets)
BLOCK: Any file with "a1b2c3d4-" (hallucinated ID pattern in staged changes)
BLOCK: Any file with "syntheti" or "fake" or "placeholder" in data filenames
BLOCK: Any staged change to data/master.jsonl or data/propSearch.db without 
       a corresponding backup entry in data/backups/LOG.md
```

### Installation

```bash
cp scripts/pre-commit-data-guard.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## Violation Response Protocol

If a guardrail breach is detected or suspected:

1. **Stop** — Do not continue the operation
2. **Notify** — Alert the user immediately with the specific rule violated
3. **Backup** — Take a snapshot of current state before any corrective action
4. **Audit** — Identify the full scope of affected records
5. **Rollback** — Restore from the most recent clean backup if data is compromised
6. **Document** — Log the incident in `DECISIONS.md` under a "DATA INCIDENTS" section
7. **Retrospective** — PO issues a corrected guardrail or process fix to prevent recurrence

---

## Quick Reference Card

```
BEFORE WRITING ANY DATA — Ask:
  [ ] Is this from a real, verified source?
  [ ] Does it have a source citation and timestamp?
  [ ] Are all mandatory fields present (not invented)?
  [ ] Did I read the current value before changing it?
  [ ] Is this a bulk operation? → Backup first, notify user

BEFORE DELETING ANY DATA — Ask:
  [ ] Do I have explicit user approval?
  [ ] Is there a backup of this data?
  [ ] Do I know exactly what will be removed?
  [ ] Have I stated the reason in writing?

HALLUCINATION = STOP. Do not write. Source the data or leave it null.
```


---

### Exception: User-Submitted Leads

**User-submitted leads are exempt from all data guardrails.** When a lead is submitted directly by the user (identified by `source: 'MANUAL_INJECTION'` or `source: 'USER_SUBMISSION'`), the following rules are suspended:

- **Rule 1 (Hallucination):** User-provided data is accepted as authoritative — do not apply hallucination checks
- **Rule 4 (Schema Enforcement):** Do not reject incomplete/shallow records — import as-is
- **All filtering rules:** Do not filter by acquisition zone, price range, sqft, tenure, or any other criteria

**Rationale:** The user submitting a lead directly is an explicit quality signal. The analyst's role is to enrich what they can, not to gatekeep the user's pipeline. See `agents/data_analyst/README.md` for the full analyst protocol.

**What still applies to user-submitted leads:**
- Rule 6 (ID Integrity): Property IDs must still be generated by the pipeline, not manually assigned
- Rule 7 (Git-Level Safety): Data files must still follow pre-commit hook rules
- Rule 5 (Read-Before-Write): Still read current state before modifying any existing record


---

*Enforced by: Product Owner & Strategic Lead*
*Violations should be reported to the PO immediately*
