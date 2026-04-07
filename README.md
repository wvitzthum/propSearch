# propSearch: Property Acquisition Research Dashboard

**propSearch** is a high-density research dashboard for identifying and acquiring prime properties. It aggregates data from multiple sources, calculates institutional-grade metrics (Alpha Scores, appreciation potential, value gaps), and presents everything in a Bloomberg Terminal-style interface for rapid decision-making.

**🔗 [Live Demo](https://prop-search.vercel.app/)** (demo mode with sample London data)

> This project is designed for personal/research use. No authentication required — all data stays local.

---

## 🎯 What Does This Do?

- **Property Discovery:** Scrape/import listings from Rightmove, Zoopla, and estate agent portals
- **Institutional Metrics:** Calculate Alpha Scores, value gaps, appreciation potential, and total cost of ownership
- **Comparison Engine:** Side-by-side analysis of multiple properties with winner highlighting
- **Pipeline Workflow:** Track properties from Discovery → Shortlisted → Vetted → Archived
- **Map View:** Interactive Leaflet map with London Tube/Overground lines and property markers
- **Macro Context:** HPI history, rental yields, purchasing power, and gilt yield correlations

---

## ⚡ Quick Start

### Prerequisites
- **Node.js:** v20.x or higher
- **npm** (comes with Node.js)
- **Make** (optional but recommended)

### 1. Clone and Install

```bash
git clone https://github.com/wvitzthum/propSearch.git
cd propSearch
make install
```

Or without Make:

```bash
cd frontend && npm install && cd ..
```

### 2. Start the Application

```bash
make start
```

This starts:
- **Dashboard:** http://localhost:5173
- **API Server:** http://localhost:3001

### 3. Add Your First Property

1. Open the dashboard at http://localhost:5173
2. Click **"Add Property"** in the sidebar
3. Paste a Rightmove, Zoopla, or estate agent URL
4. The system will scrape and analyze it automatically

---

## 🏠 Adapting for Your Own Use Case

This project is pre-configured for **prime London property acquisition**. To adapt it for your own market:

### 1. Change the Target City

Edit `data/london_metro.geojson` with your city's transit geometry (or remove it for non-map use).

### 2. Update Scoring Criteria

Modify scoring weights in `agents/data_analyst/`:

| File | Purpose |
|------|---------|
| `alpha_score.js` | Overall property score calculation |
| `appreciation_potential.js` | 5-year growth rating |
| `value_gap.js` | Price efficiency vs market |

### 3. Configure Data Sources

Update `data/sources/` with your target portals:

```json
{
  "name": "Rightmove",
  "base_url": "https://www.rightmove.co.uk",
  "scraper": "scrape_rightmove.js"
}
```

### 4. Adjust Commute Destinations

Edit the commute targets in `agents/data_analyst/README.md` or update `REQUIREMENTS.md` to reflect your key destinations.

### 5. Customize Property Types

Filter by your target property types in `src/hooks/useProperties.ts`:

```typescript
const filters = {
  propertyType: ['Flat', 'House', 'Penthouse'],
  minBedrooms: 2,
  maxPrice: 2000000
};
```

---

## 📊 Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Property URLs  │ ──▶ │  Data Pipeline   │ ──▶ │  SQLite DB       │
│  (Manual/Scape)  │     │  (Normalize)     │     │  (propSearch.db)│
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │  Dashboard UI   │ ◀─────────────┘
                        │  (React + visx) │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   REST API      │
                        │   /api/properties│
                        └─────────────────┘
```

### Data Files
- `data/propSearch.db` — SQLite database with all property records
- `data/inbox/` — New leads pending analysis
- `data/import/` — Drop raw JSON here for batch import
- `data/demo_master.json` — Sample dataset for demo mode

---

## 🛠 Available Commands

| Command | Description |
|---------|-------------|
| `make start` | Start API + frontend dev server |
| `make install` | Install all dependencies |
| `make api` | Start API server only |
| `make sync` | Run data ingestion pipeline |
| `make build` | Build frontend for production |
| `make clean` | Remove build artifacts |
| `make lint` | Run linter |
| `make tasks` | View active task backlog |

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/properties` | GET | List all properties (supports `?status=shortlisted`) |
| `/api/properties/:id` | GET | Get single property details |
| `/api/properties/:id/status` | PATCH | Update pipeline status |
| `/api/metrics` | GET | Aggregate market metrics |
| `/api/macro` | GET | Macro indicators (HPI, yields, etc.) |

---

## 🗂 Project Structure

```
propSearch/
├── agents/              # AI agent instructions and domain logic
│   ├── data_analyst/    # Property research, Alpha scoring, metrics
│   ├── data_engineer/   # SQLite, pipelines, API server
│   └── frontend_engineer/ # React dashboard implementation
├── data/                # Property database and datasets
│   ├── propSearch.db    # SQLite database
│   ├── london_metro.geojson # Transit map geometry
│   └── import/          # Drop files here for batch import
├── frontend/            # React 19 + Tailwind CSS dashboard
│   └── src/
│       ├── components/  # Chart components (visx), PropertyCard, etc.
│       ├── hooks/       # useProperties, useMacroData, usePipeline
│       └── pages/       # Dashboard, PropertyDetail, Compare
├── server/              # Node.js REST API server
└── scripts/             # Utility scripts
```

---

## 📚 Key Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) — Project goals and detailed requirements
- [DECISIONS.md](./DECISIONS.md) — Architectural decision records
- [AGENTS.md](./AGENTS.md) — AI agent behavioral rules
- [agents/README.md](./agents/README.md) — Agent system documentation

---

## 🤖 AI Agent System (Optional)

This project includes Claude-powered AI agents for automated property research:

```bash
# Install RTK (required for agents)
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

# Run specific agents
make agent-analyst    # Property research and metrics
make agent-de         # Data engineering
make agent-fe         # Frontend development
```

Agents can automatically:
- Scrape new property listings
- Calculate Alpha Scores and valuations
- Update the database with enriched data
- Identify data quality issues

---

## 🐛 Troubleshooting

### "npm error ERESOLVE" during install
```bash
cd frontend && npm install --legacy-peer-deps
```

### Dashboard shows "No properties found"
1. Check API server is running: `curl http://localhost:3001/api/properties`
2. Verify database exists: `ls -la data/propSearch.db`
3. Run sync: `make sync`

### Map not loading
- Verify `data/london_metro.geojson` exists
- Check browser console for Leaflet errors
- Ensure you're not blocking map tiles in firewall

### Demo mode (Vercel deployment)
The demo at https://prop-search.vercel.app/ uses `demo_master.json` with sample data. To populate with your own data, use the "Add Property" button or drop JSON files into `data/import/`.

---

## 📄 License

This project is for personal research and educational use. Property data sourced from public portals must be used in accordance with their terms of service.

---

*Built with [React 19](https://react.dev/), [visx](https://airbnb.io/visx/), [Leaflet](https://leafletjs.com/), and [Tailwind CSS](https://tailwindcss.com/).*
