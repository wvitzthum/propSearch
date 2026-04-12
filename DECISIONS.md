# propSearch: Strategic Decisions (ADR)

# ADR-001: Bloomberg Meets Linear Aesthetic
## Context
The user requires a pro-tool feel for high-stakes decisions.
## Decision
Adopt high data density, dark mode by default, and precision typography.
## Status
Accepted

# ADR-002: No-Auth Architecture
## Context
Private single-user tool.
## Decision
Remove all login/auth overhead to maximize speed to data.
## Status
Accepted

# ADR-003: Area Expansion (Chelsea & Primrose Hill)
## Context
User requested broader prime London coverage.
## Decision
Include SW3, SW10, and NW1 in the primary research scope.
## Status
Accepted

# ADR-004: Ownership Cost Modeling (Mortgage 2.0)
## Context
Price alone is insufficient for capital deployment decisions.
## Decision
Integrate real-time BoE rates and property-specific running costs.
## Status
Accepted

# ADR-005: Comparative Intelligence 2.0
## Context
Need for definitive acquisition decisions across multiple candidates.
## Decision
Implement Global Comparison Basket and Analytics Matrix.
## Status
Accepted

# ADR-006: Local Data Server & Active Listing Capture (Inbox Workflow)
## Context
Scaling from curated JSON to high-velocity capture.
## Decision
Transition to Local API Server + SQLite for Inbox triage.
## Status
Accepted

# ADR-007: Strict Ingestion & Data Fidelity Enforcement
## Context
Maintaining the "Empirical Standard" across all property datasets.
## Decision
Implement automated schema validation and mandatory metric extraction.
## Status
Accepted

# ADR-008: DuckDB Analytical Engine Migration
## Context
The property research tool requires high-performance filtering, multi-dimensional analysis, and a more robust foundation than flat JSON files. While SQLite was considered, DuckDB offers superior performance for columnar analytical queries (e.g., calculating average `price_per_sqm` or `alpha_score` over thousands of records).

## Decision
1.  **Engine:** Transition from `master.json` to an on-disk **DuckDB** database (`data/propSearch.duckdb`).
2.  **API Integration:** The existing Node.js server will be refactored to use the DuckDB client for property lookups and inbox management.
3.  **Storage:** Maintain a primary Parquet/JSONL backup for interoperability.

## Status
Deprecated (Superseded by ADR-011)

# ADR-009: JSONL Format Mandate & Data Integrity Restoration
## Context
As of March 8, 2026, `master.json` was corrupted by hallucinated listings and accidental truncation. Additionally, the file format was transitioned from a JSON Array to JSONL (JSON Lines) to improve token efficiency and read/write performance for large datasets.

## Decision
1.  **Format:** JSONL is the mandatory flat-file format for `master.json`. Every line must be a valid, independent JSON object.
2.  **Restoration:** Data must be restored from `master_backup_07_03_2026.json` (Array format) and converted to JSONL.
3.  **Hygiene:** Hallucinated IDs (`a1b2c3d4-...`) must be surgically removed during restoration.
4.  **Sync Logic:** `sync_data.js` must be updated to support line-by-line JSONL processing instead of `JSON.parse` on the entire file.

## Status
Accepted

# ADR-010: Role Specialization (Data Analyst vs. Data Engineer)
## Context
As the propSearch platform moves toward a more sophisticated DuckDB-based architecture and requires continuous high-fidelity property research, the monolithic "Data Engineer" role has become over-extended. The requirements for data infrastructure (storage, pipelines, API integration) and data research (sourcing, Alpha scoring, macro trends) are distinct disciplines.

## Decision
Split the Data role into two specialized agents:
1.  **Data Analyst:** Focuses on the "Property Quality" layer (sourcing, research, metric normalization, and calculating Alpha Scores).
2.  **Data Engineer:** Focuses on the "Property Storage" layer (DuckDB maintenance, automated ingestion pipelines, and backend API performance).

## Status
Accepted

# ADR-011: SQLite Migration & DuckDB Decommissioning
## Context
While DuckDB provided superior analytical performance, the implementation encountered persistent database locking issues and complex integration overhead with the Node.js environment. Given the single-user, high-stakes nature of the platform, the operational stability of SQLite (`better-sqlite3`) outweighs the columnar performance gains of DuckDB at the current data scale.

## Decision
1.  **Primary Engine:** Migrate the master data store from DuckDB to **SQLite** (`data/propSearch.db`).
2.  **Client:** Standardize on `better-sqlite3` for high-performance, synchronous database operations within the Node.js API.
3.  **Schema Persistence:** Replicate the multi-table analytical schema (Properties, Global Context, Manual Queue) in SQLite.
4.  **Decommissioning:** Remove `duckdb` dependencies and archive `.duckdb` assets.
5.  **Single-Source Truth:** All SQLite operations MUST use the database located in the `data/` folder. Any root-level `.db` files are unauthorized and must be purged.

## Status
Accepted

# ADR-015: @visx for All Chart and Data Visualization Components
## Context
The current charting approach uses hand-crafted inline SVG — hardcoded viewBox coordinates, manual `getX`/`getY` math, and per-chart unique logic. This is brittle, hard to reuse, and makes responsive scaling complex. The codebase now has 8+ raw-SVG chart components (BoERatePathChart, HPIHistoryChart, SwapRateSignal, LondonPrimePremiumChart, PropertyTypePerformanceChart, RentalYieldVsGiltChart, CapitalAppreciationChart, SparklineChart) with no shared abstraction.

## Decision
1.  **Library:** Adopt **@visx** (airbnb/visx) as the single charting library for all new and refactored data visualization components.
2.  **Scope:** All line charts, area charts, bar charts, sparklines, and fan/projection overlays must use visx primitives. Raw `<svg>` tags are only permitted for purely decorative shapes (icons, decorative dividers, progress rings).
3.  **Core packages to use:**
    - `@visx/scale` — declarative scale functions (replaces all manual getX/getY)
    - `@visx/shape` — LinePath, AreaClosed, Bar, etc.
    - `@visx/axis` — AxisBottom, AxisLeft (optional — manual tick labels are acceptable for dense Bloomberg-style UI)
    - `@visx/grid` — GridRows, GridColumns
    - `@visx/responsive` — ParentSize for responsive charts
    - `@visx/tooltip` — useTooltip, TooltipWithBounds
    - `@visx/group` — Group for coordinate transforms
    - `@visx/event` — localPoint for mouse interaction
    - `@visx/gradient` — gradient fills for area charts
4.  **Migration order:** Prototype first (BoERatePathChart as proof-of-concept ✅), then migrate remaining charts in priority order: HPIHistoryChart, LondonPrimePremiumChart, SwapRateSignal, PropertyTypePerformanceChart, RentalYieldVsGiltChart, CapitalAppreciationChart, SparklineChart.
5.  **Anti-patterns to avoid:**
    - `<svg><polyline>` or `<svg><line>` for data series → use visx shapes
    - Hand-rolled `getX`/`getY` functions → use scalePoint/scaleLinear
    - Hardcoded `viewBox` for chart dimensions → use visx responsive pattern with ParentSize
6.  **Installation:** `npm install @visx/scale @visx/shape @visx/axis @visx/grid @visx/responsive @visx/tooltip @visx/group @visx/event @visx/gradient --legacy-peer-deps` (React 19 peer dep conflict requires `--legacy-peer-deps`)

## Status
Accepted

# ADR-016: Visual Intelligence & Spatial Research (Floorplans)
## Context
Floorplans are a critical data point for judging spatial volume and flow before an acquisition decision. Standard property imagery often fails to provide this context, leading to inefficient triage.
## Decision
1.  **Extraction:** Implement specialized "Hidden Web Data" research to isolate `floorplan_url` from portal JSON blobs (Rightmove/Zoopla).
2.  **Schema:** Expand the SQLite `properties` table and JSON schema to support `floorplan_url` as a first-class metric.
3.  **Visualization:** Integrate a dedicated "Floorplan Preview" in the Lead Inbox and Property Detail page to enable rapid spatial assessment.
## Status
Accepted

# ADR-013: 5-Page Navigation Architecture
## Context
The existing propSearch UI lacked clear page separation — the Dashboard, Properties, Map, Inbox, and Comparison views were blended into a single, hard-to-navigate interface. The user reported poor UX and requested a structural reorganisation into five purpose-built pages.
## Decision
Restructure the application into five distinct, routable pages with a persistent sidebar navigation:
1. **/dashboard** — Market Situation Room: HPI, BoE rate tracker, comparison basket preview, recent inbox activity, data freshness.
2. **/properties** — Primary property tracking surface: table/grid toggle, institutional sorting, column management, filter panel, batch actions.
3. **/map** — Full-viewport spatial intelligence map: Carto Dark tiles, Alpha Score-coded markers, shortlisted glow, metro overlays, slide-in property cards.
4. **/inbox** — Keyboard-centric lead triage: split-pane (list + deep-review), A/R/L shortcuts, batch mode, submission history.
5. **/comparison** — Decision-engine matrix: KPI row winners, delta vs. group average, image sync, analyst notes editor.
Cross-cutting: persistent Comparison Bar (fixed bottom), global Cmd+K command palette routing to all pages.
## Status
Accepted

# ADR-014: Market Status Taxonomy & Listing Freshness Tracking
## Context
The binary `archived = 1` flag conflates multiple distinct market states: genuinely sold properties, withdrawn listings, pre-enrichment duplicates, and properties still actively listed but flagged for incomplete data. The free-text `archive_reason` field is not filterable in the UI. Additionally, there is no timestamp tracking when a property was last verified against a live market scan. Five records currently show "Still Active" in `archive_reason` but are archived — they are reactivation candidates with no structured path to surface that in the UI.
## Decision
1.  **Structured `market_status` field:** Introduce `market_status` as a first-class column on the `properties` table with an enum of values: `active | under_offer | sold_stc | sold_completed | withdrawn | unknown`. This supplements — not replaces — the `archived` flag.
2.  **Separation of concerns:** `market_status` reflects market reality (managed by Analyst + sync pipeline). `archived` reflects the user's research workflow decision. These are independent axes.
3.  **`last_checked` timestamp:** Track the last date each property was verified against a live portal. Displayed as a freshness signal (green/amber/red) throughout the UI.
4.  **API support:** `GET /api/properties` returns `market_status` and `last_checked`. `POST /api/properties/:id/check` updates `last_checked` and re-verifies listing status.
5.  **UI surfaces:** Archive Review view grouped by `market_status` with prominent "Active — Recheck Needed" section; active property cards show freshness badge; recheck and reactivate actions exposed on archived records.
## Status
Accepted

# ADR-015: @visx for All Chart and Data Visualization Components
## Context
The current charting approach uses hand-crafted inline SVG — hardcoded viewBox coordinates, manual `getX`/`getY` math, and per-chart unique logic. This is brittle, hard to reuse, and makes responsive scaling complex. The codebase now has 8+ raw-SVG chart components (BoERatePathChart, HPIHistoryChart, SwapRateSignal, LondonPrimePremiumChart, PropertyTypePerformanceChart, RentalYieldVsGiltChart, CapitalAppreciationChart, SparklineChart) with no shared abstraction.

## Decision
1.  **Library:** Adopt **@visx** (airbnb/visx) as the single charting library for all new and refactored data visualization components.
2.  **Scope:** All line charts, area charts, bar charts, sparklines, and fan/projection overlays must use visx primitives. Raw `<svg>` tags are only permitted for purely decorative shapes (icons, decorative dividers, progress rings).
3.  **Core packages to use:**
    - `@visx/scale` — declarative scale functions (replaces all manual getX/getY)
    - `@visx/shape` — LinePath, AreaClosed, Bar, etc.
    - `@visx/axis` — AxisBottom, AxisLeft (optional — manual tick labels are acceptable for dense Bloomberg-style UI)
    - `@visx/grid` — GridRows, GridColumns
    - `@visx/responsive` — ParentSize for responsive charts
    - `@visx/tooltip` — useTooltip, TooltipWithBounds
    - `@visx/group` — Group for coordinate transforms
    - `@visx/event` — localPoint for mouse interaction
    - `@visx/gradient` — gradient fills for area charts
4.  **Migration order:** Prototype first (BoERatePathChart as proof-of-concept ✅), then migrate remaining charts in priority order: HPIHistoryChart, LondonPrimePremiumChart, SwapRateSignal, PropertyTypePerformanceChart, RentalYieldVsGiltChart, CapitalAppreciationChart, SparklineChart.
5.  **Anti-patterns to avoid:**
    - `<svg><polyline>` or `<svg><line>` for data series → use visx shapes
    - Hand-rolled `getX`/`getY` functions → use scalePoint/scaleLinear
    - Hardcoded `viewBox` for chart dimensions → use visx responsive pattern with ParentSize
6.  **Installation:** `npm install @visx/scale @visx/shape @visx/axis @visx/grid @visx/responsive @visx/tooltip @visx/group @visx/event @visx/gradient --legacy-peer-deps` (React 19 peer dep conflict requires `--legacy-peer-deps`)

## Status
Accepted

# ADR-016: Visual Intelligence & Spatial Research (Floorplans)
*Placeholder — to be completed by Frontend Engineer / Data Analyst*

## Status
Accepted

# ADR-017: Seasonal Market Cycle Phase Explanations — Replace Card Grid with Compact Lookup Table
## Context
The Seasonal Market Cycle section (RatesPage.tsx, lines 114–163) presents phase explanations as a 2-col/3-col grid of 5 cards. Each card shows a phase name, a 1–2 sentence description, and a signal badge. This layout has four compounding problems:

1. **Duplication:** The card description (`p.desc`) is identical to the chart tooltip's phase description (`tooltipData.phaseDesc`). Users see the same information twice without hovering.
2. **Verbosity:** The 4-sentence card text is disproportionate to the card size and density of the surrounding Bloomberg-style dashboard.
3. **Low information density:** 5 cards with heavy padding carry only 3 data points each (name, desc, signal badge). No supply/demand index values are shown.
4. **Missing data:** The chart has per-month supply/demand indices; the cards don't carry phase-level averages. A user must hover the chart to find these values.

The chart tooltip is the correct place for detailed phase descriptions. The cards fight it for attention without adding value.

## Options Evaluated

### Option A — Compact Lookup Table *(RECOMMENDED)*
Replace the 5-card grid with a single 6-column table: `Phase | Months | Avg Supply | Avg Demand | Signal | Verdict`.

- **Pros:** Highest data density. Scannable in one glance. Shows supply/demand averages per phase (data the chart has but cards don't). Eliminating duplication is the correct UX hierarchy — tooltip owns descriptions, table owns data. Fits the Bloomberg "numbers-first" aesthetic.
- **Cons:** Less visual than cards; requires users to parse a table row.
- **Responsive:** On mobile (sm), columns collapse to `Phase | Months | Signal` with supply/demand in a secondary row.

```
Phase           | Months      | S   | D   | Signal           | Verdict
● Winter Trough | Jan–Feb      | 2.5 | 2.5 | 🟢 BUYER WINDOW | Quietest months, max leverage
● Spring Surge  | Mar–May      | 8.0 | 8.0 | 🔴 SELLER LEVER  | Peak competition, fastest gains
● Summer Lull   | Jun–Aug      | 5.0 | 5.0 | ⚪ NEUTRAL       | Balanced, good negotiating window
● Autumn Rush   | Sep–Oct      | 7.5 | 7.5 | 🔴 SELLER LEVER  | Second busiest, act early
● Year-End Dip  | Nov–Dec      | 3.5 | 3.0 | 🟢 BUYER WINDOW | Year-end negotiating window
```
*Current phase (April) highlighted: row background = phase color at 8% opacity, left border = 2px solid phase color.*

### Option B — Horizontal Phase Strip
5 compact pills in a single horizontal row, above the chart. Each pill: color dot + name + month range + signal icon. Tooltip on chart provides detail.

- **Pros:** Minimal vertical footprint. Keeps chart as hero. Clean and Linear-style.
- **Cons:** No room for supply/demand values in the strip. Information density drops significantly. Only works when chart height is preserved ( RatesPage layout has chart left, cards right — strip would be wide, pill would be very small).
- **Verdict:** Better suited for the `/market` page compact view where vertical space is at a premium. Not recommended for `/rates` where the chart + cards layout is the core feature.

### Option C — Tooltip-Only (Remove Cards)
Delete the phase cards entirely. Rely on chart tooltip for all phase information.

- **Pros:** Maximum chart real estate. Zero duplication. Cleanest layout.
- **Cons:** Users may not discover the tooltip without a prompt. No way to see all 5 phases at once. Poor accessibility — key information hidden behind hover interaction.
- **Verdict:** Too aggressive. Tooltip discoverability on dense Bloomberg UI is already a concern. Removing all static phase context loses the "at a glance" value the cycle section is meant to provide.

## Decision
1. **Adopt Option A** — replace the 5-card grid (RatesPage.tsx, lines 114–163) with a compact 6-column lookup table.
2. **Preserve the chart tooltip** — it remains the authoritative source for per-month detail descriptions.
3. **Phase average calculation:** Compute average supply and demand from `seasonalSupply` / `seasonalDemand` arrays for each phase's month range. Display as `X.X` on a 0–10 scale (matching the chart's tooltip format).
4. **Current phase highlight:** Row background = `phase.color` at `8% opacity` (`${p.color}14`); left border = `2px solid ${p.color}`.
5. **Remove the card descriptions** (`p.desc`) from the table entirely — the tooltip owns those.
6. **Signal badge format:** Keep the color-coded text badge (BUYER WINDOW / SELLER LEVER / NEUTRAL) but style it as inline table cell content, not a card element.
7. **Retain the "IT IS [MONTH]:" summary bar** (RatesPage.tsx lines 167–172) — it provides narrative context and remains valuable.
8. **Option B as a follow-on:** File as a separate UX task for the `/market` page compact view.
9. **Accessibility:** Ensure the table has `role="table"` and phase names are in `<th>` cells. Tooltip remains `pointer-events: none`.

## Exact Layout Specification (Option A)

**Container:** Replace the `grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3` card grid div with:

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="border-b border-white/10">
        {['Phase', 'Months', 'Avg S', 'Avg D', 'Signal', 'Verdict'].map(h => (
          <th key={h} className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest py-1.5 px-2 first:pl-0">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {PHASES.map(p => {
        const isCurrent = p.name === currentPhase;
        const avgSupply = /* compute from seasonalSupply for p.months */;
        const avgDemand = /* compute from seasonalDemand for p.months */;
        const signal = /* derived from phase name */;
        return (
          <tr
            key={p.name}
            className={[
              'border-b border-white/5 transition-colors duration-150',
              isCurrent ? 'bg-[#p.color]14' : 'hover:bg-white/[0.02]',
            ].join(' ')}
            style={isCurrent ? { borderLeft: '2px solid #p.color' } : {}}
          >
            {/* Phase name cell */}
            <td className="py-2 px-2 pl-0">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[11px] font-bold text-white">{p.name}</span>
              </span>
            </td>
            {/* Months, Avg S, Avg D, Signal, Verdict cells — similar styling */}
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

**Font sizes (Linear precision scale):**
- Table header: `text-[8px]`, `font-black`, uppercase, tracking-widest
- Phase name: `text-[11px]`, `font-bold`
- Data cells (months, avg S, avg D): `text-[11px]`, `font-medium`
- Signal badge: inline span, `text-[8px]`, `font-black`, uppercase, pill background at `p.color + '18'`
- Verdict: `text-[10px]`, `text-linear-text-muted`

**Color treatment:**
- Non-current rows: hover `bg-white/[0.02]`, no left border
- Current row: `bg: ${p.color}14`, left border `2px solid ${p.color}`, signal badge `bg: ${p.color}18 text: ${p.color}`

**Responsive (sm/md):**
- Below `md`: collapse to `Phase | Months | Signal` + Verdict in a second row within each `<tr>` using a responsive grid or `details`/`summary`.
- Maintain horizontal scroll (`overflow-x-auto`) wrapper to prevent layout break.

## Status
Accepted
## Context
The binary `archived = 1` flag conflates multiple distinct market states: genuinely sold properties, withdrawn listings, pre-enrichment duplicates, and properties still actively listed but flagged for incomplete data. The free-text `archive_reason` field is not filterable in the UI. Additionally, there is no timestamp tracking when a property was last verified against a live market scan. Five records currently show "Still Active" in `archive_reason` but are archived — they are reactivation candidates with no structured path to surface that in the UI.
## Decision
1. **Structured `market_status` field:** Introduce `market_status` as a first-class column on the `properties` table with an enum of values: `active | under_offer | sold_stc | sold_completed | withdrawn | unknown`. This supplements — not replaces — the `archived` flag.
2. **Separation of concerns:** `market_status` reflects market reality (managed by Analyst + sync pipeline). `archived` reflects the user's research workflow decision. These are independent axes.
3. **`last_checked` timestamp:** Track the last date each property was verified against a live portal. Displayed as a freshness signal (green/amber/red) throughout the UI.
4. **API support:** `GET /api/properties` returns `market_status` and `last_checked`. `POST /api/properties/:id/check` updates `last_checked` and re-verifies listing status.
5. **UI surfaces:** Archive Review view grouped by `market_status` with prominent "Active — Recheck Needed" section; active property cards show freshness badge; recheck and reactivate actions exposed on archived records.
## Status
Accepted

# ADR-018: Seasonal Market Cycle Phase Strip — /market Page Compact View
## Context
ADR-017 adopted Option A (compact 6-column lookup table) for the `/rates` page Seasonal Market Cycle section. Option B — a horizontal phase strip — was ruled out for `/rates` because the layout there pairs a 240px circular chart on the left with a data panel on the right; a horizontal strip would compress pills to near-illegibility.

However, the `/market` page (MarketPage.tsx) has a different layout profile: it is dominated by geographic heatmaps and ranked velocity tables. The Seasonal Market Cycle, when added there, should be a lightweight ambient signal — not a primary feature. A compact horizontal strip of 5 pills fits this context perfectly, providing at-a-glance seasonal context without consuming the vertical space a full chart or table would require.

## Existing Patterns in the Codebase
The `MarketConditionsBar.tsx` already implements a compact horizontal indicator strip with `compact={true}` mode: `div className="flex items-center gap-1"`. This proven pattern should be extended for the phase strip rather than inventing a new component type.

## Design: Horizontal Phase Strip (Option B — /market page)

### Placement
Insert above `MarketVerdict` in `MarketPage.tsx`. The strip is ambient context — it appears early in the page hierarchy but does not dominate the heatmap and velocity table primary content.

### Visual Layout (Text Wireframe)
```
[● Winter Trough Jan–Feb 🟢BUYER] [● Spring Surge Mar–May 🔴SELLER] [● Summer Lull Jun–Aug ⚪NEUTRAL] ...
```
Each pill = 5 data points: phase color dot + name + month range + signal badge.

### Current Phase Treatment
- Current pill: `border: 1px solid ${p.color}60`, `bg: ${p.color}12`, text = `p.color`
- Non-current pills: `bg-linear-bg`, `border: border-white/[0.04]`
- All pills: `px-2.5 py-1.5 rounded-lg`, `flex items-center gap-1.5`

### Exact Tailwind Spec
```tsx
<div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
  {PHASES.map(p => {
    const isCurrent = p.name === currentPhase;
    return (
      <div
        key={p.name}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 transition-all duration-150',
          isCurrent ? '' : 'bg-linear-bg border-white/[0.04] hover:border-white/[0.08]',
        ].join(' ')}
        style={isCurrent ? {
          borderColor: p.color + '60',
          backgroundColor: p.color + '12',
        } : {}}
      >
        <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
        <span className="text-[10px] font-bold" style={isCurrent ? { color: p.color } : { color: '#fff' }}>
          {p.name}
        </span>
        <span className="text-[8px] text-linear-text-muted">{getMonthRange(p)}</span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[8px] font-black uppercase" style={{ color: p.color }}>
          {signalIcon} {signalLabel}
        </span>
      </div>
    );
  })}
</div>
```

### Tooltip
Each pill uses the existing `Tooltip` component from `MarketConditionsBar.tsx` with `content={p.desc}` — the same phase description that appears in the chart tooltip. Preserves the tooltip-as-authoritative-description pattern from ADR-017.

### Responsive
- `sm`: dot + name only (months and signal hidden).
- `md+`: full pill — dot + name + months + signal.
- `overflow-x-auto` container for horizontal scroll on narrow viewports.

## Data Model
Uses `PHASES` constant from `SeasonalMarketCycle.tsx`:
- `p.name`, `p.months`, `p.color`, `p.desc` — all exported already
- Signal derivation: Winter Trough / Year-End Dip → BUYER; Spring Surge / Autumn Rush → SELLER; Summer Lull → NEUTRAL
- Month range: `p.months.map(m => MONTHS[m]).join('–')`

## Relationship to ADR-017
- ADR-017 = primary data-dense presentation (table, `/rates` page)
- ADR-018 = ambient compact companion (strip, `/market` page)
- Signal derivation logic is shared. FE-235 establishes the helper; strip reuses it.

## Status
Accepted

# ADR-019: Acquisition Strategy Section Overhaul — /property/:id
## Context
The current "Acquisition Strategy" section (PropertyDetail.tsx lines 496–549) has two compounding weaknesses that undermine the page's purpose as a bid-decision tool:

1. **Hardcoded prose paragraphs** — narrative text ("Based on a market duration of N days, we recommend an entry at market value") that adds no data, has no interactivity, and cannot be trusted because the reasoning is invisible.
2. **Static negotiation buffer** — a 3-segment colour bar with hardcoded widths (`width: 70%`, `width: 15%`, `width: 15%`) and no reference to real market data.

The Acquisition Strategy section should be the highest-density decision area on the entire page. Every element must reduce bid uncertainty. Nothing is decorative.

## Problems with Current Implementation

| Issue | Impact |
|-------|--------|
| Prose paragraph (line 504–507) | No data — unreadable in Bloomberg-style dense dashboard |
| `neg_strategy` is a free text field | No structured bid posture selection |
| No price prediction or appreciation context | User must scroll to CapitalAppreciationChart above |
| No comparable data | Price delta vs area benchmark invisible |
| DOM comparison to area average missing | Stale listing not flagged |
| No thesis tag integration | Investment thesis is disconnected from strategy |
| Strategy notes missing | No place for user's reasoning |
| No market timing signals | Seasonal/HPI context missing from bid decision |
| Hardcoded negotiation buffer widths | Bar widths are meaningless — `70%` has no formula |

## Design: 3-Column Hero + Timing Strip

### Layout Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  ACQUISITION STRATEGY  [Thesis Tags inline]                        │
│──────────────────────────────────────────────────────────────────────│
│  PRICE PREDICTION  │  BID STRATEGY       │  COMPARABLE ANALYSIS   │
│  Appreciation: 8.2  │  Posture: [Cons/    │  £10,448/sqm vs       │
│  £577K → £702K     │    Mod/Aggr]         │  £9,500 avg -10% ✓     │
│  @ 4.0% CAGR       │                      │                        │
│  Confidence: High   │  Walk-Away: £548K   │  RECENT SALES          │
│  ──▓▓▓░░░░░ 80%    │  Target:  £565K     │  23 Acacia: £582K      │
│                     │  Opening: £548K     │  12 Oak Rd:  £570K     │
├─────────────────────┴──────────────────────┴────────────────────────┤
│  MARKET TIMING  [Autumn Rush] [HPI +2.1%] [SDLT active]           │
│──────────────────────────────────────────────────────────────────────│
│  STRATEGY NOTES — "Bidding at 548K on vendor motivation signal..."   │
│  Updated 2026-04-09                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Column 1: Price Prediction

**1a. Acquisition Score (read-only)**
- Hero score: `appreciation_potential` (0–10) from property schema
- Colour: green ≥ 8, amber 5–7.9, red < 5
- Label: "Alpha-derived · Appreciation Score"

**1b. 5-Year Capital Projection**
- Entry price → 5yr estimate from `useAppreciationModel`
- Format: `£577K → £702K @ 4.0% CAGR`
- Confidence range: Monte Carlo P10–P90: `[£648K–£765K]` (text-[9px] text-linear-text-muted)
- Uses existing `CapitalAppreciationChart` data — do NOT re-implement the calculation

**1c. Confidence Level (derived from `useMonteCarlo` stdDev)**
- HIGH: stdDev < 0.05 × mean
- MEDIUM: stdDev < 0.10 × mean
- LOW: stdDev ≥ 0.10 × mean
- Shown as coloured badge: text-[8px] font-black uppercase

**1d. Key Drivers (from `calculateAlphaBreakdown`)**
- Derive 2–3 specific drivers from existing alpha sub-scores
- Not generic: "Zone 1 proximity (400m to Baker Street)" not "Location"
- Format: bullet list, text-[9px] text-linear-text-muted

### Column 2: Bid Strategy

**2a. Posture Selector (editable inline)**
Three-option segmented control: Conservative | Moderate | Aggressive
Each is a styled button — active: `bg-blue-500/20 border-blue-500/40 text-blue-400`; inactive: `bg-linear-bg border-white/10 text-linear-text-muted`.
User selection persists to `property.neg_strategy` via PATCH `/api/properties/:id`.

Posture formulas:
```
Conservative (dom > 90):   opening = realistic × 0.95,  target = realistic,  walkAway = realistic
Moderate    (30 < dom ≤ 90): opening = realistic × 0.97, target = realistic,  walkAway = realistic × 1.02
Aggressive  (dom ≤ 30):      opening = realistic,         target = list,      walkAway = list × 1.03
```

**2b. Bid Price Ladder**
- Opening Position: text-[11px] font-bold text-blue-400
- Target Price: text-[11px] font-bold text-white (largest)
- Walk-Away: text-[11px] font-bold text-amber-400 + ⚠ icon + tooltip: "Do not exceed without new information"
- Savings vs List: text-[9px] text-retro-green

**2c. Negotiation Buffer Bar (dynamic — replaces hardcoded widths)**
```
% to target  = (list_price - opening)  / (list_price - walk_away) × 100
% to realistic = (list_price - realistic) / (list_price - walk_away) × 100
```
Bar segments are calculated values. Changes when posture selector changes.

### Column 3: Comparable Analysis

**3a. Price/sqm Delta**
- Property `price_per_sqm` and area benchmark from `AlphaScoreBreakdown` (already computed)
- Display: `£10,448/sqm vs £9,500 avg — 10% below benchmark ✓` (green) or `14% above benchmark ✗` (amber/red)

**3b. Recent Comparable Sales**
- Source: `CapitalAppreciationChart` comparable data (if available) or "Request Enrichment" link
- Format: `23 Acacia Ave · Mar 2026 · £582,500` — text-[9px] text-linear-text-muted
- If no data: "No recent comparables — Request Enrichment" link

**3c. DOM vs Area Average**
- Property DOM: `property.dom`
- Area average: from `useAppreciationModel` or placeholder "30 days avg"
- If `dom > area_avg × 1.5`: amber badge "Stale listing"
- If `dom > 90`: red badge "Hot stale (>90d — vendor motivated)"

### Timing Strip (full-width, below 3 columns)

Source: `useMacroData()` — `timing_signals.seasonal_buy_score`, `london_hpi.annual_change`, `sdlt_countdown`

```
[Autumn Rush · Apr]  [HPI +2.1% ↑]  [SDLT active]
```
Each pill: `px-2 py-1 rounded text-[9px] font-black uppercase` + colour dot.

- Seasonal phase: from `getPhaseForMonth(new Date().getMonth())`
- HPI trend: `london_hpi.annual_change` → `↑ +2.1%` (green) or `↓ -0.4%` (red)
- SDLT: from `data.sdlt_countdown` if available

### Strategy Notes (full-width, below timing strip)

Editable `textarea` — placeholder: "Why am I bidding this? What am I betting on?"

- Debounce: 1500ms after last keystroke → save to localStorage key `strategy_notes_${property.id}`
- Show `Updated 2026-04-09` timestamp in text-[8px] text-linear-text-muted/60
- Include in `PATCH /api/properties/:id` body as `strategy_notes` field (add to property schema + DB column)
- Distinct from `analyst_notes` textarea (which is for analyst annotations) — this is the user's bidding reasoning

### Thesis Tag Integration

Thesis tags (`ThesisTagSelector`) should be repositioned into or immediately above the Acquisition Strategy section header:
- Display current tags as read-only badges with the `+` add button inline
- This ties the investment thesis directly to the bid decision (currently isolated above)

### Font Size System (Linear precision scale)

| Element | Tailwind | Weight | Colour |
|---------|----------|--------|--------|
| Column header | `text-[8px]` | `font-black` | `text-linear-text-muted` uppercase |
| Score / price hero | `text-[22px]` | `font-black` | `text-white` |
| Data values | `text-[11px]` | `font-bold` | `text-white` |
| Sub-labels | `text-[9px]` | `font-medium` | `text-linear-text-muted` |
| Timestamps | `text-[8px]` | `font-mono` | `text-linear-text-muted/60` |

### Responsive Layout

```
xs/sm: 1-col stack (all 3 columns collapse, timing strip, notes)
md:    2-col (cols 1+2 left, col 3 right) + timing + notes
lg+:   Full 3-col grid + timing strip + notes
```

## Data Sources

| Data Point | Source | Existing? |
|-----------|--------|-----------|
| appreciation_potential | property.appreciation_potential | Yes |
| 5yr projection | useAppreciationModel | Yes — CapitalAppreciationChart |
| Monte Carlo confidence | useMonteCarlo | Yes — CapitalAppreciationChart |
| Key drivers | calculateAlphaBreakdown | Yes — AlphaScoreBreakdown |
| price_per_sqm | AlphaScoreBreakdown.price | Yes |
| area benchmark | AlphaScoreBreakdown.price.areaBenchmark | Yes |
| recent comparables | CapitalAppreciationChart | Partial |
| dom vs area avg | useAppreciationModel | Partial |
| seasonal phase | getPhaseForMonth() | Yes — SeasonalMarketCycle |
| HPI trend | useMacroData.london_hpi.annual_change | Yes |
| SDLT countdown | useMacroData.sdlt_countdown | Yes |
| strategy_notes | localStorage + PATCH body | No — needs schema addition |

## Implementation Order (for FE-237 blocked task)

1. **Static prototype** (Phase 1): Hardcoded placeholder layout — proves the column structure
2. **Dynamic bid ladder** (Phase 2): Posture selector + calculated bid prices + dynamic bar
3. **Data integration** (Phase 3): Wire in `useAppreciationModel`, `calculateAlphaBreakdown`, `useMacroData`
4. **Strategy notes** (Phase 4): localStorage persistence + PATCH support
5. **Thesis integration** (Phase 5): Move ThesisTagSelector into section header

## Status
Accepted
