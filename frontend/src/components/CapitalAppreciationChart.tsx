import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, BarChart2, Sliders } from 'lucide-react';
import { useAppreciationModel } from '../hooks/useAppreciationModel';
import { useMonteCarlo } from '../hooks/useMonteCarlo';

interface CapitalAppreciationChartProps {
  propertyPrice: number;
  leaseYears?: number;
  epc?: string;
  floorLevel?: string;
  serviceCharge?: number;
  area?: string;
  compact?: boolean;
}

const BOE_BASE = 3.75; // risk-free rate %

const CapitalAppreciationChart: React.FC<CapitalAppreciationChartProps> = ({
  propertyPrice,
  leaseYears = 999,
  epc = 'C',
  floorLevel = 'standard_floor',
  serviceCharge = 0,
  area = '',
  compact = false,
}) => {
  const { data, loading, profile } = useAppreciationModel(propertyPrice);
  const [mcHorizon, setMcHorizon] = useState(5);
  const [showMC, setShowMC] = useState(false);

  const mc = useMonteCarlo(propertyPrice, area, data, 10000, mcHorizon);

  // Property adjustment total
  const adjustments = useMemo(() => {
    if (!data) return 0;
    const adj = data.property_adjustments;
    let total = 0;
    if (leaseYears < 80) total += adj.lease_risk.under_80_years;
    else if (leaseYears < 90) total += adj.lease_risk['80_to_90_years'];
    else if (leaseYears < 125) total += adj.lease_risk['90_to_125_years'];
    else total += adj.lease_risk.over_125_years;
    const epcUpper = (epc || 'C').toUpperCase();
    if (['A', 'B'].includes(epcUpper)) total += adj.epc_rating.rating_a_to_b;
    else if (epcUpper === 'C') total += adj.epc_rating.rating_c;
    else if (epcUpper === 'D') total += adj.epc_rating.rating_d;
    else total += adj.epc_rating.rating_e_to_g;
    const fl = (floorLevel || '').toLowerCase();
    if (fl.includes('ground')) total += adj.floor_level.ground_floor;
    else if (fl.includes('penthouse') || fl.includes('roof')) total += adj.floor_level.penthouse;
    else if (fl.includes('lift')) total += adj.floor_level.upper_floor_with_lift;
    else total += adj.floor_level.standard_floor;
    if (serviceCharge > adj.service_charge.threshold_annual) total += adj.service_charge.high_charge_penalty;
    return total;
  }, [data, leaseYears, epc, floorLevel, serviceCharge]);

  // Scenario-based yearly values (with adjustments)
  const yearlyData = useMemo(() => {
    if (!profile) return [];
    return [0, 1, 2, 3, 4, 5].map(year => {
      const bear = profile.scenarios.find(s => s.scenario === 'bear')!;
      const base = profile.scenarios.find(s => s.scenario === 'base')!;
      const bull = profile.scenarios.find(s => s.scenario === 'bull')!;
      const adjBear = bear.annual_return / 100 + adjustments / 100;
      const adjBase = base.annual_return / 100 + adjustments / 100;
      const adjBull = bull.annual_return / 100 + adjustments / 100;
      return {
        year,
        bear: propertyPrice * Math.pow(1 + adjBear, year),
        base: propertyPrice * Math.pow(1 + adjBase, year),
        bull: propertyPrice * Math.pow(1 + adjBull, year),
        adjBase: propertyPrice * Math.pow(1 + adjBase, year),
      };
    });
  }, [profile, propertyPrice, adjustments]);

  // SVG helpers
  const W = compact ? 80 : 200;
  const H = compact ? 40 : 80;

  // QA-185 Bug 3: filter NaN/Infinity from allValues before Math.min/max
  const allValues = [
    ...yearlyData.flatMap(d => [d.bear, d.base, d.bull]),
    ...(mc ? [
      ...(mc.yearlyBandP10 || []),
      ...(mc.yearlyBandP50 || []),
      ...(mc.yearlyBandP90 || []),
    ] : []),
  ].filter((v) => isFinite(v) && !isNaN(v));

  if (allValues.length === 0) return null;

  const minV = Math.min(...allValues) * 0.97;
  const maxV = Math.max(...allValues) * 1.03;
  const range = maxV - minV;
  const pad = 4;

  const getX = (i: number) => pad + (i / (yearlyData.length - 1)) * (W - 2 * pad);
  const safeGetY = (v: number | undefined | null) => {
    if (v == null || !isFinite(v) || isNaN(v)) return H - pad;
    return H - pad - ((v - minV) / range) * (H - 2 * pad);
  };
  const getY = (v: number) => safeGetY(v) as number;

  const toPolyline = (key: keyof typeof yearlyData[0]) =>
    yearlyData.map((d, i) => `${getX(i)},${getY(d[key] as number)}`).join(' ');

  if (loading) return (
    <div className="bg-linear-card/30 border border-linear-border rounded-xl p-4 flex items-center justify-center animate-pulse h-48">
      <span className="text-[10px] text-linear-text-muted uppercase tracking-widest">Loading appreciation model...</span>
    </div>
  );

  if (!profile) return null;

  // Fan chart SVG path (depends on yearlyData — now safe to compute after profile guard)
  const fanPath = [
    `M ${getX(0)},${getY(yearlyData[0].bear)}`,
    ...yearlyData.map((d, i) => `L ${getX(i)},${getY(d.bull)}`),
    ...[...yearlyData].reverse().map((d, i) => `L ${getX(yearlyData.length - 1 - i)},${getY(d.bear)}`),
    'Z',
  ].join(' ');

  const rfPath = yearlyData.map((d, i) => {
    const rfVal = propertyPrice * Math.pow(1 + BOE_BASE / 100, d.year);
    return `${getX(i)},${getY(rfVal)}`;
  }).join(' ');

  // Monte Carlo histogram bins
  const histogramBins = useMemo(() => {
    if (!mc) return [];
    const bins = 20;
    const min = mc.p10 * 0.95;
    const max = mc.p90 * 1.05;
    const binWidth = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    const binCenters: number[] = [];
    for (let i = 0; i < bins; i++) {
      binCenters.push(min + binWidth * (i + 0.5));
    }
    for (const v of mc.finalValues) {
      const binIdx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
      if (binIdx >= 0) counts[binIdx]++;
    }
    const maxCount = Math.max(...counts);
    return binCenters.map((center, i) => ({ center, count: counts[i], pct: counts[i] / maxCount }));
  }, [mc]);

  if (compact) {
    const yData5 = yearlyData[mcHorizon];
    const mcP50 = mc?.p50 ?? yData5?.adjBase ?? propertyPrice;
    return (
      <div className="flex items-center gap-2">
        <div className="relative" style={{ width: W, height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
            <path d={fanPath} fill="#3b82f6" opacity="0.08" />
            <polyline points={toPolyline('bear')} fill="none" stroke="#ef4444" strokeWidth="0.6" strokeDasharray="2,1" opacity="0.6" />
            <polyline points={toPolyline('base')} fill="none" stroke="#3b82f6" strokeWidth="1" />
            <polyline points={toPolyline('bull')} fill="none" stroke="#22c55e" strokeWidth="0.6" strokeDasharray="2,1" opacity="0.6" />
          </svg>
        </div>
        <div className="text-sm font-bold text-white tracking-tight">
          £{(mcP50 / 1000).toFixed(0)}K
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-retro-green animate-pulse" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">5-Year Capital Appreciation Model</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Scenario legend */}
          {profile.scenarios.map(s => (
            <div key={s.scenario} className="flex items-center gap-1 text-[8px]">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-black uppercase" style={{ color: s.color }}>{s.scenario}</span>
              <span className="text-linear-text-muted">{s.probability}%</span>
            </div>
          ))}
          {/* Monte Carlo toggle */}
          <button
            onClick={() => setShowMC(!showMC)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
              showMC ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
            }`}
          >
            <BarChart2 size={9} />
            Monte Carlo {mc?.iterations.toLocaleString() ?? '10K'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Entry</div>
            <div className="text-lg font-bold text-white tracking-tighter">£{(propertyPrice / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Base 5yr</div>
            <div className="text-lg font-bold text-blue-400 tracking-tighter">£{(yearlyData[5]?.adjBase / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">P50 (MC)</div>
            <div className="text-lg font-bold text-purple-400 tracking-tighter">£{((mc?.p50 ?? yearlyData[5]?.adjBase) / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">α vs RF</div>
            <div className={`text-lg font-bold tracking-tighter ${profile.portfolioAlpha >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
              {profile.portfolioAlpha >= 0 ? '+' : ''}{profile.portfolioAlpha.toFixed(1)}pp
            </div>
          </div>
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Risk-Free</div>
            <div className="text-lg font-bold text-linear-text-muted tracking-tighter">{BOE_BASE.toFixed(2)}%</div>
          </div>
        </div>

        {/* SVG Fan Chart */}
        <div className="relative" style={{ height: 180 }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full overflow-visible"
          >
            {/* Grid */}
            {[0.25, 0.5, 0.75].map(pct => {
              const v = minV + range * pct;
              return (
                <g key={pct}>
                  <line x1={pad} y1={getY(v)} x2={W - pad} y2={getY(v)} stroke="currentColor" strokeWidth="0.1" className="text-linear-border/50" />
                  <text x={pad - 1} y={getY(v) + 1} className="text-[3px] fill-linear-text-muted" textAnchor="end">£{(v / 1000).toFixed(0)}K</text>
                </g>
              );
            })}

            {/* Fan area */}
            <path d={fanPath} fill="#3b82f6" opacity="0.07" />

            {/* Risk-free line */}
            <polyline points={rfPath} fill="none" stroke="#a1a1aa" strokeWidth="0.5" strokeDasharray="1,1" opacity="0.5" />

            {/* Monte Carlo percentile bands */}
            {showMC && mc && (
              <>
                {/* P10-P90 band */}
                <path
                  d={[
                    `M ${getX(0)},${safeGetY(mc.yearlyBandP10[0])}`,
                    ...mc.yearlyBandP10.map((v, i) => `L ${getX(i)},${safeGetY(v)}`),
                    ...[...mc.yearlyBandP90].reverse().map((v, i) => `L ${getX(mc.yearlyBandP90.length - 1 - i)},${safeGetY(v)}`),
                    'Z',
                  ].join(' ')}
                  fill="#a855f7" opacity="0.08"
                />
                {/* P25-P75 band */}
                <path
                  d={[
                    `M ${getX(0)},${safeGetY(mc.p25)}`,
                    `L ${getX(mcHorizon)},${safeGetY(mc.p25)}`,
                    `L ${getX(mcHorizon)},${safeGetY(mc.p75)}`,
                    `L ${getX(0)},${safeGetY(mc.p75)}`,
                    'Z',
                  ].join(' ')}
                  fill="#a855f7" opacity="0.12"
                />
                {/* P50 line */}
                <polyline
                  points={mc.yearlyBandP50.map((v, i) => `${getX(i)},${safeGetY(v)}`).join(' ')}
                  fill="none" stroke="#a855f7" strokeWidth="1.2"
                  strokeDasharray="3,1"
                />
                {/* P10/P90 endpoints */}
                {mc.yearlyBandP10.map((v, i) => (
                  <circle key={i} cx={getX(i)} cy={safeGetY(v)} r="0.8" fill="#a855f7" opacity="0.5" />
                ))}
                {mc.yearlyBandP90.map((v, i) => (
                  <circle key={i} cx={getX(i)} cy={safeGetY(v)} r="0.8" fill="#a855f7" opacity="0.5" />
                ))}
              </>
            )}

            {/* Bear (dashed) */}
            <polyline points={toPolyline('bear')} fill="none" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2,1" opacity="0.7" />
            {/* Bull (dashed) */}
            <polyline points={toPolyline('bull')} fill="none" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="2,1" opacity="0.7" />
            {/* Base (solid) */}
            <polyline points={toPolyline('base')} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Adjusted base */}
            <polyline points={toPolyline('adjBase')} fill="none" stroke="#3b82f6" strokeWidth="0.4" strokeDasharray="1,1" opacity="0.4" />

            {/* Year dots + labels */}
            {yearlyData.map((d, i) => (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(d.adjBase)} r="1.2" fill="#3b82f6" />
                <text x={getX(i)} y={H - pad + 4} className="text-[3px] fill-linear-text-muted" textAnchor="middle">Y{i}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Year markers */}
        <div className="flex justify-between text-[8px] text-linear-text-muted font-mono px-1">
          {['Now', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'].map((label) => <span key={label}>{label}</span>)}
        </div>

        {/* Monte Carlo Panel */}
        {showMC && mc && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-4">
            {/* Horizon selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">
                <Sliders size={10} />
                Horizon
              </div>
              <div className="flex bg-linear-bg rounded-lg border border-linear-border p-0.5 gap-0.5">
                {[1, 2, 3, 4, 5].map(yr => (
                  <button
                    key={yr}
                    onClick={() => setMcHorizon(yr)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
                      mcHorizon === yr ? 'bg-purple-500 text-white' : 'text-linear-text-muted hover:text-white'
                    }`}
                  >
                    {yr}yr
                  </button>
                ))}
              </div>
              <span className="text-[8px] text-linear-text-muted">{mc.iterations.toLocaleString()} iterations · GBM random walk</span>
            </div>

            {/* Histogram */}
            <div className="flex items-end gap-px h-20">
              {histogramBins.map((bin, i) => {
                const isP50 = Math.abs(bin.center - mc.p50) < (histogramBins[1].center - histogramBins[0].center);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${bin.pct * 100}%`,
                      backgroundColor: isP50 ? '#a855f7' : 'rgba(168,85,247,0.3)',
                      minWidth: 2,
                    }}
                  />
                );
              })}
            </div>

            {/* Percentile results */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'P10 (Bear)', val: mc.p10, color: '#ef4444', delta: mc.p10 - propertyPrice },
                { label: 'P50 (Median)', val: mc.p50, color: '#a855f7', delta: mc.p50 - propertyPrice },
                { label: 'P90 (Bull)', val: mc.p90, color: '#22c55e', delta: mc.p90 - propertyPrice },
              ].map(({ label, val, color, delta }) => (
                <div key={label} className="p-3 rounded-xl border" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
                  <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color }}>{label}</div>
                  <div className="text-lg font-bold text-white tracking-tighter">£{(val / 1000).toFixed(0)}K</div>
                  <div className={`text-[9px] font-black ${delta >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
                    {delta >= 0 ? '+' : ''}£{(delta / 1000).toFixed(0)}K
                  </div>
                  <div className="text-[8px] text-linear-text-muted/60">
                    {((delta / propertyPrice) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Distribution stats */}
            <div className="grid grid-cols-3 gap-3 text-[9px]">
              <div className="flex justify-between">
                <span className="text-linear-text-muted">Mean</span>
                <span className="font-bold text-white">£{(mc.mean / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-linear-text-muted">Std Dev</span>
                <span className="font-bold text-white">£{(mc.stdDev / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-linear-text-muted">P75-P25</span>
                <span className="font-bold text-purple-400">£{((mc.p75 - mc.p25) / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </div>
        )}

        {/* Scenario cards */}
        <div className="grid grid-cols-3 gap-3">
          {profile.scenarios.map(s => {
            const annualAdj = s.annual_return + adjustments;
            return (
              <div key={s.scenario} className="p-3 rounded-xl border" style={{ borderColor: `${s.color}30`, backgroundColor: `${s.color}08` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: s.color }}>{s.scenario}</span>
                  <span className="text-[8px] text-linear-text-muted font-mono">{s.probability}%</span>
                </div>
                <div className="text-lg font-bold text-white tracking-tighter">
                  £{(s.five_year_value / 1000).toFixed(0)}K
                </div>
                <div className={`text-[9px] font-black ${annualAdj >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
                  {annualAdj >= 0 ? '+' : ''}{annualAdj.toFixed(1)}% / yr
                </div>
                <div className="text-[8px] text-linear-text-muted mt-1">
                  {s.cumulative_gain >= 0 ? '+' : ''}£{(s.cumulative_gain / 1000).toFixed(0)}K / 5yr
                </div>
              </div>
            );
          })}
        </div>

        {/* Property adjustments */}
        {adjustments !== 0 && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <Info size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[9px] text-amber-300">
              <span className="font-black uppercase tracking-widest">Property Adjustments: </span>
              <span className={adjustments < 0 ? 'text-rose-400' : 'text-retro-green'}>
                {adjustments >= 0 ? '+' : ''}{adjustments.toFixed(1)}% per annum
              </span>
              <span className="text-linear-text-muted ml-1">(lease: {leaseYears}yr, EPC: {epc || 'N/A'}, floor: {floorLevel || 'N/A'})</span>
            </div>
          </div>
        )}

        {/* α vs risk-free signal */}
        <div className="p-3 bg-linear-bg rounded-xl border border-linear-border flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {profile.portfolioAlpha > 0 ? <TrendingUp size={12} className="text-retro-green" />
             : profile.portfolioAlpha < 0 ? <TrendingDown size={12} className="text-rose-400" />
             : <Minus size={12} className="text-linear-text-muted" />}
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: profile.portfolioAlpha > 0 ? '#22c55e' : profile.portfolioAlpha < 0 ? '#ef4444' : '#a1a1aa' }}>
              {profile.portfolioAlpha > 0 ? 'POSITIVE α' : profile.portfolioAlpha < 0 ? 'NEGATIVE α' : 'AT RISK-FREE'}
            </span>
          </div>
          <span className="text-[9px] text-linear-text-muted">
            Base scenario outperforms {BOE_BASE}% BoE rate by
          </span>
          <span className="text-[10px] font-black text-white">
            {profile.portfolioAlpha >= 0 ? '+' : ''}{profile.portfolioAlpha.toFixed(1)}pp annually
          </span>
        </div>
      </div>
    </div>
  );
};

export default CapitalAppreciationChart;
