import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';

const heatColor = (heat: number): string => {
  if (heat >= 8) return '#22c55e';
  if (heat >= 6) return '#f59e0b';
  return '#ef4444';
};

const MicroMarketVelocityPills: React.FC = () => {
  const { data } = useMacroData();

  const areas = useMemo(() => {
    const trends = data?.area_trends || data?.area_heat_index || [];
    const londonBenchmark = extractValue(data?.london_hpi?.annual_change ?? 1.2) ?? 1.2;
    return trends.map((a: any) => {
      const heat = extractValue(a.heat_index ?? a.score) ?? 5;
      const forecast = extractValue(a.hpi_forecast_12m);
      const delta = forecast != null
        ? forecast - londonBenchmark
        : (extractValue(a.annual_growth) ?? 0) - londonBenchmark;
      return { name: a.area, heat, delta };
    }).sort((a: any, b: any) => b.heat - a.heat);
  }, [data]);

  if (!data || areas.length === 0) return null;

  const topAreas = areas.slice(0, 8);

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }}
          />
          <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Micro-Market Heat</h3>
          <span className="text-[8px] text-linear-text-muted">vs London benchmark · click to explore</span>
        </div>
        <div className="flex items-center gap-3 text-[8px] font-bold shrink-0">
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-[#22c55e]" />
            <span className="text-linear-text-muted">Hot 8+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-[#f59e0b]" />
            <span className="text-linear-text-muted">Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-[#ef4444]" />
            <span className="text-linear-text-muted">Cool</span>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 flex gap-2 overflow-x-auto custom-scrollbar">
        {topAreas.map((area: any) => {
          const color = heatColor(area.heat);
          return (
            <div
              key={area.name}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:border-white/20 cursor-pointer"
              style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
            >
              <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-bold text-white uppercase tracking-tight whitespace-nowrap">
                {area.name.split(' (')[0]}
              </span>
              <span className="text-[10px] font-black whitespace-nowrap" style={{ color }}>
                {area.heat.toFixed(1)}
              </span>
              <span
                className="text-[8px] font-bold whitespace-nowrap"
                style={{ color: area.delta > 0 ? '#22c55e' : area.delta < 0 ? '#ef4444' : '#a1a1aa' }}
              >
                {area.delta > 0 ? '+' : ''}{area.delta.toFixed(1)}pp
              </span>
            </div>
          );
        })}
        {areas.length > 8 && (
          <div className="flex-shrink-0 flex items-center px-2 py-2 text-[9px] font-bold text-linear-text-muted">
            +{areas.length - 8} more
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroMarketVelocityPills;
