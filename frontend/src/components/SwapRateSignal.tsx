// FE-207: Migrated sparklines to @visx — replaces hand-rolled polyline with visx LinePath
// FE-282: Extended with Mortgage Timing Signal
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import MPCProbabilityMatrix from './MPCProbabilityMatrix';
import Tooltip from './Tooltip';

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

  // FE-282: Mortgage Timing Signal — derived from forward curve
  const timingSignal = useMemo(() => {
    const signal = data?.timing_signal;
    if (signal) return signal;

    // Fallback: derive from forward curve
    const fc = data?.forward_curve ?? [];
    if (fc.length >= 2) {
      const current = fc[0];
      const future = fc.find((p: { meeting_date: string }) => {
        const d = new Date(p.meeting_date);
        return d >= new Date('2026-07-01');
      }) ?? fc[Math.min(2, fc.length - 1)];

      if (current && future) {
        const change = future.implied_rate - current.implied_rate;
        const vol = data?.prediction_markets?.boe_decisions?.[0]?.volume_total ?? 0;
        return {
          direction: change < -0.1 ? 'falling' : change > 0.1 ? 'rising' : 'holding',
          target_rate: future.implied_rate,
          target_quarter: future.meeting_name,
          confidence: vol > 100000 ? 'high' : vol > 25000 ? 'medium' : 'low' as const,
        };
      }
    }

    // Default fallback
    return {
      direction: 'holding' as const,
      confidence: 'low' as const,
    };
  }, [data?.timing_signal, data?.forward_curve, data?.prediction_markets]);

  const timingColor = timingSignal.direction === 'falling' ? '#22c55e'
    : timingSignal.direction === 'rising' ? '#ef4444'
    : '#a1a1aa';
  const timingBg = timingSignal.direction === 'falling' ? 'rgba(34, 197, 94, 0.1)'
    : timingSignal.direction === 'rising' ? 'rgba(239, 68, 68, 0.1)'
    : 'rgba(161, 161, 170, 0.1)';
  const timingBorder = timingSignal.direction === 'falling' ? 'rgba(34, 197, 94, 0.3)'
    : timingSignal.direction === 'rising' ? 'rgba(239, 68, 68, 0.3)'
    : 'rgba(161, 161, 170, 0.3)';
  const confidenceColor = timingSignal.confidence === 'high' ? '#22c55e'
    : timingSignal.confidence === 'medium' ? '#f59e0b'
    : '#a1a1aa';

  // FE-182: Implied fixed rate — values are now plain numbers, no NaN possible
  const implied5yrFixed = useMemo(() => {
    const swap5yr = isNaN(swap.gbp_5yr) ? recent5yr : swap.gbp_5yr;
    return swap5yr + 0.5; // approx spread
  }, [swap.gbp_5yr, recent5yr]);

  // FE-207: @visx sparkline helper — defined inside useMemo to avoid React Compiler
  // "cannot create components during render" error
  const VisxSparkline = useMemo<React.FC<{ data: number[]; color: string; width?: number; height?: number }>>(() => {
    return ({ data, color, width = 60, height = 20 }) => {
      const valid = data.filter((p) => !isNaN(p) && isFinite(p));
      if (valid.length < 2) return null;

      const xScale = scaleLinear({ domain: [0, valid.length - 1], range: [0, width] });
      const yScale = scaleLinear({
        domain: [Math.min(...valid), Math.max(...valid)],
        range: [height, 0],
      });

      return (
        <svg width={width} height={height} className="overflow-visible">
          <LinePath
            data={valid}
            x={(_, i) => xScale(i)}
            y={d => yScale(d)}
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            curve={curveMonotoneX}
          />
        </svg>
      );
    };
  }, []);

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Swap Rate Signal</h3>
          <span className="ml-auto text-[10px] text-linear-text-muted font-mono">Leading mortgage indicator</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2yr and 5yr Swap */}
        <div className="grid grid-cols-2 gap-4">
          {/* 2yr */}
          <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">GBP 2yr Swap</span>
              <div className="flex items-center gap-1">
                {React.createElement(TrendIcon(trend2yr), { size: 10, style: { color: trendColor(trend2yr) } })}
                <span className="text-[11px] font-black uppercase" style={{ color: trendColor(trend2yr) }}>{trend2yr}</span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-white tracking-tighter">
                  {!isNaN(swap.gbp_2yr) ? swap.gbp_2yr.toFixed(2) : recent2yr.toFixed(2)}%
                </span>
              </div>
              {/* eslint-disable-next-line react-hooks/static-components */}
              <VisxSparkline data={sparkline2yr} color={trendColor(trend2yr)} />
            </div>
          </div>

          {/* 5yr */}
          <div className="p-4 bg-linear-bg rounded-xl border border-linear-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">GBP 5yr Swap</span>
              <div className="flex items-center gap-1">
                {React.createElement(TrendIcon(trend5yr), { size: 10, style: { color: trendColor(trend5yr) } })}
                <span className="text-[11px] font-black uppercase" style={{ color: trendColor(trend5yr) }}>{trend5yr}</span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-white tracking-tighter">
                  {!isNaN(swap.gbp_5yr) ? swap.gbp_5yr.toFixed(2) : recent5yr.toFixed(2)}%
                </span>
              </div>
              {/* eslint-disable-next-line react-hooks/static-components */}
              <VisxSparkline data={sparkline5yr} color={trendColor(trend5yr)} />
            </div>
          </div>
        </div>

        {/* Implied Fixed Rate + Spread Analysis */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Implied 5yr Fixed @ 90% LTV</span>
            <span className="text-[9px] text-linear-text-muted font-mono">swap + ~50bp spread</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-white tracking-tighter">{implied5yrFixed.toFixed(2)}%</div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-linear-text-muted">Market:</span>
              <span className="text-white font-bold">{mortgage5yr90.toFixed(2)}%</span>
              <span className="text-linear-text-muted">actual</span>
            </div>
          </div>
        </div>

        {/* FE-282: Mortgage Timing Signal */}
        <div
          className="p-3 rounded-xl border transition-colors"
          style={{ backgroundColor: timingBg, borderColor: timingBorder }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Clock size={9} style={{ color: timingColor }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: timingColor }}>
                Rate Outlook
              </span>
            </div>
            <Tooltip
              content={`Rates are ${timingSignal.direction} — derived from SONIA forward curve slope`}
              methodology="Forward curve from swap_rates.forward_curve. Direction based on rate change over next 3 months."
            >
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: confidenceColor }} />
                <span className="text-[8px] font-bold uppercase" style={{ color: confidenceColor }}>
                  {timingSignal.confidence}
                </span>
              </div>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white">
              Rates {timingSignal.direction === 'falling' ? 'falling'
                : timingSignal.direction === 'rising' ? 'rising'
                : 'holding'}
              {timingSignal.target_rate && timingSignal.target_quarter && (
                <span className="text-linear-text-muted ml-1">
                  to ~{timingSignal.target_rate.toFixed(2)}% {timingSignal.target_quarter}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* FE-282: Compact MPC Probability Strip */}
        <div className="p-3 bg-linear-bg rounded-xl border border-linear-border">
          <MPCProbabilityMatrix compact />
        </div>

        {/* Historical table */}
        <div>
          <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">6M Rate History</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-linear-border/50">
                  <th className="text-left text-[10px] text-linear-text-muted font-bold pb-1">Month</th>
                  <th className="text-right text-[10px] text-linear-text-muted font-bold pb-1">2yr</th>
                  <th className="text-right text-[10px] text-linear-text-muted font-bold pb-1">5yr</th>
                  <th className="text-right text-[10px] text-linear-text-muted font-bold pb-1">BoE</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {mortgageHistory.slice(-6).reverse().map((h: any) => {
                  const r2 = extractValue(h.mortgage_2yr) ?? 4.45;
                  const r5 = extractValue(h.mortgage_5yr) ?? 4.10;
                  const boe = extractValue(h.boe_rate) ?? 3.75;
                  return (
                    <tr key={h.month} className="border-b border-linear-border/30">
                      <td className="py-1 text-[11px] text-linear-text-muted font-mono">{h.month}</td>
                      <td className="py-1 text-right text-[11px] text-white font-bold">{r2.toFixed(2)}%</td>
                      <td className="py-1 text-right text-[11px] text-white font-bold">{r5.toFixed(2)}%</td>
                      <td className="py-1 text-right text-[11px] text-blue-400 font-bold">{boe.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FE-190: 10-year rate history sparkline */}
        {sparkline2yr.length >= 10 && (
          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">10-Year Rate Trajectory</span>
              <span className="text-[8px] text-linear-text-muted/60 font-mono">2016–2026</span>
            </div>
            <div className="flex gap-6">
              {/* 2yr trajectory mini-chart */}
              <div className="flex-1">
                <div className="text-[10px] text-linear-text-muted mb-1">2yr Fixed @ 90% LTV</div>
                {/* eslint-disable-next-line react-hooks/static-components */}
                <VisxSparkline data={sparkline2yr} color="#a855f7" />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[7px] text-linear-text-muted/60 font-mono">2016</span>
                  <span className="text-[11px] text-purple-400 font-black">
                    {sparkline2yr.length >= 10 ? sparkline2yr[0].toFixed(2) + '%' : '—'}
                  </span>
                  <span className="text-[11px] text-purple-400 font-black">
                    {sparkline2yr[sparkline2yr.length - 1].toFixed(2)}%
                  </span>
                  <span className="text-[7px] text-linear-text-muted/60 font-mono">now</span>
                </div>
              </div>
              {/* 5yr trajectory mini-chart */}
              <div className="flex-1">
                <div className="text-[10px] text-linear-text-muted mb-1">5yr Fixed @ 75% LTV</div>
                {/* eslint-disable-next-line react-hooks/static-components */}
                <VisxSparkline data={sparkline5yr} color="#8b5cf6" />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[7px] text-linear-text-muted/60 font-mono">2016</span>
                  <span className="text-[11px] text-purple-400 font-black">
                    {sparkline5yr.length >= 10 ? sparkline5yr[0].toFixed(2) + '%' : '—'}
                  </span>
                  <span className="text-[11px] text-purple-400 font-black">
                    {sparkline5yr[sparkline5yr.length - 1].toFixed(2)}%
                  </span>
                  <span className="text-[7px] text-linear-text-muted/60 font-mono">now</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FE-190: Affordability context */}
        <div className="grid grid-cols-3 gap-3">
          {/* Monthly cost at current rate */}
          <div className="p-3 bg-linear-bg rounded-xl border border-linear-border">
            <div className="text-[10px] text-linear-text-muted uppercase tracking-widest mb-1">Monthly @ 5yr 90%</div>
            <div className="text-lg font-bold text-white tracking-tighter">£{Math.round((300000 * 0.9 * (recent5yr / 100 / 12) * 1.1) / 10) * 10}</div>
            <div className="text-[7px] text-linear-text-muted/60">£300K loan, 25yr</div>
          </div>
          {/* vs peak (2022) */}
          <div className="p-3 bg-linear-bg rounded-xl border border-linear-border">
            <div className="text-[10px] text-linear-text-muted uppercase tracking-widest mb-1">vs 2022 Peak</div>
            <div className="text-lg font-bold text-retro-green tracking-tighter">-{(5.75 - recent5yr).toFixed(1)}pp</div>
            <div className="text-[7px] text-linear-text-muted/60">From 5.75% peak</div>
          </div>
          {/* vs pre-rate hike */}
          <div className="p-3 bg-linear-bg rounded-xl border border-linear-border">
            <div className="text-[10px] text-linear-text-muted uppercase tracking-widest mb-1">vs 2021 Low</div>
            <div className="text-lg font-bold text-amber-400 tracking-tighter">{(recent5yr - 2.5).toFixed(1)}pp</div>
            <div className="text-[7px] text-linear-text-muted/60">Above 2.5% floor</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapRateSignal;
