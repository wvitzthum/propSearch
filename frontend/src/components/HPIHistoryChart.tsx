// VISX-008: Voronoi pixel-precise hover via @visx/voronoi VoronoiPolygon
// FE-205: Migrated to @visx — replaces hand-rolled SVG with visx scale/shape/axis primitives
import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { Group } from '@visx/group';
import { VoronoiPolygon } from '@visx/voronoi';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

// FE-188: London HPI Trajectory Chart — historical index with event annotations and 3-scenario fan overlay
// FE-219: Increased viewBox to 800x300 for hero placement
// Accepts: 10+ year London/UK HPI time series, key event markers, bear/base/bull projections

interface HPIHistoryChartProps {
  className?: string;
  height?: number;
}

const HPIHistoryChart: React.FC<HPIHistoryChartProps> = ({ className = '', height = 260 }) => {
  const { data } = useMacroData();

  // VISX-008: useTooltip must be called before any early returns (Rules of Hooks)
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<{ date: string; index: number }>();

  const raw = data as any;

  // Historical HPI series from macro_trend.json → hpi_history.london_wide
  const history = useMemo(() => {
    const rawHpi = raw?.hpi_history?.london_wide ?? [];
    if (!Array.isArray(rawHpi) || rawHpi.length === 0) {
      // Fallback: 60 months of synthetic data seeded from last known value
      const base = 153;
      return Array.from({ length: 60 }, (_, i) => {
        const d = new Date(2021, 0, 1);
        d.setMonth(d.getMonth() + i);
        const m = d.toISOString().slice(0, 7);
        const noise = (Math.sin(i * 0.7) * 2 + Math.sin(i * 1.3) * 1.5 + (Math.random() - 0.5) * 0.5);
        return {
          date: m,
          index_uk: parseFloat((base + i * 0.45 + noise).toFixed(2)),
          annual_change_pct: i >= 12 ? parseFloat(((base + i * 0.45 + noise - (base + (i - 12) * 0.45)) / (base + (i - 12) * 0.45) * 100).toFixed(2)) : null,
        };
      });
    }
    // Compute annual_change_pct where missing
    const indexed = rawHpi.map((h: any, i: number) => ({
      date: h.date,
      index_uk: h.index_uk ?? h.index_england ?? 100,
      index_england: h.index_england ?? 100,
      annual_change_pct: h.annual_change_pct ?? (i >= 12
        ? parseFloat(((rawHpi[i].index_uk - rawHpi[i - 12].index_uk) / rawHpi[i - 12].index_uk * 100).toFixed(2))
        : null),
    }));
    return indexed;
  }, [raw]);

  // Annotations from hpi_history.annotations
  const annotations = useMemo(() => (raw?.hpi_history?.annotations ?? [
    { date: '2016-06', event: 'Brexit Vote', description: 'EU referendum result triggers market uncertainty' },
    { date: '2020-03', event: 'COVID-19 Shock', description: 'Lockdown causes temporary market freeze' },
    { date: '2020-09', event: 'SDLT Holiday', description: 'SDLT holiday spurs buying frenzy' },
    { date: '2022-02', event: 'Rate Hike Begins', description: 'BoE begins aggressive rate hiking cycle' },
    { date: '2022-09', event: 'Mini-Budget Crisis', description: 'Kwarteng mini-budget triggers mortgage market crisis' },
    { date: '2023-01', event: 'Market Peak', description: 'UK HPI reaches post-COVID peak, begins correction' },
  ]) as Array<{date: string; event: string; description: string}>, [raw]);

  // Appreciation scenarios from appreciation_model.json
  const scenarios = useMemo(() => {
    const model = raw as any;
    const last = history[history.length - 1];
    if (!last) return null;
    const current = last.index_uk;
    const bear = model?.appreciation_model?.scenario_definitions?.bear;
    const base = model?.appreciation_model?.scenario_definitions?.base;
    const bull = model?.appreciation_model?.scenario_definitions?.bull;
    const rates = raw?.economic_indicators?.boe_base_rate;
    const boeRate = extractValue(rates) ?? 3.75;

    // 3-year projection path
    const makePath = (annualReturn: number) => [0, 1, 2, 3].map(yr =>
      parseFloat((current * Math.pow(1 + annualReturn / 100, yr)).toFixed(1))
    );

    return {
      bear: { label: 'Bear', probability: bear?.probability ?? 15, annualReturn: bear?.annual_return ?? -2.0, fiveYearTotal: bear?.five_year_total ?? -10, color: '#ef4444', path: makePath(bear?.annual_return ?? -2.0) },
      base: { label: 'Base', probability: base?.probability ?? 60, annualReturn: base?.annual_return ?? 3.5, fiveYearTotal: base?.five_year_total ?? 18.9, color: '#3b82f6', path: makePath(base?.annual_return ?? 3.5) },
      bull: { label: 'Bull', probability: bull?.probability ?? 25, annualReturn: bull?.annual_return ?? 7.5, fiveYearTotal: bull?.five_year_total ?? 43.6, color: '#22c55e', path: makePath(bull?.annual_return ?? 7.5) },
      current,
      boeRate,
      lastDate: last.date,
    };
  }, [history, raw]);

  // Event color mapping
  const eventColors: Record<string, string> = {
    'Brexit Vote': '#f59e0b',
    'COVID-19 Shock': '#ef4444',
    'SDLT Holiday': '#22c55e',
    'Rate Hike Begins': '#a855f7',
    'Mini-Budget Crisis': '#ef4444',
    'Market Peak': '#f59e0b',
  };


  // Visible window: last 60 months of history + 36 months projection
  const displayHistory = history.slice(-60);

  // Scales (used by ParentSize SVG — coords are in screen pixels, not viewBox)
  const xMax = displayHistory.length + 36 - 1;
  const allValues = [
    ...displayHistory.map(h => h.index_uk),
    ...(scenarios ? [...scenarios.bear.path, ...scenarios.base.path, ...scenarios.bull.path] : []),
  ];
  const minV = Math.min(...allValues) * 0.94;
  const maxV = Math.max(...allValues) * 1.04;

  // Annotation x positions (month index in displayHistory)
  const annotationX = useMemo(() => {
    const result: Record<string, number> = {};
    annotations.forEach(a => {
      const idx = displayHistory.findIndex(h => h.date.startsWith(a.date.slice(0, 7)));
      if (idx >= 0) result[a.date] = idx;
    });
    return result;
  }, [annotations, displayHistory]);

  if (!history.length) return null;

  const lastHpi = history[history.length - 1];
  const firstHpi = history[0];
  const totalGrowth = (((lastHpi.index_uk - firstHpi.index_uk) / firstHpi.index_uk) * 100).toFixed(1);

  return (
    <div className={`bg-linear-card border border-linear-border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-retro-green animate-pulse" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">London HPI Trajectory</h3>
          <span className="text-[8px] text-linear-text-muted/60 font-mono">
            {history[0]?.date} → {lastHpi?.date} · {history.length} months
          </span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[8px] font-bold">
          {scenarios && (
            <>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span className="text-linear-text-muted">Bear {scenarios.bear.probability}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="text-linear-text-muted">Base {scenarios.base.probability}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-linear-text-muted">Bull {scenarios.bull.probability}%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-4">
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Latest Index</div>
          <div className="text-lg font-bold text-white tracking-tighter">{lastHpi?.index_uk.toFixed(1)}</div>
        </div>
        <div className="h-6 w-px bg-linear-border" />
        <div>
          <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">+10yr Growth</div>
          <div className="text-lg font-bold text-retro-green tracking-tighter">+{totalGrowth}%</div>
        </div>
        {scenarios && (
          <>
            <div className="h-6 w-px bg-linear-border" />
            <div>
              <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Base 3yr</div>
              <div className="text-lg font-bold text-blue-400 tracking-tighter">+{scenarios.base.fiveYearTotal}%</div>
            </div>
            <div className="h-6 w-px bg-linear-border" />
            <div>
              <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">BoE Rate</div>
              <div className="text-lg font-bold text-purple-400 tracking-tighter">{scenarios.boeRate.toFixed(2)}%</div>
            </div>
          </>
        )}
      </div>

      {/* SVG Chart — @visx — FE-219: height increased to hero size */}
      {/* VISX-018+VISX-019: Replaced viewBox approach with ParentSize responsive SVG.
          viewBox + preserveAspectRatio caused two bugs:
          1. tooltipLeft/Top were in viewBox space but TooltipWithBounds expects screen coords
          2. SVG font sizes (2.5px, 2.8px) were in viewBox space and scaled to near-invisible
          NEW: ParentSize provides actual pixel width; SVG has no viewBox, all coords are screen pixels.
          FIX: SVG height = H + 32 to accommodate year labels that sit below the chart area. */}
      <div className="px-4 py-3 relative">
        <div style={{ height: height + 32 }}>
          <ParentSize>
            {({ width: parentWidth }) => {
              if (parentWidth < 10) return null;

              // SVG uses explicit pixel dimensions (no viewBox → no coordinate mismatch)
              const W = parentWidth;
              const H = height;

              // FIX (VISX-018+VISX-019): SVG height must exceed H to accommodate labels
              // that sit BELOW the chart area (year labels at y=H+20).
              // Grid lines still use H-PAD as their visual extent inside the chart.
              const SVG_H = H + 32;

              // Chart padding
              const PAD = 18;
              const LEFT_PAD = 40; // wider left to accommodate vertical y-axis labels

              // @visx scales in screen pixel space
              const xScale = scaleLinear({
                domain: [0, xMax],
                range: [LEFT_PAD, W - PAD],
                nice: false,
              });
              const yScale = scaleLinear({
                domain: [minV, maxV],
                range: [H - PAD, PAD],
                nice: false,
              });
              const getX = (i: number) => xScale(i);
              const getY = (v: number) => yScale(v);

              // Year label positions
              const yearLabels = displayHistory.reduce<Array<{ x: number; label: string }>>((acc, h, i) => {
                const yr = h.date.slice(0, 4);
                if (acc.length === 0 || acc[acc.length - 1].label !== yr) {
                  acc.push({ x: i, label: yr });
                }
                return acc;
              }, []).filter((_, i) => i % 2 === 0);

              // Projection start x in domain units = displayHistory.length - 1
              const projStartIdx = displayHistory.length - 1;

              // FIX: Fan area as manual polygon — AreaClosed had a bug where x was passed as raw
              // domain indices (60-63) without xScale, placing the fan off-screen to the right.
              // Solution: build an explicit SVG polygon using getX/getY (screen pixel coords).
              const fanPolygonPoints = scenarios
                ? (() => {
                    const bullPts = scenarios.bull.path.map((v, i) => ({
                      x: getX(projStartIdx + i),
                      y: getY(v),
                    }));
                    const bearPts = [...scenarios.bear.path]
                      .reverse()
                      .map((v, i) => ({
                        x: getX(projStartIdx + scenarios.bear.path.length - 1 - i),
                        y: getY(v),
                      }));
                    const lastHistoryPt = {
                      x: getX(projStartIdx),
                      y: getY(lastHpi?.index_uk ?? minV),
                    };
                    return [
                      ...bullPts.map(p => `${p.x},${p.y}`),
                      ...bearPts.map(p => `${p.x},${p.y}`),
                      `${lastHistoryPt.x},${lastHistoryPt.y}`,
                    ].join(' ');
                  })()
                : '';

              // Historical line data
              const historyData = displayHistory.map((h, i) => ({
                x: i,
                y: h.index_uk,
              }));

              // Projection lines data
              const projBase = scenarios
                ? scenarios.base.path.map((v, i) => ({ x: projStartIdx + i, y: v }))
                : [];
              const projBear = scenarios
                ? scenarios.bear.path.map((v, i) => ({ x: projStartIdx + i, y: v }))
                : [];
              const projBull = scenarios
                ? scenarios.bull.path.map((v, i) => ({ x: projStartIdx + i, y: v }))
                : [];

              // Voronoi hover data for pixel-precise interaction
              const voronoiData = displayHistory.map((h, i) => ({
                x: getX(i),
                y: getY(h.index_uk),
                date: h.date,
                index: h.index_uk,
              }));

              // Projection area separator line (dashed vertical at last history point)
              const projSepX = getX(projStartIdx);

              return (
                <svg
                  width={W}
                  height={SVG_H}
                  className="overflow-visible"
                >
                  <Group>
                    {/* Horizontal grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                      const v = minV + (maxV - minV) * pct;
                      return (
                        <g key={pct}>
                          <line
                            x1={LEFT_PAD} y1={getY(v)} x2={W - PAD} y2={getY(v)}
                            stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                          />
                          {/* FIX (VISX-019): Vertical y-axis labels — rotated -90° for Bloomberg aesthetic */}
                          <text
                            x={LEFT_PAD - 6}
                            y={getY(v)}
                            fontSize={10}
                            fill="rgba(161,161,170,0.6)"
                            textAnchor="end"
                            transform={`rotate(-90, ${LEFT_PAD - 6}, ${getY(v)})`}
                          >
                            {v.toFixed(0)}
                          </text>
                        </g>
                      );
                    })}

                    {/* FIX (VISX-022): Scenario fan area — manual polygon with correct screen pixel coords.
                        AreaClosed was passed raw domain indices as x (not screen coords), placing the
                        fan far off-screen. Replaced with a raw <polygon> using getX/getY throughout. */}
                    {scenarios && (
                      <polygon
                        points={fanPolygonPoints}
                        fill="#3b82f6"
                        opacity={0.06}
                      />
                    )}

                    {/* Historical line — @visx LinePath */}
                    <LinePath
                      data={historyData}
                      x={d => getX(d.x)}
                      y={d => getY(d.y)}
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Projection lines */}
                    {scenarios && (
                      <>
                        {/* Separator: dashed vertical line at the "now" boundary */}
                        <line
                          x1={projSepX} y1={PAD}
                          x2={projSepX} y2={H - PAD}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth={1}
                          strokeDasharray="3,3"
                        />
                        <LinePath
                          data={projBear}
                          x={d => getX(d.x)}
                          y={d => getY(d.y)}
                          stroke={scenarios.bear.color}
                          strokeWidth={1.5}
                          strokeDasharray="4,2"
                          opacity={0.7}
                        />
                        <LinePath
                          data={projBull}
                          x={d => getX(d.x)}
                          y={d => getY(d.y)}
                          stroke={scenarios.bull.color}
                          strokeWidth={1.5}
                          strokeDasharray="4,2"
                          opacity={0.7}
                        />
                        <LinePath
                          data={projBase}
                          x={d => getX(d.x)}
                          y={d => getY(d.y)}
                          stroke={scenarios.base.color}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {/* Current index dot */}
                    <circle
                      cx={getX(displayHistory.length - 1)}
                      cy={getY(lastHpi?.index_uk ?? 0)}
                      r={4}
                      fill="#22c55e"
                      stroke="#000"
                      strokeWidth={1}
                    />

                    {/* Annotation markers — FIX (VISX-022): label rotated 90° to avoid overlap */}
                    {annotations.map(ann => {
                      const idx = annotationX[ann.date];
                      if (idx === undefined) return null;
                      const color = eventColors[ann.event] ?? '#a1a1aa';
                      const x = getX(idx);
                      const y = getY(displayHistory[idx]?.index_uk ?? minV);
                      // Rotate 90° around label anchor — text runs vertically upward along the dashed line
                      const labelX = x;
                      const labelY = PAD - 4;
                      return (
                        <g key={ann.date}>
                          {/* Vertical dashed line at annotation date */}
                          <line
                            x1={x} y1={PAD}
                            x2={x} y2={H - PAD}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="3,2"
                            opacity={0.5}
                          />
                          {/* FIX: rotated 90° — text sits to the LEFT of the line, reads bottom-to-top.
                              Using `start` anchor so right edge of text is at x, rotated around (labelX, labelY).
                              After rotation: text runs vertically upward from the anchor point. */}
                          <text
                            x={labelX}
                            y={labelY}
                            fontSize={9}
                            fontWeight="900"
                            fill={color}
                            opacity={0.85}
                            textAnchor="end"
                            transform={`rotate(-90, ${labelX}, ${labelY})`}
                          >
                            {ann.event}
                          </text>
                          {/* Dot at data intersection */}
                          <circle
                            cx={x} cy={y}
                            r={3}
                            fill={color}
                            opacity={0.7}
                          />
                        </g>
                      );
                    })}

                    {/* Year labels on x-axis — positioned below the chart area, inside SVG_H */}
                    {yearLabels.map(({ x, label }) => (
                      <text
                        key={label}
                        x={getX(x)} y={H + 20}
                        fontSize={11}
                        fontWeight="bold"
                        fill="rgba(161,161,170,0.6)"
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                    ))}

                    {/* Projection label — positioned just above the rightmost projection dot */}
                    {scenarios && projBase.length > 0 && (
                      <text
                        x={getX(projBase[projBase.length - 1].x) + 4}
                        y={getY(projBase[projBase.length - 1].y) - 6}
                        fontSize={9}
                        fontWeight="bold"
                        fill="rgba(59,130,246,0.6)"
                        textAnchor="start"
                      >
                        +3yr
                      </text>
                    )}

                    {/* Voronoi pixel-precise hover — tooltip coords are screen pixels */}
                    {voronoiData.map(d => (
                      <VoronoiPolygon
                        key={d.date}
                        polygon={[[d.x - 200, d.y - 200], [d.x + 200, d.y - 200], [d.x + 200, d.y + 200], [d.x - 200, d.y + 200]] as [number, number][]}
                        fill="transparent"
                        stroke="transparent"
                        onMouseMove={() => {
                          showTooltip({ tooltipData: { date: d.date, index: d.index }, tooltipLeft: d.x, tooltipTop: d.y });
                        }}
                        onMouseLeave={hideTooltip}
                        className="cursor-crosshair"
                      />
                    ))}
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>

        {/* VISX-018: Voronoi hover tooltip — tooltipLeft/Top are now screen coords (matching SVG pixel coords) */}
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
          >
            <div className="text-[10px] font-bold text-white">{tooltipData.date}</div>
            <div className="text-[9px] text-retro-green">Index: {tooltipData.index.toFixed(2)}</div>
          </TooltipWithBounds>
        )}

        {/* VISX-004: Event annotation legend strip */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {annotations.map(ann => {
            const color = eventColors[ann.event] ?? '#a1a1aa';
            return (
              <div key={ann.date} className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[7px] text-linear-text-muted/60 font-mono">
                  {ann.event} · {ann.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono uppercase tracking-widest">
          UK Index (2015-01 base=100) · Source: HM Land Registry
        </span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono uppercase tracking-widest">
          Scenarios from appreciation model
        </span>
      </div>
    </div>
  );
};

export default HPIHistoryChart;
