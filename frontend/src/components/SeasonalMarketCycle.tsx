/**
 * SeasonalMarketCycle.tsx — VISX-021
 * Bloomberg-style circular ring chart showing the 12-month London property market cycle.
 * Inner ring: Supply (new listings). Outer ring: Demand (buyer activity).
 * Needle: Current month position. Phase-coded color scheme.
 * Data: seasonal_supply/demand_index from macro_trend.json (VISX-022). Falls back to
 * empirically-derived ONS/Land Registry UK seasonal indices.
 *
 * FE-226: Migrated to ParentSize for responsive pixel-accurate sizing.
 * All radii and positions are in screen pixels, not viewBox coordinates.
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useTooltip } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// UK London property market seasonal indices — 0 to 10 scale
// Derived from ONS Land Registry monthly transaction volume 5-year averages
const FALLBACK_SUPPLY = [3, 2, 6, 8, 9, 5, 4, 5, 7, 8, 5, 2];
const FALLBACK_DEMAND = [2, 3, 7, 8, 9, 6, 4, 5, 8, 7, 4, 2];

interface Phase {
  name: string;
  months: readonly number[];
  color: string;
  desc: string;
}

const PHASES: readonly Phase[] = [
  { name: 'Winter Trough', months: [0, 1],     color: '#64748b', desc: 'Post-holiday, minimal activity. Buyer leverage highest.' },
  { name: 'Spring Surge',   months: [2, 3, 4], color: '#22c55e', desc: 'Listings flood in. Peak competition. Prices rise fastest.' },
  { name: 'Summer Lull',    months: [5, 6, 7], color: '#f59e0b', desc: 'Holidays slow activity. Buyer/seller balance.' },
  { name: 'Autumn Rush',     months: [8, 9],    color: '#3b82f6', desc: 'Second busiest period. Supply-demand balanced.' },
  { name: 'Year-End Dip',   months: [10, 11],  color: '#a78bfa', desc: 'Christmas window opens. Negotiation leverage returns.' },
];

function getPhaseForMonth(monthIdx: number): Phase {
  const found = PHASES.find(p => p.months.includes(monthIdx));
  return found ?? PHASES[0];
}

// Top-level helpers — no component scope required
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

// monthAngle: 0=Jan at top, each month = 30°, clockwise
function monthAngle(i: number): number { return i * 30; }

interface TooltipData {
  monthIdx: number;
  month: string;
  supply: number;
  demand: number;
  net: number;
  phase: string;
  phaseDesc: string;
  phaseColor: string;
}

interface SeasonalMarketCycleProps {
  supplyIndex?: number[];
  demandIndex?: number[];
  height?: number;
}

// Accept number[] or provenance-wrapped object. Returns flat number[12].
function parseIndex(raw: unknown, fallback: number[]): number[] {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    if (raw.length >= 12 && raw.every((v: unknown) => typeof v === 'number')) return raw as number[];
    // Handle { value: [...] } or { data: [...] } provenance wrappers
    const obj = raw as { value?: unknown[]; data?: unknown[] };
    if (Array.isArray(obj.value)) return (obj.value as number[]).slice(0, 12);
    if (Array.isArray(obj.data)) return (obj.data as number[]).slice(0, 12);
    return fallback;
  }
  return fallback;
}

const SeasonalMarketCycle: React.FC<SeasonalMarketCycleProps> = ({
  supplyIndex,
  demandIndex,
}) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } = useTooltip<TooltipData>();

  const supply = useMemo(() => parseIndex(supplyIndex, FALLBACK_SUPPLY), [supplyIndex]);
  const demand = useMemo(() => parseIndex(demandIndex, FALLBACK_DEMAND), [demandIndex]);
  const currentMonth = new Date().getMonth();

  // FE-225: Pure viewport coords for tooltip positioning (position:absolute below SVG)
  const svgRef = useRef<SVGSVGElement>(null);
  // FE-226+FE-225: Container ref for tooltip offset — must be top-level (Rules of Hooks)
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((monthIdx: number, clientX: number, clientY: number) => {
    const phase = getPhaseForMonth(monthIdx);
    showTooltip({
      tooltipData: {
        monthIdx,
        month: MONTHS[monthIdx],
        supply: supply[monthIdx],
        demand: demand[monthIdx],
        net: demand[monthIdx] - supply[monthIdx],
        phase: phase.name,
        phaseDesc: phase.desc,
        phaseColor: phase.color,
      },
      tooltipLeft: clientX + 12,
      tooltipTop: clientY - 10,
    });
    setTooltipOpen(true);
  }, [supply, demand, showTooltip]);

  const currentPhase = getPhaseForMonth(currentMonth);

  return (
    <ParentSize>
      {({ width, height }) => {
        if (width < 10) return null;

        // FE-226: Scale all radii proportionally to actual container size
        const maxDim = Math.max(width, height);
        const INNER_R = maxDim * 0.22;
        const OUTER_R = maxDim * 0.34;
        const INNER_BAND = maxDim * 0.09;
        const OUTER_BAND = maxDim * 0.08;
        const LABEL_R = maxDim * 0.42;
        const NEEDLE_LEN = INNER_R - 6;
        const GRID_RADII = [maxDim * 0.16, maxDim * 0.28, maxDim * 0.40, maxDim * 0.52];
        const needleAngleRad = (monthAngle(currentMonth) + 15 - 90) * (Math.PI / 180);

        const needleX = NEEDLE_LEN * Math.cos(needleAngleRad);
        const needleY = NEEDLE_LEN * Math.sin(needleAngleRad);

        // Supply segments
        const supplySegments = MONTHS.map((_, i) => {
          const startAngle = monthAngle(i);
          const endAngle = monthAngle(i + 1);
          const intensity = Math.max(0.08, supply[i] / 10);
          const phase = getPhaseForMonth(i);
          const outerR = INNER_R + INNER_BAND * intensity;
          const start = polarToCartesian(width / 2, height / 2, INNER_R, startAngle);
          const p1 = polarToCartesian(width / 2, height / 2, outerR, startAngle);
          const end = polarToCartesian(width / 2, height / 2, INNER_R, endAngle);
          const arc = arcPath(width / 2, height / 2, outerR, startAngle, endAngle);
          const arcInner = arcPath(width / 2, height / 2, INNER_R, endAngle, startAngle);
          const path = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${arc.slice(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)} ${arcInner.slice(1)} Z`;
          return { i, phase, intensity, path, isCurrent: i === currentMonth };
        });

        // Demand segments
        const demandSegments = MONTHS.map((_, i) => {
          const startAngle = monthAngle(i);
          const endAngle = monthAngle(i + 1);
          const intensity = Math.max(0.08, demand[i] / 10);
          const phase = getPhaseForMonth(i);
          const innerR = OUTER_R - OUTER_BAND * intensity;
          const start = polarToCartesian(width / 2, height / 2, innerR, startAngle);
          const p1 = polarToCartesian(width / 2, height / 2, OUTER_R, startAngle);
          const end = polarToCartesian(width / 2, height / 2, innerR, endAngle);
          const arc = arcPath(width / 2, height / 2, OUTER_R, startAngle, endAngle);
          const arcInner = arcPath(width / 2, height / 2, innerR, endAngle, startAngle);
          const path = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${arc.slice(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)} ${arcInner.slice(1)} Z`;
          return { i, phase, intensity, path, isCurrent: i === currentMonth };
        });

        return (
          <div ref={containerRef} className="relative w-full h-full">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Background grid rings */}
              {GRID_RADII.map(r => (
                <circle key={r} cx={width / 2} cy={height / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={0.5} strokeDasharray="2 4" />
              ))}

              {/* Supply ring (inner) */}
              {supplySegments.map(seg => (
                <path
                  key={`sup-${seg.i}`}
                  d={seg.path}
                  fill={seg.phase.color}
                  fillOpacity={seg.isCurrent ? 0.85 : 0.55}
                  stroke={seg.isCurrent ? '#ffffff' : 'none'}
                  strokeWidth={seg.isCurrent ? 1.5 : 0}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                  onMouseMove={(e) => handleMouseMove(seg.i, e.clientX, e.clientY)}
                  onMouseLeave={() => { hideTooltip(); setTooltipOpen(false); }}
                />
              ))}

              {/* Demand ring (outer) */}
              {demandSegments.map(seg => (
                <path
                  key={`dem-${seg.i}`}
                  d={seg.path}
                  fill={seg.phase.color}
                  fillOpacity={seg.isCurrent ? 0.75 : 0.35}
                  stroke={seg.isCurrent ? '#ffffff' : 'none'}
                  strokeWidth={seg.isCurrent ? 1.5 : 0}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                  onMouseMove={(e) => handleMouseMove(seg.i, e.clientX, e.clientY)}
                  onMouseLeave={() => { hideTooltip(); setTooltipOpen(false); }}
                />
              ))}

              {/* Month labels */}
              {MONTHS.map((_, i) => {
                const { x, y } = polarToCartesian(width / 2, height / 2, LABEL_R, monthAngle(i));
                const isCurrent = i === currentMonth;
                const fontSize = Math.max(8, Math.min(maxDim * 0.035, 12));
                return (
                  <text
                    key={`lbl-${i}`}
                    x={x} y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={isCurrent ? fontSize + 2 : fontSize}
                    fontWeight={isCurrent ? '800' : '500'}
                    fill={isCurrent ? '#ffffff' : '#94a3b8'}
                    style={{ fontFamily: 'inherit', letterSpacing: '0.06em' }}
                  >
                    {MONTHS[i]}
                  </text>
                );
              })}

              {/* Needle */}
              <line
                x1={width / 2} y1={height / 2}
                x2={width / 2 + needleX}
                y2={height / 2 + needleY}
                stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeOpacity={0.85}
              />
              <circle cx={width / 2} cy={height / 2} r={4} fill="#ffffff" fillOpacity={0.9} />
              <circle cx={width / 2 + needleX} cy={height / 2 + needleY} r={3} fill="#ffffff" fillOpacity={0.7} />

              {/* Center text */}
              <text x={width / 2} y={height / 2 - maxDim * 0.035} textAnchor="middle" fontSize={maxDim * 0.03} fontWeight="800" fill="#475569" style={{ letterSpacing: '0.12em' }}>MARKET CYCLE</text>
              <text x={width / 2} y={height / 2 + maxDim * 0.025} textAnchor="middle" fontSize={maxDim * 0.055} fontWeight="800" fill="#ffffff" style={{ letterSpacing: '-0.02em' }}>{MONTHS[currentMonth]}</text>
              <text x={width / 2} y={height / 2 + maxDim * 0.085} textAnchor="middle" fontSize={maxDim * 0.025} fill="#94a3b8" style={{ letterSpacing: '0.05em' }}>{currentPhase.name}</text>

              {/* Ring legend */}
              <rect x={width / 2 - maxDim * 0.09} y={height / 2 + maxDim * 0.13} width={6} height={6} rx={1} fill={currentPhase.color} fillOpacity={0.8} />
              <text x={width / 2 - maxDim * 0.06} y={height / 2 + maxDim * 0.145} textAnchor="start" fontSize={6} fill="#64748b" style={{ letterSpacing: '0.05em' }}>SUPPLY</text>
              <rect x={width / 2 + maxDim * 0.055} y={height / 2 + maxDim * 0.13} width={6} height={6} rx={1} fill={currentPhase.color} fillOpacity={0.4} />
              <text x={width / 2 + maxDim * 0.09} y={height / 2 + maxDim * 0.145} textAnchor="start" fontSize={6} fill="#64748b" style={{ letterSpacing: '0.05em' }}>DEMAND</text>
            </svg>

            {/* FE-225: Tooltip — position:absolute, parent-relative coords from container div */}
            {tooltipOpen && tooltipData && (
              <div
                className="visx-tooltip"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: `translate(${(tooltipLeft ?? 0) - (containerRef.current?.getBoundingClientRect().left ?? 0)}px, ${(tooltipTop ?? 0) - (containerRef.current?.getBoundingClientRect().top ?? 0)}px)`,
                  background: '#0f1923',
                  border: '1px solid #1e3a5f',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 11,
                  color: '#fff',
                  minWidth: 180,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  zIndex: 9999,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, color: tooltipData.phaseColor }}>
                  {tooltipData.month} — {tooltipData.phase}
                </div>
                {([
                  { label: 'Supply', value: tooltipData.supply.toFixed(1), color: '#3b82f6' },
                  { label: 'Demand', value: tooltipData.demand.toFixed(1), color: '#22c55e' },
                  { label: 'Net Balance', value: `${tooltipData.net >= 0 ? '+' : ''}${tooltipData.net.toFixed(1)}`, color: tooltipData.net >= 0 ? '#22c55e' : '#ef4444' },
                ] as const).map(row => (
                  <div key={row.label} style={{ color: '#94a3b8', marginBottom: 3, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ color: row.color }}>{row.label}</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{row.value}/10</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, borderTop: '1px solid #1e3a5f', paddingTop: 6, color: '#64748b', fontSize: 9, lineHeight: 1.5 }}>
                  {tooltipData.phaseDesc}
                </div>
              </div>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
};

export default SeasonalMarketCycle;

// FE-226+UX-050: Expose PHASES and currentPhase data for parent component's sidebar
export { PHASES };
export function getCurrentPhase(monthIdx: number) {
  return getPhaseForMonth(monthIdx);
}
