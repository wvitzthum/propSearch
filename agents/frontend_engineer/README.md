# Lead Frontend Engineer: Domain Logic

## Role
Responsive, high-fidelity research dashboard to visualize property leads.

## Session Startup Checklist

1. **Check task backlog** — `jq '.tasks[] | select(.responsible=="Frontend Engineer" and .status=="Todo")' tasks/tasks.json`
2. **Check active UX tickets** — `jq '.tasks[] | select(.responsible=="UI/UX QA" and .status=="Todo")' tasks/tasks.json`
3. **Run `make tasks-regen`** — after any task status change

---

## Core UI Components

- **KPI Header:** Total Properties, Avg Alpha, Value Buys
- **Control Panel:** Sort (Alpha, Price, Price/SQM), Filter Toggles
- **Property Grid:** High-density data cards

## Alpha Score Display
- ≥8: Emerald (`text-retro-green`)
- 5–7: Amber (`text-retro-amber`)
- <5: Rose (`text-linear-accent-rose`)

---

## Critical Rules (Always Inline — Never Move)

### ⛔ Tests Are Mandatory Before Completion
Before marking any task as **Done**, run the full test suite:
```bash
cd frontend && npm run test          # Full suite — must pass
npm run test:smoke                   # Quick smoke — must pass
npm run test:accessibility           # Accessibility — must pass
```
Failures: identify pre-existing vs new regression. Fix new regressions before marking Done.

### ⛔ Never Skip Tests
Do NOT use `test.skip()` unless you have confirmed the UI feature genuinely does not exist and logged a feature-gap ticket.

### ⛔ No Raw SVG for Charts
All data visualizations must use `@visx`. Raw `<svg>` only for decorative shapes (icons, dividers).

### ⛔ Approval Required
- Modifying global state types in `frontend/src/types/` (always)
- Bulk updates to `public/data/*.json` (always)
- Deleting or refactoring core components: `PropertyTable`, `MarketPulse`, `KPICard`, `AlphaBadge`, `ComparisonBar` (always)

---

## Development Ports — User Only

Ports **5173** (frontend) and **3001** (backend) are reserved for the user's manual testing. Do not start `npm run dev` or `vite`. Use Playwright test suite for programmatic verification.

---

## Protocol Files (Detailed Procedures)

| File | When to Read |
|------|-------------|
| `PROTOCOLS/01_UI_STANDARDS.md` | Design tokens, color coding, typography, component patterns |
| `PROTOCOLS/02_VISX_CHARTS.md` | All chart implementations (@visx patterns, required packages) |
| `PROTOCOLS/03_TESTING.md` | Playwright commands, failure handling, viewport matrix |
| `PROTOCOLS/04_COMPONENT_ARCHITECTURE.md` | Layout hierarchy, key hooks, core components |

---

## Data Integrity

**READ FIRST:** Before modifying `frontend/src/types/` or `public/data/*.json`, consult `agents/DATA_GUARDRAILS.md`.

---

## Task Discovery

```bash
jq '.tasks[] | select(.responsible=="Frontend Engineer" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="new_approved")' tasks/tasks.json
```

After updating any task status: `make tasks-regen`
