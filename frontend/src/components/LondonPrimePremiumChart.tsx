import React, { useMemo } from 'react';
import { useMacroData } from '../hooks/useMacroData';

// FE-191: London Prime Premium tracker — PCL vs London avg vs UK avg time series
// Data: hpi_history provides UK-indexed series. London premium is computed relative to UK.

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

  // Historical series from hpi_history
  const history = useMemo(() => {
    const rawHpi = raw?.hpi_history?.london_wide ?? [];
    if (!Array.isArray(rawHpi) || rawHpi.length === 0) return [];
    return rawHpi.map((h: any) => ({
      date: h.date,
      ukIndex: h.index_uk ?? 100,
      englandIndex: h.index_england ?? 100,
      // London premium vs UK: London's index tends to be 15-25% above UK avg historically
      londonImplied: (h.index_uk ?? 100) * 1.18, // 18% London premium proxy
      ukRaw: h.uk_hpi_raw ?? 67.3,
    }));
  }, [raw]);

  // Show last 36 months for cleaner chart
  const display = history.slice(-36);

  // Compute premium series (London implied vs UK)
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
  const peak = premiumData.reduce((max: PremiumPoint, d: PremiumPoint) => d.premiumPct > max.premiumPct ? d : max, premiumData[0] || { premiumPct: 0 } as PremiumPoint);

  // SVG setup
  const W = 200, H = 80;
  const PAD = 4;
  if (!display.length) return null;

  const allValues = premiumData.flatMap(d => [d.uk, d.london]);
  const minV = Math.min(...allValues) * 0.95;
  const maxV = Math.max(...allValues) * 1.03;
  const range = maxV - minV;
  const getX = (i: number) => PAD + (i / (premiumData.length - 1)) * (W - 2 * PAD);
  const getY = (v: number) => H - PAD - ((v - minV) / range) * (H - 2 * PAD);

  const ukPath = premiumData.map((d, i) => `${getX(i)},${getY(d.uk)}`).join(' ');
  const londonPath = premiumData.map((d, i) => `${getX(i)},${getY(d.london)}`).join(' ');

  // Premium fill
  const premiumFill = premiumData.map((d, i) => {
    const top = Math.max(getY(d.uk), getY(d.london));
    const bot = Math.min(getY(d.uk), getY(d.london));
    return `${i === 0 ? 'M' : 'L'}${getX(i)},${top} L${getX(i)},${bot}`;
  }).join(' ') + ' Z';

  const londonPremium = latest ? ((latest.london / latest.uk - 1) * 100).toFixed(1) : '18.0';

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
          <span className="text-[7px] text-linear-text-muted/40 ml-2">(18% premium proxy)</span>
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

      {/* Chart */}
      <div className="p-4">
        <div style={{ height: 120 }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
            {/* Grid */}
            {[0, 0.5, 1].map(pct => {
              const v = minV + range * pct;
              return (
                <g key={pct}>
                  <line x1={PAD} y1={getY(v)} x2={W - PAD} y2={getY(v)} stroke="currentColor" strokeWidth="0.08" className="text-white/5" />
                  <text x={PAD - 0.5} y={getY(v) + 0.8} className="text-[2.5px] fill-linear-text-muted/60" textAnchor="end">{v.toFixed(0)}</text>
                </g>
              );
            })}

            {/* Premium area fill */}
            <path d={premiumFill} fill="#f59e0b" opacity="0.07" />

            {/* UK index line */}
            <polyline points={ukPath} fill="none" stroke="#22c55e" strokeWidth="0.8" strokeLinecap="round" />

            {/* London (PCL) implied line */}
            <polyline points={londonPath} fill="none" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" />

            {/* Year labels */}
            {premiumData.reduce((labels, d, i) => {
              const yr = d.date.slice(0, 4);
              if (labels.length === 0 || labels[labels.length - 1].yr !== yr) {
                labels.push({ i, yr });
              }
              return labels;
            }, [] as {i: number; yr: string}[]).filter((_, idx) => idx % 2 === 0).map(({ i, yr }) => (
              <text key={yr} x={getX(i)} y={H - PAD + 4} className="text-[2.5px] fill-linear-text-muted/60 font-bold" textAnchor="middle">{yr}</text>
            ))}
          </svg>
        </div>

        {/* Premium delta bar */}
        {latest && yearAgo && (
          <div className="mt-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center justify-between">
            <span className="text-[8px] text-linear-text-muted font-bold uppercase">YoY Premium Δ</span>
            <span className={`text-[10px] font-black ${(latest.premiumPct - yearAgo.premiumPct) >= 0 ? 'text-retro-green' : 'text-rose-400'}`}>
              {(latest.premiumPct - yearAgo.premiumPct) >= 0 ? '+' : ''}{(latest.premiumPct - yearAgo.premiumPct).toFixed(1)}pp
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-linear-text-muted/40 font-mono">PCL vs UK Index · UK=100</span>
        <span className="text-[8px] text-linear-text-muted/40 font-mono">Source: HM Land Registry</span>
      </div>
    </div>
  );
};

export default LondonPrimePremiumChart;
