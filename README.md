# propSearch: Property Acquisition Research Dashboard

**propSearch** is a high-density research dashboard for identifying and acquiring prime properties in London. It aggregates data from multiple portals, calculates institutional-grade acquisition metrics, and presents everything in a Bloomberg Terminal-style interface designed for rapid, high-stakes decision-making.

**🔗 [Live Demo](https://prop-search.vercel.app/)** · Demo mode with sample London data · No authentication required

> This is a personal research tool. All data stays local. No commercial use, no account required.

---

## ✦ What propSearch Does

propSearch is purpose-built for a single use case: **finding and vetting the right prime London property at the right price.** It combines live portal data with institutional-quality analytics that most buyers only get from a buying agent — but surfaced in a real-time dashboard you control.

**Core capabilities:**

| Capability | What it means in practice |
|---|---|
| **Portal integration** | Scrape and import from Rightmove, Zoopla, and estate agent sites via Playwright + FlareSolverr |
| **Alpha Score™** | 0–10 acquisition quality rating using tenure, spatial access, price efficiency, EPC, DOM, floor level, service charge density, and lifestyle proximity |
| **Price evolution tracking** | Snapshot-based price history with reduction detection — know when a listing drops |
| **Spatial intelligence** | Distance to nearest Tube, Elizabeth Line stations, parks, Waitrose/Whole Foods, wellness hubs, and your commute destinations |
| **Total cost modelling** | Monthly outlay calculator with mortgage stress tests, SDLT, service charges, ground rent, and CAPEX estimates |
| **Pipeline workflow** | Track every property from Discovery → Shortlisted → Vetted → Archived |
| **Map view** | Interactive Leaflet map with London Tube/Overground lines and property markers |
| **Macro context** | HPI history, gilt yields, BoE base rate, mortgage rate bands, and seasonal market cycle phase |

---

## 📂 Key Pages

### Dashboard (`/`)
High-density overview: active pipeline counts, recent price reductions, alpha score distribution, HPI sparklines, market pulse indicators, and quick-access cards to shortlisted and vetted properties.

### Properties (`/properties`)
Full property list with inline alpha score badges, price delta, DOM, pipeline status, and filter controls. Sortable by any column.

### Property Detail (`/property/:id`)
Every acquisition data point for a single property in one view:
- Gallery with lightbox + floorplan tab + price history chart
- Alpha Score breakdown with tenure, spatial, price efficiency, DOM leverage, EPC, floor level, and service charge components
- Acquisition strategy section with realistic price, negotiation rationale, and thesis tags
- Total monthly outlay with mortgage, SDLT, service charge, ground rent, and council tax
- CAPEX & Retrofit node (EPC rating, improvement potential, estimated upgrade cost)
- Commute times to your key destinations

### Map View (`/map`)
Interactive Leaflet map with London Tube and Overground lines overlaid. Property markers with quick-preview on click.

### Comparison (`/compare`)
Side-by-side comparison of up to 4 properties. Winner highlighting across alpha score, price, sqft, DOM, and monthly outlay.

### Mortgage Tracker (`/mortgage`)
LTV band analysis, deposit mode configuration, and monthly payment calculations with stress testing at +2% rate scenarios.

### Rates (`/rates`)
Macro dashboard: HPI history (UK + London), gilt yields, BoE base rate, mortgage rate bands by LTV, seasonal market cycle phase, and SDLT calculator.

### Inbox (`/inbox`)
Incoming leads from scraped portal searches. Analyst triaging queue — enrich or reject before they enter the main pipeline.

---

## ⚡ Quick Start

```bash
git clone https://github.com/wvitzthum/propSearch.git
cd propSearch
make install
make start
```

Opens at **http://localhost:5173** (frontend) + **http://localhost:3001** (API).

To add your first property, click **"Add Property"** in the sidebar and paste a Rightmove or Zoopla URL. The scraper extracts listing data automatically.

---

## 🏠 Adapting for Your Own Use Case

propSearch is pre-configured for **prime London property acquisition** (Chelsea SW3/SW10, Islington N1/N7, Belsize Park NW3, West Hampstead NW6, Bayswater W2, Primrose Hill NW1). To adapt:

### Change target areas
Edit `frontend/src/types/property.ts` — update the `Area` type and `AREA_BENCHMARKS` in `scripts/alphaScore.ts` with your target postcodes and area benchmarks.

### Update scoring criteria
| File | What it controls |
|------|-----------------|
| `scripts/alphaScore.ts` | Alpha Score formula, weights, benchmarks, bonus thresholds |
| `agents/data_analyst/README.md` | Acquisition criteria (price range, bedroom count, tenure minimums) |
| `REQUIREMENTS.md` | Full scope definition |

### Configure commute destinations
Edit `commute_paternoster` / `commute_canada_square` references in `scripts/alphaScore.ts` and `agents/data_analyst/README.md` to use your actual commute targets.

### Swap city transit geometry
Replace `data/london_metro.geojson` with your target city's transit GeoJSON for the map layer.

---

## 🛠 Available Commands

| Command | Description |
|---------|-------------|
| `make start` | Start API + frontend dev server |
| `make install` | Install all dependencies |
| `make api` | Start API server only |
| `make sync` | Run data ingestion pipeline (inbox → SQLite) |
| `make build` | Build frontend for production |
| `make tasks` | View active task backlog |
| `make tasks-regen` | Regenerate Tasks.md from tasks.json |
| `make lint` | Run linter |

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/properties` | GET | List all properties (filter: `?pipeline_status=shortlisted`) |
| `/api/properties/:id` | GET | Single property with price history |
| `/api/properties/:id/status` | PATCH | Update pipeline status |
| `/api/properties/:id/enrichment-request` | POST | Request field enrichment |
| `/api/enrichment-requests` | GET | List enrichment requests |
| `/api/macro` | GET | Macro indicators (HPI, yields, rates, SDLT tiers) |
| `/api/inbox` | GET | Inbox leads |
| `/api/health` | GET | API health check |

---

## 📊 Data Flow

```
Portal URL (Rightmove/Zoopla/G&H)
        │
        ▼
  Scraping Layer (Playwright + FlareSolverr)
        │  Extracts: sqft, bedrooms, tenure, EPC, images,
        │  floorplan, price history, nearest stations
        ▼
  Inbox / Import Layer (data/inbox/, data/import/)
        │  JSON schema validation, duplicate detection
        ▼
  Sync Pipeline (sync_data.js → SQLite)
        │  Upsert → price_history snapshot on price change
        ▼
  SQLite DB (data/propSearch.db)
        │  WAL mode, indexed on id/pipeline_status/market_status
        ▼
  REST API (server/index.js — port 3001)
        │
        ▼
  React Dashboard (frontend — port 5173)
        │  Alpha Score calculation, affordability model,
        │  visx charts, Leaflet map
        ▼
  Property Detail / Dashboard / Map / Compare
```

---

## 📂 Project Structure

```
propSearch/
├── agents/
│   ├── data_analyst/       # Research, scraping, alpha scoring, enrichment
│   ├── data_engineer/      # SQLite schema, sync pipeline, API server
│   ├── frontend_engineer/   # React dashboard, visx charts
│   └── product_owner/       # Task management, strategic roadmap
├── data/
│   ├── propSearch.db       # SQLite database (WAL mode)
│   ├── london_metro.geojson # Tube/Overground line geometry
│   ├── inbox/              # New leads pending analysis
│   └── import/             # Drop JSON/JSONL here for batch import
├── frontend/src/
│   ├── components/         # visx charts, cards, modals
│   ├── hooks/              # usePropertyContext, usePipeline, useAffordability
│   ├── pages/              # Dashboard, PropertyDetail, MapView, Compare, Rates
│   └── types/              # Property, PriceHistoryEntry, MacroData types
├── scripts/
│   ├── sync_data.js        # Main ingestion pipeline
│   ├── price_monitor.js    # Weekly price change detector
│   ├── scrape_*.js         # Portal scrapers (Rightmove, Zoopla, G&H)
│   └── capture_images.js   # Localise remote images to data/images/
├── server/
│   └── index.js            # Node.js REST API (better-sqlite3, no Express)
└── docs/screenshots/        # UI screenshots for documentation
```

---

## 🤖 AI Agent System

The project includes Claude-powered AI agents for automated property research:

```bash
# Requires RTK (Rust Token Killer)
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

make agent-analyst   # Property research, enrichment, metrics
make agent-de        # Data engineering, pipeline, schema
make agent-fe       # Frontend development
```

Agents read the agent protocol files in `agents/<role>/` and follow strict data guardrails — no synthetic data, no deletions, no overwrites of analyst-set fields.

---

## 📚 Key Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) — Project scope, acquisition criteria, and data requirements
- [DECISIONS.md](./DECISIONS.md) — Architectural Decision Records (ADRs)
- [AGENTS.md](./AGENTS.md) — AI agent behavioral rules and territorial boundaries
- [Tasks.md](./Tasks.md) — Full task backlog (auto-generated from `tasks/tasks.json`)

---

## 🐛 Troubleshooting

**"npm error ERESOLVE" during install**
```bash
cd frontend && npm install --legacy-peer-deps
```

**Dashboard shows "No properties found"**
1. Verify API running: `curl http://localhost:3001/api/properties`
2. Check DB exists: `ls -la data/propSearch.db`
3. Run sync: `make sync`

**Map tiles not loading**
Verify `data/london_metro.geojson` exists. Check browser console for Leaflet errors.

**Demo mode (Vercel)**
The demo at https://prop-search.vercel.app/ uses `demo_master.json` with sample data. No real data is included.

---

## 📄 License

Personal research and educational use. Property data sourced from public portals must be used in accordance with their terms of service.

---

*Built with [React 19](https://react.dev/), [visx](https://airbnb.io/visx/), [Leaflet](https://leafletjs.com/), [Tailwind CSS](https://tailwindcss.com/), and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).*
