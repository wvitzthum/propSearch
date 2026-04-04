import React, { useMemo, useState, useCallback } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear, scalePoint } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';

// FE-xxx prototype: BoERatePathChart migrated to @visx
// Replaces hand-rolled SVG with visx scale/shape/grid primitives

interface Scenario {
  label: string;
  color: string;
  path: number[];
}

interface TooltipData {
  quarter: string;
  bear: number;
  base: number;
  bull: number;
}

const MARGIN = { top: 12, right: 8, bottom: 40, left: 32 };
const QUARTERS = ['Now', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'];
const INNER_HEIGHT = 140;

const SCENARIO_COLORS = {
  bear: '#ef4444',
  base: '#3b82f6',
  bull: '#22c55e',
} as const;

const MPC_POSITIONS = [
  { qIndex: 1, label: 'May' },
  { qIndex: 2, label: 'Jun' },
  { qIndex: 3, label: 'Aug' },
  { qIndex: 4, label: 'Sep' },
];

function BoEChart({ width }: { width: number }) {
  const { data } = useMacroData();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<TooltipData>();

  const consensus = data?.boe_rate_consensus;
  const currentRate = extractValue(consensus?.current_rate ?? data?.economic_indicators?.boe_base_rate) ?? 3.75;

  const scenarios = useMemo((): { bear: Scenario; base: Scenario; bull: Scenario } => {
    if (consensus?.scenarios) {
      return {
        bear: {
          label: 'Bear', color: SCENARIO_COLORS.bear,
          path: (consensus.scenarios.bear?.path as number[] || [3.75, 4.0, 4.5, 5.0, 5.25]).map(v => extractValue(v) ?? v),
        },
        base: {
          label: 'Base', color: SCENARIO_COLORS.base,
          path: (consensus.scenarios.base?.path as number[] || [3.75, 3.75, 3.75, 3.75, 4.0]).map(v => extractValue(v) ?? v),
        },
        bull: {
          label: 'Bull', color: SCENARIO_COLORS.bull,
          path: (consensus.scenarios.bull?.path as number[] || [3.75, 3.5, 3.25, 3.0, 3.0]).map(v => extractValue(v) ?? v),
        },
      };
    }
    return {
      bear: { label: 'Bear', color: SCENARIO_COLORS.bear, path: [3.75, 4.0, 4.5, 5.0, 5.25] },
      base: { label: 'Base', color: SCENARIO_COLORS.base, path: [3.75, 3.75, 3.75, 3.75, 4.0] },
      bull: { label: 'Bull', color: SCENARIO_COLORS.bull, path: [3.75, 3.5, 3.25, 3.0, 3.0] },
    };
  }, [consensus]);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 100);

  // visx scales — replace hand-rolled getX/getY
  const xScale = scalePoint<string>({
    domain: QUARTERS,
    range: [0, innerWidth],
    padding: 0,
  });

  const allValues = [
    ...scenarios.bear.path,
    ...scenarios.base.path,
    ...scenarios.bull.path,
    currentRate,
  ];
  const minVal = Math.min(...allValues) - 0.25;
  const maxVal = Math.max(...allValues) + 0.25;

  const yScale = scaleLinear<number>({
    domain: [minVal, maxVal],
    range: [INNER_HEIGHT - MARGIN.top - MARGIN.bottom, 0],
    nice: false,
  });

  // Build point arrays for visx LinePath
  const bearPoints = scenarios.bear.path.map((v, i) => ({ x: xScale(QUARTERS[i]) ?? 0, y: yScale(v) }));
  const basePoints = scenarios.base.path.map((v, i) => ({ x: xScale(QUARTERS[i]) ?? 0, y: yScale(v) }));
  const bullPoints = scenarios.bull.path.map((v, i) => ({ x: xScale(QUARTERS[i]) ?? 0, y: yScale(v) }));

  // Fan area: from current rate to end of bull/bear corridor
  const fanAreaPoints = [
    { x: bearPoints[0].x, y: bearPoints[0].y },
    { x: basePoints[basePoints.length - 1].x, y: bullPoints[bullPoints.length - 1].y },
    { x: basePoints[basePoints.length - 1].x, y: bearPoints[bearPoints.length - 1].y },
  ];

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const svgEl = e.currentTarget.ownerSVGElement;
      if (!svgEl) return;
      const rel = localPoint(e);
      if (!rel) return;
      const svgRect = svgEl.getBoundingClientRect();
      const xInSvg = e.clientX - svgRect.left;
      const xInGroup = xInSvg - MARGIN.left;
      const step = innerWidth / (QUARTERS.length - 1);
      const idx = Math.max(0, Math.min(Math.round(xInGroup / step), QUARTERS.length - 1));
      setHoverIdx(idx);
      showTooltip({
        tooltipData: {
          quarter: QUARTERS[idx],
          bear: scenarios.bear.path[idx],
          base: scenarios.base.path[idx],
          bull: scenarios.bull.path[idx],
        },
        tooltipLeft: MARGIN.left + (xScale(QUARTERS[idx]!) ?? 0),
        tooltipTop: rel.y - 40,
      });
    },
    [innerWidth, scenarios, xScale, showTooltip]
  );

  // Grid line values for y-axis labels
  const gridTicks = [minVal, minVal + (maxVal - minVal) * 0.25, minVal + (maxVal - minVal) * 0.5, minVal + (maxVal - minVal) * 0.75, maxVal];

  return (
    <div className="relative">
      <svg width={width} height={INNER_HEIGHT}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Horizontal grid lines — visx GridRows */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
            numTicks={4}
          />

          {/* Y-axis tick labels (rendered manually for pixel-perfect control) */}
          {gridTicks.map((tickVal) => (
            <text
              key={tickVal}
              x={-6}
              y={yScale(tickVal) + 3}
              fill="rgba(161,161,170,0.6)"
              fontSize={8}
              fontWeight={700}
              fontFamily="inherit"
              textAnchor="end"
            >
              {tickVal.toFixed(1)}%
            </text>
          ))}

          {/* Fan area fill */}
          <AreaClosed
            data={fanAreaPoints}
            x={d => d.x}
            y={d => d.y}
            yScale={yScale}
            fill={SCENARIO_COLORS.base}
            fillOpacity={0.07}
          />

          {/* Bear scenario (dashed) */}
          <LinePath
            data={bearPoints}
            x={d => d.x}
            y={d => d.y}
            stroke={SCENARIO_COLORS.bear}
            strokeWidth={0.8}
            strokeDasharray="3,2"
            strokeOpacity={0.7}
            strokeLinecap="round"
          />

          {/* Bull scenario (dashed) */}
          <LinePath
            data={bullPoints}
            x={d => d.x}
            y={d => d.y}
            stroke={SCENARIO_COLORS.bull}
            strokeWidth={0.8}
            strokeDasharray="3,2"
            strokeOpacity={0.7}
            strokeLinecap="round"
          />

          {/* Base scenario (solid, prominent) */}
          <LinePath
            data={basePoints}
            x={d => d.x}
            y={d => d.y}
            stroke={SCENARIO_COLORS.base}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current rate dot — dual ring for emphasis */}
          <circle cx={bearPoints[0].x} cy={bearPoints[0].y} r={4} fill={SCENARIO_COLORS.base} fillOpacity={0.25} />
          <circle cx={bearPoints[0].x} cy={bearPoints[0].y} r={2} fill={SCENARIO_COLORS.base} />

          {/* End-of-path dots */}
          {([bearPoints, basePoints, bullPoints] as const).map((pts, ki) => {
            const colors = [SCENARIO_COLORS.bear, SCENARIO_COLORS.base, SCENARIO_COLORS.bull];
            const last = pts[pts.length - 1];
            return <circle key={ki} cx={last.x} cy={last.y} r={1.5} fill={colors[ki]} fillOpacity={0.85} />;
          })}

          {/* X-axis tick labels (manual) — FE-206: rotated -35deg to prevent overlap with MPC labels */}
          {QUARTERS.map((q) => (
            <text
              key={q}
              x={xScale(q) ?? 0}
              y={INNER_HEIGHT - MARGIN.top - MARGIN.bottom + 14}
              fill="rgba(161,161,170,0.6)"
              fontSize={8}
              fontWeight={700}
              fontFamily="inherit"
              textAnchor="end"
              transform={`rotate(-35, ${xScale(q) ?? 0}, ${INNER_HEIGHT - MARGIN.top - MARGIN.bottom + 14})`}
            >
              {q}
            </text>
          ))}

          {/* MPC meeting vertical markers — FE-206: labels above quarter labels to avoid overlap */}
          {MPC_POSITIONS.map(mpc => {
            const x = xScale(QUARTERS[mpc.qIndex] ?? '') ?? 0;
            if (x <= 0 || x >= innerWidth) return null;
            return (
              <g key={mpc.label}>
                <line
                  x1={x} y1={0}
                  x2={x} y2={INNER_HEIGHT - MARGIN.top - MARGIN.bottom - 8}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={0.5}
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={-6}
                  fill={SCENARIO_COLORS.base}
                  fontSize={7}
                  fontWeight={700}
                  fontFamily="inherit"
                  textAnchor="middle"
                  opacity={0.7}
                >
                  {mpc.label}
                </text>
              </g>
            );
          })}

          {/* Hover column indicator */}
          {hoverIdx !== null && (
            <>
              <line
                x1={xScale(QUARTERS[hoverIdx]) ?? 0}
                y1={0}
                x2={xScale(QUARTERS[hoverIdx]) ?? 0}
                y2={INNER_HEIGHT - MARGIN.top - MARGIN.bottom}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={0.5}
              />
              {([bearPoints, basePoints, bullPoints] as const).map((pts, ki) => {
                const colors = [SCENARIO_COLORS.bear, SCENARIO_COLORS.base, SCENARIO_COLORS.bull];
                const p = pts[hoverIdx];
                return p ? (
                  <circle key={ki} cx={p.x} cy={p.y} r={2.5} fill={colors[ki]} stroke="#fff" strokeWidth={0.5} />
                ) : null;
              })}
            </>
          )}

          {/* Invisible hit area */}
          <rect
            x={0} y={0}
            width={innerWidth}
            height={INNER_HEIGHT - MARGIN.top - MARGIN.bottom}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setHoverIdx(null); hideTooltip(); }}
          />
        </Group>
      </svg>

      {/* visx tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 9,
            display: 'flex',
            gap: 8,
            color: '#fff',
          }}
        >
          <span style={{ fontWeight: 700 }}>{tooltipData.quarter}</span>
          {(['bear', 'base', 'bull'] as const).map(key => (
            <span key={key} style={{ color: SCENARIO_COLORS[key] }}>
              {key}: {tooltipData[key].toFixed(2)}%
            </span>
          ))}
        </TooltipWithBounds>
      )}
    </div>
  );
}

const BoERatePathChart: React.FC = () => {
  const { data } = useMacroData();
  const consensus = data?.boe_rate_consensus;
  const currentRate = extractValue(consensus?.current_rate ?? data?.economic_indicators?.boe_base_rate) ?? 3.75;

  const scenarios = useMemo(() => {
    if (consensus?.scenarios) {
      return {
        bear: { path: (consensus.scenarios.bear?.path as number[] || [3.75, 4.0, 4.5, 5.0, 5.25]).map(v => extractValue(v) ?? v) },
        base: { path: (consensus.scenarios.base?.path as number[] || [3.75, 3.75, 3.75, 3.75, 4.0]).map(v => extractValue(v) ?? v) },
        bull: { path: (consensus.scenarios.bull?.path as number[] || [3.75, 3.5, 3.25, 3.0, 3.0]).map(v => extractValue(v) ?? v) },
      };
    }
    return {
      bear: { path: [3.75, 4.0, 4.5, 5.0, 5.25] },
      base: { path: [3.75, 3.75, 3.75, 3.75, 4.0] },
      bull: { path: [3.75, 3.5, 3.25, 3.0, 3.0] },
    };
  }, [consensus]);

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">
              BoE Rate Path — Q3 2026 to Q2 2027
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {(['bear', 'base', 'bull'] as const).map(key => (
              <div key={key} className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[key] }} />
                <span className="text-[8px] font-bold uppercase" style={{ color: SCENARIO_COLORS[key] }}>{key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* KPI strip */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Current BoE</div>
            <div className="text-2xl font-bold text-white tracking-tighter">{currentRate.toFixed(2)}%</div>
          </div>
          <div className="h-6 w-px bg-linear-border" />
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Base Q2 2027</div>
            <div className="text-2xl font-bold text-blue-400 tracking-tighter">{scenarios.base.path[4].toFixed(2)}%</div>
          </div>
          <div className="h-6 w-px bg-linear-border" />
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Bull Q2 2027</div>
            <div className="text-2xl font-bold text-retro-green tracking-tighter">{scenarios.bull.path[4].toFixed(2)}%</div>
          </div>
        </div>

        {/* visx chart — responsive via ParentSize */}
        <div className="w-full">
          <ParentSize>
            {({ width }) => width > 0 ? <BoEChart width={width} /> : null}
          </ParentSize>
        </div>

        {/* Scenario cards */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {([
            { key: 'bull' as const, label: 'Bull Case', desc: 'Rate cuts, best for buyers' },
            { key: 'base' as const, label: 'Base Case', desc: 'Central MPC expectation' },
            { key: 'bear' as const, label: 'Bear Case', desc: 'Sustained inflation pressure' },
          ]).map(s => (
            <div
              key={s.key}
              className="p-2 rounded-lg border"
              style={{ borderColor: `${SCENARIO_COLORS[s.key]}30`, backgroundColor: `${SCENARIO_COLORS[s.key]}08` }}
            >
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: SCENARIO_COLORS[s.key] }}>{s.label}</div>
              <div className="text-[8px] text-linear-text-muted mt-0.5">{s.desc}</div>
              <div className="text-[10px] font-bold text-white mt-1">{scenarios[s.key].path[4].toFixed(2)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BoERatePathChart;
