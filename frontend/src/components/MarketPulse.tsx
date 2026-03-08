import React from 'react';
import { 
  TrendingUp, 
  Activity, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  ChevronRight
} from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import Tooltip from './Tooltip';

const MarketPulse: React.FC = () => {
  const { data, loading, error } = useMacroData();

  if (loading) return (
    <div className="bg-linear-card/30 border border-linear-border rounded-2xl p-6 flex items-center justify-center animate-pulse h-64">
      <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Fetching Market Pulse...</span>
    </div>
  );

  if (error || !data) return null;

  return (
    <div className="bg-linear-card/50 border border-linear-border rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-linear-border flex items-center justify-between bg-linear-card/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Market Pulse // Macro Intelligence</h2>
        </div>
        <div className="text-[9px] font-mono text-linear-text-muted">LATEST_SYNC: {data.london_hpi.last_updated}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-linear-border">
        {/* KPI: London HPI */}
        <Tooltip 
          content="A localized liquidity score for specific London boroughs, tracking search volume vs. listing duration." 
          methodology="Aggregated data from Rightmove/Zoopla on search volume vs. listing duration."
          className="w-full"
        >
          <div className="p-6 border-r border-linear-border group hover:bg-linear-card/80 transition-colors h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">London HPI</span>
              <TrendingUp size={12} className="text-linear-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tighter">£{data.london_hpi.avg_price_pcl.toLocaleString()}</span>
              <span className={`text-[10px] font-black flex items-center gap-0.5 ${data.london_hpi.mom_pct >= 0 ? 'text-retro-green' : 'text-rose-500'}`}>
                {data.london_hpi.mom_pct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(data.london_hpi.mom_pct)}%
              </span>
            </div>
            <p className="text-[9px] text-linear-text-muted mt-1 uppercase font-bold">YoY Change: <span className="text-white">+{data.london_hpi.yoy_pct}%</span></p>
          </div>
        </Tooltip>

        {/* KPI: Inventory Velocity */}
        <Tooltip 
          content="The number of months it would take to sell all current listings at the average monthly absorption rate." 
          methodology="Active Listings / Avg. Monthly Sales. < 4m = Seller's Market, > 6m = Buyer's Market."
          className="w-full"
        >
          <div className="p-6 border-r border-linear-border group hover:bg-linear-card/80 transition-colors h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Inventory Velocity</span>
              <Activity size={12} className="text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tighter">{data.inventory_velocity.months_of_supply}</span>
              <span className="text-[10px] text-linear-text-muted font-bold uppercase tracking-tighter">MOS</span>
            </div>
            <p className="text-[9px] text-linear-text-muted mt-1 uppercase font-bold">New Inst Q-Change: <span className="text-white">+{data.inventory_velocity.new_instructions_q_change}%</span></p>
          </div>
        </Tooltip>

        {/* KPI: Negotiation Delta */}
        <Tooltip 
          content="The average difference between the 'Asking Price' and 'Sold Price' in the current quarter." 
          methodology="Calculation based on Land Registry sold data vs. initial portal asking price."
          className="w-full"
        >
          <div className="p-6 border-r border-linear-border group hover:bg-linear-card/80 transition-colors h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Negotiation Delta</span>
              <Percent size={12} className="text-retro-green" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tighter">-{data.negotiation_delta.avg_discount_pct}%</span>
              <span className="text-[10px] text-retro-green font-black uppercase tracking-tighter">{data.negotiation_delta.market_sentiment}</span>
            </div>
            <p className="text-[9px] text-linear-text-muted mt-1 uppercase font-bold">Assets Below Asking: <span className="text-white">{data.negotiation_delta.pct_below_asking}%</span></p>
          </div>
        </Tooltip>

        {/* KPI: Economic Rate */}
        <Tooltip 
          content="Current official Bank of England base interest rate, governing the floor for retail mortgage products." 
          methodology="Directly sourced from the BoE Monetary Policy Committee (MPC) latest release."
          className="w-full"
        >
          <div className="p-6 group hover:bg-linear-card/80 transition-colors h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">BoE Base Rate</span>
              <Info size={12} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tighter">{data.economic_indicators.boe_base_rate}%</span>
              <span className="text-[10px] text-amber-500 font-black uppercase tracking-tighter">Stable</span>
            </div>
            <p className="text-[9px] text-linear-text-muted mt-1 uppercase font-bold">Inflation CPI: <span className="text-white">{data.economic_indicators.uk_inflation_cpi}%</span></p>
          </div>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Area Heat Index */}
        <div className="lg:col-span-1 p-6 border-r border-linear-border bg-linear-card/20">
          <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            Area Heat Index <ChevronRight size={10} className="text-linear-accent" />
          </h3>
          <div className="space-y-3">
            {data.area_heat_index.map((area) => (
              <div key={area.area} className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white tracking-tight">{area.area}</span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`h-1 w-3 rounded-full ${i <= (area.score / 2) ? (area.score >= 8 ? 'bg-retro-green' : area.score >= 6 ? 'bg-amber-400' : 'bg-blue-400') : 'bg-linear-border'}`}
                      ></div>
                    ))}
                  </div>
                  <span className={`text-[9px] font-black uppercase ${area.trend === 'Rising' || area.trend === 'High Demand' ? 'text-retro-green' : 'text-linear-text-muted'}`}>
                    {area.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analyst Summary Ticker */}
        <div className="lg:col-span-2 p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={120} strokeWidth={1} />
          </div>
          <h3 className="text-[10px] font-bold text-linear-accent uppercase tracking-widest mb-3 flex items-center gap-2">
             <div className="h-1 w-4 bg-linear-accent rounded-full"></div>
             Strategic Intel Summary
          </h3>
          <div className="relative z-10">
            <p className="text-xs text-linear-text-muted leading-relaxed font-medium italic">
              "{data.market_pulse_summary}"
            </p>
          </div>
          <div className="mt-4 flex items-center gap-4 relative z-10">
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-black text-blue-400 uppercase">
                Liquidity: High
             </div>
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-retro-green/10 border border-retro-green/20 rounded text-[9px] font-black text-retro-green uppercase">
                Sentiment: Opportunistic
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPulse;
