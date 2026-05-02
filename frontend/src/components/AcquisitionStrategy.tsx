/**
 * AcquisitionStrategy.tsx — FE-240 (ADR-019)
 * Redesigned high-density bid-decision section for PropertyDetail.
 * Replaces the hardcoded prose + static bar in PropertyDetail.tsx lines 496-565.
 *
 * UX overhaul (FE-285): collapsed by default — posture badge + opening bid headline
 * visible at a glance. Expand reveals full 3-col analysis + timing strip + notes.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, MapPin, Zap, Target, ShieldAlert,
  ChevronDown
} from 'lucide-react';
import type { Property } from '../types/property';
import { useAppreciationModel } from '../hooks/useAppreciationModel';
import { useMacroData } from '../hooks/useMacroData';
import { calculateAlphaBreakdown, parseAppreciation } from '../utils/alphaScore';
import { extractValue } from '../types/macro';

// ─── Local phase helper (mirrors SeasonalMarketCycle.tsx) ───────────────────

const PHASES: readonly { name: string; months: readonly number[]; color: string; desc: string }[] = [
  { name: 'Winter Trough', months: [0, 1],   color: '#64748b', desc: 'Post-holiday, minimal activity. Buyer leverage highest.' },
  { name: 'Spring Surge',   months: [2, 3, 4], color: '#22c55e', desc: 'Listings flood in. Peak competition. Prices rise fastest.' },
  { name: 'Summer Lull',    months: [5, 6, 7], color: '#f59e0b', desc: 'Holidays slow activity. Buyer/seller balance.' },
  { name: 'Autumn Rush',    months: [8, 9],   color: '#3b82f6', desc: 'Second busiest period. Supply-demand balanced.' },
  { name: 'Year-End Dip',   months: [10, 11], color: '#a78bfa', desc: 'Christmas window opens. Negotiation leverage returns.' },
];

function getPhaseForMonth(monthIdx: number) {
  return PHASES.find(p => p.months.includes(monthIdx)) ?? PHASES[0];
}

// ─── Formatters ─────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(2)}M`
    : `£${(n / 1_000).toFixed(0)}K`;

// ─── Posture ────────────────────────────────────────────────────────────────

type Posture = 'conservative' | 'moderate' | 'aggressive';

const POSTURE_LABELS: Record<Posture, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

interface BidLadder {
  opening: number;
  target: number;
  walkAway: number;
}

function calcBidLadder(posture: Posture, realistic: number, list: number): BidLadder {
  if (posture === 'conservative') {
    return {
      opening: Math.round(realistic * 0.95),
      target: realistic,
      walkAway: realistic,
    };
  } else if (posture === 'moderate') {
    return {
      opening: Math.round(realistic * 0.97),
      target: realistic,
      walkAway: Math.round(realistic * 1.02),
    };
  } else {
    return {
      opening: realistic,
      target: list,
      walkAway: Math.round(list * 1.03),
    };
  }
}

function calcBufferPct(list: number, opening: number, target: number, walkAway: number) {
  const total = list - walkAway;
  if (total === 0) return { toTarget: 0, toRealistic: 0 };
  return {
    toTarget: Math.max(0, Math.min(100, ((list - opening) / total) * 100)),
    toRealistic: Math.max(0, Math.min(100, ((list - target) / total) * 100)),
  };
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  property: Property;
  thesisTags?: string[];
  onThesisTagsChange?: (tags: string[]) => void;
  onRequestEnrichment?: () => void;
}

// ─── Main Component ─────────────────────────────────────────────────────────

const AcquisitionStrategy: React.FC<Props> = ({ property, onRequestEnrichment }) => {
  const { profile } = useAppreciationModel(property.realistic_price);
  const { data: macro } = useMacroData();

  // ── Derived data ──────────────────────────────────────────────────────────

  const alpha = useMemo(() => calculateAlphaBreakdown({
    tenure: property.tenure,
    nearest_tube_distance: property.nearest_tube_distance,
    park_proximity: property.park_proximity,
    price_per_sqm: property.price_per_sqm,
    area: property.area,
  }), [property]);

  const breakdown = alpha;

  // Key drivers from alpha sub-scores
  const keyDrivers = useMemo<string[]>(() => {
    const drivers: string[] = [];
    if (breakdown.tenure.score >= 8) {
      drivers.push(`Secure tenure: ${breakdown.tenure.raw}`);
    }
    if (breakdown.spatial.tube.distance > 0 && breakdown.spatial.tube.distance <= 400) {
      drivers.push(`Zone 1 proximity: ${breakdown.spatial.tube.metresFromThreshold}`);
    }
    if (breakdown.spatial.park.distance > 0 && breakdown.spatial.park.distance <= 300) {
      drivers.push(`Near green space: ${breakdown.spatial.park.metresFromThreshold}`);
    }
    if (breakdown.price.score !== null && breakdown.price.score >= 8) {
      drivers.push(`Below area benchmark by ${Math.abs(breakdown.price.discountPercent).toFixed(1)}%`);
    }
    return drivers.slice(0, 3);
  }, [breakdown]);

  // 5-year projection
  // BUG-006 FIX: Use the model's base case (2.0% CAGR, not 4.0%) as fallback.
  // profile?.scenarios[].annual_return is the canonical source — fallback to 2.0% from the model.
  const baseCagr = profile?.scenarios.find(s => s.scenario === 'base')?.annual_return ?? 2.0;
  // five_year_value fallback: 1.104× = e^(2.0% × 5) — correct model base case (was 1.21× = 4% arbitrary).
  const fiveYearValue = profile?.scenarios.find(s => s.scenario === 'base')?.five_year_value
    ?? property.list_price * 1.104;

  // Confidence from scenario spread
  const confidence = useMemo(() => {
    if (!profile?.scenarios || profile.scenarios.length < 2) return 'LOW';
    const vals = profile.scenarios.map(s => s.five_year_value);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    if (cv < 0.05) return 'HIGH';
    if (cv < 0.10) return 'MEDIUM';
    return 'LOW';
  }, [profile]);

  const confidenceColor: Record<string, string> = {
    HIGH: 'text-retro-green',
    MEDIUM: 'text-amber-400',
    LOW: 'text-rose-400',
  };

  // ── Posture state ──────────────────────────────────────────────────────────

  const initialPosture: Posture = (() => {
    const dom = property.dom ?? 0;
    if (dom > 90) return 'conservative';
    if (dom > 30) return 'moderate';
    return 'aggressive';
  })();

  const [posture, setPosture] = useState<Posture>(initialPosture);

  const ladder = useMemo<BidLadder>(
    () => calcBidLadder(posture, property.realistic_price, property.list_price),
    [posture, property.realistic_price, property.list_price]
  );

  const buffer = useMemo(
    () => calcBufferPct(property.list_price, ladder.opening, ladder.target, ladder.walkAway),
    [property.list_price, ladder]
  );

  // ── Strategy notes (localStorage + debounce) ───────────────────────────────

  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesUpdated, setNotesUpdated] = useState<string | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`strategy_notes_${property.id}`);
    if (saved) {
      setNotes(saved);
      const ts = localStorage.getItem(`strategy_notes_${property.id}_ts`);
      if (ts) setNotesUpdated(ts);
    }
  }, [property.id]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`strategy_notes_${property.id}`, val);
      const ts = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      localStorage.setItem(`strategy_notes_${property.id}_ts`, ts);
      setNotesUpdated(ts);
    }, 1500);
  }, [property.id]);

  // ── Timing strip data ─────────────────────────────────────────────────────

  const currentMonth = new Date().getMonth();
  const currentPhase = getPhaseForMonth(currentMonth);
  const hpiChange = extractValue(macro?.london_hpi?.annual_change) ?? 0;
  const seasonalScore = extractValue(macro?.timing_signals?.seasonal_buy_score) ?? 8.5;
  const sdltDays = macro?.sdlt_countdown != null ? Number(macro.sdlt_countdown) : null;

  // ── DOM vs area average ───────────────────────────────────────────────────

  const areaAvgDom = 30; // fallback — ideally from useAppreciationModel
  const dom = property.dom ?? 0;
  const domDelta = dom - areaAvgDom;
  const isStale = dom > areaAvgDom * 1.5;
  const isHotStale = dom > 90;

  // ── Comparable analysis ────────────────────────────────────────────────────

  const priceDelta = breakdown.price.discountPercent;
  const priceDeltaGood = priceDelta >= 0;

  // ── Render ────────────────────────────────────────────────────────────────

  // BUG-007 FIX: Guard against string DB values (e.g. "5.4") and null/missing fields.
  // The Property type says number, but SQLite can return strings from raw JSON imports.
  const rawAp = property.appreciation_potential as unknown;
  const apNumeric = (rawAp !== null && rawAp !== undefined && rawAp !== '' && isFinite(Number(rawAp)))
    ? Number(rawAp)
    : null;

  // BUG-007 FIX: The "Alpha-Derived Appreciation" score is the modifier, not the raw potential.
  // parseAppreciation applies the band mapping: ≥8→+0.5, 6-7.9→0, 4-5.9→−0.3, <4→−0.5
  const appreciationBreakdown = parseAppreciation(apNumeric, property.area_volatility ?? undefined);
  const apScore = appreciationBreakdown.score; // e.g. −0.3 (this is the alpha modifier)

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════════
          COLLAPSED PREVIEW — always visible, one headline row
      ═══════════════════════════════════════════════════════════════ */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        aria-expanded={expanded}
      >
        {/* Left: posture badge + opening bid */}
        <div className="flex items-center gap-5 text-left">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Target size={13} className="text-blue-400 shrink-0" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                Bid Strategy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                posture === 'conservative'
                  ? 'bg-slate-500/20 border-slate-500/40 text-slate-300'
                  : posture === 'moderate'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}>
                {POSTURE_LABELS[posture]}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-black text-white tabular-nums">
                  £{ladder.opening.toLocaleString()}
                </span>
                <span className="text-[11px] text-linear-text-muted">opening</span>
                <span className="text-[10px] text-retro-green font-black ml-1">
                  −{Math.max(0, Math.round(((property.list_price - ladder.opening) / property.list_price) * 100))}% below list
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: modifiers + expand icon */}
        <div className="flex items-center gap-4">
          {/* Appreciation modifier */}
          <div className="hidden sm:flex items-center gap-2">
            <div className={`text-[22px] font-black tabular-nums leading-none ${
              apScore >= 0.2 ? 'text-retro-green' : apScore <= -0.2 ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {apScore >= 0 ? '+' : ''}{apScore.toFixed(1)}
            </div>
            <div className="text-left">
              <div className="text-[9px] text-linear-text-muted font-black uppercase tracking-widest">Appreciation</div>
              <div className="text-[9px] text-linear-text-muted/60">modifier /10</div>
            </div>
          </div>

          {/* DOM signal */}
          <div className="hidden md:flex items-center gap-1.5">
            {isHotStale ? (
              <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            ) : isStale ? (
              <div className="h-2 w-2 rounded-full bg-amber-400" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-retro-green" />
            )}
            <span className="text-[11px] font-black text-white tabular-nums">{dom}d</span>
            <span className="text-[9px] text-linear-text-muted">DOM</span>
          </div>

          {/* Seasonal phase dot */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase"
            style={{
              borderColor: currentPhase.color + '40',
              color: currentPhase.color,
              backgroundColor: currentPhase.color + '10',
            }}
          >
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: currentPhase.color }} />
            {currentPhase.name}
          </div>

          {/* Expand / collapse */}
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg border border-linear-border text-linear-text-muted transition-all ${expanded ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 rotate-180' : 'hover:border-white/20 hover:text-white'}`}>
            <ChevronDown size={14} />
          </div>
        </div>
      </button>

      {/* ═══════════════════════════════════════════════════════════════
          EXPANDED — full 3-col analysis + timing + notes
      ═══════════════════════════════════════════════════════════════ */}
      {expanded && (
        <div className="border-t border-linear-border animate-in fade-in duration-200">

          {/* ── 3-column analysis grid ──────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-px bg-linear-border p-px">

            {/* ── Column 1: Price Prediction ────────────────────── */}
            <div className="bg-[#0d1520] p-5 flex flex-col gap-5">

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-1">
                    Appreciation Modifier
                  </div>
                  <div className={`text-[32px] font-black tabular-nums leading-none ${
                    apScore >= 0.2 ? 'text-retro-green' : apScore <= -0.2 ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {apScore >= 0 ? '+' : ''}{apScore.toFixed(1)}
                    <span className="text-[13px] text-linear-text-muted font-bold ml-1">/10</span>
                  </div>
                  {apNumeric !== null && (
                    <div className="text-[9px] text-linear-text-muted mt-0.5">
                      {apNumeric.toFixed(1)}% raw → {apScore >= 0 ? '+' : ''}{apScore.toFixed(1)} modifier applied
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-black uppercase ${confidenceColor[confidence]}`}>
                    {confidence} Confidence
                  </span>
                  <div className="h-1 w-16 bg-linear-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${apScore >= 0.2 ? 'bg-retro-green' : apScore <= -0.2 ? 'bg-rose-400' : 'bg-amber-400'}`}
                      style={{ width: `${Math.max(0, Math.min(100, ((apScore + 1) / 2) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
                  5-Year Projection
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[12px] font-bold text-white">{fmt(property.list_price)}</span>
                  <span className="text-linear-text-muted text-[10px]">→</span>
                  <span className="text-[12px] font-black text-retro-green">{fmt(fiveYearValue)}</span>
                </div>
                <div className="text-[9px] text-linear-text-muted">@ {baseCagr.toFixed(1)}% CAGR · base case</div>
              </div>

              {keyDrivers.length > 0 && (
                <div className="border-t border-white/5 pt-4">
                  <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
                    Key Drivers
                  </div>
                  <ul className="space-y-1">
                    {keyDrivers.map((d, i) => (
                      <li key={i} className="text-[10px] text-linear-text-muted flex items-start gap-1.5">
                        <span className="text-retro-green mt-0.5 shrink-0">›</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Column 2: Bid Strategy ────────────────────────── */}
            <div className="bg-[#0d1520] p-5 flex flex-col gap-5">

              {/* Posture selector */}
              <div>
                <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
                  Bidding Posture
                </div>
                <div className="flex gap-1.5">
                  {(['conservative', 'moderate', 'aggressive'] as Posture[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setPosture(p)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        posture === p
                          ? 'bg-blue-500/25 border border-blue-500/50 text-blue-300'
                          : 'bg-white/5 border border-white/10 text-linear-text-muted hover:border-white/25 hover:text-white/80'
                      }`}
                    >
                      {POSTURE_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bid ladder */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                {[
                  { label: 'Opening',   value: ladder.opening,  color: 'text-blue-300' },
                  { label: 'Target',    value: ladder.target,   color: 'text-white' },
                  { label: 'Walk-Away', value: ladder.walkAway,  color: 'text-amber-300', warn: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest w-20">
                      {row.label}
                    </span>
                    <span className={`text-[13px] font-bold ${row.color}`}>
                      {fmt(row.value)}
                    </span>
                    {row.warn && (
                      <div className="group relative">
                        <AlertTriangle size={11} className="text-amber-400/50" />
                        <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[#0f1923] border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-white/50 whitespace-nowrap z-10">
                          Do not exceed without new information
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest w-20">vs List</span>
                  <span className="text-[10px] font-black text-retro-green">
                    −{Math.max(0, Math.round(((property.list_price - ladder.opening) / property.list_price) * 100))}% below list
                  </span>
                </div>
              </div>

              {/* Negotiation buffer bar */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
                    Negotiation Buffer
                  </div>
                  <span className="text-[9px] text-linear-text-muted/60">{Math.round(buffer.toTarget)}% to target</span>
                </div>
                <div className="h-2.5 w-full bg-linear-bg rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500/60 transition-all duration-300" style={{ width: `${buffer.toTarget}%` }} />
                  <div className="h-full bg-retro-green transition-all duration-300" style={{ width: `${Math.max(0, buffer.toRealistic - buffer.toTarget)}%` }} />
                  <div className="h-full bg-white/5 flex-1" />
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
                  <span>Opening</span>
                  <span>Target</span>
                  <span>Walk-Away</span>
                </div>
              </div>
            </div>

            {/* ── Column 3: Comparable Analysis ──────────────── */}
            <div className="bg-[#0d1520] p-5 flex flex-col gap-5">

              {/* Price efficiency */}
              <div>
                <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
                  Price Efficiency
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[13px] font-black text-white">£{breakdown.price.pricePerSqm.toLocaleString()}/sqm</span>
                  <span className="text-[10px] text-linear-text-muted">vs</span>
                  <span className="text-[10px] text-linear-text-muted">£{breakdown.price.areaBenchmark.toLocaleString()} avg</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${priceDeltaGood ? 'bg-retro-green' : 'bg-rose-400'}`} />
                  <span className={`text-[11px] font-black ${priceDeltaGood ? 'text-retro-green' : 'text-rose-400'}`}>
                    {priceDeltaGood ? '−' : '+'}{Math.abs(priceDelta).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-linear-text-muted">
                    {priceDeltaGood ? 'below benchmark' : 'above benchmark'}
                  </span>
                </div>
              </div>

              {/* DOM */}
              <div className="border-t border-white/5 pt-4">
                <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
                  Market Duration
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[20px] font-black text-white tabular-nums">{dom}</span>
                  <span className="text-[10px] text-linear-text-muted">days on market</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isHotStale ? (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                      <span className="text-[10px] font-black text-rose-400 uppercase">Hot Stale &gt;90d — vendor motivated</span>
                    </>
                  ) : isStale ? (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-black text-amber-400 uppercase">Stale listing</span>
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-retro-green" />
                      <span className="text-[10px] text-linear-text-muted">
                        {domDelta > 0 ? `${domDelta}d above area avg` : `${Math.abs(domDelta)}d below area avg`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Comparable sales */}
              <div className="border-t border-white/5 pt-4">
                <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
                  Recent Comparables
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-linear-text-muted/60 italic">No recent comps on record</span>
                  <button
                    onClick={onRequestEnrichment}
                    className="text-[10px] font-black text-amber-400/80 uppercase hover:text-amber-400 transition-colors"
                  >
                    Request →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Timing strip ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-linear-border">
            <div className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mr-1">
              Market Timing
            </div>

            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase"
              style={{
                borderColor: currentPhase.color + '40',
                color: currentPhase.color,
                backgroundColor: currentPhase.color + '10',
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentPhase.color }} />
              {currentPhase.name}
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase ${
              hpiChange >= 0
                ? 'border-retro-green/30 text-retro-green bg-retro-green/10'
                : 'border-rose-400/30 text-rose-400 bg-rose-400/10'
            }`}>
              {hpiChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              HPI {hpiChange >= 0 ? '+' : ''}{hpiChange.toFixed(1)}%
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-linear-border text-[10px] font-black uppercase text-linear-text-muted bg-white/5">
              <Zap size={10} className="text-blue-400" />
              Buy Score {seasonalScore.toFixed(1)}
            </div>

            {sdltDays != null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-blue-500/30 text-[10px] font-black uppercase text-blue-400 bg-blue-500/10">
                <ShieldAlert size={10} />
                SDLT {sdltDays > 0 ? `${sdltDays}d left` : 'Active'}
              </div>
            )}
          </div>

          {/* ── Strategy notes ─────────────────────────────── */}
          <div className="px-6 pb-6 border-t border-linear-border/50 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={11} className="text-blue-400" />
              <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest">
                Strategy Notes
              </span>
              {notesUpdated && (
                <span className="text-[8px] font-mono text-linear-text-muted/50 ml-auto">
                  Updated {notesUpdated}
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Why am I bidding this? What market condition am I betting on? What is the vendor's motivation?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-blue-500/40 transition-colors resize-none custom-scrollbar"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AcquisitionStrategy;
