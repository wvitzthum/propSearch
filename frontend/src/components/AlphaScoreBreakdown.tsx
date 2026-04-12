import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, MapPin, TrendingDown, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import { calculateAlphaBreakdown, alphaColor } from '../utils/alphaScore';
import type { PropertyWithCoords } from '../types/property';
import AlphaBadge from './AlphaBadge';

interface AlphaScoreBreakdownProps {
  property: PropertyWithCoords;
}

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
// Score bar (horizontal fill, 0–10)
// ---------------------------------------------------------------------------
const ScoreBar: React.FC<{ score: number; label?: string; className?: string }> = ({
  score,
  label,
  className = '',
}) => {
  const color = alphaColor(score);
  const colorClass = BAR_COLORS[color];
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">{label}</span>
          <span className="text-[10px] font-black text-white tabular-nums">{score.toFixed(1)} / 10</span>
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
          <span className="text-[9px] font-black text-white tabular-nums">{score.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tenure card
// ---------------------------------------------------------------------------
const TenureCard: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { tenure } = breakdown;

  return (
    <div className="p-4 border border-linear-border bg-linear-card rounded-2xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={11} className="text-blue-400" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Tenure</span>
        </div>
        <span className="text-[8px] font-bold text-linear-text-muted">40%</span>
      </div>

      {/* SOF badge */}
      {tenure.isShareOfFreehold && (
        <div className="flex items-center gap-1">
          <CheckCircle2 size={10} className="text-retro-green" />
          <span className="text-[9px] font-bold text-retro-green uppercase tracking-wider">Share of Freehold</span>
        </div>
      )}

      {/* Tenure label */}
      <div className="text-[10px] font-medium text-white leading-snug">
        {tenure.raw || 'Unknown tenure'}
        {tenure.yearsRemaining && (
          <span className="text-linear-text-muted ml-1">· {tenure.yearsRemaining} yrs remaining</span>
        )}
      </div>

      {/* Benchmark note */}
      <div className="text-[9px] text-linear-text-muted">{tenure.benchmark}</div>

      {/* Score bar */}
      <div className="mt-auto pt-1">
        <ScoreBar score={tenure.score} />
      </div>

      {/* Warning */}
      {tenure.score < 7 && (
        <div className="flex items-start gap-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <AlertTriangle size={9} className="text-rose-400 mt-0.5 shrink-0" />
          <span className="text-[8px] text-rose-400 leading-relaxed">Lease &lt;90 years — below acquisition threshold</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Spatial card
// ---------------------------------------------------------------------------
const SpatialCard: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { spatial } = breakdown;

  const tubeOk  = spatial.tube.distance <= 800;
  const parkOk  = spatial.park.distance <= 800;

  return (
    <div className="p-4 border border-linear-border bg-linear-card rounded-2xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-purple-400" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Spatial Alpha</span>
        </div>
        <span className="text-[8px] font-bold text-linear-text-muted">30%</span>
      </div>

      {/* Tube row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${tubeOk ? DOT_COLORS.emerald : DOT_COLORS.rose}`} />
          <span className="text-[9px] text-linear-text-muted">Tube</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white tabular-nums">{spatial.tube.distance >= 1000 ? '—' : `${spatial.tube.distance}m`}</span>
          <span className={`text-[8px] font-bold ${tubeOk ? 'text-retro-green' : 'text-rose-400'}`}>
            {tubeOk ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Tube breakdown */}
      <div className="flex gap-1 flex-wrap">
        {spatial.tubePoints > 0 ? (
          <span className="text-[8px] font-bold text-blue-400">+{spatial.tubePoints} tube pts</span>
        ) : (
          <span className="text-[8px] text-rose-400">0 pts</span>
        )}
        <span className="text-[8px] text-linear-text-muted/60">|</span>
        <span className="text-[8px] text-linear-text-muted">{spatial.tube.metresFromThreshold}</span>
      </div>

      {/* Park row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${parkOk ? DOT_COLORS.emerald : DOT_COLORS.rose}`} />
          <span className="text-[9px] text-linear-text-muted">Park</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white tabular-nums">{spatial.park.distance >= 1000 ? '—' : `${spatial.park.distance}m`}</span>
          <span className={`text-[8px] font-bold ${parkOk ? 'text-retro-green' : 'text-rose-400'}`}>
            {parkOk ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Park breakdown */}
      <div className="flex gap-1 flex-wrap">
        {spatial.parkPoints > 0 ? (
          <span className="text-[8px] font-bold text-blue-400">+{spatial.parkPoints} park pts</span>
        ) : (
          <span className="text-[8px] text-rose-400">0 pts</span>
        )}
        <span className="text-[8px] text-linear-text-muted/60">|</span>
        <span className="text-[8px] text-linear-text-muted">{spatial.park.metresFromThreshold}</span>
      </div>

      {/* Score bar */}
      <div className="mt-auto pt-1">
        <ScoreBar score={spatial.score} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Price Efficiency card
// ---------------------------------------------------------------------------
const PriceCard: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const { price } = breakdown;
  const color = alphaColor(price.score ?? 5); // fallback 5 if null
  const colorClass = DOT_COLORS[color];
  const isDiscount = price.discountPercent >= 0;

  return (
    <div className="p-4 border border-linear-border bg-linear-card rounded-2xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={11} className="text-amber-400" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Price Efficiency</span>
        </div>
        <span className="text-[8px] font-bold text-linear-text-muted">30%</span>
      </div>

      {/* £/sqm */}
      <div className="flex items-baseline gap-1">
        <span className="text-[11px] font-black text-white tabular-nums">
          {price.pricePerSqm > 0 ? `£${price.pricePerSqm.toLocaleString()}/sqm` : '—'}
        </span>
        <span className="text-[9px] text-linear-text-muted">vs</span>
        <span className="text-[9px] text-linear-text-muted">£{price.areaBenchmark.toLocaleString()} avg</span>
      </div>

      {/* Discount / premium indicator */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${colorClass}`} />
        <span className={`text-[10px] font-black tabular-nums ${isDiscount ? 'text-retro-green' : 'text-rose-400'}`}>
          {isDiscount ? '-' : '+'}{Math.abs(price.discountPercent).toFixed(1)}%
        </span>
        <span className="text-[9px] text-linear-text-muted">{isDiscount ? 'below benchmark ✓' : 'above benchmark ✗'}</span>
      </div>

      {/* Benchmark area */}
      <div className="text-[9px] text-linear-text-muted">{price.benchmarkArea}</div>

      {/* Score bar */}
      <div className="mt-auto pt-1">
        {price.score !== null ? (
          <ScoreBar score={price.score} />
        ) : (
          <div className="text-[9px] text-linear-text-muted italic">sqft unknown</div>
        )}
      </div>

      {/* Warning */}
      {!isDiscount && (
        <div className="flex items-start gap-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <AlertTriangle size={9} className="text-rose-400 mt-0.5 shrink-0" />
          <span className="text-[8px] text-rose-400 leading-relaxed">Above market rate for this area</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// "What is Alpha?" collapsible
// ---------------------------------------------------------------------------
const WhatIsAlpha: React.FC<{ breakdown: ReturnType<typeof calculateAlphaBreakdown> }> = ({ breakdown }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-linear-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-linear-card/50 hover:bg-linear-card transition-colors text-left"
      >
        <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">What is Alpha?</span>
        {open ? <ChevronUp size={12} className="text-linear-text-muted" /> : <ChevronDown size={12} className="text-linear-text-muted" />}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-linear-card/30 border-t border-linear-border">
          <p className="text-[9px] text-linear-text-muted leading-relaxed mb-3">
            The Alpha Score is a weighted composite of three independent factors that drive long-term property value:
          </p>
          <div className="space-y-2 mb-3">
            {([
              { pct: 40, label: 'Tenure Quality', desc: 'Freehold or long lease = institutional-grade security. Short leases (<90yrs) carry material risk.' },
              { pct: 30, label: 'Spatial Alpha', desc: 'Proximity to Tube/Elizabeth Line (&le;300m) and green space (&le;400m) drives demand resilience and rental premium.' },
              { pct: 30, label: 'Price Efficiency', desc: 'Price per sqm vs. area benchmark. A discount to market signals asymmetric upside.' },
            ]).map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="text-[8px] font-black text-blue-400 tabular-nums shrink-0 mt-px">{item.pct}%</span>
                <div>
                  <span className="text-[9px] font-bold text-white">{item.label}</span>
                  <span className="text-[9px] text-linear-text-muted"> — {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[8px] text-linear-text-muted/50">
            Formula: <span className="font-mono text-white/40">({breakdown.tenure.score.toFixed(1)} &times; 0.4) + ({breakdown.spatial.score.toFixed(1)} &times; 0.3) + ({breakdown.price.score !== null ? breakdown.price.score.toFixed(1) : '?'} &times; 0.3) = {breakdown.overall.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AlphaScoreBreakdown: React.FC<AlphaScoreBreakdownProps> = ({ property }) => {
  const breakdown = calculateAlphaBreakdown(property);
  const hasWarnings = breakdown.warnings.length > 0;

  return (
    <div className="border border-linear-border bg-linear-card rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={13} className="text-blue-400" />
          <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Alpha Score Breakdown</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Overall</div>
            <AlphaBadge score={breakdown.overall} className="scale-110 origin-right" />
          </div>
        </div>
      </div>

      {/* Overall bar */}
      <div className="px-5 pt-4">
        <ScoreBar score={breakdown.overall} label="Composite Alpha Score" />
        <div className="flex justify-between mt-1 mb-4">
          {breakdown.overall >= 8
            ? <span className="text-[8px] font-bold text-retro-green uppercase tracking-wider">Investment Grade</span>
            : breakdown.overall >= 5
            ? <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">Market Neutral</span>
            : <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider">High Variance</span>
          }
          <span className="text-[8px] text-linear-text-muted/50">Weighted 40 / 30 / 30</span>
        </div>
      </div>

      {/* Three factor cards */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-3">
        <TenureCard breakdown={breakdown} />
        <SpatialCard breakdown={breakdown} />
        <PriceCard breakdown={breakdown} />
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="px-5 pb-4">
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={11} className="text-amber-400" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Flags</span>
            </div>
            <ul className="space-y-1">
              {breakdown.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[8px] text-rose-400 mt-0.5">•</span>
                  <span className="text-[9px] text-rose-400 leading-snug">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* What is Alpha? collapsible */}
      <div className="px-5 pb-4">
        <WhatIsAlpha breakdown={breakdown} />
      </div>
    </div>
  );
};

export default AlphaScoreBreakdown;
