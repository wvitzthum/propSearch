import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { usePropertyContext } from '../hooks/PropertyContext';

// Approximate centroid coordinates for each area (lat, lng)
const AREA_COORDS: Record<string, [number, number]> = {
  'Islington (N1)': [51.5465, -0.1034],
  'Islington (N7)': [51.5540, -0.1150],
  'Bayswater (W2)': [51.5123, -0.1877],
  'Belsize Park (NW3)': [51.5471, -0.1652],
  'West Hampstead (NW6)': [51.5477, -0.1901],
  'Chelsea (SW3/SW10)': [51.4884, -0.1728],
  'Chelsea (SW3)': [51.4912, -0.1634],
  'Chelsea (SW10)': [51.4856, -0.1823],
  'Primrose Hill (NW1)': [51.5410, -0.1550],
  'Islington': [51.5500, -0.1100],
  'Bayswater': [51.5123, -0.1877],
  'Belsize Park': [51.5471, -0.1652],
  'West Hampstead': [51.5477, -0.1901],
  'Chelsea': [51.4884, -0.1728],
  'Primrose Hill': [51.5410, -0.1550],
};

// London bounding box (cropped to visible areas)
const LONDON_BOUNDS = {
  minLat: 51.42, maxLat: 51.62,
  minLng: -0.28, maxLng: 0.01,
};

const SVG_W = 640;
const SVG_H = 500;

// Convert [lat, lng] to SVG [x, y]
const toSvg = (lat: number, lng: number): [number, number] => {
  const x = ((lng - LONDON_BOUNDS.minLng) / (LONDON_BOUNDS.maxLng - LONDON_BOUNDS.minLng)) * SVG_W;
  const y = ((LONDON_BOUNDS.maxLat - lat) / (LONDON_BOUNDS.maxLat - LONDON_BOUNDS.minLat)) * SVG_H;
  return [x, y];
};

// Heat index to color
const heatColor = (heat: number): string => {
  if (heat >= 8) return '#22c55e'; // green — hot market
  if (heat >= 6) return '#f59e0b'; // amber — neutral
  return '#ef4444';               // red — cold market
};

// Glow color
const glowColor = (heat: number): string => {
  if (heat >= 8) return 'rgba(34,197,94,0.4)';
  if (heat >= 6) return 'rgba(245,158,11,0.3)';
  return 'rgba(239,68,68,0.3)';
};

const MicroMarketVelocityMap: React.FC = () => {
  const { data } = useMacroData();
  const { properties } = usePropertyContext();

  const areas = useMemo(() => {
    const trends = data?.area_trends || data?.area_heat_index || [];
    const londonBenchmark = extractValue(data?.london_hpi?.annual_change ?? 1.2);
    return trends.map((a: any) => {
      const heat = extractValue(a.heat_index ?? a.score) ?? 5;
      const growth = extractValue(a.annual_growth) ?? 0;
      const forecast = extractValue(a.hpi_forecast_12m);
      const delta = forecast != null ? forecast - (londonBenchmark ?? 1.2) : growth - (londonBenchmark ?? 1.2);
      return { name: a.area, heat, growth, forecast, delta };
    }).sort((a: any, b: any) => b.heat - a.heat);
  }, [data]);

  // Property count per area (for bubble sizing)
  const propertyCountByArea = useMemo(() => {
    const counts: Record<string, number> = {};
    (properties || []).forEach((p: any) => {
      const areaName = (p.area || '').split(' (')[0];
      counts[areaName] = (counts[areaName] || 0) + 1;
    });
    return counts;
  }, [properties]);

  if (!data || areas.length === 0) return null;

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }}
          />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Micro-Market Velocity</h3>
        </div>
        <div className="flex items-center gap-3 text-[8px] font-bold">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-linear-text-muted">Hot (8–10)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
            <span className="text-linear-text-muted">Neutral (5–7.9)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
            <span className="text-linear-text-muted">Cool (&lt;5)</span>
          </div>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative p-4">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto"
          style={{ background: 'transparent' }}
        >
          {/* Subtle grid lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <g key={`gx-${i}`}>
              <line
                x1={0} y1={(i / 7) * SVG_H}
                x2={SVG_W} y2={(i / 7) * SVG_H}
                stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
              />
              <line
                x1={(i / 7) * SVG_W} y1={0}
                x2={(i / 7) * SVG_W} y2={SVG_H}
                stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
              />
            </g>
          ))}

          {/* Thames river */}
          <path
            d={`M ${toSvg(51.445, -0.365).join(',')} Q ${toSvg(51.450, -0.25).join(',')} ${toSvg(51.435, -0.03).join(',')}`}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="3"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />

          {/* Market velocity circles */}
          {areas.map((area: any) => {
            // Try to find coordinates
            let coords: [number, number] | null = null;
            // Try exact match first
            coords = AREA_COORDS[area.name] || null;
            // Try area base name
            if (!coords) {
              const baseName = area.name.split(' (')[0];
              coords = AREA_COORDS[baseName + ' (N1)'] || AREA_COORDS[baseName] || null;
            }

            const [x, y] = coords ? toSvg(coords[0], coords[1]) : [SVG_W / 2, SVG_H / 2];
            const count = propertyCountByArea[area.name] || propertyCountByArea[area.name.split(' (')[0]] || 0;
            // Base size scaled by property count
            const baseR = Math.min(14, 6 + count * 1.5);
            const r = Math.round(baseR);
            const color = heatColor(area.heat);
            const glow = glowColor(area.heat);
            const deltaSign = area.delta > 0 ? '+' : '';

            return (
              <g key={area.name}>
                {/* Glow ring */}
                <circle
                  cx={x} cy={y} r={r + 6}
                  fill={glow}
                  opacity="0.6"
                />
                {/* Outer ring (alpha=avgAlpha, normalized to size) */}
                <circle
                  cx={x} cy={y} r={r + 2}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.8}
                  strokeOpacity="0.4"
                  strokeDasharray="2,2"
                />
                {/* Main circle */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  opacity="0.85"
                  style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
                />
                {/* Inner dot */}
                <circle
                  cx={x} cy={y} r={Math.max(2, r * 0.3)}
                  fill="white"
                  opacity="0.3"
                />
                {/* Label */}
                <text
                  x={x}
                  y={y - r - 4}
                  textAnchor="middle"
                  fontSize="7"
                  fill="rgba(255,255,255,0.7)"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                >
                  {area.name.split(' (')[0]}
                </text>
                {/* Heat value */}
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fill="white"
                  fontFamily="Inter, sans-serif"
                  fontWeight="700"
                >
                  {area.heat.toFixed(1)}
                </text>
                {/* Delta below */}
                <text
                  x={x}
                  y={y + r + 10}
                  textAnchor="middle"
                  fontSize="6"
                  fill={area.delta > 0 ? '#22c55e' : area.delta < 0 ? '#ef4444' : '#a1a1aa'}
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                >
                  {deltaSign}{area.delta.toFixed(1)}pp
                </text>
              </g>
            );
          })}
        </svg>

        {/* London label */}
        <div className="absolute bottom-3 right-4 text-[8px] text-linear-text-muted/40 font-mono uppercase tracking-widest">
          London · {areas.length} Markets
        </div>
      </div>

      {/* Compact data strip */}
      <div className="px-4 py-2 border-t border-linear-border bg-linear-bg/50 flex gap-2 overflow-x-auto custom-scrollbar">
        {areas.slice(0, 6).map((area: any) => (
          <div key={area.name} className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 bg-linear-card rounded-lg border border-linear-border">
            <div
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: heatColor(area.heat) }}
            />
            <span className="text-[8px] font-black text-white uppercase tracking-tight whitespace-nowrap">
              {area.name.split(' (')[0]}
            </span>
            <span className="text-[8px] font-bold" style={{ color: heatColor(area.heat) }}>
              {area.heat.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MicroMarketVelocityMap;
