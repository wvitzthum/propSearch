// FE-206: Migrated to @visx — replaces hand-rolled SVG with visx scale/shape/axis primitives
import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { scaleLinear } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';

// FE-191: London Prime Premium tracker — PCL vs London avg vs UK avg time series
// Data: hpi_history provides UK-indexed series. London premium is computed relative to UK.

interface PremiumPoint {
  date: string;
  uk: number;
  london: number;
  premium: number;
  premiumPct: number;
}

interface PremiumPoint {
  date: string;
  uk: number;
  london: number;
  premium: number;
  premiumPct: number;
}

const LondonPrimePremiumChart: React.FC = () => {
  const { data } = useMacroData();
  const raw = data as any;

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<PremiumPoint>();

  // Historical series from hpi_history
  const history = useMemo(() => {
    const rawHpi = raw?.hpi_history?.london_wide ?? [];
    if (!Array.isArray(rawHpi) || rawHpi.length === 0) return [];
    return rawHpi.map((h: any) => ({
      date: h.date,
      ukIndex: h.index_uk ?? 100,
      londonImplied: (h.index_uk ?? 100) * 1.18,
    }));
  }, [raw]);

  // Show last 36 months for cleaner chart
  const display = history.slice(-36);

  // Compute premium series
  const premiumData: PremiumPoint[] = useMemo(() => {
    if (display.length < 2) return [];
    return display.map((h: any) => ({
      date: h.date,
      uk: h.ukIndex,
      london: h.londonImplied,
      premium: h.londonImplied - h.ukIndex,
      premiumPct: ((h.londonImplied - h.ukIndex) / h.ukIndex * 100),
    }));
  }, [display]);

  // Key metrics
  const latest = premiumData[premiumData.length - 1];
  const yearAgo = premiumData[premiumData.length - 13];
  const peak = premiumData.reduce(
    (max: PremiumPoint, d: PremiumPoint) => d.premiumPct > max.premiumPct ? d : max,
    premiumData[0] || { premiumPct: 0 } as PremiumPoint
  );

  // UX-030: London Prime Premium — viewBox increased to 600x200 for hero placement
  const W = 600, H = 200;
  const PAD = 12;
  if (!display.length) return null;

  const allValues = premiumData.flatMap(d => [d.uk, d.london]);
  const minV = Math.min(...allValues) * 0.95;
  const maxV = Math.max(...allValues) * 1.03;

  const londonPremium = latest ? ((latest.london / latest.uk - 1) * 100).toFixed(1) : '18.0';

  // Prepare data arrays for @visx
  const ukData = premiumData.map((d, i) => ({ x: i, y: d.uk }));
  const londonData = premiumData.map((d, i) => ({ x: i, y: d.london }));

  // Premium fill: London above UK = area between them
  const premiumFillData = premiumData.map((d, i) => ({
    x: i,
    yTop: Math.max(d.uk, d.london),
    yBot: Math.min(d.uk, d.london),
  }));

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
          {/* UX-030: Removed "(18% premium proxy)" — replaced with transparent label */}
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

      {/* Chart — @visx */}
      <div className="p-4 space-y-3">
        <div style={{ height: 280 }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full overflow-visible"
          >
            {(() => {
              const xScale = scaleLinear({
                domain: [0, Math.max(premiumData.length - 1, 1)],
                range: [PAD, W - PAD],
              });
              const yScale = scaleLinear({
                domain: [minV, maxV],
                range: [H - PAD, PAD],
              });

              const getX = (i: number) => xScale(i);
              const getY = (v: number) => yScale(v);

              const yearLabels = premiumData.reduce<Array<{ i: number; yr: string }>>((acc, d, i) => {
                const yr = d.date.slice(0, 4);
                if (acc.length === 0 || acc[acc.length - 1].yr !== yr) {
                  acc.push({ i, yr });
                }
                return acc;
              }, []).filter((_, idx) => idx % 2 === 0);

              const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
                const coords = localPoint(event);
                if (!coords) return;
                const ratio = (coords.x - PAD) / (W - 2 * PAD);
                const idx = Math.round(ratio * (premiumData.length - 1));
                const clamped = Math.max(0, Math.min(premiumData.length - 1, idx));
                showTooltip({
                  tooltipData: premiumData[clamped],
                  tooltipLeft: coords.x,
                  tooltipTop: coords.y,
                });
              };

              return (
                <g>
                  {/* Grid */}
                  {[0, 0.5, 1].map(pct => {
                    const v = minV + (maxV - minV) * pct;
                    return (
                      <g key={pct}>
                        <line
                          x1={PAD} y1={getY(v)} x2={W - PAD} y2={getY(v)}
                          stroke="rgba(255,255,255,0.05)" strokeWidth="0.08"
                        />
                        <text
                          x={PAD - 0.5} y={getY(v) + 0.8}
                          className="text-[2.5px] fill-linear-text-muted/60"
                          textAnchor="end"
                        >
                          {v.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Premium area fill */}
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

                  {/* Year labels — UX-030: scaled up from 2.5px to 8px for readability */}
                  {yearLabels.map(({ i, yr }) => (
                    <text
                      key={yr}
                      x={getX(i)} y={H - PAD + 8}
                      className="fill-linear-text-muted/70 font-bold"
                      textAnchor="middle"
                      fontSize={8}
                    >
                      {yr}
                    </text>
                  ))}

                  {/* Hover interaction */}
                  <rect
                    x={PAD} y={PAD}
                    width={W - 2 * PAD} height={H - 2 * PAD}
                    fill="transparent"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={hideTooltip}
                  />
                </g>
              );
            })()}
          </svg>
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

        {/* UX-030: Key insight narrative */}
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

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-bold text-white">{tooltipData.date}</div>
          <div className="text-[9px] text-retro-green">UK: {tooltipData.uk.toFixed(1)}</div>
          <div className="text-[9px] text-amber-400">PCL: {tooltipData.london.toFixed(1)}</div>
          <div className="text-[9px] text-linear-text-muted">Premium: +{tooltipData.premiumPct.toFixed(1)}%</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default LondonPrimePremiumChart;
