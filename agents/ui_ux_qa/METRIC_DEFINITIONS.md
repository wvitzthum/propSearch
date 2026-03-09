# propSearch: Institutional Metric Definitions & Strategy Context

This document provides the formal methodology and strategic context for all metrics displayed on the propSearch dashboard. These definitions must be implemented in the corresponding tooltips across the application.

## 1. Asset Performance Metrics

### Alpha Score™
- **Definition:** A proprietary 0-10 composite rating representing the overall acquisition quality of an asset.
- **Methodology:** Calculated as a weighted average of:
  - **Tenure Quality (40%):** Score based on lease length (>150 yrs = 10) and ground rent stability.
  - **Spatial Alpha (30%):** Proximity to Grade II listed parks and institutional transit hubs (Zone 1/2).
  - **Price Efficiency (30%):** Discount relative to the Area Average Price-per-SQFT.
- **Strategic Value:** Higher scores indicate lower-risk, institutional-grade assets that satisfy the "Flight to Quality" mandate.

### Appreciation Potential
- **Definition:** Forecasted 5-year capital growth rating (0-10).
- **Methodology:** Based on historical area CAGR, current infrastructure investment (e.g., Crossrail/Station upgrades), and supply-side constraints in the micro-location.
- **Strategic Value:** Enables long-term wealth preservation planning beyond the immediate acquisition price.

### Value Gap / Pricing Efficiency
- **Definition:** The percentage difference between the `list_price` and the `realistic_price` (Target Bid).
- **Methodology:** `(Realistic Price - List Price) / List Price`. Negative values indicate a "Value Buy" opportunity.
- **Strategic Value:** Identifies assets where the seller is motivated or the initial pricing was decoupled from current market liquidity.

## 2. Market Intelligence Metrics

### Months of Supply (MOS) / Inventory Velocity
- **Definition:** The number of months it would take to sell all current listings at the average monthly absorption rate.
- **Methodology:** `Active Listings / Avg. Monthly Sales`.
  - **< 4 Months:** Seller's Market (High Velocity, low leverage).
  - **4-6 Months:** Balanced Market.
  - **> 6 Months:** Buyer's Market (Low Velocity, high bidding leverage).
- **Strategic Value:** Determines the "Bidding Posture" (Aggressive vs. Patient).

### Area Heat Index
- **Definition:** A localized liquidity score for specific London boroughs.
- **Methodology:** Aggregated data from Rightmove/Zoopla on search volume vs. listing duration.
- **Strategic Value:** Used to identify "Undervalued Pockets" before the broader market catches up.

## 3. Connectivity & Utility Metrics

### Institutional Proximity (City / Wharf Hubs)
- **Definition:** Door-to-desk travel time via public transport to Paternoster Square (City) and Canada Square (Canary Wharf).
- **Methodology:** Calculated using TfL API transit models during morning peak hours (08:30).
- **Strategic Value:** Benchmarks the property's utility for a high-intensity professional lifestyle. Focus on "Golden Triangle" assets (< 25 mins to both hubs).

### Negotiation Delta
- **Definition:** The average difference between the "Asking Price" and "Sold Price" in the current quarter.
- **Strategic Value:** Provides the empirical ceiling for any initial low-ball offers.
