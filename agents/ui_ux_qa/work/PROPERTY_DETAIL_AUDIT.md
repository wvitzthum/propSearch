# PropertyDetail UX Audit
**File:** `frontend/src/pages/PropertyDetail.tsx` (793 lines)
**Route:** `/property/:id`
**Auditor:** UI/UX QA | **Date:** 2026-05-03
**Task:** UX-131

---

## Executive Summary

The PropertyDetail page (`/property/:id`) is the primary decision-making surface in propSearch. Every acquisition decision flows through it. The current implementation (793 lines, single component) works but suffers from **structural overcrowding**, **information duplication**, and **missing hierarchy signals**. The redesign goal: one-glance quality assessment, reduced cognitive load, Bloomberg density with Linear precision.

---

## Current Page Architecture

```
┌─ HEADER ────────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard (breadcrumb)                                          │
├─ MAIN COLUMN (lg:col-span-2) ───────────────────┬─ SIDEBAR (lg:col-span-1) ─┐
│                                                   │                          │
│ [Badge row: Area | Value Buy | ID]               │ [Institutional Target]    │
│ Address (large, prominent)                        │ £realistic_price           │
│                                                   │ List Price + Delta        │
│ [PriceAssessment hero — UX-56, at top]          │                           │
│                                                   │ [Negotiation Range]        │
│ [Property Specs row — sqft|beds|baths|...]       │  4 tier rows              │
│                                                   │  SDLT estimate            │
│ [PropertyLifecycleBar + Thesis Tags]             │  All-in estimate          │
│                                                   │                           │
│ [Gallery/Floorplan/Price Evolution tabs]        │ [SourceHub]               │
│                                                   │ [PDF Export — TBD]        │
│ [Financial Summary — Blue card]                  │                           │
│  Monthly Outlay | Mortgage P&I | SDLT+All-In    │ [Data Actions]            │
│  CT | Service Charge | Ground Rent | Stamp Duty  │  Edit Data               │
│                                                   │  Verify Listing           │
│ [Capital Appreciation — collapsed by default]     │  Request Enrichment       │
│                                                   │                           │
│ [Data Provenance]                                │ [Analyst Notes — collapsible]│
│                                                   │                           │
│ [AcquisitionStrategy — 624-line component]      │ [Asset Source Hub]        │
│  Bid Ladder, Alpha Breakdown, Timing, Notes      │ (DUPLICATE of SourceHub!) │
│                                                   │                           │
│ [Market Context + Location — merged collapsible] │                          │
│  Market signals sub-section                      │                          │
│  Commute KPIs + LocationNodeMap                  │                          │
│  NeighbourhoodSection                           │                          │
└──────────────────────────────────────────────────┴──────────────────────────┘
│ MOBILE STICKY BAR: Verify | Enrich | SourceHub (duplicates sidebar)     │
```

---

## UX Problems

### [UXD-001] 🔴 CRITICAL: Sidebar is a content dump — ~180 lines of competing information

**Location:** `PropertyDetail.tsx` lines 586–793 (right column, sticky)

**Current content:**
1. Institutional Target + price/delta (lines 588–600)
2. Negotiation Range + 4 tiers + SDLT + All-in (lines 602–637)
3. SourceHub (lines 639–648) — FIRST appearance
4. PDF Export button (lines 641–648)
5. Data Actions header (lines 651–685)
6. Analyst Notes — collapsible (lines 695–737)
7. Asset Source Hub (lines 740–793) — **DUPLICATE of #3**

**Problem:** The sidebar contains financial data, action buttons, analyst notes, AND a duplicate SourceHub. The negotiation tiers (line 602–636) belong elsewhere. The duplicate SourceHub is a clear oversight. Users cannot quickly scan because everything competes at equal visual weight.

**Fix:** Slim sidebar to ONLY:
- Institutional Target price (1 line)
- Negotiation Range tiers (keep, as they relate to acquisition decision)
- Data Actions (Edit, Verify, Enrich)
- Analyst Notes collapsible panel
- **Remove:** SDLT estimate row, All-in estimate row, both SourceHub instances, PDF Export

---

### [UXD-002] 🔴 CRITICAL: Alpha Score not prominent — buried in AcquisitionStrategy

**Location:** `AcquisitionStrategy.tsx` (624 lines, rendered at line 494 of PropertyDetail)

**Current state:** The Alpha Score (the primary acquisition quality signal) is computed and displayed inside AcquisitionStrategy, ~600 lines into the page structure. A user who lands on a property immediately sees price but has no alpha signal until they scroll past Financial Summary, Capital Appreciation, and Data Provenance.

**Problem:** The most important decision metric (Alpha Score) is too deep in the page.

**Fix options (pick one):**

| Option | Description | Recommendation |
|--------|-------------|----------------|
| A | Add Alpha Score badge to the top badge row (alongside Area/Value Buy/ID) | ✅ **Recommended** — zero vertical cost, highest visibility |
| B | Surface alpha score in the PriceAssessment hero | ⚠️ Consider but PriceAssessment already does price verdict — keep concern separate |
| C | Move AcquisitionStrategy to top of page | ❌ Too structural — breaks user's mental model |

**Recommended fix:** Add `AlphaBadge` (or inline score display) to the top badge row in PropertyDetail at line 211:
```
<span className="px-2 py-0.5 bg-retro-green/10 text-retro-green text-[10px] font-bold uppercase rounded border border-retro-green/30">
  Alpha {property.alpha_score ?? '—'}
</span>
```

Also add to the sidebar (below Institutional Target):
```
<span className="text-[10px] text-retro-green">Alpha {property.alpha_score ?? '—'}</span>
```

---

### [UXD-003] 🟠 HIGH: Financial Summary duplication — same data in sidebar AND main column

**Location:** 
- Main column: `PropertyDetail.tsx` lines 374–448 (`<div className="mb-12">` Financial Summary card)
- Sidebar: lines 602–636 (Negotiation Range section including SDLT + All-in)

**Duplicated data:**

| Data | Financial Summary (main) | Sidebar |
|------|-------------------------|---------|
| SDLT estimate | ✅ Line 438 | ✅ Line 617 |
| All-in estimate | ✅ Line 419–427 | ✅ Line 626–636 |
| List price | Not shown | ✅ Line 595 |

**Problem:** The same SDLT figure appears in two places with different formatting. The sidebar version (SDLT + All-in) should be REMOVED — the Financial Summary card is the canonical source and is displayed prominently in the main column.

**Fix:** Remove SDLT estimate row and All-in estimate row from sidebar (lines 616–636). Keep only the Negotiation Range tiers. The Financial Summary card already shows the all-in cost.

---

### [UXD-004] 🟠 HIGH: Market Context + Location is deeply nested — 3 levels of accordions

**Location:** `PropertyDetail.tsx` lines 490–584

**Current structure:**
```
[Capital Appreciation — collapsed accordion]
[Data Provenance]
[AcquisitionStrategy]
[Market Context + Location — collapsed accordion] ← Level 1
  Market sub-section                   ← Level 2
  Location sub-section                ← Level 2
    Commute KPIs (Paternoster/Canada Square)
    LocationNodeMap
    NeighbourhoodSection             ← Level 3
```

**Problem:** To see commute times (the most actionable location signal), a user must click: Market+Location accordion → Location sub-section. The commute KPIs are the primary data — they shouldn't be buried at the third level.

**Fix:** 
1. Move Commute KPIs **outside** the Market+Location accordion, directly below the Property Specs row
2. Keep LocationNodeMap + NeighbourhoodSection inside the Market+Location accordion
3. This makes commute data one-click accessible

**Proposed new structure:**
```
[Property Specs row]
[Commute KPIs — inline 2-col cards]  ← NEW, outside accordion
[Pipeline / Thesis Tags]
[Gallery / Floorplan / Price Evolution]
[Financial Summary]
[Capital Appreciation — collapsed]
[Data Provenance]
[AcquisitionStrategy]
[Market + Location Context — collapsed accordion]
  Market signals sub-section
  LocationNodeMap + NeighbourhoodSection
```

---

### [UXD-005] 🟡 MEDIUM: Negotiation tiers in wrong place

**Location:** `PropertyDetail.tsx` lines 602–636 (sidebar)

**Problem:** Negotiation tiers are acquisition strategy data, not sidebar data. They relate to the Bid Strategy, not to "institutional targeting."

**Fix options:**

| Option | Description | Recommendation |
|--------|-------------|----------------|
| A | Move to AcquisitionStrategy collapsed header (below the posture/headline) | ✅ **Recommended** — belongs with bid strategy |
| B | Keep in sidebar but with the AcquisitionStrategy link | ⚠️ Alternative if sidebar location is preferred |

**Recommended fix:** Move negotiation tiers into AcquisitionStrategy as an inline section (below the bid ladder). Remove from sidebar (UXD-001).

---

### [UXD-006] 🟡 MEDIUM: SourceHub appears twice in sidebar

**Location:** 
- Line 639–648: `<SourceHub variant="full" />` inside space-y-3 div
- Line 740–793: `<SourceHub variant="full" />` in separate pt-6 border-t div

**Problem:** The same SourceHub component is rendered twice in the sidebar — clearly an oversight. On mobile, the sticky bar shows SourceHub as well, making it three appearances.

**Fix:** Keep only one SourceHub instance. Use `variant="full"` in the sidebar. Remove the duplicate at line 740–793.

---

### [UXD-007] 🟡 MEDIUM: Mobile sticky bar action duplication

**Location:** `PropertyDetail.tsx` line 767+ (mobile sticky action bar)

**Problem:** The mobile sticky bar shows Verify, Enrich, SourceHub — these are the same three actions as in the sidebar. On desktop the sidebar is the interaction surface. On mobile, the sticky bar is appropriate. But SourceHub on mobile (taking full width of the sticky bar) may be better as an icon-only button.

**Fix:** Reduce SourceHub in mobile sticky bar to an icon-only button:
```
<button className="... icon-only">
  <ExternalLink size={14} />
  Sources
</button>
```
(Or use a badge that shows the number of links available.)

---

### [UXD-008] 🟢 LOW: No scroll-to-top on navigation from list views

**Location:** React Router navigation

**Problem:** When navigating from `/properties` or `/comparison` to `/property/:id`, the scroll position is not reset. If the user was scrolled far down on the list page, they land at the same scroll position on the detail page.

**Fix:** Add a `useEffect` in PropertyDetail that scrolls to top on mount:
```tsx
useEffect(() => { window.scrollTo(0, 0); }, []);
```

---

## Proposed Redesigned Architecture

### Wireframe: Desktop (1280px+)

```
┌─ PROPERTY DETAIL ───────────────────────────────────────────────────────────┐
│ ← Back to Dashboard                                                       │
├────────────────────────────────────────────────────────────────────────────┤
│ [NW3] [Value Buy] [Alpha 7.2] [ID:a1b2c3...]  [pipeline badge]           │
│                                                                           │
│ 14 Belsize Avenue, London NW3                                             │
│                                                                           │
│ ┌─ PRICE ASSESSMENT HERO ──────────────────────────────────────────────┐  │
│ │  [OVERPRICED]  verdict          [Q1 ════●═══ Q3]  £/sqft range bar      │  │
│ │  £1,450,000 list  →  £1,320,000 realistic  (-9.0%)                    │  │
│ │  4 key factors (coloured dots)  |  negotiation range table             │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ [◻ 1,250 sqft] [🛏 3 bed] [🛁 2 bath] [🏛 Leasehold] [EPC C] [📋 CT E]  │
│ [⬆ 3rd floor] [🌿 Garden]                                                 │
│                                                                           │
│ ┌─ COMMUTE AT A GLANCE ────────────────────────────────────────────────┐  │
│ │  Paternoster Sq          Canada Square                                 │  │
│ │  18 min                  24 min                                       │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ [◻ Gallery] [◻ Spatial Blueprint] [◻ Price Evolution]  ← tab bar          │
│ ┌─────────────────────────────────────────────────────────────────────┐  │
│ │  [Main image / floorplan / price evolution chart]                     │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ ┌─ FINANCIAL SUMMARY ──────────────────────────────────────────────────┐  │
│ │  Monthly Outlay  |  Mortgage P&I  |  SDLT + All-In                     │  │
│ │  £4,200          |  £3,650         |  £1.47M+                          │  │
│ │  ─────────────────────────────────────────────────────────────────  │  │
│ │  Council Tax  Service Charge  Ground Rent  Stamp Duty                   │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ ┌─ 5-YEAR MARKET OUTLOOK ▾ ────────────────────────────────────────────  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ ┌─ DATA PROVENANCE ▾ ───────────────────────────────────────────────────  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ ┌─ BID STRATEGY ▾ ──────────────────────────────────────────────────────  │
│ │  Conservative posture (headline bid: £1,280K)                           │  │
│ │  3 key drivers | 5-yr projection with confidence                        │  │
│ │  Negotiation Ladder: Opening → Target → Walk-Away                      │  │
│ │  Timing strip: Autumn Rush (Sep–Oct best window)                        │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ ┌─ MARKET + LOCATION CONTEXT ▾ ────────────────────────────────────────  │
│ │  [Rental Yield vs Gilt chart]                                           │  │
│ │  [LocationNodeMap]  [NeighbourhoodSection]                              │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────┬─────────────────────────────┤
│ COLLABORATIVE NOTES ▾                      │  STICKY SIDEBAR              │
│  (collapsible analyst notes panel)         │                             │
│                                            │  Institutional Target        │
│                                            │  £1,320,000                  │
│                                            │  List: £1,450K (-9%)         │
│                                            │  Alpha Score: 7.2 / 10        │
│                                            │                             │
│                                            │  NEGOTIATION RANGE           │
│                                            │  Conservative  £1,280K       │
│                                            │  Moderate     £1,320K        │
│                                            │  Aggressive   £1,450K         │
│                                            │                             │
│                                            │  [Edit Data]                 │
│                                            │  [Verify Listing]            │
│                                            │  [Request Enrichment]        │
│                                            │                             │
│                                            │  [Asset Source Hub]          │
└────────────────────────────────────────────┴─────────────────────────────┘
```

### Mobile Layout

```
┌─ PROPERTY DETAIL (mobile) ─────────────────────────────────┐
│ ← Back                                                     │
│ [NW3] [Alpha 7.2]                                         │
│ 14 Belsize Avenue, London NW3                              │
│                                                            │
│ [PriceAssessment hero — full width]                        │
│                                                            │
│ [Spec pills: sqft | beds | baths | tenure | EPC | floor]  │
│ [Commute: Paternoster 18min | Canada Sq 24min]            │
│                                                            │
│ [Gallery / Floorplan / Price Evolution — tabs]           │
│ [Main image]                                               │
│ [Thumbnails]                                               │
│                                                            │
│ [Financial Summary card]                                  │
│ [5-Year Outlook ▾]                                        │
│ [Bid Strategy ▾]                                          │
│ [Market+Location ▾]                                       │
│                                                            │
│ [Analyst Notes ▾]                                         │
│                                                            │
├───────────────────────────────────────────────────────────┤
│ STICKY MOBILE BAR                                         │
│ [Verify ✓]  [Enrich]  [Sources ↗]  ← compact icons        │
└───────────────────────────────────────────────────────────┘
```

---

## Component-Level Recommendations

### 1. Top Badge Row (PropertyDetail.tsx lines 210–223)
**Add:** Alpha Score badge alongside Area/Value Buy/ID badges
```tsx
{property.alpha_score != null && (
  <span className="px-2 py-0.5 bg-retro-green/10 text-retro-green text-[10px] font-bold uppercase rounded border border-retro-green/30">
    Alpha {property.alpha_score.toFixed(1)}
  </span>
)}
```

### 2. PriceAssessment Hero (line 231)
**Status:** Already implemented per UX-56. Keep as-is — serves as the primary decision signal at the top of the content column.

### 3. Property Specs Row (lines 235–252)
**Status:** Already implemented per FE-295 (canonical metadata row). Keep as-is. Add outdoor/balcony badges.

### 4. Commute KPIs — NEW section
**Action:** Add commute KPI cards **immediately below** the Property Specs row, outside any accordion.
```tsx
{/* NEW — Commute At A Glance */}
<div className="grid grid-cols-2 gap-3 mb-6">
  <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
    <div className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest mb-1">
      Paternoster Sq
    </div>
    <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
      {property.commute_paternoster ?? '—'}
      <span className="text-sm text-linear-text-muted ml-1 font-bold">min</span>
    </div>
  </div>
  <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
    <div className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest mb-1">
      Canada Square
    </div>
    <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
      {property.commute_canada_square ?? '—'}
      <span className="text-sm text-linear-text-muted ml-1 font-bold">min</span>
    </div>
  </div>
</div>
```

### 5. Financial Summary Card (lines 374–448)
**Status:** Keep as canonical financial data source. Already good. Consider adding a "SDLT scenario toggle" (FTB On/Off) inline.

### 6. Negotiation Range Tiers
**Action:** MOVE from sidebar to AcquisitionStrategy component.
- Add as an inline sub-section in AcquisitionStrategy's expanded view
- Remove from sidebar (UXD-001)

### 7. Sidebar Slimming
**Action:** Remove the following from the sidebar (lines 602–636):
- SDLT estimate row
- All-in estimate row
- Second SourceHub instance (lines 740–793)
- PDF Export button (lines 641–648)

**Keep only:**
- Institutional Target price (lines 588–600) — add Alpha score here too
- Data Actions (lines 651–685)
- Analyst Notes collapsible (lines 695–737)
- One SourceHub instance

### 8. AcquisitionStrategy (AcquisitionStrategy.tsx)
**Action:** Add negotiation tiers as a sub-section. No other structural changes needed — the component is well-designed.

### 9. Market+Location Accordion (lines 490–584)
**Action:** 
1. Remove commute KPIs from inside this accordion (moved to step 4 above)
2. Keep Market signals sub-section
3. Keep LocationNodeMap + NeighbourhoodSection inside

### 10. Mobile Sticky Bar
**Action:** Reduce SourceHub in mobile sticky bar to icon-only or badge:
```tsx
{/* In mobile sticky bar — compact SourceHub */}
<button className="..." title="View sources">
  <ExternalLink size={14} />
  {property.links?.length > 1 ? `${property.links.length} sources` : 'Source'}
</button>
```

---

## Acceptance Criteria

| ID | Criterion | Severity |
|----|----------|----------|
| AC-1 | Alpha Score badge appears in top badge row alongside Area/Value Buy/ID | Critical |
| AC-2 | Commute KPIs (Paternoster/Canada Square) visible in main column without opening any accordion | Critical |
| AC-3 | Financial Summary SDLT/All-in appear ONCE — only in the Financial Summary card | High |
| AC-4 | Sidebar contains ONLY: price, alpha score, negotiation tiers, Data Actions, Analyst Notes, one SourceHub | High |
| AC-5 | SourceHub renders exactly once in the sidebar (no duplicate) | High |
| AC-6 | Negotiation tiers also appear in AcquisitionStrategy (or are removed from sidebar and kept in AcquisitionStrategy only) | Medium |
| AC-7 | PDF Export button is removed from sidebar | Medium |
| AC-8 | Mobile sticky bar SourceHub is icon-only or compact | Low |
| AC-9 | Window scrolls to top on navigation to /property/:id | Low |
| AC-10 | All accordion sections collapse by default except: Gallery, PriceAssessment, Financial Summary | Low |

---

## Implementation Notes

### Phase 1 (Quick wins — 1 sprint):
- Add Alpha Score to top badge row (UXD-002) — ~3 lines
- Move commute KPIs to inline section (UXD-004) — ~20 lines
- Remove duplicate SourceHub from sidebar (UXD-006) — 1 deletion
- Remove PDF Export TBD button (UXD-007) — 1 deletion

### Phase 2 (Structural — 2 sprints):
- Slim sidebar per UXD-001 — remove SDLT + All-in rows
- Move negotiation tiers to AcquisitionStrategy
- Add alpha score to sidebar

### Phase 3 (Polish — 1 sprint):
- Mobile sticky bar SourceHub reduction
- Scroll-to-top on navigation
- Verify all accordion defaults are correct

---

## Open Questions for Product Owner

1. **Alpha Score visibility:** Should the alpha score badge in the top row use the colour-coded system (green=high, amber=medium, red=low) or always show green?
2. **Negotiation tiers:** Confirm: should negotiation tiers live in AcquisitionStrategy (preferred) or stay in sidebar?
3. **Commute KPIs:** Is this new inline placement acceptable, or should commute KPIs remain inside the Market+Location accordion?
4. **FTB toggle on Financial Summary:** Should the SDLT line in Financial Summary have an inline toggle to switch FTB/standard rates?
