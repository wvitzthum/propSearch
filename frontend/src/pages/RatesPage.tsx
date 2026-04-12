import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';
import SwapRateSignal from '../components/SwapRateSignal';
import BoERatePathChart from '../components/BoERatePathChart';
import AreaPerformanceChart from '../components/AreaPerformanceChart';
import HPIHistoryChart from '../components/HPIHistoryChart';
import LondonPrimePremiumChart from '../components/LondonPrimePremiumChart';
import DataFreshnessIndicator from '../components/DataFreshnessIndicator';
import MarketVerdict from '../components/MarketVerdict';
import SeasonalMarketCycle, { PHASES } from '../components/SeasonalMarketCycle';
import { useMacroData } from '../hooks/useMacroData';

const RatesPage: React.FC = () => {
  const { data } = useMacroData();

  // VISX-021: Extract seasonal indices from macro data (populated by VISX-022)
  const seasonalSupply = data?.seasonal_supply_index as number[] | undefined;
  const seasonalDemand = data?.seasonal_demand_index as number[] | undefined;

  // FE-235: Fallback indices mirror the values in SeasonalMarketCycle.tsx
  const FALLBACK_SUPPLY = [3, 2, 6, 8, 9, 5, 4, 5, 7, 8, 5, 2];
  const FALLBACK_DEMAND = [2, 3, 7, 8, 9, 6, 4, 5, 8, 7, 4, 2];

  // FE-235: Phase-level average supply/demand — computed from the index arrays
  const avgSupply = (p: typeof PHASES[0]) =>
    (p.months.reduce((sum, m) => sum + (seasonalSupply?.[m] ?? FALLBACK_SUPPLY[m]), 0) / p.months.length).toFixed(1);
  const avgDemand = (p: typeof PHASES[0]) =>
    (p.months.reduce((sum, m) => sum + (seasonalDemand?.[m] ?? FALLBACK_DEMAND[m]), 0) / p.months.length).toFixed(1);

  const signalMap: Record<string, string> = {
    'Winter Trough': 'Buyer Window',
    'Year-End Dip': 'Buyer Window',
    'Spring Surge': 'Seller Leverage',
    'Summer Lull': 'Neutral',
    'Autumn Rush': 'Neutral',
  };

  const currentMonth = new Date().getMonth(); // 0-indexed
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentPhaseLabel = (() => {
    const m = currentMonth;
    if (m <= 1) return 'Winter Trough — minimal activity, buyer leverage';
    if (m <= 4) return 'Spring Surge — listings flood in, prices rise fastest';
    if (m <= 7) return 'Summer Lull — holidays slow activity';
    if (m <= 9) return 'Autumn Rush — second busiest period';
    return 'Year-End Dip — Christmas window, negotiating opens';
  })();

  const currentPhase = (() => {
    const m = currentMonth;
    if (m <= 1) return 'Winter Trough';
    if (m <= 4) return 'Spring Surge';
    if (m <= 7) return 'Summer Lull';
    if (m <= 9) return 'Autumn Rush';
    return 'Year-End Dip';
  })();

  // UX-050: Seasonal interpretation — one-line summary for the current phase
  const SEASONAL_INTERPRETATION: Record<string, string> = {
    'Winter Trough': 'Quiet season — buyer leverage highest. Sellers are motivated to sell.',
    'Spring Surge': 'Peak listing season — act fast or compete in a crowded market.',
    'Summer Lull': 'Holidays slow activity. Balanced conditions — prime time to negotiate.',
    'Autumn Rush': 'Second busiest window. Supply and demand both high — negotiate carefully.',
    'Year-End Dip': 'Year-end negotiating window. Sellers motivated before Christmas.',
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Market Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rates & Scenarios</h1>
          <p className="text-sm text-linear-text-muted mt-1 max-w-xl">
            BoE rate path consensus, swap rate signals, and macro scenario modeling for London prime market.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataFreshnessIndicator />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <Activity size={12} className="text-purple-400" />
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* UX-032: Market Verdict hero */}
      <MarketVerdict />

      {/* Swap Rate Signal — top banner */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-purple-400" />
          <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Swap Rate Signals</h2>
        </div>
        <SwapRateSignal />
      </div>

      {/* VISX-021+UX-050: Seasonal Market Cycle — all 5 phases, current phase highlighted */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-amber-400" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Seasonal Market Cycle</h2>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Current Position</div>
            <div className="text-[10px] font-bold text-white">{MONTHS[currentMonth]} — {currentPhaseLabel}</div>
          </div>
        </div>

        {/* UX-050: Grid — chart left (240x240), phase cards right (responsive grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
          {/* Chart: FE-226 ParentSize handles internal scaling from 240x240 container */}
          <div className="w-[240px] h-[240px] flex-shrink-0 self-start">
            <SeasonalMarketCycle
              supplyIndex={seasonalSupply}
              demandIndex={seasonalDemand}
            />
          </div>

          {/* FE-235: Compact lookup table replacing card grid */}
          <div className="overflow-x-auto">
            <table role="table" className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-[8px] font-black uppercase tracking-widest text-linear-text-muted text-left pb-2 pr-3">Phase</th>
                  <th className="text-[8px] font-black uppercase tracking-widest text-linear-text-muted text-left pb-2 pr-3">Months</th>
                  <th className="text-[8px] font-black uppercase tracking-widest text-linear-text-muted text-left pb-2 pr-3">Avg S</th>
                  <th className="text-[8px] font-black uppercase tracking-widest text-linear-text-muted text-left pb-2 pr-3">Avg D</th>
                  <th className="text-[8px] font-black uppercase tracking-widest text-linear-text-muted text-left pb-2 pr-3">Signal</th>
                  <th className="text-[8px] font-black uppercase tracking-widest text-linear-text-muted text-left pb-2">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {PHASES.map(p => {
                  const isCurrent = p.name === currentPhase;
                  const signal = signalMap[p.name] ?? 'Neutral';
                  return (
                    <tr
                      key={p.name}
                      className={[
                        'border-b border-white/5 transition-colors duration-150',
                        isCurrent ? '' : 'hover:bg-white/[0.02]',
                      ].join(' ')}
                      style={isCurrent ? {
                        backgroundColor: `${p.color}14`,
                        borderLeft: '2px solid ' + p.color,
                      } : {}}
                    >
                      {/* Phase */}
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-[11px] font-bold text-white uppercase tracking-widest leading-tight">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      {/* Months */}
                      <td className="py-2 pr-3">
                        <span className="text-[11px] font-medium text-white/80">
                          {p.months.map(m => MONTHS[m]).join(', ')}
                        </span>
                      </td>
                      {/* Avg Supply */}
                      <td className="py-2 pr-3">
                        <span className="text-[11px] font-medium text-white/80">{avgSupply(p)}/10</span>
                      </td>
                      {/* Avg Demand */}
                      <td className="py-2 pr-3">
                        <span className="text-[11px] font-medium text-white/80">{avgDemand(p)}/10</span>
                      </td>
                      {/* Signal pill */}
                      <td className="py-2 pr-3">
                        <span
                          className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded w-fit inline-block"
                          style={{ backgroundColor: `${p.color}18`, color: p.color }}
                        >
                          {signal}
                        </span>
                      </td>
                      {/* Verdict */}
                      <td className="py-2">
                        <span className="text-[10px] text-linear-text-muted leading-relaxed">
                          {SEASONAL_INTERPRETATION[p.name]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* UX-050: Seasonal interpretation summary */}
        <div className="mt-4 px-3 py-2.5 bg-linear-bg rounded-lg border border-white/5">
          <span className="text-[9px] text-linear-text-muted uppercase tracking-widest font-bold mr-2">IT IS {MONTHS[currentMonth].toUpperCase()}:</span>
          <span className="text-[10px] text-white font-medium leading-relaxed">
            We are in the <span className="text-amber-300 font-bold">{currentPhase}</span> — {SEASONAL_INTERPRETATION[currentPhase]}
          </span>
        </div>
      </div>

      {/* FE-219: HPI Historical Trajectory — full-width hero section */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-retro-green" />
          <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">London HPI Historical Trajectory</h2>
        </div>
        <HPIHistoryChart height={360} />
      </div>

      {/* BoE Rate Path + Area Performance — 2-column grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* BoE Rate Path */}
        <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-blue-400" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">BoE Rate Path Scenarios</h2>
          </div>
          <BoERatePathChart />
        </div>

        {/* Area Performance Table */}
        <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-purple-400" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Area Performance</h2>
          </div>
          <AreaPerformanceChart maxRows={6} />
        </div>
      </div>

      {/* FE-191: London Prime Premium */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-amber-400" />
          <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">London Prime Premium Tracker</h2>
        </div>
        <LondonPrimePremiumChart />
      </div>
    </div>
  );
};

export default RatesPage;
