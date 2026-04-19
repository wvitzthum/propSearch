/**
 * PriceAssessment.tsx — UX-56
 * High-density price assessment card for /property/{id}.
 * Layout mirrors data/import/queens_gardens_price_assessment.html reference:
 *   - Verdict box (fair/underpriced/overpriced)
 *   - 4-metric KPI strip (asking, £/sqft, reduction, BoE rate)
 *   - Value benchmarks card + Property specs card (2-col)
 *   - Price range bar (Q1→Q3 with property marker)
 *   - Coloured key factors list (green/amber/rose dots)
 *   - Negotiation range table (offer tiers + SDLT + all-in cost)
 *
 * UX-57: This component becomes the hero at top of PropertyDetail page.
 * FE-256: Sidebar reuses the negotiation tier logic from here.
 */
import React, { useMemo } from 'react';
import type { PropertyWithCoords } from '../types/property';
import { calculateAlphaBreakdown } from '../utils/alphaScore';
import { buildNegotiationTiers } from '../utils/negotiationTiers';
import { extractValue } from '../types/macro';
import { useAppreciationModel } from '../hooks/useAppreciationModel';
import { useFinancialData } from '../hooks/useFinancialData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format price to k/M shorthand */
function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  return `£${Math.round(n / 1_000)}K`;
}

/** Format price to £Xk or £X.Xm */
function fmtPriceFull(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}M`;
  return `£${(n / 1_000).toFixed(0)}K`;
}

/** Estimate SDLT (UK residential, main residence, 2024 bands) */
function estimateSDLT(price: number): number {
  if (price <= 125_000) return 0;
  if (price <= 250_000) return (price - 125_000) * 0.02;
  if (price <= 925_000) return 2500 + (price - 250_000) * 0.05;
  if (price <= 1_500_000) return 36_250 + (price - 925_000) * 0.1;
  return 91_250 + (price - 1_500_000) * 0.12;
}

// ─── Fallback area constants (per sqft, £/sqft ranges) ────────────────────────

const AREA_FALLBACKS: Record<string, { q1: number; q3: number; avg: number; desc: string }> = {
  'Islington (N1)':      { q1: 1100, q3: 1550, avg: 1325, desc: 'N1 period flats' },
  'Islington (N7)':       { q1: 900,  q3: 1200, avg: 1050, desc: 'N7 conversion' },
  'Bayswater (W2)':       { q1: 972,  q3: 1326, avg: 1149, desc: 'W2 middle 50%' },
  'Belsize Park (NW3)':  { q1: 1200, q3: 1700, avg: 1450, desc: 'NW3 houses/flats' },
  'West Hampstead (NW6)': { q1: 950,  q3: 1350, avg: 1150, desc: 'NW6 period flats' },
  'Chelsea (SW3/SW10)':   { q1: 1400, q3: 2000, avg: 1700, desc: 'PCL prime' },
  'Chelsea (SW3)':        { q1: 1500, q3: 2200, avg: 1850, desc: 'SW3 prime' },
  'Chelsea (SW10)':       { q1: 1200, q3: 1700, avg: 1450, desc: 'SW10 embankment' },
  'Primrose Hill (NW1)':  { q1: 1350, q3: 1900, avg: 1625, desc: 'NW1 period' },
};

function getFallback(area: string | undefined) {
  if (!area) return AREA_FALLBACKS['Bayswater (W2)'];
  return AREA_FALLBACKS[area] ?? { q1: 1000, q3: 1500, avg: 1250, desc: 'area avg' };
}

// ─── Key factor types ─────────────────────────────────────────────────────────

interface KeyFactor {
  color: 'green' | 'amber' | 'red';
  label: string;
  description: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PriceAssessmentProps {
  property: PropertyWithCoords;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PriceAssessment: React.FC<PriceAssessmentProps> = ({ property }) => {
  const { priceBand } = useAppreciationModel(property.realistic_price, property.area);
  const { macroData } = useFinancialData();

  // ── Alpha breakdown ─────────────────────────────────────────────────────────
  const breakdown = useMemo(
    () => calculateAlphaBreakdown({
      tenure: property.tenure,
      nearest_tube_distance: property.nearest_tube_distance,
      park_proximity: property.park_proximity,
      price_per_sqm: property.price_per_sqm,
      sqft: property.sqft,
      area: property.area,
      dom: property.dom,
      epc: property.epc,
      floor_level: property.floor_level,
      service_charge: property.service_charge,
      market_status: property.market_status,
    }),
    [property]
  );

  // ── Price position ──────────────────────────────────────────────────────────
  const pricePerSqft = property.sqft > 0 ? Math.round(property.list_price / property.sqft) : 0;
  const areaQ1 = priceBand?.q1 ?? getFallback(property.area).q1;
  const areaQ3 = priceBand?.q3 ?? getFallback(property.area).q3;
  const areaAvg = priceBand?.median ?? getFallback(property.area).avg;

  // Position within Q1–Q3 range (0 = at Q1, 100 = at Q3)
  const rangeSpan = areaQ3 - areaQ1;
  const positionPct = rangeSpan > 0
    ? Math.max(0, Math.min(100, ((pricePerSqft - areaQ1) / rangeSpan) * 100))
    : 50;

  // ── Verdict ─────────────────────────────────────────────────────────────────
  const listDelta = property.list_price > 0
    ? ((property.realistic_price - property.list_price) / property.list_price) * 100
    : 0;

  const alphaOverall = breakdown.overall;
  const boeRate = extractValue(macroData?.economic_indicators?.boe_base_rate) ?? 3.75;

  type VerdictType = 'fair' | 'under' | 'over' | 'premium';
  interface VerdictContent {
    type: VerdictType;
    title: string;
    sub: string;
    bg: string;
    border: string;
    textColor: string;
    dotColor: string;
  }

  const verdict = useMemo<VerdictContent>(() => {
    if (alphaOverall >= 8 && listDelta <= -5) {
      return {
        type: 'under',
        title: 'Undervalued — acquisition grade',
        sub: `At £${fmtPriceFull(property.list_price)} (${pricePerSqft}/sqft), this is well below area benchmark. Alpha ${alphaOverall.toFixed(1)} confirms institutional quality. Strong bid defensible.`,
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        textColor: '#6ee7b7',
        dotColor: '#10b981',
      };
    }
    if (listDelta <= -3 && alphaOverall >= 7) {
      return {
        type: 'fair',
        title: 'Fairly priced — room to negotiate',
        sub: `At ${fmtPriceFull(property.list_price)}, macro headwinds and price reduction signal vendor motivation. A strong offer ${fmtPriceFull(Math.round(property.realistic_price * 0.945))}–${fmtPriceFull(Math.round(property.realistic_price * 0.97))} is defensible.`,
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        textColor: '#6ee7b7',
        dotColor: '#10b981',
      };
    }
    if (listDelta >= 5 || alphaOverall < 5) {
      return {
        type: 'over',
        title: 'Above market — reduce or pass',
        sub: `Listed ${Math.abs(listDelta).toFixed(1)}% above realistic value. Alpha ${alphaOverall.toFixed(1)} signals below-par acquisition quality. Offer below realistic or remove from pipeline.`,
        bg: 'rgba(244, 63, 94, 0.1)',
        border: 'rgba(244, 63, 94, 0.3)',
        textColor: '#fb7185',
        dotColor: '#f43f5e',
      };
    }
    if (alphaOverall >= 8 && listDelta >= -2) {
      return {
        type: 'premium',
        title: 'Premium acquisition — justified',
        sub: `Alpha ${alphaOverall.toFixed(1)} and prime location underpin the ask. BoE held at ${boeRate.toFixed(2)}%. Enter at realistic or near-ask only.`,
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.3)',
        textColor: '#93c5fd',
        dotColor: '#3b82f6',
      };
    }
    return {
      type: 'fair',
      title: 'Fairly priced — monitor for leverage',
      sub: `Listed at ${fmtPriceFull(property.list_price)}, ${Math.abs(listDelta).toFixed(1)}% ${listDelta < 0 ? 'below' : 'at'} realistic value. DOM ${property.dom ?? '—'} days. Watch for further reductions.`,
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
      textColor: '#6ee7b7',
      dotColor: '#10b981',
    };
  }, [alphaOverall, listDelta, property.list_price, property.realistic_price, property.dom, pricePerSqft, boeRate]);

  // ── Key factors ─────────────────────────────────────────────────────────────
  const keyFactors = useMemo<KeyFactor[]>(() => {
    const factors: KeyFactor[] = [];

    // Tenure
    const isShareOfFreehold = property.tenure?.toLowerCase().includes('share of freehold') || property.tenure?.toLowerCase().includes('freehold');
    if (isShareOfFreehold) {
      factors.push({
        color: 'green',
        label: 'Tenure',
        description: 'Share of freehold commands a meaningful premium over leasehold — adds long-term security and avoids ground rent / lease extension costs.',
      });
    } else if (breakdown.tenure.score < 7) {
      factors.push({
        color: 'amber',
        label: 'Tenure',
        description: `${property.tenure ?? 'Unknown'} — lease length may impact future liquidity. Check years remaining and consider extension costs.`,
      });
    }

    // Location quality
    if (breakdown.spatial.tube.distance > 0 && breakdown.spatial.tube.distance <= 500) {
      factors.push({
        color: 'green',
        label: 'Location quality',
        description: `${property.area} — tube ${breakdown.spatial.tube.distance}m. Strong fundamentals.`,
      });
    } else if (breakdown.spatial.tube.distance > 800 || breakdown.spatial.tube.distance === 0) {
      factors.push({
        color: 'red',
        label: 'Transit connectivity',
        description: 'Tube distance >800m — transit connectivity below institutional threshold. Negotiate on this basis.',
      });
    }

    // Price efficiency
    if (breakdown.price.discountPercent >= 3) {
      factors.push({
        color: 'green',
        label: 'Price efficiency',
        description: `${Math.abs(breakdown.price.discountPercent).toFixed(1)}% below area benchmark. Below-market entry.`,
      });
    } else if (breakdown.price.discountPercent < 0) {
      factors.push({
        color: 'red',
        label: 'Above benchmark',
        description: `Listed ${Math.abs(breakdown.price.discountPercent).toFixed(1)}% above area benchmark. Not a value entry.`,
      });
    }

    // EPC
    if (property.epc === 'A' || property.epc === 'B') {
      factors.push({
        color: 'green',
        label: `EPC ${property.epc}`,
        description: `${property.epc}-rated property — energy efficient, future-proofed for MEES 2030 landlord requirements.`,
      });
    } else if (property.epc === 'C' || property.epc === 'D') {
      factors.push({
        color: 'amber',
        label: `EPC ${property.epc}`,
        description: `${property.epc}-rated — typical for period stock. Improvement to B feasible. Factor CAPEX into offer.`,
      });
    } else {
      factors.push({
        color: 'red',
        label: `EPC ${property.epc ?? '?'}`,
        description: `${property.epc ?? '?'}-rated. EPC D or below increasingly impacts mortgageability and rental liquidity post-2030. Negotiate on CAPEX basis.`,
      });
    }

    // Price reduction signal
    if (property.price_reduction_percent && property.price_reduction_percent >= 5) {
      factors.push({
        color: 'green',
        label: 'Price reduction signal',
        description: `${property.price_reduction_percent.toFixed(0)}% cut signals vendor motivation and original ask was aspirational. Key leverage point.`,
      });
    } else if (property.dom && property.dom > 60) {
      factors.push({
        color: 'amber',
        label: 'Market duration',
        description: `${property.dom} days on market — stale listing. Vendor motivation elevated. Significant negotiation leverage.`,
      });
    }

    // Service charge
    if (property.service_charge && property.service_charge > 5000) {
      const scPerSqft = property.sqft > 0 ? property.service_charge / property.sqft : 0;
      if (scPerSqft > 8) {
        factors.push({
          color: 'red',
          label: 'High service charge',
          description: `£${property.service_charge.toLocaleString()}/yr (~£${scPerSqft.toFixed(1)}/sqft/yr). High density affects net yield and resale. Factor into offer.`,
        });
      }
    }

    // Floor level
    const fl = property.floor_level?.toLowerCase() ?? '';
    if (fl.includes('ground') || fl.includes('basement')) {
      factors.push({
        color: 'amber',
        label: 'Floor level',
        description: `${property.floor_level} floor — check flood risk, natural light, and security. Negotiating point.`,
      });
    } else if (fl.includes('top') || fl.includes('penthouse')) {
      factors.push({
        color: 'amber',
        label: 'Top floor considerations',
        description: `Top floor: check roof condition, summer heat, no lift access. Negotiating point affecting resale liquidity.`,
      });
    }

    // Warnings from alpha breakdown
    for (const warning of breakdown.warnings) {
      if (warning.includes('lease') && isShareOfFreehold) continue;
      if (warning.includes('tube') && breakdown.spatial.tube.distance <= 500) continue;
      factors.push({ color: 'red', label: 'Alpha flag', description: warning });
    }

    return factors.slice(0, 7);
  }, [breakdown, property]);

  // ── Negotiation tiers ──────────────────────────────────────────────────────
  const negotiationTiers = useMemo(() => buildNegotiationTiers(property.list_price), [property.list_price]);
  const sdlt = estimateSDLT(property.list_price);
  const allInCost = property.realistic_price + sdlt;

  // ── BoE rate ───────────────────────────────────────────────────────────────
  const boeRateDisplay = extractValue(macroData?.economic_indicators?.boe_base_rate) ?? 3.75;
  const currentMonthStr = new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' });

  const DOT_COLOR: Record<string, string> = {
    green: '#639922',
    amber: '#BA7517',
    red:   '#E24B4A',
  };

  const alphaScoreColor = alphaOverall >= 8 ? 'text-retro-green' : alphaOverall >= 5 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">

      {/* ── Verdict box ────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 border-b"
        style={{ backgroundColor: verdict.bg, borderColor: verdict.border + '40' }}
      >
        <div className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: verdict.dotColor }} />
          <div>
            <p className="text-[13px] font-medium leading-snug" style={{ color: verdict.textColor }}>
              Verdict: {verdict.title}
            </p>
            <p className="text-[11px] mt-1 leading-relaxed opacity-80" style={{ color: verdict.textColor }}>
              {verdict.sub}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4-metric KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x divide-white/5">
        {/* Asking price */}
        <div className="px-4 py-3">
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold mb-1">Asking price</div>
          <div className="text-[18px] font-bold text-white tracking-tight">{fmtPrice(property.list_price)}</div>
          {property.price_reduction_percent ? (
            <div className="text-[8px] text-linear-text-muted mt-0.5">Reduced ~{property.price_reduction_percent.toFixed(0)}%</div>
          ) : property.dom && property.dom > 30 ? (
            <div className="text-[8px] text-linear-text-muted mt-0.5">DOM {property.dom}d</div>
          ) : null}
        </div>

        {/* Price/sqft */}
        <div className="px-4 py-3">
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold mb-1">Price / sq ft</div>
          <div className="text-[18px] font-bold text-white tracking-tight">
            {pricePerSqft > 0 ? `£${pricePerSqft.toLocaleString()}` : '—'}
          </div>
          {pricePerSqft > 0 && (
            <div className="text-[8px] text-linear-text-muted mt-0.5">vs £{areaAvg.toLocaleString()} avg</div>
          )}
        </div>

        {/* BoE rate */}
        <div className="px-4 py-3">
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold mb-1">BoE base rate</div>
          <div className="text-[18px] font-bold text-white tracking-tight">{boeRateDisplay.toFixed(2)}%</div>
          <div className="text-[8px] text-linear-text-muted mt-0.5">Held {currentMonthStr}</div>
        </div>

        {/* Alpha score */}
        <div className="px-4 py-3">
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold mb-1">Alpha Score</div>
          <div className={`text-[18px] font-bold tracking-tight ${alphaScoreColor}`}>
            {alphaOverall.toFixed(1)}
          </div>
          <div className="text-[8px] text-linear-text-muted mt-0.5">
            {alphaOverall >= 8 ? 'Investment grade' : alphaOverall >= 5 ? 'Market neutral' : 'High variance'}
          </div>
        </div>
      </div>

      {/* ── Two-col: Value Benchmarks + Property Specs ─────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5">
        {/* Value benchmarks */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-medium text-linear-text-muted uppercase tracking-widest mb-3">
            Value benchmarks
          </div>
          <div className="space-y-0">
            {(() => {
              const areaName = (property.area ?? '').split(' (')[0];
              const thisSqm = property.price_per_sqm > 0 ? property.price_per_sqm : null;
              const sqftVsAvg = thisSqm && areaAvg ? ((thisSqm / (areaAvg * 10.764)) - 1) * 100 : null;
              return [
                { label: `${areaName || 'Area'} avg`,         value: `£${areaAvg.toLocaleString()}/sqft` },
                { label: 'This property £/sqm',                value: thisSqm ? `£${thisSqm.toLocaleString()}` : '—' },
                { label: 'Implied vs area',                   value: sqftVsAvg !== null ? `${sqftVsAvg >= 0 ? '+' : ''}${sqftVsAvg.toFixed(0)}%` : '—' },
                { label: 'Realistic price',                   value: fmtPriceFull(property.realistic_price) },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-[10px] text-linear-text-muted">{row.label}</span>
                  <span className="text-[10px] font-medium text-white">{row.value}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Property specs */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-medium text-linear-text-muted uppercase tracking-widest mb-3">
            Property specifics
          </div>
          <div className="space-y-0">
            {[
              { label: 'Size',            value: property.sqft > 0 ? `${Math.round(property.sqft / 10.764).toLocaleString()} sqm` : '—' },
              { label: 'Tenure',          value: property.tenure ?? '—' },
              { label: 'Bedrooms',        value: property.bedrooms != null ? `${property.bedrooms}` : '—' },
              { label: 'Service charge',  value: property.service_charge ? `£${property.service_charge.toLocaleString()}/yr` : 'Not stated' },
              { label: 'EPC rating',      value: property.epc ? `${property.epc}` : '—' },
              { label: 'Time on market',  value: property.dom ? `${property.dom} days` : '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                <span className="text-[10px] text-linear-text-muted">{row.label}</span>
                <span className="text-[10px] font-medium text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Price range bar ────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="text-[10px] text-linear-text-muted mb-1">
          {(property.area ?? '').split(' (')[0] || 'Area'} price range (middle 50% of sales) · £{areaQ1.toLocaleString()}–£{areaQ3.toLocaleString()}/sqft
        </div>
        <div className="relative h-2 bg-linear-bg rounded-full mt-2">
          {/* Full-range gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(to right, rgba(34,197,94,0.2), rgba(245,158,11,0.2))' }}
          />
          {/* Property marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white bg-rose-500 shadow-lg"
            style={{ left: `${positionPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-linear-text-muted">
          <span>£{areaQ1.toLocaleString()}/sqft (Q1)</span>
          <span className="text-rose-400 font-medium">This: £{pricePerSqft.toLocaleString()}</span>
          <span>£{areaQ3.toLocaleString()}/sqft (Q3)</span>
        </div>
      </div>

      {/* ── Key factors list ────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="text-[10px] font-medium text-linear-text-muted uppercase tracking-widest mb-3">
          Key factors
        </div>
        <div className="space-y-0">
          {keyFactors.map((factor, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <div
                className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: DOT_COLOR[factor.color] }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-white">{factor.label}</span>
                <span className="text-[10px] text-linear-text-muted ml-2">{factor.description}</span>
              </div>
            </div>
          ))}
          {keyFactors.length === 0 && (
            <div className="text-[10px] text-linear-text-muted/50 italic py-2">No dominant factors detected.</div>
          )}
        </div>
      </div>

      {/* ── Negotiation range table ─────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="text-[10px] font-medium text-linear-text-muted uppercase tracking-widest mb-3">
          Negotiation range
        </div>
        <div className="space-y-0">
          {negotiationTiers.map((tier, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-[10px] text-linear-text-muted">{tier.label}</span>
              <span className={`text-[10px] font-medium ${tier.colorClass}`}>{tier.range}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-[10px] text-linear-text-muted">Stamp duty (£{fmtPriceFull(property.list_price)})</span>
            <span className="text-[10px] font-medium text-white">{fmtPriceFull(sdlt)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">All-in cost estimate</span>
            <span className="text-[11px] font-black text-white">~{fmtPriceFull(allInCost)}+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceAssessment;
