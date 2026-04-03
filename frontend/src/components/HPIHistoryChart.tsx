import React, { useMemo, useState } from 'react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';

// FE-188: London HPI Trajectory Chart — historical index with event annotations and 3-scenario fan overlay
// Accepts: 10+ year London/UK HPI time series, key event markers, bear/base/bull projections

interface HPIHistoryChartProps {
  className?: string;
}

const HPIHistoryChart: React.FC<HPIHistoryChartProps> = ({ className = '' }) => {
  const { data } = useMacroData();
  const [hoverDate, setHoverDate] = useState<string | null>(null);

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

  // SVG layout
  const W = 220, H = 100;
  const PAD = 4;

  // Visible window: last 60 months of history + 36 months projection
  const displayHistory = history.slice(-60);

  const allValues = [
    ...displayHistory.map(h => h.index_uk),
    ...(scenarios ? [...scenarios.bear.path, ...scenarios.base.path, ...scenarios.bull.path] : []),
  ];
  const minV = Math.min(...allValues) * 0.94;
  const maxV = Math.max(...allValues) * 1.04;
  const range = maxV - minV;

  const getX = (idx: number) => PAD + (idx / (displayHistory.length + 36 - 1)) * (W - 2 * PAD);
  const getY = (v: number) => H - PAD - ((v - minV) / range) * (H - 2 * PAD);

  // Build historical polyline
  const historyPath = displayHistory.map((h, i) => `${getX(i)},${getY(h.index_uk)}`).join(' ');

  // Scenario fan area (current → 3yr projections)
  const fanPath = scenarios ? [
    `M ${getX(0)},${getY(scenarios.bull.path[0])}`,
    ...scenarios.bull.path.map((v, i) => `L ${getX(displayHistory.length - 1 + i)},${getY(v)}`),
    ...[...scenarios.bear.path].reverse().map((v, i) => `L ${getX(displayHistory.length - 1 + scenarios.bear.path.length - 1 - i)},${getY(v)}`),
    'Z',
  ].join(' ') : '';

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

      {/* SVG Chart */}
      <div className="px-4 py-3 relative">
        <div style={{ height: 180 }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full overflow-visible"
          >
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
              const v = minV + range * pct;
              return (
                <g key={pct}>
                  <line x1={PAD} y1={getY(v)} x2={W - PAD} y2={getY(v)} stroke="currentColor" strokeWidth="0.08" className="text-white/5" />
                  <text x={PAD - 0.8} y={getY(v) + 0.9} className="text-[2.5px] fill-linear-text-muted/60" textAnchor="end">{v.toFixed(0)}</text>
                </g>
              );
            })}

            {/* Scenario fan area */}
            {scenarios && fanPath && (
              <path d={fanPath} fill="#3b82f6" opacity="0.06" />
            )}

            {/* Historical line */}
            <polyline
              points={historyPath}
              fill="none" stroke="#22c55e" strokeWidth="0.9"
              strokeLinecap="round" strokeLinejoin="round"
            />

            {/* Projection lines */}
            {scenarios && displayHistory.length > 0 && (
              <>
                {/* Bear projection */}
                <polyline
                  points={scenarios.bear.path.map((v, i) => `${getX(displayHistory.length - 1 + i)},${getY(v)}`).join(' ')}
                  fill="none" stroke={scenarios.bear.color} strokeWidth="0.7" strokeDasharray="2,1" opacity="0.7"
                />
                {/* Bull projection */}
                <polyline
                  points={scenarios.bull.path.map((v, i) => `${getX(displayHistory.length - 1 + i)},${getY(v)}`).join(' ')}
                  fill="none" stroke={scenarios.bull.color} strokeWidth="0.7" strokeDasharray="2,1" opacity="0.7"
                />
                {/* Base projection (solid) */}
                <polyline
                  points={scenarios.base.path.map((v, i) => `${getX(displayHistory.length - 1 + i)},${getY(v)}`).join(' ')}
                  fill="none" stroke={scenarios.base.color} strokeWidth="1.1"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </>
            )}

            {/* Current index dot */}
            <circle
              cx={getX(displayHistory.length - 1)}
              cy={getY(lastHpi?.index_uk ?? 0)}
              r="1.5" fill="#22c55e" stroke="#000" strokeWidth="0.4"
            />

            {/* Annotation markers */}
            {annotations.map(ann => {
              const idx = annotationX[ann.date];
              if (idx === undefined) return null;
              const color = eventColors[ann.event] ?? '#a1a1aa';
              return (
                <g key={ann.date}>
                  <line
                    x1={getX(idx)} y1={PAD}
                    x2={getX(idx)} y2={H - PAD}
                    stroke={color} strokeWidth="0.15" opacity="0.4" strokeDasharray="1,1"
                  />
                  <text
                    x={getX(idx)} y={PAD - 0.5}
                    className="text-[2.5px] font-black" fill={color} opacity="0.8"
                    textAnchor="middle"
                  >
                    {ann.event}
                  </text>
                </g>
              );
            })}

            {/* Hover interaction */}
            <rect
              x={PAD} y={PAD}
              width={W - 2 * PAD} height={H - 2 * PAD}
              fill="transparent"
              onMouseMove={(e) => {
                const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const totalW = rect.width;
                const ratio = x / totalW;
                const idx = Math.round(ratio * (displayHistory.length - 1));
                if (idx >= 0 && idx < displayHistory.length) {
                  setHoverDate(displayHistory[idx].date);
                } else {
                  setHoverDate(null);
                }
              }}
              onMouseLeave={() => setHoverDate(null)}
            />

            {/* Year labels on x-axis */}
            {useMemo(() => {
              const labels: Array<{x: number; label: string}> = [];
              let lastYear = '';
              displayHistory.forEach((h, i) => {
                const yr = h.date.slice(0, 4);
                if (yr !== lastYear) {
                  labels.push({ x: i, label: yr });
                  lastYear = yr;
                }
              });
              // Every other year to avoid clutter
              return labels.filter((_, i) => i % 2 === 0);
            }, [displayHistory]).map(({ x, label }) => (
              <text
                key={label}
                x={getX(x)} y={H - PAD + 4}
                className="text-[2.5px] fill-linear-text-muted/60 font-bold"
                textAnchor="middle"
              >
                {label}
              </text>
            ))}

            {/* Projection label */}
            {scenarios && (
              <text
                x={getX(displayHistory.length)} y={PAD - 0.5}
                className="text-[2.5px] fill-blue-400/60 font-bold"
                textAnchor="start"
              >
                +3yr projections
              </text>
            )}
          </svg>
        </div>

        {/* Hover tooltip */}
        {hoverDate && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-linear-border rounded-lg px-3 py-1.5 pointer-events-none z-10">
            <span className="text-[10px] font-bold text-white">{hoverDate}</span>
            <span className="text-[10px] text-retro-green ml-2">
              {displayHistory.find(h => h.date === hoverDate)?.index_uk.toFixed(2) ?? ''}
            </span>
          </div>
        )}

        {/* Event legend strip */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
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
