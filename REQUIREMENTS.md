# propSearch: High-Level Project Requirements

## Strategic Goal
To build a private, high-precision research tool that enables a single buyer to find and acquire a specific prime London property for personal residential use.

---

## Core Pillars

### 1. Data Integrity & Scoring (The Data Analyst)
- **Requirement:** The system must surface "high-signal" properties based on strict criteria.
- **Data Authenticity:** All data (Pricing, Metrics, Images) must be empirical and sourced from live or historical market listings.
- **Placeholder Prohibition:** The use of synthetic, mock, or placeholder data (including stock images) is strictly forbidden in production datasets.
- **Goal:** Automate discovery while the human focuses on decision.
- **Appreciation Potential:** Calculate and display a 5-year capital growth rating (0-10) for every property.
- **Tenure & Running Costs:** 
  - The system must capture the total cost of ownership for every asset.
  - **Required Metrics:** `service_charge` (Annual £), `ground_rent` (Annual £), `lease_years_remaining` (for Leasehold assets), and `floor_level`.
- **Floor Level Intelligence:**
  - **Requirement:** Capture the specific floor level of the property (e.g., "Ground", "1st", "Penthouse").
  - **Goal:** Enable the user to filter or evaluate properties based on elevation and accessibility.
  - **Instruction to Data Analyst:** Extract `floor_level` from listing descriptions or technical specs. Normalize to a standard string format.
- **Multi-Source Linkage:** Every asset must support multiple link references (portal vs. direct agent).
- **Direct-to-Agent Verification:** Priority must be given to finding and linking to the listing on the estate agent's own website (e.g., Savills, Knight Frank, Dexter's) to mitigate broken portal links.
- **Instruction to Data Analyst:** Perform deep research to verify listing details, source high-res imagery, and calculate "Alpha" scores. Maintain a rigorous data standard. Reject any records with missing critical financial metrics (e.g., `list_price: 0` or missing `sqft`).

### 1.1 Data Infrastructure (The Data Engineer)
- **Requirement:** The system must utilize a robust, analytical data backend to ensure speed and precision across all dashboard views.
- **Engine:** Transition from flat JSON files to a high-performance **SQLite** instance.
- **Instruction to Data Engineer:** 
  - Maintain the primary SQLite database (`data/propSearch.db`).
  - Develop and maintain the `sync_data.js` pipeline to automate the promotion of validated leads from the Inbox to the Master DB.
  - Interface with the Local API Server to provide SQL-backed endpoints for the frontend.
  - Source and maintain `data/london_metro.geojson` (geometry files).

### 2. High-Density Visualization (Bloomberg Terminal)
- **Requirement:** A UI that allows for the comparison of 50+ properties without visual clutter.
- **Goal:** Enable rapid scanning of key metrics (Alpha Score, SQFT, EPC, Tenure).
- **Institutional Sorting Engine:** 
  - The system must support multi-factor sorting across all dashboard views.
  - **Metric Priority:** Default sort must be `Alpha Score` (High to Low).
  - **Dynamic Sorts:** Support for `Value Gap` (Price Efficiency), `Appreciation Potential`, and `Commute Utility` (Minimizing travel to Paternoster/Canada Square).
- **Default View:** The dashboard must default to the **Table View** to maximize data density and scanning efficiency upon entry.
- **Table Optimization:**
  - **Width Management:** Utilize the full width of the viewport to accommodate high column counts.
  - **Column Prioritization:** Conduct an audit to remove or hide less critical columns, ensuring all high-signal metrics are visible without excessive horizontal scrolling.
  - **Instruction to Frontend Agent:** Set `viewMode` default to `table`. Refactor `PropertyTable` for maximum horizontal efficiency.
- **Instruction to Frontend Agent:** Prioritize data density, keyboard-centric navigation, and high-contrast dark mode. Implement a unified sorting state across Grid, Table, and Map views.

### 3. Visual Context & Market Fidelity
- **Requirement:** Every asset must have high-resolution visual representation (hero thumbnails + gallery + floorplan).
- **Goal:** Allow the user to "feel" the property without leaving the dashboard.
- **Image Sourcing Pipeline:**
  - **Hero Thumbnail:** The Data Analyst must extract a high-quality primary image (`image_url`) from the portal (e.g., Rightmove/Zoopla).
  - **Gallery Support:** The schema must support a `gallery` array (strings) for the top 5 high-res property images.
  - **Floorplan Visualization:** The Data Analyst must identify and isolate a `floorplan_url` from listing data to allow for spatial volume assessment within the dashboard.
  - **Exterior Fidelity (StreetView):** If possible, provide a `streetview_url` based on coordinates to provide immediate street-level context.
- **Visual Resilience (Image Fallbacks):** 
  - **Requirement:** The UI must never show a "broken image" icon or an empty container if a property image fails to load or is missing from the dataset.
  - **Goal:** Maintain the "Bloomberg Terminal" professional aesthetic at all times.
  - **Fallback Strategy:** Implement a high-contrast, stylized SVG placeholder that reflects the property type or area (e.g., a minimalist architectural wireframe or a "Data Loading" node).
- **Instruction to Frontend Agent:** 
  - Create a reusable `PropertyImage` component with an `onError` handler to swap broken URLs for the institutional placeholder.
  - Ensure the placeholder matches the dark-mode, high-density theme.
- **Instruction to Data Analyst:** Implement robust "Hidden Web Data" extraction from portal JSON blobs (e.g., `PAGE_MODEL` or `__NEXT_DATA__`) to ensure link longevity and high resolution (1024px+).
- **Instruction to Frontend Agent:** 
  - **Dashboard:** Render high-density thumbnails in `PropertyCard`.
  - **Detail Page:** Implement a "Linear-style" image gallery/carousel with precise spacing and subtle transitions.

### 4. User Decision Workflow (Shortlisting)
- **Requirement:** The user must be able to move properties through a pipeline: `Discovered` -> `Shortlisted` -> `Vetted` -> `Archived`.
- **Goal:** Reduce cognitive load by hiding irrelevant or rejected assets.
- **Persistence (FE-186 — Effective 2026-04-02):** Pipeline status is persisted server-side in the `properties.pipeline_status` column (SQLite). Status survives browser data clearing and is hydrated from `GET /api/properties` on app load. The frontend `usePipeline` hook calls `PATCH /api/properties/:id/status` to write status changes and maintains localStorage as a local fallback.
- **Analyst role:** The analyst does NOT set `pipeline_status` — that is the user's exclusive domain. The analyst uses `analyst_flag` (analyst annotations) to surface quality signals to the user, who then acts on them via the pipeline.
- **Instruction to Frontend Agent:** Implement `usePipeline` hook calling `PATCH /api/properties/:id/status` on every status change, with localStorage as fallback. Hydrate initial state from the backend API on mount.

### 5. Map-Centric Context & Spatial Intelligence
- **Requirement:** A high-precision map view that prioritizes readability and spatial relationships.
- **Goal:** Enable the user to instantly grasp the proximity to Tube/Overground stations and Parks.
- **Metro Line Refinement:** Metro lines should be visible but subtle (e.g., `weight: 2.5`) to prevent obscuring property markers.
- **Status Visualization:** Properties with a `Shortlisted` status must be visually distinguished on the map (e.g., a unique marker color, glowing effect, or size increase).
- **Instruction to Data Engineer:** Source and provide a `data/london_metro.geojson` file containing the geometry for all Tube and Overground lines.
- **Instruction to Frontend Agent:** 
  - **Aesthetic:** "Bloomberg Terminal" style. Use a high-contrast dark tile set (e.g., Carto Dark Matter).
  - Adjust Metro line weights and base map opacity/contrast.
  - Implement a `Shortlisted` visual state for map markers.

### 6. Commute & Connectivity (Institutional Proximity)
- **Requirement:** Track travel proximity to key commercial hubs: **Paternoster Square (City)** and **Canada Square (Canary Wharf)**.
- **Goal:** Enable the user to evaluate assets based on professional lifestyle utility.
- **Instruction to Data Analyst:** Include `commute_paternoster` and `commute_canada_square` (time in minutes or distance) in the schema.
- **Instruction to Frontend Agent:** Display these as "Commute Nodes" in the Asset Detail and Table views.

### 7. Analyst Annotations & Comparative Intelligence (Comparative Intelligence 2.0)
- **Requirement:** Implement a pro-grade side-by-side comparison engine and qualitative annotation system to enable definitive acquisition decisions.
- **Goal:** Provide a "High-Density Matrix" that highlights the critical deltas between potential assets.
- **The Comparison Engine (Enhanced):**
  - **Selection UX (Global Comparison Basket):** Implement a persistent "Comparison Basket" available across all views (Table, Grid, Map). Users should be able to toggle assets into the basket via a simple keyboard shortcut or click.
  - **Visual Selection Feedback:** Assets in the comparison basket must be visually highlighted in all dashboard views.
  - **The Analytics Matrix:** 
    - **KPI Row Highlight:** Automatically highlight the "Winner" (best value) in each KPI row (e.g., Green text for lowest Price/SQFT, Blue for highest Alpha).
    - **Visual Delta View:** Instead of just showing raw numbers, show the percentage delta relative to the average of the selected group.
    - **Image Synchronization:** Hovering over a data point in the matrix should highlight the corresponding property thumbnail.
  - **Institutional Export:** (Optional) Ability to export the comparison matrix to a clean PDF or PNG for offline review.
- **Analyst Annotations:**
  - **Requirement:** Every asset must support persistent "Analyst Notes".
  - **Rich-Text Context:** Support for markdown or structured lists within notes to track viewing feedback and refurbishment estimates.
- **Instruction to Frontend Agent:** 
  - Implement a global `useComparison` hook to manage the selection state.
  - Build a "Comparison Bar" (fixed bottom UI) showing current selections.
  - Overhaul `ComparisonPage.tsx` into a high-density grid with "Winner" highlighting and delta calculations.

### 8. Precision UX (Linear Pattern)
- **Requirement:** Every interaction must feel "pro-grade", minimal, and precise.
- **Goal:** Avoid typical real-estate portal aesthetics in favor of a specialized tool.
- **Data Transparency & Tooltip Context:** Every complex metric (e.g., Alpha Score, MOS, Heat Index) must have an "Institutional Tooltip" on hover.
- **Tooltip Content:** Must explain the metric's definition, how it's calculated (methodology), and its significance to the acquisition strategy.
- **Instruction to UI/UX QA Agent:** Conduct a full audit of all metrics across the Dashboard, Market Pulse, and Landing Page to ensure clarity and professional tone.
- **Instruction to Frontend Agent:** 
  - Use `linear.app` as the benchmark for UI polish.
  - Implement a standardized `Tooltip` component with precise spacing and high contrast.

### 9. Macro Market Intelligence (Market Pulse)
- **Requirement:** Integrate broad market trends and economic indicators at the City (London) and Area levels.
- **Goal:** Provide context for individual asset pricing by showing if the broader market is heating up or cooling down.
- **Instruction to Data Analyst:** Generate and maintain a `data/macro_trend.json` file containing:
  - **House Price Index (HPI):** Month-on-month and Year-on-year changes for London and specific boroughs.
  - **Inventory Velocity:** Average "Months of Supply" and new listing volume trends.
  - **Negotiation Delta:** Average discount from asking price for the current quarter.
  - **Economic Indicators:** BoE Interest Rate trends and Currency exchange advantages (GBP/USD).
- **Instruction to Frontend Agent:** Implement a "Market Pulse" widget or sub-page that visualizes these macro trends using Bloomberg-style sparklines and KPI nodes.

### 10. Market Business Tracker & Seasonal Intelligence (Landing Page)
- **Requirement:** A high-level overview of market liquidity and timing signals.
- **Goal:** Provide a "Macro-to-Micro" entry point for the user, establishing the current market phase (e.g., "Buyer's Market - Peak Opportunity").
- **Instruction to Data Analyst:** 
  - **Volume History:** Track `flats_listed` and `flats_sold` per month over a 12-24 month rolling window.
  - **Seasonal Buy Signal:** Calculate an "Optimal Buy Window" indicator based on historical price dips (e.g., December/January) and inventory surges (e.g., Spring).
- **Instruction to Frontend Agent:** 
  - **Landing Page Overhaul:** Transform the landing page into a "Market Situation Room" with high-density charts showing volume trends and a "Timing Indicator" widget.

### 11. Active Listing Capture & The 'Inbox' Workflow (Lead Inbox 2.0)
- **Requirement:** Capture 100% of "Active Listings" that match the broad geographic criteria and provide a high-velocity triage interface.
- **Goal:** Transform the Inbox into a "Professional Triage Desk" that minimizes the time between discovery and promotion.
- **The 'Lead Inbox' (Enhanced):**
  - **High-Density Split View:** Implement a dual-pane layout. 
    - **Left Pane:** A scrollable list of all pending leads with "Quick-Scan" metrics (Price, Area, Source).
    - **Right Pane:** A "Deep Review" card for the selected lead, showing all available raw data, portal links, and high-res thumbnails.
  - **Keyboard-Centric Navigation:** 
    - `Up/Down`: Navigate through the pending list.
    - `A`: Approve (Promote to Master DB).
    - `R`: Reject (Archive).
    - `L`: Open Portal Link in new tab.
  - **Enriched Data Display:**
    - **Visual Capture:** Display all available `gallery` images in a minimalist grid within the review card.
    - **Metadata Extraction:** Highlight key raw fields (e.g., `tenure`, `sqft`, `floor_level`) if present in the raw scrape.
    - **Source Attribution:** Display the scraper or user source with high-contrast badges.
  - **Batch Actions:** Ability to select multiple leads and perform bulk `Reject` or `Approve`.
- **Embedded Portal Review (Feasibility Research):**
  - **Requirement:** Investigate the use of an `iframe` or "Portal Proxy" to render the live property listing directly within the Right Pane of the Inbox.
  - **Goal:** Eliminate the need to switch tabs, allowing for "Single-Screen Triage."
  - **Research Constraints:** Identify portal-side blocks (`X-Frame-Options`, `CSP`) and evaluate the potential for a local proxy to bypass these for private use.
- **Instruction to Data Engineer:** 
  - Ensure the `/api/inbox` endpoint returns all available raw fields, including images and technical specs.
  - Implement a `batch_triage` endpoint for bulk operations.
- **Instruction to Frontend Agent:** 
  - Refactor `Inbox.tsx` to use a split-pane layout with persistent keyboard focus.
  - Implement the "Deep Review" card with image support and raw data visualization.
### 12. Financial Intelligence & Ownership Modeling (Mortgage Intelligence 2.0)
- **Requirement:** Implement a comprehensive ownership cost model and a dynamic "Mortgage Intelligence" engine to evaluate the true monthly and annual carrying costs of every asset and the optimal time to secure funding.
- **Goal:** Transform the dashboard from a price viewer into a "Decision Engine" for capital deployment.
- **The Mortgage Tracker (Enhanced):**
  - **12-Month Historical Time-Series:** The UI must visualize the relationship between the **BoE Base Rate**, **90% LTV 2yr/5yr Fixed Rates**, and **CPI Inflation** over a rolling 12-month window.
  - **The "Spread Analyzer":** Monitor the delta between the Base Rate and Retail Rates to identify periods of institutional risk appetite (narrowing spreads) vs. caution (widening spreads).
  - **Purchasing Power Index (PPI):** A chart showing the maximum loan amount achievable for a fixed monthly budget (e.g., £3,000/month) at current vs. historical rates.
  - **LTV Arbitrage Calculator:** Visualize the monthly savings achieved by moving between LTV bands (90% -> 80% -> 75%) to inform deposit strategy.
  - **MPC Meeting Countdown:** Display the date of the next Bank of England Monetary Policy Committee (MPC) meeting and the market consensus (e.g., "75% Probability of 25bps cut").
  - **Analyst Node (Financial):** Provide a qualitative signal (e.g., "Buyer's Market - Rate Lock Recommended") based on the current rate cycle.
- **Instruction to Data Analyst:** 
  - Source and maintain a 12-month historical time-series for economic indicators in `macro_trend.json`.
  - Include `mpc_next_meeting` and `market_consensus` in the schema.
  - Provide LTV band rate data (75%, 80%, 90%).
- **Instruction to Frontend Agent:** 
  - Implement high-density Bloomberg-style charts (using Recharts or similar) for historical trends.
  - Create the "Purchasing Power Index" widget.
  - Add a "LTV Advantage" node to the Property Detail page.

### 13. Manual Lead Ingestion & Submission Tracker
- **Requirement:** Provide a "Direct Injection" path for the user to submit property URLs, with real-time status feedback in the UI.
- **Goal:** Close the loop between user discovery and automated research.
- **The Submission Tracker:** 
  - The UI must display a list of "Recently Submitted Leads" with their current status: `Pending`, `Processing`, `Completed`, or `Failed`.
  - Upon successful promotion to the Master DB, the tracker must provide a direct link to the new Property Detail page.
- **Data Persistence (`data/manual_queue.json`):** 
  - Every submission must have a unique `submission_id`.
  - Status updates must be persisted in the JSON file by the Data Engineer.
- **Instruction to Data Engineer:** 
  - Update `manual_queue.json` statuses throughout the lifecycle.
  - Upon completion, populate the `master_id` field to link the submission to the final asset.
- **Instruction to Frontend Agent:** 
  - Implement a "Lead Submission" modal or sidebar widget.
  - Build a "Submission History" view that polls the Local API for status updates.
  - Use toast notifications (e.g., "Lead Research Complete: [Address]") for a "pro-tool" feel.

### 14. External Data Import & Ingestion
- **Requirement:** Provide a "Drop Zone" for external data sources (e.g., third-party scrapers, manual research batches) to be ingested into the propSearch ecosystem.
- **Goal:** Enable multi-source data aggregation without requiring direct code integration for every new source.
- **The Import Zone:** A dedicated directory (`data/import/`) for raw JSON files.
- **Ingestion Workflow:** 
  - The Data Engineer must check this directory upon activation.
  - Files must follow the `External Lead` schema (defined in `PROMPT_GUIDE.md`).
  - The Engineer must normalize this data, calculate institutional metrics (Alpha Score, Commute), and merge it into the master database.
  - Processed files should be moved to `data/archive/` to prevent duplicate ingestion.
- **Instruction to Data Engineer:** 
  - Implement an `ingest_external_data` function that runs at the start of every cycle.
  - Log any schema violations or missing critical fields (Price, Address) to the user.
- **Instruction to Frontend Agent:** 
  - Ensure the "Source Hub" correctly attributes these external leads if a `source_name` field is provided.

### 15. Research Expansion: Chelsea (SW3/SW10) & Primrose Hill (NW1)
- **Requirement:** Expand the primary research scope to include **Chelsea (SW3/SW10)** and **Primrose Hill (NW1)**.
- **Goal:** Capture high-stakes luxury assets in prime South West and North West London.
- **Instruction to Data Agent:** 
  - Update `data/property.schema.json` to include `Chelsea (SW3/SW10)` and `Primrose Hill (NW1)` in the `area` enum.
  - Synchronize `frontend/src/types/property.ts` to include the new areas in the `Area` type.
  - Update `data/macro_trend.json` to include a "Heat Index" and trend data for Chelsea and Primrose Hill.
- **Instruction to Frontend Agent:** 
  - Update `AREA_COORDS` in `useProperties.ts` and `PropertyContext.tsx` to include coordinates for Chelsea and Primrose Hill (e.g., `[51.5410, -0.1550]` for NW1).
  - Ensure the Sidebar and Search filters correctly reflect the new areas.

### 18. Institutional Data Engine (SQLite Migration)
- **Requirement:** Transition the primary data storage and analytical engine from flat files to a high-performance **SQLite** database (`data/propSearch.db`).
- **Goal:** Enable rapid, analytical queries over large property datasets and provide a robust foundation for multi-dimensional filtering.
- **Core Architecture:**
  - **SQL Storage:** Utilize SQLite's relational format for efficient scanning of property metrics (Price/SQM, Alpha Scores).
  - **Surgical API:** The Local API Server (`server/`) must interface with SQLite to provide endpoints for specific ID lookups and complex analytical queries.
  - **Data Resilience:** Maintain an automated "Gold Standard" JSON export for version control and human-readable backups.
- **Instruction to Data Agent:** 
  - Design the SQLite schema based on the existing `property.schema.json`.
  - Implement a migration pipeline to ingest all existing records from `master.json` and `manual_queue.json`.
  - Ensure the scraping pipeline writes new discoveries directly to the database.
- **Instruction to Frontend Agent:** 
  - Refactor the Local API Server to execute SQL queries against the SQLite instance.
  - Utilize filtered API endpoints to minimize frontend data load.

### 19. Data Fidelity Restoration Protocol
- **Requirement:** During system recovery or migration, the "Empirical Standard" must be maintained.
- **Goal:** Purge all synthetic or "hallucinated" listings (IDs starting with `a1b2c3d4-`) during any data restoration event.
- **Instruction to Data Agent:** 
  - When restoring from backups (e.g., `master_backup_07_03_2026.json`), convert the source (Array) to the target (JSONL) while filtering out invalid IDs.
  - Ensure all 50 verified listings from the last stable snapshot are preserved.

### 20. Public Demo Standard (Slim/Dummy Mode)
- **Requirement:** Provide a high-fidelity, standalone "Demo Mode" for public showcasing (e.g., Vercel/GitHub Pages) that operates without a live SQLite backend.
- **Goal:** Enable prospective reviewers to experience the "Bloomberg meets Linear" UX using a curated, non-private dataset.
- **Data Anonymization & Security:**
  - **Property Data:** Use realistic but synthetic property listings. Addresses must be truncated to area level (e.g., "Cadogan Gardens, SW3" instead of "42 Cadogan Gardens").
  - **Financials:** Use plausible market prices and service charges. Any personal financial data (e.g., specific budget limits) must be replaced with "Institutional Standard" defaults.
  - **Zero PII:** No real phone numbers, emails, or private analyst notes are permitted in the public dataset.
- **Aesthetic Guardrails:**
  - **Fidelity:** The Demo must be visually indistinguishable from the production system. No "Demo" watermarks or reduced functionality.
  - **Performance:** Utilize static JSON files in `/public/data/` (e.g., `demo_master.json`) to simulate API responses with zero latency.
- **Instruction to Data Engineer:** Generate a "Gold Standard" dummy dataset (`demo_master.json`, `macro_trend.json`, `financial_context.json`) that showcases a diverse range of Alpha Scores and property types.
- **Instruction to Frontend Agent:** 
  - Implement a `VITE_DEMO_MODE` environment toggle.
  - Refactor all data hooks to fetch from `/data/*.json` when this mode is active.
  - Ensure the "Inbox" and "Manual Submission" features show a "Demo: Submission Disabled" toast rather than failing.

---

### 21. Page Architecture & Navigation (5-Page Restructure)
- **Requirement:** Restructure the application from an undifferentiated 3-tab/dashboard view into five purpose-built pages with clear navigational separation.
- **Goal:** Eliminate navigation friction and make every view's purpose immediately legible. Enable deep-linking to any view.
- **Page Structure:**
  1. **/dashboard** — Market Situation Room: entry point. HPI trend, BoE rate tracker, comparison basket preview (top 3-5 shortlisted properties), recent inbox activity, quick-add URL submission, data freshness indicator.
  2. **/properties** — Primary property tracking surface: table/grid toggle (T/G shortcut), institutional sorting (Alpha Score default), column show/hide, filter panel (area, status, price, sqft, Alpha threshold), batch status changes, inline status badge editing.
  3. **/map** — Full-viewport spatial intelligence: Carto Dark Matter tiles, Alpha Score colour-coded markers (green/amber/red), shortlisted glow effect, London metro geojson overlay, slide-in property card on marker click, filter controls overlay, full-screen toggle.
  4. **/inbox** — Keyboard-centric lead triage: split-pane (scrollable lead list left, deep-review card right), keyboard navigation (Up/Down, A=Approve, R=Reject, L=portal link, Esc=close), batch multi-select, status badges, submission history panel.
  5. **/comparison** — Decision-engine matrix: persistent comparison basket, KPI row winner highlighting, delta vs. group average view, image sync on cell hover, analyst notes per property.
- **Cross-cutting:** Persistent comparison bar (fixed bottom, visible across all pages); global Cmd+K command palette routing to all five pages.
- **Instruction to Frontend Agent:** Implement routing via React Router. Preserve all existing functionality — no feature regressions during migration.
- **Instruction to UI/UX QA Agent:** Produce a UX research brief (`agents/ui_ux_qa/UX_RESEARCH_2026.md`) before FE-175 begins. Gate FE-175 on brief approval.

### 22. Archived Property Visibility
- **Requirement:** Properties archived by the Data Analyst (set `archived = 1` in SQLite) must remain accessible in the UI via a dedicated filter, without deleting any empirical record.
- **Goal:** Ensure no property history is ever lost; enable the user to review and unarchive previously archived assets.
- **Backend:** SQLite `archived` column and `/api/properties?archived=true` already implemented (DE-161).
- **Frontend:**
  - `PropertyContext.tsx` must pass `?archived=true` to `GET /api/properties` when the archived filter is active.
  - Status filter panel (Properties page) must include an "Archived" option alongside Discovered/Shortlisted/Vetted.
  - Archived rows must render with distinct visual treatment (muted opacity, rose archive badge, PipelineTracker showing Archived as current step).
  - Unarchive action must remain functional from the table row.
  - URL persistence: `?status=archived` so the archived view is linkable and survives page refresh.
- **Data Analyst Note:** Per DE-161, archived records must never be hard-deleted. Incomplete or unverifiable records are flagged `archived = 1` with a descriptive `archive_reason` — they remain available for review and re-activation.
- **See also:** Requirement 23 (Market Status Classification) for structured status taxonomy that supplements the `archived` flag.

### 23. Market Status Classification & Listing Freshness
- **Requirement:** Replace the unstructured `archive_reason` free-text field with a structured `market_status` taxonomy. Additionally track when each property was last verified against the live market (`last_checked`).
- **Goal:** Enable the user to immediately distinguish genuinely off-market archived properties from properties that may be worth reactivating. Surface listing freshness so the user can prioritize re-checks.
- **market_status taxonomy:**
  - `active` — Property is currently listed on a portal. Requires periodic re-verification.
  - `under_offer` — Offer accepted, not yet sold STC.
  - `sold_stc` — Sold subject to contract.
  - `sold_completed` — Completed sale.
  - `withdrawn` — Removed from market permanently (sold elsewhere, withdrawn by vendor, or reclassified as not relevant). Not coming back.
  - `unknown` — Market status has not been verified. Default for pre-enrichment duplicates and data discrepancy records.
- **last_checked:** ISO date string (`YYYY-MM-DD`) recording when the property was last verified against a live portal scrape. Displayed as a freshness indicator: green (≤7 days), amber (8–30 days), red (>30 days or never).
- **Separation of concerns:** `market_status` reflects market reality (managed by Analyst and sync pipeline). `archived` (pipeline status) reflects the user's research decision. A property can be `archived=0 / market_status=active` (active listing not yet reviewed) or `archived=1 / market_status=active` (listing still live, needs recheck before reactivation).
- **UI surfaces:**
  - Archive Review view (filtered by `archived=1`): group by `market_status`. Highlight `market_status=active` group prominently — these are reactivation candidates.
  - Active property cards: show `market_status=active` badge + `last_checked` freshness indicator.
  - PropertyDetail: show market_status badge and last_checked date.
  - PropertyTable: for archived rows, show market_status badge alongside archive icon.
  - Recheck action: manual button to mark a property as re-verified, updating `last_checked` to today and re-fetching listing status via `POST /api/properties/:id/check`.
  - Reactivate action: set `archived=0`, `market_status=active`, navigate to property detail.
- **Instruction to Data Analyst:** Classify all existing archived records by `market_status`. Populate `market_status='active'` for all active (non-archived) records.
- **Instruction to Data Engineer:** Add `market_status` and `last_checked` columns to the SQLite schema. Update sync pipeline to set `last_checked` on every property interaction and set `market_status='active'` on new inserts.

---

## Technical Constraints
...

- **Private Use:** No authentication or user-management required.
- **Tech Stack:** React 19, Tailwind CSS, Local Node.js API Server (Express/Fastify) for Inbox management.
- **Agent Governance:** Strict territorial boundaries. No cross-folder modifications.
- **Token Efficiency (Infrastructure):** 
  - **Mandate:** All high-volume shell operations (builds, tests, syncs) must be proxied through `rtk` (Rust Token Killer) to minimize context noise and reduce token consumption by 60-90%.
  - **Auto-Rewrite:** The environment must support global command rewriting to ensure agents receive compressed outputs transparently.

---

## Success Criteria
- [ ] A dashboard that displays a number of properties with Alpha Scores correctly calculated.
- [ ] A functional sorting/filtering system for "Value Buys" and "Shortlisted Assets".
- [ ] Persistence of user "Shortlist/Archive" decisions and "Analyst Notes".
- [ ] High-density visual thumbnails and side-by-side comparison engine.
- [ ] Readability-optimized map view with Tube/Park overlays.
- [ ] Global Command Menu (⌘K) for rapid navigation.
- [ ] Visual design that meets the "Bloomberg meets Linear" aesthetic audit.
