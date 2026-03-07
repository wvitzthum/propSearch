# immoSearch: Private Acquisition & Research Dashboard

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
   - Owns the roadmap and strategic vision in `REQUIREMENTS.md`.
   - Populates `Tasks.md` with features and strategic refinements.
2. **Senior Real Estate Data Engineer (`agents/data_gatherer/`):** 
   - Generates and normalizes institutional-grade property datasets.
   - Implements Alpha Score logic and pricing negotiation algorithms.
3. **Lead Frontend Engineer & UX Architect (`agents/frontend_engineer/`):** 
   - Builds the decision-support dashboard using React and Tailwind CSS.
   - Focuses on data density and visual hierarchy for rapid analysis.
4. **UI/UX Quality Assurance Engineer (`agents/ui_ux_qa/`):**
   - Conducts functional, accessibility, and dark mode audits.
   - Generates bug reports and UX task lists in `Tasks.md`.

### Coordination Rules
- **Schema Integrity:** All data must strictly follow the JSON schema defined in the agent READMEs.
- **Aesthetic Direction:** "Bloomberg Terminal meets Linear (via linear.app patterns)."
- **Agent Boundaries:** Agents must strictly adhere to their specialized domains. If an agent's task evolves into the domain of another (e.g., Data Engineer starts writing React components), they MUST stop and defer to the appropriate agent. Cross-contamination of responsibilities is a hard failure.
- **Territorial Boundaries (Write Access):**
  - **Product Owner:** Authorized to write ONLY to `REQUIREMENTS.md`, `Tasks.md`, and `agents/product_owner/`.
  - **Data Gatherer:** Authorized to write ONLY to `data/` and `agents/data_gatherer/`.
  - **Frontend Engineer:** Authorized to write ONLY to `frontend/` and `agents/frontend_engineer/`.
  - **UI/UX QA:** Authorized to write ONLY to `Tasks.md` and `agents/ui_ux_qa/`.
- **Workflow Pipeline:** Product Owner sets requirements -> QA identifies gaps -> `Tasks.md` -> Frontend/Data implementation.


## Gemini CLI Usage & Efficiency
To maximize performance and minimize token usage, follow these orchestration patterns:

### 1. Agent Invocation
When starting a task, explicitly reference the relevant agent's `README.md` to load its specialized context:
- `Data Gathering:` "Using the instructions in `agents/data_gatherer/README.md`, generate today's property snapshot."
- `UI Development:` "Following `agents/frontend_engineer/README.md`, implement the KPI header using the latest data."
- `QA Audit:` "As the `agents/ui_ux_qa/` engineer, audit the dark mode contrast and update `Tasks.md`."

### 2. Efficiency Strategies
- **Parallel Research:** Use `generalist` to run data gathering and UI audits simultaneously if they don't depend on the same files.
- **The "Tasks.md" Trigger:** Instead of giving vague instructions, tell the CLI: "Review `Tasks.md` and implement the highest priority fix."
- **Context Compression:** Do not load all agent READMEs at once unless performing a cross-agent coordination task. Focus on one agent per turn when possible.

### 3. Verification & Handoff
- Always run the QA agent *after* a frontend change but *before* declaring the task complete.
- Ensure the Data Gatherer updates `master.json` and `manifest.json` in a single atomic operation to keep the frontend data-source consistent.

## Project Structure
- `agents/`: Specialized agent instructions.
- `data/`: Property datasets (e.g., `07_03_2026.json`).
- `frontend/`: React + Tailwind application.
