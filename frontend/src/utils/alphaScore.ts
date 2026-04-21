/**
 * Alpha Score™ — Frontend Facade
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exports the canonical formula from scripts/alphaScore.ts.
 * The ONLY file that defines the alpha score formula is scripts/alphaScore.ts.
 * All other consumers (frontend, server audit scripts) must import from there.
 *
 * This file adds frontend-specific helpers only (colour utilities).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * v2 ALPHA SCORE COMPONENTS (DAT-197 through DAT-202):
 *
 * Base score (0–8 of the 0–10 total):
 *   tenure:     Share of Freehold = 10 | lease ≥150yr = 10 | 125–149yr = 8 | 90–124yr = 7 | <90yr = 4 | unknown = 5
 *   spatial:    tube ≤300m +7, ≤500m +5, ≤800m +3 | park ≤400m +3, ≤800m +1 [cap 10]
 *   price:      5 + (areaDiscount% / 100) × 20 | null if sqft unknown (weight redistributed)
 *
 * Modifiers (additive, applied after base score rescale):
 *   dom:              DOM negotiation leverage — 0–14d:0, 15–30d:+0.2, 31–60d:+0.5, 61–120d:+1.0, 120+d:+1.5
 *   epc:              A/B:+1.0 | C:+0.5 | D:0 | E/F/G:−1.5
 *   lifestyleBonus:   Waitrose/WholeFoods ≤400m +0.5 | wellness ≤800m +0.3 | both +1.0
 *   appreciationMod:  ≥8:+0.5 | 6–7.9:0 | 4–5.9:−0.3 | <4:−0.5 | volatility ±0.2
 *   marketStatus:     active:0 | under_offer:−0.3 | withdrawn:−0.5 | sold/sold_stc:−1.0
 *   floorLevel:       Top:+0.3 | 4th+:+0.2 | Ground:−0.3
 *   serviceCharge:    SC density >£8/sqft/yr → −0.5
 *
 * Warnings: lease <90yr, tube >800m, park >800m, above area benchmark, sqft <600,
 *           DOM >90d, EPC E/F/G, sold/sold_stc
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Area } from '../types/property';

// Re-export everything from the canonical source of truth
export {
  AREA_BENCHMARKS,
  type AlphaBreakdown,
  calculateAlphaBreakdown,
  calculateAlphaScore,
  parseTenure,
  parseSpatial,
  parsePrice,
  parseAppreciation,
  detectWarnings,
} from '../../../scripts/alphaScore';

import { calculateAlphaBreakdown as _calculateBreakdown } from '../../../scripts/alphaScore';

// ── Colour utilities (frontend-only) ─────────────────────────────────────

/** Compact score colour for UI badges */
export function alphaColor(score: number): 'emerald' | 'amber' | 'rose' {
  if (score >= 8) return 'emerald';
  if (score >= 5) return 'amber';
  return 'rose';
}

/** Tailwind text colour class for alpha score */
export function alphaTextColor(score: number): string {
  const c = alphaColor(score);
  return c === 'emerald' ? 'text-retro-green' : c === 'amber' ? 'text-amber-400' : 'text-rose-400';
}

/** Tailwind background colour class for alpha score badge */
export function alphaBgColor(score: number): string {
  const c = alphaColor(score);
  return c === 'emerald' ? 'bg-retro-green/10 border-retro-green/20 text-retro-green'
    : c === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    : 'bg-rose-500/10 border-rose-500/20 text-rose-400';
}

// ── Typed wrapper — passes ALL v2 fields for full alpha score calculation ────

/**
 * Calls the canonical calculateAlphaBreakdown with all v2 fields.
 * Use this for any property card or detail page that needs the full breakdown.
 *
 * @param property - Full property object with all enriched fields
 * @returns AlphaBreakdown with overall score, all component scores, warnings
 *
 * @example
 * const breakdown = calculateAlphaBreakdownFrontend({
 *   tenure: 'Share of Freehold',
 *   sqft: 750,
 *   price_per_sqm: 12000,
 *   nearest_tube_distance: 280,
 *   park_proximity: 350,
 *   area: 'Islington (N1)',
 *   dom: 45,
 *   epc: 'B',
 *   floor_level: '2nd',
 *   market_status: 'active',
 *   appreciation_potential: 7.5,
 *   waitrose_distance: 250,
 *   commute_paternoster: 22,
 * });
 * // breakdown.overall → 8.2
 * // breakdown.dom.score → 0.5 (31–60d leverage)
 * // breakdown.warnings → ['Poor transit connectivity — tube >800m', ...]
 */
export function calculateAlphaBreakdownFrontend(property: {
  tenure?: string | null;
  nearest_tube_distance?: number | null;
  nearest_tube_station?: string | null;
  park_proximity?: number | null;
  price_per_sqm?: number | null;
  sqft?: number | null;
  area?: Area | string | null;
  dom?: number | null;
  epc?: string | null;
  floor_level?: string | null;
  service_charge?: number | null;
  appreciation_potential?: number | null;
  area_volatility?: number | null;
  market_status?: string | null;
  waitrose_distance?: number | null;
  whole_foods_distance?: number | null;
  wellness_hub_distance?: number | null;
  commute_paternoster?: number | null;
  commute_canada_square?: number | null;
}) {
  return _calculateBreakdown(property as Parameters<typeof _calculateBreakdown>[0]);
}
