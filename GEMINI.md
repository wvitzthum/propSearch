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

### Agents

1. **Product Owner & Strategic Lead (`agents/product_owner/`):**
   - **Primary Goal:** Long-term vision and strategic roadmap.
   - **Responsibilities:** Maintains `REQUIREMENTS.md`, prioritizes the backlog in `Tasks.md`, and suggests high-level feature enhancements.
   - **Write Access:** `REQUIREMENTS.md`, `Tasks.md`, `agents/product_owner/`.

2. **Senior Real Estate Data Analyst (`agents/data_analyst/`):**
   - **Primary Goal:** Property research, metric normalization, and "Alpha" signal generation.
   - **Responsibilities:** Identifies listings, calculates Alpha/Appreciation scores, and maintains macro market trends.
   - **Write Access:** `data/`, `agents/data_analyst/`.

3. **Senior Real Estate Data Engineer (`agents/data_engineer/`):** 
   - **Primary Goal:** Data architecture, storage solutions, and automated ingestion pipelines.
   - **Responsibilities:** Manages DuckDB storage, maintains `sync_data.js`, and builds the backend API.
   - **Write Access:** `data/`, `agents/data_engineer/`, `scripts/sync_data.js`, `server/index.js`.

4. **Lead Frontend Engineer & UX Architect (`agents/frontend_engineer/`):** 
   - **Primary Goal:** Responsive, "Bloomberg meets Linear" research dashboard.
   - **Responsibilities:** Implements data-dense UI, sorting/filtering, and ensures no-auth architecture.
   - **Write Access:** `frontend/`, `agents/frontend_engineer/`.

5. **UI/UX Quality Assurance Engineer (`agents/ui_ux_qa/`):**
   - **Primary Goal:** Rigorous functional and aesthetic audit.
   - **Responsibilities:** Validates against `REQUIREMENTS.md`, conducts dark mode audits, and logs bugs in `Tasks.md`.
   - **Write Access:** `Tasks.md`, `agents/ui_ux_qa/`.

---

### Cross-Agent Task Creation
**Mandate:** Any agent is authorized to create new tasks in `Tasks.md` for other agents if a completed task requires a follow-up (e.g., Data Engineer adds a new field and creates a task for the Frontend Engineer to display it). This ensures the "Research -> Strategy -> Execution" cycle remains continuous across domains.

### Coordination Rules
- **Data Authenticity:** Agents are FORBIDDEN from creating synthetic or "hallucinated" property/trend data. All property datasets must be fetched from external sources (internet, APIs, or existing local files). Any generation of non-empirical data (e.g., test mocks or manual trend estimation) requires explicit user approval via `ask_user`.
- **Schema Integrity:** All data must strictly follow the JSON schema defined in the agent READMEs.
- **Aesthetic Direction:** "Bloomberg Terminal meets Linear (via linear.app patterns)."
- **Agent Boundaries:** Agents must strictly adhere to their specialized domains. If an agent's task evolves into the domain of another (e.g., Data Engineer starts writing React components), they MUST stop and defer to the appropriate agent. Cross-contamination of responsibilities is a hard failure.
- **Territorial Boundaries (Write Access):**
  - **Product Owner:** Authorized to write ONLY to `REQUIREMENTS.md`, `Tasks.md`, and `agents/product_owner/`.
  - **Data Analyst:** Authorized to write ONLY to `data/` and `agents/data_analyst/`.
  - **Data Engineer:** Authorized to write ONLY to `data/`, `agents/data_engineer/`, `scripts/sync_data.js`, `server/index.js`, and `frontend/src/types/property.ts`.
  - **Frontend Engineer:** Authorized to write ONLY to `frontend/` and `agents/frontend_engineer/`.
  - **UI/UX QA:** Authorized to write ONLY to `Tasks.md` and `agents/ui_ux_qa/`.
- **Workflow Pipeline:** Product Owner sets requirements -> QA identifies gaps -> `Tasks.md` -> Frontend/Data implementation.


## Gemini CLI Usage & Efficiency
To maximize performance and minimize token usage, follow these orchestration patterns:

### 1. RTK Optimization (Mandatory Mandate)
- **ALL high-volume shell operations** (`npm install`, `npm run build`, `lint`, `node scripts/sync_data.js`, large `grep`, `ls -R`, batch file reads) **MUST** be proxied through **rtk** (Rust Token Killer).
- This is NOT optional. It minimizes context noise and reduces token consumption by 60-90%.
- Use `rtk --raw <command>` **ONLY** when troubleshooting cryptic errors that `rtk` might be compressing.

### 2. Agent Invocation
When starting a task, explicitly reference the relevant agent's `README.md` to load its specialized context:
- `Property Research:` "Following the instructions in `agents/data_analyst/README.md`, identify 5 new listings in Islington."
- `Data Infrastructure:` "Using the instructions in `agents/data_engineer/README.md`, optimize the DuckDB schema for Alpha scores."
- `UI Development:` "Following `agents/frontend_engineer/README.md`, implement the KPI header using the latest data."
- `QA Audit:` "As the `agents/ui_ux_qa/` engineer, audit the dark mode contrast and update `Tasks.md`."

### 3. Efficiency Strategies
- **Parallel Research:** Use `generalist` to run data gathering and UI audits simultaneously if they don't depend on the same files.
- **The "Tasks.md" Trigger:** Instead of giving vague instructions, tell the CLI: "Review `Tasks.md` and implement the highest priority fix."
- **Context Compression:** Do not load all agent READMEs at once unless performing a cross-agent coordination task. Focus on one agent per turn when possible.

### 4. Verification & Handoff
- Always run the QA agent *after* a frontend change but *before* declaring the task complete.
- Ensure the Data Analyst coordinates with the Data Engineer when new metrics require schema changes.
- The Data Engineer is responsible for the final promotion of data to the DuckDB master store.

## Project Structure
- `agents/`: Specialized agent instructions.
- `data/`: Property datasets (e.g., `07_03_2026.json`).
- `frontend/`: React + Tailwind application.
