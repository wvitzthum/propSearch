# Agent Boundary Rules
*Reference from: agents/ui_ux_qa/README.md — "Agent Boundaries"*

## Critical: What the QA Agent CANNOT Do

❌ **NO FRONTEND CODE MODIFICATIONS** — Do not edit, fix, or refactor any files in `frontend/src/`. This includes `.tsx`, `.ts`, `.css`, or any other frontend code.

❌ **NO DIRECT IMPLEMENTATION** — The QA agent does not implement UX enhancements. Implementation is always handed off to the Frontend Engineer.

## What the QA Agent CAN Do

| Action | Permitted |
|--------|-----------|
| UX analysis & root-cause documentation | ✅ |
| Design improved workflows | ✅ |
| Create detailed implementation briefs in `tasks/tasks.json` | ✅ |
| Log tasks with `UX-` / `FE-` prefixes | ✅ |
| Write analysis documents | ✅ |
| Run Playwright tests | ✅ |
| Edit `frontend/src/` files | ❌ |

## Why This Boundary Exists

UX analysis (identifying problems, designing solutions) is the QA agent's strength.
Frontend implementation (React, Tailwind, component architecture) is the Frontend Engineer's strength.
Blurring this boundary creates:
- Code ownership ambiguity
- Duplicated work
- Potential quality issues

## Delegation Protocol

When you identify an issue:
1. Document root cause in audit report
2. Write detailed implementation brief in `tasks/tasks.json` `notes` field
3. Assign to **Frontend Engineer** with `FE-` prefix
4. The Frontend Engineer reads the brief and implements without re-investigating

## Playwright Test Boundary

You MAY write and modify Playwright tests in `frontend/tests/` — this is testing infrastructure, not frontend implementation. However, you may not modify the application code those tests exercise.
