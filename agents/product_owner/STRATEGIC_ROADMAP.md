# immoSearch: Strategic Roadmap 2026

## Mission
To leverage real-time market sentiment and high-density data to identify "Alpha" acquisition opportunities in a stabilizing 2026 London market.

---

## Phase 1: Market Sentiment & Liquidity (Q2 2026)
**Goal:** Track the shift from a "Buyer's Market" to a "Recovery Phase."

### 1.1 The "Negotiation Buffer" Indicator
- **Feature:** A property-level metric showing the current "Discount to Asking" trend for the specific postcode.
- **Data Requirement:** Track price reductions in `master.json` and compare against the 5-10% regional average found in March 2026 research.
- **UI:** A "Negotiation Node" in the detail view suggesting a target bid based on `Days on Market`.

### 1.2 "Turnkey vs. Refurb" Premium Tracker
- **Feature:** Visualize the widening price gap between renovated properties and "fixer-uppers."
- **Data Requirement:** Scraper to identify keywords like "modernized," "newly refurbished," or "requires updating."
- **Visual:** A KPI node showing the "Refurbishment Alpha" (Potential value uplift after CAPEX).

### 1.3 Inventory Velocity Heatmap
- **Feature:** Map overlay showing where inventory is moving fastest (e.g., "Urban Villages" like Hampstead/NW3 vs. Central N1).
- **Goal:** Identify "Hot Zones" where buyer competition is returning.

---

## Phase 2: Visual & Spatial Intelligence (Q3 2026)
**Goal:** Enhance the "Village Lifestyle" and "Wellness" context.

### 2.1 "Urban Village" Scoring
- **Feature:** A new "Lifestyle Alpha" score based on proximity to independent retail, high-end grocers (Waitrose/Whole Foods), and "Wellness" hubs.
- **Data Requirement:** POI (Point of Interest) ingestion for SW3, NW3, and NW6.

### 2.2 Energy Efficiency & CAPEX Modeling
- **Feature:** EPC Improvement Calculator.
- **Goal:** Help the user evaluate the cost of bringing a 'D' or 'E' rated asset up to the new "Institutional Standard" (B/C).
- **UI:** A "Green CAPEX" widget in the Financial DNA section.

### 2.3 Interior Fidelity (AI Gallery Analysis)
- **Feature:** Automated tagging of key features (Home Office, Floor-to-ceiling windows, Period features).
- **Goal:** Allow the user to filter by "Professional Utility" (e.g., "Must have dedicated office space").

---

## Phase 3: Financial Arbitrage & Long-Term Planning (Q4 2026)
**Goal:** Optimize capital deployment for the 2027/28 cycle.

### 3.1 2028 Council Tax Surcharge Forecaster
- **Feature:** Automate the calculation of the upcoming high-value surcharge for assets potentially crossing the £2M threshold.
- **Goal:** Ensure long-term carrying costs are accurate for high-end acquisitions.

### 3.2 Mortgage Rate Lock Strategy
- **Feature:** Integrate with a real-time mortgage API to suggest the "Optimal Lock Window" based on BoE consensus.
- **Goal:** Capitalize on the 2026 rate easing (Target ~4.10% by year-end).

---

## Implementation Tasks (Immediate)
1. [ ] **DAT-037:** Update Scraper to capture `Price Reductions` and `Days since last reduction`.
2. [ ] **FE-054:** Implement "Negotiation Buffer" visualization in Property Detail.
3. [ ] **DAT-038:** Integrate "Urban Village" POI data for SW3/NW3/NW6.
4. [ ] **QA-031:** Audit EPC improvement data accuracy for period properties.
