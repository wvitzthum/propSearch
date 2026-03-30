# propSearch: Private Property Acquisition Dashboard

## Project Mission
**propSearch** is a bespoke, high-precision research platform designed for a single private buyer to identify and acquire a specific prime London property. Unlike consumer portals (Rightmove/Zoopla), this tool prioritizes data density, institutional-grade metrics, and rapid decision-making.

**🔗 [Live Demo (Slim/Dummy Mode)](https://prop-search.vercel.app/)**

> **Note:** This project is for internal research and personal use only. It is not intended for commercial distribution. No-Auth architecture is intentional.

---

## 🚀 Quick Start (Human User)

### 1. Prerequisites
- **Node.js:** v20.x or higher.
- **Make:** Standard Unix `make` (optional but recommended).
- **RTK:** Rust Token Killer (installed via `curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh`)

### 2. Installation
From the root directory, run:
```bash
make install
```
*This installs dependencies for both the frontend dashboard and the backend API.*

### 3. Launch the Platform
Start the full stack (API + Dashboard):
```bash
make start
```
- **Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Data API:** [http://localhost:3001](http://localhost:3001)

---

## 📊 How to Use the Dashboard

### 1. Discovery & Filtering
- **Table View (Default):** The dashboard defaults to a high-density table for rapid scanning of Alpha Scores, Price/SQFT, and Tenure.
- **Sorting:** Click table headers to sort by `Alpha Score` (H-L), `Realistic Price` (L-H), or `Price/SQM` (L-H).
- **Search (⌘K):** Use the Global Command Menu to jump to specific areas or properties.
- **Area Filters:** Use the sidebar to toggle specific target boroughs (Islington, Bayswater, Belsize Park, etc.).

### 2. The Comparison Engine (Compare 2.0)
- **Selection:** Click the "Compare" icon (or use the keyboard shortcut) on any property card to add it to your **Comparison Basket**.
- **Comparison Bar:** A persistent bar at the bottom tracks your selections.
- **Analytics Matrix:** View a side-by-side breakdown with "Winner" highlighting for key metrics (Green = Value Leader, Blue = Quality Leader).

### 3. Property Pipeline
Move properties through their lifecycle:
- `Discovered` (Inbox) -> `Shortlisted` (High Interest) -> `Vetted` (Inspected/Serious) -> `Archived` (Rejected).

---

## 📥 Adding Your Own Properties

### A. Manual Injection (Dashboard)
Use the "Add Property" button in the Sidebar to inject a direct URL from Rightmove, Zoopla, or an Estate Agent website. The system will automatically:
1.  Add it to the `manual_queue.json`.
2.  Trigger the Data Agent to perform a "Deep Scan" and calculate institutional metrics.
3.  Promote it to your Master DB.

### B. Batch Import (File Drop)
Drop raw JSON listings into `data/import/`. The next sync cycle (`make sync`) will normalize and ingest them.

---

## 🤖 Agent System

We utilize a specialized multi-agent workflow to ensure architectural purity. All agents run via Claude CLI with MiniMax 2.7 backend.

### Agent Responsibilities
1.  **[Product Owner](./agents/product_owner/README.md):** Vision, Roadmap, and Backlog management.
2.  **[Data Analyst](./agents/data_analyst/README.md):** Property research, metric normalization, Alpha Scoring, and macro market trends.
3.  **[Data Engineer](./agents/data_engineer/README.md):** Data architecture, storage (SQLite), ingestion pipelines, and backend API.
4.  **[Frontend Engineer](./agents/frontend_engineer/README.md):** "Bloomberg meets Linear" UI implementation.
5.  **[UI/UX QA](./agents/ui_ux_qa/README.md):** Aesthetic audits and functional validation.

### Running Agents

**Using Make:**
```bash
make agent-po              # Product Owner
make agent-analyst         # Data Analyst
make agent-de             # Data Engineer
make agent-fe             # Frontend Engineer
make agent-qa             # UI/UX QA
```

**With task context:**
```bash
make agent agent=analyst task=DE-140
```

**Direct script:**
```bash
./agents/run.sh analyst
./agents/run.sh fe "refactor PropertyTable"
```

**Shell aliases** (source `agents/aliases.sh`):
```bash
source agents/aliases.sh
po        # Product Owner
analyst   # Data Analyst
de        # Data Engineer
fe        # Frontend Engineer
qa        # UI/UX QA
```

See [agents/README.md](./agents/README.md) for full documentation.

### Agent Behavioral Rules
All agents must follow [AGENTS.md](./AGENTS.md) which defines:
- Territorial boundaries (no cross-folder writes without approval)
- RTK mandatory for high-volume operations
- Grep-first discovery pattern
- Data authenticity mandate (no synthetic/hallucinated data)

---

## 🛠 Developer Commands

| Command | Description |
|---------|-------------|
| `make install` | Install frontend dependencies |
| `make start` | Start API server + frontend dev |
| `make api` | Start API server only |
| `make sync` | Run data sync pipeline |
| `make build` | Build frontend for production |
| `make lint` | Run linter |
| `make clean` | Clean build artifacts |
| `make tasks` | View active backlog |
| `make help` | Show all available commands |

### RTK Token Tracking
```bash
rtk gain           # Show token savings
rtk gain --history # Show usage history
```

---

## 📁 Project Structure
```
/agents              Role-specific instructions, domain logic, and utility scripts
  /product_owner     Vision, roadmap, strategic decisions
  /data_analyst      Property research, Alpha scoring, macro trends
  /data_engineer     SQLite architecture, pipelines, backend API
  /frontend_engineer React dashboard implementation
  /ui_ux_qa         Audits, testing, metric validation
  /docs/archive      Archived/superseded documents
/data                Property datasets, SQLite DB, GeoJSON
/frontend            React 19 + Tailwind CSS dashboard
/server              Node.js HTTP API server
/tasks               Task backlog and archives
```

---

## 📄 Key Documentation
- [REQUIREMENTS.md](./REQUIREMENTS.md) - Project goals and requirements
- [DECISIONS.md](./DECISIONS.md) - Architectural Decision Records (ADRs)
- [Tasks.md](./Tasks.md) - Active task backlog
- [AGENTS.md](./AGENTS.md) - Agent behavioral rules and territorial boundaries
- [agents/README.md](./agents/README.md) - Agent system quick reference

---

## 💬 Support & Feedback
- **Bug Reports:** Log any visual or data issues in [Tasks.md](./Tasks.md) for the QA agent.
- **Strategic Ideas:** Open a discussion in `agents/product_owner/README.md` for new feature requests.
- **Data Suggestions:** If you find a new portal or agent website to scrape, add it to the `agents/data_engineer/README.md`.
