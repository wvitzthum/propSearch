# Audit Workflow Protocol
*Reference from: agents/ui_ux_qa/README.md — sections "Responsibilities", "Workflow"*

## When to Conduct an Audit
- Before any major UI feature or redesign
- After Frontend Engineer marks a task Done — verify implementation
- Periodically (weekly): functional regression check on core pages
- On user request: specific component or page issue

## Audit Types

### Functional Audit
Verify: filters, sorting, links, form submissions, state transitions.
Use Playwright to automate functional tests. Log failures as `FE-` tickets.

### Aesthetic Audit
Verify: Bloomberg (contrast, data density) and Linear (precision, spacing).
- Check color coding matches design tokens
- Check font sizes are readable at 320px–1920px
- Check no orphaned imports or duplicate components

### UX Analysis
Identify: UX issues, design improved workflows, document root causes.
- Write detailed `notes` in `tasks/tasks.json` — this is implementation handoff
- Prefix UX enhancement tasks with `UX-`
- Prefix implementation tasks with `FE-`

## Audit Report Template

When writing a new audit report, use `DATA_AUDIT_TEMPLATE.md` as the base.
Structure:
1. **Summary** — what was tested, viewport range, date
2. **Findings** — issue ID (QA-*), component, severity, reproduction steps
3. **Recommendations** — prioritized fixes with estimated effort
4. **Viewport Test Results** — table: component × viewport (375/768/1280/1920)
5. **Resolved Items** — what was fixed since last audit

## Task Creation from Audit

```bash
# Find next available QA ID
jq '.tasks[] | select(.id | startswith("QA-")) | .id' tasks/tasks.json | \
  grep -oP 'QA-\d+' | sort -t'-' -k2 -n | tail -1

# Create task with detailed implementation brief in notes
# Run: make tasks-regen after any task.json change
```

## Metric Clarity Audit
Every metric displayed in the UI must have a tooltip with:
- **Definition:** What the metric measures
- **Methodology:** How it is calculated
- **Source:** Where the data comes from
If a tooltip is missing or unclear, log a `UX-` ticket.

## Report Filing
After completing an audit:
1. Save report as `REPORT_YYYY-MM-DD_QA_AUDIT.md` in `agents/ui_ux_qa/`
2. Create tickets for all findings
3. Run `make tasks-regen`
4. Flag superseded reports: move to `REPORTS_ARCHIVE/` directory
