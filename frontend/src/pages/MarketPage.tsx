import React from 'react';
import { Map, Activity, RefreshCw } from 'lucide-react';
import MicroMarketVelocityMap from '../components/MicroMarketVelocityMap';
import LondonMicroMarketHeatMap from '../components/LondonMicroMarketHeatMap';
import DataFreshnessIndicator from '../components/DataFreshnessIndicator';
import MarketVerdict from '../components/MarketVerdict';
import AreaMetricHeatmap from '../components/AreaMetricHeatmap';
import PropertyTypePerformanceChart from '../components/PropertyTypePerformanceChart';
import Tooltip from '../components/Tooltip';
import { PHASES } from '../components/SeasonalMarketCycle';

const MarketPage: React.FC = () => {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-2 w-2 rounded-full bg-retro-green animate-pulse" />
            <span className="text-[10px] font-black text-retro-green uppercase tracking-widest">Market Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Area Heat Map</h1>
          <p className="text-sm text-linear-text-muted mt-1 max-w-xl">
            Micro-market velocity and area performance analytics for London prime locations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataFreshnessIndicator />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-retro-green/10 border border-retro-green/20 rounded-lg">
            <Activity size={12} className="text-retro-green" />
            <span className="text-[9px] font-black text-retro-green uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* UX-033: Market Verdict Strip */}

      {/* FE-236: Seasonal Market Cycle phase strip — ambient context above MarketVerdict */}
      {(() => {
        const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const currentMonth = new Date().getMonth();
        const currentPhaseIdx = PHASES.findIndex(p => p.months.includes(currentMonth));

        const getSignal = (phaseName: string) => {
          if (phaseName === 'Winter Trough' || phaseName === 'Year-End Dip') {
            return { label: 'BUYER', color: '#22c55e', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
          }
          if (phaseName === 'Spring Surge' || phaseName === 'Autumn Rush') {
            return { label: 'SELLER', color: '#ef4444', bg: 'bg-red-500/15', border: 'border-red-500/30' };
          }
          return { label: 'NEUTRAL', color: '#a1a1aa', bg: 'bg-zinc-500/15', border: 'border-zinc-500/30' };
        };

        const getMonthRange = (phase: typeof PHASES[number]) =>
          phase.months.map(m => MONTH_NAMES[m]).join('–');

        return (
          <div className="bg-linear-card border border-linear-border rounded-2xl p-4 mb-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={12} className="text-amber-400" />
              <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">
                Seasonal Market Cycle
              </span>
              <span className="ml-auto hidden md:flex items-center gap-2 text-[8px] font-black text-linear-text-muted uppercase tracking-widest">
                Current: {MONTH_NAMES[currentMonth]}
              </span>
            </div>

            {/* Phase pills */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
              {PHASES.map((phase, idx) => {
                const isCurrent = idx === currentPhaseIdx;
                const signal = getSignal(phase.name);
                const monthRange = getMonthRange(phase);

                return (
                  <Tooltip
                    key={phase.name}
                    content={phase.desc}
                    methodology={`Seasonal index derived from ONS Land Registry 5-year rolling average. Phase spans ${monthRange}.`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={[
                          'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all cursor-help min-w-[80px]',
                          isCurrent
                            ? 'border-current bg-white/5'
                            : 'border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5',
                        ].join(' ')}
                        style={isCurrent ? { borderColor: phase.color + '80' } : {}}
                      >
                        {/* Phase name */}
                        <span
                          className={['text-[10px] font-bold uppercase tracking-tight leading-tight', isCurrent ? '' : 'text-white/60'].join(' ')}
                          style={isCurrent ? { color: phase.color } : {}}
                        >
                          {phase.name}
                        </span>

                        {/* Month range — hidden on sm */}
                        <span className="hidden sm:block text-[8px] text-white/30 font-medium">
                          {monthRange}
                        </span>

                        {/* Signal badge — shown on md+ */}
                        <span className={['hidden md:flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded', signal.bg].join(' ')}
                          style={{ color: signal.color }}>
                          {signal.label}
                        </span>
                      </div>

                      {/* Active indicator dot */}
                      {isCurrent && (
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: phase.color, boxShadow: `0 0 6px ${phase.color}` }}
                        />
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* UX-033: Market Verdict Strip */}
      <MarketVerdict />

      {/* VISX-005: Area × Metric Heatmap */}
      <AreaMetricHeatmap maxRows={8} />

      {/* Geographic Heat Map */}
      <LondonMicroMarketHeatMap />

      {/* Ranked Velocity Table */}
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Map size={14} className="text-retro-green" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Micro-Market Velocity — Ranked</h2>
          </div>
          <p className="text-[10px] text-linear-text-muted/60">
            Composite signal strength across London prime postcodes. Higher scores indicate faster velocity markets.
          </p>
        </div>
        <MicroMarketVelocityMap />
      </div>

      {/* UX-033: Property Type Performance Chart — QA-189 */}
      <PropertyTypePerformanceChart />
    </div>
  );
};

export default MarketPage;
