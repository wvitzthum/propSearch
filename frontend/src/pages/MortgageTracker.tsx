import React, { useState, useMemo } from 'react';
import { useFinancialData } from '../hooks/useFinancialData';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import { extractValue } from '../types/macro';
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
  GanttChart,
  Eye,
  EyeOff
} from 'lucide-react';

interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: string;
  data: number[];
  visible: boolean;
}

const MortgageTracker: React.FC = () => {
  const { macroData, loading } = useFinancialData();
  
  const [monthlyBudget, setMonthlyBudget] = useState(4500);
  const [mortgageTerm, setMortgageTerm] = useState(25);
  const [activeLTV, setActiveLTV] = useState<'90' | '85' | '75' | '60'>('90');
  
  // High-Fidelity Chart State (FE-087)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    boe: true,
    m2yr: true,
    m5yr: true
  });

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

    // Rate Corridor Scaling — extract values from ProvenanceOrValue wrappers
    const boeRates = mortgage_history.map(h => extractValue(h.boe_rate) ?? 0);
    const m2yrRates = mortgage_history.map(h => extractValue(h.mortgage_2yr) ?? 0);
    const m5yrRates = mortgage_history.map(h => extractValue(h.mortgage_5yr) ?? 0);

    const activeRates: number[] = [];
    if (visibleSeries.boe) activeRates.push(...boeRates);
    if (visibleSeries.m2yr) activeRates.push(...m2yrRates);
    if (visibleSeries.m5yr) activeRates.push(...m5yrRates);

    const maxRate = Math.max(...activeRates, 1) * 1.1;
    const minRate = Math.min(...activeRates, 10) * 0.9;
    const range = maxRate - minRate;

    const getX = (index: number) => (index / (mortgage_history.length - 1)) * 100;
    const getY = (rate: number) => 100 - ((rate - minRate) / Math.max(range, 0.1)) * 100;

    // PPI Logic
    const ppiHistory = mortgage_history.map((_, idx) => calculateMaxLoan(m5yrRates[idx], monthlyBudget, mortgageTerm));
    const maxLoanVal = Math.max(...ppiHistory, 1) * 1.05;
    const minLoanVal = Math.min(...ppiHistory, 1000000) * 0.95;
    const loanRange = maxLoanVal - minLoanVal;
    const getLoanY = (loan: number) => 100 - ((loan - minLoanVal) / Math.max(loanRange, 1)) * 100;

    // Stats
    let ppiDelta = 0;
    let buyingPowerStatus = 'Stable';
    if (ppiHistory.length >= 2) {
      const first = ppiHistory[0];
      const last = ppiHistory[ppiHistory.length - 1];
      ppiDelta = ((last - first) / first) * 100;
      buyingPowerStatus = ppiDelta > 2 ? 'Expanding' : ppiDelta < -2 ? 'Contracting' : 'Stable';
    }

    const currentRate = extractValue(mortgageRates?.[`${activeLTV}_ltv_5yr_fixed` as keyof typeof mortgageRates]) ?? 4.5;
    const currentMaxLoan = calculateMaxLoan(currentRate, monthlyBudget, mortgageTerm);
    const sensitivity = calculateMaxLoan(currentRate - 0.25, monthlyBudget, mortgageTerm) - currentMaxLoan;

    // Series Definitions — use pre-extracted arrays
    const series: ChartSeries[] = [
      { id: 'boe', label: 'BoE Base', color: '#3b82f6', visible: visibleSeries.boe, data: boeRates, points: mortgage_history.map((_, i) => `${getX(i)},${getY(boeRates[i])}`).join(' ') },
      { id: 'm5yr', label: '5Y Fixed', color: '#10b981', visible: visibleSeries.m5yr, data: m5yrRates, points: mortgage_history.map((_, i) => `${getX(i)},${getY(m5yrRates[i])}`).join(' ') },
      { id: 'm2yr', label: '2Y Fixed', color: '#f43f5e', visible: visibleSeries.m2yr, data: m2yrRates, points: mortgage_history.map((_, i) => `${getX(i)},${getY(m2yrRates[i])}`).join(' ') },
    ];

    const ppiPoints = ppiHistory.map((l, i) => `${getX(i)},${getLoanY(l)}`).join(' ');

    return {
      maxRate, minRate, range, getX, getY,
      ppiHistory, maxLoanVal, minLoanVal, loanRange, getLoanY,
      ppiDelta, buyingPowerStatus, currentMaxLoan, sensitivity, currentRate,
      series, ppiPoints, boeRates
    };
  }, [macroData, monthlyBudget, mortgageTerm, activeLTV, visibleSeries]);

  const toggleSeries = (id: string) => {
    setVisibleSeries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Syncing Financial Pulse..." />
    </div>
  );

  if (!macroData || !processedData) return null;

  const { mortgage_history = [], economic_indicators } = macroData;
  const mortgageRates = economic_indicators?.mortgage_rates;
  const { 
    maxRate, minRate, range, getX, getY,
    ppiHistory, maxLoanVal, minLoanVal, loanRange, getLoanY,
    ppiDelta, buyingPowerStatus, currentMaxLoan, sensitivity, currentRate,
    series, ppiPoints
  } = processedData;

  const currentHoverData = hoverIndex !== null ? mortgage_history[hoverIndex] : null;
  const currentHoverPPI = hoverIndex !== null ? ppiHistory[hoverIndex] : null;

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-linear-border pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-linear-card border border-linear-border flex items-center justify-center text-linear-accent-blue">
              <Calculator size={18} />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-linear-text-primary">Mortgage Intelligence</h1>
          </div>
          <p className="text-linear-text-muted text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">
            BoE Policy Transmission & Purchasing Power Simulation
          </p>
        </div>

        {/* Global Control Bar */}
        <div className="flex flex-wrap items-center gap-6 p-1.5 bg-linear-card/50 border border-linear-border rounded-2xl shadow-inner backdrop-blur-md">
          <div className="flex flex-col px-3 border-r border-linear-border">
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-[0.1em] mb-1.5 flex items-center gap-1.5">
              <Settings2 size={10} /> Monthly Budget
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-linear-text-primary">£</span>
              <input 
                type="number" 
                value={monthlyBudget} 
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                className="w-20 bg-transparent border-none p-0 text-sm font-bold text-linear-text-primary focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col px-3 border-r border-linear-border">
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-[0.1em] mb-1.5 flex items-center gap-1.5">
              <Clock size={10} /> Loan Term
            </span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={mortgageTerm} 
                onChange={(e) => setMortgageTerm(Number(e.target.value))}
                className="w-10 bg-transparent border-none p-0 text-sm font-bold text-linear-text-primary focus:ring-0 focus:outline-none"
              />
              <span className="text-[10px] font-medium text-linear-text-muted uppercase tracking-wider">Years</span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3">
            {['90', '85', '75', '60'].map(ltv => (
              <button
                key={ltv}
                onClick={() => setActiveLTV(ltv as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${activeLTV === ltv ? 'bg-linear-accent text-linear-text-primary shadow-lg shadow-linear-accent/20 border border-linear-accent/50' : 'text-linear-text-muted hover:text-linear-text-primary hover:bg-linear-bg'}`}
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
          value={`${extractValue(economic_indicators?.boe_base_rate)?.toFixed(2) ?? '—'}%`}
          icon={Landmark}
          tooltip="Current official Bank of England base interest rate."
          methodology="Sourced from MPC latest release."
        />
        <KPICard
          label={`${activeLTV}% LTV (5yr Fixed)`}
          value={`${currentRate}%`}
          icon={Percent}
          className="text-linear-accent-blue"
          tooltip={`Average retail rate for a 5-year fixed mortgage at ${activeLTV}% LTV.`}
          methodology="Market-leading rate for high-liquidity residential debt."
        />
        <KPICard
          label="Next MPC Meeting"
          value={economic_indicators?.mpc_next_meeting || 'TBD'}
          icon={Calendar}
          className="text-retro-amber"
          tooltip="The next scheduled meeting of the Bank of England's Monetary Policy Committee."
          methodology={`Consensus: ${extractValue(economic_indicators?.market_consensus) || 'Unknown'}`}
        />
      </div>

      {/* Main Analysis Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Rate Corridor Chart */}
        <div className="p-6 bg-linear-card border border-linear-border rounded-3xl relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-linear-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp size={16} className="text-linear-accent-blue" />
                  Institutional Rate Corridor
                </h2>
                <p className="text-[10px] text-linear-text-muted font-medium uppercase tracking-widest">12-Month Spread Analysis</p>
              </div>
              
              <div className="flex items-center gap-2 bg-linear-bg/50 p-1 rounded-xl border border-linear-border">
                {series.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => toggleSeries(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${s.visible ? 'bg-linear-accent text-linear-text-primary' : 'text-linear-text-muted hover:text-linear-text-secondary'}`}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{s.label.split(' ')[0]}</span>
                    {s.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-grow h-64 w-full relative mb-10 flex gap-6">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between text-[9px] font-bold text-linear-text-muted/60 uppercase h-full py-0.5 w-8">
                <span className="text-linear-text-muted">{maxRate.toFixed(1)}%</span>
                <span>{(minRate + range * 0.75).toFixed(1)}%</span>
                <span>{(minRate + range * 0.5).toFixed(1)}%</span>
                <span>{(minRate + range * 0.25).toFixed(1)}%</span>
                <span className="text-linear-text-muted">{minRate.toFixed(1)}%</span>
              </div>

              <div className="flex-grow relative h-full group/chart">
                {/* Data Readout Overlay */}
                {hoverIndex !== null && currentHoverData && (
                  <div className="absolute top-0 left-0 right-0 z-20 flex justify-center -translate-y-6">
                    <div className="bg-black/80 backdrop-blur-xl border border-linear-border rounded-lg px-4 py-2 flex items-center gap-6 shadow-2xl">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-linear-text-muted uppercase">Month</span>
                        <span className="text-[10px] font-bold text-white uppercase">{currentHoverData.month}</span>
                      </div>
                      {series.filter(s => s.visible).map(s => {
                        const raw = s.id === 'boe' ? currentHoverData.boe_rate : s.id === 'm5yr' ? currentHoverData.mortgage_5yr : currentHoverData.mortgage_2yr;
                        const val = extractValue(raw) ?? 0;
                        return (
                        <div key={s.id} className="flex flex-col border-l border-linear-border/50 pl-4">
                          <span className="text-[8px] font-bold uppercase" style={{ color: s.color }}>{s.label}</span>
                          <span className="text-[10px] font-bold text-white">{val.toFixed(2)}%</span>
                        </div>
                      )})}
                    </div>
                  </div>
                )}

                <svg 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none" 
                  className="h-full w-full overflow-visible cursor-crosshair"
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map(val => (
                    <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border" />
                  ))}
                  
                  {/* X-Axis Hover Vertical Line */}
                  {hoverIndex !== null && (
                    <line 
                      x1={getX(hoverIndex)} 
                      y1="0" 
                      x2={getX(hoverIndex)} 
                      y2="100" 
                      stroke="#ffffff" 
                      strokeWidth="0.2" 
                      strokeDasharray="2,2" 
                      className="opacity-40"
                    />
                  )}

                  {/* Trend Lines */}
                  {series.map(s => s.visible && (
                    <polyline 
                      key={s.id}
                      points={s.points} 
                      fill="none" 
                      stroke={s.color} 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)] transition-all duration-500"
                    />
                  ))}
                  
                  {/* Invisible Hit Areas */}
                  {mortgage_history.map((_, i) => (
                    <rect
                      key={i}
                      x={getX(i) - 2}
                      y="0"
                      width="4"
                      height="100"
                      fill="transparent"
                      onMouseEnter={() => setHoverIndex(i)}
                    />
                  ))}

                  {/* Highlight Circles on Hover */}
                  {hoverIndex !== null && series.map(s => s.visible && (
                    <circle 
                      key={s.id}
                      cx={getX(hoverIndex)} 
                      cy={getY(s.data[hoverIndex])} 
                      r="1.5" 
                      fill={s.color} 
                      stroke="#ffffff" 
                      strokeWidth="0.5" 
                    />
                  ))}
                </svg>
              </div>
            </div>

            {/* Bottom Legend Readout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-linear-border/50">
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">12M Peak</span>
                <div className="text-xl font-bold text-linear-text-primary tracking-tighter">
                  {Math.max(...(processedData.boeRates ?? [])).toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">12M Low</span>
                <div className="text-xl font-bold text-linear-text-primary tracking-tighter">
                  {Math.min(...(processedData.boeRates ?? [])).toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Volatility</span>
                <div className="text-xl font-bold text-linear-accent-emerald tracking-tighter uppercase">Low</div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Consensus</span>
                <div className="text-xl font-bold text-linear-accent-blue tracking-tighter uppercase">{extractValue(economic_indicators?.market_consensus)?.split(' ')[0] || 'Neutral'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* PPI Purchasing Power Index */}
        <div className="p-6 bg-linear-card border border-linear-border rounded-3xl relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-linear-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                  <GanttChart size={16} className="text-linear-accent-emerald" />
                  Purchasing Power Index (PPI)
                </h2>
                <p className="text-[10px] text-linear-text-muted font-medium uppercase tracking-widest">Estimated Loan Ceiling @ £{monthlyBudget}/MO</p>
              </div>
              
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                 <div className={`text-xs font-bold tracking-tighter flex items-center gap-1.5 ${ppiDelta >= 0 ? 'text-linear-accent-emerald' : 'text-linear-accent-rose'}`}>
                   {ppiDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                   {ppiDelta.toFixed(1)}% 12M Delta
                 </div>
              </div>
            </div>

            <div className="flex-grow h-64 w-full relative mb-10 flex gap-8">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between text-[9px] font-bold text-linear-text-muted/60 uppercase h-full py-0.5 w-12">
                <span className="text-linear-text-muted">£{(maxLoanVal/1000).toFixed(0)}K</span>
                <span>£{((minLoanVal + loanRange * 0.75)/1000).toFixed(0)}K</span>
                <span>£{((minLoanVal + loanRange * 0.5)/1000).toFixed(0)}K</span>
                <span>£{((minLoanVal + loanRange * 0.25)/1000).toFixed(0)}K</span>
                <span className="text-linear-text-muted">£{(minLoanVal/1000).toFixed(0)}K</span>
              </div>

              <div className="flex-grow relative h-full group/chart">
                {/* Data Readout Overlay */}
                {hoverIndex !== null && currentHoverPPI && (
                  <div className="absolute top-0 left-0 right-0 z-20 flex justify-center -translate-y-6">
                    <div className="bg-black/80 backdrop-blur-xl border border-linear-border rounded-lg px-4 py-2 flex items-center gap-6 shadow-2xl">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-linear-text-muted uppercase">Month</span>
                        <span className="text-[10px] font-bold text-white uppercase">{mortgage_history[hoverIndex].month}</span>
                      </div>
                      <div className="flex flex-col border-l border-linear-border/50 pl-4">
                        <span className="text-[8px] font-bold uppercase text-linear-accent-emerald">Buying Power</span>
                        <span className="text-[10px] font-bold text-white">£{Math.round(currentHoverPPI).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <svg 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none" 
                  className="h-full w-full overflow-visible cursor-crosshair"
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {[0, 25, 50, 75, 100].map(val => (
                    <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="currentColor" strokeWidth="0.1" className="text-linear-border" />
                  ))}

                  {/* X-Axis Hover Vertical Line */}
                  {hoverIndex !== null && (
                    <line 
                      x1={getX(hoverIndex)} 
                      y1="0" 
                      x2={getX(hoverIndex)} 
                      y2="100" 
                      stroke="#ffffff" 
                      strokeWidth="0.2" 
                      strokeDasharray="2,2" 
                      className="opacity-40"
                    />
                  )}

                  <polyline points={ppiPoints} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
                  
                  {/* Invisible Hit Areas */}
                  {ppiHistory.map((_, i) => (
                    <rect
                      key={i}
                      x={getX(i) - 2}
                      y="0"
                      width="4"
                      height="100"
                      fill="transparent"
                      onMouseEnter={() => setHoverIndex(i)}
                    />
                  ))}

                  {hoverIndex !== null && (
                    <circle 
                      cx={getX(hoverIndex)} 
                      cy={getLoanY(ppiHistory[hoverIndex])} 
                      r="2" 
                      fill="#10b981" 
                      stroke="#ffffff" 
                      strokeWidth="0.5" 
                    />
                  )}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-linear-border/50">
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Max Principal</span>
                <div className="text-xl font-bold text-linear-text-primary tracking-tighter">
                  £{Math.round(currentMaxLoan/1000).toLocaleString()}K
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Asset Target</span>
                <div className="text-xl font-bold text-linear-text-primary tracking-tighter">
                  £{Math.round((currentMaxLoan/0.9)/1000).toLocaleString()}K
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Sensitivity</span>
                <div className="text-xl font-bold text-linear-text-primary tracking-tighter">
                  £{Math.round(sensitivity).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Status</span>
                <div className={`text-xl font-bold tracking-tighter uppercase ${buyingPowerStatus === 'Expanding' ? 'text-linear-accent-emerald' : 'text-linear-accent-blue'}`}>
                  {buyingPowerStatus}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LTV Arbitrage Matrix */}
        <div className="lg:col-span-2 p-6 bg-linear-card border border-linear-border rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-linear-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <Percent size={16} className="text-linear-accent-blue" />
                LTV Arbitrage Matrix (Institutional Benchmarks)
              </h2>
              <p className="text-[10px] text-linear-text-muted font-medium uppercase tracking-widest">Cost of Capital across multiple LTV bands</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">
              Sync: <span className="text-linear-accent-emerald">Active</span>
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
                  activeLTV === band.ltv ? 'bg-linear-accent/10 border-linear-accent-blue ring-1 ring-linear-accent-blue shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 'bg-linear-bg border-linear-border hover:border-linear-accent/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeLTV === band.ltv ? 'text-linear-accent-blue' : 'text-linear-text-muted'}`}>
                      {band.ltv}% LTV
                    </span>
                    <span className="block text-sm font-bold text-linear-text-primary">{band.label}</span>
                  </div>
                  {activeLTV === band.ltv && <div className="h-6 w-6 rounded-full bg-linear-accent-blue flex items-center justify-center text-white"><ChevronRight size={14} /></div>}
                </div>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-linear-text-primary tracking-tighter">
                    {band.rate != null ? `${extractValue(band.rate)?.toFixed(2) ?? '—'}%` : '—%'}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-[0.15em]">Spread to Base</span>
                    <span className="text-[10px] font-bold text-linear-accent-blue">+{((extractValue(band.rate) ?? 0) - (extractValue(economic_indicators?.boe_base_rate) ?? 0)).toFixed(2)}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-linear-accent-blue">
                <Info size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-linear-text-primary uppercase tracking-widest">Arbitrage Opportunity Identified</h3>
                <p className="text-[10px] text-linear-text-muted leading-relaxed max-w-xl font-medium">
                  Increasing equity from 10% to 25% (75% LTV) reduces carrying cost by
                  <span className="text-linear-text-primary font-bold mx-1">£{Math.round(calculateMaxLoan(extractValue(mortgageRates?.["90_ltv_5yr_fixed"]) ?? 4.5, monthlyBudget, mortgageTerm) / 0.9 * 0.005 / 12).toLocaleString()}</span>
                  per month relative to debt volume.
                </p>
              </div>
            </div>
            <button className="px-6 py-2.5 bg-linear-accent text-linear-text-primary border border-linear-border rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-linear-accent/20 hover:border-linear-accent-blue transition-all">
              Execute Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageTracker;
