// VISX-010: Pipeline Funnel Chart using @visx/shape Bar + ParentSize
// VISX-014: Shared gradient library using @visx/gradient
import React from 'react';
import { scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { ChartLegend } from './ChartGrid';

interface FunnelStage {
  label: string;
  count: number;
  color: string;
  conversionRate?: number;
}

interface PipelineFunnelChartProps {
  stages?: FunnelStage[];
  title?: string;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { label: 'Discovered', count: 142, color: '#3b82f6' },
  { label: 'Shortlisted', count: 87, color: '#8b5cf6' },
  { label: 'Vetted', count: 34, color: '#a855f7' },
  { label: 'Offer Made', count: 12, color: '#f59e0b' },
  { label: 'Complete', count: 5, color: '#22c55e' },
];

const PipelineFunnelChart: React.FC<PipelineFunnelChartProps> = ({
  stages = DEFAULT_STAGES,
  title = 'Pipeline Funnel',
}) => {
  const stagesWithConv = stages.map((s, i) => ({
    ...s,
    conversionRate: i > 0 ? parseFloat(((s.count / stages[i - 1].count) * 100).toFixed(0)) : 100,
  }));

  const legendItems = stagesWithConv.map(s => ({ label: s.label, color: s.color, shape: 'rect' as const }));

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<FunnelStage>();

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h3>
        </div>
        <div className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest">
          Conversion rates
        </div>
      </div>

      {/* Funnel SVG */}
      <div className="p-4">
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;
            const labelW = 72, pctW = 40;
            const chartW = Math.max(parentWidth - labelW - pctW - 16, 40);
            const barH = 18, padH = 6;
            const innerH = stages.length * (barH + padH);

            const maxCount = stages[0]?.count ?? 1;
            const xScale = scaleLinear({ domain: [0, maxCount], range: [0, chartW] });

            return (
              <div className="flex items-center gap-0">
                {/* Stage labels */}
                <div className="shrink-0" style={{ width: labelW }}>
                  {stagesWithConv.map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5" style={{ height: barH + padH }}>
                      <div className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[9px] font-black text-white uppercase tracking-wider truncate">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* SVG funnel bars */}
                <svg width={chartW} height={innerH} className="overflow-visible">
                  <Group>
                    {stagesWithConv.map((s, i) => {
                      const y = i * (barH + padH);
                      const barW = Math.max(xScale(s.count) - xScale(0), 2);
                      return (
                        <g key={s.label}>
                          {/* Background track */}
                          <rect
                            x={0} y={y + 1}
                            width={chartW} height={barH}
                            fill="rgba(255,255,255,0.04)"
                            rx={6}
                          />
                          {/* VISX-010: @visx/shape Bar — width proportional to count */}
                          <Bar
                            x={0} y={y + 1}
                            width={barW} height={barH}
                            fill={s.color}
                            opacity={0.75}
                            rx={6}
                            onMouseMove={(e) => {
                              const coords = localPoint(e);
                              if (coords) showTooltip({ tooltipData: s, tooltipLeft: coords.x, tooltipTop: coords.y });
                            }}
                            onMouseLeave={hideTooltip}
                            className="cursor-crosshair"
                          />
                        </g>
                      );
                    })}
                  </Group>
                </svg>

                {/* Conversion rate column */}
                <div className="shrink-0" style={{ width: pctW, paddingLeft: 6 }}>
                  {stagesWithConv.map((s, i) => (
                    <div key={s.label} className="flex items-center justify-end" style={{ height: barH + padH }}>
                      {i > 0 ? (
                        <span className="text-[9px] font-black text-linear-text-muted tabular-nums">
                          {s.conversionRate}%
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-white tabular-nums">{s.count}</span>
                      )}
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

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white">{tooltipData.label}</div>
          <div className="text-[9px] text-retro-green font-bold">{tooltipData.count} properties</div>
          {tooltipData.conversionRate !== undefined && tooltipData.conversionRate < 100 && (
            <div className="text-[9px] text-linear-text-muted">{tooltipData.conversionRate}% from prev</div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default PipelineFunnelChart;
