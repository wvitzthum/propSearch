import React, { useMemo } from 'react';
import type { Property, PriceHistoryEntry } from '../types/property';

const W = 760;
const H = 300;
const PAD = { top: 20, right: 20, bottom: 48, left: 72 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

// Status colors
const STATUS_COLORS: Record<string, string> = {
  listed: '#60a5fa',
  reduced: '#f59e0b',
  under_offer: '#a78bfa',
  sold: '#22c55e',
  withdrawn: '#6b7280',
};

// Generate mock history if none exists (FE-166)
function generateMockHistory(property: Property): PriceHistoryEntry[] {
  const entries: PriceHistoryEntry[] = [];
  const now = new Date('2026-04-02');
  let price = property.list_price;
  let hpi = 100;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const dateStr = d.toISOString().split('T')[0];
    let status: PriceHistoryEntry['status'] = 'listed';

    if (i === 3) {
      price = Math.round(price * 0.97);
      status = 'reduced';
    } else if (i === 1) {
      status = 'under_offer';
    } else if (i === 0) {
      status = 'under_offer';
    }

    hpi = 100 + (5 - i) * 0.8 + (Math.sin(i) * 0.3);

    entries.push({
      date: dateStr,
      price,
      price_per_sqm: Math.round(price / property.sqft * 10.764),
      status,
      reduction_pct: i === 3 ? 3.0 : undefined,
      days_on_market: (5 - i) * 30 + Math.floor(Math.random() * 10),
      london_hpi: Math.round(hpi * 10) / 10,
    });
  }
  return entries;
}

interface Props {
  property: Property;
}

const PropertyPriceEvolution: React.FC<Props> = ({ property }) => {
  const history = useMemo<PriceHistoryEntry[]>(() => {
    const raw = property.price_history;
    if (raw && raw.length > 1) return raw;
    return generateMockHistory(property);
  }, [property]);

  // Scales
  const xScale = (i: number) =>
    PAD.left + (i / Math.max(history.length - 1, 1)) * CHART_W;

  const priceMin = Math.min(...history.map(h => h.price));
  const priceMax = Math.max(...history.map(h => h.price));
  const priceRange = priceMax - priceMin || 1;
  const yPrice = (price: number) =>
    PAD.top + CHART_H - ((price - priceMin) / priceRange) * CHART_H;

  const psqmMin = Math.min(...history.map(h => h.price_per_sqm));
  const psqmMax = Math.max(...history.map(h => h.price_per_sqm));
  const psqmRange = psqmMax - psqmMin || 1;
  const yPsqm = (psqm: number) =>
    PAD.top + CHART_H - ((psqm - psqmMin) / psqmRange) * CHART_H;

  // London HPI scale (0-120 range, centred)
  const hpiMin = Math.min(...history.map(h => h.london_hpi ?? 100));
  const hpiMax = Math.max(...history.map(h => h.london_hpi ?? 100));
  const hpiRange = hpiMax - hpiMin || 1;
  const yHpi = (hpi: number) =>
    PAD.top + CHART_H - ((hpi - hpiMin) / hpiRange) * CHART_H;

  // Area path (price)
  const areaPath = history
    .map((h, i) => {
      const x = xScale(i);
      const y = yPrice(h.price);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ') + ` L${xScale(history.length - 1)},${PAD.top + CHART_H} L${PAD.left},${PAD.top + CHART_H} Z`;

  // Line path (price)
  const linePath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yPrice(h.price)}`)
    .join(' ');

  // Price/sqm line
  const psqmPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yPsqm(h.price_per_sqm)}`)
    .join(' ');

  // HPI line
  const hpiPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yHpi(h.london_hpi ?? 100)}`)
    .join(' ');

  // Reduction events
  const reductions = history.filter(h => h.status === 'reduced' || h.reduction_pct != null);

  // Format currency
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `£${(n / 1_000_000).toFixed(2)}M`
      : `£${(n / 1_000).toFixed(0)}K`;

  // Y-axis ticks for price
  const priceTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = priceRange / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(priceMin + i * step);
    }
    return ticks;
  }, [priceMin, priceRange]);

  // X-axis labels
  const xLabels = history.map((h) => {
    const d = new Date(h.date);
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });

  const initialPrice = history[0]?.price ?? 0;
  const finalPrice = history[history.length - 1]?.price ?? 0;
  const totalDelta = finalPrice - initialPrice;
  const totalDeltaPct = initialPrice ? ((totalDelta / initialPrice) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-linear-border flex items-center justify-between bg-linear-bg/40">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
            Price Evolution Analysis
          </h3>
          {!property.price_history && (
            <span className="text-[8px] text-yellow-500/60 font-bold uppercase tracking-wider ml-1">
              — Synthetic
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[8px] font-bold">
          <div className="flex items-center gap-1">
            <div className="h-1 w-3 rounded-full bg-blue-400" />
            <span className="text-linear-text-muted">List Price</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-0.5 w-3 bg-yellow-400" style={{ opacity: 0.7 }} />
            <span className="text-linear-text-muted">£/SQM</span>
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

      {/* SVG Chart */}
      <div className="px-4 pt-2 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="psqmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Subtle grid */}
          {priceTicks.map((tick, i) => (
            <g key={`g-${i}`}>
              <line
                x1={PAD.left} y1={yPrice(tick)}
                x2={PAD.left + CHART_W} y2={yPrice(tick)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
              />
            </g>
          ))}

          {/* London HPI dashed benchmark line */}
          <path
            d={hpiPath}
            fill="none"
            stroke="#6b7280"
            strokeWidth="1"
            strokeDasharray="4,3"
            strokeOpacity="0.45"
          />

          {/* Price/sqm line */}
          <path
            d={psqmPath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeOpacity="0.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Price area fill */}
          <path
            d={areaPath}
            fill="url(#priceGrad)"
          />

          {/* Price line */}
          <path
            d={linePath}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Status dots */}
          {history.map((h, i) => {
            const cx = xScale(i);
            const cy = yPrice(h.price);
            const color = STATUS_COLORS[h.status] ?? '#60a5fa';
            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={cx} cy={cy} r={5}
                  fill={color}
                  opacity="0.9"
                  stroke="#18181b"
                  strokeWidth="1.5"
                />
                {/* Status ring for non-listed */}
                {h.status !== 'listed' && (
                  <circle cx={cx} cy={cy} r={8} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2,2" />
                )}
              </g>
            );
          })}

          {/* Price reduction flags */}
          {reductions.map((h, i) => {
            const idx = history.indexOf(h);
            const cx = xScale(idx);
            const cy = yPrice(h.price);
            const flagX = cx - 10;
            const flagY = cy - 20;
            return (
              <g key={`flag-${i}`} transform={`translate(${flagX},${flagY})`}>
                <polygon points="0,0 20,0 20,16 10,10 0,16" fill="#f59e0b" opacity="0.85" />
                <text x="4" y="11" fontSize="8" fill="#18181b" fontWeight="bold" fontFamily="Inter, monospace">
                  ↓{h.reduction_pct?.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* X-axis */}
          <line
            x1={PAD.left} y1={PAD.top + CHART_H}
            x2={PAD.left + CHART_W} y2={PAD.top + CHART_H}
            stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"
          />

          {/* X labels */}
          {xLabels.map((label, i) => (
            <text
              key={`xl-${i}`}
              x={xScale(i)}
              y={PAD.top + CHART_H + 16}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(255,255,255,0.4)"
              fontFamily="Inter, monospace"
              fontWeight="600"
            >
              {label}
            </text>
          ))}

          {/* Y-axis labels (price) */}
          {priceTicks.map((tick, i) => (
            <text
              key={`yl-${i}`}
              x={PAD.left - 6}
              y={yPrice(tick) + 3}
              textAnchor="end"
              fontSize="7.5"
              fill="rgba(255,255,255,0.4)"
              fontFamily="Inter, monospace"
              fontWeight="500"
            >
              {fmt(tick)}
            </text>
          ))}

          {/* Y-axis title */}
          <text
            x={10}
            y={PAD.top + CHART_H / 2}
            textAnchor="middle"
            fontSize="7"
            fill="rgba(255,255,255,0.3)"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
            transform={`rotate(-90, 10, ${PAD.top + CHART_H / 2})`}
          >
            £ LIST PRICE
          </text>
        </svg>
      </div>

      {/* Bottom data table */}
      <div className="px-4 pb-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="border-t border-b border-linear-border">
                <th className="text-left py-1.5 pr-3 text-linear-text-muted/60 font-black uppercase tracking-widest">Date</th>
                <th className="text-right py-1.5 px-2 text-linear-text-muted/60 font-black uppercase tracking-widest">Price</th>
                <th className="text-right py-1.5 px-2 text-linear-text-muted/60 font-black uppercase tracking-widest">£/SQM</th>
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
                  <td className="text-right py-1.5 px-2 text-yellow-400/70">
                    £{h.price_per_sqm.toLocaleString()}
                  </td>
                  <td className="text-center py-1.5 px-2">
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider"
                      style={{
                        backgroundColor: STATUS_COLORS[h.status] + '20',
                        color: STATUS_COLORS[h.status],
                        border: `0.5px solid ${STATUS_COLORS[h.status]}40`,
                      }}
                    >
                      {h.status.replace('_', ' ')}
                    </span>
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
    </div>
  );
};

export default PropertyPriceEvolution;
