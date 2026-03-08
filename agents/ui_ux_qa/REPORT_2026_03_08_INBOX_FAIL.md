# QA Audit Report: QA-025 - Active Capture Workflow

## Audit Objective
Validate the end-to-end listing capture pipeline: Raw Scrape -> Inbox Triage -> Master DB Promotion.

## Findings
The workflow is currently **Broken at the Triage-to-Promotion stage**.

| Stage | Status | Observation |
| --- | --- | --- |
| Raw Capture | **PASS** | `server/index.js` correctly saves incoming scraper JSON to `data/inbox/`. |
| Inbox UI | **PASS** | The `Inbox.tsx` view correctly lists pending raw leads and allows keyboard-driven triage (A/R). |
| API Handshake | **PASS** | The frontend sends a `POST` request with the triage action to the server. |
| **Promotion Logic** | **FAIL (CRITICAL)** | The `server/index.js` `POST /api/inbox` handler only re-saves the triaged file back to `data/inbox/`. It **does not** promote approved leads to `master.json` or move them to a processing queue. |
| **Persistence** | **FAIL** | Raw listings are not deleted or moved after triage, leading to an ever-growing list in the UI that requires manual deletion of JSON files. |

## Recommendations
1. **API Update:** Modify `server/index.js` to handle the `action: 'approve'` logic. It should either append the data to `master.json` directly (not recommended for large files) or, better, move the file to a `data/triaged/` folder where `sync_data.js` can pick it up.
2. **Sync Expansion:** Update `scripts/sync_data.js` to process the `data/triaged/` directory.
3. **Archive Protocol:** Ensure triaged files are moved out of the `inbox` directory to maintain "Inbox Zero" in the UI.

## Conclusion
The "Active Capture" feature is functionally incomplete. It is currently a data "Black Hole" where leads enter but never reach the primary research dashboard.
