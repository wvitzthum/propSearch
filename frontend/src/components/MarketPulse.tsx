import React from 'react';
import {
  TrendingUp,
  Activity,
  Percent,
  Info,
} from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import Tooltip from './Tooltip';
import { extractValue } from '../types/macro';

const heatColor = (score: number): string => {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#f59e0b';
  return '#ef4444';
};

const MarketPulse: React.FC = () => {
  const { data, loading, error } = useMacroData();

  if (loading) return (
    <div className="bg-linear-card/30 border border-linear-border rounded-xl p-4 flex items-center justify-center animate-pulse h-24">
      <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Fetching Market Pulse...</span>
    </div>
  );

  if (error || !data) return (
    <div className="bg-linear-card/50 border border-linear-border rounded-xl p-4 flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-retro-amber animate-pulse" />
      <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">LIVE DATA UNAVAILABLE</span>
    </div>
  );

  // Core KPI values
  const londonHPI = data?.london_hpi;
  const annualChange = extractValue(londonHPI?.annual_change ?? londonHPI?.yoy_pct) ?? 0;
  const monthlyChange = extractValue(londonHPI?.monthly_change ?? londonHPI?.mom_pct) ?? 0;

  const inventory = data?.inventory_velocity;
  const monthsSupply = extractValue(inventory?.months_of_supply) ?? 0;
  const newInstQChange = extractValue(inventory?.new_instructions_q_change) ?? 0;

  const negotiation = data?.negotiation_delta;
  const avgDiscount = extractValue(negotiation?.avg_discount_pct) ?? 0;
  const sentiment = extractValue(negotiation?.market_sentiment) ?? 'Stable';

  const econ = data?.economic_indicators;
  const boeRate = extractValue(econ?.boe_base_rate) ?? 0;
  const cpi = extractValue(econ?.uk_inflation_cpi) ?? 0;

  // Area heat — top 5 for inline display
  const areaHeat = (data?.area_heat_index || data?.area_trends || []).slice(0, 5);

  return (
    <div className="bg-linear-card/50 border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-linear-accent-blue animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h2 className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">Market Pulse</h2>
        </div>
        <span className="text-[8px] font-mono text-linear-text-muted">
          {londonHPI?.last_updated ?? new Date().toLocaleDateString()}
        </span>
      </div>

      {/* KPI Grid — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-linear-border">
        <Tooltip
          content="A localized liquidity score for specific London boroughs, tracking search volume vs. listing duration."
          methodology="Aggregated data from Rightmove/Zoopla on search volume vs. listing duration."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">London HPI</span>
              <TrendingUp size={10} className="text-linear-accent-blue" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">
                {annualChange > 0 ? '+' : ''}{annualChange}%
              </span>
              <span className={`text-[9px] font-bold ${monthlyChange >= 0 ? 'text-linear-accent-emerald' : 'text-linear-accent-rose'}`}>
                {monthlyChange >= 0 ? '▲' : '▼'}{Math.abs(monthlyChange)}% MoM
              </span>
            </div>
          </div>
        </Tooltip>

        <Tooltip
          content="The number of months it would take to sell all current listings at the average monthly absorption rate."
          methodology="Active Listings / Avg. Monthly Sales. < 4m = Seller's Market, > 6m = Buyer's Market."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">Inventory</span>
              <Activity size={10} className="text-linear-accent-blue" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">{monthsSupply}</span>
              <span className="text-[8px] text-linear-text-muted font-bold uppercase">MOS</span>
              <span className={`text-[9px] font-bold ml-auto ${newInstQChange >= 0 ? 'text-linear-accent-emerald' : 'text-linear-accent-rose'}`}>
                {newInstQChange >= 0 ? '▲' : '▼'}{Math.abs(newInstQChange)}% Q
              </span>
            </div>
          </div>
        </Tooltip>

        <Tooltip
          content="The average difference between the 'Asking Price' and 'Sold Price' in the current quarter."
          methodology="Calculation based on Land Registry sold data vs. initial portal asking price."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">Negotiation</span>
              <Percent size={10} className="text-linear-accent-emerald" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">-{avgDiscount}%</span>
              <span className="text-[8px] text-linear-accent-emerald font-bold uppercase">{sentiment}</span>
            </div>
          </div>
        </Tooltip>

        <Tooltip
          content="Current official Bank of England base interest rate, governing the floor for retail mortgage products."
          methodology="Directly sourced from the BoE Monetary Policy Committee (MPC) latest release."
        >
          <div className="p-4 hover:bg-linear-card/60 transition-colors">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-[0.1em]">BoE Base</span>
              <Info size={10} className="text-retro-amber" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tracking-tighter">{boeRate.toFixed(2)}%</span>
              <span className="text-[8px] text-retro-amber font-bold uppercase">CPI {cpi}%</span>
            </div>
          </div>
        </Tooltip>
      </div>

      {/* Area Heat Strip — inline compact row */}
      {areaHeat.length > 0 && (
        <div className="px-4 py-2.5 border-t border-linear-border bg-linear-card/30 flex items-center gap-3 overflow-x-auto custom-scrollbar">
          <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest shrink-0">
            Area Heat
          </span>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {areaHeat.map((area: any) => {
              const score = extractValue(area.score) ?? 5;
              const color = heatColor(score);
              return (
                <div
                  key={area.area}
                  className="flex items-center gap-1.5 px-2 py-1 rounded border shrink-0"
                  style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
                >
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[8px] font-bold text-white uppercase tracking-tight whitespace-nowrap">
                    {area.area}
                  </span>
                  <span className="text-[8px] font-black" style={{ color }}>
                    {score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPulse;
