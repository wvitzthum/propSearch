// VISX-012: LTV Band Comparison grouped bar chart using @visx/shape BarGroup on /affordability
import React from 'react';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { ChartLegend } from './ChartGrid';

interface LTVBandRow {
  band: string;
  avgRate: number;
  eligible: number;
  total: number;
}

interface LTVBandComparisonChartProps {
  data?: LTVBandRow[];
  title?: string;
}

const DEFAULT_DATA: LTVBandComparisonChartProps['data'] = [
  { band: '60–70%', avgRate: 3.45, eligible: 28, total: 31 },
  { band: '70–75%', avgRate: 3.65, eligible: 45, total: 52 },
  { band: '75–80%', avgRate: 3.85, eligible: 62, total: 74 },
  { band: '80–85%', avgRate: 4.05, eligible: 38, total: 48 },
  { band: '85–90%', avgRate: 4.45, eligible: 12, total: 22 },
];

const LTVBandComparisonChart: React.FC<LTVBandComparisonChartProps> = ({
  data = DEFAULT_DATA,
  title = 'LTV Band Comparison',
}) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<LTVBandRow>();

  const legendItems = [
    { label: 'Eligible', color: '#3b82f6', shape: 'rect' as const },
    { label: 'Ineligible', color: '#ef4444', shape: 'rect' as const },
  ];

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h3>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-4 py-2 border-b border-white/5 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Best Rate Band</div>
          <div className="text-lg font-bold text-retro-green tracking-tighter">
            {data.reduce((best, d) => d.avgRate < best.avgRate ? d : best, data[0]).band}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Total Eligible</div>
          <div className="text-lg font-bold text-blue-400 tracking-tighter">
            {data.reduce((s, d) => s + d.eligible, 0)}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Avg Rate</div>
          <div className="text-lg font-bold text-white tracking-tighter">
            {(data.reduce((s, d) => s + d.avgRate, 0) / data.length).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Grouped bar chart */}
      <div className="p-4">
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;
            const labelW = 48, legendW = 32;
            const chartW = Math.max(parentWidth - labelW - legendW - 16, 40);
            const barH = 12, padH = 4;
            const innerH = data.length * (barH * 2 + padH * 3);

            const maxTotal = Math.max(...data.map(d => d.total)) * 1.05;
            const xScale = scaleLinear({ domain: [0, maxTotal], range: [0, chartW] });
            const yScale = scaleBand({ domain: data.map(d => d.band), range: [0, innerH], round: true, padding: 0.3 });

            return (
              <div className="flex items-start gap-0">
                {/* Band labels */}
                <div className="shrink-0" style={{ width: labelW }}>
                  {data.map(row => (
                    <div key={row.band} className="flex items-center justify-between" style={{ height: barH * 2 + padH * 3 }}>
                      <span className="text-[9px] font-black text-white">{row.band}</span>
                      <span className="text-[8px] text-linear-text-muted/60">{row.avgRate}%</span>
                    </div>
                  ))}
                </div>

                {/* SVG grouped bars */}
                <svg width={chartW} height={innerH} className="overflow-visible">
                  <Group>
                    {data.map((row) => {
                      const y = yScale(row.band) ?? 0;
                      const eligW = Math.max(xScale(row.eligible) - xScale(0), 2);

                      return (
                        <g key={row.band}>
                          {/* Ineligible bar (red, behind) */}
                          <Bar
                            x={0} y={y}
                            width={xScale(row.total) - xScale(0)} height={barH}
                            fill="rgba(239,68,68,0.15)"
                            rx={4}
                          />
                          {/* Eligible bar (blue) */}
                          <Bar
                            x={0} y={y}
                            width={eligW} height={barH}
                            fill="#3b82f6"
                            opacity={0.8}
                            rx={4}
                            onMouseMove={(e) => {
                              const coords = localPoint(e);
                              if (coords) showTooltip({ tooltipData: row, tooltipLeft: coords.x, tooltipTop: coords.y });
                            }}
                            onMouseLeave={hideTooltip}
                            className="cursor-crosshair"
                          />
                          {/* Rate indicator line */}
                          <line
                            x1={xScale(row.eligible)} y1={y + barH}
                            x2={xScale(row.eligible)} y2={y + barH + 3}
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                          />
                        </g>
                      );
                    })}
                  </Group>
                </svg>

                {/* Count + rate column */}
                <div className="shrink-0" style={{ width: legendW, paddingLeft: 6 }}>
                  {data.map(row => (
                    <div key={row.band} className="flex flex-col items-end justify-center" style={{ height: barH * 2 + padH * 3 }}>
                      <span className="text-[10px] font-bold text-white">{row.eligible}/{row.total}</span>
                      <span className={`text-[9px] font-black ${row.avgRate < 4 ? 'text-retro-green' : 'text-amber-400'}`}>
                        {row.avgRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        </ParentSize>
      </div>

      {/* Footer legend */}
      <div className="px-4 py-2 border-t border-linear-border bg-linear-card/30">
        <ChartLegend items={legendItems} position="inline" />
      </div>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white">LTV {tooltipData.band}</div>
          <div className="text-[9px] text-blue-400">Eligible: {tooltipData.eligible}/{tooltipData.total}</div>
          <div className="text-[9px] text-amber-400">Avg rate: {tooltipData.avgRate}%</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default LTVBandComparisonChart;
