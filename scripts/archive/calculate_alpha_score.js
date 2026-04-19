/**
 * Alpha Score Audit Script
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPRECATED — formula logic has moved to scripts/alphaScore.ts (single source
 * of truth).  This file is kept for backwards-compatible invocation only.
 *
 * To run the audit:
 *   tsx scripts/calculate_alpha_score.ts
 *
 * The shared module (scripts/alphaScore.ts) is the ONLY file that defines
 * the alpha formula. All consumers — this script and the frontend — import
 * from it.  Do not re-implement the formula here.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Historical formula (v1 — for reference only):
 *
 *   overall = (tenureScore × 0.4) + (spatialScore × 0.3) + (priceScore × 0.3)
 *
 *   tenureScore:   SoFH = 10 | lease ≥150y = 10 | 125–149y = 8 | 90–124y = 7
 *   spatialScore:  Tube ≤300m +7, ≤500m +5, ≤800m +3 | Park ≤400m +3, ≤800m +1
 *   priceScore:    5 + (areaBenchmark − price_per_sqm)/areaBenchmark × 20, [0–10]
 *
 *   Area benchmarks (£/sqm): Chelsea £18k | Bayswater £14.55k | Primrose Hill £13.5k
 *                           | Belsize Park £12k | Islington N1 £11k | N7/W Hampstead £9.5k
 */
