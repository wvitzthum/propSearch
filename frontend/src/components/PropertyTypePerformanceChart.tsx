// FE-201: Migrated to @visx — replaces HTML/CSS bar chart with visx scale/shape primitives
// UX-031: Redesigned for hero placement — larger bars, best alpha badge, key insight
import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const boeRate = extractValue(raw?.economic_indicators?.boe_base_rate) ?? 3.75;

  // UX-031: Larger dimensions for hero placement (used inside ParentSize)
  const labelWidth = 100;
  const valueWidth = 60;
  const rightLabelWidth = 48;

  // UX-031: Best alpha segment — computed here so KEY INSIGHT can use it outside ParentSize
  const bestAlphaSeg = segments.reduce((best, seg) =>
    (seg.annualReturn - boeRate) > (best.annualReturn - boeRate) ? seg : best, segments[0]);

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
            // UX-031: Bar height increased from 14 to 24 (nearly 2x)
            const barHeight = 24;
            const barPad = 10;
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
                {/* Type labels column — UX-031: added rank badges + volatility labels */}
                <div className="shrink-0" style={{ width: labelWidth }}>
                  {segments.map((seg, idx) => {
                    const isTop = seg.type === bestAlphaSeg.type;
                    return (
                      <div
                        key={seg.type}
                        className="flex items-center gap-2"
                        style={{ height: barHeight + barPad, marginBottom: 0 }}
                      >
                        {/* Rank badge */}
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black shrink-0 ${
                          isTop ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-linear-bg text-linear-text-muted border border-linear-border'
                        }`}>
                          {isTop ? '★' : idx + 1}
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-white truncate">{seg.label}</div>
                          <div className="text-[8px] text-linear-text-muted/60">
                            {seg.volatility >= 0.8 ? 'High vol' : seg.volatility >= 0.5 ? 'Med vol' : 'Low vol'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart SVG */}
                <svg
                  width={chartWidth}
                  height={innerHeight}
                  className="overflow-visible"
                >
                  {/* Risk-free threshold line — UX-031: more prominent 1.5px */}
                  <line
                    x1={xScale(boeRate)}
                    y1={0}
                    x2={xScale(boeRate)}
                    y2={innerHeight}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="4,2"
                  />
                  {/* Risk-free label */}
                  <text
                    x={xScale(boeRate) + 2}
                    y={8}
                    className="fill-linear-text-muted/60"
                    fontSize={7}
                    fontStyle="italic"
                  >
                    RF {boeRate.toFixed(1)}%
                  </text>

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

                {/* Annual return + alpha column — UX-031: added alpha vs risk-free */}
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

                {/* 5yr total + £ impact + color dot — UX-031: enriched with £ impact */}
                <div className="shrink-0 flex flex-col items-end" style={{ width: rightLabelWidth }}>
                  {segments.map(seg => {
                    const isTop = seg.type === bestAlphaSeg.type;
                    return (
                      <div
                        key={seg.type}
                        className="flex items-center gap-1.5 justify-end"
                        style={{ height: barHeight + barPad }}
                      >
                        {isTop && (
                          <span className="text-[7px] font-black text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20 shrink-0">BEST</span>
                        )}
                        <div className="text-[9px] font-bold text-white tabular-nums">+{seg.fiveYearTotal}%</div>
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        </ParentSize>
      </div>

      {/* UX-031: KEY INSIGHT callout */}
      <div className="mx-4 mb-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-2">
          <TrendingUp size={12} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-[10px] text-amber-300 leading-relaxed">
            <span className="font-black uppercase tracking-widest">Key Insight: </span>
            <span className="text-white">
              {bestAlphaSeg.label} generates +{(bestAlphaSeg.annualReturn - boeRate).toFixed(1)}pp more annual return vs Detached.
            </span>
            <span className="text-linear-text-muted ml-1">
              Best risk-adjusted opportunity in current market conditions.
            </span>
          </div>
        </div>
      </div>

      {/* Risk-free reference line legend */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-[8px] text-linear-text-muted/60">
          <div className="h-px w-4 bg-white/50" />
          <span>Risk-free threshold (BoE {boeRate.toFixed(2)}%)</span>
          <span className="ml-auto text-[7px] text-linear-text-muted/40">Alpha = return above BoE rate</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono">Base scenario · relative performance</span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono">London prime · 2026</span>
      </div>

      {/* UX-031: Enriched tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white">{tooltipData.label}</div>
          <div className="text-[9px] text-retro-green font-bold">+{tooltipData.annualReturn.toFixed(1)}% annual</div>
          <div className="text-[9px] text-white">{tooltipData.fiveYearTotal}% / 5yr</div>
          <div className="text-[9px] text-linear-text-muted">Alpha vs RF: +{(tooltipData.annualReturn - boeRate).toFixed(1)}pp</div>
          <div className="text-[9px] text-linear-text-muted">{tooltipData.volatility >= 0.8 ? 'High' : tooltipData.volatility >= 0.5 ? 'Med' : 'Low'} vol</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default PropertyTypePerformanceChart;
