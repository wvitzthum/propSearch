# immoSearch: Private Property Acquisition Dashboard

## Project Mission
**immoSearch** is a bespoke, high-precision research platform designed for a single private buyer to identify and acquire a specific prime London property. Unlike consumer portals (Rightmove/Zoopla), this tool prioritizes data density, institutional-grade metrics, and rapid decision-making.

> **Note:** This project is for internal research and personal use only. It is not intended for commercial distribution.

## Strategic Pillars
1.  **Data Integrity:** Zero synthetic data. All listings are empirically sourced from live market data and verified against agent websites.
2.  **Visual Intelligence:** "Bloomberg Terminal meets Linear." High-contrast dark mode, information density, and keyboard-centric navigation.
3.  **Spatial Context:** Integrated London Metro and Green Space overlays for immediate location analysis.
4.  **Institutional Metrics:** Alpha Scores, Cap Rate potential, and Commute Utility calculations for every asset.

---

## The Agent Ecosystem
We utilize a specialized multi-agent workflow to ensure architectural purity and domain expertise.

### 1. [Product Owner & Strategy](./agents/product_owner/README.md)
- **Role:** Vision & Roadmap.
- **Focus:** Maintains [REQUIREMENTS.md](./REQUIREMENTS.md) and manages the feature backlog in [Tasks.md](./Tasks.md).
- **Key Output:** Strategic direction and "Inbox" management.

### 2. [Data Gatherer (Engineer)](./agents/data_gatherer/README.md)
- **Role:** Sourcing & Normalization.
- **Focus:** Scrapes listings, calculates Alpha/Appreciation scores, and maintains the `data/master.json` registry.
- **Key Output:** High-fidelity JSON datasets and schemas.

### 3. [Frontend Engineer](./agents/frontend_engineer/README.md)
- **Role:** UI/UX Implementation.
- **Focus:** Builds the React + Tailwind dashboard using "Linear-style" components and high-performance rendering.
- **Key Output:** A responsive, read-write dashboard for property analysis.

### 4. [UI/UX QA](./agents/ui_ux_qa/README.md)
- **Role:** Quality Assurance.
- **Focus:** Audits visual consistency, dark mode contrast, and functional integrity against the design system.
- **Key Output:** Bug reports and aesthetic refinements.

---

## Project Structure
- `/agents`: Role-specific instructions and workflows.
- `/data`: Property datasets, including snapshots (`DD_MM_YYYY.json`) and the master registry.
- `/frontend`: The React 19 + Tailwind CSS dashboard.
- `Tasks.md`: Centralized bug and feature tracking.
- `REQUIREMENTS.md`: The single source of truth for project goals.
- `DECISIONS.md`: Architectural Decision Records (ADRs).

## Getting Started
1.  **Launch Dashboard:** `cd frontend && npm run dev`
2.  **Run Agents:** Use the VS Code "Run Task" menu to spawn agent-specific terminals.
3.  **View Reports:** Check `agents/ui_ux_qa/` for the latest audit reports.
