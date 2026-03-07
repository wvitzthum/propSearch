# immoSearch: Private Property Acquisition Dashboard

## Project Mission
immoSearch is a specialized research platform built to identify and acquire a specific prime London property for personal residential use. This is a private tool, designed to automate the heavy lifting of data gathering and analysis, allowing the buyer to focus on high-stakes decision-making.

**Note:** This project is for internal research and personal use only. It is not intended for commercial distribution or external revenue generation.

## The Agent Ecosystem
We utilize a multi-agent workflow to separate concerns and ensure a "Bloomberg Terminal meets Linear" high-fidelity experience.

### Starting Agents in Separate Terminals
You can easily spawn dedicated terminal windows for each agent role in VS Code:
1.  Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux).
2.  Search for **Tasks: Run Task**.
3.  Select the desired agent (e.g., **Agent: Product Owner**, **Agent: Data Gatherer**, etc.).
This will open a new terminal window and pre-load the Gemini CLI with that agent's specific role and instructions.

---
## Agent Roles
...

    - Maintains the [REQUIREMENTS.md](./REQUIREMENTS.md) strategic roadmap.
    - Defines new features and strategic priorities in [Tasks.md](./Tasks.md).
2.  **[Data Gatherer](./agents/data_gatherer/README.md):** 
    - Scrapes and normalizes property listings from multiple sources.
...

    - Applies proprietary **Alpha Score** logic and pricing analysis.
    - Maintains the property registry (`data/master.json`).
2.  **[Frontend Engineer](./agents/frontend_engineer/README.md):** 
    - Builds the dashboard using React + Tailwind, optimized for a single buyer.
    - Implements data-dense views inspired by the clean, precise UI patterns of `linear.app`.
    - **No Auth:** Directly serves the dashboard without login or user-management layers.
3.  **[UI/UX QA](./agents/ui_ux_qa/README.md):** 
    - Audits functionality, dark mode, and visual consistency against "Linear" design standards.
    - Manages the [Tasks.md](./Tasks.md) backlog for the Frontend Engineer.

---

## Best Use Case
The system is optimized for a single-buyer feedback loop:
1.  The **Data Gatherer** surfaces a new batch of properties.
2.  The **QA Agent** ensures the dashboard displays this data correctly (e.g., checking if the Alpha Score logic translates visually).
3.  The **Frontend Engineer** refines the interface based on QA feedback.
4.  The **User** (Private Buyer) uses the final dashboard to filter down to the top 1% of opportunities for viewings.

---

## Project Structure
- `/agents`: Role-specific instructions and workflows.
- `/data`: Property datasets, including snapshots and the master registry.
- `/frontend`: The React + Tailwind CSS dashboard.
- `Tasks.md`: Centralized bug and feature tracking for the frontend development.
- `GEMINI.md`: Core system directives and agent coordination rules.
