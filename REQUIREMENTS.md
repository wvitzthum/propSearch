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
  - **Required Metrics:** `service_charge` (Annual £), `ground_rent` (Annual £), and `lease_years_remaining` (for Leasehold assets).
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
- **London Metro Overlay:** The map must feature a semi-transparent background layer of the London Underground and Overground network (Lines).
- **Instruction to Data Agent:** Source and provide a `data/london_metro.geojson` file containing the geometry for all Tube and Overground lines.
- **Instruction to Frontend Agent:** 
  - **Aesthetic:** "Bloomberg Terminal" style. Use a high-contrast dark tile set (e.g., Carto Dark Matter).
- **Metro Layer:** Render the GeoJSON lines with high legibility. 
  - **Thickness:** Lines must be bold enough to be clearly visible (e.g., 3-4px) without obscuring property markers.
  - **Color:** Use official line colors with refined opacity (e.g., 40-50%).
- **Base Map Legibility:** 
  - **Contrast:** Ensure the background tile set provides enough contrast for street names and labels to be legible for a London expert.
  - **Environmental Shading:** Enhance spatial context with distinct shading/textures for **Water (Rivers/Canals)** and **Green Spaces (Parks/Commons)**.
- **Instruction to Frontend Agent:** 
  - Adjust Metro line weights and base map opacity/contrast.
  - Implement custom CSS filters or tile providers to enhance river and park visibility.

### 6. Commute & Connectivity (Institutional Proximity)
- **Requirement:** Track travel proximity to key commercial hubs: **Paternoster Square (City)** and **Canada Square (Canary Wharf)**.
- **Goal:** Enable the user to evaluate assets based on professional lifestyle utility.
- **Instruction to Data Agent:** Include `commute_paternoster` and `commute_canada_square` (time in minutes or distance) in the schema.
- **Instruction to Frontend Agent:** Display these as "Commute Nodes" in the Asset Detail and Table views.

### 7. Analyst Annotations & Comparative Intelligence (User Input)
- **Requirement:** The user must be able to add, edit, and persist "Analyst Notes" for any property in the database.
- **Goal:** Capture qualitative context (e.g., "Refurbishment potential," "Noise levels during viewing") alongside quantitative metrics.
- **Persistence:** Notes must be stored in a local JSON sidecar or local storage to ensure they persist across sessions.
- **Comparative Side-by-Side:** Implement a "Compare" mode where the user can select 2-3 properties and view their KPIs (Alpha, Price/SQFT, Commute) side-by-side in a high-density matrix.
- **Instruction to Frontend Agent:** 
  - Render a "Notes" textarea in the Property Detail and Preview Drawer.
  - Implement a "Compare" selection state in the Property Table/Grid.
  - Create a dedicated `CompareModal` or view for side-by-side analysis.

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

### 11. Active Listing Capture & The 'Inbox' Workflow
- **Requirement:** Capture 100% of "Active Listings" that match the broad geographic criteria, even if they fail specific quality filters (e.g., price/size).
- **Goal:** Ensure no "diamond in the rough" is missed by automated filtering.
- **The 'Inbox':** A dedicated dashboard view for reviewing raw, unfiltered listings.
  - **Actions:** `Approve` (Promote to Master DB), `Reject` (Archive), `Hold`.
  - **Data Structure:** Raw scrapes are stored in a separate `inbox.json` or local SQLite DB to prevent polluting the high-fidelity `master.json`.
- **Instruction to Data Agent:** 
  - Update scraper to dump ALL results to `data/inbox/` or the local DB.
  - Implement a `server/` or CLI tool to manage this ingestion.
- **Instruction to Frontend Agent:** 
  - Implement an "Inbox" view with rapid keyboard shortcuts (e.g., `A` for Accept, `R` for Reject).
  - Connect to the Local Data Server API to perform these actions.
### 12. Financial Intelligence & Ownership Modeling
- **Requirement:** Implement a comprehensive ownership cost model to evaluate the true monthly and annual carrying costs of every asset.
- **Goal:** Move beyond "List Price" to "Total Monthly Outlay" (Mortgage + Overheads).
- **Core Components:**
  - **Mortgage Component:** Calculate monthly payments based on a **90% LTV** (Loan-to-Value) ratio.
  - **Overhead Component:** Capture and aggregate `service_charge`, `ground_rent`, and **Council Tax** (by area/band).
  - **Total Monthly Outlay:** A unified KPI reflecting the sum of all monthly costs.
- **The Mortgage Tracker (Dedicated Page):**
  - **Purpose:** Monitor the dynamic relationship between central bank policy and retail mortgage products.
  - **Requirement:** A high-density visualization comparing the **BoE Base Rate** against retail rates for **25-year** and **30-year** mortgages (90% LTV).
  - **Historical Delta:** Show the spread between the Base Rate and Mortgage Rates over time to identify peak borrowing opportunities.
- **Instruction to Data Agent:** 
  - Source Council Tax bands and annual costs for target London areas.
  - Implement a pipeline to fetch/update current retail mortgage rates (90% LTV).
  - Enrich `macro_trend.json` with historical mortgage rate data.
- **Instruction to Frontend Agent:** 
  - Create the `MortgageTracker` page with Bloomberg-style charts and KPI nodes.
  - Implement the "Total Monthly Outlay" calculator in the Property Detail and Preview Drawer.
  - Add a "Financial DNA" widget to the Landing Page/Situation Room.

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

---

## Technical Constraints
...

- **Private Use:** No authentication or user-management required.
- **Tech Stack:** React 19, Tailwind CSS, Local Node.js API Server (Express/Fastify) for Inbox management.
- **Agent Governance:** Strict territorial boundaries. No cross-folder modifications.

---

## Success Criteria
- [ ] A dashboard that displays 50 properties with Alpha Scores correctly calculated.
- [ ] A functional sorting/filtering system for "Value Buys" and "Shortlisted Assets".
- [ ] Persistence of user "Shortlist/Archive" decisions and "Analyst Notes".
- [ ] High-density visual thumbnails and side-by-side comparison engine.
- [ ] Readability-optimized map view with Tube/Park overlays.
- [ ] Global Command Menu (⌘K) for rapid navigation.
- [ ] Visual design that meets the "Bloomberg meets Linear" aesthetic audit.
