# Task Management Protocol
*Reference from: agents/product_owner/README.md — "Task Workflow"*

## Single Source of Truth
`tasks/tasks.json` is the authoritative task list. All agents query this file.

## Task Discovery
```bash
jq '.tasks[] | select(.status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.responsible=="<Agent>" and .status=="Todo")' tasks/tasks.json
jq '.tasks[] | select(.section=="new_approved")' tasks/tasks.json
jq '.tasks[] | select(.priority=="High")' tasks/tasks.json
```

## Adding a Task

Add tasks directly to `tasks/tasks.json` — this is the PO's owned file.
Never edit `Tasks.md` directly — it is generated.

### Task Schema
```json
{
  "id": "FE-217",
  "priority": "High",
  "effort": "Medium",
  "section": "new_approved",
  "title": "Brief title — what to do",
  "status": "Todo",
  "responsible": "Frontend Engineer",
  "dependencies": ["UX-026"],
  "date": "2026-04-04",
  "notes": [
    "Detailed implementation brief...",
    "Reference: PROTOCOLS/01_UI_STANDARDS.md"
  ]
}
```

### Required Fields
- `id` — prefix (`FE-`, `UX-`, `DE-`, `DAT-`, `QA-`) + next number
- `section` — `new_approved`, `bug_fixes`, `data_research`, `completed`
- `status` — `Todo`, `In Progress`, `Done`
- `responsible` — agent assignment
- `notes` — detailed implementation brief (handoff documentation)

## After Any Task Change
```bash
make tasks-regen   # Regenerate Tasks.md from tasks.json
```

## Feature Specs
Write detailed acceptance criteria in `agents/product_owner/DECISIONS.md`, not in a separate file. Reference DECISIONS.md from the task's `notes` field.
