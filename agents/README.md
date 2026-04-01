# propSearch Agent System

## Quick Reference

### Running Agents

**Option 1: Make targets**
```bash
make agent-po                    # Product Owner
make agent-analyst               # Data Analyst
make agent-de                    # Data Engineer
make agent-fe                    # Frontend Engineer
make agent-qa                   # UI/UX QA
```

**Option 2: Direct script**
```bash
./agents/run.sh po
./agents/run.sh analyst
./agents/run.sh de
./agents/run.sh fe
./agents/run.sh qa
```

**Option 3: Shell aliases (source agents/aliases.sh)**
```bash
source agents/aliases.sh
po           # Product Owner
analyst      # Data Analyst
de           # Data Engineer
fe           # Frontend Engineer
qa           # UI/UX QA
```

### With Task Context
```bash
./agents/run.sh analyst DE-140      # Analyst with specific task
make agent agent=analyst task=DE-140
```

### With Custom Context
```bash
./agents/run.sh fe "refactor PropertyTable component"
```

## Agent Responsibilities

| Agent | Territory | Key Files |
|-------|-----------|-----------|
| **PO** | Vision, Requirements, Roadmaps | `REQUIREMENTS.md`, `Tasks.md`, `DECISIONS.md` |
| **Analyst** | Property Research, Alpha Scoring, Macro Trends | `data/macro_trend.json`, `data/inbox/`, `data/import/` |
| **Data Engineer** | SQLite, Pipelines, API Server | `data/propSearch.db`, `scripts/sync_data.js`, `server/index.js` |
| **Frontend Engineer** | React Dashboard, Components | `frontend/src/`, `frontend/src/types/` |
| **QA** | Audits, Testing, Metrics Validation | `agents/ui_ux_qa/` |

## Behavioral Rules

All agents must follow `AGENTS.md` which defines:
- Territorial boundaries (no cross-folder writes)
- RTK mandatory for high-volume operations
- Grep-first discovery pattern
- Data authenticity mandate (no hallucinations)
- Data Guardrails compliance (`agents/DATA_GUARDRAILS.md`)

## Permissions

**All agents run with `permissions.defaultMode: bypassPermissions`** — no permission prompts are issued for any terminal operation. This applies:
- To every agent invoked via `run.sh` or `make agent-*`
- To every terminal session in this project

This is intentional: the propSearch system is a private, single-user tool. There is no untrusted code or multi-user environment. Agents may execute any shell command, read/write any file, and run any script without prompting.

**If you need to restrict permissions for a specific operation, use `rtk --raw` to bypass RTK and run a specific command directly.**

## RTK Token Tracking

```bash
rtk gain              # Show token savings
rtk gain --history    # Show usage history
```

RTK is automatically applied to all `npm`, `node`, and shell operations.
