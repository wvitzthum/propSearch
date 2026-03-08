# UX Audit Report: QA-029 - Pipeline Fidelity (Vetted Status)

## Audit Objective
Verify the implementation of the full acquisition pipeline: `Discovered` -> `Shortlisted` -> `Vetted` -> `Archived`.

## Findings
The pipeline is **Functionally Incomplete** at the "Vetted" stage.

| Requirement | Status | Observation |
| --- | --- | --- |
| Type Support | **PASS** | `PropertyStatus` includes `'vetted'`. |
| Hook Support | **PASS** | `usePipeline.ts` correctly saves and retrieves `'vetted'` status. |
| **Transition UI** | **FAIL** | No button exists in `PropertyTable` or `PreviewDrawer` to promote a shortlisted asset to `Vetted`. |
| **Dashboard Filter** | **FAIL** | The control panel only has a "Shortlist" toggle. There is no way to view only vetted assets. |
| **KPI Integration** | **FAIL** | The "Shortlisted Assets" KPI only counts `'shortlisted'` status, ignoring `'vetted'` assets which are technically further in the funnel. |

## Recommendations
1. **Component Update:** Add a "Vetted" toggle (perhaps a Shield or Gem icon) to `PropertyTable` and `PreviewDrawer`.
2. **Dashboard Filter:** Add a "Vetted Only" toggle to the control panel.
3. **KPI Logic:** The "Active Pipeline" KPI should ideally count both `shortlisted` and `vetted` assets, or separate them into two distinct nodes.

## Conclusion
The "Vetted" status is currently a "Ghost Status"—it exists in the code but is inaccessible to the user. This breaks the primary acquisition workflow defined in `REQUIREMENTS.md`.
