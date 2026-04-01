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

COL8_HDR  = "| ID | Priority | Effort | Task | Status | Responsible | Dependencies | Date |"
COL4_HDR_S = "| ID | Reason | Replaced By | Date |"
COL4_HDR_C = "| ID | Task | Resolved | Date |"


def load_json(path):
    with open(path) as f:
        return json.load(f)


def dep_str(deps):
    if not deps:
        return "None"
    return ", ".join(deps)


def _markdown_escape_cell(text):
    """
    Escape a markdown table cell so literal | and ` chars do not break table rendering.

    Strategy:
    - Escape ALL | chars with &#124;  (the universal fix — prevents any column-break risk
      from URLs, code snippets, or raw text containing pipe characters).
    - Replace `...` inline code spans with <code>...</code> HTML (GitHub/CommonMark both
      honour HTML in table cells, and <code> renders as monospace without the GFM pipe-in-
      backtick parsing issue that breaks tables in some viewers).
    """
    if not text:
        return ""
    # Escape all pipe chars first — safest universal approach
    text = text.replace("|", "&#124;")
    # Replace backtick-wrapped code spans with HTML <code> (pipe risk eliminated above)
    import re
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    return text


def row_8(task):
    deps = dep_str(task.get("dependencies") or [])
    status = task.get("status", "Todo")
    resp   = task.get("responsible") or ""
    title  = _markdown_escape_cell(task.get("title", ""))
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
    title = _markdown_escape_cell(task.get("title", ""))
    return (
        f"| {task['id']} | "
        f"{title} | "
        f"{task.get('replaced_by','')} | "
        f"{task.get('superseded_date','')} |"
    )


def _sep_row(cols):
    """Generate a properly-piped markdown table separator row."""
    return "| " + " | ".join(["---"] * cols) + " |"


def section_header(sid, cols):
    meta = SECTION_META.get(sid, {})
    title = meta.get("title", sid)
    sep = "---"
    if cols == 8:
        return f"\n{sep}\n\n## {title}\n\n{COL8_HDR}\n{_sep_row(8)}\n"
    else:
        return f"\n{sep}\n\n## {title}\n\n{COL4_HDR_S}\n{_sep_row(4)}\n"


def render_live(tasks_data):
    """Render live sections (excluding only 'superseded' which has its own 4-col table)."""
    all_tasks = tasks_data["tasks"]
    output = []
    for sid in ["new_approved", "bug_fixes", "data_research", "blocked"]:
        section_tasks = [t for t in all_tasks if t.get("section") == sid]
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
        f"\n{sep}\n\n## ✅ Completed\n\n{COL4_HDR_C}\n{_sep_row(4)}\n"
    ]
    for t in resolved:
        title = _markdown_escape_cell(t.get("title", ""))
        output.append(
            f"| {t['id']} | {title} | Done | {t.get('date','')} |"
        )
    return "\n".join(output)


def build_markdown(tasks_data, resolved_data):
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
        "# Pipe escaping: all | chars in task titles are escaped as &#124; to prevent",
        "# markdown table breakage. Backtick code spans are replaced with <code> HTML.",
        "#",
        "# See tasks/tasks_resolved.json for archived completed tasks.",
        "-->",
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
