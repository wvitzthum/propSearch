# Learnings — user corrections made permanent

**Read on every launch.** Append new entries below when the user corrects you.
**Format:** `## YYYY-MM-DD` + `**Trigger:**` + `**Was:**` + `**Now:**` + `**Scope:**` + `**Status:**`
**Never delete.** Mark `Superseded` when a later correction replaces a rule.
**PO formalises** stable entries into PROTOCOLS/ or README.md.

---

## 2026-04-05

**Trigger:** Deposit shown in AffordabilityNode sidebar (£222K) didn't match user's configured fixed deposit (£75K)
**Was:** `getBudgetProfile` in useAffordability.ts always derived deposit from monthly budget (auto-mode logic), completely ignoring `depositMode` and `depositPct` state — so the sidebar always showed affordability-based deposit regardless of settings
**Now:** `getBudgetProfile` checks `depositMode` first: fixed mode uses `depositPct`, auto mode uses monthly-budget derivation. Also fixes monthly payment and stress test to be consistent with the selected mode.
**Scope:** `useAffordability.ts` — getBudgetProfile; any component that shows deposit in the context of the user's configured settings
**Status:** Active

---

## 2026-04-05

**Trigger:** AreaPerformanceChart.tsx had `useTooltip` hook called AFTER a conditional `return null` — violated Rules of Hooks
**Was:** Hooks called after an early return guard (`if (!data || areas.length === 0) return null`)
**Now:** `useTooltip` (and ALL hooks) are called unconditionally before ANY conditional returns
**Scope:** All React components — any hook called after an early return is a bug
**Status:** Active

---

## 2026-04-07

**Trigger:** User-initiated enrichment requests + Recheck feature added
**Was:** No formal queue for property data refresh; no recheck on PropertyDetail page
**Now:** Two new features per ADR-018: (1) "Request Enrichment" button on PropertyDetail — POST to enrichment_requests table (FE-229); (2) "Re-check" button on PropertyDetail — POST /api/properties/:id/check updates last_checked (FE-231). Reference ArchiveReview.tsx for handleRecheck pattern.
**Scope:** Frontend Engineer — FE-229 (enrichment modal), FE-231 (recheck button), both on PropertyDetail.tsx
**Status:** Active — tasks FE-229, FE-231 filed

---

## 2026-04-04

**Trigger:** Ports 3001 and 5173 are the user's own dev servers — agents must not start them
**Was:** Agent started `npm run dev` or `node server/index.js` during tasks
**Now:** Uses Playwright test suite for verification. Never starts dev servers.
**Scope:** All agents
**Status:** Formalised — see PROTOCOLS/04_SESSION_STARTUP.md

---

## 2026-04-18

**Trigger:** Bash heredocs + Python heredocs collapse JS regex backslashes when writing test/component files — `\\d` arrives as `\d` in the file, breaking Playwright locators.
**Was:** Attempting to write regex locators like `text=/\\d+K/` via `cat > file << END`, `python3 - << PYEOF`, or `Edit` tool all resulted in the JS file containing `text=/\d+K/` (single backslash, non-functional in Playwright).
**Now:** Write problematic lines via indexed Python list assignment instead of heredoc/replace:

```python
with open('tests/pages/AffordabilityCalculator.spec.ts') as f:
    lines = f.readlines()
lines[17] = "    const rate = page.getByText(/\\d+\\.\\d{2}%/).first();\n"
with open('tests/pages/AffordabilityCalculator.spec.ts', 'w') as f:
    f.writelines(lines)
```

Or use `sed -i` for simple inline substitutions. Avoid multi-line heredocs when the content contains regex patterns or other double-escaped characters.
**Scope:** Any agent writing JS/TS test files or component files that contain regex literals, backslash-heavy patterns, or special chars via shell/Python heredoc. Affects Playwright locators, RegExp constructors, etc.
**Status:** Active
