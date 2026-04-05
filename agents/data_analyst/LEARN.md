# Agent Learnings — Corrections & Permanent Improvements

> **What is this file?**
> Every time a user corrects your behaviour, you record it here. These entries
> become permanent institutional memory. The next time you launch, you read
> this file before doing anything else — so the same correction never needs to
> happen twice.
>
> **How to use it:**
> - READ this file on every session startup (before anything else)
> - APPEND a new entry whenever the user corrects you — structured, not free text
> - The PO reviews and formalises stable learnings into PROTOCOLS/ or README.md

---

## Learning Entry Template

```markdown
## Learning Entry — YYYY-MM-DD

**Trigger:** One-sentence description of what the user corrected.
**Before:**   The rule/belief that caused the wrong behaviour.
**After:**    The corrected rule to follow going forward.
**Scope:**    All tasks / specific component / specific agent / etc.
**Tasks:**    Any task IDs updated as a result (or N/A)
**Status:**   Active | Superseded | Review
**PO Note:** PO review date (filled by PO on formalisation)
```

---

## Adding an Entry — Step by Step

When the user says something like:
> "actually no — you should always X, not Y"

1. **Acknowledge** the correction and apply it immediately in the current session
2. **Append** a structured entry to this file (see template above)
3. **Update** any affected tasks in `tasks/tasks.json` if the correction changes behaviour
4. **Read** this file on your next launch — the corrected rule is now active

**Never delete entries.** Mark them `Superseded` if a later correction replaces them.
The PO formally consolidates stable entries into PROTOCOLS/ or README.md.

---

## Example Entry

```
## Learning Entry — 2026-04-04

**Trigger:** User said "don't start dev servers — ports 3001 and 5173 are mine"
**Before:**  Agent started `npm run dev` or `node server/index.js` as part of task workflow
**After:**   Agent uses `node -e` with `better-sqlite3` for direct DB access or curl against
             a pre-started server. Does not start servers unless explicitly asked.
**Scope:**   All data_engineer and frontend_engineer tasks
**Tasks:**   N/A
**Status:**   Active
**PO Note:** Formalised into agent READMEs — 2026-04-04
```

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `Active` | Applied on every relevant session. The current correct rule. |
| `Superseded` | Replaced by a later correction. Kept for audit trail. |
| `Review` | Unclear scope or potentially invalid. PO to clarify. |

---

## Active Entries

*(No entries yet — add your first correction above)*

---

## Learning Entry — 2026-04-04

**Trigger:** User clarified that ports 3001 and 5173 are reserved exclusively for their own manual testing — agents must not start dev servers.

**Before:** Agent would start `node server/index.js` or `npm run dev` as part of task workflow or to test API responses.

**After:** Agent uses `node -e` with `better-sqlite3` directly or `curl http://localhost:3001` against a pre-started server. Dev servers are never started by the agent unless explicitly asked.

**Scope:** All data_analyst, data_engineer, and frontend_engineer tasks.

**Tasks:** N/A

**Status:** Active

**PO Note:** Formalised into agent READMEs — 2026-04-04
