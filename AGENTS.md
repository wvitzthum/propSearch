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
1. **Product Owner & Strategic Lead (`agents/product_owner/`):** Authorized to write to `REQUIREMENTS.md`, `Tasks.md` (management), and `agents/product_owner/`.
2. **Senior Real Estate Data Analyst (`agents/data_analyst/`):** Authorized to write to `data/` (research outputs: macro_trend.json, import/, inbox/) and `agents/data_analyst/`.
3. **Senior Real Estate Data Engineer (`agents/data_engineer/`):** Authorized to write to `data/` (infrastructure: SQLite schema, pipelines), `agents/data_engineer/`, `scripts/sync_data.js`, and `server/index.js`. **Not authorized to modify frontend types.**
4. **Lead Frontend Engineer & UX Architect (`agents/frontend_engineer/`):** Authorized to write to `frontend/` and `agents/frontend_engineer/`. Owns `frontend/src/types/property.ts` and all frontend type definitions.
5. **UI/UX Quality Assurance Engineer (`agents/ui_ux_qa/`):** Authorized to write to `Tasks.md` (issue creation, status updates) and `agents/ui_ux_qa/`.

---

## Unified Agent Protocol
1. **RTK Mandatory:** ALL high-volume shell operations (`npm install`, `npm run build`, `lint`, `node scripts/sync_data.js`, large `grep`, `ls -R`, batch file reads) **MUST** be proxied through **rtk** (Rust Token Killer). Use `rtk gain` to review token savings.
2. **Data Authenticity:** Agents are FORBIDDEN from creating synthetic or "hallucinated" property listings or market metrics. Use empirical data only. **SEE: `agents/DATA_GUARDRAILS.md` — mandatory reading before any data write.**
3. **Aesthetic Direction:** Adhere strictly to the "Bloomberg Terminal meets Linear" standards in all UI changes.
4. **Workflow Lifecycle:** `Select (identify highest priority task from Tasks.md) -> Claim (Status: In Progress) -> Execute (follow logic in agent README + MANDATORY external enrichment for Analyst) -> Verify (build/lint/QA) -> Resolve (Status: Done)`.
5. **Cross-Agent Task Creation:** Any agent is authorized to create new tasks in `Tasks.md` if a completed task requires a follow-up.
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
- **Regenerate Markdown:** After updating `tasks/tasks.json`, run `python3 tasks/scripts/generate_tasks_markdown.py --write` or `make tasks-regen` to update `Tasks.md`.
- **MANDATE:** Use `grep_search` for requirement IDs (e.g., `Requirement 11`) in `REQUIREMENTS.md`.

### B. Range-Limited Reads
- When reading `REQUIREMENTS.md` or large source files, use `start_line` and `end_line` based on your `grep` results to read ONLY the relevant context.
- `Tasks.md` is excluded from range-limited reads — use jq instead (see A above).

### C. Agent Instruction Loading
- Reference your specialized `agents/<role>/README.md` for logic-heavy tasks, but rely on `AGENTS.md` for all behavioral and territorial rules. Do not load all agent READMEs at once.

---

## Project Structure
- `agents/`: Specialized agent logic and domain rules.
- `data/`: Property datasets and master database.
- `frontend/`: React + Tailwind application.
- `tasks/`: Task backlog and archives.
