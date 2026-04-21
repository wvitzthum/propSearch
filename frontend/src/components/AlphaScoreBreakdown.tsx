import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, Shield, MapPin, TrendingDown,
  AlertTriangle, CheckCircle2, BarChart3, Zap, Clock, Leaf,
  TrendingUp, Tag, Building2, Car, Activity,
} from 'lucide-react';
import { calculateAlphaBreakdown, alphaColor } from '../utils/alphaScore';

import AlphaBadge from './AlphaBadge';

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
const BAR_COLORS: Record<string, string> = {
  emerald: 'bg-retro-green',
  amber:    'bg-amber-400',
  rose:     'bg-rose-400',
};

const DOT_COLORS: Record<string, string> = {
  emerald: 'bg-retro-green',
  amber:    'bg-amber-400',
  rose:     'bg-rose-400',
};

// ---------------------------------------------------------------------------
// Score bar (horizontal fill, 0–10 or modifier display)
// ---------------------------------------------------------------------------
const ScoreBar: React.FC<{
  score: number;
  label?: string;
  className?: string;
  /** Render as modifier (compact, ± prefix) instead of 0–10 bar */
  asModifier?: boolean;
}> = ({ score, label, className = '', asModifier = false }) => {
  const color = alphaColor(score);
  const colorClass = BAR_COLORS[color];

  if (asModifier) {
    const isPositive = score >= 0;
    const modColorClass = isPositive ? 'text-retro-green' : 'text-rose-400';
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {label && <span className="text-[9px] text-linear-text-muted">{label}</span>}
        <span className={`text-[12px] font-black tabular-nums ${modColorClass}`}>
          {isPositive ? '+' : ''}{score.toFixed(1)}
        </span>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (score / 10) * 100));

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[11px] font-bold text-linear-text-muted uppercase tracking-widest">{label}</span>
          <span className="text-[12px] font-black text-white tabular-nums">{score.toFixed(1)} / 10</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-linear-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!label && (
        <div className="flex justify-end mt-0.5">
          <span className="text-[11px] font-black text-white tabular-nums">{score.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modifier score badge (compact inline modifier display)
// ---------------------------------------------------------------------------
const ModifierBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  score: number;
  detail?: string;
  warning?: boolean;
}> = ({ icon, label, score, detail, warning }) => {
  const isPositive = score >= 0;
  const colorClass = warning
    ? 'text-rose-400'
    : isPositive
    ? 'text-retro-green'
    : 'text-rose-400';

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${warning ? 'border-rose-500/20 bg-rose-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
      <span className="text-linear-text-muted">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-linear-text-muted uppercase tracking-wider leading-tight">{label}</div>
        {detail && <div className="text-[7px] text-linear-text-muted/60 leading-tight truncate">{detail}</div>}
      </div>
      <span className={`text-[12px] font-black tabular-nums shrink-0 ${colorClass}`}>
        {isPositive ? '+' : ''}{score.toFixed(1)}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tenure card
// ---------------------------------------------------------------------------
const TenureCard: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { tenure } = breakdown;

  return (
    <div className="p-3 border border-linear-border bg-linear-card rounded-2xl flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-blue-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Tenure</span>
        </div>
        <span className="text-[7px] font-bold text-linear-text-muted">40%</span>
      </div>

      {/* SOF badge */}
      {tenure.isShareOfFreehold && (
        <div className="flex items-center gap-1">
          <CheckCircle2 size={9} className="text-retro-green" />
          <span className="text-[10px] font-bold text-retro-green uppercase tracking-wider">Share of Freehold</span>
        </div>
      )}

      {/* Tenure label */}
      <div className="text-[11px] font-medium text-white leading-snug">
        {tenure.raw || 'Unknown tenure'}
        {tenure.yearsRemaining && (
          <span className="text-linear-text-muted ml-1">· {tenure.yearsRemaining} yrs</span>
        )}
      </div>

      {/* Benchmark note */}
      <div className="text-[10px] text-linear-text-muted">{tenure.benchmark}</div>

      {/* Score bar */}
      <div className="mt-auto pt-1">
        <ScoreBar score={tenure.score} />
      </div>

      {/* Warning */}
      {tenure.score < 7 && (
        <div className="flex items-start gap-1 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <AlertTriangle size={8} className="text-rose-400 mt-0.5 shrink-0" />
          <span className="text-[7px] text-rose-400 leading-relaxed">Below acquisition threshold</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Spatial card (v2: includes E-LADOG, lifestyle, commute bonuses)
// ---------------------------------------------------------------------------
const SpatialCard: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { spatial } = breakdown;

  const tubeOk  = spatial.tube.distance <= 800;
  const parkOk  = spatial.park.distance <= 800;
  const hasBonuses = spatial.elizabethLineBonus > 0 || spatial.lifestyleBonus > 0 || spatial.commuteBonus.score > 0;

  return (
    <div className="p-3 border border-linear-border bg-linear-card rounded-2xl flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin size={10} className="text-purple-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Spatial</span>
        </div>
        <span className="text-[7px] font-bold text-linear-text-muted">30%</span>
      </div>

      {/* Tube row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={`h-1 w-1 rounded-full ${tubeOk ? DOT_COLORS.emerald : DOT_COLORS.rose}`} />
          <span className="text-[10px] text-linear-text-muted">Tube</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-white tabular-nums">
            {spatial.tube.distance >= 1000 ? '—' : `${spatial.tube.distance}m`}
          </span>
          <span className={`text-[7px] font-bold ${tubeOk ? 'text-retro-green' : 'text-rose-400'}`}>
            {tubeOk ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Park row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={`h-1 w-1 rounded-full ${parkOk ? DOT_COLORS.emerald : DOT_COLORS.rose}`} />
          <span className="text-[10px] text-linear-text-muted">Park</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-white tabular-nums">
            {spatial.park.distance >= 1000 ? '—' : `${spatial.park.distance}m`}
          </span>
          <span className={`text-[7px] font-bold ${parkOk ? 'text-retro-green' : 'text-rose-400'}`}>
            {parkOk ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Bonuses row */}
      {hasBonuses && (
        <div className="flex flex-wrap gap-1 pt-0.5 border-t border-white/5">
          {spatial.elizabethLineBonus > 0 && (
            <span className="text-[9px] font-bold text-retro-green bg-retro-green/10 px-1 py-0.5 rounded">E-LADOG +{spatial.elizabethLineBonus}</span>
          )}
          {spatial.lifestyleBonus > 0 && (
            <span className="text-[9px] font-bold text-retro-green bg-retro-green/10 px-1 py-0.5 rounded">Lifestyle +{spatial.lifestyleBonus.toFixed(1)}</span>
          )}
          {spatial.commuteBonus.score > 0 && (
            <span className="text-[9px] font-bold text-retro-green bg-retro-green/10 px-1 py-0.5 rounded">
              Commute +{spatial.commuteBonus.score.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Score bar */}
      <div className="mt-auto pt-1">
        <ScoreBar score={spatial.score} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Price Efficiency card (v2: null-safe)
// ---------------------------------------------------------------------------
const PriceCard: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { price } = breakdown;
  const color = alphaColor(price.score ?? 5);
  const colorClass = DOT_COLORS[color];
  const isDiscount = price.discountPercent >= 0;

  return (
    <div className="p-3 border border-linear-border bg-linear-card rounded-2xl flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={10} className="text-amber-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Price</span>
        </div>
        <span className="text-[7px] font-bold text-linear-text-muted">30%</span>
      </div>

      {/* £/sqm */}
      <div className="flex items-baseline gap-1">
        <span className="text-[12px] font-black text-white tabular-nums">
          {price.pricePerSqm > 0 ? `£${price.pricePerSqm.toLocaleString()}/sqm` : '—'}
        </span>
        <span className="text-[10px] text-linear-text-muted">vs</span>
        <span className="text-[10px] text-linear-text-muted">£{price.areaBenchmark.toLocaleString()}</span>
      </div>

      {/* Discount / premium */}
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${colorClass}`} />
        <span className={`text-[11px] font-black tabular-nums ${isDiscount ? 'text-retro-green' : 'text-rose-400'}`}>
          {isDiscount ? '-' : '+'}{Math.abs(price.discountPercent).toFixed(1)}%
        </span>
        <span className="text-[10px] text-linear-text-muted">{isDiscount ? 'below' : 'above'}</span>
      </div>

      {/* Benchmark area */}
      <div className="text-[10px] text-linear-text-muted">{price.benchmarkArea}</div>

      {/* Score bar */}
      <div className="mt-auto pt-1">
        {price.score !== null ? (
          <ScoreBar score={price.score} />
        ) : (
          <div className="text-[10px] text-linear-text-muted italic">sqft unknown — weight redistributed</div>
        )}
      </div>

      {/* Warning */}
      {!isDiscount && (
        <div className="flex items-start gap-1 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <AlertTriangle size={8} className="text-rose-400 mt-0.5 shrink-0" />
          <span className="text-[7px] text-rose-400 leading-relaxed">Above market rate for this area</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modifiers section (v2: DOM, EPC, Floor, SC, Appreciation, Market, Lifestyle)
// ---------------------------------------------------------------------------
const ModifiersSection: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { dom, epc, floorLevel, serviceCharge, appreciationModifier, marketStatus, spatial } = breakdown;

  const hasModifiers = [
    dom.score,
    epc.score,
    floorLevel.score,
    serviceCharge.score,
    appreciationModifier.score,
    marketStatus.score,
    spatial.lifestyleBonus,
  ].some(s => s !== 0);

  if (!hasModifiers) return null;

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={10} className="text-amber-400" />
        <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Score Modifiers</span>
        <span className="text-[7px] text-linear-text-muted/40">±applied after base</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* DOM Negotiation Leverage */}
        {dom.score !== 0 && (
          <ModifierBadge
            icon={<Clock size={9} className="text-blue-400" />}
            label="DOM Leverage"
            score={dom.score}
            detail={dom.signal}
            warning={dom.value !== null && dom.value > 90}
          />
        )}

        {/* EPC Rating */}
        {epc.score !== 0 && (
          <ModifierBadge
            icon={<Activity size={9} className="text-retro-green" />}
            label={`EPC ${epc.rating}`}
            score={epc.score}
            detail={epc.risk}
            warning={epc.score < 0}
          />
        )}

        {/* Floor Level */}
        {floorLevel.score !== 0 && (
          <ModifierBadge
            icon={<Building2 size={9} className="text-purple-400" />}
            label="Floor Level"
            score={floorLevel.score}
            detail={floorLevel.raw}
            warning={floorLevel.score < 0}
          />
        )}

        {/* Service Charge Density */}
        {serviceCharge.score !== 0 && (
          <ModifierBadge
            icon={<Tag size={9} className="text-amber-400" />}
            label="SC Density"
            score={serviceCharge.score}
            detail={`£${serviceCharge.density.toFixed(2)}/sqft/yr`}
            warning
          />
        )}

        {/* Appreciation Modifier */}
        {appreciationModifier.score !== 0 && (
          <ModifierBadge
            icon={<TrendingUp size={9} className="text-blue-400" />}
            label="Appreciation"
            score={appreciationModifier.score}
            detail={
              appreciationModifier.areaVolatility !== undefined
                ? `vol ${appreciationModifier.areaVolatility}% · ${appreciationModifier.scenario}`
                : appreciationModifier.scenario
            }
            warning={appreciationModifier.score < 0}
          />
        )}

        {/* Market Status */}
        {marketStatus.score !== 0 && (
          <ModifierBadge
            icon={<Car size={9} className="text-rose-400" />}
            label="Market Status"
            score={marketStatus.score}
            detail={marketStatus.status}
            warning
          />
        )}

        {/* Lifestyle Bonus */}
        {spatial.lifestyleBonus > 0 && (
          <ModifierBadge
            icon={<Leaf size={9} className="text-retro-green" />}
            label="Lifestyle"
            score={spatial.lifestyleBonus}
            detail="Urban village proximity"
          />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Warnings section (expanded for v2)
// ---------------------------------------------------------------------------
const WarningsSection: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  if (breakdown.warnings.length === 0) return null;

  return (
    <div className="px-5 pb-4">
      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle size={10} className="text-amber-400" />
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Flags</span>
        </div>
        <ul className="space-y-1">
          {breakdown.warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-[7px] text-rose-400 mt-0.5">•</span>
              <span className="text-[11px] text-rose-400 leading-snug">{w}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// "What is Alpha?" collapsible (v2 formula)
// ---------------------------------------------------------------------------
const WhatIsAlpha: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  const pScore = breakdown.price.score;

  return (
    <div className="border border-linear-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-linear-card/50 hover:bg-linear-card transition-colors text-left"
      >
        <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">What is Alpha?</span>
        {open ? <ChevronUp size={11} className="text-linear-text-muted" /> : <ChevronDown size={11} className="text-linear-text-muted" />}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-linear-card/30 border-t border-linear-border">
          <p className="text-[8px] text-linear-text-muted leading-relaxed mb-3">
            Alpha Score v2: weighted base factors rescaled to 0–8, plus market &amp; cost modifiers capped at 10.
          </p>
          <div className="space-y-2 mb-3">
            {([
              { pct: 40, label: 'Tenure Quality', desc: 'Freehold or long lease = institutional-grade security. Short leases (&lt;90yrs) carry CAPEX risk.' },
              { pct: 30, label: 'Spatial Alpha', desc: 'Tube/Elizabeth Line + park proximity, inflated by lifestyle and commute bonuses.' },
              { pct: 30, label: 'Price Efficiency', desc: 'Price per sqm vs. area benchmark. Weight redistributes if sqft unknown.' },
            ]).map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="text-[7px] font-black text-blue-400 tabular-nums shrink-0 mt-px">{item.pct}%</span>
                <div>
                  <span className="text-[10px] font-bold text-white">{item.label}</span>
                  <span className="text-[10px] text-linear-text-muted"> — {item.desc}</span>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2 pt-1 border-t border-white/5">
              <span className="text-[7px] font-black text-amber-400 tabular-nums shrink-0 mt-px">±</span>
              <div className="text-[8px] text-linear-text-muted">
                Modifiers: DOM Leverage, EPC Rating, Floor Level, SC Density, Appreciation Outlook, Market Status, Lifestyle Bonus.
              </div>
            </div>
          </div>
          <div className="text-[7px] text-linear-text-muted/50">
            Formula: <span className="font-mono text-white/30">
              ({breakdown.tenure.score.toFixed(1)}&times;0.4 + {breakdown.spatial.score.toFixed(1)}&times;0.3 + {pScore !== null ? pScore.toFixed(1) : '?'}&times;0.3)&divide;10&times;8
              {breakdown.dom.score !== 0 ? ` + DOM:${breakdown.dom.score}` : ''}
              {breakdown.epc.score !== 0 ? ` + EPC:${breakdown.epc.score}` : ''}
              {breakdown.floorLevel.score !== 0 ? ` + Floor:${breakdown.floorLevel.score}` : ''}
              {breakdown.serviceCharge.score !== 0 ? ` + SC:${breakdown.serviceCharge.score}` : ''}
              {breakdown.appreciationModifier.score !== 0 ? ` + App:${breakdown.appreciationModifier.score}` : ''}
              {breakdown.marketStatus.score !== 0 ? ` + Mkt:${breakdown.marketStatus.score}` : ''}
              {breakdown.spatial.lifestyleBonus > 0 ? ` + Lifestyle:${breakdown.spatial.lifestyleBonus}` : ''}
              {' = '}{breakdown.overall.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface AlphaScoreBreakdownProps {
  property: {
    tenure?: string | null;
    nearest_tube_distance?: number | null;
    nearest_tube_station?: string | null;
    park_proximity?: number | null;
    price_per_sqm?: number | null;
    sqft?: number | null;
    area?: string | null;
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
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AlphaScoreBreakdown: React.FC<AlphaScoreBreakdownProps> = ({ property }) => {
  const breakdown = calculateAlphaBreakdown(property as Parameters<typeof calculateAlphaBreakdown>[0]);

  return (
    <div className="border border-linear-border bg-linear-card rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={12} className="text-blue-400" />
          <h2 className="text-[11px] font-black text-white uppercase tracking-widest">Alpha Score Breakdown</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-linear-text-muted uppercase tracking-widest font-bold mb-0.5">Overall</div>
            <AlphaBadge score={breakdown.overall} className="scale-110 origin-right" />
          </div>
        </div>
      </div>

      {/* Overall bar */}
      <div className="px-5 pt-4">
        <ScoreBar score={breakdown.overall} label="Composite Alpha Score" />
        <div className="flex justify-between mt-1 mb-4">
          {breakdown.overall >= 8
            ? <span className="text-[7px] font-bold text-retro-green uppercase tracking-wider">Investment Grade</span>
            : breakdown.overall >= 5
            ? <span className="text-[7px] font-bold text-amber-400 uppercase tracking-wider">Market Neutral</span>
            : <span className="text-[7px] font-bold text-rose-400 uppercase tracking-wider">High Variance</span>
          }
          <span className="text-[7px] text-linear-text-muted/50">v2 · capped 10</span>
        </div>
      </div>

      {/* Three factor cards */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-3">
        <TenureCard breakdown={breakdown} />
        <SpatialCard breakdown={breakdown} />
        <PriceCard breakdown={breakdown} />
      </div>

      {/* Modifiers section (v2) */}
      <ModifiersSection breakdown={breakdown} />

      {/* Warnings */}
      <WarningsSection breakdown={breakdown} />

      {/* What is Alpha? collapsible */}
      <div className="px-5 pb-4">
        <WhatIsAlpha breakdown={breakdown} />
      </div>
    </div>
  );
};

export default AlphaScoreBreakdown;
