import React from 'react';
import { useFinancialData } from '../hooks/useFinancialData';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import { 
  TrendingUp, 
  Activity, 
  Landmark, 
  Percent, 
  Calendar, 
  ArrowRight, 
  Info, 
  Clock, 
  TrendingDown 
} from 'lucide-react';

const MortgageTracker: React.FC = () => {
  const { macroData, loading } = useFinancialData();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Syncing Financial Pulse..." />
    </div>
  );

  if (!macroData) return null;

  const { economic_indicators, mortgage_history = [] } = macroData;
  const mortgageRates = economic_indicators?.mortgage_rates;

  // Simple SVG Sparkline Logic
  const maxRate = mortgage_history.length > 0 ? Math.max(...mortgage_history.map(h => Math.max(h.boe_rate, h.mortgage_2yr, h.mortgage_5yr)), 6) * 1.1 : 6;
  const minRate = mortgage_history.length > 0 ? Math.min(...mortgage_history.map(h => Math.min(h.boe_rate, h.mortgage_2yr, h.mortgage_5yr)), 3) * 0.9 : 3;
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
          value={`${economic_indicators?.boe_base_rate || '—'}%`} 
          icon={Landmark} 
          tooltip="Current official Bank of England base interest rate, governing the floor for retail mortgage products."
          methodology="Directly sourced from the BoE Monetary Policy Committee (MPC) latest release."
        />
        <KPICard 
          label="90% LTV (5yr Fixed)" 
          value={`${mortgageRates?.["90_ltv_5yr_fixed"] || '—'}%`} 
          icon={Percent} 
          tooltip="Average retail rate for a 5-year fixed mortgage with a 10% deposit."
          methodology="Weighted average of top-tier institutional lenders (Barclays, HSBC, Lloyds)."
        />
        <KPICard 
          label="90% LTV (2yr Fixed)" 
          value={`${mortgageRates?.["90_ltv_2yr_fixed"] || '—'}%`} 
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

            <div className="h-64 w-full relative mb-8 flex gap-4">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between text-[8px] font-bold text-linear-text-muted uppercase h-full py-0.5 w-8">
                <span>{maxRate.toFixed(1)}%</span>
                <span>{(minRate + range * 0.75).toFixed(1)}%</span>
                <span>{(minRate + range * 0.5).toFixed(1)}%</span>
                <span>{(minRate + range * 0.25).toFixed(1)}%</span>
                <span>{minRate.toFixed(1)}%</span>
              </div>

              <div className="flex-grow relative h-full">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map(val => (
                    <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border" />
                  ))}
                  
                  {/* Trend Lines */}
                  <polyline points={boePoints} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={m5yrPoints} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={m2yrPoints} fill="none" stroke="#fb7185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Invisible Hover Zones for Tooltips */}
                  {mortgage_history.map((h, i) => (
                    <rect
                      key={i}
                      x={getX(i) - 2}
                      y="0"
                      width="4"
                      height="100"
                      fill="transparent"
                      className="cursor-help"
                    >
                      <title>{`Month: ${h.month}\nBoE: ${h.boe_rate}%\n5YR: ${h.mortgage_5yr}%\n2YR: ${h.mortgage_2yr}%`}</title>
                    </rect>
                  ))}

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
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-linear-border/50">
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">12M Peak (BoE)</span>
                <div className="text-lg font-bold text-white tracking-tight">
                  {mortgage_history.length > 0 ? Math.max(...mortgage_history.map(h => h.boe_rate)).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">12M Low (BoE)</span>
                <div className="text-lg font-bold text-white tracking-tight">
                  {mortgage_history.length > 0 ? Math.min(...mortgage_history.map(h => h.boe_rate)).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Spread Volatility</span>
                <div className="text-lg font-bold text-retro-green tracking-tight">
                  {(() => {
                    if (mortgage_history.length < 2) return 'Stable';
                    const spreads = mortgage_history.map(h => h.mortgage_5yr - h.boe_rate);
                    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
                    const variance = spreads.reduce((a, b) => a + Math.pow(b - avgSpread, 2), 0) / spreads.length;
                    return variance < 0.05 ? 'Low' : variance < 0.2 ? 'Moderate' : 'High';
                  })()}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Lender Risk</span>
                <div className="text-lg font-bold text-amber-400 tracking-tight">Stable</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-8 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-retro-green" size={24} />
                Purchasing Power Index (PPI)
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-retro-green" />
                  <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Max Loan (5YR Rate)</span>
                </div>
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Budget: £3,000 / MO</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full relative mb-8 flex gap-4">
              {(() => {
                const monthlyBudget = 3000;
                const calculateMaxLoan = (rate: number) => {
                  const monthlyRate = (rate / 100) / 12;
                  const n = 25 * 12;
                  return monthlyBudget / ((monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
                };

                const ppiHistory = mortgage_history.map(h => calculateMaxLoan(h.mortgage_5yr));

                const maxLoanVal = Math.max(...ppiHistory, 600000) * 1.05;
                const minLoanVal = Math.min(...ppiHistory, 400000) * 0.95;
                const loanRange = maxLoanVal - minLoanVal;

                const getLoanY = (loan: number) => 100 - ((loan - minLoanVal) / loanRange) * 100;
                const ppiPoints = ppiHistory.map((l, i) => `${getX(i)},${getLoanY(l)}`).join(' ');

                // Calculate Delta
                let ppiDelta = '0.0%';
                let buyingPowerStatus = 'Neutral';
                if (ppiHistory.length >= 2) {
                  const first = ppiHistory[0];
                  const last = ppiHistory[ppiHistory.length - 1];
                  const delta = ((last - first) / first) * 100;
                  ppiDelta = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
                  buyingPowerStatus = delta > 2 ? 'Expanding' : delta < -2 ? 'Contracting' : 'Stable';
                }

                return (
                  <>
                    {/* Y-Axis Labels */}
                    <div className="flex flex-col justify-between text-[8px] font-bold text-linear-text-muted uppercase h-full py-0.5 w-10">
                      <span>£{(maxLoanVal/1000).toFixed(0)}K</span>
                      <span>£{((minLoanVal + loanRange * 0.75)/1000).toFixed(0)}K</span>
                      <span>£{((minLoanVal + loanRange * 0.5)/1000).toFixed(0)}K</span>
                      <span>£{((minLoanVal + loanRange * 0.25)/1000).toFixed(0)}K</span>
                      <span>£{(minLoanVal/1000).toFixed(0)}K</span>
                    </div>

                    <div className="flex-grow relative h-full">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                        {[0, 25, 50, 75, 100].map(val => (
                          <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border" />
                        ))}
                        <polyline points={ppiPoints} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Hover Zones */}
                        {ppiHistory.map((l, i) => (
                          <rect
                            key={i}
                            x={getX(i) - 2}
                            y="0"
                            width="4"
                            height="100"
                            fill="transparent"
                            className="cursor-help"
                          >
                            <title>{`Month: ${mortgage_history[i].month}\nMax Loan: £${Math.round(l).toLocaleString()}\nRate: ${mortgage_history[i].mortgage_5yr}%`}</title>
                          </rect>
                        ))}

                        {ppiHistory.length > 0 && (
                          <circle cx="100" cy={getLoanY(ppiHistory[ppiHistory.length-1])} r="2" fill="#22c55e" stroke="#09090b" strokeWidth="0.5" />
                        )}
                      </svg>
                    </div>
                  </>
                );
              })()}
            </div>

            {(() => {
              // Move the footer logic here to have access to calculateMaxLoan if needed, 
              // or just keep it separate if we already calculated everything.
              // Actually, I need to recalculate or share variables.
              // For simplicity in this replace, I'll repeat the calculation or use the existing ones.
              
              const monthlyBudget = 3000;
              const calculateMaxLoan = (rate: number) => {
                const monthlyRate = (rate / 100) / 12;
                const n = 25 * 12;
                return monthlyBudget / ((monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
              };
              const ppiHistory = mortgage_history.map(h => calculateMaxLoan(h.mortgage_5yr));
              let ppiDelta = '0.0%';
              let buyingPowerStatus = 'Neutral';
              if (ppiHistory.length >= 2) {
                const first = ppiHistory[0];
                const last = ppiHistory[ppiHistory.length - 1];
                const delta = ((last - first) / first) * 100;
                ppiDelta = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
                buyingPowerStatus = delta > 2 ? 'Expanding' : delta < -2 ? 'Contracting' : 'Stable';
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-linear-border/50 mt-8">
                  <div className="space-y-1">
                    <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Current Max Loan</span>
                    <div className="text-lg font-bold text-white tracking-tight">
                      £{Math.round(calculateMaxLoan(mortgageRates?.["90_ltv_5yr_fixed"] || 4.5)).toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">12M PPI Delta</span>
                    <div className={`text-lg font-bold tracking-tight ${ppiDelta.startsWith('+') ? 'text-retro-green' : 'text-rose-400'}`}>
                      {ppiDelta}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Rate Sensitivity</span>
                    <div className="text-lg font-bold text-white tracking-tight">
                      £{Math.round(calculateMaxLoan((mortgageRates?.["90_ltv_5yr_fixed"] || 4.5) - 0.25) - calculateMaxLoan(mortgageRates?.["90_ltv_5yr_fixed"] || 4.5)).toLocaleString()} / 25bps
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Buying Power</span>
                    <div className={`text-lg font-bold tracking-tight ${buyingPowerStatus === 'Expanding' ? 'text-blue-400' : 'text-amber-400'}`}>
                      {buyingPowerStatus}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="space-y-6">
          {/* LTV Arbitrage Matrix */}
          <div className="p-6 border border-linear-border bg-linear-card rounded-2xl shadow-xl">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Percent size={14} className="text-linear-accent" />
              LTV Arbitrage Matrix (5YR Fixed)
            </h2>
            <div className="space-y-2">
              {[
                { label: '90% LTV', rate: mortgageRates?.["90_ltv_5yr_fixed"] },
                { label: '85% LTV', rate: mortgageRates?.["85_ltv_5yr_fixed"] },
                { label: '75% LTV', rate: mortgageRates?.["75_ltv_5yr_fixed"] },
                { label: '60% LTV', rate: mortgageRates?.["60_ltv_5yr_fixed"] },
              ].map((band) => (
                <div key={band.label} className="flex items-center justify-between p-3 rounded-xl bg-linear-bg/50 border border-linear-border/30 group hover:border-linear-accent transition-all">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white group-hover:text-linear-accent transition-colors">{band.label}</span>
                    <span className="block text-[8px] text-linear-text-muted uppercase">Institutional Benchmark</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-black text-white">{band.rate || '—'}%</div>
                      <div className="text-[8px] text-linear-text-muted font-bold">
                        +{((band.rate || 0) - (economic_indicators?.boe_base_rate || 0)).toFixed(2)}% vs Base
                      </div>
                    </div>
                    {band.label === '60% LTV' && (
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <TrendingDown size={14} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="p-4 mt-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={12} className="text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Arbitrage Opportunity</span>
                </div>
                <p className="text-[10px] text-linear-text-muted leading-relaxed italic">
                  Increasing equity from 10% to 25% (75% LTV) yields a 
                  <span className="text-white font-bold mx-1">
                    {((mortgageRates?.["90_ltv_5yr_fixed"] || 0) - (mortgageRates?.["75_ltv_5yr_fixed"] || 0)).toFixed(2)}%
                  </span> 
                  reduction in retail debt cost.
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
