#!/usr/bin/env python3
"""
tasks/scripts/generate_tasks_markdown.py
========================================
Reads tasks/tasks.json and tasks/tasks_resolved.json and renders a human-readable
Tasks.md Markdown view.

Usage:
  python3 tasks/scripts/generate_tasks_markdown.py            # stdout
  python3 tasks/scripts/generate_tasks_markdown.py --write   # overwrite Tasks.md

Token-efficiency note:
  Agents use 'jq' (via RTK) for surgical task reads from tasks.json directly.
  This script is for human consumption only — not read by agents.
  RTK-optimised query examples:
    jq '.tasks[] | select(.id=="DAT-155")'  tasks/tasks.json
    jq '.tasks[] | select(.status=="Todo")' tasks/tasks.json
    jq '.tasks[] | select(.section=="data_research" and .status=="Todo")' tasks/tasks.json
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TASKS_JSON = ROOT / "tasks" / "tasks.json"
RESOLVED_JSON = ROOT / "tasks" / "tasks_resolved.json"
OUTPUT = ROOT / "Tasks.md"

SECTION_META = {
    "new_approved": {"title": "🆕 New Approved Features (2026-03-30)", "cols": 8},
    "bug_fixes":    {"title": "🐛 Bug Fixes",                           "cols": 8},
    "data_research": {"title": "📊 Data & Research (Unblocked First)",  "cols": 8},
    "blocked":      {"title": "🔗 Blocked by Outstanding Data (Clear Dependencies)", "cols": 8},
    "superseded":   {"title": "⚠️ Superseded",                          "cols": 4},
    "completed":    {"title": "✅ Completed",                            "cols": 4},
}

COL9_HDR  = "| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |"
COL9_SEP  = "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
COL8_HDR  = "| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |"
COL8_SEP  = "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
COL4_HDR_S = "| ID | Reason | Replaced By | Date |"
COL4_SEP_S = "| --- | --- | --- | --- |"
COL4_HDR_C = "| ID | Task | Resolved | Date |"
COL4_SEP_C = "| --- | --- | --- | --- |"


def load_json(path):
    with open(path) as f:
        return json.load(f)


def dep_str(deps):
    if not deps:
        return "None"
    return ", ".join(deps)


def row_8(task):
    deps = dep_str(task.get("dependencies") or [])
    status = task.get("status", "Todo")
    resp   = task.get("responsible") or ""
    title  = task.get("title", "")
    return (
        f"| {task['id']} | "
        f"{task.get('priority','-')} | "
        f"{task.get('effort','-')} | "
        f"{title} | "
        f"{status} | "
        f"{resp} | "
        f"{deps} | "
        f"{task.get('date','')} |"
    )


def row_4_superseded(task):
    return (
        f"| {task['id']} | "
        f"{task.get('title','')} | "
        f"{task.get('replaced_by','')} | "
        f"{task.get('superseded_date','')} |"
    )


def section_header(sid, cols):
    meta = SECTION_META.get(sid, {})
    title = meta.get("title", sid)
    sep = "---"
    if cols == 8:
        return f"\n{sep}\n\n## {title}\n\n{COL8_HDR}\n{COL8_SEP}\n"
    else:
        return f"\n{sep}\n\n## {title}\n\n{COL4_HDR_S}\n{COL4_SEP_S}\n"


def render_live(tasks_data):
    """Render the live (non-Done, non-superseded) sections."""
    all_tasks = tasks_data["tasks"]
    output = []
    for sid in ["new_approved", "bug_fixes", "data_research", "blocked"]:
        section_tasks = [t for t in all_tasks
                         if t.get("section") == sid
                         and t.get("status") != "Done"]
        if not section_tasks:
            continue
        output.append(section_header(sid, 8))
        for t in section_tasks:
            output.append(row_8(t))
    return "\n".join(output)


def render_superseded(tasks_data):
    section_tasks = [t for t in tasks_data["tasks"] if t.get("section") == "superseded"]
    if not section_tasks:
        return ""
    output = [section_header("superseded", 4)]
    for t in section_tasks:
        output.append(row_4_superseded(t))
    return "\n".join(output)


def render_completed(resolved):
    """Render completed tasks from tasks_resolved.json."""
    if not resolved:
        return ""
    sep = "---"
    output = [
        f"\n{sep}\n\n## ✅ Completed\n\n{COL4_HDR_C}\n{COL4_SEP_C}\n"
    ]
    for t in resolved:
        output.append(
            f"| {t['id']} | {t.get('title','')} | Done | {t.get('date','')} |"
        )
    return "\n".join(output)


def build_markdown(tasks_data, resolved_data):
    live_tasks    = [t for t in tasks_data["tasks"] if t.get("status") not in ("Done",)]
    superseded    = [t for t in tasks_data["tasks"] if t.get("section") == "superseded"]
    resolved_list = resolved_data.get("resolved", [])

    lines = [
        "# propSearch: Active Backlog",
        "<!--",
        "# This file is GENERATED from tasks/tasks.json",
        "# DO NOT EDIT BY HAND — your changes will be overwritten.",
        "#",
        "# Agent workflow:",
        "#   jq '.tasks[] | select(.id==\"DAT-155\")'  tasks/tasks.json  # read a task",
        "#   jq '.tasks[] | select(.status==\"Todo\")' tasks/tasks.json  # list all Todo",
        "#   python3 tasks/scripts/generate_tasks_markdown.py --write  # regenerate this file",
        "#",
        "# Section format rules (8-col rows vs 4-col rows) are handled by the generator.",
        "# See tasks/tasks_resolved.json for archived completed tasks.",
        "-->",
        "",
        COL9_HDR,
        COL9_SEP,
        "",
        render_live(tasks_data),
        render_superseded(tasks_data),
        render_completed(resolved_list),
        "",
        "> **Source:** `tasks/tasks.json`  |  **Archive:** `tasks/tasks_resolved.json`  |  **Generator:** `tasks/scripts/generate_tasks_markdown.py`",
    ]
    return "\n".join(lines)


def main():
    write = "--write" in sys.argv

    tasks_data   = load_json(TASKS_JSON)
    resolved_data = load_json(RESOLVED_JSON)

    md = build_markdown(tasks_data, resolved_data)

    if write:
        OUTPUT.write_text(md)
        print(f"✓ Tasks.md written ({len(md):,} bytes) — {len(tasks_data['tasks'])} tasks processed.")
    else:
        print(md)


if __name__ == "__main__":
    main()
