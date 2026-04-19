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


# ADR-012: No Express HTTP Server
## Context
A simple Node.js HTTP server is sufficient for propSearch's SQLite-backed property API. The property research tool does not require the middleware ecosystem, routing complexity, or startup overhead of Express.

## Decision
Use the built-in Node.js `http` module directly — no Express, no Koa, no Fastify.
- `server/index.js` implements a minimal HTTP server using `http.createServer()`
- Route handling is manual switch/case or regex matching on `req.url`
- SQLite queries use `better-sqlite3` (synchronous, no connection pooling needed)
- JSON responses use `JSON.stringify()` with no external serialization library

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
## Context
Floorplans are a critical data point for judging spatial volume and flow before an acquisition decision. Standard property imagery often fails to provide this context, leading to inefficient triage.
## Decision
1.  **Extraction:** Implement specialized "Hidden Web Data" research to isolate `floorplan_url` from portal JSON blobs (Rightmove/Zoopla).
2.  **Schema:** Expand the SQLite `properties` table and JSON schema to support `floorplan_url` as a first-class metric.
3.  **Visualization:** Integrate a dedicated "Floorplan Preview" in the Lead Inbox and Property Detail page to enable rapid spatial assessment.

### Shared Module Architecture (DAT-195)

Following ADR-021 (Alpha Score v2), the alpha score calculation moved to a shared module architecture. ADR-016 is updated to reflect the completed implementation:

| File | Role |
|------|------|
| `scripts/alphaScore.ts` | **Single source of truth** — canonical calculation logic, fully typed |
| `scripts/calculate_alpha_score.js` | Server audit scripts — imports from shared module |
| `frontend/src/utils/alphaScore.ts` | Re-exports from shared module + adds display helpers (`alphaColor`, `alphaBgColor`, `alphaTextColor`) |

**Exports from `scripts/alphaScore.ts`:**
- `calculateAlphaScore(property)` — returns plain `number` (0–10). Used by server audit scripts.
- `calculateAlphaBreakdown(property)` — returns full `AlphaBreakdown` interface with all component scores, warnings, and signals.
- `AREA_BENCHMARKS` — empirical £/sqm benchmarks per area (2026 data)
- All component parsers: `parseTenure`, `parseSpatial`, `parsePrice`, `parseDOM`, `parseEPC`, `parseFloorLevel`, `parseServiceCharge`, `parseAppreciation`, `parseMarketStatus`

**Formula drift eliminated:** Frontend display and server audit now use identical calculation logic. The frontend wraps the shared module with display helpers; it does not re-implement the formula.

**See also:** ADR-021 §Canonical Source for the full v2 methodology.
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

---

## ADR-021: Alpha Score v2 — Multi-Axis Acquisition Quality Framework

**Date**: 2026-04-12
**Status**: Approved
**Deciders**: Product Owner, User

---

### Context

The alpha score (v1) used a simple 3-component model:
- Tenure Quality (40%)
- Spatial Alpha (30%)
- Price Efficiency (30%)

This was a useful starting point but ignored several high-signal data fields already enriched in the dataset:
- Negotiation leverage (Days on Market, price reductions)
- Energy efficiency (EPC rating — institutional standard risk)
- User-specific commute relevance (Paternoster / Canada Square)
- Lifestyle amenity proximity (Waitrose, Whole Foods, wellness hubs)
- Market scarcity signals (market_status)
- Long-term appreciation outlook (appreciation_potential)
- Property physical quality (floor level, service charge density)

ADR-016 addressed score transparency. This ADR addresses score **completeness**.

---

### Decision

The alpha score evolves to a **multi-axis acquisition quality framework** with the following architecture:

```
Overall Alpha Score (0–10) — capped at 10.0
├── Core Deal Quality (rescaled to 0–8)
│   ├── Tenure Quality      [57%]  ← weight 40% → 40%/70% of base
│   └── Price Efficiency    [43%]  ← weight 30% → 30%/70% of base
│                                (only if sqft known; null = redistribute)
│
├── Spatial Intelligence   [embedded in core]
│   ├── Transit Access     [primary]
│   ├── Park Proximity    [primary]
│   ├── Elizabeth Line    [+2 bonus pts] — DAT-197
│   ├── Lifestyle         [+0–1.0 bonus] — Waitrose/Wellness — DAT-200
│   └── Commute Dest.     [+0–3.0 bonus] — Paternoster/Canada Sq — DAT-197
│
└── Modifiers (±applied after base, all capped at 10.0 overall)
    ├── Negotiation Leverage    [DOM]           — DAT-198
    ├── Institutional Standard   [EPC]           — DAT-199
    ├── Appreciation Outlook     [app_potential] — DAT-201
    ├── Market Scarcity         [market_status] — DAT-197
    ├── Physical Quality         [floor_level]   — DAT-202
    └── Running Cost Risk        [SC density]    — DAT-202
```

**Score = (tenureScore×0.4 + spatialScore×0.3 + priceScore×0.3) + Σ(modifiers)**
**Capped at 10.0**

---

### Component Specifications

| Component | Source Field | Coverage | Score Range |
|-----------|-------------|----------|-------------|
| Tenure Quality | `tenure` string | ~80% | 0–10 |
| Spatial Alpha | `nearest_tube_distance`, `park_proximity` | 65–77% | 0–10 |
| Price Efficiency | `price_per_sqm` vs area benchmark | ~60% (sqft req.) | 0–10 |
| Elizabeth Line Bonus | `nearest_tube_distance` | 77% | 0 or +2 pts |
| Lifestyle Bonus | `waitrose/whole_foods/wellness_hub_distance` | 62% | 0–1.0 |
| Commute Bonus | `commute_paternoster`, `commute_canada_square` | 66% | 0–3.0 |
| DOM Modifier | `dom` | 40% | 0–+1.5 |
| EPC Modifier | `epc` | 31% | −1.5 to +1.0 |
| Appreciation Modifier | `appreciation_potential` | ~60% | −0.5 to +0.5 |
| Market Status | `market_status` | 82% | −1.0 to 0 |
| Floor Level | `floor_level` | 59% | −0.3 to +0.3 |
| SC Density | `service_charge / sqft` | 42% | 0 or −0.5 |

---

### Scoring Tables

**Days on Market (Negotiation Leverage)**
| DOM | Score | Signal |
|-----|-------|--------|
| 0–14 | 0 | Fresh listing |
| 15–30 | +0.2 | Normal |
| 31–60 | +0.5 | Cooling — negotiate |
| 61–120 | +1.0 | Stale — leverage |
| 120+ | +1.5 | Distressed vendor |
| Unknown | 0 | Assume normal |

**EPC Rating (Institutional Standard)**
| EPC | Score | Rationale |
|-----|-------|-----------|
| A/B | +1.0 | Institutional standard |
| C | +0.5 | Acceptable |
| D | 0 | Needs improvement |
| E/F/G | −1.5 | Regulatory risk (2025+ EPC reform) |

**Appreciation Potential**
| Potential | Score | Scenario |
|-----------|-------|---------|
| ≥8 | +0.5 | Strong growth outlook |
| 6–7.9 | 0 | Baseline |
| 4–5.9 | −0.3 | Subdued growth |
| <4 | −0.5 | Weak / high volatility |

**Market Status**
| Status | Score | Rationale |
|--------|-------|-----------|
| active | 0 | Baseline |
| under_offer | −0.3 | Competitive pressure |
| withdrawn | −0.5 | Investigate re-list price |
| sold_stc / sold_completed | −1.0 | Lost — flag for removal |

---

### Null Handling

Price efficiency requires `sqft`. If `sqft` is null:
- `priceScore = null` (not 5.0 — silent null)
- Base score rescaled: tenure gets 57%, spatial gets 43% (of the 8-point base)
- Warning flagged: "sqft unknown — price efficiency not scored"

All other components: unknown values score 0 (conservative baseline).

---

### Warning Flags

These are surfaced in the AlphaScoreBreakdown component and do NOT cap the score but flag risk:

| Warning | Trigger | Message |
|---------|---------|---------|
| Short lease | tenure <90 years | Below acquisition threshold |
| Poor transit | tube >800m | Poor transit connectivity |
| Limited green | park >800m | Limited green space access |
| Above market | price_per_sqm > benchmark | Above market rate for this area |
| Small floorplate | sqft <600 | Below 600 sqft acquisition minimum |
| EPC risk | epc ∈ {E,F,G} | EPC below institutional minimum |
| Stale listing | dom >90 | Stale — investigate vendor motivation |
| Above SC density | SC/sqft > £8/yr | Excessive service charge |

---

### Canonical Source

`scripts/alphaScore.ts` is the single source of truth.
- `frontend/src/utils/alphaScore.ts` re-exports from shared module + adds display helpers
- All components defined in one file — formula drift eliminated
- Shared module is typed with `AlphaBreakdown` interface

---

### Consequences

**Positive**:
- Alpha score now reflects full acquisition thesis: deal quality + market dynamics + long-term hold
- Negotiation leverage signal (DOM) rewards patience and identifies distressed sellers
- EPC integration surfaces CAPEX risk before acquisition
- Appreciation integration resolves the split-score problem (alpha vs appreciation were parallel)
- User commute data personalises the spatial score to actual lifestyle needs

**Trade-offs**:
- Components with low coverage (EPC 31%, SC 42%) introduce noise until enrichment improves
- More complex scoring table — harder to audit without the breakdown UI
- Weights remain somewhat arbitrary — empirical calibration via Monte Carlo is a future task (see Monte Carlo weight calibration research project)

---

### Implementation

| Task | Owner | Scope |
|------|-------|-------|
| DAT-193 | Data Analyst | Extract shared alphaScore.ts module |
| DAT-197 | Data Analyst | Null-safe sqft, Elizabeth line, commute, market status |
| DAT-198 | Data Analyst | DOM → Negotiation Leverage |
| DAT-199 | Data Analyst | EPC → Institutional Standard Risk |
| DAT-200 | Data Analyst | Lifestyle / Urban Village proximity |
| DAT-201 | Data Analyst | Appreciation potential integration |
| DAT-202 | Data Analyst | Floor level + SC density |
| FE-244 | Frontend Engineer | Wire new components into alphaScore.ts + breakdown UI |
| DAT-203 | Data Analyst | Update methodology docs + alphaScore.ts header |

---

### Status

Accepted

---

# ADR-022: Single Ingestion Point Architecture
## Context
Following DAT-216 findings, the database has accumulated multiple independent write paths:
- **6 scraper ID prefixes** (ch-, man-, pb-, gh-, chelsea-, ps-) writing directly to SQLite
- sync_data.js deduplication bypassed by scripts that write directly before sync runs
- Address string variants causing false-negative dedup (e.g., 'Chelsea Manor Gardens' vs 'Chelsea Manor Gardens, , Chelsea, SW3')
- demo_master.json seeded with portal URLs belonging to mis-matched properties

## Problem
No single canonical entry point means the same property can exist under multiple IDs if its address string varies even slightly between scrape runs.

## Decision

### 1. Single-Writer Rule
**`sync_data.js` is the ONLY script authorized to write to the SQLite `properties` table.**

All scrapers, enrichers, and batch scripts must:
- **Scrapers** → write enriched JSON to `data/inbox/` (filename: `{timestamp}_RAW.json`)
- **Enrichers** → read from `data/inbox/`, write enriched results to `data/inbox/` (filename: `{timestamp}_ENRICHED.json`)
- **sync_data.js** → processes inbox files, writes to SQLite, archives processed files

No script in `scripts/` may use `better-sqlite3` to INSERT or UPDATE the `properties` table except `sync_data.js`.

### 2. Ingestion Flow

```
scraper → data/inbox/{timestamp}_RAW.json
                ↓
          sync_data.js  ← ONLY SQLite writer
                ↓
          SQLite (properties table)
```

### 3. Exception: Field-Only Enrichment Scripts
Enrichment scripts that only update specific sub-fields (not address/list_price/area) may write directly to SQLite, BUT:
- They must read current values before writing (Rule 5: Read-Before-Write)
- They must write only the specific enriched field (no full-record overwrite)
- They must be documented in the table below

### 4. Current Exception Allowlist (Field-Only Writers)

| Script | Fields Updated | Rationale |
|--------|----------------|-----------|
| `enrich_council_tax.js` | `council_tax_band` | Targeted field; address/list_price unchanged |
| `enrich_flagged_properties.js` | `image_url`, `gallery`, `floorplan_url`, `floor_level` | Visual enrichment; no identifying fields |
| `portal_rescrape.js` | `list_price`, `price_reduction_*`, `bedrooms`, `bathrooms`, `source_id`, `last_checked` | Re-scrapes portal URLs to detect price changes |

All three are whitelisted as field-only writers. Any new direct writer must be added here via DE task.

### 5. URL Audit
`sync_data.js --audit-urls` (DAT-216) runs a contamination check on every commit via pre-commit hook. It detects:
- Same URL → multiple property IDs (cross-contamination)
- Orphaned portal links pointing to wrong addresses

### 6. demo_master.json Validation
Before any import, every URL in `links[]` arrays must be checked against the live DB: does this URL already map to a different address? If yes, strip it and log the removal.

### 7. Pre-Commit Hook Update
`scripts/pre-commit-data-guard.sh` now:
- Warns on `data/propSearch.db` or `data/master.jsonl` changes without `data/backups/LOG.md` update
- Blocks `data/inbox/` file commits
- Runs `sync_data.js --audit-urls` if data files are staged (warns; does not block)

### 8. Acceptance Criteria
- Zero scraper scripts write directly to `properties` table (verify: `grep "new Database" scripts/scrape_*.js`)
- `sync_data.js --audit-urls` returns CLEAN before and after any import
- New scraper runs produce inbox JSON that `sync_data.js` processes correctly

---

### Status
Accepted

---

## ADR-022: Price Assessment UX — Hero-First Property Detail

**Date**: 2026-04-16
**Status**: Approved
**Deciders**: Product Owner

### Context

The `/property/{id}` page (`PropertyDetail.tsx`) is a **data terminal** — it dumps the user into pipeline status, thesis tags, and image gallery before providing any opinion on whether the property is worth considering. The decision-relevant content (value benchmarks, price positioning, negotiation range) is buried below the fold, mixed with analysis layer content (affordability, capital appreciation, CAPEX) that matters only after the first-pass filter is passed.

Reference: `data/import/queens_gardens_price_assessment.html` demonstrates the correct pattern — a single-pass, decision-first layout that gives a buyer everything needed to form an initial view in under 30 seconds.

### Problems with Current PropertyDetail Layout

| Issue | Impact |
|-------|--------|
| No verdict at top | User must read half the page to form a view |
| Pipeline/Gallery before price opinion | Buying decision data is below the fold |
| No area range bar | Property £/sqft vs area Q1–Q3 is invisible |
| No factor analysis section | Alpha score breakdown is complex; simple signal list is missing |
| No negotiation range | Offer tiers and all-in cost are absent |
| Sidebar is cluttered | Duplicates main column content; action buttons buried |

### Design: Hero-First Layout

```
Page Order:
1. Property address + area tags
2. [PRICE ASSESSMENT HERO] ← new
   2a. Verdict box (1-2 sentence headline)
   2b. 4-metric grid (asking, £/sqft, Δ%, BoE rate)
   2c. Value Benchmarks card (left) + Property Specs card (right)
   2d. Price Positioning range bar (property marker vs area Q1–Q3)
   2e. Key Factors list (green/amber/red dots)
   2f. Negotiation Range table (strong/mid/near-ask offer tiers + SDLT + all-in)
3. Pipeline Tracker + Thesis Tags (collapsed, secondary)
4. Gallery/Floorplan/Price Evolution tabs
5. — Below fold (analysis layer) —
   Affordability Node, Capital Appreciation, Alpha Score, Acquisition Strategy,
   CAPEX/Retrofit, Location Map
```

**Sidebar:** Strip to price + primary CTAs only. Analyst notes and map blurb move to collapsible "More Details" panel.

### Component Architecture

| Component | File | Role |
|-----------|------|------|
| `PriceAssessment` | `frontend/src/components/PriceAssessment.tsx` | Hero section — verdict, metrics, benchmarks, range bar, factors, negotiation |
| `PropertyDetail` refactor | `frontend/src/pages/PropertyDetail.tsx` | Page shell — reorders sections, slim sidebar |

### Verdict Logic (PO-004)

Inputs: `realistic_price` vs `list_price` delta, alpha score, area quartile position, BoE rate environment, DOM status.

| Condition | Verdict | Rationale |
|-----------|---------|-----------|
| `realistic_price` ≤ area median AND `dom` > 60 | **Below market — motivated seller** | Price is good; DOM signals vendor urgency |
| `realistic_price` ≤ area median AND `dom` ≤ 60 | **Fairly priced** | At or below area median; no pressure signal |
| `realistic_price` > area median AND alpha ≥ 8 | **Premium justified by quality** | Above median but alpha score validates it |
| `realistic_price` > area median AND alpha < 5 | **Above market — avoid or negotiate hard** | Paying for a below-average asset |
| `list_price` reduced by ≥5% | **Price reduction signals negotiation room** | Vendor motivation; use in rationale |
| BoE rate rising + flat market | **Constrained market — careful pricing** | Affordability headwinds |
| BoE rate falling + flat market | **Entry window** | Macro improving |

Verdict rationale: 1-2 sentences max. No essay.

### Key Factors Taxonomy (PO-005)

8-10 factors, each with: label, colour (green/amber/red), 1-sentence description.

| Colour | Signal | Conditions |
|--------|--------|-----------|
| 🟢 Green | Positive for buyer | Location quality (zone 1), SOF tenure, area regeneration underway, discount to benchmark |
| 🟡 Amber | Caution / informational | BoE rate environment, DOM market conditions, market headwinds, macro uncertainty |
| 🔴 Red | Negative / risk | Top floor no lift, EPC E/F/G, service charge >£8/sqft/yr, short lease (<90yr), sold at loss risk |

### Price Positioning Range Bar

- **Q1** (25th percentile £/sqft) and **Q3** (75th percentile £/sqft) from `lending_rules.json` area data or hardcoded area constants
- Property marker positioned proportionally: `position% = (property_psf - q1) / (q3 - q1) × 100`
- Marker colour: green (≤Q2), amber (Q2–Q3), red (>Q3)

### Negotiation Range Table

| Row | Format |
|-----|--------|
| Strong offer | £XXXX–£XXXX (green) — seller motivated, below realistic |
| Reasonable mid | £XXXX–£XXXX (blue) — at realistic price |
| Near-ask | £XXXX–£XXXX (amber) — quick close, list price proximity |
| Stamp duty | £XX,XXX — from SDLT calculator |
| All-in cost | £XXXXXX+ — deposit + SDLT + fees |

### Data Sources

| Data Point | Source | Existing? |
|-----------|--------|-----------|
| Verdict logic | `calculateAlphaBreakdown` + `useMacroData` | Yes |
| 4-metric grid | `property` fields + `useMacroData` | Yes |
| Value benchmarks | `AREA_BENCHMARKS` from `alphaScore.ts` + `macro_trend.json` | Yes |
| Price positioning | `useAppreciationModel` area Q1/Q3 (FE-254) | Partial |
| Key factors | `calculateAlphaBreakdown` modifiers + property fields | Yes |
| Negotiation range | `calcBidLadder` from `AcquisitionStrategy.tsx` + SDLT | Yes |

### Implementation Order

1. **PO-004 + PO-005** — Product Owner defines verdict logic + factor taxonomy
2. **DE-226** — Data Engineer sources area quartile data (unblocks FE-254)
3. **FE-254** — Frontend exposes Q1/Q3 via `useAppreciationModel`
4. **UX-56** — Frontend builds `PriceAssessment.tsx`
5. **UX-57** — Frontend integrates into `PropertyDetail.tsx` and slim sidebar
6. **FE-255 + FE-256** — Frontend cleans sidebar

### Status
Accepted

---

## ADR-023: Borrowing Power Calculator — Income-to-Loan Affordability

**Date**: 2026-04-16
**Status**: Approved
**Deciders**: Product Owner

### Context

The current Affordability Settings page (`AffordabilitySettings.tsx`) is built around **monthly budget** as the sole affordability constraint. Users configure a monthly payment capacity, and the system derives a maximum loan and max property price from it.

This is necessary but insufficient. A buyer earning £100k + 20% bonus wants to know: *"What can I actually borrow from a bank given my income?"*

The two constraints operate differently:
- **Cash-flow constraint:** Monthly budget → max loan (mortgage payment affordability)
- **Income constraint:** Salary × multiplier → max loan (bank lending rules)

The binding constraint is whichever is lower. Showing only one produces blind spots — a user might think they can afford a £900k property because their budget allows it, without knowing their bank will only lend £612k.

Additionally, the Investment Yield Analysis section (`RentalYieldVsGiltChart`) is area-level data misplaced on the personal affordability page.

### Design: Borrowing Power Section

Add a **"Your Borrowing Power"** accordion section to `AffordabilitySettings.tsx`, before the Budget Profile section.

```
Collapsed state:
┌─────────────────────────────────────────────────────┐
│  🏦 Your Borrowing Power                    £612,000 │
│     Based on £100,000 salary + 20% bonus    [expand] │
└─────────────────────────────────────────────────────┘

Expanded state:
Inputs:
  Annual Salary  [£100,000]
  Bonus %         [20%] → £20k regular bonus included at 100%
  Overtime/Commission £ [optional]
  Employment type: [Employed ▼] — Employed / Self-employed / Contractor
  Partner salary  [optional, for joint mortgages]

Results:
  ┌───────────────────────────────────────────────┐
  │  Conservative   Standard    High Earner    Cap │
  │  £504,000      £612,000    £680,000       £XXX │
  │  (4.5×)        (5.5×)      (6.0×)         (budget)│
  └───────────────────────────────────────────────┘

Lender Comparison Table:
  Barclays    5.5×   ÷  ÷  ÷
  HSBC        5.5×   6.0× ÷  ÷   ← Premier for £100k+
  NatWest     5.5×   6.0× ÷  ÷
  Lloyds      5.5×   ÷  ÷  ÷
  Santander   5.0×   ÷  ÷  ÷

Binding constraint callout:
  ┌────────────────────────────────────────────────┐
  │  ✓ INCOME-CEILING: £612K  (binding)             │
  │    Budget allows: £720K  (slack: £108K)          │
  └────────────────────────────────────────────────┘
```

### Income Multiplier Tiers

| Income (base salary) | Standard | High Earner | Lenders |
|----------------------|----------|-------------|---------|
| £0–25k | 4.5× | 4.5× | All |
| £25–50k | 4.75× | 5.0× | All |
| £50–75k | 5.0× | 5.5× | Barclays, HSBC, NatWest |
| £75–100k | 5.25× | 5.5× | HSBC Premier, NatWest high earner |
| £100k+ | 5.5× | 6.0× | HSBC Premier, NatWest |

**Bonus treatment:** Regular (variance <20% between years) → averaged over 2 years, included at 100%. Irregular → 50% or excluded.  
**Overtime/commission:** Consistent 2-year average → included at 50–75%.  
**Self-employed:** 2-year average net profit via SA302 or accountant-certified accounts.  
**Contractor/IR35:** 12-month contract + day rate × 240 days or SA302.  
**Dual income:** Combined income × 4.5–5.5×; some lenders allow up to 10× combined for strong joint applicants.  
**Stress test:** 3pp over offered rate, floor 6.5–7%.

### Component Architecture

| Component | File | Role |
|-----------|------|------|
| `BorrowingPowerCalculator` | `frontend/src/components/BorrowingPowerCalculator.tsx` | Inputs + income multiplier logic + lender comparison |
| AffordabilitySettings refactor | `frontend/src/pages/AffordabilitySettings.tsx` | Adds "Borrowing Power" section; unifies dual constraints |
| `useAffordability` | `frontend/src/hooks/useAffordability.ts` | Add income-based `getIncomeMaxLoan()` |

### Cross-Page Binding Constraint

When a user visits `/property/{id}`:
- `AffordabilityNode` shows **monthly budget constraint** only
- After FE-260: `AffordabilityNode` shows **both** income-based ceiling and budget-based ceiling
- Binding constraint highlighted in green; slack in amber

### Data Sources

| Data Point | Source | Existing? |
|-----------|--------|-----------|
| Lender multipliers | `data/sources/lending_rules.json` (DE-230) | No |
| Stress test rate | `lending_rules.json` or fallback 6.5% | No |
| Salary inputs | `localStorage` (user-configured) | Yes (partial) |
| Monthly budget | `useAffordability` | Yes |
| SDLT | `useAffordability.calculateSDLT` | Yes |

### Relationship to Existing Affordability Model

```
AffordabilitySettings page:
┌─────────────────────────────────────────────────────────────┐
│  YOUR BORROWING POWER                    ← NEW (FE-258)      │
│  Income: £100k + 20% bonus → max £612k                       │
│  Binding constraint: INCOME (£612k) vs BUDGET (£720k)         │
├─────────────────────────────────────────────────────────────┤
│  BUDGET PROFILE                                            │
│  Monthly: £6,000 → max loan £XXX → max price £XXX          │
├─────────────────────────────────────────────────────────────┤
│  AFFORDABILITY MATRIX                                      │
│  Entry/Mid/Core/Ultra properties → LTV band + affordability │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Order

1. **DE-230** — Data Engineer builds `lending_rules.json`
2. **PO-006** — Product Owner specifies exact multiplier tiers
3. **FE-257** — Frontend builds `BorrowingPowerCalculator.tsx`
4. **FE-258** — Frontend integrates into `AffordabilitySettings`
5. **FE-259** — Frontend unifies dual constraint display
6. **FE-260** — Frontend surfaces dual constraint in `AffordabilityNode` on `PropertyDetail`

### RentalYieldVsGiltChart — Related Fix

`RentalYieldVsGiltChart` (currently on `AffordabilitySettings`) is area-level yield data — not user-specific. Move to `PropertyDetail` as `UX-58`.

### Status
Accepted

---

## ADR-022: PurchasingPowerChart — disposition

**Date:** 2026-04-18  
**Status:** Accepted

### Context

The `PurchasingPowerChart` component shows the user's maximum mortgage over 24 months of historical rate data — it is personal to the user's monthly budget and term. After the AFFORD-001 rebuild, the new `/affordability` page (two-floor model) does not include it, and the old `AffordabilitySettings` page is deprecated.

Three options were considered:
1. **Keep on `/affordability`** — below Floor 2, collapsible
2. **Move to `/rates`** — shown with a fixed reference budget (e.g., £6K/month)
3. **Delete** — the two-floor design makes it redundant

### Decision

**Keep on `/affordability`** — placed below Floor 2, collapsible by default.

### Rationale

1. **Personal data**: The chart is meaningful only with the user's actual monthly budget as the input. Moving it to `/rates` would require showing it with a generic budget, which reduces its value significantly.
2. **Thematic fit**: The two-floor model answers "how much can I borrow?" (Floor 1) and "what cash do I need?" (Floor 2). The chart answers "how has that borrowing power changed?" — a natural follow-on question at the bottom of the same page.
3. **Low visual priority**: Placed below Floor 2 as a collapsed "Purchasing Power History" accordion, it doesn't compete with the primary calculator UX but remains accessible.
4. **No other page is a better fit**: `/rates` is for market-level rate instruments (swap rates, BoE path). `/market` is for area performance and HPI. Neither is a natural home for personal purchasing power history.

### Consequences

- Frontend Engineer to add `<PurchasingPowerChart>` to `AffordabilityCalculator.tsx` below `CashAssessment`, wrapped in a collapsible section.
- Component receives `monthlyBudget` and `termYears` from the hook.
- Default state: collapsed (user clicks to expand).
