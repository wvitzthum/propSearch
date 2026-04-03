#!/usr/bin/env python3
"""
tasks/scripts/generate_tasks_markdown.py
========================================
Reads tasks/tasks.json and tasks/tasks_resolved.json and renders a human-readable
Tasks.md Markdown view using HTML <table> elements.

Why HTML tables?
  GFM pipe tables (| Col1 | Col2 |) break whenever a task title contains a | char —
  no amount of HTML-escaping fixes it, because the displayed | is re-parsed as a column
  delimiter by the markdown processor. HTML <table> elements are rendered directly as
  HTML by all major viewers (GitHub, GitLab, VS Code, GitHub Mobile) and are immune to
  pipe-character issues in content.

Usage:
  python3 tasks/scripts/generate_tasks_markdown.py            # stdout
  python3 tasks/scripts/generate_tasks_markdown.py --write   # overwrite Tasks.md

Agent workflow:
  jq '.tasks[] | select(.id=="DAT-155")'  tasks/tasks.json   # read a task
  jq '.tasks[] | select(.status=="Todo")' tasks/tasks.json     # all Todo
  python3 tasks/scripts/generate_tasks_markdown.py --write      # regenerate this file
"""

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TASKS_JSON = ROOT / "tasks" / "tasks.json"
RESOLVED_JSON = ROOT / "tasks" / "tasks_resolved.json"
OUTPUT = ROOT / "Tasks.md"

SECTION_META = {
    "new_approved":   {"title": "🆕 New Approved Features (2026-03-30)"},
    "bug_fixes":      {"title": "🐛 Bug Fixes"},
    "data_research":  {"title": "📊 Data & Research (Unblocked First)"},
    "ux_improvements":{"title": "🎨 UX Improvements"},
    "testing":        {"title": "🧪 Test Coverage"},
    "blocked":        {"title": "🔗 Blocked by Outstanding Data (Clear Dependencies)"},
    "superseded":     {"title": "⚠️ Superseded"},
    "completed":      {"title": "✅ Completed"},
}


# ── helpers ────────────────────────────────────────────────────────────────────

def load_json(path):
    with open(path) as f:
        return json.load(f)


def escape(text):
    """HTML-escape text for safe use inside table cells."""
    if text is None:
        return ""
    return html.escape(str(text))


def bold(text):
    """Wrap text in <strong>."""
    return f"<strong>{escape(text)}</strong>"


def code(text):
    """Render text as <code>."""
    if not text:
        return ""
    return f"<code>{escape(text)}</code>"


def render_inline_code(text):
    """Replace backtick-wrapped spans with <code> elements; HTML-escape everything else."""
    if not text:
        return ""
    text = escape(text)
    # Replace `code` with <code>code</code>
    text = re.sub(r'`([^`]+)`', lambda m: f"<code>{m.group(1)}</code>", text)
    return text


def dep_str(deps):
    if not deps:
        return "None"
    return ", ".join(deps)


# ── HTML table builders ───────────────────────────────────────────────────────

def extract_blocked_reason(task):
    """Extract first BLOCKED: line from notes as the blocked reason."""
    notes = task.get('notes', [])
    if isinstance(notes, list):
        for line in notes:
            if 'BLOCKED' in line.upper() or 'BLOCKED BY' in line.upper():
                # Strip prefix if present
                line = re.sub(r'BLOCKED:?\s*', '', line, flags=re.IGNORECASE)
                line = re.sub(r'BLOCKED BY:?\s*', '', line, flags=re.IGNORECASE)
                return line.strip()
    # Also check blocked_reason field
    reason = task.get('blocked_reason', '')
    if reason:
        return reason
    return ''


def html_row_8col(task):
    """8-column HTML row for new_approved / bug_fixes / data_research / blocked."""
    is_blocked = task.get('status') == 'Blocked'
    blocked_reason = extract_blocked_reason(task) if is_blocked else ''

    status_html = (
        f"<span style='color:#f59e0b;font-weight:bold'>⚠️ Blocked</span>"
        if is_blocked
        else escape(task.get('status', 'Todo'))
    )

    reason_html = (
        f"<span style='color:#ef4444;font-size:11px' title='{escape(blocked_reason)}'>"
        f"{escape(blocked_reason[:120])}</span>"
        if blocked_reason
        else ''
    )

    return (
        f"<tr>"
        f"<td>{bold(escape(task['id']))}</td>"
        f"<td>{escape(task.get('priority', '-'))}</td>"
        f"<td>{escape(task.get('effort', '-'))}</td>"
        f"<td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='{escape(task.get('title',''))}'>{render_inline_code(task.get('title',''))}</td>"
        f"<td>{status_html}</td>"
        f"<td>{escape(task.get('responsible') or '')}</td>"
        f"<td>{escape(dep_str(task.get('dependencies', [])))}</td>"
        f"<td>{reason_html}</td>"
        f"</tr>"
    )


def html_row_4col_superseded(task):
    return (
        f"<tr>"
        f"<td>{bold(escape(task['id']))}</td>"
        f"<td>{render_inline_code(task.get('title',''))}</td>"
        f"<td>{code(task.get('replaced_by',''))}</td>"
        f"<td>{escape(task.get('superseded_date',''))}</td>"
        f"</tr>"
    )


def html_row_4col_resolved(task):
    return (
        f"<tr>"
        f"<td>{bold(escape(task['id']))}</td>"
        f"<td>{render_inline_code(task.get('title',''))}</td>"
        f"<td>{escape(task.get('status', 'Done'))}</td>"
        f"<td>{escape(task.get('date',''))}</td>"
        f"</tr>"
    )


def html_table_8col(section_title, tasks):
    """8-column table: ID | Priority | Effort | Task | Status | Responsible | Dependencies | Block Reason"""
    rows = "\n".join(html_row_8col(t) for t in tasks)
    return f"""
## {section_title}

<table>
<thead>
<tr>
  <th align="left">ID</th>
  <th align="left">Priority</th>
  <th align="left">Effort</th>
  <th align="left" style="width:480px">Task</th>
  <th align="left">Status</th>
  <th align="left">Responsible</th>
  <th align="left">Dependencies</th>
  <th align="left">Block Reason / Notes</th>
</tr>
</thead>
<tbody>
{rows}
</tbody>
</table>"""


def html_table_4col_superseded(section_title, tasks):
    rows = "\n".join(html_row_4col_superseded(t) for t in tasks)
    return f"""
## {section_title}

<table>
<thead>
<tr>
  <th align="left">ID</th>
  <th align="left">Reason</th>
  <th align="left">Replaced By</th>
  <th align="left">Date</th>
</tr>
</thead>
<tbody>
{rows}
</tbody>
</table>"""


def html_table_4col_completed(section_title, tasks):
    rows = "\n".join(html_row_4col_resolved(t) for t in tasks)
    return f"""
## {section_title}

<table>
<thead>
<tr>
  <th align="left">ID</th>
  <th align="left">Task</th>
  <th align="left">Resolved</th>
  <th align="left">Date</th>
</tr>
</thead>
<tbody>
{rows}
</tbody>
</table>"""


# ── section renderers ─────────────────────────────────────────────────────────

def render_live(tasks_data):
    all_tasks = tasks_data["tasks"]
    parts = []
    # Standard sections filtered by section
    for sid in ["new_approved", "bug_fixes", "data_research", "ux_improvements", "testing"]:
        section_tasks = [t for t in all_tasks
                         if t.get("section") == sid
                         and t.get("status") != "Done"
                         and t.get("status") != "Blocked"]  # exclude blocked tasks
        if not section_tasks:
            continue
        meta = SECTION_META[sid]
        parts.append(html_table_8col(meta["title"], section_tasks))

    # Blocked tasks: filter by status="Blocked" across all sections
    blocked_tasks = [t for t in all_tasks if t.get("status") == "Blocked"]
    if blocked_tasks:
        parts.append(html_table_8col(SECTION_META["blocked"]["title"], blocked_tasks))

    return "\n".join(parts)


def render_superseded(tasks_data):
    section_tasks = [t for t in tasks_data["tasks"] if t.get("section") == "superseded"]
    if not section_tasks:
        return ""
    return html_table_4col_superseded(SECTION_META["superseded"]["title"], section_tasks)


def render_completed(resolved_data):
    resolved = resolved_data.get("resolved", [])
    if not resolved:
        return ""
    return html_table_4col_completed(SECTION_META["completed"]["title"], resolved)


# ── entry point ────────────────────────────────────────────────────────────────

def build_markdown(tasks_data, resolved_data):
    return (
        "# propSearch: Active Backlog\n"
        + "<!--\n"
        + "# This file is GENERATED from tasks/tasks.json\n"
        + "# DO NOT EDIT BY HAND — your changes will be overwritten.\n"
        + "#\n"
        + "# Agent workflow (jq — always read/write tasks.json directly):\n"
        + "#   jq '.tasks[] | select(.id==\"DAT-155\")'  tasks/tasks.json\n"
        + "#   jq '.tasks[] | select(.status==\"Todo\")' tasks/tasks.json\n"
        + "#   python3 tasks/scripts/generate_tasks_markdown.py --write   # regenerate this file\n"
        + "#\n"
        + "# Tables use HTML <table> markup — immune to pipe chars in task titles.\n"
        + "# See tasks/tasks_resolved.json for archived completed tasks.\n"
        + "-->\n"
        + "\n"
        + render_live(tasks_data) + "\n"
        + render_superseded(tasks_data) + "\n"
        + render_completed(resolved_data) + "\n"
        + "\n"
        + "> **Source:** `tasks/tasks.json`  |  **Archive:** `tasks/tasks_resolved.json`  |  "
        + "**Generator:** `tasks/scripts/generate_tasks_markdown.py`"
    )


def main():
    write = "--write" in sys.argv
    tasks_data    = load_json(TASKS_JSON)
    resolved_data = load_json(RESOLVED_JSON)
    md = build_markdown(tasks_data, resolved_data)
    if write:
        OUTPUT.write_text(md)
        n = len(tasks_data["tasks"])
        print(f"✓ Tasks.md written ({len(md):,} bytes) — {n} tasks processed.")
    else:
        print(md)


if __name__ == "__main__":
    main()
