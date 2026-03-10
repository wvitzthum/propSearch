# propSearch: Dashboard QA Tasks & Bug Tracking

## Agent Protocol: Mission Control
> **Protocol:** Every Gemini CLI turn MUST start by scanning the `Active Backlog`. 
> **Source of Truth:** This file is the primary command hub. Discrepancies between tasks here and other docs MUST be flagged.

### 1. Unified Task Lifecycle
1.  **Select:** Identify the highest priority `Pending` task for your role (e.g., `Data Engineer`, `Frontend Engineer`).
2.  **Claim:** Change status to `In Progress`.
3.  **Execute:** Follow specialized instructions in your `agents/<role>/README.md`.
4.  **Verify:** Run validation (build/lint/QA).
5.  **Resolve:** Mark as `Done` and move to the `Resolved` table at the bottom.
6.  **Chain:** Create new tasks for other agents if your work requires follow-up (e.g., Data changes requiring UI updates).

### 2. Universal Agent Constraints
- **RTK Proxy:** MANDATORY for `npm install`, `build`, `lint`, and large `grep` calls i.e. `rtx tsc` for typescript build and lint.
- **Write Access:** Adhere strictly to territorial boundaries in `GEMINI.md`.
- **No Hallucinations:** Use only empirical property data; no synthetic mocks without user approval.
- **Aesthetic:** All UI changes must adhere to "Bloomberg Terminal meets Linear" standards.

### 3. Quick Reference: Agent Roles
- **Product Owner:** Strategy, requirements, and feature discovery.
- **Data Analyst:** Research, Alpha scoring, and market trends.
- **Data Engineer:** SQLite, API, ingestion, and schema integrity.
- **Frontend Engineer:** Dashboard UI, visual hierarchy, and React hooks.
- **UI/UX QA:** Audits, bug logging, and contrast/usability verification.

---

## Active Backlog
| ID | Priority | Effort | Task | Status | Responsible | Reported By | Dependencies | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DAT-070 | High | Medium | Data Analysis: Audit current Alpha Scores and suggest refinement to "Spatial" weight based on 2026 Tube connectivity. | Pending | Data Analyst | Product Owner | - | 2026-03-09 |

> **Internal Note:** Remaining build/lint issues are being tracked as individual tasks instead of sub-agent delegation to ensure surgical execution and context preservation.

---

## Resolved
| ID | Priority | Effort | Task | Status | Responsible | Resolved By | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FE-087 | Critical | High | UI Overhaul: Replace MortgageTracker SVGs with high-fidelity, interactive charts (Recharts or refined SVG). Implement crosshair sync, dynamic scaling, and multi-series toggles. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-085 | High | Medium | UI/UX Refinement: Normalize typography and color variables across `MortgageTracker`, `Dashboard`, and `PropertyTable` based on `REPORT_2026_03_10_AUDIT.md`. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| DAT-085 | High | Medium | Data: Processed 13 new leads from `new-leads.jsonl`. Enriched 3 high-fidelity assets (Highbury, Finchley Rd, Goldhurst) and triaged 7 to Inbox. | Done | Data Analyst | Data Analyst | 2026-03-10 |
| FE-086 | High | Low | UI: Investigate and implement Iframe/Embed in Lead Inbox for property portals (Note: Many portals block X-Frame-Options). | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| QA-036 | Critical | Low | UX Audit: Thorough assessment of `MortgageTracker.tsx` (Graph quality, font uniformity, overall usability). | Done | UI/UX QA | UI/UX QA | 2026-03-10 |
| DAT-084 | Med | Med | DevOps: Configure Vercel/GitHub Actions for automated demo deployment with `VITE_DEMO_MODE=true`. | Done | Data Engineer | Data Engineer | 2026-03-10 |
| FE-078 | High | Medium | UX Enhancement: Polish "Discovery Dashboard" interaction patterns and visual hierarchy. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-074 | High | Medium | UI: Implement "CAPEX & Retrofit Node" in `PropertyDetail.tsx` to visualize EPC improvement path and costs. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-080 | High | Med | UI: Implement `VITE_DEMO_MODE` logic in all data hooks to support serverless deployment via static JSON. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-081 | High | Low | UI Fix: Resolve `possibly undefined` errors in `MarketPulse.tsx` with optional chaining. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-082 | High | Low | UI Fix: Resolve missing imports (`LoadingNode`, `ExternalLink`, `TrendingUp`) across `ComparisonPage`, `Dashboard`, and `PropertyDetail`. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-083 | High | Low | Cleanup: Remove unused variables and imports identified in build (`Bell`, `InboxIcon`, `Activity`, etc.). | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| DAT-082 | Critical | High | Migration: Refactor all Agent READMEs and documentation from DuckDB to SQLite. Remove DuckDB npm dependency from package.json. | Done | Data Engineer | Data Engineer | 2026-03-10 |
| DAT-083 | High | Med | Data: Create static dummy datasets in `frontend/public/data/` (`demo_master.json`, `macro_trend.json`, `financial_context.json`). | Done | Data Engineer | Data Engineer | 2026-03-10 |
| DE-084 | High | Low | Data Infrastructure: Add `monthly_budget` (default 4500) and `mortgage_term` (default 25) to `financial_context.json`. | Done | Data Engineer | Data Engineer | 2026-03-10 |
| DAT-076 | Critical | Medium | Infrastructure: Stabilize `initializeDB` in `server/index.js` and resolve SQLite connection/locking issues. | Done | Data Engineer | Data Engineer | 2026-03-09 |
| DAT-075 | EMERGENCY | Low | Data Purge: Delete all assets from SQLite `properties` that lack `sqft` or `epc` to fix dashboard pollution. | Done | Data Engineer | Data Engineer | 2026-03-09 |
| DAT-081 | High | Low | Schema: Add `epc_improvement_potential` and `est_cape_requirement` fields to `property.schema.json` and SQLite. | Done | Data Engineer | Data Engineer | 2026-03-09 |
| FE-065 | High | Medium | UI Optimization: Update `useProperties` to utilize server-side filtering and pagination via SQLite. | Done | Data Engineer | Data Engineer | 2026-03-09 |
| DAT-080 | Medium | Medium | Data: Source and integrate 60%, 75%, and 85% LTV mortgage rate history into `macro_trend.json` / SQLite. | Done | Data Engineer | Data Engineer | 2026-03-09 |
| PO-001 | Med | Low | Requirements: Define Public Demo data standards and aesthetic guardrails for the slim/dummy version. | Done | Product Owner | Product Owner | 2026-03-10 |
| FE-077 | High | Medium | UI Fix: Restore Metro lines on Dashboard Map. Verify `/api/london-metro` and SQLite data. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-075 | Critical | Medium | UI Resilience: Implement null-safety in `AlphaBadge`, `PropertyTable`, and `PreviewDrawer` to prevent crashes on shallow data. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-071 | High | Medium | UI: Replace hardcoded metrics in `MortgageTracker.tsx` (12M PPI Delta, Peak/Low) with dynamic calculations from `mortgage_history`. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-072 | Medium | Low | UI: Add Y-axis scale labels and interactive hover tooltips to all SVG charts in `MortgageTracker.tsx`. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-073 | Medium | Medium | UI: Expand LTV Arbitrage Matrix to display multiple LTV bands (60%, 75%, 85%, 90%). | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-076 | Medium | Low | UI: Add "Data Quality" indicator to assets in the Table view (e.g., a "Shallow" or "Needs Enrichment" tag). | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| FE-079 | High | High | UI Overhaul: Rewrite Mortgage Tracker charts and unify typography/font-sizing. | Done | Frontend Engineer | Frontend Engineer | 2026-03-10 |
| DAT-074 | High | High | Data Enrichment: 33 new external leads from `new_leads.jsonp` imported to Inbox and area-mapped. | Done | Data Analyst | Data Analyst | 2026-03-09 |
