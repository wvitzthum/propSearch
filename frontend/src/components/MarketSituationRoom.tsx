// VISX-034: Migrated to @visx — ParentSize, scaleLinear, Group, LinePath/AreaClosed replace raw SVG viewBox
import React from 'react';
import {
  TrendingUp,
  Activity,
  Clock,
  Target,
  ChevronRight
} from 'lucide-react';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import { scaleLinear } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';

const MarketVolumeChart: React.FC<{ data: { month: string, listed: number, sold?: number }[] }> = ({ data }) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<{ month: string; listed: number; sold: number }>();

  if (!data || data.length === 0) return null;

  const MARGIN = { top: 16, right: 16, bottom: 32, left: 40 };
  const INNER_H = 200;

  const ChartInner: React.FC<{ width: number }> = ({ width }) => {
    const W = width;
    const innerW = Math.max(W - MARGIN.left - MARGIN.right, 80);

    const maxVal = Math.max(...data.map(d => Math.max(d.listed, d.sold || 0)));

    const xScale = scaleLinear({
      domain: [0, data.length - 1],
      range: [MARGIN.left, W - MARGIN.right],
    });

    const yScale = scaleLinear({
      domain: [0, maxVal * 1.05],
      range: [INNER_H - MARGIN.bottom, MARGIN.top],
      nice: true,
    });

    const listedData = data.map((d, i) => ({ x: i, y: d.listed }));
    const soldData = data.map((d, i) => ({ x: i, y: d.sold || 0 }));
    const fillData = data.map((d, i) => ({
      x: i,
      yTop: d.listed,
      yBot: 0,
    }));

    const getX = (i: number) => xScale(i);
    const getY = (v: number) => yScale(v);

    // Year labels on x-axis
    const yearLabels = data.reduce<Array<{ i: number; label: string }>>((acc, d, i) => {
      const yr = d.month.slice(0, 4);
      if (acc.length === 0 || acc[acc.length - 1].label !== yr) acc.push({ i, label: yr });
      return acc;
    }, []).filter((_, idx) => idx % 2 === 0);

    const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
      const svgEl = e.currentTarget.ownerSVGElement as SVGSVGElement;
      if (!svgEl) return;
      const rel = localPoint(e);
      if (!rel) return;
      const svgRect = svgEl.getBoundingClientRect();
      const xInSvg = e.clientX - svgRect.left;
      const step = innerW / (data.length - 1);
      const idx = Math.max(0, Math.min(Math.round((xInSvg - MARGIN.left) / step), data.length - 1));
      const d = data[idx];
      showTooltip({
        tooltipData: { month: d.month, listed: d.listed, sold: d.sold || 0 },
        tooltipLeft: rel.x,
        tooltipTop: rel.y - 40,
      });
    };

    return (
      <svg width={W} height={INNER_H} data-testid="market-volume-svg">
        <Group>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const v = maxVal * pct * 1.05;
            return (
              <g key={pct}>
                <line
                  x1={MARGIN.left}
                  y1={getY(v)}
                  x2={W - MARGIN.right}
                  y2={getY(v)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.5}
                />
                <text
                  x={MARGIN.left - 6}
                  y={getY(v) + 4}
                  fill="rgba(161,161,170,0.6)"
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {(v / 1000).toFixed(0)}K
                </text>
              </g>
            );
          })}

          {/* Listed area fill */}
          <AreaClosed
            data={fillData}
            x={d => getX(d.x)}
            y0={getY(0)}
            y1={d => getY(d.yTop)}
            yScale={yScale}
            fill="#3b82f6"
            opacity={0.05}
          />

          {/* Sold area fill */}
          <AreaClosed
            data={soldData}
            x={d => getX(d.x)}
            y0={getY(0)}
            y1={d => getY(d.y)}
            yScale={yScale}
            fill="#22c55e"
            opacity={0.05}
          />

          {/* Listed line */}
          <LinePath
            data={listedData}
            x={d => getX(d.x)}
            y={d => getY(d.y)}
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Sold line */}
          <LinePath
            data={soldData}
            x={d => getX(d.x)}
            y={d => getY(d.y)}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current endpoint dots */}
          <circle
            cx={getX(data.length - 1)}
            cy={getY(data[data.length - 1].listed)}
            r={4}
            fill="#3b82f6"
          />
          <circle
            cx={getX(data.length - 1)}
            cy={getY(data[data.length - 1].sold || 0)}
            r={4}
            fill="#22c55e"
          />

          {/* Year labels */}
          {yearLabels.map(({ i, label }) => (
            <text
              key={label}
              x={getX(i)}
              y={INNER_H - 6}
              fill="rgba(161,161,170,0.6)"
              fontSize={10}
              fontWeight="bold"
              textAnchor="middle"
            >
              {label}
            </text>
          ))}

          {/* Invisible hit area */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={innerW}
            height={INNER_H - MARGIN.top - MARGIN.bottom}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>
    );
  };

  return (
    <div className="relative h-64 w-full bg-linear-bg/30 border border-linear-border rounded-xl p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-blue-500"></div>
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Listed Inventory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-emerald-500"></div>
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Sold Volume</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-linear-accent uppercase">Protocol: Volume_Tracking_v4.1</div>
      </div>

      <ParentSize>
        {({ width }) => width > 0 ? <ChartInner width={width} /> : null}
      </ParentSize>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          applyPositionStyle
          offsetLeft={0}
          offsetTop={0}
          className="bg-black/90 backdrop-blur border border-linear-border rounded-lg px-3 py-2 pointer-events-none z-50"
        >
          <div className="text-[10px] font-black text-white mb-1">{tooltipData.month}</div>
          <div className="text-[9px] text-blue-400">Listed: {(tooltipData.listed / 1000).toFixed(1)}K</div>
          <div className="text-[9px] text-retro-green">Sold: {(tooltipData.sold / 1000).toFixed(1)}K</div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

const TimingIndicatorGauge: React.FC<{ monthsOfSupply: number }> = ({ monthsOfSupply }) => {
  // 0-8 months scale. 4 is neutral. <4 is seller market, >4 is buyer market.
  const percentage = Math.min(100, (monthsOfSupply / 8) * 100);
  const color = monthsOfSupply > 4.5 ? '#10b981' : monthsOfSupply < 3.5 ? '#ef4444' : '#f59e0b';
  const label = monthsOfSupply > 4.5 ? 'BUYER' : monthsOfSupply < 3.5 ? 'SELLER' : 'NEUTRAL';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-linear-card/50 border border-linear-border rounded-xl relative overflow-hidden group">
      <div className="relative h-32 w-32 mb-4">
        <svg viewBox="0 0 100 100" className="h-full w-full rotate-[-90deg]">
          <circle cx="50" cy="50" r="40" className="fill-none stroke-linear-border" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="40" 
            className="fill-none transition-all duration-1000 ease-out" 
            stroke={color}
            strokeWidth="8" 
            strokeDasharray={`${(percentage * 251) / 100} 251`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <span className="text-2xl font-black text-white leading-none">{monthsOfSupply}</span>
           <span className="text-[8px] font-bold text-linear-text-muted uppercase tracking-tighter mt-1">MOS</span>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10`} style={{ backgroundColor: `${color}20`, color: color }}>
        {label} ADVANTAGE
      </div>
      <div className="mt-4 text-[9px] text-linear-text-muted text-center uppercase tracking-widest font-bold">
         Strategic Market Timing
      </div>
    </div>
  );
};

const MarketSituationRoom: React.FC = () => {
  const { data, loading, error } = useMacroData();

  if (loading || error || !data) return null;

  // Extract values with provenance handling
  const inventoryVelocity = data.inventory_velocity;
  const timingSignals = data.timing_signals;
  const hpi = data.london_hpi;

  const monthsSupplyVal = extractValue(inventoryVelocity?.months_of_supply) ?? 0;
  const newInstQChangeVal = extractValue(inventoryVelocity?.new_instructions_q_change) ?? 0;
  const hpiYoyVal = extractValue(hpi?.yoy_pct ?? hpi?.annual_change) ?? 0;
  const avgDiscountVal = extractValue(data.negotiation_delta?.avg_discount_pct) ?? 0;
  const areaHeatScoreVal = data.area_heat_index?.[0]?.score;

  const marketVolumeData = (data.business_history || data.market_business || []).map((d) => ({
    month: d.month,
    listed: extractValue(d.listed) ?? 0,
    sold: extractValue(d.sold) ?? 0,
  }));

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-linear-border pb-8">
        <div className="flex flex-col max-w-xl">
           <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-500/5 border border-blue-500/20 rounded-md text-blue-400 text-[9px] font-black uppercase tracking-widest mb-4 w-fit">
              <Activity size={10} className="animate-pulse" />
              Strategic Situation Room
           </div>
           <h2 className="text-3xl font-bold text-white tracking-tighter mb-4 leading-tight">
             Institutional Market <br />
             <span className="text-linear-accent">Intelligence Tracker</span>
           </h2>
           <p className="text-sm text-linear-text-muted leading-relaxed">
             Direct access to the same metrics institutional funds use to timing entries. 
             Real-time inventory velocity monitoring combined with pricing delta analysis.
           </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-linear-card border border-linear-border rounded-xl">
              <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Market Heat</div>
              <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                 {areaHeatScoreVal != null ? (extractValue(areaHeatScoreVal)! / 10).toFixed(1) : '5.0'}
                 <TrendingUp size={16} className="text-retro-green" />
              </div>
           </div>
           <div className="p-4 bg-linear-card border border-linear-border rounded-xl">
              <div className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-2">Supply Cap</div>
              <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                 {monthsSupplyVal.toFixed(1)}
                 <Clock size={16} className="text-blue-400" />
              </div>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
           <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-linear-border flex items-center justify-between bg-linear-card/80">
                 <div className="flex items-center gap-3">
                   <Target size={14} className="text-blue-500" />
                   <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Listing-to-Sold Pipeline Velocity</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-mono text-linear-text-muted uppercase">REALTIME_FEED</span>
                 </div>
              </div>
              <div className="p-6">
                 <MarketVolumeChart data={marketVolumeData} />
                 <div className="mt-8 grid grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Inventory Delta</span>
                       <span className="text-lg font-bold text-white tracking-tight">{newInstQChangeVal > 0 ? '+' : ''}{newInstQChangeVal}%</span>
                    </div>
                    <div className="flex flex-col gap-1 border-x border-linear-border px-6">
                       <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Sold Rate</span>
                       <span className="text-lg font-bold text-emerald-400 tracking-tight">{hpiYoyVal > 0 ? '+' : ''}{hpiYoyVal}%</span>
                    </div>
                    <div className="flex flex-col gap-1 pl-6">
                       <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Pricing Gap</span>
                       <span className="text-lg font-bold text-blue-400 tracking-tight">{avgDiscountVal}%</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-6">
           <TimingIndicatorGauge monthsOfSupply={monthsSupplyVal} />
           <div className="p-6 bg-linear-accent/10 border border-linear-accent/20 rounded-2xl flex flex-col gap-4 group hover:bg-linear-accent/20 transition-all cursor-pointer">
              <div className="text-[10px] font-black text-linear-accent uppercase tracking-widest">Current Protocol Recommendation</div>
              <p className="text-xs font-bold text-white leading-relaxed tracking-tight group-hover:translate-x-1 transition-transform">
                {timingSignals?.optimal_window_description || 'Market conditions favoring buyer entry. Inventory build-up in PCL providing leverage.'}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest mt-2 group-hover:gap-4 transition-all">
                 Launch Command Center <ChevronRight size={12} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSituationRoom;
