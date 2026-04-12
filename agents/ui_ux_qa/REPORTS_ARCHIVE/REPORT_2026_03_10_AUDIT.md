# UI/UX Audit Report: Bloomberg x Linear Aesthetic
**Date:** 2026-03-10
**Auditor:** UI/UX QA Engineer
**Status:** Findings Logged -> Tasks Generated

## 1. Executive Summary
The current implementation of the `MortgageTracker`, `Dashboard`, and `PropertyTable` successfully establishes the "Bloomberg Terminal meets Linear" vibe, but suffers from "Fidelity Drift" in typography, color consistency, and interaction design. The use of hardcoded Tailwind colors (e.g., `text-blue-400`, `bg-emerald-500`) instead of CSS variables defined in `@theme` is the primary cause of this drift.

## 2. Component-Specific Findings

### 2.1 MortgageTracker.tsx (Priority: Critical)
- **Typography Inconsistency:** 
  - Extensive use of `font-black` (900) creates excessive visual weight that conflicts with the "Linear" precision (usually `font-semibold` or `font-bold`).
  - Font sizes for labels (e.g., `text-[8px]`) are approaching the limit of readability without enough letter-spacing.
- **Color Drift:** 
  - Hardcoded `text-blue-400`, `text-emerald-400`, `text-rose-400` used instead of theme-consistent variables.
  - `text-amber-500` and `text-retro-green` are used inconsistently for "Status" or "Consensus".
- **Visual Clutter:** 
  - The "Institutional Rate Corridor" and "PPI" charts use `polyline` stroke widths that feel heavy (strokeWidth="2" and "3").
  - Legend markers (circles) are slightly oversized for a precision tool.
- **Interaction:**
  - `Tooltip` usage on every `rect` in the chart is good, but the hover state (`hover:fill-white/[0.03]`) is too subtle for clear feedback.

### 2.2 Dashboard.tsx (Priority: High)
- **Map Marker Polish:**
  - Marker glow effects (`blur-[6px]`) are a bit "soft". Linear-style markers usually have sharper, more defined borders or high-contrast rings.
  - Metro line weights (`weight: 2.5`) are correct, but opacity (`0.75`) might be too high, potentially obscuring property markers in dense areas like Marylebone or Chelsea.
- **Card Hierarchy:**
  - `PropertyCard` uses `text-sm` for the address, which is good, but the "Protocol" badge at the bottom feels disconnected from the primary financial metrics.
  - "Links" dropdown uses `text-[8px]`, which is slightly too small for secondary navigation.

### 2.3 PropertyTable.tsx (Priority: High)
- **Horizontal Efficiency:** 
  - Column spacing is decent, but "Target" and "Gap" columns could be grouped more tightly to reflect their relationship.
  - The "Shallow" data badge is a great addition but should be more prominent to warn the user about data integrity.
- **Typography:**
  - Table headers use `text-[10px]`, while some cell data uses `text-xs`. This should be standardized.

## 3. Core Mandate Deviations (Linear Standard)
- **Precision Spacing:** Some components use `p-8` (32px), which is too large for a "high-density" dashboard. `p-6` or `p-4` with structured white space is preferred.
- **Surface Depth:** The dashboard relies heavily on borders (`border-linear-border`). Adding subtle inner shadows or `backdrop-blur` to cards would enhance the "pro-tool" feel.

## 4. Action Plan (Tasks Generated)
1.  **Refactor Typography:** Standardize on `font-bold` (700) for headers and `font-medium` (500) for body text. Reserve `font-black` (900) for high-impact numeric KPIs only.
2.  **Color Normalization:** Replace all hardcoded colors with `--color-linear-*` and `--color-retro-*` variables.
3.  **Chart Refinement:** 
    - Reduce `polyline` stroke width to `1.5` or `2.0`.
    - Increase hover feedback in SVG charts.
    - Standardize Y-axis label font sizes to `text-[9px]`.
4.  **Data Integrity Visualization:** Move "Shallow" data warnings to the primary "Alpha Score" column for immediate visibility.

---
*End of Audit*
