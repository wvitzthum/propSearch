// VISX-005: Area × Metric heatmap matrix using @visx/heatmap
// VISX-020: UX improvements — full metric names, descriptions, visible hover, numeric values in cells, fixed tooltip positioning
import React, { useMemo, useState, useRef } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';

interface HeatmapCell {
  area: string;
  metric: string;
  value: number;
  normalized: number;
}

interface TooltipState {
  cell: HeatmapCell;
  screenX: number;
  screenY: number;
}

interface AreaMetricHeatmapProps {
  maxRows?: number;
}

// Full metric metadata for VISX-020 UX clarity improvements
const METRIC_META: Record<string, { short: string; full: string; description: string }> = {
  'Heat Index': {
    short: 'Heat Index',
    full: 'Market Heat Index',
    description: 'Market velocity score 0–10',
  },
  'YoY Growth': {
    short: 'YoY Growth',
    full: 'Annual Price Growth',
    description: 'Year-on-year HPI change %',
  },
  'Rental Yield': {
    short: 'Rental Yield',
    full: 'Gross Rental Yield',
    description: 'Annual rental income / price %',
  },
  'HPI Forecast': {
    short: 'HPI Forecast',
    full: '12-Month HPI Forecast',
    description: 'Expected appreciation 0–10',
  },
};

const METRICS = Object.keys(METRIC_META);

const AreaMetricHeatmap: React.FC<AreaMetricHeatmapProps> = ({ maxRows = 8 }) => {
  const { data } = useMacroData();
  const raw = data as any;
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const heatmapData = useMemo((): HeatmapCell[] => {
    const areas = (raw?.area_heat_index ?? raw?.area_trends ?? []).slice(0, maxRows);
    if (!areas.length) {
      // Fallback demo data
      return ['Islington', 'Camden', 'Notting Hill', 'Chelsea', 'Canary Wharf', 'Hackney', 'Wimbledon', 'Clapham']
        .flatMap(area => METRICS.map(metric => {
          const val = Math.random() * 8 + 1;
          return { area, metric, value: val, normalized: val / 10 };
        }));
    }
    return areas.flatMap((a: any) => METRICS.map(metric => {
      let val = 5;
      if (metric === 'Heat Index') val = a.score ?? a.heat_index ?? 5;
      else if (metric === 'YoY Growth') val = a.annual_growth ?? a.growth ?? 2;
      else if (metric === 'Rental Yield') val = (a.rental_yield ?? 3.5);
      else if (metric === 'HPI Forecast') val = (a.hpi_forecast_12m ?? a.forecast ?? 2.5);
      return { area: a.area, metric, value: val, normalized: val / 10 };
    }));
  }, [raw, maxRows]);

  if (!heatmapData.length) return null;

  // Color function — green=high value (good), amber=medium, red=low
  const getColor = (value: number) => {
    if (value >= 8) return '#22c55e';
    if (value >= 6) return '#84cc16';
    if (value >= 5) return '#f59e0b';
    if (value >= 4) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden" ref={containerRef}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Area × Metric Heatmap</h3>
        </div>
      </div>

      {/* VISX-020: Metric column header row — full names + descriptions (replaces rotated abbreviations) */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-stretch gap-0 pl-[64px]">
          {METRICS.map(metric => (
            <div
              key={metric}
              className="flex-1 text-center border-r border-linear-border last:border-r-0 pr-1"
            >
              <div className="text-[9px] font-black text-white uppercase tracking-wider leading-tight">
                {METRIC_META[metric].full}
              </div>
              {/* VISX-020: Metric description — explains what the value means */}
              <div className="text-[7px] text-linear-text-muted/60 leading-tight mt-0.5">
                {METRIC_META[metric].description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap SVG */}
      <div className="p-4">
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;
            const labelW = 64;
            const chartW = Math.max(parentWidth - labelW - 8, 40);
            const rowH = 22, padH = 2;
            const areaCount = new Set(heatmapData.map(d => d.area)).size;
            const innerH = areaCount * (rowH + padH);

            // Normalized value scale: 0→10 maps to [0,1] for opacity
            const colorScale = scaleLinear({ domain: [0, 10], range: [0, 1] });

            const areas = [...new Set(heatmapData.map(d => d.area))];
            const cellW = chartW / METRICS.length;

            return (
              <div className="flex items-center gap-0">
                {/* Area labels */}
                <div className="shrink-0" style={{ width: labelW }}>
                  {areas.map(area => (
                    <div key={area} className="flex items-center justify-between" style={{ height: rowH + padH }}>
                      <span className="text-[8px] font-black text-white uppercase tracking-wider truncate pr-1">{area}</span>
                    </div>
                  ))}
                </div>

                {/* SVG heatmap cells */}
                {/* VISX-020: Added numeric value text inside each cell for scan-ability */}
                <svg width={chartW} height={innerH} className="overflow-visible">
                  <Group>
                    {heatmapData.map((cell) => {
                      const areaIdx = areas.indexOf(cell.area);
                      const metricIdx = METRICS.indexOf(cell.metric);
                      const x = metricIdx * cellW;
                      const y = areaIdx * (rowH + padH);
                      const color = getColor(cell.value);
                      const isHovered = tooltip?.cell.area === cell.area && tooltip?.cell.metric === cell.metric;

                      return (
                        <g key={`${cell.area}-${cell.metric}`}>
                          {/* VISX-020: Visible hover state — brightness increase + border */}
                          <rect
                            x={x + 1}
                            y={y + 1}
                            width={Math.max(cellW - 2, 2)}
                            height={rowH - 2}
                            fill={color}
                            opacity={isHovered ? 1 : 0.7 + colorScale(cell.value) * 0.3}
                            rx={4}
                            stroke={isHovered ? 'rgba(255,255,255,0.5)' : 'transparent'}
                            strokeWidth={isHovered ? 1.5 : 0}
                            onMouseMove={(e: React.MouseEvent) => {
                              const rect = (e.target as SVGElement).getBoundingClientRect();
                              setTooltip({ cell, screenX: rect.left + rect.width / 2, screenY: rect.top });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            className="cursor-crosshair transition-all duration-100"
                          />
                          {/* VISX-020: Numeric value inside cell — users can scan without hovering */}
                          {cellW > 30 && (
                            <text
                              x={x + cellW / 2}
                              y={y + rowH / 2 + 1}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={7}
                              fontWeight="700"
                              fill="rgba(255,255,255,0.9)"
                              pointerEvents="none"
                            >
                              {cell.value.toFixed(1)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </Group>
                </svg>
              </div>
            );
          }}
        </ParentSize>
      </div>

      {/* Color scale legend */}
      <div className="px-4 py-2 border-t border-linear-border bg-linear-card/30 flex items-center gap-2">
        <span className="text-[7px] text-linear-text-muted/60 font-bold uppercase">Scale:</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #ef4444, #f97316, #f59e0b, #84cc16, #22c55e)' }} />
        <span className="text-[7px] text-linear-text-muted/60">Low</span>
        <span className="text-[7px] text-linear-text-muted/60">High</span>
      </div>

      {/* VISX-020: Tooltip rendered as a portal-like fixed-position div outside the card's overflow context */}
      {tooltip && (
        <div
          className="fixed z-[100] bg-black/95 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none shadow-2xl"
          style={{
            left: tooltip.screenX,
            top: tooltip.screenY - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Arrow */}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-black/95 border-r border-b border-linear-border rotate-45" />
          <div className="text-[10px] font-black text-white mb-0.5">{tooltip.cell.area}</div>
          <div className="text-[9px] text-linear-text-muted">{tooltip.cell.metric}</div>
          <div
            className="text-[10px] font-bold mt-1"
            style={{ color: tooltip.cell.value >= 8 ? '#22c55e' : tooltip.cell.value >= 5 ? '#f59e0b' : '#ef4444' }}
          >
            {tooltip.cell.value.toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaMetricHeatmap;
