# Progress Report: High-Resolution Visual & Floorplan Scraper

## Date: 2026-03-19
## Status: **Partial Success**

### 1. Objective
Build a headless browser script to extract high-resolution images and floorplans from **Rightmove** and **Zoopla** by parsing internal JSON models (`PAGE_MODEL`, `__NEXT_DATA__`).

### 2. Implementation Details
- **Tooling:** Playwright (Chromium) with custom User-Agent strings.
- **Script:** `scripts/scrape_visuals.js`.
- **Logic:**
  - **Rightmove:** Extract from `window.jsonModel` or `window.__PRELOADED_STATE__`.
  - **Zoopla:** Attempting to extract from `document.getElementById('__NEXT_DATA__')`.

### 3. Key Findings

#### **Rightmove (Success)**
- **Working:** Successfully extracted high-res hero images and gallery links.
- **Floorplans:** Verified for properties where floorplans are present in the JSON (e.g., Callow Street `172410536`).
- **Resilience:** Handled multiple variations of the Rightmove property data object (`propertyData` vs `property`).

#### **Zoopla (Blocked/Inconsistent)**
- **Blocking:** Headless browser is frequently hitting "Request Blocked" (Bot detection) or a "Cookie Acceptance" wall.
- **Data Hydration:** The `__NEXT_DATA__` script tag is often missing or structured differently in the headless environment compared to a standard browser.
- **Current Mitigation:** Added automated "Accept All" cookie clicking and `domcontentloaded` wait states.
- **Remaining Gap:** Need to bypass or simulate a more authentic browser session to consistently reveal the `__NEXT_DATA__` blob on Zoopla.

### 4. Technical Hurdles
- **Bot Detection:** Zoopla uses more aggressive finger-printing or bot-blocking than Rightmove.
- **Latency:** Page hydration on portals is slow; `networkidle` is too slow, `domcontentloaded` requires additional manual `waitForTimeout` to allow JSON blobs to populate.

### 6. Updates (2026-03-19 Evening)
- **Integration:** `scrape_visuals.js` successfully integrated into `sync_data.js`. The sync cycle now automatically enriches properties with missing visuals.
- **Verification:** Confirmed successful enrichment for Callow Street listing (`172410536`) in the production SQLite database.
- **Alpha Score Rerun:** Audited and updated all Alpha Scores based on refined **2026 Empirical Benchmarks** (£14,550 for Bayswater, £11,000 for Islington N1).
- **Proxy Research:** Completed `RESEARCH_PORTAL_PROXY.md` detailing the headers and CSP challenges for `iframe` embedding.

### 7. Strategic Pivot (Zoopla)
Given Zoopla's persistent bot-detection and shifting hydration logic, we will prioritize **Rightmove and Direct Agent Link** enrichment. Zoopla leads will remain in the Inbox for manual triage until a more robust stealth implementation (or proxy-based scraping) is finalized.

