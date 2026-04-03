import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';

const AreaPerformanceTable: React.FC = () => {
  const { data } = useMacroData();

  // DE-166: Use area_heat_index (the normalized array with .area field) — area_trends
  // is also an array but may lack .area in legacy API responses. area_heat_index is
  // explicitly constructed by useMacroData with the area name from Object.keys().
  const areas = useMemo(() => {
    const trends = data?.area_heat_index || data?.area_trends || [];
    const londonBenchmark = extractValue(data?.london_hpi?.annual_change ?? data?.london_hpi?.yoy_pct) ?? 1.2;

    return trends
      .map((a: any) => {
        const heat = extractValue(a.score ?? a.heat_index) ?? 5;
        const growth = extractValue(a.annual_growth) ?? 0;
        const forecast = extractValue(a.hpi_forecast_12m ?? a.forecast_12m);
        const benchmark = extractValue(a.london_benchmark ?? londonBenchmark);
        const delta = forecast != null ? forecast - benchmark : growth - benchmark;

        return {
          name: a.area,
          heat,
          growth,
          forecast,
          benchmark,
          delta,
        };
      })
      .sort((a: any, b: any) => b.heat - a.heat);
  }, [data]);

  if (!data || areas.length === 0) {
    return (
      <div className="p-6 bg-linear-card/30 border border-linear-border rounded-xl text-center">
        <span className="text-[10px] text-linear-text-muted uppercase tracking-widest font-bold">Area performance data loading...</span>
      </div>
    );
  }

  const londonBenchmark = extractValue(data?.london_hpi?.annual_change ?? data?.london_hpi?.yoy_pct) ?? 1.2;

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Area Performance vs. London Benchmark</h3>
          <span className="ml-auto text-[9px] text-linear-text-muted font-mono">YoY vs +{londonBenchmark.toFixed(1)}% London</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-linear-border">
              <th className="px-4 py-2 text-left text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Area</th>
              <th className="px-4 py-2 text-right text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Heat</th>
              <th className="px-4 py-2 text-right text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">YoY Growth</th>
              <th className="px-4 py-2 text-right text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">12M Forecast</th>
              <th className="px-4 py-2 text-right text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Δ vs Benchmark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linear-border/50">
            {areas.map((area: any) => {
              const DeltaIcon = area.delta > 0.5 ? TrendingUp : area.delta < -0.5 ? TrendingDown : Minus;
              const deltaColor = area.delta > 0.5 ? '#22c55e' : area.delta < -0.5 ? '#ef4444' : '#a1a1aa';
              const heatColor = area.heat >= 8 ? '#22c55e' : area.heat >= 6 ? '#f59e0b' : '#ef4444';

              return (
                <tr key={area.name} className="hover:bg-linear-card/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{area.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <div
                            key={j}
                            className="h-1.5 w-2 rounded-full"
                            style={{
                              backgroundColor: j <= Math.ceil(area.heat / 2) ? heatColor : 'rgba(255,255,255,0.1)'
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-white w-6 text-right">{area.heat.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[10px] font-black ${area.growth >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
                      {area.growth >= 0 ? '+' : ''}{area.growth.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {area.forecast != null ? (
                      <span className={`text-[10px] font-black ${area.forecast >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
                        {area.forecast >= 0 ? '+' : ''}{area.forecast.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-linear-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <DeltaIcon size={10} style={{ color: deltaColor }} />
                      <span className="text-[10px] font-black" style={{ color: deltaColor }}>
                        {area.delta > 0 ? '+' : ''}{area.delta.toFixed(1)}pp
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div className="px-4 py-2 border-t border-linear-border bg-linear-card/30 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={9} className="text-retro-green" />
          <span className="text-[8px] text-linear-text-muted">Outperforming benchmark</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Minus size={9} className="text-linear-text-muted" />
          <span className="text-[8px] text-linear-text-muted">In-line</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown size={9} className="text-rose-400" />
          <span className="text-[8px] text-linear-text-muted">Underperforming</span>
        </div>
      </div>
    </div>
  );
};

export default AreaPerformanceTable;
