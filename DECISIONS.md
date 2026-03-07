# immoSearch: Architectural & Design Decisions (ADRs)

This document tracks major strategic pivots, technical choices, and design constraints for the immoSearch platform.

## ADR-001: Multi-Agent Architecture
**Date:** 2026-03-07
**Status:** Accepted
**Context:** Need for specialized domains (Data, UI, Strategy) to handle high-stakes property acquisition.
**Decision:** Implement a 4-agent system (Product Owner, Data Gatherer, Frontend Engineer, UI/UX QA) with strict territorial boundaries.
**Consequence:** High quality and domain focus, but requires rigorous orchestration via `Tasks.md`.

## ADR-002: "Bloomberg Terminal meets Linear" Aesthetic
**Date:** 2026-03-07
**Status:** Accepted
**Context:** User requires high-density data for rapid decision-making without the "clutter" of consumer real-estate portals.
**Decision:** Combine Bloomberg's data density (dark mode, KPIs, real-time feel) with Linear's precision (subtle borders, Inter typography, refined spacing).
**Consequence:** Rejection of standard UI libraries (MUI, Bootstrap) in favor of custom Tailwind-based components.

## ADR-003: Single-User / No-Auth Architecture
**Date:** 2026-03-07
**Status:** Accepted
**Context:** Private tool for a single high-net-worth buyer.
**Decision:** Zero authentication, login screens, or user-management. The app loads directly into the master dashboard.
**Consequence:** Maximum speed and simplicity; no backend required beyond local JSON/GeoJSON files.

## ADR-004: Empirical Data Integrity (Anti-Hallucination)
**Date:** 2026-03-07
**Status:** Accepted
**Context:** High-stakes financial decisions require 100% accurate data.
**Decision:** Strict prohibition of synthetic/placeholder data. All listings must be scraped from live sources or direct agent sites.
**Consequence:** Slower data gathering phase but 100% reliability for the buyer.

## ADR-005: Schema-First Development (Synchronization)
**Date:** 2026-03-07
**Status:** Accepted
**Context:** Discovered "silent drift" between JSON schemas and TypeScript types.
**Decision:** Adopt a "Schema-First" approach where `data/property.schema.json` is the source of truth. Data Gatherer is responsible for synchronizing `frontend/src/types/property.ts` upon schema changes.
**Consequence:** Prevents runtime errors and ensures frontend feature parity with data updates.
