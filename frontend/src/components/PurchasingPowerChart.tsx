// FE-216: Purchasing Power Index — shows max loan achievable at monthly budget over historical rates
// VISX-017: Migrated to ParentSize responsive SVG (no viewBox) — tooltip coords are screen pixels
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { scaleLinear } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { useFinancialData } from '../hooks/useFinancialData';
import type { MortgageHistoryEntry } from '../types/macro';
import { extractValue } from '../types/macro';

interface ChartDataPoint {
  date: string;
  rate: number;
  maxLoan: number;
}

interface PurchasingPowerChartProps {
  monthlyBudget: number;
  termYears?: number;
  height?: number;
}

const PurchasingPowerChart: React.FC<PurchasingPowerChartProps> = ({
  monthlyBudget,
  termYears = 25,
  height = 280,
}) => {
  const { macroData } = useFinancialData();
  const mortgageHistory: MortgageHistoryEntry[] = macroData?.mortgage_history ?? [];

  // Calculate max loan from monthly payment using mortgage formula
  // M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const calculateMaxLoan = (monthlyPayment: number, annualRate: number, years: number): number => {
    if (annualRate === 0) return monthlyPayment * years * 12;
    const r = annualRate / 100 / 12; // monthly rate
    const n = years * 12; // total months
    const P = monthlyPayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
    return Math.max(0, P);
  };

  // Build chart data: max loan per month based on that month's rate
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!mortgageHistory || mortgageHistory.length === 0) return [];
    return mortgageHistory.slice(-24).map((h: MortgageHistoryEntry) => {
      const rate = extractValue(h.mortgage_5yr ?? h.mortgage_5yr_75ltv ?? h.rate_75) ?? 4.55;
      return {
        date: h.month || h.date || '',
        rate,
        maxLoan: calculateMaxLoan(monthlyBudget, rate, termYears),
      };
    });
  }, [mortgageHistory, monthlyBudget, termYears]);

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<{ date: string; maxLoan: number; rate: number }>();

  if (chartData.length === 0) {
    return (
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6">
        <div className="text-[10px] text-linear-text-muted uppercase tracking-widest text-center py-12">
          Purchasing Power data unavailable
        </div>
      </div>
    );
  }

  // Trend calculation
  const currentMaxLoan = chartData[chartData.length - 1]?.maxLoan ?? 0;
  const earliestMaxLoan = chartData[0]?.maxLoan ?? 0;
  const delta = currentMaxLoan - earliestMaxLoan;
  const deltaPct = earliestMaxLoan > 0 ? (delta / earliestMaxLoan) * 100 : 0;
  const isImproving = delta > 0;

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-linear-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Purchasing Power Index</h3>
            <p className="text-[9px] text-linear-text-muted">Max loan at £{monthlyBudget.toLocaleString()}/mo budget · {termYears}yr term</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isImproving ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">+{deltaPct.toFixed(1)}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400">
              <TrendingDown size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{deltaPct.toFixed(1)}%</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-sm font-bold text-white">£{(currentMaxLoan / 1000).toFixed(0)}K</div>
            <div className="text-[8px] text-linear-text-muted">current max</div>
          </div>
        </div>
      </div>

      {/* VISX-017: ParentSize responsive SVG — no viewBox, all coords in screen pixels */}
      <div className="px-2 pt-2 pb-4" style={{ height }}>
        <ParentSize>
          {({ width: parentWidth }) => {
            if (parentWidth < 10) return null;

            const pad = { top: 16, right: 16, bottom: 32, left: 56 };
            const W = parentWidth;
            const innerW = W - pad.left - pad.right;
            const innerH = height - pad.top - pad.bottom;

            const xScale = scaleLinear({
              domain: [0, chartData.length - 1],
              range: [pad.left, W - pad.right],
            });

            const maxLoanValues = chartData.map(d => d.maxLoan);
            const yMin = Math.min(...maxLoanValues) * 0.95;
            const yMax = Math.max(...maxLoanValues) * 1.05;

            const yScale = scaleLinear({
              domain: [yMin, yMax],
              range: [height - pad.bottom, pad.top],
            });

            return (
              <svg
                width={W}
                height={height}
                className="overflow-visible"
                data-testid="purchasing-power-svg"
              >
                <Group>
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75, 1].map((pct) => {
                    const v = yMin + (yMax - yMin) * pct;
                    return (
                      <g key={pct}>
                        <line
                          x1={pad.left} y1={yScale(v)}
                          x2={W - pad.right} y2={yScale(v)}
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth={1}
                        />
                        <text
                          x={pad.left - 6} y={yScale(v) + 4}
                          className="fill-linear-text-muted"
                          textAnchor="end"
                          fontSize={11}
                        >
                          £{(v / 1000).toFixed(0)}K
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  <AreaClosed
                    data={chartData}
                    x={(_d: ChartDataPoint, i: number) => xScale(i)}
                    y0={height - pad.bottom}
                    y1={(d: ChartDataPoint) => yScale(d.maxLoan)}
                    yScale={yScale}
                    fill="#3b82f6"
                    opacity={0.06}
                  />

                  {/* Line */}
                  <LinePath
                    data={chartData}
                    x={(_d: ChartDataPoint, i: number) => xScale(i)}
                    y={(d: ChartDataPoint) => yScale(d.maxLoan)}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />

                  {/* Current value dot */}
                  <circle
                    cx={xScale(chartData.length - 1)}
                    cy={yScale(currentMaxLoan)}
                    r={4}
                    fill="#3b82f6"
                    opacity={0.9}
                  />

                  {/* Hover rect — localPoint gives screen coords, matching SVG pixel coords */}
                  <rect
                    x={pad.left} y={pad.top}
                    width={innerW} height={innerH}
                    fill="transparent"
                    onMouseMove={(e) => {
                      const coords = localPoint(e);
                      if (!coords) return;
                      const ratio = (coords.x - pad.left) / innerW;
                      const idx = Math.max(0, Math.min(chartData.length - 1, Math.round(ratio * (chartData.length - 1))));
                      const d = chartData[idx];
                      // FE-229 FIX: localPoint returns page-relative {x, y} from the mouse event.
                      // TooltipWithBounds expects page-relative coords — pass coords directly.
                      showTooltip({
                        tooltipData: { date: d.date, maxLoan: d.maxLoan, rate: d.rate },
                        tooltipLeft: coords.x,
                        tooltipTop: coords.y,
                      });
                    }}
                    onMouseLeave={hideTooltip}
                  />
                </Group>
              </svg>
            );
          }}
        </ParentSize>
      </div>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white mb-1">{tooltipData.date}</div>
          <div className="text-[9px] text-blue-400">
            Max Loan: <span className="font-bold">£{(tooltipData.maxLoan / 1000).toFixed(0)}K</span>
          </div>
          <div className="text-[9px] text-linear-text-muted">
            Rate: <span className="font-bold">{tooltipData.rate.toFixed(2)}%</span>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default PurchasingPowerChart;
