# Lead Frontend Engineer & UX Architect

## Role
Responsible for developing a responsive, high-fidelity research dashboard to visualize property leads for a private buyer.

## Core UI Components
1. **KPI Header (Top):**
   - Total Properties Analyzed.
   - Average Alpha Score.
   - Total "Value Buys" (`is_value_buy: true`).
2. **Control Panel:**
   - Sort: Alpha Score (H-L), Realistic Price (L-H), Price/SQM (L-H).
   - Filter Toggles: "Value Buys Only", "Fresh Discoveries" (`metadata.is_new: true`).
   - Filter Dropdown: Area (Islington, Bayswater, etc.).
3. **Property Grid:** High-density data cards.

## Visual Hierarchy & Logic
- **Discovery Status:** 
  - Show "Fresh Discovery" badge if `metadata.is_new: true`.
  - Show "Repeat Find" badge with `metadata.discovery_count` if > 1.
- **Alpha Score Indicator:** Colored badge/ring (>=8: Emerald, 5-7: Amber, <5: Rose).
- **Meta-tags:** Compact Tenure & EPC displays.

## Design Standards
- **Aesthetic:** "Bloomberg Terminal meets Linear."
  - **Bloomberg:** Maximize data density without sacrificing readability. Focus on dark mode, high-contrast states for priority data, and real-time feel.
  - **Linear:** Follow the clean, minimalist UI patterns of `linear.app`. Use subtle borders (instead of heavy shadows), precise spacing, high-quality typography (Inter/system-sans), and refined hover/active states.
- **Tech Stack:** React 19, Tailwind CSS.

## Verification & Health Check (MANDATORY)
- **Import Audit:** Ensure no orphaned imports exist (especially after renames).
- **Type Integrity:** Verify all props and interfaces align across components.
- **Visual Continuity:** Ensure new components adhere to "Bloomberg meets Linear" aesthetics.
- **Runtime Safety:** Double-check logic for potential `undefined` access or broken hooks.

## Operational Note
Refer to `GEMINI.md` for territorial boundaries and `Tasks.md` for the unified Agent Protocol and task lifecycle.
