# Research Report: Portal Proxy for Single-Screen Triage (Requirement 11)

## Objective
Investigate the feasibility of rendering live property listings (Rightmove/Zoopla) within an `iframe` in the Lead Inbox to enable high-velocity triage.

## Technical Barriers

### 1. Frame Protection (X-Frame-Options)
Both Rightmove and Zoopla use the `X-Frame-Options: DENY` or `SAMEORIGIN` headers.
- **Impact:** Modern browsers will refuse to render these pages within an `<iframe />` if the parent origin does not match.

### 2. Content Security Policy (CSP)
Portals employ `frame-ancestors 'none'` or specific whitelists.
- **Impact:** Even if `X-Frame-Options` is bypassed, CSP will block the embedding at the browser level.

### 3. JavaScript Hydration & Relative Links
If the HTML is proxied, the internal JavaScript (Next.js/React) will still attempt to fetch assets from the propSearch origin instead of the portal origin.
- **Impact:** Broken images, failed API calls, and non-functional interactivity.

## Proposed Strategy: Local Proxy Solution

To achieve "Single-Screen Triage" for private use, a local proxy server can be implemented:

1. **Proxy Endpoint:** `GET /api/proxy?url=<portal_url>`
2. **Implementation:**
   - Use `node-fetch` or `axios` to retrieve raw HTML on the server.
   - **Header Stripping:** Remove `X-Frame-Options`, `Content-Security-Policy`, and `Set-Cookie` headers.
   - **Content Injection:**
     - Inject a `<base href="https://www.rightmove.co.uk/">` tag into the `<head />` to resolve relative links.
     - Inject custom CSS to hide portal navbars/footers to maximize property-specific screen real estate.
3. **Frontend Implementation:**
   - Use `<iframe src="/api/proxy?url=..." />` in the Right Pane of `Inbox.tsx`.

## Feasibility Conclusion
- **Complexity:** Medium-High.
- **Risk:** High maintenance as portals update their JS/CSS selectors.
- **Recommendation:** Proceed with a proof-of-concept (POC) using a simple Express proxy. If the hydration issues are too severe, fallback to "Deep Review" cards using the extracted high-res images from `scrape_visuals.js`.

## Next Steps
- [ ] Create a prototype proxy endpoint in `server/index.js`.
- [ ] Test CSS injection to "clean" the portal view for the dashboard.
