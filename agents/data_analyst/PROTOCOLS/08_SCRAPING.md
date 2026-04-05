# Research & Scraping Assets
*Reference from: agents/data_analyst/README.md — section "Research Assets"*

## FlareSolverr (LOCAL NETWORK)
Primary enrichment tool for all Cloudflare-blocked portals. Reads `FLARESOLVR_URL` from `.env.local` (HTTP, port 8191). Run `scripts/scrape_visuals.js` for structured extraction or use inline Node.js HTTP calls for ad-hoc enrichment. **Do not hardcode the URL in any file — always read from env var.**

### Standard call pattern (always use `http`, port 8191):
```javascript
const http = require('http');
const base = new URL(process.env.FLARESOLVR_URL || 'http://localhost:8191');
const body = JSON.stringify({cmd:'request.get', url: targetUrl, maxTimeout: 90000, session: process.env.FLARESOLVR_SESSION || 'propSearch'});
const opts = {hostname: base.hostname, port: base.port||8191, path:'/v1', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
// ...
```

### Zoopla extraction (after unescape):
```javascript
const clean = html.split('\\\"').join('"');
const sqft  = clean.match(/"floorArea":\s*\{[^}]*?"value":\s*(\d+)/)?.[1]
          || clean.match(/"sizeSqft":\s*"?(\d+)"?/)?.[1];
const beds  = clean.match(/"numBedrooms":\s*(\d)/)?.[1];
const tenure = clean.match(/"tenureType":\s*"([^"]+)"/)?.[1];
const epc   = clean.match(/"efficiencyRating":\s*"([A-G])"/)?.[1];
const postcode = clean.match(/"postalCode":\s*"([^"]+)"/)?.[1];
```

### Key limitations:
- Zoopla `floorArea` is `null` for ~20% of listings — try alternate listings at same address or EPC register
- Rightmove search pages are dynamically loaded — use Rightmove detail pages (`/property/{id}.html`) not search results
- Agent-direct websites often block FlareSolverr — try alternate sources
- Jitty renders as dynamic JS shell — check rendered body text for sqft, postcode; images not extractable via HTML alone

## Other Research Assets

- **Portal Proxy Research:** See `agents/data_analyst/RESEARCH_PORTAL_PROXY.md` for iframe embedding feasibility.
- **Metric Definitions:** See `agents/ui_ux_qa/METRIC_DEFINITIONS.md` for formal Alpha Score and market metric methodology.
- **Lead Enrichment Script:** Run `agents/data_analyst/enrich_leads.js` to automatically enrich inbox leads with visuals via the scraper.

## External Data Research Workflow

To fulfill the "Empirical Standard", the Analyst MUST use search and fetch tools to enrich every asset:

1. **Listing Discovery & Verification:** Use `google_web_search` and `web_fetch` to find the original estate agent listing. Verify the listing is still 'For Sale'. For duplicates: add the new agent-direct link to the existing record's `links` array.
2. **High-Res Asset Extraction:** Use `web_fetch` to extract `PAGE_MODEL` or `__NEXT_DATA__` from portal URLs.
3. **Spatial Metrics:** Use `google_web_search` or map tools to calculate `nearest_tube_distance`, `park_proximity`, and commute times.
4. **Financial Indicators:** Use `google_web_search` to find BoE Base Rates, mortgage rates for LTV bands (75%, 80%, 90%), and MPC meeting dates for `macro_trend.json`.
5. **Market Context:** Maintain `data/macro_trend.json` by researching London-wide HPI, inventory velocity, and area-specific trends.

**Pro-Tool Tip:** For any URL given, prioritize fetching the content and parsing its internal JSON structures before falling back to textual analysis.
