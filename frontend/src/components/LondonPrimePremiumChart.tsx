// FE-206: Migrated to @visx — replaces hand-rolled SVG with visx scale/shape/axis primitives
// VISX-024–028: Full visx migration (ParentSize, Group, GridRows), peak marker, trend annotation,
//               UK=100 baseline, Y-axis context, expanded tooltip with MoM change
import React, { useMemo, useState, useCallback } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { scaleLinear } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';

// FE-191: London Prime Premium tracker — PCL vs London avg vs UK avg time series
// Data: hpi_history provides UK-indexed series. London premium is computed relative to UK.

interface PremiumPoint {
  date: string;        // "YYYY-MM"
  uk: number;           // UK HPI index (UK=100)
  london: number;       // PCL implied index
  premium: number;      // london - uk
  premiumPct: number;  // % above UK
  ukMoM?: number;       // UK month-on-month change (pct pts)
  londonMoM?: number;  // London month-on-month change (pct pts)
}

interface TooltipState {
  point: PremiumPoint;
  idx: number;
}

const MARGIN = { top: 16, right: 48, bottom: 40, left: 8 };
const INNER_HEIGHT = 200;

const LondonPrimePremiumChart: React.FC = () => {
  const { data } = useMacroData();
  const raw = data as any;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<TooltipState>();

  // Historical series from hpi_history.data
  // Schema: { date, london_hpi, uk_hpi, london_vs_uk_pct } — 2015-01 to 2026-01
  const history = useMemo(() => {
    const rawHpi: any[] = raw?.hpi_history?.data ?? [];
    if (!Array.isArray(rawHpi) || rawHpi.length === 0) return [];
    return rawHpi.map((h: any, _i: number, arr: any[]) => {
      const prev = _i > 0 ? arr[_i - 1] : null;
      return {
        date: h.date,
        ukIndex: h.uk_hpi ?? 100,
        londonIndex: h.london_hpi ?? h.uk_hpi ?? 100,
        premiumPct: h.london_vs_uk_pct ?? 0,
        ukMoM: prev ? ((h.uk_hpi - (prev.uk_hpi ?? h.uk_hpi)) / (prev.uk_hpi ?? h.uk_hpi)) * 100 : 0,
        londonMoM: prev
          ? ((h.london_hpi - (prev.london_hpi ?? h.uk_hpi)) / (prev.london_hpi ?? h.uk_hpi ?? h.uk_hpi)) * 100
          : 0,
      };
    });
  }, [raw]);

  // Show last 36 months for cleaner chart
  const display = history.slice(-36);

  // Compute premium series — use pre-computed london_vs_uk_pct from data
  const premiumData: PremiumPoint[] = useMemo(() => {
    if (display.length < 2) return [];
    return display.map((h) => ({
      date: h.date,
      uk: h.ukIndex,
      london: h.londonIndex,
      premium: h.londonIndex - h.ukIndex,
      premiumPct: h.premiumPct,
      ukMoM: h.ukMoM,
      londonMoM: h.londonMoM,
    }));
  }, [display]);

  // Key metrics
  const latest = premiumData[premiumData.length - 1];
  const yearAgo = premiumData[premiumData.length - 13];
  const peak = premiumData.reduce(
    (max: PremiumPoint, d: PremiumPoint) => d.premiumPct > max.premiumPct ? d : max,
    premiumData[0] || { premiumPct: 0 } as PremiumPoint
  );
  const peakIdx = premiumData.findIndex(d => d.date === peak.date);

  const londonPremium = latest ? ((latest.london / latest.uk - 1) * 100).toFixed(1) : '18.0';

  // Prepare data arrays for @visx LinePath
  const ukData = premiumData.map((d, i) => ({ x: i, y: d.uk }));
  const londonData = premiumData.map((d, i) => ({ x: i, y: d.london }));

  // Premium fill: London above UK = area between them
  const premiumFillData = premiumData.map((d, i) => ({
    x: i,
    yTop: Math.max(d.uk, d.london),
    yBot: Math.min(d.uk, d.london),
  }));

  // ── Inner chart (receives width from ParentSize) ─────────────────────────────
  const ChartInner: React.FC<{ width: number }> = ({ width }) => {
    const innerW = Math.max(width - MARGIN.left - MARGIN.right, 80);
    const xScale = scaleLinear({
      domain: [0, Math.max(premiumData.length - 1, 1)],
      range: [0, innerW],
    });

    const allValues = premiumData.flatMap(d => [d.uk, d.london]);
    const minV = allValues.length ? Math.min(...allValues) * 0.97 : 140 * 0.97;
    const maxV = allValues.length ? Math.max(...allValues) * 1.03 : 180 * 1.03;

    const yScale = scaleLinear({
      domain: [minV, maxV],
      range: [INNER_HEIGHT - MARGIN.top - MARGIN.bottom, 0],
      nice: true,
    });

    const getX = (i: number) => xScale(i) ?? 0;
    const getY = (v: number) => yScale(v) ?? 0;

    // VISX-027: UK=100 baseline (horizontal dashed line at y=100)
    const uk100Y = getY(100);
    const hasUk100 = minV < 100 && maxV > 100;

    // VISX-025: peak marker x
    const peakX = getX(peakIdx);

    // VISX-026: trend direction on right edge (last 3 points slope)
    const trendEnd = premiumData.slice(-3);
    const trendSlope = trendEnd.length >= 2
      ? (trendEnd[trendEnd.length - 1].london - trendEnd[0].london) / (trendEnd.length - 1)
      : 0;

    // Year labels on x-axis
    const yearLabels = premiumData.reduce<Array<{ i: number; yr: string }>>((acc, d, i) => {
      const yr = d.date.slice(0, 4);
      if (acc.length === 0 || acc[acc.length - 1].yr !== yr) {
        acc.push({ i, yr });
      }
      return acc;
    }, []).filter((_, idx) => idx % 2 === 0);

    // Y-axis tick values
    const numTicks = 3;
    const yTicks = Array.from({ length: numTicks + 1 }, (_, k) =>
      minV + ((maxV - minV) / numTicks) * k
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGRectElement>) => {
        const svgEl = e.currentTarget.ownerSVGElement as SVGSVGElement;
        if (!svgEl) return;
        const rel = localPoint(e);
        if (!rel) return;
        const svgRect = svgEl.getBoundingClientRect();
        const xInSvg = e.clientX - svgRect.left;
        const xInGroup = xInSvg - MARGIN.left;
        const step = innerW / (premiumData.length - 1);
        const idx = Math.max(0, Math.min(Math.round(xInGroup / step), premiumData.length - 1));
        setHoverIdx(idx);
        const point = premiumData[idx];
        showTooltip({
          tooltipData: { point, idx },
          tooltipLeft: rel.x,
          tooltipTop: rel.y - 40,
        });
      },
      [innerW, premiumData, xScale, showTooltip]
    );

    return (
      <svg
        width={width}
        height={INNER_HEIGHT}
        data-testid="london-premium-svg"
      >
        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Grid rows — @visx GridRows */}
          <GridRows
            scale={yScale}
            width={innerW}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.5}
            numTicks={numTicks}
          />

          {/* VISX-027: UK=100 baseline annotation */}
          {hasUk100 && (
            <g>
              <line
                x1={0} y1={uk100Y}
                x2={innerW} y2={uk100Y}
                stroke="rgba(161,161,170,0.4)"
                strokeWidth={0.5}
                strokeDasharray="3,2"
              />
              <text
                x={innerW + 4}
                y={uk100Y + 3}
                fill="rgba(161,161,170,0.6)"
                fontSize={8}
                fontWeight={700}
                fontFamily="inherit"
              >
                UK=100
              </text>
            </g>
          )}

          {/* Y-axis labels */}
          {yTicks.map((tickVal) => (
            <text
              key={tickVal}
              x={innerW + 4}
              y={getY(tickVal) + 3}
              fill="rgba(161,161,170,0.6)"
              fontSize={8}
              fontWeight={700}
              fontFamily="inherit"
            >
              {tickVal.toFixed(0)}
            </text>
          ))}

          {/* Premium area fill — @visx AreaClosed */}
          <AreaClosed
            data={premiumFillData}
            x={d => getX(d.x)}
            y0={d => getY(d.yBot)}
            y1={d => getY(d.yTop)}
            yScale={yScale}
            fill="#f59e0b"
            opacity={0.07}
          />

          {/* UK index line — @visx LinePath */}
          <LinePath
            data={ukData}
            x={d => getX(d.x)}
            y={d => getY(d.y)}
            stroke="#22c55e"
            strokeWidth={0.8}
            strokeLinecap="round"
          />

          {/* London (PCL) implied line — @visx LinePath */}
          <LinePath
            data={londonData}
            x={d => getX(d.x)}
            y={d => getY(d.y)}
            stroke="#f59e0b"
            strokeWidth={0.9}
            strokeLinecap="round"
          />

          {/* VISX-025: Peak premium marker — diamond + label */}
          {peakIdx >= 0 && (
            <g>
              <line
                x1={peakX} y1={0}
                x2={peakX} y2={INNER_HEIGHT - MARGIN.top - MARGIN.bottom}
                stroke="rgba(245,158,11,0.35)"
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <polygon
                points={`${peakX},${getY(peak.london) - 6} ${peakX + 5},${getY(peak.london)} ${peakX},${getY(peak.london) + 6} ${peakX - 5},${getY(peak.london)}`}
                fill="#f59e0b"
                opacity={0.85}
              />
              <text
                x={peakX}
                y={getY(peak.london) - 10}
                fill="#f59e0b"
                fontSize={7}
                fontWeight={800}
                fontFamily="inherit"
                textAnchor="middle"
              >
                Peak {peak.premiumPct.toFixed(1)}%
              </text>
            </g>
          )}

          {/* VISX-026: Trend direction annotation — right edge */}
          {latest && (
            <g>
              {trendSlope > 0.05 ? (
                <>
                  <polygon
                    points={`${innerW - 4},${INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 24} ${innerW - 10},${INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 10} ${innerW + 2},${INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 10}`}
                    fill="#22c55e"
                    opacity={0.7}
                  />
                  <text
                    x={innerW - 4}
                    y={INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 30}
                    fill="rgba(34,197,94,0.7)"
                    fontSize={7}
                    fontWeight={700}
                    fontFamily="inherit"
                    textAnchor="end"
                  >
                    Rising
                  </text>
                </>
              ) : trendSlope < -0.05 ? (
                <>
                  <polygon
                    points={`${innerW - 4},${INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 10} ${innerW - 10},${INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 24} ${innerW + 2},${INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 24}`}
                    fill="#f43f5e"
                    opacity={0.7}
                  />
                  <text
                    x={innerW - 4}
                    y={INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 30}
                    fill="rgba(244,63,94,0.7)"
                    fontSize={7}
                    fontWeight={700}
                    fontFamily="inherit"
                    textAnchor="end"
                  >
                    Falling
                  </text>
                </>
              ) : (
                <text
                  x={innerW - 4}
                  y={INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 24}
                  fill="rgba(161,161,170,0.5)"
                  fontSize={7}
                  fontWeight={700}
                  fontFamily="inherit"
                  textAnchor="end"
                >
                  Flat
                </text>
              )}
            </g>
          )}

          {/* Hover column indicator */}
          {hoverIdx !== null && (
            <line
              x1={getX(hoverIdx)} y1={0}
              x2={getX(hoverIdx)} y2={INNER_HEIGHT - MARGIN.top - MARGIN.bottom}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={0.5}
            />
          )}

          {/* Year labels */}
          {yearLabels.map(({ i, yr }) => (
            <text
              key={yr}
              x={getX(i)} y={INNER_HEIGHT - MARGIN.top - MARGIN.bottom + 14}
              fill="rgba(161,161,170,0.6)"
              fontSize={8}
              fontWeight={700}
              fontFamily="inherit"
              textAnchor="middle"
            >
              {yr}
            </text>
          ))}

          {/* Invisible hit area */}
          <rect
            x={0} y={0}
            width={innerW}
            height={INNER_HEIGHT - MARGIN.top - MARGIN.bottom}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setHoverIdx(null); hideTooltip(); }}
          />
        </Group>
      </svg>
    );
  };

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">London Prime Premium</h3>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1">
            <div className="h-1 w-3 rounded-full bg-retro-green" />
            <span className="text-[8px] text-linear-text-muted">UK Index</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-3 rounded-full bg-amber-400" />
            <span className="text-[8px] text-linear-text-muted">PCL Implied</span>
          </div>
          <span className="text-[8px] text-linear-text-muted ml-1">vs UK</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="px-4 py-2 border-b border-white/5 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">PCL Premium</div>
          <div className="text-xl font-bold text-amber-400 tracking-tighter">+{londonPremium}%</div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">12M Change</div>
          <div className={`text-xl font-bold tracking-tighter ${(latest?.premiumPct ?? 18) > (yearAgo?.premiumPct ?? 18) ? 'text-retro-green' : 'text-rose-400'}`}>
            {yearAgo ? ((latest?.premiumPct - yearAgo.premiumPct) > 0 ? '+' : '') + (latest?.premiumPct - yearAgo.premiumPct).toFixed(1) + 'pp' : '—'}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Peak</div>
          <div className="text-xl font-bold text-white tracking-tighter">{peak?.premiumPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Chart — @visx via ParentSize */}
      <div className="p-4 space-y-3">
        <div style={{ height: INNER_HEIGHT }}>
          <ParentSize>
            {({ width }) => width > 0 ? <ChartInner width={width} /> : null}
          </ParentSize>
        </div>

        {/* Premium delta bar */}
        {latest && yearAgo && (
          <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center justify-between">
            <span className="text-[8px] text-linear-text-muted font-bold uppercase">YoY Premium Δ</span>
            <span className={`text-[10px] font-black ${(latest.premiumPct - yearAgo.premiumPct) >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
              {(latest.premiumPct - yearAgo.premiumPct) >= 0 ? '+' : ''}{(latest.premiumPct - yearAgo.premiumPct).toFixed(1)}pp
            </span>
          </div>
        )}

        {/* Key insight narrative */}
        {latest && (
          <div className="p-3 bg-linear-bg rounded-lg border border-linear-border">
            <div className="text-[10px] text-linear-text-muted leading-relaxed">
              <span className="text-amber-400 font-bold">PCL premium </span>
              vs UK benchmark is currently
              <span className="text-white font-bold ml-1">+{londonPremium}%</span>
              {latest.premiumPct > 15 ? (
                <span>. London prime continues to command a significant structural premium.</span>
              ) : latest.premiumPct > 10 ? (
                <span>. Premium compressing — value emerging vs historical peak.</span>
              ) : (
                <span>. Premium narrowing — London prime increasingly aligns with UK-wide trends.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono">PCL vs UK Index · UK=100</span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono">Source: HM Land Registry</span>
      </div>

      {/* Tooltip — VISX-028: expanded with MoM change and date formatting */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-bold text-white">
            {/* VISX-028: formatted date */}
            {(() => {
              const parts = tooltipData.point.date.split('-');
              const yr = parts[0];
              const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const monthIdx = parseInt(parts[1], 10) - 1;
              return `${monthNames[monthIdx]} ${yr}`;
            })()}
          </div>
          <div className="text-[9px] text-retro-green">UK: {tooltipData.point.uk.toFixed(1)}</div>
          <div className="text-[9px] text-amber-400">PCL: {tooltipData.point.london.toFixed(1)}</div>
          <div className="text-[9px] text-linear-text-muted">Premium: +{tooltipData.point.premiumPct.toFixed(1)}%</div>
          {/* VISX-028: MoM changes */}
          {tooltipData.point.ukMoM !== undefined && tooltipData.point.londonMoM !== undefined && (
            <div className="mt-1 pt-1 border-t border-white/10">
              <div className="text-[8px] text-linear-text-muted/60">MoM change</div>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[9px] text-retro-green">
                  UK {tooltipData.point.ukMoM >= 0 ? '+' : ''}{tooltipData.point.ukMoM.toFixed(2)}%
                </span>
                <span className="text-[9px] text-amber-400">
                  PCL {tooltipData.point.londonMoM >= 0 ? '+' : ''}{tooltipData.point.londonMoM.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default LondonPrimePremiumChart;
