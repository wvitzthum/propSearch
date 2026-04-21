// FE-214: Migrated to @visx — replaces hand-rolled SVG with visx scale/shape/axis primitives
// BUG-003: generateMockHistory removed — no synthetic data; shows no-data state when price_history absent
import React, { useMemo, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { Property, PriceHistoryEntry } from '../types/property';
import { fmtNum } from '../utils/format';
import { scaleLinear, scalePoint } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  listed: '#60a5fa',
  reduced: '#f59e0b',
  under_offer: '#a78bfa',
  sold: '#22c55e',
  withdrawn: '#6b7280',
};

interface Props {
  property: Property;
  /** Called when the no-data "Request Enrichment" button is clicked */
  onRequestEnrichment?: () => void;
}

// Chart dimensions
const PAD = { top: 20, right: 20, bottom: 48, left: 72 };

// Format currency
const fmt = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(2)}M`
    : `£${(n / 1_000).toFixed(0)}K`;

const fmtPrice = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(2)}M`
    : `£${(n / 1_000).toFixed(0)}K`;

interface TooltipData {
  entry: PriceHistoryEntry;
  x: number;
  y: number;
}

const PriceEvolutionChart: React.FC<{ width: number; property: Property; history: PriceHistoryEntry[] }> = ({
  width,
  history,
}) => {
  const height = 300;
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  const xLabels = history.map(h => {
    const d = new Date(h.date);
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });

  // Price scale (primary y-axis, left)
  const priceMin = Math.min(...history.map(h => h.price));
  const priceMax = Math.max(...history.map(h => h.price));
  const priceRange = priceMax - priceMin || 1;

  const xScale = scalePoint<string>({
    domain: history.map(h => h.date),
    range: [0, chartW],
    padding: 0,
  });

  const yPriceScale = scaleLinear<number>({
    domain: [priceMin - priceRange * 0.05, priceMax + priceRange * 0.05],
    range: [chartH, 0],
    nice: true,
  });

  // HPI scale (right side, normalised to chart height)
  const hpiMin = Math.min(...history.map(h => h.london_hpi ?? 100));
  const hpiMax = Math.max(...history.map(h => h.london_hpi ?? 100));
  const hpiRange = hpiMax - hpiMin || 1;

  // Map HPI to pixel range (inverted like price)
  const hpiToY = (hpi: number) => ((hpiMax - hpi) / hpiRange) * chartH;

  // Price line data
  const priceData = history.map(h => ({ date: h.date, price: h.price }));
  // HPI line data (in pixel coords)
  const hpiData = history.map(h => ({ x: h.date, hpi: h.london_hpi ?? 100 }));

  // Tooltip
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<TooltipData>();

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const adjustedX = x - PAD.left;

      if (adjustedX < 0 || adjustedX > chartW) {
        hideTooltip();
        return;
      }

      // Find closest data point
      const stepWidth = chartW / (history.length - 1 || 1);
      const idx = Math.round(adjustedX / stepWidth);
      const clampedIdx = Math.max(0, Math.min(history.length - 1, idx));
      const entry = history[clampedIdx];

      if (entry) {
        showTooltip({
          tooltipData: {
            entry,
            x: xScale(entry.date) ?? 0,
            y: yPriceScale(entry.price),
          },
          tooltipLeft: x,
          tooltipTop: yPriceScale(entry.price) + PAD.top,
        });
      }
    },
    [history, chartW, hideTooltip, showTooltip, xScale, yPriceScale],
  );

  // Price ticks for grid
  const priceTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = priceRange / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(priceMin + i * step);
    }
    return ticks;
  }, [priceMin, priceRange]);

  return (
    <div className="relative">
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="priceGradFE214" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <Group left={PAD.left} top={PAD.top}>
          {/* Grid lines */}
          <GridRows
            scale={yPriceScale}
            numTicks={5}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
            width={chartW}
          />

          {/* London HPI dashed benchmark line */}
          <LinePath
            data={hpiData}
            x={d => xScale(d.x) ?? 0}
            y={d => hpiToY(d.hpi)}
            stroke="#6b7280"
            strokeWidth={1}
            strokeDasharray="4,3"
            strokeOpacity={0.45}
          />

          {/* Price area fill */}
          <AreaClosed
            data={priceData}
            x={d => xScale(d.date) ?? 0}
            yScale={yPriceScale}
            y0={() => chartH}
            y1={d => yPriceScale(d.price)}
            fill="url(#priceGradFE214)"
          />

          {/* Price line */}
          <LinePath
            data={priceData}
            x={d => xScale(d.date) ?? 0}
            y={d => yPriceScale(d.price)}
            stroke="#60a5fa"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Status dots */}
          {history.map((h, i) => {
            const cx = xScale(h.date) ?? 0;
            const cy = yPriceScale(h.price);
            const color = STATUS_COLORS[h.status] ?? '#60a5fa';
            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={cx} cy={cy} r={5}
                  fill={color}
                  opacity="0.9"
                  stroke="#18181b"
                  strokeWidth={1.5}
                />
                {h.status != null && h.status !== 'listed' && (
                  <circle cx={cx} cy={cy} r={8} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2,2" />
                )}
              </g>
            );
          })}

          {/* Price reduction flags */}
          {history
            .filter(h => h.status === 'reduced' || h.reduction_pct != null)
            .map((h) => {
              const cx = xScale(h.date) ?? 0;
              const cy = yPriceScale(h.price);
              const flagX = cx - 10;
              const flagY = cy - 20;
              return (
                <g key={`flag-${h.date}`} transform={`translate(${flagX},${flagY})`}>
                  <polygon points="0,0 20,0 20,16 10,10 0,16" fill="#f59e0b" opacity="0.85" />
                  <text x="4" y="11" fontSize="8" fill="#18181b" fontWeight="bold" fontFamily="Inter, monospace">
                    ↓{h.reduction_pct?.toFixed(0)}%
                  </text>
                </g>
              );
            })}

          {/* X-axis baseline */}
          <line
            x1={0} y1={chartH}
            x2={chartW} y2={chartH}
            stroke="rgba(255,255,255,0.1)" strokeWidth={0.5}
          />

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={`xl-${i}`}
              x={xScale(history[i].date) ?? 0}
              y={chartH + 16}
              textAnchor="middle"
              fontSize={8}
              fill="rgba(255,255,255,0.4)"
              fontFamily="Inter, monospace"
              fontWeight={600}
            >
              {label}
            </text>
          ))}

          {/* Y-axis price labels */}
          {priceTicks.map((tick, i) => (
            <text
              key={`yl-${i}`}
              x={-6}
              y={yPriceScale(tick) + 3}
              textAnchor="end"
              fontSize={7.5}
              fill="rgba(255,255,255,0.4)"
              fontFamily="Inter, monospace"
              fontWeight={500}
            >
              {fmt(tick)}
            </text>
          ))}

          {/* Y-axis title */}
          <text
            x={-chartH / 2}
            y={-52}
            textAnchor="middle"
            fontSize={7}
            fill="rgba(255,255,255,0.3)"
            fontFamily="Inter, sans-serif"
            fontWeight={700}
            transform="rotate(-90)"
          >
            £ LIST PRICE
          </text>

          {/* Tooltip crosshair */}
          {tooltipOpen && tooltipData && (
            <g>
              <line
                x1={tooltipData.x}
                y1={0}
                x2={tooltipData.x}
                y2={chartH}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
                strokeDasharray="3,2"
              />
              <circle
                cx={tooltipData.x}
                cy={tooltipData.y}
                r={6}
                fill="#60a5fa"
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Invisible overlay for mouse events */}
          <rect
            width={chartW}
            height={chartH}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="!bg-linear-card !border !border-linear-border !text-white !rounded-xl !shadow-2xl !text-xs !font-mono !px-3 !py-2"
        >
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-linear-text-muted uppercase tracking-widest font-bold">
              {new Date(tooltipData.entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-linear-text-muted">Price</span>
              <span className="font-bold text-white">{fmtPrice(tooltipData.entry.price)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-linear-text-muted">£/SQM</span>
              <span className="text-yellow-400/70">£{fmtNum(tooltipData.entry.price_per_sqm)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-linear-text-muted">Status</span>
              <span
                className="font-bold"
                style={{ color: STATUS_COLORS[tooltipData.entry.status ?? 'listed'] ?? '#60a5fa' }}
              >
                {tooltipData.entry.status.replace('_', ' ')}
              </span>
            </div>
            {tooltipData.entry.reduction_pct != null && (
              <div className="flex justify-between gap-4">
                <span className="text-linear-text-muted">Reduction</span>
                <span className="font-bold text-amber-400">↓{tooltipData.entry.reduction_pct.toFixed(1)}%</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-linear-text-muted">DOM</span>
              <span className="text-white/50">{tooltipData.entry.days_on_market}d</span>
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

const PropertyPriceEvolution: React.FC<Props> = ({ property, onRequestEnrichment }) => {
  const history = useMemo<PriceHistoryEntry[]>(() => {
    const raw = property.price_history;
    // BUG-003: no synthetic fallback — real data or nothing
    if (!raw || raw.length < 2) return [];
    return raw;
  }, [property]);

  const initialPrice = history[0]?.price ?? 0;
  const finalPrice = history[history.length - 1]?.price ?? 0;
  const totalDelta = finalPrice - initialPrice;
  const totalDeltaPct = initialPrice ? ((totalDelta / initialPrice) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-linear-border flex items-center justify-between bg-linear-bg/40">
        <div className="flex items-center gap-2">
          {history.length >= 2 ? (
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          ) : (
            <AlertTriangle size={10} className="text-amber-400" />
          )}
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
            Price Evolution Analysis
          </h3>
          {history.length < 2 && (
            <span className="text-[8px] text-amber-400/70 font-bold uppercase tracking-wider ml-1">
              — No Data
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[8px] font-bold">
          <div className="flex items-center gap-1">
            <div className="h-1 w-3 rounded-full bg-blue-400" />
            <span className="text-linear-text-muted">List Price</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-0.5 w-3 bg-linear-text-muted" style={{ opacity: 0.4, borderTop: '1px dashed #6b7280' }} />
            <span className="text-linear-text-muted">London HPI</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-linear-text-muted">Reduction</span>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-5 py-2 border-b border-linear-border bg-linear-card/40 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Start</span>
          <span className="text-[10px] font-bold text-white font-mono">{fmt(initialPrice)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Current</span>
          <span className="text-[10px] font-bold text-white font-mono">{fmt(finalPrice)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Δ</span>
          <span className={`text-[10px] font-bold font-mono ${totalDelta <= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {totalDelta <= 0 ? '' : '+'}{fmt(Math.abs(totalDelta))} ({totalDeltaPct}%)
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">DOM</span>
          <span className="text-[10px] font-bold text-white font-mono">
            {history[history.length - 1]?.days_on_market ?? property.dom} days
          </span>
        </div>
      </div>

      {/* Chart / no-data state */}
      {history.length >= 2 ? (
        <>
          {/* Chart — responsive via ParentSize */}
          <div className="px-4 pt-2 pb-4">
            <ParentSize>
              {({ width }) => (
                width > 0 ? (
                  <PriceEvolutionChart
                    width={width}
                    property={property}
                    history={history}
                  />
                ) : null
              )}
            </ParentSize>
          </div>

          {/* Bottom data table */}
          <div className="px-4 pb-4">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-[8px] font-mono">
                <thead>
                  <tr className="border-t border-b border-linear-border">
                    <th className="text-left py-1.5 pr-3 text-linear-text-muted/60 font-black uppercase tracking-widest">Date</th>
                    <th className="text-right py-1.5 px-2 text-linear-text-muted/60 font-black uppercase tracking-widest">Price</th>
                    <th className="text-center py-1.5 px-2 text-linear-text-muted/60 font-black uppercase tracking-widest">Status</th>
                    <th className="text-right py-1.5 px-2 text-linear-text-muted/60 font-black uppercase tracking-widest">Δ%</th>
                    <th className="text-right py-1.5 pl-2 text-linear-text-muted/60 font-black uppercase tracking-widest">DOM</th>
                    <th className="text-right py-1.5 pl-2 text-linear-text-muted/60 font-black uppercase tracking-widest">HPI</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr
                      key={`r-${i}`}
                      className="border-b border-linear-border/40 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-1.5 pr-3 text-white/70">{h.date}</td>
                      <td className="text-right py-1.5 px-2 text-white font-bold">
                        {fmt(h.price)}
                      </td>
                      <td className="text-center py-1.5 px-2">
                        {(() => {
                          const entryStatus = h.status ?? 'listed';
                          const color = STATUS_COLORS[entryStatus] ?? '#60a5fa';
                          return (
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider"
                              style={{
                                backgroundColor: color + '20',
                                color,
                                border: `0.5px solid ${color}40`,
                              }}
                            >
                              {entryStatus.replace('_', ' ')}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="text-right py-1.5 pl-2">
                        {h.reduction_pct != null ? (
                          <span className="text-amber-400 font-bold">↓{h.reduction_pct.toFixed(1)}%</span>
                        ) : (
                          <span className="text-linear-text-muted/30">—</span>
                        )}
                      </td>
                      <td className="text-right py-1.5 pl-2 text-white/50">
                        {h.days_on_market}
                      </td>
                      <td className="text-right py-1.5 pl-2 text-gray-500/60">
                        {h.london_hpi?.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* BUG-003: No-data state — no synthetic data shown */
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">
              No Price History Available
            </h4>
            <p className="text-[10px] text-linear-text-muted leading-relaxed max-w-xs">
              Price history is not available for this property. The analyst should source it from the listing portal or Land Registry.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
              Data Missing — Analyst Action Required
            </span>
          </div>
          {onRequestEnrichment && (
            <button
              onClick={onRequestEnrichment}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
            >
              <RefreshCw size={11} />
              Request Enrichment
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyPriceEvolution;
