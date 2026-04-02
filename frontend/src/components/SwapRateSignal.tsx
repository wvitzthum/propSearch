import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';

const SwapRateSignal: React.FC = () => {
  const { data } = useMacroData();

  // FE-182: swap_rates are now normalized to plain numbers in useMacroData
  const swap = data?.swap_rates ?? { gbp_2yr: 4.10, gbp_5yr: 3.95, trend_2yr: 'holding' as const, trend_5yr: 'holding' as const, history_2yr: [], history_5yr: [] };
  const mortgageHistory = data?.mortgage_history || [];

  // 2yr rate from mortgage history
  const recent2yr = extractValue(mortgageHistory[mortgageHistory.length - 1]?.mortgage_2yr) ?? 4.45;
  const prev2yr = extractValue(mortgageHistory[mortgageHistory.length - 2]?.mortgage_2yr) ?? recent2yr;

  // 5yr rate from mortgage history
  const recent5yr = extractValue(mortgageHistory[mortgageHistory.length - 1]?.mortgage_5yr) ?? 4.10;
  const prev5yr = extractValue(mortgageHistory[mortgageHistory.length - 2]?.mortgage_5yr) ?? recent5yr;

  // Current mortgage rates for implied fixed rate
  const mortgage5yr90 = extractValue(data?.economic_indicators?.mortgage_rates?.["90_ltv_5yr_fixed"]) ?? 4.55;

  // Direction based on swap history (or provided trend)
  const trend2yr = swap.trend_2yr ?? (recent2yr > prev2yr ? 'rising' : recent2yr < prev2yr ? 'falling' : 'holding');
  const trend5yr = swap.trend_5yr ?? (recent5yr > prev5yr ? 'rising' : recent5yr < prev5yr ? 'falling' : 'holding');

  // Sparkline data from swap_rates history if available, else mortgage_history fallback
  const sparkline2yr = useMemo(() => {
    if (swap.history_2yr && swap.history_2yr.length >= 2) {
      return swap.history_2yr.slice(-6).map((h) => h.rate);
    }
    return mortgageHistory.slice(-6).map((h) => extractValue(h.mortgage_2yr) ?? 4.45);
  }, [swap.history_2yr, mortgageHistory]);

  const sparkline5yr = useMemo(() => {
    if (swap.history_5yr && swap.history_5yr.length >= 2) {
      return swap.history_5yr.slice(-6).map((h) => h.rate);
    }
    return mortgageHistory.slice(-6).map((h) => extractValue(h.mortgage_5yr) ?? 4.10);
  }, [swap.history_5yr, mortgageHistory]);

  const trendColor = (t: string) => t === 'rising' ? '#ef4444' : t === 'falling' ? '#22c55e' : '#a1a1aa';
  const TrendIcon = (t: string) => t === 'rising' ? TrendingUp : t === 'falling' ? TrendingDown : Minus;

  // FE-182: Implied fixed rate — values are now plain numbers, no NaN possible
  const implied5yrFixed = useMemo(() => {
    const swap5yr = isNaN(swap.gbp_5yr) ? recent5yr : swap.gbp_5yr;
    return swap5yr + 0.5; // approx spread
  }, [swap.gbp_5yr, recent5yr]);

  const renderSparkline = (points: number[], color: string) => {
    // QA-185 Bug 2: filter NaN before computing range to prevent invalid SVG coords
    const valid = points.filter((p) => !isNaN(p) && isFinite(p));
    if (valid.length < 2) return null;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 0.1;
    const w = 60, h = 20;
    const coords = valid.map((p, i) => {
      const x = (i / (valid.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline
          points={coords}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Swap Rate Signal</h3>
          <span className="ml-auto text-[9px] text-linear-text-muted font-mono">Leading mortgage indicator</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2yr and 5yr Swap */}
        <div className="grid grid-cols-2 gap-4">
          {/* 2yr */}
          <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">GBP 2yr Swap</span>
              <div className="flex items-center gap-1">
                {React.createElement(TrendIcon(trend2yr), { size: 10, style: { color: trendColor(trend2yr) } })}
                <span className="text-[8px] font-black uppercase" style={{ color: trendColor(trend2yr) }}>{trend2yr}</span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-white tracking-tighter">
                  {!isNaN(swap.gbp_2yr) ? swap.gbp_2yr.toFixed(2) : recent2yr.toFixed(2)}%
                </span>
              </div>
              {renderSparkline(sparkline2yr, trendColor(trend2yr))}
            </div>
          </div>

          {/* 5yr */}
          <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">GBP 5yr Swap</span>
              <div className="flex items-center gap-1">
                {React.createElement(TrendIcon(trend5yr), { size: 10, style: { color: trendColor(trend5yr) } })}
                <span className="text-[8px] font-black uppercase" style={{ color: trendColor(trend5yr) }}>{trend5yr}</span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-white tracking-tighter">
                  {!isNaN(swap.gbp_5yr) ? swap.gbp_5yr.toFixed(2) : recent5yr.toFixed(2)}%
                </span>
              </div>
              {renderSparkline(sparkline5yr, trendColor(trend5yr))}
            </div>
          </div>
        </div>

        {/* Implied Fixed Rate + Spread Analysis */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Implied 5yr Fixed @ 90% LTV</span>
            <span className="text-[9px] text-linear-text-muted font-mono">swap + ~50bp spread</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-white tracking-tighter">{implied5yrFixed.toFixed(2)}%</div>
            <div className="flex items-center gap-2 text-[9px]">
              <span className="text-linear-text-muted">Market:</span>
              <span className="text-white font-bold">{mortgage5yr90.toFixed(2)}%</span>
              <span className="text-linear-text-muted">actual</span>
            </div>
          </div>
        </div>

        {/* Historical table */}
        <div>
          <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">6M Rate History</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-linear-border/50">
                  <th className="text-left text-[8px] text-linear-text-muted font-bold pb-1">Month</th>
                  <th className="text-right text-[8px] text-linear-text-muted font-bold pb-1">2yr</th>
                  <th className="text-right text-[8px] text-linear-text-muted font-bold pb-1">5yr</th>
                  <th className="text-right text-[8px] text-linear-text-muted font-bold pb-1">BoE</th>
                </tr>
              </thead>
              <tbody>
                {mortgageHistory.slice(-6).reverse().map((h: any) => {
                  const r2 = extractValue(h.mortgage_2yr) ?? 4.45;
                  const r5 = extractValue(h.mortgage_5yr) ?? 4.10;
                  const boe = extractValue(h.boe_rate) ?? 3.75;
                  return (
                    <tr key={h.month} className="border-b border-linear-border/30">
                      <td className="py-1 text-[9px] text-linear-text-muted font-mono">{h.month}</td>
                      <td className="py-1 text-right text-[9px] text-white font-bold">{r2.toFixed(2)}%</td>
                      <td className="py-1 text-right text-[9px] text-white font-bold">{r5.toFixed(2)}%</td>
                      <td className="py-1 text-right text-[9px] text-blue-400 font-bold">{boe.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapRateSignal;
