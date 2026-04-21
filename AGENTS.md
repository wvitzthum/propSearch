# propSearch: Private Acquisition & Research Dashboard

## Project Mission
A private, high-precision research tool designed for a single user to identify and acquire a specific prime London property. This platform is for personal use only and is not intended for external commercial use or revenue generation.

## System Overview
A multi-agent system that automates the discovery, normalization, and visualization of off-market and live property data to support a single high-stakes purchase decision.

### Core Architecture
- **Single-User:** No authentication, login screens, or user management. The system is for a private buyer and loads directly into the master dashboard.
- **Aesthetic Direction:** "Bloomberg Terminal meets Linear."
  - **Bloomberg:** High data density, dark-mode first, real-time feedback, "pro tool" feel.
  - **Linear:** Precision typography, subtle border/surface shadows, high-quality focus states, and a clean, minimalist layout (see: `linear.app`).

### Agents & Territorial Boundaries (Write Access)
1. **Product Owner & Strategic Lead (`agents/product_owner/`):** Authorized to write to `tasks/tasks.json` (task management), `REQUIREMENTS.md`, `DECISIONS.md`, `STRATEGIC_ROADMAP.md`, and `agents/product_owner/`.
2. **Senior Real Estate Data Analyst (`agents/data_analyst/`):** Authorized to write to `data/` (research outputs: macro_trend.json, import/, inbox/) and `agents/data_analyst/`.
3. **Senior Real Estate Data Engineer (`agents/data_engineer/`):** Authorized to write to `data/` (infrastructure: SQLite schema, pipelines), `agents/data_engineer/`, `scripts/sync_data.js`, and `server/index.js`. **Not authorized to modify frontend types.**
4. **Lead Frontend Engineer & UX Architect (`agents/frontend_engineer/`):** Authorized to write to `frontend/` and `agents/frontend_engineer/`. Owns `frontend/src/types/property.ts` and all frontend type definitions.
5. **UI/UX Quality Assurance Engineer (`agents/ui_ux_qa/`):** Authorized to write to `tasks/tasks.json` (issue creation, status updates) and `agents/ui_ux_qa/`.

---

## Unified Agent Protocol
1. **RTK Mandatory:** ALL high-volume shell operations (`npm install`, `npm run build`, `lint`, `node scripts/sync_data.js`, large `grep`, `ls -R`, batch file reads) **MUST** be proxied through **rtk** (Rust Token Killer). Use `rtk gain` to review token savings.
2. **Data Authenticity:** Agents are FORBIDDEN from creating synthetic or "hallucinated" property listings or market metrics. Use empirical data only. **SEE: `agents/DATA_GUARDRAILS.md` — mandatory reading before any data write.**
3. **Aesthetic Direction:** Adhere strictly to the "Bloomberg Terminal meets Linear" standards in all UI changes.
4. **Workflow Lifecycle:** `Select (identify highest priority task from tasks/tasks.json) -> Claim (Status: In Progress) -> Execute (follow logic in agent README + MANDATORY external enrichment for Analyst) -> Verify (build/lint/QA) -> Resolve (Status: Done)`.
5. **Cross-Agent Task Creation:** Any agent is authorized to create new tasks in `tasks/tasks.json` if a completed task requires a follow-up.
6. **Data Guardrails:** Before writing, modifying, or deleting any data in `data/` or SQLite, agents **MUST** follow the protocols in `agents/DATA_GUARDRAILS.md`. Violations trigger immediate rollback and user notification.

## Surgical Workflow & Efficiency

To maximize performance and minimize token usage, follow these surgical patterns:

### A. "jq-First" Task Discovery (tasks/tasks.json)
- **DO NOT** read `Tasks.md` by hand — it is a generated file and will be overwritten.
- **MANDATE:** All task reads MUST use `jq` against `tasks/tasks.json` (backed by RTK for high-volume shell ops):
  ```
  jq '.tasks[] | select(.id=="DAT-155")'               tasks/tasks.json   # read one task
  jq '.tasks[] | select(.status=="Todo")'              tasks/tasks.json   # all Todo
  jq '.tasks[] | select(.section=="data_research")'    tasks/tasks.json   # by section
  jq '.tasks[] | select(.responsible=="Data Analyst")' tasks/tasks.json   # by owner
  jq '.tasks[] | select(.status!="Done" and .section!="superseded")' tasks/tasks.json  # live
  ```
- **Task Status Updates:** Edit `tasks/tasks.json` directly — single object replacement, no column-count risk.
- **⚠️ CRITICAL - File Structure:** `tasks/tasks.json` is a JSON object with a `"tasks"` key containing an array: `{"tasks": [...]}`. The Python generator expects this structure. NEVER use raw jq to replace the entire file content without preserving this structure.
- **⚠️ CRITICAL - Safe Updates:** When using jq with `> file.json && mv`, the output may lose the object wrapper. Always verify with `jq 'keys' tasks/tasks.json` — should show `["tasks"]`.
- **⚠️ CRITICAL - Recovery:** If the file becomes an array only, wrap it: `echo '{"tasks": ' > tmp && cat tasks/tasks.json >> tmp && echo '}' >> tmp && mv tmp tasks/tasks.json`
- **Regenerate Markdown:** After updating `tasks/tasks.json`, run `python3 tasks/scripts/generate_tasks_markdown.py --write` or `make tasks-regen` to update `Tasks.md`.
- **Alternative Python Approach:** For complex updates, use Python instead of jq:
  ```python
  python3 -c "
  import json
  with open('tasks/tasks.json') as f:
      data = json.load(f)
  # modify data['tasks']
  with open('tasks/tasks.json', 'w') as f:
      json.dump(data, f, indent=2)
  print('Done')
  "
  ```
- **MANDATE:** Use `grep_search` for requirement IDs (e.g., `Requirement 11`) in `REQUIREMENTS.md`.

### B. Range-Limited Reads
- When reading `REQUIREMENTS.md` or large source files, use `start_line` and `end_line` based on your `grep` results to read ONLY the relevant context.
- `Tasks.md` is excluded from range-limited reads — use jq instead (see A above).

### C. Agent Instruction Loading
- Reference your specialized `agents/<role>/README.md` for logic-heavy tasks, but rely on `AGENTS.md` for all behavioral and territorial rules. Do not load all agent READMEs at once.

### D. Handling Blocked Tasks

**Definition of "Blocked":**
A task is blocked when you cannot proceed due to a dependency outside your control, such as:
- Waiting for user approval or decision
- Waiting for another agent to complete their part
- External data/resource not yet available
- Infrastructure/system issue
- Missing context required to proceed

**Blocking Protocol (MANDATORY):**

1. **Mark the task as `Blocked`** in `tasks/tasks.json`:
   ```python
   # Example: marking a task blocked
   task['status'] = 'Blocked'
   task['blocked_reason'] = 'Waiting for user approval'
   task['unblock_requires'] = [
       'User approval to proceed with schema change',
       'Data Engineer to complete DE-140 first'
   ]
   ```

2. **Document in the notes field** with `BLOCKED:` prefix:
   ```
   BLOCKED: Waiting for user approval on approach.
   BLOCKED BY: User decision required.
   TO UNBLOCK: Need explicit approval to:
     1. Delete record X (see DATA_GUARDRAILS.md Rule 2)
     2. Modify schema in production
   
   I've done all I can until you review. Please run `make tasks-regen` after reviewing.
   ```

3. **Be specific about what's needed:**
   - ❌ Bad: "Blocked, need help"
   - ✅ Good: "Blocked: Cannot proceed until you approve the mortgage rate data source (Land Registry vs BoE). Preference?"

4. **Run `make tasks-regen`** after marking blocked so Tasks.md reflects the status.

5. **Communication:** If the block requires user action, clearly state what you need:
   ```
   ⛔ BLOCKED: Cannot complete DAT-178 without your input.
   
   Question: Should we source HPI history from:
   A) Land Registry (free, monthly, 1995-present)
   B) ONS (free, monthly, 2005-present)  
   C) Knight Frank (better segmentation, requires scraping)
   
   Please advise and I'll proceed.
   ```

**Important:** Never leave a task in "In Progress" if you're blocked. Either complete it, mark it Blocked with clear instructions, or escalate it back to Todo if you've done your part.

---

## Testing & Development Safety (MANDATORY)

### Port Usage — No Default Ports for Testing

**Any agent running a server, mock, or test harness for development or testing purposes MUST use a non-default port.**

| Service | Default Port | Required Test Port |
|---------|-------------|---------------------|
| Frontend dev server (Vite) | 5173 | `5900` + N (e.g. 5901, 5902) |
| Node API server | 3000 | `3900` + N (e.g. 3901) |
| SQLite browser (better-sqlite3) | in-process | in-process only |
| Mock HTTP server | any | `4900` + N |
| Any ad-hoc test server | any | `5900`–`5999` range |

**Rules:**
- Use `PORT=<non-default> node server/index.js` for any test API server
- Use `VITE_PORT=<non-default> vite --port <non-default>` for any test frontend
- Never start a test server on ports 3000, 5173, 8080, or 8000 — these may conflict with or override the user's live services
- Document the port used in any test output or commit message

**Pattern for test scripts:**
```bash
# ✅ Correct — non-default port
PORT=3901 node --test server.test.js

# ✅ Correct — Vite with explicit test port
VITE_PORT=5902 vite --port 5902 --mode test

# ❌ Forbidden — default ports
PORT=3000 node server/index.js      # may kill live API
PORT=5173 npx vite --port 5173     # may kill live frontend
```

### Database Safety — Never Use propSearch.db for Testing

**The production SQLite database (`data/propSearch.db`) is the single source of truth for all property research. It must NEVER be touched by test scripts, migrations, or exploratory queries.**

**Rules:**
1. **Test databases must be ephemeral and isolated.** Create a temporary DB for any testing:
   ```bash
   # ✅ Correct — temp test DB
   TEST_DB=/tmp/propSearch_test_$$.db SQLITE_PATH=/tmp/propSearch_test_$$.db node scripts/test_migration.js

   # ✅ Correct — in-memory for unit tests
   SQLITE_PATH=:memory: node --test

   # ❌ Forbidden — touching production
   node scripts/migrate_schema.js              # uses production path by default
   ```
2. **Any script that writes to the DB must accept `SQLITE_PATH` as an env var** and default to a test path if `NODE_ENV=test`:
   ```javascript
   const SQLITE_PATH =
     process.env.NODE_ENV === 'test'
       ? '/tmp/propSearch_test.db'
       : process.env.SQLITE_PATH ?? 'data/propSearch.db';
   ```
3. **Frontend tests** must use mock data (static JSON) or in-memory fixtures — never hit the real `/api/*` endpoints against production.
4. **SQLite migrations** run against production only when explicitly approved by the Product Owner. All migration testing uses a staging copy.
5. **Verification before production writes:** Always run `SELECT COUNT(*) FROM properties` on the test DB first to confirm the script works before touching production.

### Development Pattern for Frontend Agents

When testing React components in isolation:
```bash
# ✅ Correct — isolated component test
NODE_ENV=test SQLITE_PATH=/tmp/test.db npx vitest run src/components/PriceAssessment.test.tsx

# ✅ Correct — use mock data files
cp frontend/public/data/demo_master.json frontend/public/data/test_master.json
# point test at test_master.json via VITE_DEMO_MODE test fixture
```

When running a local backend for frontend integration testing:
```bash
# ✅ Correct — isolated test environment
PORT=3901 \
  SQLITE_PATH=/tmp/propSearch_test_integration.db \
  DEMO_MODE=true \
  node server/index.js
```

### Summary

| Rule | Enforcement |
|------|-------------|
| No default ports for test services | Agent discipline + code review |
| No writes to `data/propSearch.db` in test scripts | `SQLITE_PATH` env var must be set for any DB write |
| Test DBs are ephemeral (`/tmp`, `:memory:`) | Agent discipline |
| Migrations tested on staging copy first | Product Owner approval gate |

Violations of these rules should be flagged immediately in task notes and raised with the Product Owner.

---

## Project Structure
- `agents/`: Specialized agent logic and domain rules.
- `data/`: Property datasets and master database.
- `frontend/`: React + Tailwind application.
- `tasks/`: Task backlog and archives.
