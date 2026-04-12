# UX Analysis: Extended Dashboard & Application Review

**Date:** 2026-04-03
**Analyst:** UI/UX QA Agent
**Scope:** Full application review — Dashboard, Properties, PropertyDetail, PreviewDrawer, Inbox, Comparison, Affordability, Map, Market, Rates, CommandPalette, ComparisonBar, Layout

---

## Executive Summary

The propSearch application has strong foundational features and a distinctive institutional aesthetic. After reviewing all pages, components, and interaction patterns, the most impactful UX improvements cluster around **information architecture** (how pages relate and what users should do first), **progressive disclosure** (reducing the cognitive load on every page), and **cross-page state coherence** (shared filters, affordability integration, and unified navigation).

---

## Critical Issues

### 1. Broken Navigation Mental Model

**What it is:** The sidebar contains 11 items in a single flat list with a weakly differentiated "Market Intel" sub-section. The "Dashboard" is labeled as the home page but the real acquisition workflow happens on Properties. There is no clear sense of priority or user journey.

**What users experience:** Users land on Dashboard, scan several widgets of equal visual weight, and still don't know where to start. The navigation treats all pages as equally important.

**Fix:** [UX-015: Restructure sidebar into 3-zone navigation with pipeline progress bar](#ux-015--navigation-restructure-3-zones--pipeline-progress-bar)

---

### 2. Dashboard is a Data Dump, Not a Command Center

**What it is:** Dashboard.tsx renders 4 KPI cards, Market Pulse, Market Conditions, Comparison Basket, Recent Inbox list, Quick-Add panel, and Micro-Market pills — all at equal visual weight with no sense of urgency or next action.

**What users experience:** The user must mentally parse the entire page to understand: "What do I need to do today?" There is no prioritized action orientation.

**Fix:** [UX-016: Dashboard redesign — command center layout](#ux-016--dashboard-redesign--command-center-layout)

---

### 3. Property Detail and Preview Drawer Are Duplicative and Overwhelming

**What it is:** `PropertyDetail.tsx` is 770 lines of unprioritized content. `PreviewDrawer.tsx` is a separate 600-line component attempting to replicate all of it in a slide-out. Every section is visible with no grouping or progressive disclosure.

**What users experience:** Users open Preview Drawer and see an overwhelming amount of information that looks identical to the full detail page.

**Fix:** [UX-017: Preview Drawer consolidation](#ux-017--preview-drawer-consolidation--thin-summary) + [UX-020: Property Detail progressive disclosure](#ux-020--property-detail-progressive-disclosure)

---

### 4. Properties Page Has No Smart Defaults or Action Orientation

**What it is:** The table shows all 10+ columns by default (many empty/placeholder), the filter panel is hidden behind a toggle, and there is no quick access to the most common workflows: "Show top Alpha" or "Show value buys."

**What users experience:** Every session begins with manual filter configuration. No momentum toward the most common action.

**Fix:** [UX-018: Properties page smart action bar + column defaults](#ux-018--properties-page-smart-action-bar--defaults)

---

### 5. Inbox Keyboard Shortcuts Are Invisible to New Users

**What it is:** Inbox has 7 keyboard shortcuts (j/k/a/r/m/f/v/l) visible only in a small footer label. Power users discover and love them. New users never find them.

**Fix:** [UX-021: Inbox shortcut visibility — inline on action buttons](#ux-021--inbox-shortcuts-visible-inline-on-action-buttons)

---

## Significant Issues

### 6. Affordability Is Disconnected from the Property Pipeline

**What it is:** The Affordability page is standalone. It has no awareness of which properties the user is reviewing, and property cards show no "within budget" / "over budget" indicators.

**Fix:** [UX-022: Affordability Properties integration — budget health badges](#ux-022--affordability-properties-integration)

---

### 7. Map and Properties Don't Share Filter State

**What it is:** Map.tsx has its own filter panel entirely separate from PropertiesPage.tsx. Changing a filter on the map does not update the Properties table and vice versa.

**Fix:** [UX-019: Shared filter state — Map Properties Dashboard](#ux-019--shared-filter-state-map-properties)

---

### 8. Quick-Add Is Duplicated in 3 Places

**What it is:** Quick-Add appears in Dashboard, Inbox, and Command Palette. The Command Palette version is the most powerful but least prominent.

**Fix:** Deprecate Quick-Add from Dashboard and Inbox — keep it only in Command Palette.

---

### 9. Sidebar Target Areas Unmanageable at Scale

**What it is:** With 20+ unique areas, the sidebar Target Areas list dominates navigation space and is unsearchable.

**Fix:** [UX-023: Sidebar Target Areas as searchable dropdown](#ux-023--sidebar-target-areas-searchable-dropdown)

---

### 10. Comparison Matrix Lacks a Verdict

**What it is:** The comparison matrix shows 7 metrics with winner highlighting but no auto-rank, weighted score, or "best property" recommendation.

**Fix:** [UX-024: Comparison verdict row — auto-rank and recommend](#ux-024--comparison-verdict-row--auto-rank-recommend)

---

### 11. Inbox Portal View Tries to Iframe Blocked Portals

**What it is:** The "Live Portal" tab attempts to iframe Rightmove/Zoopla which are blocked by CSP headers.

**Fix:** [UX-025: Replace Inbox Portal tab with Portal Intelligence panel](#ux-025--inbox-portal-view-replacement--portal-intelligence)

---

## Proposed Information Architecture

### Zone-Based Navigation (UX-015)

```
ACQUISITION WORKFLOW
  Inbox       — "What's new?"
  Properties  — "What am I tracking?"
  Map         — "Where is everything?"

DECISION SUPPORT
  Comparison  — "Which is best?"
  Affordability — "Can I afford it?"
  Market Intel — "Is the timing right?"
    (accordion: Rates, Area Heat)

SYSTEM
  Dashboard   — "How is my portfolio doing?"
  Archive     — "What did I pass on?"

+ Persistent Pipeline Progress Bar in sticky header:
  Discovered (12) > Shortlisted (4) > Vetted (2) > [Acquire]
```

### Dashboard Redesign (UX-016)

```
1. URGENT ACTIONS
   - X new inbox leads awaiting triage (badge + CTA)
   - Properties needing status advancement
   - Affordability warnings if budget exceeded

2. PIPELINE FUNNEL
   Visual funnel: Discovered > Shortlisted > Vetted
   with trend indicators vs. last session

3. TOP OPPORTUNITIES
   3-5 highest-alpha property cards
   One-click Shortlist / Vet actions

4. MARKET CONTEXT
   Condensed Market Pulse + one key indicator
   (swap rate trend or area velocity trend)

REMOVED:
  Quick-Add panel (moves to Command Palette only)
  Recent Inbox list (duplicate of Inbox page)
  Micro-Market pills (moves to Market Intel page)
```

### Property Detail Progressive Disclosure (UX-020)

```
TIER 1 - AT A GLANCE (always visible, above fold)
  Hero image, address, alpha badge, price (target + delta),
  pipeline tracker, thesis tags, 4 quick stats

TIER 2 - FINANCIAL (collapsible)
  Monthly outlay breakdown, affordability model,
  capital appreciation projection, running costs

TIER 3 - DEEP ANALYSIS (collapsible)
  CAPEX & Retrofit, commute access, acquisition strategy,
  negotiation buffer, location map, alpha breakdown,
  data provenance
```

---

## Impact vs Effort Matrix

| # | Improvement | Impact | Effort | Priority |
|---|------------|--------|--------|----------|
| UX-015 | Sidebar 3-zone + pipeline bar | High | Medium | 1 |
| UX-016 | Dashboard command center | High | Medium | 2 |
| UX-017 | Preview Drawer consolidation | High | Medium | 3 |
| UX-018 | Properties smart action bar | High | Medium | 4 |
| UX-019 | Shared filter state | Medium | Medium | 5 |
| UX-020 | Property Detail progressive disclosure | Medium | High | 6 |
| UX-021 | Inbox shortcuts visible | Medium | Low | 7 |
| UX-022 | Affordability Properties integration | Medium | Low | 8 |
| UX-023 | Target Areas dropdown | Low | Low | 9 |
| UX-024 | Comparison verdict row | Low | Medium | 10 |
| UX-025 | Portal view replacement | Low | Low | 11 |

---

## Related Tasks

- **UX-014** — PO Review: Validate this analysis and add enhancements
- **UX-015-025** — Implementation tasks (see Tasks.md)
- **FE-175/176/177** (superseded) — Original navigation and page structure
- **QA-187** — Responsive layout audit (completed)
