# Playwright Testing Protocol
*Reference from: agents/ui_ux_qa/README.md — "Automated Test Framework"*

## Test Location
`frontend/tests/` — Playwright (`@playwright/test`)

## Test Commands

```bash
cd frontend
npm test          # Full test suite
npm run test:smoke   # Quick smoke tests
npm run test:ui      # Interactive UI mode
```

## Viewport Test Matrix

Every layout/component test must cover:

| Viewport | Width | Purpose |
|----------|-------|---------|
| Mobile | 375px | Narrow phone |
| Tablet | 768px | iPad / small laptop |
| Laptop | 1280px | Standard workspace |
| Desktop | 1920px | Wide monitor |

## Bug → Ticket Workflow

When a test finds a bug:
1. Do NOT fix the bug — log it in `tasks/tasks.json`
2. Prefix with `FE-` for implementation tasks, `UX-` for UX enhancements
3. Assign to **Frontend Engineer** for implementation
4. Document: component, viewport, reproduction steps, expected vs. actual
5. Run `make tasks-regen`

## Test Failure Handling

| Scenario | Action |
|----------|--------|
| Pre-existing bug (ticket exists) | Note in report, continue audit |
| New regression | File `FE-` ticket for Frontend Engineer |
| Test selector wrong but bug real | File `QA-` ticket for selector fix |
| Backend data issue (no frontend bug) | File `DAT-` ticket for Data Analyst |

## Accessibility Testing
```bash
npm run test:accessibility   # Check WCAG compliance
```
All interactive elements must have:
- Visible focus states
- ARIA labels where needed
- Color contrast ≥ 4.5:1
