# UI/UX Audit Report: 2026-03-09 (Mortgage Tracker Deep-Dive)

## Audit Objective
Deep-dive audit of `MortgageTracker.tsx` against "Bloomberg meets Linear" standards, verifying chart responsiveness, PPI widget clarity, and LTV band visualization.

## 1. Aesthetic Audit: "Bloomberg meets Linear"
**Status: PARTIAL PASS**
- **Pros:**
    - High-density layout with consistent typography (`text-[9px]`, `font-black`).
    - Use of Lucide icons and linear-style cards is on-brand.
    - SVG sparklines provide a "Terminal" feel.
- **Cons:**
    - **No Scale Context:** SVG charts lack X and Y axis labels. It is impossible to tell the difference between 4% and 6% without hover states.
    - **Hardcoded Labels:** Several key metrics are hardcoded strings, failing the "Data Authenticity" mandate.

## 2. Functional Audit: PPI & LTV
**Status: PARTIAL PASS**

### A. Purchasing Power Index (PPI) (Requirement 12)
- **Status: PASS (Calculation) / FAIL (Transparency)**
    - The PPI calculation logic in the chart is correct.
    - **Issue:** The metrics in the footer (12M PPI Delta, Rate Sensitivity) are hardcoded strings (`+4.2%`, `£12k / 25bps`).

### B. Institutional Rate Corridor
- **Status: PASS (Visualization) / FAIL (Transparency)**
    - The multi-line sparkline is excellent.
    - **Issue:** The peak/low metrics are hardcoded.

### C. LTV Arbitrage Matrix
- **Status: FAIL**
    - Currently only displays deltas for **90% LTV** products.
    - A true "Matrix" should show the cost of leverage across different LTV bands (e.g., 60%, 75%, 85%) to support institutional decision-making.

## 3. Recommended Fixes & Tasks

| Task ID | Priority | Summary |
| --- | --- | --- |
| FE-071 | High | UI: Replace hardcoded metrics in `MortgageTracker.tsx` with dynamic calculations from `mortgage_history`. |
| FE-072 | Medium | UI: Add Y-axis scale labels and interactive hover tooltips to all SVG charts in `MortgageTracker.tsx`. |
| DAT-080 | Medium | Data: Source and integrate 60%, 75%, and 85% LTV mortgage rate history into `macro_trend.json`. |
| FE-073 | Medium | UI: Expand LTV Arbitrage Matrix to display multiple LTV bands (60%, 75%, 85%, 90%). |

## Audit Status
**ACTION REQUIRED.** The page is visually complete but functionally shallow due to hardcoded data and lack of scale on charts.
