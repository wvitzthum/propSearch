// FE-201: Migrated to @visx — replaces HTML/CSS bar chart with visx scale/shape primitives
import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PropertySegment {
  type: string;
  label: string;
  color: string;
  annualReturn: number;
  fiveYearTotal: number;
  volatility: number;
}

const PropertyTypePerformanceChart: React.FC = () => {
  const { data } = useMacroData();
  const raw = data as any;

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<PropertySegment>();

  const segments: PropertySegment[] = useMemo(() => {
    const base = raw?.appreciation_model?.scenario_definitions?.base;

    if (!base) {
      return [
        { type: 'studio', label: 'Studio / 1-Bed', color: '#22c55e', annualReturn: 3.1, fiveYearTotal: 16.5, volatility: 0.8 },
        { type: '2bed', label: '2-Bed Flat', color: '#3b82f6', annualReturn: 2.3, fiveYearTotal: 11.9, volatility: 0.65 },
        { type: '3bed', label: '3-Bed / Terraced', color: '#f59e0b', annualReturn: 1.8, fiveYearTotal: 9.2, volatility: 0.5 },
        { type: 'detached', label: 'Detached / Houses', color: '#a855f7', annualReturn: 1.2, fiveYearTotal: 6.1, volatility: 0.4 },
      ];
    }

    const typeMultipliers: Record<string, { ret: number; vol: number }> = {
      studio: { ret: 1.3, vol: 1.2 },
      '2bed': { ret: 1.0, vol: 1.0 },
      '3bed': { ret: 0.75, vol: 0.75 },
      detached: { ret: 0.5, vol: 0.6 },
    };

    const baseReturn = base.annual_return ?? 2.0;
    return (Object.entries(typeMultipliers) as [string, {ret: number; vol: number}][]).map(([type, m]) => {
      const annualReturn = parseFloat((baseReturn * m.ret).toFixed(2));
      const fiveYearTotal = parseFloat(((Math.pow(1 + annualReturn / 100, 5) - 1) * 100).toFixed(1));
      return {
        type,
        label: type === 'studio' ? 'Studio / 1-Bed' : type === '2bed' ? '2-Bed Flat' : type === '3bed' ? '3-Bed / Terraced' : 'Detached / Houses',
        color: type === 'studio' ? '#22c55e' : type === '2bed' ? '#3b82f6' : type === '3bed' ? '#f59e0b' : '#a855f7',
        annualReturn,
        fiveYearTotal,
        volatility: m.vol,
      };
    });
  }, [raw]);

  const maxReturn = Math.max(...segments.map(s => s.annualReturn)) * 1.1;
  const boeRate = extractValue((data as any)?.economic_indicators?.boe_base_rate) ?? 3.75;

  const labelWidth = 60;
  const valueWidth = 50;
  const rightLabelWidth = 36;

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Property Type Performance</h3>
          <span className="text-[8px] text-linear-text-muted/60 font-mono">Base case, London prime</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] text-linear-text-muted/60">vs risk-free</span>
          <span className="text-[8px] font-black text-blue-400">{boeRate.toFixed(2)}%</span>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="p-4">
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;
            const chartWidth = Math.max(parentWidth - labelWidth - valueWidth - rightLabelWidth - 16, 40);
            const barHeight = 14;
            const barPad = 6;
            const innerHeight = segments.length * (barHeight + barPad);

            const xScale = scaleLinear({
              domain: [0, maxReturn],
              range: [0, chartWidth],
            });

            const yScale = scaleBand({
              domain: segments.map(s => s.type),
              range: [0, innerHeight],
              round: true,
            });

            const handleMouseMove = (event: React.MouseEvent<SVGRectElement>, seg: PropertySegment) => {
              const coords = localPoint(event);
              if (!coords) return;
              showTooltip({ tooltipData: seg, tooltipLeft: coords.x, tooltipTop: coords.y });
            };

            return (
              <div className="flex items-start gap-0">
                {/* Type labels column */}
                <div className="shrink-0" style={{ width: labelWidth }}>
                  {segments.map(seg => (
                    <div
                      key={seg.type}
                      className="flex flex-col justify-center"
                      style={{ height: barHeight + barPad, marginBottom: 0 }}
                    >
                      <div className="text-[9px] font-bold text-white truncate">{seg.label}</div>
                      <div className="text-[7px] text-linear-text-muted/60">vol {seg.volatility.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {/* Chart SVG */}
                <svg
                  width={chartWidth}
                  height={innerHeight}
                  className="overflow-visible"
                >
                  {/* Risk-free threshold line */}
                  <line
                    x1={xScale(boeRate)}
                    y1={0}
                    x2={xScale(boeRate)}
                    y2={innerHeight}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="0.5"
                    strokeDasharray="2,1"
                  />

                  {/* Bars */}
                  {segments.map(seg => {
                    const barW = Math.max(xScale(seg.annualReturn) - xScale(0), 2);
                    const y = (yScale(seg.type) ?? 0);
                    return (
                      <Group key={seg.type}>
                        <Bar
                          x={0}
                          y={y + 1}
                          width={barW}
                          height={barHeight}
                          fill={seg.color}
                          opacity={0.75}
                          rx={7}
                          onMouseMove={(e) => handleMouseMove(e, seg)}
                          onMouseLeave={hideTooltip}
                          className="cursor-crosshair"
                        />
                      </Group>
                    );
                  })}
                </svg>

                {/* Annual return column */}
                <div className="shrink-0 flex flex-col justify-start" style={{ width: valueWidth, paddingLeft: 8 }}>
                  {segments.map(seg => {
                    const alpha = seg.annualReturn - boeRate;
                    const isAlphaPositive = alpha >= 0;
                    return (
                      <div
                        key={seg.type}
                        className="flex items-center justify-end gap-0.5"
                        style={{ height: barHeight + barPad }}
                      >
                        <div className={`text-[10px] font-black tabular-nums flex items-center gap-0.5 ${isAlphaPositive ? 'text-retro-green' : 'text-rose-400'}`}>
                          {isAlphaPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                          +{seg.annualReturn.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 5yr total + color dot column */}
                <div className="shrink-0 flex flex-col items-end" style={{ width: rightLabelWidth }}>
                  {segments.map(seg => (
                    <div
                      key={seg.type}
                      className="flex items-center gap-1.5 justify-end"
                      style={{ height: barHeight + barPad }}
                    >
                      <div className="text-[9px] font-bold text-white tabular-nums">+{seg.fiveYearTotal}%</div>
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        </ParentSize>
      </div>

      {/* Risk-free reference line legend */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-[8px] text-linear-text-muted/60">
          <div className="h-px w-4 bg-white/30" />
          <span>Risk-free threshold (BoE {boeRate.toFixed(2)}%)</span>
          <span className="ml-auto text-[7px] text-linear-text-muted/40">Alpha = return above BoE rate</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono">Base scenario · relative performance</span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono">London prime · 2026</span>
      </div>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white">{tooltipData.label}</div>
          <div className="text-[9px] text-retro-green font-bold">+{tooltipData.annualReturn.toFixed(1)}% annual</div>
          <div className="text-[9px] text-linear-text-muted">5yr: +{tooltipData.fiveYearTotal}%</div>
          <div className="text-[9px] text-linear-text-muted">Vol: {tooltipData.volatility.toFixed(2)}</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default PropertyTypePerformanceChart;
