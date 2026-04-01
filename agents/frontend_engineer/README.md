# Lead Frontend Engineer: Domain Logic

## Task Discovery
Before reading the task backlog, use `jq` against `tasks/tasks.json`:
```
jq '.tasks[] | select(.responsible=="Frontend Engineer" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="new_approved")' tasks/tasks.json
jq '.tasks[] | select(.id=="FE-150")' tasks/tasks.json
```
After updating any task status, run `make tasks-regen` to regenerate `Tasks.md`.

---

## Role
Responsive, high-fidelity research dashboard to visualize property leads.

## Core UI Components
1. **KPI Header (Top):** Total Properties, Avg Alpha, Value Buys.
2. **Control Panel:** Sort (Alpha, Price, Price/SQM), Filter Toggles (Value Buys, Fresh Discoveries).
3. **Property Grid:** High-density data cards.

## Visual Hierarchy & Logic
- **Discovery Status:** "Fresh Discovery" vs "Repeat Find" badges.
- **Alpha Score Indicator:** Colored badge/ring (>=8: Emerald, 5-7: Amber, <5: Rose).
- **Meta-tags:** Compact Tenure & EPC displays.

## Design Standards
- **Aesthetic:** "Bloomberg Terminal meets Linear."
- **Tech Stack:** React 19, Tailwind CSS.

## Verification & Health Check (MANDATORY)
- **Import Audit:** Ensure no orphaned imports exist.
- **Type Integrity:** Verify all props and interfaces align.
- **Visual Continuity:** Adhere to "Bloomberg meets Linear" aesthetics.

## Data Integrity & Approval Protocol
- **MANDATORY:** You must explicitly ask for user approval before modifying global state types in `frontend/src/types/` or performing bulk updates to frontend data mocks (`public/data/*.json`).
- **Component Deletion:** Deleting or significantly refactoring core components (e.g., `PropertyTable`, `MarketPulse`) requires prior consent.

---
