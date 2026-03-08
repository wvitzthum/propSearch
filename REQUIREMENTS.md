# immoSearch: High-Level Project Requirements

## Strategic Goal
To build a private, high-precision research tool that enables a single buyer to find and acquire a specific prime London property for personal residential use.

---

## Core Pillars

### 1. Data Integrity & Scoring
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
  - **Instruction to Data Agent:** Extract `floor_level` from listing descriptions or technical specs. Normalize to a standard string format.
  - **Instruction to Frontend Agent:** Display "Floor" as a KPI node in the Detail view and as a column/field in the Table and Preview views.
- **Multi-Source Linkage:** Every asset must support multiple link references (portal vs. direct agent).
- **Direct-to-Agent Verification:** Priority must be given to finding and linking to the listing on the estate agent's own website (e.g., Savills, Knight Frank, Dexter's) to mitigate broken portal links.
- **Instruction to Data Agent:** Maintain a rigorous JSON schema. Prioritize agent-direct listings in the `links` array. Include running costs and lease depth in all captures.
- **Instruction to Frontend Agent:** 
  - Render a "Source Hub" dropdown or list in the Detail view.
  - Display "Running Cost Node" (Service/Ground Rent) prominently in the Asset Detail and Preview Drawer.

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
- **Requirement:** Every asset must have high-resolution visual representation (hero thumbnails + gallery).
- **Goal:** Allow the user to "feel" the property without leaving the dashboard.
- **Image Sourcing Pipeline:**
  - **Hero Thumbnail:** The Data Agent must extract a high-quality primary image (`image_url`) from the portal (e.g., Rightmove/Zoopla).
  - **Gallery Support:** The schema must support a `gallery` array (strings) for the top 5 high-res property images.
  - **Exterior Fidelity (StreetView):** If possible, provide a `streetview_url` based on coordinates to provide immediate street-level context.
- **Visual Resilience (Image Fallbacks):** 
  - **Requirement:** The UI must never show a "broken image" icon or an empty container if a property image fails to load or is missing from the dataset.
  - **Goal:** Maintain the "Bloomberg Terminal" professional aesthetic at all times.
  - **Fallback Strategy:** Implement a high-contrast, stylized SVG placeholder that reflects the property type or area (e.g., a minimalist architectural wireframe or a "Data Loading" node).
- **Instruction to Frontend Agent:** 
  - Create a reusable `PropertyImage` component with an `onError` handler to swap broken URLs for the institutional placeholder.
  - Ensure the placeholder matches the dark-mode, high-density theme.
- **Instruction to Data Agent:** Implement robust "Hidden Web Data" extraction from portal JSON blobs (e.g., `PAGE_MODEL` or `__NEXT_DATA__`) to ensure link longevity and high resolution (1024px+).
- **Instruction to Frontend Agent:** 
  - **Dashboard:** Render high-density thumbnails in `PropertyCard`.
  - **Detail Page:** Implement a "Linear-style" image gallery/carousel with precise spacing and subtle transitions.

### 4. User Decision Workflow (Shortlisting)
- **Requirement:** The user must be able to move properties through a pipeline: `Discovered` -> `Shortlisted` -> `Vetted` -> `Archived`.
- **Goal:** Reduce cognitive load by hiding irrelevant or rejected assets.
- **Instruction to Frontend Agent:** Implement local-state or persistence for property statuses.

### 5. Map-Centric Context & Spatial Intelligence
- **Requirement:** A high-precision map view that prioritizes readability and spatial relationships.
- **Goal:** Enable the user to instantly grasp the proximity to Tube/Overground stations and Parks.
- **Metro Line Refinement:** Metro lines should be visible but subtle (e.g., `weight: 2.5`) to prevent obscuring property markers.
- **Status Visualization:** Properties with a `Shortlisted` status must be visually distinguished on the map (e.g., a unique marker color, glowing effect, or size increase).
- **Instruction to Data Agent:** Source and provide a `data/london_metro.geojson` file containing the geometry for all Tube and Overground lines.
- **Instruction to Frontend Agent:** 
  - **Aesthetic:** "Bloomberg Terminal" style. Use a high-contrast dark tile set (e.g., Carto Dark Matter).
  - Adjust Metro line weights and base map opacity/contrast.
  - Implement a `Shortlisted` visual state for map markers.

### 6. Commute & Connectivity (Institutional Proximity)
- **Requirement:** Track travel proximity to key commercial hubs: **Paternoster Square (City)** and **Canada Square (Canary Wharf)**.
- **Goal:** Enable the user to evaluate assets based on professional lifestyle utility.
- **Instruction to Data Agent:** Include `commute_paternoster` and `commute_canada_square` (time in minutes or distance) in the schema.
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
- **Instruction to Data Agent:** Generate and maintain a `data/macro_trend.json` file containing:
  - **House Price Index (HPI):** Month-on-month and Year-on-year changes for London and specific boroughs.
  - **Inventory Velocity:** Average "Months of Supply" and new listing volume trends.
  - **Negotiation Delta:** Average discount from asking price for the current quarter.
  - **Economic Indicators:** BoE Interest Rate trends and Currency exchange advantages (GBP/USD).
- **Instruction to Frontend Agent:** Implement a "Market Pulse" widget or sub-page that visualizes these macro trends using Bloomberg-style sparklines and KPI nodes.

### 10. Market Business Tracker & Seasonal Intelligence (Landing Page)
- **Requirement:** A high-level overview of market liquidity and timing signals.
- **Goal:** Provide a "Macro-to-Micro" entry point for the user, establishing the current market phase (e.g., "Buyer's Market - Peak Opportunity").
- **Instruction to Data Agent:** 
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
- **Instruction to Data Agent:** 
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
- **Instruction to Data Agent:** 
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
  - Status updates must be persisted in the JSON file by the Data Agent.
- **Instruction to Data Agent:** 
  - Update `manual_queue.json` statuses throughout the lifecycle.
  - Upon completion, populate the `master_id` field to link the submission to the final asset.
- **Instruction to Frontend Agent:** 
  - Implement a "Lead Submission" modal or sidebar widget.
  - Build a "Submission History" view that polls the Local API for status updates.
  - Use toast notifications (e.g., "Lead Research Complete: [Address]") for a "pro-tool" feel.

### 14. External Data Import & Ingestion
- **Requirement:** Provide a "Drop Zone" for external data sources (e.g., third-party scrapers, manual research batches) to be ingested into the immoSearch ecosystem.
- **Goal:** Enable multi-source data aggregation without requiring direct code integration for every new source.
- **The Import Zone:** A dedicated directory (`data/import/`) for raw JSON files.
- **Ingestion Workflow:** 
  - The Data Agent must check this directory upon activation.
  - Files must follow the `External Lead` schema (defined in `PROMPT_GUIDE.md`).
  - The Agent must normalize this data, calculate institutional metrics (Alpha Score, Commute), and merge it into `master.json`.
  - Processed files should be moved to `data/archive/` to prevent duplicate ingestion.
- **Instruction to Data Agent:** 
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
- **Requirement:** Transition the primary data storage from a flat `master.json` to a structured, on-disk **SQLite database** (`data/immosearch.db`).
- **Goal:** Minimize context bloat and token usage by enabling surgical data retrieval and indexed search.
- **Core Architecture:**
  - **Relational Schema:** Separate tables for `properties`, `submissions`, `analyst_notes`, and `historical_metrics`.
  - **Surgical API:** The Local API Server (`server/`) must provide endpoints for specific ID lookups and filtered queries (e.g., `GET /api/properties?area=SW3&min_alpha=8`).
  - **Data Resilience:** Maintain a "Gold Standard" JSON export/import utility for human-readable backups and version control.
- **Instruction to Data Agent:** 
  - Design the SQLite schema based on the existing `property.schema.json`.
  - Implement a migration script to port all existing records from `master.json` and `manual_queue.json` into the new database.
  - Update the scraping pipeline to write directly to the SQLite `inbox` table.
- **Instruction to Frontend Agent:** 
  - Refactor the Local API Server to interface with the SQLite database using a lightweight ORM or raw SQL.
  - Ensure the Frontend `useProperties` hook utilizes the new filtered API endpoints to reduce the initial payload size.

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
