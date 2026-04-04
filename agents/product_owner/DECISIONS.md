# propSearch: Architectural Decisions

---

## ADR-015: Manual Media Management

**Date**: 2026-04-04  
**Status**: Approved  
**Deciders**: Product Owner, User  

---

### Context

The current scraper pipeline relies on automated extraction of property images and floorplan URLs. This frequently fails to capture:
- All gallery images (pagination, lazy-loading)
- Floorplans from certain agents
- Photos the user took during viewings

The user requested the ability to manually add/edit images and floorplan links.

---

### Decision

Implement **three phases** using URL-based manual entry only (no file upload):

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | URL inputs in PropertyDetail sidebar + server API | Ready for implementation |
| Phase 2 | Enhanced MediaManager with previews, add/remove/reorder | Future |
| Phase 3 | Bulk clipboard paste + bulk floorplan import page | Future |

**File upload is explicitly out of scope** for now.

---

### Rationale

**Why URL-based?**
- Aligns with existing data model (all images stored as URLs)
- No storage infrastructure needed
- User-provided URLs = same trust level as scraped URLs (external references)
- Easy to extend to file upload later if needed

**Why not file upload first?**
- Requires server storage strategy (local filesystem vs cloud)
- Image optimization/thumbnails needed
- Higher complexity for marginal benefit

---

### Consequences

**Positive**:
- Users can complete incomplete property records
- No storage infrastructure required
- Provenance tracking (timestamps) distinguishes user edits from scrapes

**Trade-offs**:
- Users must manually find/copy image URLs from agent websites
- No local image storage (URLs only)

---

### Data Guardrails Compliance

User-added images are treated as **external references** (same as scraped URLs), not fabricated data:

```javascript
// On any user media edit, server sets:
metadata.last_image_update = new Date().toISOString()  // e.g. "2026-04-04T10:30:00Z"
metadata.image_source = 'manual'                        // vs 'scraped' from pipeline
```

This allows data audits to filter/flag user-entered media separately.

---

### UI Wireframe Notes

```
┌─ Media Manager ──────────────────────────────┐
│ [🖼 Media] [Edit]                             │
│                                                │
│ Primary Image                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ [thumbnail]  [URL input____________]      │ │
│ └──────────────────────────────────────────┘ │
│                                                │
│ Gallery (3 images)              [+ Add Image]  │
│ ┌────┐ ┌────┐ ┌────┐                          │
│ │ 🗑 │ │ 🗑 │ │ 🗑 │                          │
│ └────┘ └────┘ └────┘                          │
│                                                │
│ Floorplan                                      │
│ [URL input________________] [View ↗]          │
│                                                │
│ [Cancel] [Save Changes]                        │
│                                                │
│ Last updated: 2 hours ago                      │
└───────────────────────────────────────────────┘
```

---

### Implementation Reference

- Server endpoint: `PATCH /api/properties/:id/media`
- New component: `frontend/src/components/MediaManager.tsx`
- Integration: `frontend/src/pages/PropertyDetail.tsx`
- Types: `frontend/src/types/property.ts` (extend PropertyMetadata)

Full task details: `Tasks.md`

---

## ADR-016: Alpha Score Transparency

**Date**: 2026-04-04  
**Status**: Approved  
**Deciders**: Product Owner, User  

---

### Context

The alpha score is the primary deal quality signal in propSearch, but it is currently opaque — users see a 0-10 number with no understanding of what drives it. The `AlphaBadge` tooltip shows mini bar charts, but these are derived from the overall score, not actual component values. The three inputs (tenure, spatial, price efficiency) are never surfaced.

This violates the "Institutional Grade" ethos — a professional researcher should be able to audit any score.

---

### Decision

Build a dedicated `AlphaScoreBreakdown` component in `PropertyDetail` that:

1. Shows the **actual component scores** (tenure 0-10, spatial 0-10, price 0-10) with labelled fill bars
2. Shows the **raw inputs** behind each component (e.g., "Leasehold 125 years", "287m to tube", "£10,200/sqm vs £12,000 area benchmark")
3. Highlights **warnings** for below-threshold factors (e.g., lease <90 years, tube >800m)
4. Maintains a **shared utility** (`frontend/src/utils/alphaScore.ts`) that mirrors the server calculation logic — ensuring frontend and backend stay in sync

---

### Why a Shared Utility

Currently `scripts/calculate_alpha_score.js` and the tooltip in `AlphaBadge.tsx` are two independent implementations. The tooltip's bars are mathematically meaningless (they're derived from the total score).

By extracting the calculation into a shared utility:
- Frontend can display real component scores
- Server audit script can import the same logic
- Future score changes only need to be made in one place

---

### Consequences

**Positive**:
- Users can audit scores, spot anomalies, and understand trade-offs
- Transparency builds trust in the scoring system
- Warnings flag actionable concerns (short lease, poor transit)
- Price efficiency benchmark comparison provides immediate context

**Trade-offs**:
- Additional UI complexity in PropertyDetail
- Utility function must be kept in sync with server script (risk of drift)
- Component scores are more verbose than a single number

---

### Implementation Notes

- See `Tasks.md` FE-203.1-203.5 for detailed acceptance criteria
- Utility function: `frontend/src/utils/alphaScore.ts`
- New component: `frontend/src/components/AlphaScoreBreakdown.tsx`
- Integrate into PropertyDetail replacing/enhancing the existing "Institutional Alpha Analysis" section

---



---

## ADR-017: Property State Model — Two Independent Axes

**Date**: 2026-04-04  
**Status**: Approved  
**Deciders**: Product Owner, User  

---

### Context

The original system used a single `archived` flag for two conceptually different situations:
1. User was not interested / deprioritised the property
2. Property was removed from the market (Rightmove/Zoopla delisted)

This conflation caused confusion — users couldn't tell from the UI whether a property was off-market or simply deprioritised.

---

### Decision

Introduce and enforce a **two-axis model**:

| Axis | Column | Owner | Purpose |
|------|--------|-------|---------|
| **User Pipeline** | `pipeline_status` | User (frontend) | "Am I tracking this?" — discovered / shortlisted / vetted / archived |
| **Market Reality** | `market_status` | Analyst | "Is it still listed?" — active / under_offer / sold_stc / sold_completed / withdrawn / unknown |

These axes are **independent**:
- A property can be `archived` (user not interested) but `active` (still on market)
- A property can be `discovered` (user just found it) but `withdrawn` (already off-market)

---

### UI Consequences

- Properties page defaults to hiding `archived` (user deprioritised) to surface active pipeline
- Grid cards show both axes as separate badges
- Analyst is responsible for keeping `market_status` accurate
- User is responsible for `pipeline_status`

---

### Migration Notes

- `market_status` column already exists in schema
- Default value: `'unknown'` (analyst must set accurately on enrichment)
- Existing records may have `market_status = null` — treat as `'unknown'`

---



---

## ADR-018: User-Initiated Enrichment Requests

**Date**: 2026-04-04  
**Status**: Approved  
**Deciders**: Product Owner, User  

---

### Context

The current system relies on the Data Analyst to discover incomplete records through automated inbox processing or periodic audits. The user has no way to explicitly request that the analyst fetch missing data for a specific property — they either wait for it to be enriched automatically or do it themselves.

This creates a gap: the user sees a property with missing sqft, EPC, or images but has no structured way to flag it for analyst attention.

---

### Decision

Introduce a formal **enrichment request queue**:

1. User clicks "Request Enrichment" on any property
2. Modal opens — user selects which fields need fetching and optionally adds notes
3. Request is stored in `enrichment_requests` table with `status: 'pending'`
4. Data Analyst polls the queue at session start, works through requests, marks complete
5. Property is updated in-place — no new record created

---

### Design

**New table: `enrichment_requests`**
- Property reference (snapshot of address at request time)
- List of fields requested
- Optional user notes
- Status: `pending` → `in_progress` → `completed` | `failed` | `cancelled`
- Analyst notes on completion

**Why a new table (not reuse `manual_queue`)?**
- `manual_queue` is for URL-based scraping of new leads
- `enrichment_requests` is for field-level enrichment of existing properties
- Different data shapes, different workflows — keep them separate

**Why not auto-enrich on request?**
- Some data (EPC, tenure) requires verification from official sources
- FlareSolverr scraping can fail/be blocked
- Analyst judgment is needed for quality control
- User gets explicit confirmation when enrichment is done

---

### Consequences

**Positive**:
- User has a structured way to flag incomplete properties
- Analyst has a prioritised work queue — no guessing what to enrich next
- Enrichment status is visible in the UI (pending badge)
- Completion is traceable (analyst_notes field)

**Trade-offs**:
- New table and API endpoints to maintain
- Analyst must adopt new polling workflow
- User might over-request enrichment (mitigated by conflict detection — no duplicate pending requests)

---

### Analyst Workflow

At start of each session:
```
1. GET /api/enrichment-requests?status=pending
2. For each request (max 3 in parallel):
   a. PATCH status = 'in_progress'
   b. Fetch data (EPC register, agent site, FlareSolverr)
   c. UPDATE properties table with fetched fields
   d. PATCH status = 'completed', analyst_notes = "..."
```

---

*Recorded: Product Owner*
