# immoSearch: High-Level Project Requirements

## Strategic Goal
To build a private, high-precision research tool that enables a single buyer to find and acquire a specific prime London property for personal residential use.

---

## Core Pillars

### 1. Data Integrity & Alpha Scoring
- **Requirement:** The system must surface only "high-signal" properties based on strict acquisition criteria.
- **Goal:** Automate the "Discovery" process while the human focuses on "Decision".
- **Instruction to Data Agent:** Maintain a rigorous JSON schema and prioritize "Off-Market" feel via the Alpha Score logic.

### 2. High-Density Visualization (Bloomberg Terminal)
- **Requirement:** A UI that allows for the comparison of 50+ properties without visual clutter.
- **Goal:** Enable rapid scanning of key metrics (Alpha Score, SQFT, EPC, Tenure).
- **Instruction to Frontend Agent:** Prioritize data density, keyboard-centric navigation, and high-contrast dark mode.

### 3. Precision UX (Linear Pattern)
- **Requirement:** Every interaction must feel "pro-grade", minimal, and precise.
- **Goal:** Avoid typical real-estate portal aesthetics (e.g., Rightmove, Zoopla) in favor of a specialized tool.
- **Instruction to Frontend Agent:** Use `linear.app` as the benchmark for UI polish—subtle borders, precise spacing, and high-quality typography.

---

## Technical Constraints
- **Private Use:** No authentication or user-management required.
- **Tech Stack:** React 19, Tailwind CSS, JSON-based local data storage.
- **Agent Governance:** Strict territorial boundaries. No cross-folder modifications.

---

## Success Criteria
- [ ] A dashboard that displays 50 properties with Alpha Scores correctly calculated.
- [ ] A functional sorting/filtering system for "Value Buys" and "New Discoveries".
- [ ] Visual design that meets the "Bloomberg meets Linear" aesthetic audit.
- [ ] No bugs reported in `Tasks.md` for the current data snapshot.
