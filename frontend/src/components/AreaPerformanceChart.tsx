// VISX-002: Replaced hand-written axis/grid rendering with @visx/grid primitives
// VISX-003: Replaced CSS dot-bar with @visx/shape horizontal bar + @visx/gradient
// UX-029: Area Performance — ranked horizontal bar chart replacing dense HTML table
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { ChartLegend } from './ChartGrid';

interface AreaPerformanceChartProps {
  maxRows?: number;
}

const AreaPerformanceChart: React.FC<AreaPerformanceChartProps> = ({ maxRows = 6 }) => {
  const { data } = useMacroData();

  const areas = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trends: any[] = data?.area_heat_index || data?.area_trends || [];
    const londonBenchmark = data?.london_benchmark ?? 1.2;

    return trends
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.heat - a.heat)
      .slice(0, maxRows);
  }, [data, maxRows]);

  // VISX-020 hotfix: useTooltip must be called before any conditional returns (Rules of Hooks)
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<{ name: string; heat: number; growth: number; delta: number }>();

  if (!data || areas.length === 0) {
    return (
      <div className="p-6 bg-linear-card/30 border border-linear-border rounded-xl text-center">
        <span className="text-[10px] text-linear-text-muted uppercase tracking-widest font-bold">Area performance data loading...</span>
      </div>
    );
  }

  const londonBenchmark = data?.london_benchmark ?? 1.2;
  const maxHeat = Math.max(...areas.map(a => a.heat), 10);

  // Color coding
  const getHeatColor = (heat: number) =>
    heat >= 8 ? '#22c55e' : heat >= 6 ? '#f59e0b' : '#ef4444';

  const getDeltaColor = (delta: number) =>
    delta > 0.5 ? '#22c55e' : delta < -0.5 ? '#ef4444' : '#a1a1aa';

  const getDeltaIcon = (delta: number) =>
    delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;

  const legendItems = [
    { label: 'Outperforming', color: '#22c55e', shape: 'line' as const },
    { label: 'In-line', color: '#a1a1aa', shape: 'line' as const },
    { label: 'Underperforming', color: '#ef4444', shape: 'line' as const },
  ];

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Area Performance Ranking</h3>
          <span className="ml-auto text-[9px] text-linear-text-muted font-mono">London benchmark +{londonBenchmark.toFixed(1)}%</span>
        </div>
      </div>

      {/* VISX-002: SVG bar chart with @visx/shape Bar */}
      <div className="p-4">
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;
            const labelW = 56, statW = 90, rankW = 20;
            const chartW = Math.max(parentWidth - labelW - statW - rankW - 16, 40);
            const barH = 12, rowH = barH + 8;

            const xScale = scaleLinear({ domain: [0, maxHeat], range: [0, chartW] });
            const yScale = scaleBand({ domain: areas.map(a => a.name), range: [0, areas.length * rowH], round: true });

            return (
              <div className="flex items-center gap-0">
                {/* Rank + Area labels */}
                <div className="shrink-0" style={{ width: labelW }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {areas.map((area: any, idx: number) => {
                    const isTop = idx === 0;
                    return (
                      <div key={area.name} className="flex items-center gap-1" style={{ height: rowH }}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black shrink-0 ${
                          isTop ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-linear-bg text-linear-text-muted border border-linear-border'
                        }`}>
                          {isTop ? '★' : idx + 1}
                        </div>
                        <Link to={`/properties?area=${encodeURIComponent(area.name)}`} className="text-[9px] font-black text-white uppercase tracking-wider truncate hover:text-blue-300 transition-colors">
                          {area.name}
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* SVG bar chart */}
                <svg width={chartW} height={areas.length * rowH} className="overflow-visible">
                  <Group>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {areas.map((area: any, idx: number) => {
                      const y = yScale(area.name) ?? idx * rowH;
                      const heatColor = getHeatColor(area.heat);
                      const barW = Math.max(xScale(area.heat) - xScale(0), 2);

                      return (
                        <g key={area.name}>
                          {/* Background track */}
                          <rect
                            x={0} y={y + 1}
                            width={chartW} height={barH}
                            fill="rgba(255,255,255,0.04)"
                            rx={6}
                          />
                          {/* VISX-003: @visx/shape Bar with gradient-like opacity */}
                          <Bar
                            x={0} y={y + 1}
                            width={barW} height={barH}
                            fill={heatColor}
                            opacity={0.75}
                            rx={6}
                            onMouseMove={(e) => {
                              const coords = localPoint(e);
                              if (coords) showTooltip({ tooltipData: { name: area.name, heat: area.heat, growth: area.growth, delta: area.delta }, tooltipLeft: coords.x, tooltipTop: coords.y });
                            }}
                            onMouseLeave={hideTooltip}
                            className="cursor-pointer"
                          />
                        </g>
                      );
                    })}
                  </Group>
                </svg>

                {/* Stats column */}
                <div className="shrink-0 flex flex-col justify-start" style={{ width: statW, paddingLeft: 8 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {areas.map((area: any, idx: number) => {
                    const DeltaIcon = getDeltaIcon(area.delta);
                    const deltaColor = getDeltaColor(area.delta);
                    const isTop = idx === 0;
                    return (
                      <div key={area.name} className="flex items-center gap-2" style={{ height: rowH }}>
                        <div className={`flex items-center gap-1 px-1 py-0.5 rounded shrink-0 ${isTop ? 'bg-amber-500/15 border border-amber-500/30' : ''}`}>
                          <DeltaIcon size={8} style={{ color: deltaColor }} />
                          <span className="text-[9px] font-black" style={{ color: deltaColor }}>
                            {area.delta > 0 ? '+' : ''}{area.delta.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold ${area.growth >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
                            {area.growth >= 0 ? '+' : ''}{area.growth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
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

      {/* VISX-009: @visx/legend tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white">{tooltipData.name}</div>
          <div className="text-[9px] text-blue-400">Heat: {tooltipData.heat}/10</div>
          <div className="text-[9px] text-retro-green">YoY: +{tooltipData.growth.toFixed(1)}%</div>
          <div className="text-[9px] text-linear-text-muted">Δ: {tooltipData.delta > 0 ? '+' : ''}{tooltipData.delta.toFixed(1)}pp</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default AreaPerformanceChart;
