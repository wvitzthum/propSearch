import React, { useMemo, useState } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';

const BoERatePathChart: React.FC = () => {
  const { data } = useMacroData();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const consensus = data?.boe_rate_consensus;
  const currentRate = extractValue(consensus?.current_rate ?? data?.economic_indicators?.boe_base_rate) ?? 3.75;

  // Default paths if not in data
  const scenarios = useMemo(() => {
    if (consensus?.scenarios) {
      return {
        bear: {
          label: 'Bear',
          color: '#ef4444',
          path: (consensus.scenarios.bear?.path as number[] || [3.75, 4.0, 4.5, 5.0, 5.25]).map(v => extractValue(v) ?? v),
        },
        base: {
          label: 'Base',
          color: '#3b82f6',
          path: (consensus.scenarios.base?.path as number[] || [3.75, 3.75, 3.75, 3.75, 4.0]).map(v => extractValue(v) ?? v),
        },
        bull: {
          label: 'Bull',
          color: '#22c55e',
          path: (consensus.scenarios.bull?.path as number[] || [3.75, 3.5, 3.25, 3.0, 3.0]).map(v => extractValue(v) ?? v),
        },
      };
    }
    return {
      bear: { label: 'Bear', color: '#ef4444', path: [3.75, 4.0, 4.5, 5.0, 5.25] },
      base: { label: 'Base', color: '#3b82f6', path: [3.75, 3.75, 3.75, 3.75, 4.0] },
      bull: { label: 'Bull', color: '#22c55e', path: [3.75, 3.5, 3.25, 3.0, 3.0] },
    };
  }, [consensus]);

  const quarters = ['Now', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'];

  // Compute SVG path points
  const allValues = [
    ...scenarios.bear.path,
    ...scenarios.base.path,
    ...scenarios.bull.path,
    currentRate
  ];
  const minVal = Math.min(...allValues) - 0.25;
  const maxVal = Math.max(...allValues) + 0.25;
  const range = maxVal - minVal;
  const W = 100, H = 80;
  const PAD = 2;

  const getX = (i: number) => PAD + (i / (quarters.length - 1)) * (W - 2 * PAD);
  const getY = (v: number) => H - PAD - ((v - minVal) / range) * (H - 2 * PAD);

  const toPolyline = (path: number[]) =>
    path.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

  const currentX = getX(0);
  const currentY = getY(currentRate);

  // Fan fill between scenarios
  const fanPath = `
    M ${getX(0)},${getY(currentRate)}
    L ${getX(quarters.length - 1)},${getY(scenarios.bull.path[scenarios.bull.path.length - 1])}
    L ${getX(quarters.length - 1)},${getY(scenarios.bear.path[scenarios.bear.path.length - 1])}
    Z
  `;

  // MPC meeting positions (approximate)
  const mpcPositions = [
    { q: 1, label: 'May' },
    { q: 2, label: 'Jun' },
    { q: 3, label: 'Aug' },
    { q: 4, label: 'Sep' },
  ];

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-linear-border bg-linear-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">BoE Rate Path — Q3 2026 to Q2 2027</h3>
          </div>
          <div className="flex items-center gap-3">
            {Object.entries(scenarios).map(([key, s]: [string, any]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[8px] font-bold uppercase" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Current Rate KPI */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Current BoE</div>
            <div className="text-2xl font-bold text-white tracking-tighter">{currentRate.toFixed(2)}%</div>
          </div>
          <div className="h-6 w-px bg-linear-border" />
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Base Case Q2 2027</div>
            <div className="text-2xl font-bold text-blue-400 tracking-tighter">{scenarios.base.path[scenarios.base.path.length - 1].toFixed(2)}%</div>
          </div>
          <div className="h-6 w-px bg-linear-border" />
          <div>
            <div className="text-[8px] text-linear-text-muted uppercase tracking-widest font-bold">Bull Case</div>
            <div className="text-2xl font-bold text-retro-green tracking-tighter">{scenarios.bull.path[scenarios.bull.path.length - 1].toFixed(2)}%</div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative h-40 w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            {/* Grid lines */}
            {[minVal, minVal + range * 0.25, minVal + range * 0.5, minVal + range * 0.75, maxVal].map((v) => (
              <g key={v}>
                <line
                  x1={PAD} y1={getY(v)} x2={W - PAD} y2={getY(v)}
                  stroke="currentColor" strokeWidth="0.1"
                  className="text-linear-border/50"
                />
                <text
                  x={PAD - 0.5} y={getY(v) + 0.8}
                  className="text-[2.5px] fill-linear-text-muted font-bold"
                  textAnchor="end"
                >
                  {v.toFixed(1)}%
                </text>
              </g>
            ))}

            {/* Fan area fill */}
            <path d={fanPath} fill={scenarios.base.color} opacity="0.08" />

            {/* Bear scenario */}
            <polyline
              points={toPolyline(scenarios.bear.path)}
              fill="none" stroke={scenarios.bear.color} strokeWidth="0.8"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="2,1"
              opacity="0.7"
            />

            {/* Bull scenario */}
            <polyline
              points={toPolyline(scenarios.bull.path)}
              fill="none" stroke={scenarios.bull.color} strokeWidth="0.8"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="2,1"
              opacity="0.7"
            />

            {/* Base scenario (solid) */}
            <polyline
              points={toPolyline(scenarios.base.path)}
              fill="none" stroke={scenarios.base.color} strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"
            />

            {/* Current rate dot */}
            <circle cx={currentX} cy={currentY} r="1.5" fill={scenarios.base.color} stroke="#fff" strokeWidth="0.4" />

            {/* End-of-path dots */}
            {(['bear', 'base', 'bull'] as const).map((key) => {
              const s = scenarios[key];
              const x = getX(quarters.length - 1);
              const y = getY(s.path[s.path.length - 1]);
              return (
                <circle key={key} cx={x} cy={y} r="1" fill={s.color} opacity="0.8" />
              );
            })}

            {/* X-axis labels */}
            {quarters.map((q, i) => (
              <text
                key={q}
                x={getX(i)} y={H - 0.5}
                className="text-[2.5px] fill-linear-text-muted font-bold"
                textAnchor="middle"
              >
                {q}
              </text>
            ))}

            {/* MPC meeting markers */}
            {mpcPositions.map((mpc) => (
              <g key={mpc.label}>
                <line
                  x1={getX(mpc.q)} y1={PAD}
                  x2={getX(mpc.q)} y2={H - PAD - 3}
                  stroke="#fff" strokeWidth="0.1" strokeDasharray="1,1" opacity="0.2"
                />
                <text
                  x={getX(mpc.q)} y={H - 0.5}
                  className="text-[2.5px] fill-blue-400 font-bold"
                  textAnchor="middle"
                >
                  {mpc.label}
                </text>
              </g>
            ))}

            {/* Hover indicator */}
            {hoverIndex !== null && hoverIndex > 0 && hoverIndex < quarters.length && (
              <>
                <line
                  x1={getX(hoverIndex)} y1={PAD}
                  x2={getX(hoverIndex)} y2={H - PAD}
                  stroke="#fff" strokeWidth="0.3" opacity="0.4"
                />
                {(['bear', 'base', 'bull'] as const).map((key) => {
                  const s = scenarios[key];
                  const x = getX(hoverIndex);
                  const y = getY(s.path[hoverIndex]);
                  return (
                    <circle key={key} cx={x} cy={y} r="1.2" fill={s.color} stroke="#fff" strokeWidth="0.3" />
                  );
                })}
              </>
            )}

            {/* Invisible hit areas */}
            {quarters.map((_, i) => (
              <rect
                key={i}
                x={getX(i) - 3} y={PAD}
                width="6" height={H - PAD * 2}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            ))}
          </svg>

          {/* Hover readout */}
          {hoverIndex !== null && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-black/80 backdrop-blur border border-linear-border rounded-lg px-3 py-1.5 text-[9px] flex gap-3 pointer-events-none z-10">
              <span className="text-white font-bold">{quarters[hoverIndex]}</span>
              {(['bear', 'base', 'bull'] as const).map((key) => {
                const s = scenarios[key];
                return (
                  <span key={key} style={{ color: s.color }}>
                    {key}: {s.path[hoverIndex]?.toFixed(2)}%
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Scenario labels */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {([
            { key: 'bull', label: 'Bull Case', desc: 'Rate cuts, best for buyers', color: scenarios.bull.color },
            { key: 'base', label: 'Base Case', desc: 'Central MPC expectation', color: scenarios.base.color },
            { key: 'bear', label: 'Bear Case', desc: 'Sustained inflation pressure', color: scenarios.bear.color },
          ] as const).map((s) => (
            <div key={s.key} className="p-2 rounded-lg border" style={{ borderColor: `${s.color}30`, backgroundColor: `${s.color}08` }}>
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: s.color }}>{s.label}</div>
              <div className="text-[8px] text-linear-text-muted mt-0.5">{s.desc}</div>
              <div className="text-[10px] font-bold text-white mt-1">{scenarios[s.key].path[scenarios[s.key].path.length - 1].toFixed(2)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BoERatePathChart;
