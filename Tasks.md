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
  <th align="left">Date</th>
</tr>
</thead>
<tbody>
<tr><td><strong>FE-166</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='UI: Build &#x27;Property Price Evolution&#x27; component — a Bloomberg-density price history visualization for PropertyDetail. Visualize the `price_history` table data (DAT-140) as an SVG area chart showing historical price movement per property with snapshot dates (2026-03-07 through 2026-03-30). Add: (1) price-per-sqm trend line overlay, (2) listing-to-sold pipeline delta markers, (3) price reduction event flags (dom, reduction_pct), (4) London-wide HPI benchmark line for the same period for comparison. Integrate into PropertyDetail tab. Requires `price_history` table data (already created by DE-140; requires DAT-140 backfill to populate).'>UI: Build &#x27;Property Price Evolution&#x27; component — a Bloomberg-density price history visualization for PropertyDetail. Visualize the <code>price_history</code> table data (DAT-140) as an SVG area chart showing historical price movement per property with snapshot dates (2026-03-07 through 2026-03-30). Add: (1) price-per-sqm trend line overlay, (2) listing-to-sold pipeline delta markers, (3) price reduction event flags (dom, reduction_pct), (4) London-wide HPI benchmark line for the same period for comparison. Integrate into PropertyDetail tab. Requires <code>price_history</code> table data (already created by DE-140; requires DAT-140 backfill to populate).</td><td>Todo</td><td>Frontend Engineer</td><td>DAT-140</td><td>2026-04-01</td></tr>
<tr><td><strong>FE-169</strong></td><td>High</td><td>High</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='UI: Deposit Configuration + Additional Purchase Costs on AffordabilitySettings — add user-configurable deposit (auto vs fixed), implement calculateTotalPurchaseCost hook (deposit + SDLT + solicitor fees + survey fees + mortgage arrangement fee), build AdditionalCostsCard component, add DepositPanel to AffordabilitySettings with % shortcut buttons, wire all to localStorage persistence, update BudgetSlider to reflect selected deposit percentage.'>UI: Deposit Configuration + Additional Purchase Costs on AffordabilitySettings — add user-configurable deposit (auto vs fixed), implement calculateTotalPurchaseCost hook (deposit + SDLT + solicitor fees + survey fees + mortgage arrangement fee), build AdditionalCostsCard component, add DepositPanel to AffordabilitySettings with % shortcut buttons, wire all to localStorage persistence, update BudgetSlider to reflect selected deposit percentage.</td><td>Todo</td><td>Frontend Engineer</td><td>FE-167</td><td>2026-04-01</td></tr>
<tr><td><strong>QA-166</strong></td><td>High</td><td>Low</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='QA: Verify deposit + additional costs flow on AffordabilitySettings — deposit panel renders in auto/fixed modes, SDLT calculates correctly at £400K FTB / £700K standard / £1.2M additional property price points, totalCashNeeded equals sum of all components, loan term change (FE-167) does not break costs display, LTV band updates reactively on deposit change.'>QA: Verify deposit + additional costs flow on AffordabilitySettings — deposit panel renders in auto/fixed modes, SDLT calculates correctly at £400K FTB / £700K standard / £1.2M additional property price points, totalCashNeeded equals sum of all components, loan term change (FE-167) does not break costs display, LTV band updates reactively on deposit change.</td><td>Todo</td><td>UI/UX QA</td><td>FE-169, FE-167</td><td>2026-04-01</td></tr>
</tbody>
</table>

## 🐛 Bug Fixes

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
  <th align="left">Date</th>
</tr>
</thead>
<tbody>
<tr><td><strong>QA-158</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='UI/UX Audit: After FE-162 (Market Conditions Radar), verify all new components render correctly on 1280px, 1440px, and 1920px viewport widths. Check MarketConditionsBar for horizontal overflow on narrow viewports. Verify AreaPerformanceTable column alignment. Validate SwapRateSignal sparkline renders in all themes. Confirm BoERatePathChart SVG fan chart scales without clipping. Report layout findings to Frontend Engineer as tickets.'>UI/UX Audit: After FE-162 (Market Conditions Radar), verify all new components render correctly on 1280px, 1440px, and 1920px viewport widths. Check MarketConditionsBar for horizontal overflow on narrow viewports. Verify AreaPerformanceTable column alignment. Validate SwapRateSignal sparkline renders in all themes. Confirm BoERatePathChart SVG fan chart scales without clipping. Report layout findings to Frontend Engineer as tickets.</td><td>Todo</td><td>UI/UX QA</td><td>FE-164</td><td>2026-04-01</td></tr>
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
  <th align="left">Date</th>
</tr>
</thead>
<tbody>
<tr><td><strong>FE-121</strong></td><td>High</td><td>Medium</td><td style='max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='UI: Implement regional heatmaps for London postcodes to visualize Micro-Market Velocity.'>UI: Implement regional heatmaps for London postcodes to visualize Micro-Market Velocity.</td><td>Todo</td><td>Frontend Engineer</td><td>DE-120</td><td>2026-03-21</td></tr>
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
</tbody>
</table>

> **Source:** `tasks/tasks.json`  |  **Archive:** `tasks/tasks_resolved.json`  |  **Generator:** `tasks/scripts/generate_tasks_markdown.py`