/**
 * Alpha Score™ — Acquisition Quality Score
 * =========================================
 * Single source of truth for alpha score calculation.
 * Shared between frontend display and server audit script.
 * Canonical module: scripts/alphaScore.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OVERALL FORMULA (v1 — current)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   Overall = (tenureScore × 0.4) + (spatialScore × 0.3) + (priceScore × 0.3)
 *
 * Each component scores 0–10. Overall is 0–10, displayed to 1 decimal place.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT DETAIL (v1 — current)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. TENURE QUALITY (weight: 40%)
 *    Parsed from the tenure string.
 *    Score  Description
 *    ─────  ─────────────────────────────────────────
 *    10     Share of Freehold
 *    10     Leasehold ≥150 years
 *     8     Leasehold 125–149 years
 *     7     Leasehold 90–124 years
 *     4     Leasehold <90 years (below acquisition threshold)
 *     5     Unknown tenure type (neutral fallback)
 *
 * 2. SPATIAL ALPHA (weight: 30%)
 *    Two sub-factors summed, capped at 10:
 *
 *    Transit proximity (Tube / Elizabeth Line):
 *    Distance   Points  Notes
 *    ≤300m        +7    Prime zone — <5 min walk
 *    301–500m     +5    Good — <8 min walk
 *    501–800m     +3    Acceptable — up to 10 min walk
 *    >800m        0     Below threshold
 *
 *    Park / green space proximity:
 *    Distance   Points  Notes
 *    ≤400m        +3    Adjacent or very close
 *    401–800m     +1    Walking distance
 *    >800m        0     Limited green access
 *
 *    NOTE: Elizabeth Line bonus (+2 pts) will be added in DAT-197.
 *          Properties near E-LADOG stations receive transit bonus.
 *
 * 3. PRICE EFFICIENCY (weight: 30%)
 *    Compares price_per_sqm against the area benchmark:
 *
 *    priceScore = 5 + (discountPercent / 100) × 20
 *    discountPercent = ((benchmark − price_per_sqm) / benchmark) × 100
 *
 *    At benchmark price → score 5.0
 *    25% below benchmark → score 10.0
 *    Above benchmark → score <5.0, floor 0
 *
 *    Area benchmarks (£/sqm, empirical 2026):
 *    Chelsea SW3/SW10     £18,000    Primrose Hill NW1   £13,500
 *    Bayswater W2         £14,550    Belsize Park NW3    £12,000
 *    Islington N1          £11,000    Islington N7        £9,500
 *    West Hampstead NW6     £9,500    [unknown area]     £11,000
 *
 *    NULL HANDLING: if sqft is null, price_per_sqm is unreliable.
 *    Return null from price component — weight redistributed in v2 (DAT-197).
 *    Do NOT silently return 5.0 (neutral) as that masks missing data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WARNINGS (v1 — current)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The following conditions surface as warnings in AlphaScoreBreakdown:
 *   - Lease <90 years              → 'Below acquisition threshold — CAPEX risk'
 *   - Tube >800m                   → 'Poor transit connectivity'
 *   - Park >800m                   → 'Limited green space access'
 *   - price_per_sqm > benchmark     → 'Above market rate for this area'
 *   - sqft < 600                   → 'Below 600 sqft acquisition minimum' (v2)
 *   - EPC E/F/G                    → 'EPC below institutional minimum — CAPEX risk' (v2)
 *   - DOM > 90                     → 'Stale listing — investigate vendor motivation' (v2)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLANNED v2 IMPROVEMENTS (DAT-197 to DAT-202, FE-244)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * v2 adds four new scoring axes (target implementation: DAT-197 to DAT-202):
 *
 * C. MARKET DYNAMICS (DAT-198)     — Negotiation leverage from Days on Market
 *    DOM 0–14d: 0 | 15–30d: +0.2 | 31–60d: +0.5 | 61–120d: +1.0 | 120+d: +1.5
 *
 * D. TOTAL COST OF OWNERSHIP
 *    D1 EPC Rating (DAT-199):     A/B: +1.0 | C: +0.5 | D: 0 | E/F/G: −1.5
 *    D2 Floor Level (DAT-202):     Top: +0.3 | 4th+: +0.2 | 1st–3rd: 0 | Ground: −0.3
 *    D3 SC Density (DAT-202):     >£8/sqft/yr: −0.5 vs area avg, else 0
 *
 * E. LIFESTYLE / URBAN VILLAGE (DAT-200)
 *    ≤400m Waitrose or Whole Foods: +0.5 | ≤800m wellness hub: +0.3 | Both: +1.0
 *
 * F. APPRECIATION INTEGRATION (DAT-201)
 *    appreciation_potential >= 8: +0.5 | 6–7.9: 0 | 4–5.9: −0.3 | <4: −0.5
 *    Area volatility from appreciation_model: ±0.2 modifier
 *
 * G. MARKET STATUS MODIFIER (DAT-197)
 *    active: 0 | under_offer: −0.3 | withdrawn: −0.5 | sold: −1.0
 *
 * H. USER COMMUTE DESTINATION (DAT-197)
 *    Paternoster and Canada Square commute times scored directly.
 *    <20min: +1.5 | <30min: +1.0 | <45min: +0.5 | >45min: 0
 *    (Caps commute bonus at +3.0)
 *
 * v2 Rescaling:
 *   baseScore = (tenureScore × 0.4 + spatialScore × 0.3 + priceScore × 0.3) / 10 × 8
 *   overall = baseScore + DOM_mod + EPC_mod + lifestyle_mod + appreciation_mod
 *             + market_mod + floor_mod + SC_mod
 *   capped at 10.0
 *
 * See ADR-021 (DECISIONS.md) for the formal v2 architecture ADR.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Area } from '../types/property';

// ---------------------------------------------------------------------------
// Area price benchmarks (£/sqm, empirical 2026)
// ---------------------------------------------------------------------------

export const AREA_BENCHMARKS: Record<string, number> = {
  'Islington (N1)':      11_000,
  'Islington (N7)':        9_500,
  'Islington (N1/N7)':    11_000, // default to N1 for mixed
  'Bayswater (W2)':       14_550,
  'Belsize Park (NW3)':  12_000,
  'West Hampstead (NW6)': 9_500,
  'Chelsea (SW3/SW10)':  18_000,
  'Chelsea (SW3)':        18_000,
  'Chelsea (SW10)':      18_000,
  'Primrose Hill (NW1)': 13_500,
};

// ---------------------------------------------------------------------------
// Raw tenure string → structured data
// ---------------------------------------------------------------------------
function parseTenure(tenure: string | null | undefined): {
  score: number;
  raw: string;
  yearsRemaining?: number;
  isShareOfFreehold: boolean;
  benchmark: string;
} {
  const raw = tenure ?? '';
  const isSOF = raw.toLowerCase().includes('share of freehold');
  const isLeasehold = raw.toLowerCase().includes('leasehold');
  const yearsMatch = raw.match(/\d+/);
  const years = yearsMatch ? parseInt(yearsMatch[0]) : null;

  let score = 0;
  let benchmark = '≥90 years recommended';

  if (isSOF) {
    score = 10;
  } else if (isLeasehold) {
    if (years === null) {
      score = 5; // unknown — mid-range fallback
    } else if (years >= 150) {
      score = 10;
      benchmark = '≥150 years ✓';
    } else if (years >= 125) {
      score = 8;
      benchmark = '≥125 years ✓';
    } else if (years >= 90) {
      score = 7;
      benchmark = '≥90 years ✓';
    } else {
      score = 4;
      benchmark = '<90 years — below acquisition threshold';
    }
  } else {
    score = 5; // unknown tenure type — neutral
  }

  return {
    score,
    raw,
    yearsRemaining: years ?? undefined,
    isShareOfFreehold: isSOF,
    benchmark,
  };
}

// ---------------------------------------------------------------------------
// Tube + Park proximity → spatial score
// ---------------------------------------------------------------------------
function parseSpatial(
  nearestTubeDistance: number | null | undefined,
  parkProximity: number | null | undefined
): {
  score: number;
  tube: { distance: number; metresFromThreshold: string };
  park: { distance: number; metresFromThreshold: string };
  tubePoints: number;
  parkPoints: number;
} {
  const tube = nearestTubeDistance ?? 1000;
  const park = parkProximity ?? 1000;

  let tubePoints = 0;
  let tubeThreshold = '≤800m ✓';
  if (tube <= 300) {
    tubePoints = 7;
    tubeThreshold = '≤300m ✓';
  } else if (tube <= 500) {
    tubePoints = 5;
    tubeThreshold = '≤500m ✓';
  } else if (tube <= 800) {
    tubePoints = 3;
    tubeThreshold = '≤800m ✓';
  } else {
    tubeThreshold = `>800m (${tube}m) ✗`;
  }

  let parkPoints = 0;
  let parkThreshold = '≤800m ✓';
  if (park <= 400) {
    parkPoints = 3;
    parkThreshold = '≤400m ✓';
  } else if (park <= 800) {
    parkPoints = 1;
    parkThreshold = '≤800m ✓';
  } else {
    parkThreshold = `>800m (${park}m) ✗`;
  }

  const score = Math.min(10, tubePoints + parkPoints);

  return {
    score,
    tube: { distance: tube, metresFromThreshold: tubeThreshold },
    park: { distance: park, metresFromThreshold: parkThreshold },
    tubePoints,
    parkPoints,
  };
}

// ---------------------------------------------------------------------------
// Price efficiency vs area benchmark → price score
// ---------------------------------------------------------------------------
function parsePrice(
  pricePerSqm: number | null | undefined,
  area: Area | string | null | undefined
): {
  score: number;
  pricePerSqm: number;
  areaBenchmark: number;
  discountPercent: number;
  benchmarkArea: string;
} {
  const psqm = pricePerSqm ?? 0;
  const areaKey = area ?? '';
  const areaBenchmark = AREA_BENCHMARKS[areaKey] ?? 11_000;

  const discountPercent = areaBenchmark > 0
    ? ((areaBenchmark - psqm) / areaBenchmark) * 100
    : 0;

  let score = 5 + (discountPercent / 100) * 20;
  score = Math.max(0, Math.min(10, score));

  return {
    score: parseFloat(score.toFixed(1)),
    pricePerSqm: psqm,
    areaBenchmark,
    discountPercent: parseFloat(discountPercent.toFixed(1)),
    benchmarkArea: areaKey || 'Unknown area',
  };
}

// ---------------------------------------------------------------------------
// Warning detection
// ---------------------------------------------------------------------------
function detectWarnings(tenure: ReturnType<typeof parseTenure>, spatial: ReturnType<typeof parseSpatial>, price: ReturnType<typeof parsePrice>): string[] {
  const warnings: string[] = [];
  if (tenure.score < 7) {
    warnings.push('Lease <90 years — below acquisition threshold');
  }
  if (spatial.tube.distance > 800) {
    warnings.push('Poor transit connectivity — tube >800m');
  }
  if (spatial.park.distance > 800) {
    warnings.push('Limited green space access — park >800m');
  }
  if (price.discountPercent < 0) {
    warnings.push('Above market rate for this area');
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface AlphaBreakdown {
  // ─── Core score (v1) ────────────────────────────────────────────────────
  overall: number; // 0–10

  tenure: {
    score: number;             // 0–10
    raw: string;               // e.g. "Leasehold 125 years"
    yearsRemaining?: number;  // extracted from tenure string
    isShareOfFreehold: boolean;
    benchmark: string;        // e.g. "≥125 years recommended"
  };

  spatial: {
    score: number;             // 0–10
    tube: { distance: number; metresFromThreshold: string };
    park: { distance: number; metresFromThreshold: string };
    tubePoints: number;       // 0–7 (+ Elizabeth line bonus in v2)
    parkPoints: number;        // 0–3
    // v2 additions (DAT-197, DAT-200):
    elizabethLineBonus?: number;   // 0 or +2
    lifestyleBonus?: number;      // 0–1.0 (Waitrose/Wellness composite)
    commuteBonus?: {
      score: number;               // 0–3.0
      paternoster?: number;        // minutes
      canadaSquare?: number;       // minutes
    };
  };

  price: {
    score: number | null;     // 0–10 or null if sqft unknown (v2 fix)
    pricePerSqm: number;
    areaBenchmark: number;
    discountPercent: number; // positive = below benchmark (good)
    benchmarkArea: string;
  };

  // ─── Market Dynamics modifiers (v2 — DAT-198) ──────────────────────────
  dom?: {
    score: number;             // 0–1.5 negotiation leverage bonus
    value: number;             // raw DOM days
    signal: string;            // e.g. "Strong leverage — 90+ days"
  };

  // ─── Total Cost of Ownership (v2 — DAT-199, DAT-202) ───────────────────
  epc?: {
    score: number;             // +1.0 / +0.5 / 0 / −1.5
    rating: string;            // 'A'–'G'
    risk: string;              // e.g. "Institutional standard" or "Regulatory risk"
  };

  floorLevel?: {
    score: number;             // −0.3 to +0.3
    raw: string;               // e.g. "Top", "Ground", "1st"
  };

  serviceCharge?: {
    score: number;             // 0 or −0.5
    density: number;           // £/sqft/year
    areaAvg?: number;
  };

  // ─── Appreciation integration (v2 — DAT-201) ─────────────────────────────
  appreciationModifier?: {
    score: number;             // ±0.5 modifier
    potential: number;          // raw appreciation_potential (0–10)
    areaVolatility?: number;    // annual vol from appreciation_model
    scenario: 'bull' | 'base' | 'bear';
  };

  // ─── Market status modifier (v2 — DAT-197) ───────────────────────────────
  marketStatus?: {
    score: number;             // 0 or negative
    status: string;
  };

  // ─── Weights and warnings ───────────────────────────────────────────────
  weights: { tenure: number; spatial: number; price: number };
  warnings: string[];          // accumulates all warning conditions
}

/** Single source of truth for alpha score calculation — mirrors server script exactly */
export function calculateAlphaBreakdown(property: {
  tenure: string | null | undefined;
  nearest_tube_distance: number | null | undefined;
  park_proximity: number | null | undefined;
  price_per_sqm: number | null | undefined;
  area: Area | string | null | undefined;
}): AlphaBreakdown {
  const tenure = parseTenure(property.tenure);
  const spatial = parseSpatial(property.nearest_tube_distance, property.park_proximity);
  const price = parsePrice(property.price_per_sqm, property.area);
  const warnings = detectWarnings(tenure, spatial, price);

  const overall = parseFloat(
    (tenure.score * 0.4 + spatial.score * 0.3 + price.score * 0.3).toFixed(1)
  );

  return {
    overall,
    tenure,
    spatial,
    price,
    weights: { tenure: 0.4, spatial: 0.3, price: 0.3 },
    warnings,
  };
}

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
