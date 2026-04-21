/**
 * Alpha Score™ — Acquisition Quality Score
 * =========================================
 * Single source of truth for alpha score calculation.
 * Shared between frontend display and server audit scripts.
 * Canonical module: scripts/alphaScore.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OVERALL FORMULA (v2 — DAT-197 through DAT-202)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   baseScore    = (tenureScore × 0.4 + spatialScore × 0.3 + priceScore × 0.3) / 10 × 8
 *   overall      = baseScore + DOM_mod + EPC_mod + lifestyle_mod + appreciation_mod
 *                  + market_mod + floor_mod + SC_mod
 *                  → capped at 10.0, floored at 0.0
 *
 * priceScore returns null when sqft is unknown (weight redistributed to tenure + spatial).
 * All other missing data is treated as a 0 modifier — not hidden as neutral 5.0.
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
 *    Sub-factors summed, capped at 10, then inflated by bonuses:
 *
 *    Transit proximity (Tube):
 *    ≤300m  +7  Prime zone — <5 min walk
 *    ≤500m  +5  Good — <8 min walk
 *    ≤800m  +3  Acceptable — up to 10 min walk
 *    >800m   0  Below threshold
 *
 *    Park / green space proximity:
 *    ≤400m  +3  Adjacent or very close
 *    ≤800m  +1  Walking distance
 *    >800m   0  Limited green access
 *
 *    Elizabeth Line bonus (DAT-197): +2 if tube ≤500m AND station is E-LADOG station.
 *    Stations: Tottenham Court Road, Farringdon, Liverpool Street, Canary Wharf,
 *    Custom House, Abbey Wood, Whitechapel, Bond Street, Reading, Heathrow, etc.
 *
 *    Lifestyle / Urban Village bonus (DAT-200):
 *    ≤400m Waitrose or Whole Foods:  +0.5
 *    ≤800m wellness hub:             +0.3
 *    Both conditions met:             +1.0 (shown as separate bonus row)
 *
 *    User Commute Destination (DAT-197):
 *    Paternoster + Canada Square scored directly. <20min: +1.5 | <30min: +1.0 | <45min: +0.5 | >45min: 0.
 *    Cap commute bonus at +3.0. Shown as commute sub-row in breakdown.
 *
 * 3. PRICE EFFICIENCY (weight: 30%)
 *    priceScore = 5 + (discountPercent / 100) × 20, [0–10]
 *    discountPercent = ((benchmark − price_per_sqm) / benchmark) × 100
 *    NULL HANDLING: if sqft is null, priceScore = null. Weight redistributed:
 *    tenure 46%, spatial 54%. Never silently return 5.0 — that masks missing data.
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
 * v2 COMPONENTS (DAT-197 through DAT-202 — now implemented)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C. MARKET DYNAMICS — DOM Negotiation Leverage (DAT-198)
 *    0–14d:   0      (fresh, no signal)
 *   15–30d:  +0.2    (normal)
 *   31–60d:  +0.5    (cooling — negotiating room opening)
 *   61–120d: +1.0    (stale — strong leverage)
 *   120+d:   +1.5    (very stale — distressed vendor)
 *    unknown: 0      (assume normal)
 *    Warning if DOM > 90: stale listing flag.
 *
 * D. TOTAL COST OF OWNERSHIP
 *    D1 EPC Rating (DAT-199):
 *    A/B: +1.0  (institutional standard) | C: +0.5 | D: 0 | E/F/G: −1.5 (regulatory risk)
 *    Warning if EPC E/F/G: regulatory risk flag.
 *
 *    D2 Floor Level (DAT-202):
 *    Top: +0.3 | 4th+: +0.2 | 1st–3rd: 0 | Ground: −0.3 | unknown: 0
 *
 *    D3 Service Charge Density (DAT-202):
 *    SC density = service_charge / sqft (£/sqft/yr). >£8/sqft/yr vs area avg: −0.5
 *
 * E. LIFESTYLE / URBAN VILLAGE (DAT-200)
 *    ≤400m Waitrose or Whole Foods: +0.5 | ≤800m wellness hub: +0.3 | Both: +1.0
 *
 * F. APPRECIATION INTEGRATION (DAT-201)
 *    appreciation_potential ≥8: +0.5 | 6–7.9: 0 | 4–5.9: −0.3 | <4: −0.5 | null: 0
 *    Area volatility from appreciation_model: <3%/yr: +0.2 | >5%: −0.2
 *
 * G. MARKET STATUS MODIFIER (DAT-197)
 *    active: 0 | under_offer: −0.3 | withdrawn: −0.5 | sold/sold_stc: −1.0
 *
 * H. USER COMMUTE DESTINATION (DAT-197)
 *    Paternoster + Canada Square. <20min: +1.5 | <30min: +1.0 | <45min: +0.5 | >45min: 0
 *    Cap commute bonus at +3.0.
 *
 * See DECISIONS.md ADR-021 for the formal v2 architecture ADR.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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
  'Pimlico (SW1)':       14_500,
  'Bermondsey (SE1)':    12_500,
};

// ---------------------------------------------------------------------------
// Raw tenure string → structured data
// ---------------------------------------------------------------------------
export function parseTenure(tenure: string | null | undefined): {
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
// Elizabeth Line station names (DAT-197)
// ---------------------------------------------------------------------------

export const ELIZABETH_LINE_STATIONS = new Set([
  'bond street', 'tottenham court road', 'farringdon', 'liverpool street',
  'canary wharf', 'whitechapel', 'custom house', 'abbey wood',
  'reading', 'twyford', 'maidenhead',
  'heathrow terminal 4', 'heathrow terminal 5',
  'shenfield', 'brentwood',
  'woolwich', 'stratford', 'london city airport',
]);

/** True if station name is an Elizabeth Line station */
export function isElizabethLineStation(stationName: string | null | undefined): boolean {
  if (!stationName) return false;
  return ELIZABETH_LINE_STATIONS.has(stationName.toLowerCase());
}

// ---------------------------------------------------------------------------
// Spatial scoring: Tube + Park + Elizabeth Line + Lifestyle + Commute
// ---------------------------------------------------------------------------

export interface ParseSpatialOptions {
  nearestTubeStation?: string | null;
  waitroseDistance?: number | null;
  wholeFoodsDistance?: number | null;
  wellnessHubDistance?: number | null;
  commutePaternoster?: number | null;
  commuteCanadaSquare?: number | null;
}

export function parseSpatial(
  nearestTubeDistance: number | null | undefined,
  parkProximity: number | null | undefined,
  options?: ParseSpatialOptions
): {
  score: number;
  tube: { distance: number; metresFromThreshold: string };
  park: { distance: number; metresFromThreshold: string };
  tubePoints: number;
  parkPoints: number;
  elizabethLineBonus: number;
  lifestyleBonus: number;
  commuteBonus: { score: number; paternoster?: number; canadaSquare?: number };
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

  // Elizabeth Line bonus (DAT-197): +2 if tube ≤500m and station is E-LADOG
  const tubeStation = options?.nearestTubeStation;
  let elizabethLineBonus = 0;
  if (tube <= 500 && isElizabethLineStation(tubeStation)) {
    elizabethLineBonus = 2;
  }

  // Lifestyle / Urban Village bonus (DAT-200)
  const waitrose = options?.waitroseDistance ?? 1000;
  const wholeFoods = options?.wholeFoodsDistance ?? 1000;
  const wellness = options?.wellnessHubDistance ?? 1000;

  let lifestyleBonus = 0;
  const nearGrocery = waitrose <= 400 || wholeFoods <= 400;
  const nearWellness = wellness <= 800;
  if (nearGrocery && nearWellness) lifestyleBonus = 1.0;
  else if (nearGrocery) lifestyleBonus = 0.5;
  else if (nearWellness) lifestyleBonus = 0.3;

  // Commute destination bonus (DAT-197)
  const paternoster = options?.commutePaternoster ?? null;
  const canadaSquare = options?.commuteCanadaSquare ?? null;

  const scoreCommute = (mins: number | null): number => {
    if (mins === null) return 0;
    if (mins < 20) return 1.5;
    if (mins < 30) return 1.0;
    if (mins < 45) return 0.5;
    return 0;
  };

  const commuteScore = Math.min(3.0, scoreCommute(paternoster) + scoreCommute(canadaSquare));

  return {
    score,
    tube: { distance: tube, metresFromThreshold: tubeThreshold },
    park: { distance: park, metresFromThreshold: parkThreshold },
    tubePoints,
    parkPoints,
    elizabethLineBonus,
    lifestyleBonus,
    commuteBonus: {
      score: commuteScore,
      paternoster: paternoster ?? undefined,
      canadaSquare: canadaSquare ?? undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Price efficiency vs area benchmark → price score (DAT-197 fix: null-safe)
// ---------------------------------------------------------------------------

export function parsePrice(
  pricePerSqm: number | null | undefined,
  area: string | null | undefined,
  sqft: number | null | undefined
): {
  score: number | null;
  pricePerSqm: number;
  areaBenchmark: number;
  discountPercent: number;
  benchmarkArea: string;
  reason?: string;
} {
  // FIX: if sqft is unknown, price_per_sqm is unreliable — return null
  if (sqft === null || sqft === undefined) {
    const areaBenchmark = AREA_BENCHMARKS[area ?? ''] ?? 11_000;
    return {
      score: null,
      pricePerSqm: pricePerSqm ?? 0,
      areaBenchmark,
      discountPercent: 0,
      benchmarkArea: area ?? 'Unknown area',
      reason: 'sqft unknown — price efficiency indeterminate',
    };
  }

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
// DOM → Negotiation Leverage (DAT-198)
// ---------------------------------------------------------------------------

export function parseDOM(dom: number | null | undefined): {
  score: number;
  value: number | null;
  signal: string;
} {
  if (dom === null || dom === undefined) {
    return { score: 0, value: null, signal: 'Unknown DOM' };
  }
  let score = 0;
  let signal = 'Fresh — no leverage signal';
  if (dom > 120) {
    score = 1.5;
    signal = `Very stale — distressed vendor (${dom}d)`;
  } else if (dom > 60) {
    score = 1.0;
    signal = `Stale — strong leverage (${dom}d)`;
  } else if (dom > 30) {
    score = 0.5;
    signal = `Cooling — negotiating room opening (${dom}d)`;
  } else if (dom > 14) {
    score = 0.2;
    signal = `Normal — no signal (${dom}d)`;
  } else {
    score = 0;
    signal = `Fresh listing (${dom}d)`;
  }
  return { score, value: dom, signal };
}

// ---------------------------------------------------------------------------
// EPC Rating → Institutional Standard Risk (DAT-199)
// ---------------------------------------------------------------------------

export function parseEPC(epc: string | null | undefined): {
  score: number;
  rating: string;
  risk: string;
} {
  const raw = (epc ?? '').toUpperCase().trim();
  const letter = raw.match(/[A-G]/)?.[0] ?? '';

  let score = 0;
  let risk = 'Unknown EPC — assume baseline';

  if (letter === 'A' || letter === 'B') {
    score = 1.0;
    risk = 'Institutional standard — no CAPEX needed';
  } else if (letter === 'C') {
    score = 0.5;
    risk = 'Acceptable — minor upgrades viable';
  } else if (letter === 'D') {
    score = 0;
    risk = 'Needs improvement before rental/resale';
  } else if (letter === 'E' || letter === 'F' || letter === 'G') {
    score = -1.5;
    risk = 'Regulatory risk — EPC reform 2025+, CAPEX required';
  }

  return { score, rating: letter || 'Unknown', risk };
}

// ---------------------------------------------------------------------------
// Floor Level scoring (DAT-202)
// ---------------------------------------------------------------------------

export function parseFloorLevel(floorLevel: string | null | undefined): {
  score: number;
  raw: string;
} {
  const raw = (floorLevel ?? '').toLowerCase().trim();
  let score = 0;

  if (raw.includes('ground')) {
    score = -0.3;
  } else if (raw.includes('top') || raw.includes('roof')) {
    score = 0.3;
  } else if (raw.match(/\d+/)) {
    const n = parseInt(raw.match(/\d+/)?.[0] ?? '0');
    if (n >= 4) score = 0.2;
  }

  return { score, raw: floorLevel ?? 'Unknown' };
}

// ---------------------------------------------------------------------------
// Service Charge Density (DAT-202)
// ---------------------------------------------------------------------------

export const SC_DENSITY_THRESHOLD = 8; // £/sqft/year

export const SC_AREA_AVG: Record<string, number> = {
  'Islington (N1)': 6.5,
  'Islington (N7)': 5.0,
  'Bayswater (W2)': 8.0,
  'Belsize Park (NW3)': 5.5,
  'West Hampstead (NW6)': 5.0,
  'Chelsea (SW3/SW10)': 7.5,
  'Chelsea (SW3)': 7.5,
  'Chelsea (SW10)': 7.5,
  'Primrose Hill (NW1)': 6.0,
};

export function parseServiceCharge(
  serviceCharge: number | null | undefined,
  sqft: number | null | undefined,
  area: string | null | undefined
): {
  score: number;
  density: number;
  areaAvg: number;
  benchmark: string;
} {
  if (serviceCharge === null || serviceCharge === undefined || sqft === null || sqft === undefined || sqft === 0) {
    return {
      score: 0, density: 0,
      areaAvg: SC_AREA_AVG[area ?? ''] ?? 6.0,
      benchmark: 'Unknown — insufficient data',
    };
  }

  const density = parseFloat((serviceCharge / sqft).toFixed(2));
  const areaAvg = SC_AREA_AVG[area ?? ''] ?? 6.0;
  const score = density > SC_DENSITY_THRESHOLD ? -0.5 : 0;
  const benchmark = density > SC_DENSITY_THRESHOLD
    ? `>${SC_DENSITY_THRESHOLD}£/sqft/yr — excess service charge`
    : `Within normal range (avg ${areaAvg}£/sqft/yr for area)`;

  return { score, density, areaAvg, benchmark };
}

// ---------------------------------------------------------------------------
// Appreciation integration (DAT-201)
// ---------------------------------------------------------------------------

export function parseAppreciation(
  appreciationPotential: number | null | undefined,
  areaVolatility?: number | null
): {
  score: number;
  potential: number | null;
  areaVolatility?: number;
  scenario: 'bull' | 'base' | 'bear';
} {
  const potential = appreciationPotential ?? null;
  let score = 0;

  if (potential !== null) {
    if (potential >= 8) score = 0.5;
    else if (potential >= 6) score = 0;
    else if (potential >= 4) score = -0.3;
    else score = -0.5;
  }

  if (areaVolatility !== null && areaVolatility !== undefined) {
    if (areaVolatility < 3) score += 0.2;
    else if (areaVolatility > 5) score -= 0.2;
  }

  return {
    score: parseFloat(Math.max(-1, Math.min(1, score)).toFixed(2)),
    potential,
    areaVolatility: areaVolatility ?? undefined,
    scenario: score >= 0.3 ? 'bull' : score <= -0.3 ? 'bear' : 'base',
  };
}

// ---------------------------------------------------------------------------
// Market status modifier (DAT-197)
// ---------------------------------------------------------------------------

export function parseMarketStatus(status: string | null | undefined): {
  score: number;
  status: string;
} {
  const raw = (status ?? 'active').toLowerCase().trim();
  let score = 0;

  if (raw === 'under_offer') score = -0.3;
  else if (raw === 'withdrawn') score = -0.5;
  else if (raw === 'sold_stc' || raw === 'sold' || raw === 'sold_completed') score = -1.0;

  return { score, status: raw };
}

// ---------------------------------------------------------------------------
// AlphaBreakdown interface
// ---------------------------------------------------------------------------

export interface AlphaBreakdown {
  /** Overall 0–10, after all modifiers applied */
  overall: number;

  tenure: {
    score: number;             // 0–10
    raw: string;
    yearsRemaining?: number;
    isShareOfFreehold: boolean;
    benchmark: string;
  };

  spatial: {
    score: number;              // 0–10 (tube + park base)
    tube: { distance: number; metresFromThreshold: string };
    park: { distance: number; metresFromThreshold: string };
    tubePoints: number;         // 0–7
    parkPoints: number;         // 0–3
    elizabethLineBonus: number; // 0 or +2
    lifestyleBonus: number;     // 0–1.0
    commuteBonus: {
      score: number;            // 0–3.0
      paternoster?: number;
      canadaSquare?: number;
    };
  };

  price: {
    score: number | null;       // 0–10 or null if sqft unknown
    pricePerSqm: number;
    areaBenchmark: number;
    discountPercent: number;
    benchmarkArea: string;
    reason?: string;
  };

  /** Market Dynamics — DOM Negotiation Leverage (DAT-198) */
  dom: {
    score: number;              // 0–1.5
    value: number | null;
    signal: string;
  };

  /** Total Cost of Ownership — EPC Rating (DAT-199) */
  epc: {
    score: number;
    rating: string;
    risk: string;
  };

  /** Total Cost of Ownership — Floor Level (DAT-202) */
  floorLevel: {
    score: number;              // −0.3 to +0.3
    raw: string;
  };

  /** Total Cost of Ownership — Service Charge Density (DAT-202) */
  serviceCharge: {
    score: number;              // 0 or −0.5
    density: number;
    areaAvg: number;
    benchmark: string;
  };

  /** Appreciation integration (DAT-201) */
  appreciationModifier: {
    score: number;
    potential: number | null;
    areaVolatility?: number;
    scenario: 'bull' | 'base' | 'bear';
  };

  /** Market status modifier (DAT-197) */
  marketStatus: {
    score: number;              // 0 or negative
    status: string;
  };

  weights: { tenure: number; spatial: number; price: number };
  warnings: string[];
  /** Active component names for display */
  components: string[];
}

// ---------------------------------------------------------------------------
// Warning detection (expanded for v2)
// ---------------------------------------------------------------------------

export function detectWarnings(params: {
  tenure: ReturnType<typeof parseTenure>;
  spatial: ReturnType<typeof parseSpatial>;
  price: ReturnType<typeof parsePrice>;
  dom?: ReturnType<typeof parseDOM>;
  epc?: ReturnType<typeof parseEPC>;
  sqft?: number | null;
  marketStatus?: ReturnType<typeof parseMarketStatus>;
}): string[] {
  const warnings: string[] = [];
  const { tenure, spatial, price, dom, epc, sqft, marketStatus } = params;

  if (tenure.score < 7) warnings.push('Lease <90 years — below acquisition threshold');
  if (spatial.tube.distance > 800) warnings.push('Poor transit connectivity — tube >800m');
  if (spatial.park.distance > 800) warnings.push('Limited green space access — park >800m');
  if (price.discountPercent < 0) warnings.push('Above market rate for this area');
  if (sqft !== null && sqft !== undefined && sqft < 600) warnings.push('Below 600 sqft acquisition minimum');
  if (dom?.value !== null && dom?.value !== undefined && dom.value > 90) warnings.push('Stale listing — investigate vendor motivation');
  if (epc?.rating === 'E' || epc?.rating === 'F' || epc?.rating === 'G') warnings.push('EPC below institutional minimum — CAPEX risk');
  if (marketStatus?.status === 'sold' || marketStatus?.status === 'sold_stc') warnings.push('Property sold — review for archiving');

  return warnings;
}

// ---------------------------------------------------------------------------
// Full Alpha Score calculation (v2)
// ---------------------------------------------------------------------------

/** Full breakdown — used by frontend display */
export function calculateAlphaBreakdown(property: {
  tenure?: string | null;
  nearest_tube_distance?: number | null;
  nearest_tube_station?: string | null;
  park_proximity?: number | null;
  price_per_sqm?: number | null;
  area?: string | null;
  sqft?: number | null;
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
}): AlphaBreakdown {
  const tenure = parseTenure(property.tenure);
  const spatial = parseSpatial(property.nearest_tube_distance, property.park_proximity, {
    nearestTubeStation: property.nearest_tube_station,
    waitroseDistance: property.waitrose_distance,
    wholeFoodsDistance: property.whole_foods_distance,
    wellnessHubDistance: property.wellness_hub_distance,
    commutePaternoster: property.commute_paternoster,
    commuteCanadaSquare: property.commute_canada_square,
  });
  const price = parsePrice(property.price_per_sqm, property.area, property.sqft);
  const dom = parseDOM(property.dom);
  const epc = parseEPC(property.epc);
  const floorLevel = parseFloorLevel(property.floor_level);
  const sc = parseServiceCharge(property.service_charge, property.sqft, property.area);
  const appreciation = parseAppreciation(property.appreciation_potential, property.area_volatility);
  const marketStatus = parseMarketStatus(property.market_status);
  const warnings = detectWarnings({ tenure, spatial, price, dom, epc, sqft: property.sqft, marketStatus });

  // v2 base score: if priceScore is null, redistribute weight (tenure 46%, spatial 54%)
  let baseScore: number;
  if (price.score !== null) {
    baseScore = (tenure.score * 0.4 + spatial.score * 0.3 + price.score * 0.3) / 10 * 8;
  } else {
    baseScore = (tenure.score * 0.4 + spatial.score * 0.6) / 10 * 8;
  }

  // Apply all modifiers
  const modifiers = dom.score + epc.score + spatial.lifestyleBonus + appreciation.score
    + marketStatus.score + floorLevel.score + sc.score;

  const overall = Math.min(10.0, Math.max(0.0, parseFloat((baseScore + modifiers).toFixed(1))));

  // Build active component list
  const components: string[] = ['tenure', 'spatial', 'price'];
  if (dom.score !== 0) components.push('dom');
  if (epc.score !== 0) components.push('epc');
  if (spatial.lifestyleBonus !== 0) components.push('lifestyle');
  if (appreciation.score !== 0) components.push('appreciation');
  if (marketStatus.score !== 0) components.push('marketStatus');
  if (floorLevel.score !== 0) components.push('floorLevel');
  if (sc.score !== 0) components.push('serviceCharge');

  return {
    overall,
    tenure,
    spatial,
    price,
    dom,
    epc,
    floorLevel,
    serviceCharge: sc,
    appreciationModifier: appreciation,
    marketStatus,
    weights: { tenure: 0.4, spatial: 0.3, price: 0.3 },
    warnings,
    components,
  };
}

/** Returns a plain number. Used by server audit scripts. */
export function calculateAlphaScore(
  property: Parameters<typeof calculateAlphaBreakdown>[0]
): number {
  return calculateAlphaBreakdown(property).overall;
}
