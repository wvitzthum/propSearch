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
- **Playwright Test Suite (MANDATORY before task completion):** Before marking any task as Done, you MUST run the full test suite and ensure all tests pass (or are documented as skipped with a known ticket reference). Running tests is not optional — it is a gate on task completion.
  ```
  cd frontend && npm run test          # Full suite — must pass
  npm run test:smoke                  # Quick smoke tests — must pass
  npm run test:accessibility          # Accessibility checks — must pass
  ```
  If tests fail:
  1. Identify whether the failure is a pre-existing bug (check `Tasks.md` for a ticket) or a new regression introduced by your change.
  2. If pre-existing: document the failing test in your task notes and note the blocking ticket ID.
  3. If new regression: fix the bug before completing the task. Do NOT mark Done while tests are red due to your changes.
  4. If a test has the wrong selector but catches a real bug: file a QA ticket instead of ignoring it.
  5. NEVER skip tests with `test.skip()` unless you have confirmed the UI feature genuinely does not exist and logged a feature-gap ticket.
  6. If the test environment has a known backend issue (e.g. `Failed to fetch`, `hpi_forecasts.map`): check `Tasks.md` — if a ticket exists, note it. If no ticket exists, create one instead of adding test filters.

## Data Integrity & Approval Protocol
- **MANDATORY:** You must explicitly ask for user approval before modifying global state types in `frontend/src/types/` or performing bulk updates to frontend data mocks (`public/data/*.json`).
- **Component Deletion:** Deleting or significantly refactoring core components (e.g., `PropertyTable`, `MarketPulse`) requires prior consent.

---
