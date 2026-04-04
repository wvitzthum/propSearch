import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { usePropertyContext } from '../hooks/PropertyContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// FE-187 + FE-121 fix: Redesigned MicroMarketVelocityMap — compact ranked horizontal bar chart
// Replaces SVG bubble map with Bloomberg/Linear data-dense ranked bars
// Bug fix: was reading from data?.area_heat_index (doesn't exist) → now reads data?.area_trends
// Each area carries its own london_benchmark for accurate delta calculation

const heatColor = (heat: number): string => {
  if (heat >= 8) return '#22c55e'; // green — hot
  if (heat >= 5) return '#f59e0b'; // amber — neutral
  return '#ef4444';               // red — cold
};

const heatBg = (heat: number): string => {
  if (heat >= 8) return 'bg-emerald-500/20 border-emerald-500/30';
  if (heat >= 5) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-rose-500/20 border-rose-500/30';
};

const heatText = (heat: number): string => {
  if (heat >= 8) return 'text-emerald-400';
  if (heat >= 5) return 'text-amber-400';
  return 'text-rose-400';
};

const MicroMarketVelocityMap: React.FC = () => {
  const { data } = useMacroData();
  const { properties } = usePropertyContext();

  // FE-121 fix: use area_trends — each entry has its own london_benchmark for per-area delta
  const areas = useMemo(() => {
    // area_trends is an array of { area, heat_index: {value}, annual_growth: {value}, london_benchmark, ... }
    const heatData: any[] = data?.area_trends || [];
    const globalLondonBenchmark = data?.london_benchmark ?? 1.2;

    return heatData.map((a: any) => {
      const heat = extractValue(a.heat_index?.value ?? a.heat_index ?? a.score) ?? 5;
      const growth = extractValue(a.annual_growth?.value ?? a.annual_growth) ?? 0;
      const forecast = extractValue(a.hpi_forecast_12m);
      // Each area has its own london_benchmark; fall back to global London HPI annual change
      const areaBenchmark = extractValue(a.london_benchmark) ?? globalLondonBenchmark;
      const delta = forecast != null
        ? forecast - areaBenchmark
        : growth - areaBenchmark;
      return {
        name: a.area || 'Unknown',
        heat,
        growth,
        forecast,
        delta,
        londonBenchmark: areaBenchmark,
      };
    }).sort((a, b) => b.heat - a.heat); // ranked: highest heat first
  }, [data]);

  // Property count per area for optional annotation
  const propertyCountByArea = useMemo(() => {
    const counts: Record<string, number> = {};
    (properties || []).forEach((p: any) => {
      const areaName = (p.area || '').split(' (')[0];
      counts[areaName] = (counts[areaName] || 0) + 1;
    });
    return counts;
  }, [properties]);

  if (!data || areas.length === 0) return null;

  // Bar chart constants
  const MAX_HEAT = 10;
  const BAR_WIDTH_PX = 120; // width of the heat bar in px at 1x scale

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.6)' }}
          />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
            Micro-Market Velocity
          </h3>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[8px] font-bold">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-linear-text-muted">Hot 8+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-linear-text-muted">Neutral 5–7.9</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span className="text-linear-text-muted">Cool &lt;5</span>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="px-4 py-1 border-b border-white/5 grid gap-2" style={{ gridTemplateColumns: '1fr 120px 80px 80px 48px', minHeight: 20 }}>
        <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest self-center">Area</div>
        <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest self-center text-center">Heat Index</div>
        <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest self-center text-right">YoY</div>
        <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest self-center text-right">+12M</div>
        <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest self-center text-right">Δ</div>
      </div>

      {/* Ranked area rows */}
      {areas.slice(0, 6).map((area: any) => {
        const color = heatColor(area.heat);
        const barWidth = (area.heat / MAX_HEAT) * BAR_WIDTH_PX;
        const propCount = propertyCountByArea[area.name] || propertyCountByArea[area.name.split(' (')[0]] || 0;
        const deltaSign = area.delta > 0 ? '+' : '';

        return (
          <div
            key={area.name}
            className="px-4 py-2 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
          >
            {/* Desktop row */}
            <div className="hidden sm:grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 120px 80px 80px 48px', minHeight: 28 }}>
              {/* Area name */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}60` }} />
                <span className="text-[11px] font-semibold text-white truncate">{area.name.split(' (')[0]}</span>
                {propCount > 0 && (
                  <span className="text-[8px] text-linear-text-muted shrink-0">({propCount})</span>
                )}
              </div>

              {/* Heat bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-4 bg-linear-bg rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(barWidth / BAR_WIDTH_PX * 100, 8)}%`, backgroundColor: color, opacity: 0.85 }}
                  />
                  {/* Scale ticks */}
                  <div className="absolute inset-0 flex items-center justify-between px-0.5">
                    {[0, 5, 10].map(v => (
                      <div key={v} className="h-1.5 w-px bg-white/10" />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] font-black tabular-nums shrink-0" style={{ color }}>
                  {area.heat.toFixed(1)}
                </span>
              </div>

              {/* YoY growth */}
              <div className="text-right">
                <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${area.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {area.growth >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  <span className="tabular-nums">{area.growth >= 0 ? '+' : ''}{area.growth.toFixed(1)}%</span>
                </div>
                <div className="text-[8px] text-linear-text-muted text-right">YoY</div>
              </div>

              {/* 12M forecast */}
              <div className="text-right">
                {area.forecast != null ? (
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${area.forecast >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {area.forecast >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    <span className="tabular-nums">{area.forecast >= 0 ? '+' : ''}{area.forecast.toFixed(1)}%</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-linear-text-muted/40">—</div>
                )}
                <div className="text-[8px] text-linear-text-muted text-right">+12M</div>
              </div>

              {/* Delta badge */}
              <div className="text-right">
                {area.delta !== 0 ? (
                  <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black tabular-nums ${area.delta > 0 ? heatBg(area.heat) + ' ' + heatText(area.heat) : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                    {area.delta > 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                    {deltaSign}{area.delta.toFixed(1)}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black text-linear-text-muted bg-linear-bg border border-linear-border">
                    <Minus size={8} />
                    flat
                  </div>
                )}
              </div>
            </div>

            {/* Mobile row */}
            <div className="sm:hidden flex items-center gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-semibold text-white truncate">{area.name.split(' (')[0]}</span>
              </div>
              <div className="flex-1 h-1.5 bg-linear-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(area.heat / MAX_HEAT * 100, 10)}%`, backgroundColor: color, opacity: 0.85 }} />
              </div>
              <span className="text-[10px] font-black tabular-nums shrink-0" style={{ color }}>{area.heat.toFixed(1)}</span>
              <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${area.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {area.growth >= 0 ? '+' : ''}{area.growth.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono uppercase tracking-widest">
          {areas.length} Markets · {data?.london_hpi?.last_updated || '2026-03'}
        </span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono uppercase tracking-widest">
          vs London {((data?.london_benchmark ?? 1.2) - 1).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export default MicroMarketVelocityMap;
