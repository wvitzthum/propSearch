# Playwright Testing Protocol
*Reference from: agents/frontend_engineer/README.md — "Verification & Health Check"*

## Test Commands

```bash
cd frontend
npm run test          # Full test suite — gate on task completion
npm run test:smoke    # Quick smoke tests
npm run test:accessibility  # Accessibility checks
```

## Mandatory Gate

Before marking ANY task as **Done**, all tests must pass (or be documented as skipped with a known ticket reference). Running tests is **not optional** — it is a gate on task completion.

## Failure Handling

| Failure Type | Action |
|--------------|--------|
| Pre-existing bug (known ticket exists) | Document failing test + note blocking ticket ID in task notes |
| New regression introduced by your change | Fix the bug before completing the task — do NOT mark Done |
| Test has wrong selector but catches a real bug | File a QA ticket, do not ignore |
| Test environment backend issue (e.g. `Failed to fetch`) | Check `Tasks.md` — if no ticket exists, create one instead of adding test filters |

## Never Skip Tests

Do NOT use `test.skip()` unless:
1. You have confirmed the UI feature genuinely does not exist
2. You have logged a feature-gap ticket for the missing feature

## Viewport Testing

All layout/component tests must verify at minimum:
- 375px (mobile), 768px (tablet), 1280px (laptop), 1920px (desktop)

## Import Audit (Before Every PR)
Run a greps to verify no orphaned imports:
```bash
grep -r "import.*from.*'" frontend/src/ | grep -v ".test." | sort | uniq
```
