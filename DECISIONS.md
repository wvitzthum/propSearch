# ADR-006: Local Data Server & Active Listing Capture (Inbox Workflow)

## Context
The current architecture relies on manually curated JSON files (`master.json`). The user requires a more scalable approach:
1.  **Active Capture:** The Data Gatherer should scrape *all* listings, not just curated ones.
2.  **Inbox Workflow:** The user needs a "Landing Zone" in the UI to review raw scrapes and promote them to the master database.
3.  **Data Volume:** A simple flat file might become unwieldy with thousands of raw listings.
4.  **Write Access:** The React frontend (running in a browser) cannot directly write to the local file system to "accept" a listing.

## Decision
We will transition from a purely static "serverless" JSON architecture to a **Local Hybrid Architecture**:
1.  **Local API Server:** A lightweight Node.js/Express server (`server/`) running locally alongside the React app.
    - **Responsibilities:** API endpoints for `GET /inbox`, `POST /approve`, `POST /reject`, and `GET /stats`.
    - **Persistence:** Uses `better-sqlite3` (or a partitioned JSON strategy if dependencies are constrained) to manage the high-volume "Inbox" data.
2.  **Inbox UI:** A new dashboard view for processing raw listings.
3.  **Active Scraper:** The Data Gatherer will dump raw scrapes into the `inbox` storage instead of filtering them out.

## Status
Accepted

## Consequences
- **Complexity:** Adds a backend component (`server/`) that must be started.
- **Dependency:** Requires Node.js runtime for the server (already present).
- **Benefit:** Enables "Review Queue" workflow, massive data scaling, and keeps the `master.json` clean and high-signal.
- **Migration:** Existing `master.json` remains the "Gold Standard" read-only source for the main dashboard until the migration is fully complete.
