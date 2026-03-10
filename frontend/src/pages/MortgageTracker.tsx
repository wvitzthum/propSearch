import React, { useState, useMemo } from 'react';
import { useFinancialData } from '../hooks/useFinancialData';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import Tooltip from '../components/Tooltip';
import { 
  TrendingUp, 
  Landmark, 
  Percent, 
  Calendar, 
  Info, 
  Clock, 
  TrendingDown,
  Settings2,
  ChevronRight,
  Calculator,
  GanttChart
} from 'lucide-react';

const MortgageTracker: React.FC = () => {
  const { macroData, loading } = useFinancialData();
  
  // Local state for interactive parameters (FE-071)
  const [monthlyBudget, setMonthlyBudget] = useState(4500);
  const [mortgageTerm, setMortgageTerm] = useState(25);
  const [activeLTV, setActiveLTV] = useState<'90' | '85' | '75' | '60'>('90');

  const calculateMaxLoan = (rate: number, budget: number, term: number) => {
    const monthlyRate = (rate / 100) / 12;
    const n = term * 12;
    if (monthlyRate === 0) return budget * n;
    return budget / ((monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
  };

  const processedData = useMemo(() => {
    if (!macroData) return null;
    const { economic_indicators, mortgage_history = [] } = macroData;
    const mortgageRates = economic_indicators?.mortgage_rates;

    // Chart scaling
    const allRates = mortgage_history.flatMap(h => [h.boe_rate, h.mortgage_2yr, h.mortgage_5yr]);
    const maxRate = Math.max(...allRates, 6) * 1.1;
    const minRate = Math.min(...allRates, 3) * 0.9;
    const range = maxRate - minRate;

    const getX = (index: number) => (index / (mortgage_history.length - 1)) * 100;
    const getY = (rate: number) => 100 - ((rate - minRate) / range) * 100;

    // PPI Logic
    const ppiHistory = mortgage_history.map(h => calculateMaxLoan(h.mortgage_5yr, monthlyBudget, mortgageTerm));
    const maxLoanVal = Math.max(...ppiHistory, 600000) * 1.05;
    const minLoanVal = Math.min(...ppiHistory, 400000) * 0.95;
    const loanRange = maxLoanVal - minLoanVal;
    const getLoanY = (loan: number) => 100 - ((loan - minLoanVal) / loanRange) * 100;

    // Stats calculations (FE-071)
    let ppiDelta = 0;
    let buyingPowerStatus = 'Neutral';
    if (ppiHistory.length >= 2) {
      const first = ppiHistory[0];
      const last = ppiHistory[ppiHistory.length - 1];
      ppiDelta = ((last - first) / first) * 100;
      buyingPowerStatus = ppiDelta > 2 ? 'Expanding' : ppiDelta < -2 ? 'Contracting' : 'Stable';
    }

    const currentRate = mortgageRates?.[`${activeLTV}_ltv_5yr_fixed` as keyof typeof mortgageRates] as number || 4.5;
    const currentMaxLoan = calculateMaxLoan(currentRate, monthlyBudget, mortgageTerm);
    const sensitivity = calculateMaxLoan(currentRate - 0.25, monthlyBudget, mortgageTerm) - currentMaxLoan;

    return {
      maxRate, minRate, range, getX, getY,
      ppiHistory, maxLoanVal, minLoanVal, loanRange, getLoanY,
      ppiDelta, buyingPowerStatus, currentMaxLoan, sensitivity, currentRate
    };
  }, [macroData, monthlyBudget, mortgageTerm, activeLTV]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Syncing Financial Pulse..." />
    </div>
  );

  if (!macroData || !processedData) return null;

  const { economic_indicators, mortgage_history = [] } = macroData;
  const mortgageRates = economic_indicators?.mortgage_rates;
  const { 
    maxRate, minRate, range, getX, getY,
    ppiHistory, maxLoanVal, minLoanVal, loanRange, getLoanY,
    ppiDelta, buyingPowerStatus, currentMaxLoan, sensitivity, currentRate
  } = processedData;

  const boePoints = mortgage_history.map((h, i) => `${getX(i)},${getY(h.boe_rate)}`).join(' ');
  const m2yrPoints = mortgage_history.map((h, i) => `${getX(i)},${getY(h.mortgage_2yr)}`).join(' ');
  const m5yrPoints = mortgage_history.map((h, i) => `${getX(i)},${getY(h.mortgage_5yr)}`).join(' ');
  const ppiPoints = ppiHistory.map((l, i) => `${getX(i)},${getLoanY(l)}`).join(' ');

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Header with Settings (Linear Style) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-linear-border pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-linear-card border border-linear-border flex items-center justify-center text-linear-accent">
              <Calculator size={18} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">Mortgage Intelligence</h1>
          </div>
          <p className="text-linear-text-muted text-sm font-bold uppercase tracking-widest opacity-80">
            BoE Policy Transmission & Purchasing Power Simulation
          </p>
        </div>

        {/* Global Control Bar */}
        <div className="flex flex-wrap items-center gap-6 p-1.5 bg-linear-card/50 border border-linear-border rounded-2xl shadow-inner">
          <div className="flex flex-col px-3 border-r border-linear-border">
            <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Settings2 size={10} /> Monthly Budget
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">£</span>
              <input 
                type="number" 
                value={monthlyBudget} 
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                className="w-20 bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col px-3 border-r border-linear-border">
            <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Clock size={10} /> Loan Term
            </span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={mortgageTerm} 
                onChange={(e) => setMortgageTerm(Number(e.target.value))}
                className="w-10 bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-linear-text-muted uppercase">Years</span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3">
            {['90', '85', '75', '60'].map(ltv => (
              <button
                key={ltv}
                onClick={() => setActiveLTV(ltv as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeLTV === ltv ? 'bg-linear-accent text-white shadow-lg shadow-linear-accent/20 border border-linear-accent/50' : 'text-linear-text-muted hover:text-white hover:bg-linear-bg'}`}
              >
                {ltv}% LTV
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          label="BoE Base Rate" 
          value={`${economic_indicators?.boe_base_rate || '—'}%`} 
          icon={Landmark} 
          tooltip="Current official Bank of England base interest rate."
          methodology="Sourced from MPC latest release."
        />
        <KPICard 
          label={`${activeLTV}% LTV (5yr Fixed)`} 
          value={`${currentRate}%`} 
          icon={Percent} 
          className="text-linear-accent"
          tooltip={`Average retail rate for a 5-year fixed mortgage at ${activeLTV}% LTV.`}
          methodology="Market-leading rate for high-liquidity residential debt."
        />
        <KPICard 
          label="Next MPC Meeting" 
          value={economic_indicators?.mpc_next_meeting || 'TBD'} 
          icon={Calendar} 
          className="text-amber-500"
          tooltip="The next scheduled meeting of the Bank of England's Monetary Policy Committee."
          methodology={`Consensus: ${economic_indicators?.market_consensus || 'Unknown'}`}
        />
      </div>

      {/* Main Analysis Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Rate Corridor Chart */}
        <div className="p-8 bg-linear-card border border-linear-border rounded-3xl relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  Institutional Rate Corridor
                </h2>
                <p className="text-[10px] text-linear-text-muted font-bold uppercase tracking-wider">12-Month Spread Analysis</p>
              </div>
              
              <div className="flex items-center gap-4 bg-linear-bg/50 px-4 py-2 rounded-xl border border-linear-border">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Base</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">5Y-Fix</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
                  <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">2Y-Fix</span>
                </div>
              </div>
            </div>

            <div className="flex-grow h-64 w-full relative mb-10 flex gap-6">
              {/* Y-Axis Labels (FE-072) */}
              <div className="flex flex-col justify-between text-[8px] font-black text-linear-text-muted uppercase h-full py-0.5 w-8">
                <span>{maxRate.toFixed(1)}%</span>
                <span className="opacity-40">{(minRate + range * 0.75).toFixed(1)}%</span>
                <span className="opacity-40">{(minRate + range * 0.5).toFixed(1)}%</span>
                <span className="opacity-40">{(minRate + range * 0.25).toFixed(1)}%</span>
                <span>{minRate.toFixed(1)}%</span>
              </div>

              <div className="flex-grow relative h-full">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                  <defs>
                    <linearGradient id="boeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines (FE-072) */}
                  {[0, 25, 50, 75, 100].map(val => (
                    <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border/50" />
                  ))}
                  
                  {/* Trend Lines (FE-079) */}
                  <polyline points={boePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={m5yrPoints} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={m2yrPoints} fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Interactive Hover Areas (FE-072) */}
                  {mortgage_history.map((h, i) => (
                    <Tooltip 
                      key={i} 
                      content={`Month: ${h.month}\nBoE: ${h.boe_rate.toFixed(2)}%\n5YR: ${h.mortgage_5yr.toFixed(2)}%\n2YR: ${h.mortgage_2yr.toFixed(2)}%`}
                    >
                      <rect
                        x={getX(i) - 2}
                        y="0"
                        width="4"
                        height="100"
                        fill="transparent"
                        className="cursor-crosshair hover:fill-white/[0.03] transition-colors"
                      />
                    </Tooltip>
                  ))}

                  {/* Dynamic Markers */}
                  {mortgage_history.length > 0 && (
                    <g className="animate-in fade-in zoom-in duration-1000">
                      <circle cx="100" cy={getY(mortgage_history[mortgage_history.length-1].boe_rate)} r="2" fill="#3b82f6" stroke="#09090b" strokeWidth="1" />
                      <circle cx="100" cy={getY(mortgage_history[mortgage_history.length-1].mortgage_5yr)} r="2" fill="#34d399" stroke="#09090b" strokeWidth="1" />
                      <circle cx="100" cy={getY(mortgage_history[mortgage_history.length-1].mortgage_2yr)} r="2" fill="#fb7185" stroke="#09090b" strokeWidth="1" />
                    </g>
                  )}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-linear-border/50">
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">12M Peak</span>
                <div className="text-lg font-black text-white tracking-tighter">
                  {Math.max(...mortgage_history.map(h => h.boe_rate)).toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">12M Low</span>
                <div className="text-lg font-black text-white tracking-tighter">
                  {Math.min(...mortgage_history.map(h => h.boe_rate)).toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">Volatility</span>
                <div className="text-lg font-black text-retro-green tracking-tighter">LOW</div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">Consensus</span>
                <div className="text-lg font-black text-blue-400 tracking-tighter uppercase">{economic_indicators?.market_consensus?.split(' ')[0] || 'NEUTRAL'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* PPI Purchasing Power Index */}
        <div className="p-8 bg-linear-card border border-linear-border rounded-3xl relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <GanttChart size={16} className="text-retro-green" />
                  Purchasing Power Index (PPI)
                </h2>
                <p className="text-[10px] text-linear-text-muted font-bold uppercase tracking-wider">Estimated Loan Ceiling @ £{monthlyBudget}/MO</p>
              </div>
              
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                 <div className={`text-xs font-black tracking-tighter flex items-center gap-1.5 ${ppiDelta >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
                   {ppiDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                   {ppiDelta.toFixed(1)}% 12M Delta
                 </div>
              </div>
            </div>

            <div className="flex-grow h-64 w-full relative mb-10 flex gap-8">
              {/* Y-Axis Labels (FE-072) */}
              <div className="flex flex-col justify-between text-[8px] font-black text-linear-text-muted uppercase h-full py-0.5 w-12">
                <span>£{(maxLoanVal/1000).toFixed(0)}K</span>
                <span className="opacity-40">£{((minLoanVal + loanRange * 0.75)/1000).toFixed(0)}K</span>
                <span className="opacity-40">£{((minLoanVal + loanRange * 0.5)/1000).toFixed(0)}K</span>
                <span className="opacity-40">£{((minLoanVal + loanRange * 0.25)/1000).toFixed(0)}K</span>
                <span>£{(minLoanVal/1000).toFixed(0)}K</span>
              </div>

              <div className="flex-grow relative h-full">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                  {[0, 25, 50, 75, 100].map(val => (
                    <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border/50" />
                  ))}
                  <polyline points={ppiPoints} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Hover Areas */}
                  {ppiHistory.map((l, i) => (
                    <Tooltip 
                      key={i} 
                      content={`Month: ${mortgage_history[i].month}\nMax Loan: £${Math.round(l).toLocaleString()}\nRate: ${mortgage_history[i].mortgage_5yr.toFixed(2)}%`}
                    >
                      <rect
                        x={getX(i) - 2}
                        y="0"
                        width="4"
                        height="100"
                        fill="transparent"
                        className="cursor-crosshair hover:fill-white/[0.03] transition-colors"
                      />
                    </Tooltip>
                  ))}

                  {ppiHistory.length > 0 && (
                    <circle cx="100" cy={getLoanY(ppiHistory[ppiHistory.length-1])} r="3" fill="#22c55e" stroke="#09090b" strokeWidth="1" />
                  )}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-linear-border/50">
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">Max Principal</span>
                <div className="text-lg font-black text-white tracking-tighter">
                  £{Math.round(currentMaxLoan/1000).toLocaleString()}K
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">Asset Target</span>
                <div className="text-lg font-black text-white tracking-tighter">
                  £{Math.round((currentMaxLoan/0.9)/1000).toLocaleString()}K
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">Sensitivity</span>
                <div className="text-lg font-black text-white tracking-tighter">
                  £{Math.round(sensitivity).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest opacity-60">Status</span>
                <div className={`text-lg font-black tracking-tighter uppercase ${buyingPowerStatus === 'Expanding' ? 'text-retro-green' : 'text-blue-400'}`}>
                  {buyingPowerStatus}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LTV Arbitrage Matrix (FE-073) */}
        <div className="lg:col-span-2 p-8 bg-linear-card border border-linear-border rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Percent size={16} className="text-linear-accent" />
                LTV Arbitrage Matrix (Institutional Benchmarks)
              </h2>
              <p className="text-[10px] text-linear-text-muted font-bold uppercase tracking-wider">Cost of Capital across multiple LTV bands</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-linear-text-muted uppercase tracking-widest">
              Last Synced: <span className="text-white">TODAY</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { ltv: '90', label: 'Entry Gate', rate: mortgageRates?.["90_ltv_5yr_fixed"] },
              { ltv: '85', label: 'Mid-Tier', rate: mortgageRates?.["85_ltv_5yr_fixed"] },
              { ltv: '75', label: 'Core Asset', rate: mortgageRates?.["75_ltv_5yr_fixed"] },
              { ltv: '60', label: 'Ultra-Prime', rate: mortgageRates?.["60_ltv_5yr_fixed"] },
            ].map((band) => (
              <button 
                key={band.ltv} 
                onClick={() => setActiveLTV(band.ltv as any)}
                className={`p-6 rounded-2xl border transition-all text-left flex flex-col justify-between h-40 group ${
                  activeLTV === band.ltv ? 'bg-linear-accent/10 border-linear-accent ring-1 ring-linear-accent shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 'bg-linear-bg border-linear-border hover:border-linear-accent/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${activeLTV === band.ltv ? 'text-linear-accent' : 'text-linear-text-muted'}`}>
                      {band.ltv}% LTV
                    </span>
                    <span className="block text-sm font-black text-white">{band.label}</span>
                  </div>
                  {activeLTV === band.ltv && <div className="h-6 w-6 rounded-full bg-linear-accent flex items-center justify-center text-white"><ChevronRight size={14} /></div>}
                </div>
                
                <div className="space-y-1">
                  <div className="text-3xl font-black text-white tracking-tighter">
                    {band.rate || '—'}%
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-[0.2em]">Spread to Base</span>
                    <span className="text-[9px] font-black text-blue-400">+{((band.rate || 0) - (economic_indicators?.boe_base_rate || 0)).toFixed(2)}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Info size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Arbitrage Opportunity Identified</h3>
                <p className="text-[10px] text-linear-text-muted leading-relaxed max-w-xl font-medium">
                  Increasing equity from 10% to 25% (75% LTV) reduces carrying cost by 
                  <span className="text-white font-bold mx-1">£{Math.round(calculateMaxLoan(mortgageRates?.["90_ltv_5yr_fixed"] || 4.5, monthlyBudget, mortgageTerm) / 0.9 * 0.005 / 12).toLocaleString()}</span> 
                  per month relative to debt volume.
                </p>
              </div>
            </div>
            <button className="px-6 py-2.5 bg-linear-accent text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-linear-accent/20 hover:brightness-110 transition-all">
              Execute Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageTracker;
