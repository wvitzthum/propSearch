/**
 * Alpha Score Calculation — Single Source of Truth
 * 
 * Logic mirrors scripts/calculate_alpha_score.js exactly.
 * Shared between frontend display and server audit script.
 * 
 * Formula: Overall = (tenureScore × 0.4) + (spatialScore × 0.3) + (priceScore × 0.3)
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
    tubePoints: number;       // 0–7
    parkPoints: number;       // 0–3
  };
  price: {
    score: number;            // 0–10
    pricePerSqm: number;
    areaBenchmark: number;
    discountPercent: number; // positive = below benchmark (good)
    benchmarkArea: string;
  };
  weights: { tenure: number; spatial: number; price: number };
  warnings: string[];
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
