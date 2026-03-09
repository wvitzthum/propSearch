import React from 'react';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  Target, 
  ChevronRight
} from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';

const MarketVolumeChart: React.FC<{ data: { month: string, listed: number, sold?: number }[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => Math.max(d.listed, d.sold || 0)));
  const padding = 20;
  const width = 800;
  const height = 200;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const getX = (index: number) => padding + (index * (chartWidth / (data.length - 1)));
  const getY = (val: number) => height - padding - ((val / maxVal) * chartHeight);

  const listedPoints = data.map((d, i) => `${getX(i)},${getY(d.listed)}`).join(' ');
  const soldPoints = data.map((d, i) => `${getX(i)},${getY(d.sold || 0)}`).join(' ');

  return (
    <div className="relative h-64 w-full bg-linear-bg/30 border border-linear-border rounded-xl p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5">
             <div className="h-0.5 w-4 bg-blue-500"></div>
             <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Listed Inventory</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="h-0.5 w-4 bg-emerald-500"></div>
             <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Sold Volume</span>
           </div>
        </div>
        <div className="text-[9px] font-mono text-linear-accent uppercase">Protocol: Volume_Tracking_v4.1</div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line 
            key={p}
            x1={padding} 
            y1={padding + (p * chartHeight)} 
            x2={width - padding} 
            y2={padding + (p * chartHeight)} 
            className="stroke-linear-border/30" 
            strokeWidth="0.5" 
          />
        ))}

        {/* Areas */}
        <polyline
          points={`${padding},${height-padding} ${listedPoints} ${width-padding},${height-padding}`}
          className="fill-blue-500/5 stroke-none"
        />
        <polyline
          points={`${padding},${height-padding} ${soldPoints} ${width-padding},${height-padding}`}
          className="fill-emerald-500/5 stroke-none"
        />

        {/* Lines */}
        <polyline
          points={listedPoints}
          className="fill-none stroke-blue-500"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polyline
          points={soldPoints}
          className="fill-none stroke-emerald-500"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Highlight current point */}
        <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].listed)} r="3" className="fill-blue-500 shadow-xl" />
        <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].sold || 0)} r="3" className="fill-emerald-500 shadow-xl" />
      </svg>
    </div>
  );
};

const TimingIndicatorGauge: React.FC<{ monthsOfSupply: number }> = ({ monthsOfSupply }) => {
  // 0-8 months scale. 4 is neutral. <4 is seller market, >4 is buyer market.
  const percentage = Math.min(100, (monthsOfSupply / 8) * 100);
  const color = monthsOfSupply > 4.5 ? '#10b981' : monthsOfSupply < 3.5 ? '#ef4444' : '#f59e0b';
  const label = monthsOfSupply > 4.5 ? 'BUYER' : monthsOfSupply < 3.5 ? 'SELLER' : 'NEUTRAL';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-linear-card/50 border border-linear-border rounded-xl relative overflow-hidden group">
      <div className="relative h-32 w-32 mb-4">
        <svg viewBox="0 0 100 100" className="h-full w-full rotate-[-90deg]">
          <circle cx="50" cy="50" r="40" className="fill-none stroke-linear-border" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="40" 
            className="fill-none transition-all duration-1000 ease-out" 
            stroke={color}
            strokeWidth="8" 
            strokeDasharray={`${(percentage * 251) / 100} 251`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <span className="text-2xl font-black text-white leading-none">{monthsOfSupply}</span>
           <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-tighter mt-1">MOS</span>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10`} style={{ backgroundColor: `${color}20`, color: color }}>
        {label} ADVANTAGE
      </div>
      <div className="mt-4 text-[9px] text-linear-text-muted text-center uppercase tracking-widest font-bold">
         Strategic Market Timing
      </div>
    </div>
  );
};

const MarketSituationRoom: React.FC = () => {
  const { data, loading, error } = useMacroData();

  if (loading || error || !data) return null;

  // Fallbacks for missing data
  const inventoryVelocity = data.inventory_velocity || { months_of_supply: 0, new_instructions_q_change: 0 };
  const timingSignals = data.timing_signals || { seasonal_buy_score: 0, optimal_window_description: 'N/A' };
  const hpi = data.london_hpi || { mom_pct: 0, yoy_pct: 0, avg_price_pcl: 0 };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-linear-border pb-8">
        <div className="flex flex-col max-w-xl">
           <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-500/5 border border-blue-500/20 rounded-md text-blue-400 text-[9px] font-black uppercase tracking-widest mb-4 w-fit">
              <Activity size={10} className="animate-pulse" />
              Strategic Situation Room
           </div>
           <h2 className="text-3xl font-bold text-white tracking-tighter mb-4 leading-tight">
             Institutional Market <br />
             <span className="text-linear-accent">Intelligence Tracker</span>
           </h2>
           <p className="text-sm text-linear-text-muted leading-relaxed">
             Direct access to the same metrics institutional funds use to timing entries. 
             Real-time inventory velocity monitoring combined with pricing delta analysis.
           </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-linear-card border border-linear-border rounded-xl">
              <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Market Heat</div>
              <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                 {data.area_heat_index && data.area_heat_index.length > 0 ? (data.area_heat_index[0].score / 10).toFixed(1) : '5.0'}
                 <TrendingUp size={16} className="text-retro-green" />
              </div>
           </div>
           <div className="p-4 bg-linear-card border border-linear-border rounded-xl">
              <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Supply Cap</div>
              <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                 {inventoryVelocity.months_of_supply.toFixed(1)}
                 <Clock size={16} className="text-blue-400" />
              </div>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
           <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-linear-border flex items-center justify-between bg-linear-card/80">
                 <div className="flex items-center gap-3">
                   <Target size={14} className="text-blue-500" />
                   <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Listing-to-Sold Pipeline Velocity</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-mono text-linear-text-muted uppercase">REALTIME_FEED</span>
                 </div>
              </div>
              <div className="p-6">
                 <MarketVolumeChart data={data.business_history || data.market_business || []} />
                 <div className="mt-8 grid grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Inventory Delta</span>
                       <span className="text-lg font-bold text-white tracking-tight">{inventoryVelocity.new_instructions_q_change > 0 ? '+' : ''}{inventoryVelocity.new_instructions_q_change}%</span>
                    </div>
                    <div className="flex flex-col gap-1 border-x border-linear-border px-6">
                       <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Sold Rate</span>
                       <span className="text-lg font-bold text-emerald-400 tracking-tight">{hpi.yoy_pct > 0 ? '+' : ''}{hpi.yoy_pct}%</span>
                    </div>
                    <div className="flex flex-col gap-1 pl-6">
                       <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Pricing Gap</span>
                       <span className="text-lg font-bold text-blue-400 tracking-tight">{data.negotiation_delta?.avg_discount_pct || 0}%</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-6">
           <TimingIndicatorGauge monthsOfSupply={inventoryVelocity.months_of_supply} />
           <div className="p-6 bg-linear-accent/10 border border-linear-accent/20 rounded-2xl flex flex-col gap-4 group hover:bg-linear-accent/20 transition-all cursor-pointer">
              <div className="text-[10px] font-black text-linear-accent uppercase tracking-widest">Current Protocol Recommendation</div>
              <p className="text-xs font-bold text-white leading-relaxed tracking-tight group-hover:translate-x-1 transition-transform">
                {timingSignals.optimal_window_description || 'Market conditions favoring buyer entry. Inventory build-up in PCL providing leverage.'}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest mt-2 group-hover:gap-4 transition-all">
                 Launch Command Center <ChevronRight size={12} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSituationRoom;
