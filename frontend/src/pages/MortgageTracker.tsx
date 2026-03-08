import React from 'react';
import { useFinancialData } from '../hooks/useFinancialData';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import { TrendingUp, Activity, Landmark, Percent, Calendar, ArrowRight, Info, Clock } from 'lucide-react';

const MortgageTracker: React.FC = () => {
  const { macroData, loading } = useFinancialData();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Syncing Financial Pulse..." />
    </div>
  );

  if (!macroData) return null;

  const { economic_indicators, mortgage_history = [] } = macroData;

  // Simple SVG Sparkline Logic
  const maxRate = Math.max(...mortgage_history.map(h => Math.max(h.boe_rate, h.mortgage_2yr, h.mortgage_5yr)), 6) * 1.1;
  const minRate = Math.min(...mortgage_history.map(h => Math.min(h.boe_rate, h.mortgage_2yr, h.mortgage_5yr)), 3) * 0.9;
  const range = maxRate - minRate;
  
  const getX = (index: number) => (index / (mortgage_history.length - 1)) * 100;
  const getY = (rate: number) => 100 - ((rate - minRate) / range) * 100;

  const boePoints = mortgage_history.map((h, i) => `${getX(i)},${getY(h.boe_rate)}`).join(' ');
  const m2yrPoints = mortgage_history.map((h, i) => `${getX(i)},${getY(h.mortgage_2yr)}`).join(' ');
  const m5yrPoints = mortgage_history.map((h, i) => `${getX(i)},${getY(h.mortgage_5yr)}`).join(' ');

  return (
    <div className="bg-linear-bg text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Mortgage Intelligence</h1>
          <p className="text-linear-text-muted text-sm font-medium">Real-time monitoring of BoE Base Rate vs. Retail Mortgage Products (90% LTV).</p>
        </div>
        {economic_indicators.mpc_next_meeting && (
          <div className="flex items-center gap-4 bg-linear-card border border-linear-border p-3 rounded-2xl shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock size={20} />
            </div>
            <div>
              <span className="block text-[9px] font-black text-linear-text-muted uppercase tracking-[0.2em]">Next MPC Meeting</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{economic_indicators.mpc_next_meeting}</span>
                <div className="h-1 w-1 rounded-full bg-linear-border" />
                <span className="text-[10px] font-black text-amber-500 uppercase">{economic_indicators.market_consensus}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <KPICard 
          label="BoE Base Rate" 
          value={`${economic_indicators.boe_base_rate}%`} 
          icon={Landmark} 
          tooltip="Current official Bank of England base interest rate, governing the floor for retail mortgage products."
          methodology="Directly sourced from the BoE Monetary Policy Committee (MPC) latest release."
        />
        <KPICard 
          label="90% LTV (5yr Fixed)" 
          value={`${economic_indicators.mortgage_rates["90_ltv_5yr_fixed"]}%`} 
          icon={Percent} 
          tooltip="Average retail rate for a 5-year fixed mortgage with a 10% deposit."
          methodology="Weighted average of top-tier institutional lenders (Barclays, HSBC, Lloyds)."
        />
        <KPICard 
          label="90% LTV (2yr Fixed)" 
          value={`${economic_indicators.mortgage_rates["90_ltv_2yr_fixed"]}%`} 
          icon={Activity} 
          tooltip="Average retail rate for a 2-year fixed mortgage with a 10% deposit."
          methodology="Market-leading rate for high-liquidity short-term residential debt."
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="text-blue-400" size={24} />
                Institutional Rate Corridor
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">BoE Base</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">5YR Fixed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">2YR Fixed</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full relative mb-8">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(val => (
                  <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border" />
                ))}
                
                {/* Trend Lines */}
                <polyline points={boePoints} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={m5yrPoints} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={m2yrPoints} fill="none" stroke="#fb7185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Dynamic Markers (Last Points) */}
                {mortgage_history.length > 0 && (
                  <>
                    <circle cx="100" cy={getY(mortgage_history[mortgage_history.length-1].boe_rate)} r="1.5" fill="#3b82f6" stroke="#09090b" strokeWidth="0.5" />
                    <circle cx="100" cy={getY(mortgage_history[mortgage_history.length-1].mortgage_5yr)} r="1.5" fill="#34d399" stroke="#09090b" strokeWidth="0.5" />
                    <circle cx="100" cy={getY(mortgage_history[mortgage_history.length-1].mortgage_2yr)} r="1.5" fill="#fb7185" stroke="#09090b" strokeWidth="0.5" />
                  </>
                )}
              </svg>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-linear-border/50">
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">12M Peak</span>
                <div className="text-lg font-bold text-white tracking-tight">5.25%</div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">12M Low</span>
                <div className="text-lg font-bold text-white tracking-tight">3.75%</div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Spread Volatility</span>
                <div className="text-lg font-bold text-retro-green tracking-tight">Low</div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Lender Risk</span>
                <div className="text-lg font-bold text-amber-400 tracking-tight">Stable</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* LTV Arbitrage Matrix */}
          <div className="p-6 border border-linear-border bg-linear-card rounded-2xl shadow-xl">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Percent size={14} className="text-linear-accent" />
              LTV Arbitrage Matrix
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-linear-bg border border-linear-border/50 group hover:border-linear-accent transition-all">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-white">2YR Fixed Delta</span>
                  <span className="block text-[9px] text-linear-text-muted uppercase">Premium over Base</span>
                </div>
                <div className="text-lg font-black text-rose-400">
                  +{(economic_indicators.mortgage_rates["90_ltv_2yr_fixed"] - economic_indicators.boe_base_rate).toFixed(2)}%
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-linear-bg border border-linear-border/50 group hover:border-linear-accent transition-all">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-white">5YR Fixed Delta</span>
                  <span className="block text-[9px] text-linear-text-muted uppercase">Premium over Base</span>
                </div>
                <div className="text-lg font-black text-emerald-400">
                  +{(economic_indicators.mortgage_rates["90_ltv_5yr_fixed"] - economic_indicators.boe_base_rate).toFixed(2)}%
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={12} className="text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inversion Warning</span>
                </div>
                <p className="text-[10px] text-linear-text-muted leading-relaxed italic">
                  5-year rates are currently lower than 2-year rates, indicating institutional consensus on long-term rate reduction.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border border-linear-border bg-linear-card rounded-2xl shadow-xl">
            <h2 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calendar size={14} className="text-linear-accent" />
              Strategic Implications
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-linear-bg border border-linear-border/50">
                <h3 className="text-xs font-bold text-white mb-1">Repayment Elasticity</h3>
                <p className="text-[10px] text-linear-text-muted leading-relaxed font-medium">
                  Every 0.25% cut in retail rates increases the monthly bidding ceiling by approximately £120 per £1M borrowed.
                </p>
              </div>
              <button className="w-full py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg">
                Run Bidding Simulation <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageTracker;
