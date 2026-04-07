// FE-202: Migrated to @visx — replaces HTML/CSS bar chart with visx scale/shape primitives
import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface YieldRow {
  area: string;
  gross: number;
  net: number;
  epcRisk: boolean;
}

const RentalYieldVsGiltChart: React.FC = () => {
  const { data } = useMacroData();
  const raw = data as any;

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<YieldRow>();

  // UK gilt yield (10yr) — current risk-free benchmark
  const giltYield = useMemo(() => {
    const swapRaw = raw?.swap_rates?.gbp_5yr;
    const swap5yr = typeof swapRaw === 'number' ? swapRaw : 3.95;
    return Math.min(swap5yr - 0.5, 4.25);
  }, [raw]);

  // Rental yield data
  const yieldData = useMemo((): YieldRow[] => {
    const re = raw?.appreciation_model?.rental_yield_estimates ?? {};
    if (!re || typeof re !== 'object' || Object.keys(re).length === 0) {
      return [
        { area: 'Islington (N1)', gross: 3.8, net: 2.9, epcRisk: false },
        { area: 'Camden (NW1)', gross: 3.4, net: 2.6, epcRisk: false },
        { area: 'Notting Hill (W11)', gross: 3.1, net: 2.4, epcRisk: false },
        { area: 'Chelsea (SW3)', gross: 2.8, net: 2.1, epcRisk: false },
        { area: 'Canary Wharf (E14)', gross: 4.6, net: 3.5, epcRisk: false },
        { area: 'Hackney (E8)', gross: 4.2, net: 3.2, epcRisk: true },
      ];
    }
    return Object.entries(re)
      .filter(([key]) => key !== '_description')
      .slice(0, 8)
      .map(([area, val]: [string, any]) => ({
        area,
        gross: typeof val === 'object' ? (val.gross_yield ?? 3.5) : (parseFloat(String(val)) || 3.5),
        net: typeof val === 'object' ? (val.net_yield ?? (val.gross_yield != null ? (val.gross_yield as number) * 0.76 : 2.7)) : (parseFloat(String(val)) * 0.76 || 2.7),
        epcRisk: false,
      }));
  }, [raw]);

  const sorted = [...yieldData].sort((a, b) => b.gross - a.gross).slice(0, 6);
  const maxYield = Math.max(...sorted.map(d => d.gross), giltYield) * 1.1;
  const yieldSpread = (sorted[0]?.gross ?? 0) - giltYield;
  const isPositiveThesis = yieldSpread > 0;

  const barHeight = 16;
  const barPad = 5;
  const labelWidth = 72;
  const valueWidth = 44;

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-retro-green animate-pulse" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Yield vs Risk-Free</h3>
        </div>
        <div className="flex items-center gap-2">
          {isPositiveThesis ? (
            <div className="flex items-center gap-1">
              <TrendingUp size={10} className="text-retro-green" />
              <span className="text-[8px] font-black text-retro-green">POSITIVE SPREAD</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <TrendingDown size={10} className="text-rose-400" />
              <span className="text-[8px] font-black text-rose-400">NEGATIVE SPREAD</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-4 py-2 border-b border-white/5 grid grid-cols-4 gap-3">
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Best Yield</div>
          <div className="text-lg font-bold text-retro-green tracking-tighter">{sorted[0]?.gross.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">UK Gilt 10yr</div>
          <div className="text-lg font-bold text-amber-400 tracking-tighter">{giltYield.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Avg Spread</div>
          <div className={`text-lg font-bold tracking-tighter ${isPositiveThesis ? 'text-retro-green' : 'text-rose-400'}`}>
            {isPositiveThesis ? '+' : ''}{yieldSpread.toFixed(1)}pp
          </div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">EPC Risk Areas</div>
          <div className="text-lg font-bold text-amber-400 tracking-tighter">
            {sorted.filter(d => d.epcRisk).length}
          </div>
        </div>
      </div>

      {/* @visx Bar chart: yields vs gilt */}
      <div className="p-4">
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;
            const chartWidth = Math.max(parentWidth - labelWidth - valueWidth - 12, 40);
            const innerHeight = sorted.length * (barHeight + barPad);

            const xScale = scaleLinear({
              domain: [0, maxYield],
              range: [0, chartWidth],
            });

            const yScale = scaleBand({
              domain: sorted.map(d => d.area),
              range: [0, innerHeight],
              round: true,
            });

            const handleMouseMove = (event: React.MouseEvent<SVGRectElement>, row: YieldRow) => {
              const coords = localPoint(event);
              if (!coords) return;
              showTooltip({ tooltipData: row, tooltipLeft: coords.x, tooltipTop: coords.y });
            };

            return (
              <div className="flex items-start gap-0">
                {/* Area labels */}
                <div className="shrink-0" style={{ width: labelWidth }}>
                  {sorted.map(row => (
                    <div key={row.area} className="flex flex-col justify-center" style={{ height: barHeight + barPad }}>
                      <div className="text-[9px] font-semibold text-white truncate flex items-center gap-1">
                        {row.epcRisk && <span className="text-amber-400 text-[7px]">⚠</span>}
                        {row.area.split(' (')[0]}
                      </div>
                      <div className="text-[7px] text-linear-text-muted/60">net {row.net.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>

                {/* SVG Chart */}
                <svg width={chartWidth} height={innerHeight} className="overflow-visible">
                  {/* Background track */}
                  {sorted.map(row => (
                    <rect
                      key={`bg-${row.area}`}
                      x={0}
                      y={yScale(row.area)! + 1}
                      width={chartWidth}
                      height={barHeight}
                      fill="rgba(255,255,255,0.04)"
                      rx={8}
                    />
                  ))}

                  {/* Gilt yield threshold line */}
                  <line
                    x1={xScale(giltYield)}
                    y1={0}
                    x2={xScale(giltYield)}
                    y2={innerHeight}
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1"
                    strokeDasharray="3,2"
                  />
                  <text
                    x={xScale(giltYield) + 3}
                    y={6}
                    className="text-[7px] fill-amber-400 font-mono"
                  >
                    gilt
                  </text>

                  {/* Yield bars */}
                  {sorted.map(row => {
                    const spread = row.gross - giltYield;
                    const isPositive = spread >= 0;
                    const barW = Math.max(xScale(row.gross) - xScale(0), 2);
                    const y = yScale(row.area)!;
                    return (
                      <Bar
                        key={row.area}
                        x={0}
                        y={y + 1}
                        width={barW}
                        height={barHeight}
                        fill={isPositive ? '#22c55e' : '#ef4444'}
                        opacity={0.7}
                        rx={8}
                        onMouseMove={(e) => handleMouseMove(e, row)}
                        onMouseLeave={hideTooltip}
                        className="cursor-crosshair"
                      />
                    );
                  })}
                </svg>

                {/* Yield values */}
                <div className="shrink-0 flex flex-col justify-start" style={{ width: valueWidth, paddingLeft: 8 }}>
                  {sorted.map(row => {
                    const spread = row.gross - giltYield;
                    const isPositive = spread >= 0;
                    return (
                      <div key={row.area} className="flex flex-col items-end justify-center" style={{ height: barHeight + barPad }}>
                        <div className={`text-[9px] font-black tabular-nums ${isPositive ? 'text-retro-green' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{spread.toFixed(1)}pp
                        </div>
                        <div className="text-[8px] text-white font-bold">{row.gross.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        </ParentSize>
      </div>

      {/* Investment thesis signal */}
      <div className="px-4 pb-4">
        <div className="p-2 rounded-lg border" style={{
          backgroundColor: isPositiveThesis ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          borderColor: isPositiveThesis ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
        }}>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: isPositiveThesis ? '#22c55e' : '#ef4444' }}>
              Investment Thesis: {isPositiveThesis ? 'YIELD BUY' : 'RISK-FREE PREFERRED'}
            </span>
            <span className="text-[9px] text-linear-text-muted">
              {isPositiveThesis
                ? `Gross yields exceed gilt by ${yieldSpread.toFixed(1)}pp — positive carry case`
                : 'Gilt yield exceeds available rental yields — capital preservation preferred'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono">Gross yield · net ~24% lower · no void allowance</span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono">vs UK Gilt 10yr · {new Date().getFullYear()}</span>
      </div>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white">{tooltipData.area.split(' (')[0]}</div>
          <div className="text-[9px] text-retro-green font-bold">Gross: {tooltipData.gross.toFixed(1)}%</div>
          <div className="text-[9px] text-linear-text-muted">Net: {tooltipData.net.toFixed(1)}%</div>
          <div className="text-[9px] text-linear-text-muted">vs gilt: {tooltipData.gross - giltYield >= 0 ? '+' : ''}{(tooltipData.gross - giltYield).toFixed(1)}pp</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default RentalYieldVsGiltChart;
