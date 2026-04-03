# propSearch: Active Backlog
<!--
# This file is GENERATED from tasks/tasks.json
# DO NOT EDIT BY HAND — your changes will be overwritten.
#
# Agent workflow (jq — always read/write tasks.json directly):
#   jq '.tasks[] | select(.id=="DAT-155")'  tasks/tasks.json
#   jq '.tasks[] | select(.status=="Todo")' tasks/tasks.json
#   python3 tasks/scripts/generate_tasks_markdown.py --write   # regenerate this file
#
# Tables use HTML <table> markup — immune to pipe chars in task titles.
# See tasks/tasks_resolved.json for archived completed tasks.
-->


## 🆕 New Approved Features (2026-03-30)

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
<tr><td><strong>FE-194</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='FE: Audit and complete demo data files in frontend/public/data/ -- full demo mode'>FE: Audit and complete demo data files in frontend/public/data/ -- full demo mode</td><td>Todo</td><td>Frontend Engineer</td><td>None</td><td></td></tr>
<tr><td><strong>FE-195</strong></td><td>Medium</td><td>Low</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='FE: Create mock inbox leads data for demo mode'>FE: Create mock inbox leads data for demo mode</td><td>Todo</td><td>Frontend Engineer</td><td>FE-194</td><td></td></tr>
<tr><td><strong>FE-196</strong></td><td>Medium</td><td>Low</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='FE: Add DEMO_MODE indicator to UI -- show when running in demo mode'>FE: Add DEMO_MODE indicator to UI -- show when running in demo mode</td><td>Todo</td><td>Frontend Engineer</td><td>FE-194</td><td></td></tr>
</tbody>
</table>

## 📊 Data & Research (Unblocked First)

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
<tr><td><strong>DAT-178</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Source 10-year mortgage rate history by LTV band — for long-range affordability context'>Source 10-year mortgage rate history by LTV band — for long-range affordability context</td><td>In Progress</td><td>Data Analyst</td><td>None</td><td></td></tr>
<tr><td><strong>DAT-180</strong></td><td>Medium</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Source rental yield history by London area — critical for investment thesis validation'>Source rental yield history by London area — critical for investment thesis validation</td><td>Todo</td><td>Data Analyst</td><td>None</td><td></td></tr>
<tr><td><strong>DAT-181</strong></td><td>Medium</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Source London prime premium vs Greater London discount history — tracks London premium erosion/recovery'>Source London prime premium vs Greater London discount history — tracks London premium erosion/recovery</td><td>Todo</td><td>Data Analyst</td><td>DAT-176</td><td></td></tr>
<tr><td><strong>DAT-183</strong></td><td>Low</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Source foreign buyer activity and international capital flows into London prime residential'>Source foreign buyer activity and international capital flows into London prime residential</td><td>Todo</td><td>Data Analyst</td><td>DAT-181</td><td></td></tr>
<tr><td><strong>DAT-185</strong></td><td>High</td><td>Low</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Data Analyst: Review and fix Area Performance Data -- gaps in area_trends'>Data Analyst: Review and fix Area Performance Data -- gaps in area_trends</td><td>Todo</td><td>Data Analyst</td><td>None</td><td></td></tr>
</tbody>
</table>

## 🧪 Test Coverage

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
<tr><td><strong>QA-188</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Plan and write Playwright tests for HPI Trajectory Chart (FE-188)'>QA: Plan and write Playwright tests for HPI Trajectory Chart (FE-188)</td><td>Todo</td><td>UI/UX QA</td><td>FE-188</td><td></td></tr>
<tr><td><strong>QA-189</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Plan and write Playwright tests for Property Type Segment Performance chart (FE-189)'>QA: Plan and write Playwright tests for Property Type Segment Performance chart (FE-189)</td><td>Todo</td><td>UI/UX QA</td><td>FE-189</td><td></td></tr>
<tr><td><strong>QA-190</strong></td><td>High</td><td>Low</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Write Playwright tests for SwapRateSignal 10-year sparkline extension (FE-190)'>QA: Write Playwright tests for SwapRateSignal 10-year sparkline extension (FE-190)</td><td>Todo</td><td>UI/UX QA</td><td>FE-190</td><td></td></tr>
<tr><td><strong>QA-191</strong></td><td>Medium</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Write Playwright tests for London Prime Premium tracker (FE-191)'>QA: Write Playwright tests for London Prime Premium tracker (FE-191)</td><td>Todo</td><td>UI/UX QA</td><td>FE-191</td><td></td></tr>
<tr><td><strong>QA-192</strong></td><td>Medium</td><td>Low</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Write Playwright tests for Rental Yield vs Gilt yield comparison chart (FE-192)'>QA: Write Playwright tests for Rental Yield vs Gilt yield comparison chart (FE-192)</td><td>Todo</td><td>UI/UX QA</td><td>FE-192</td><td></td></tr>
<tr><td><strong>QA-193</strong></td><td>Medium</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Write Playwright tests for EPC/MEES Risk Map (FE-193)'>QA: Write Playwright tests for EPC/MEES Risk Map (FE-193)</td><td>Todo</td><td>UI/UX QA</td><td>FE-193</td><td></td></tr>
</tbody>
</table>

## 🔗 Blocked by Outstanding Data (Clear Dependencies)

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
<tr><td><strong>DAT-177</strong></td><td>High</td><td>High</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Source London property price indexed by bedroom type — 1-bed, 2-bed, 3-bed, detached premiums and trends'>Source London property price indexed by bedroom type — 1-bed, 2-bed, 3-bed, detached premiums and trends</td><td><span style='color:#f59e0b;font-weight:bold'>⚠️ Blocked</span></td><td>Data Analyst</td><td>DAT-176</td><td></td></tr>
<tr><td><strong>DAT-182</strong></td><td>Medium</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='Source EPC energy efficiency distribution by London area — MEES deadline risk mapping'>Source EPC energy efficiency distribution by London area — MEES deadline risk mapping</td><td><span style='color:#f59e0b;font-weight:bold'>⚠️ Blocked</span></td><td>Data Analyst</td><td>None</td><td></td></tr>
</tbody>
</table>

## ⚠️ Superseded

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
<tr><td><strong>FE-151</strong></td><td>Reverse Mortgage Calculator scope fully covered by the dedicated Affordability Settings page in FE-161. The LTV Match Score badges and Budget Slider are now part of FE-161&#x27;s shared hook scope.</td><td><code>FE-161</code></td><td>2026-03-30</td></tr>
<tr><td><strong>FE-175</strong></td><td>UI: Implement 5-page routing structure and sidebar navigation. Based on QA-175 UX brief: (1) Set up React Router (or existing routing) with routes: /dashboard, /properties, /map, /inbox, /comparison; (2) Rebuild sidebar/header nav to use the structure and icon set from QA-175; (3) Implement a persistent Comparison Bar (fixed bottom) across all pages; (4) Ensure the global command menu (Cmd+K) routes to all 5 pages; (5) Migrate existing page logic into the new structure — absorb PropertyTable, PropertyGrid, MapView, ComparisonPage, Inbox into their respective route pages; (6) Preserve all existing functionality — no feature regressions.</td><td></td><td></td></tr>
<tr><td><strong>FE-176</strong></td><td>UI: Build dedicated Properties page (/properties). Implement a high-density property management page as the primary data surface: (1) Table/Grid toggle with keyboard shortcut (T/G); (2) Institutional sorting: Alpha Score (default), Price/SQFT, Days on Market, MOS, Appreciation Potential, Commute Utility; (3) Column management: allow user to show/hide columns; (4) Filter panel: by area (SW3, NW1, NW3, W2), status (Shortlisted/Vetted/Archived), price range, sqft, Alpha Score threshold; (5) Batch selection with keyboard shortcuts for bulk status changes; (6) Inline status badge editing; (7) Property card in grid mode shows: hero image, price, sqft, Alpha Score, Area, tenure, key tags. Match Bloomberg density + Linear precision aesthetic.</td><td></td><td></td></tr>
<tr><td><strong>FE-177</strong></td><td>UI: Build Dashboard / Landing page (/dashboard). Implement the high-level Market Situation Room as the entry point: (1) Market Pulse KPIs: HPI trend (MoM/YoY), Months of Supply, Negotiation Delta, Inventory Velocity — all with sparklines; (2) BoE Rate Tracker: current rate, 12-month trend, MPC countdown; (3) Comparison Basket preview: show top 3-5 shortlisted properties with key deltas; (4) Recent Inbox activity: last 5 leads with quick-approve/reject actions; (5) Quick-add property submission widget (URL paste); (6) Data freshness indicator (green/amber/red). Bloomberg density with clear visual hierarchy — user lands here and immediately understands market state and portfolio position.</td><td></td><td></td></tr>
<tr><td><strong>FE-178</strong></td><td>UI: Build dedicated Map page (/map). Implement a full-viewport map page as a standalone route: (1) Carto Dark Matter base tiles; (2) Property markers with Alpha Score color coding (high=green, medium=amber, low=red); (3) Shortlisted properties visually distinguished (larger marker, glow effect); (4) London metro geojson overlay (Tube + Overground lines, subtle weight); (5) Park/shading overlays; (6) Marker click → slide-in property card (not full page nav); (7) Filter controls overlay: area toggle, status filter, Alpha threshold slider; (8) Full-screen toggle. Map should be the primary spatial intelligence layer — not buried inside a dashboard tab.</td><td></td><td></td></tr>
<tr><td><strong>FE-179</strong></td><td>UI: Migrate and enhance Comparison page (/comparison). Refactor the existing ComparisonPage into the new routing structure: (1) Persistent comparison basket (items added from any page) — share state via global useComparison hook; (2) High-density matrix grid: KPI row highlighting (winner per row); (3) Visual delta view: percentage delta relative to group average; (4) Image sync: hovering a data cell highlights the corresponding property thumbnail; (5) Remove/add properties from the matrix via sidebar panel; (6) Analyst Notes editor per property within the matrix. Maintain Bloomberg density — this is a decision-engine, not a summary view.</td><td></td><td></td></tr>
<tr><td><strong>FE-180</strong></td><td>UI: Migrate and polish Lead Inbox page (/inbox). Refactor Inbox into a standalone route with full keyboard-centric triage workflow: (1) Split-pane layout: left = scrollable lead list with quick-scan metrics (price, area, source), right = deep-review card with gallery, raw data, and portal links; (2) Keyboard navigation: Up/Down through list, A=Approve, R=Reject, L=Open portal link, Esc=close; (3) Batch mode: multi-select leads and bulk Approve/Reject; (4) Status badges per lead: Pending/Processing/Approved/Rejected; (5) Embedded portal preview via Focused Peek (from FE-089); (6) Submission history panel for manually submitted URLs; (7) Source attribution badges. Migrate existing Inbox.tsx logic into the new route structure.</td><td></td><td></td></tr>
<tr><td><strong>FE-181</strong></td><td>UI: Surface archived properties in table/grid with a status filter and fix the broken Dashboard toggle. (1) PropertyContext fix: Add <code>archived?: boolean</code> to <code>PropertyFilters</code> interface and pass <code>?archived=true</code> URL param to GET /api/properties when set. This unblocks all downstream archived visibility. (2) Properties page (FE-176): Add an &#x27;Archived&#x27; option to the status filter panel alongside Discovered/Shortlisted/Vetted — when selected, the table/grid renders only <code>archived=1</code> records. (3) Archived property rows: render with a distinct visual treatment (muted row opacity, rose/archive badge, PipelineTracker showing &#x27;archived&#x27; step). (4) PipelineTracker: when viewing archived properties, display the &#x27;Archived&#x27; step as the current active step. (5) Archive/unarchive action: retain the unarchive toggle in PropertyTable (rotates to active state) and the archive action in PropertyRow. (6) Dashboard.tsx showArchived toggle: refactor to use <code>updateFilters({ archived: true/false })</code> instead of client-side pipeline.getStatus() filtering — the client-side approach never worked because the API was never called with ?archived=true. (7) URL persistence: <code>?status=archived</code> in the Properties page URL so archived view is linkable and survives refresh.</td><td></td><td></td></tr>
</tbody>
</table>

## ✅ Completed

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
<tr><td><strong>QA-156</strong></td><td>Data: 4 Legacy Migration properties have malformed UUIDs (<code>c1a2b3c4...</code>, <code>d2e3f4g5...</code>, <code>e3f4g5h6...</code>, <code>1773181669681</code>). These IDs contain non-hex characters or numeric-only format, violating UUID spec. Regenerate proper UUIDs for all 4 records in <code>propSearch.db</code>. All are <code>source=&#x27;Legacy Migration&#x27;</code>.</td><td>Done</td><td></td></tr>
<tr><td><strong>QA-155</strong></td><td>Audit: Quarterly data integrity audit — scan all records in <code>propSearch.db</code> and <code>master.jsonl</code> for hallucinated IDs (<code>a1b2c3d4-</code> pattern), missing mandatory fields, and records with <code>is_estimated=false</code> but no source citation. Report findings to user.</td><td>Done</td><td></td></tr>
<tr><td><strong>DE-140</strong></td><td>Create <code>price_history</code> table and update sync pipeline</td><td>Done</td><td>2026-03-21</td></tr>
<tr><td><strong>FE-091</strong></td><td>Fix Floorplan view (image clipping + drag-to-pan) and repair Image Carousel</td><td>Done</td><td>2026-03-21</td></tr>
<tr><td><strong>DE-130</strong></td><td>Expand <code>macro_trend.json</code> with <code>sdlt_countdown</code> and <code>epc_deadline_risk</code></td><td>Done</td><td>2026-03-21</td></tr>
<tr><td><strong>DE-120</strong></td><td>Create SQLite analytical views for <code>regional_velocity</code></td><td>Done</td><td>2026-03-21</td></tr>
<tr><td><strong>FE-090</strong></td><td>Implement Floorplan preview in Lead Inbox and Property Detail tab</td><td>Done</td><td>2026-03-21</td></tr>
<tr><td><strong>DE-110</strong></td><td>Implement <code>/api/inbox/batch</code> for bulk triage and schema sync</td><td>Done</td><td>2026-03-20</td></tr>
<tr><td><strong>DAT-070</strong></td><td>Data Analysis: Audit current Alpha Scores and suggest refinement to &#x27;Spatial&#x27; weight based on 2026 Tube connectivity.</td><td>Done</td><td>2026-03-09</td></tr>
<tr><td><strong>DAT-090</strong></td><td>Data: Research and implement floorplan-specific extraction from portal JSON blobs (Rightmove/Zoopla).</td><td>Done</td><td>2026-03-16</td></tr>
<tr><td><strong>DAT-095</strong></td><td>Data: Enriched Hatherley Grove property (W2) with high-fidelity Alpha Score (8.54) and live data.</td><td>Done</td><td>2026-03-18</td></tr>
<tr><td><strong>FE-088</strong></td><td>UI Fix: Resolve React DOM nesting error in <code>PropertyTable.tsx</code> by refactoring to a two-row header for &#x27;Acquisition Model&#x27; grouping.</td><td>Done</td><td>2026-03-16</td></tr>
<tr><td><strong>FE-089</strong></td><td>UI/UX: Enhance <code>Inbox.tsx</code> to gracefully handle CSP framing blocks from property portals. Added detection for known blockers and a prominent &#x27;Focused Peek&#x27; workflow.</td><td>Done</td><td>2026-03-16</td></tr>
<tr><td><strong>UX-028</strong></td><td>UX Enhancement: Market Intel — Area Heat map data not populated, show meaningful empty state</td><td>Done</td><td></td></tr>
<tr><td><strong>DE-166</strong></td><td>BUG: area_trends parsing broken — object keyed by area name, not array</td><td>Done</td><td></td></tr>
</tbody>
</table>

> **Source:** `tasks/tasks.json`  |  **Archive:** `tasks/tasks_resolved.json`  |  **Generator:** `tasks/scripts/generate_tasks_markdown.py`