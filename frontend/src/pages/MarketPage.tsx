import React from 'react';
import {
  Map,
  Activity,
  BarChart2,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import MicroMarketVelocityMap from '../components/MicroMarketVelocityMap';
import LondonMicroMarketHeatMap from '../components/LondonMicroMarketHeatMap';
import DataFreshnessIndicator from '../components/DataFreshnessIndicator';
import MarketVerdict from '../components/MarketVerdict';
import AreaMetricHeatmap from '../components/AreaMetricHeatmap';

const MarketPage: React.FC = () => {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-2 w-2 rounded-full bg-retro-green animate-pulse" />
            <span className="text-[10px] font-black text-retro-green uppercase tracking-widest">Market Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Area Heat Map</h1>
          <p className="text-sm text-linear-text-muted mt-1 max-w-xl">
            Micro-market velocity and area performance analytics for London prime locations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataFreshnessIndicator />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-retro-green/10 border border-retro-green/20 rounded-lg">
            <Activity size={12} className="text-retro-green" />
            <span className="text-[9px] font-black text-retro-green uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* UX-033: Market Verdict Strip */}
      <MarketVerdict />

      {/* VISX-005: Area × Metric Heatmap */}
      <AreaMetricHeatmap maxRows={8} />

      {/* Geographic Heat Map */}
      <LondonMicroMarketHeatMap />

      {/* Ranked Velocity Table */}
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Map size={14} className="text-retro-green" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Micro-Market Velocity — Ranked</h2>
          </div>
          <p className="text-[10px] text-linear-text-muted/60">
            Composite signal strength across London prime postcodes. Higher scores indicate faster velocity markets.
          </p>
        </div>
        <MicroMarketVelocityMap />
      </div>

      {/* UX-033: Property Type Performance — compact card summary */}
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-400" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Property Type Summary</h2>
          </div>
          <Link
            to="/rates"
            className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
          >
            Full analysis <ExternalLink size={10} />
          </Link>
        </div>

        {/* Compact ranked list */}
        <div className="p-4 space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-4 gap-3 px-2 pb-2 border-b border-linear-border">
            <div className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest col-span-2">Segment</div>
            <div className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest text-right">Alpha</div>
            <div className="text-[8px] font-bold text-linear-text-muted uppercase tracking-widest text-right">5yr</div>
          </div>

          {/* Studio/1-Bed */}
          <div className="grid grid-cols-4 gap-3 px-2 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="col-span-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[8px] font-black">★</span>
              <span className="text-[10px] font-bold text-white">Studio/1-Bed</span>
            </div>
            <div className="text-right text-[10px] font-black text-retro-green">+3.1%</div>
            <div className="text-right text-[10px] font-bold text-white">+16.5%</div>
          </div>

          {/* 2-Bed Flat */}
          <div className="grid grid-cols-4 gap-3 px-2 py-2">
            <div className="col-span-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-linear-bg text-linear-text-muted border border-linear-border flex items-center justify-center text-[8px] font-black">2</span>
              <span className="text-[10px] font-bold text-white">2-Bed Flat</span>
            </div>
            <div className="text-right text-[10px] font-black text-blue-400">+2.3%</div>
            <div className="text-right text-[10px] font-bold text-white">+11.9%</div>
          </div>

          {/* 3-Bed/Terraced */}
          <div className="grid grid-cols-4 gap-3 px-2 py-2">
            <div className="col-span-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-linear-bg text-linear-text-muted border border-linear-border flex items-center justify-center text-[8px] font-black">3</span>
              <span className="text-[10px] font-bold text-white">3-Bed/Terraced</span>
            </div>
            <div className="text-right text-[10px] font-black text-amber-400">+1.8%</div>
            <div className="text-right text-[10px] font-bold text-white">+9.2%</div>
          </div>

          {/* Detached */}
          <div className="grid grid-cols-4 gap-3 px-2 py-2">
            <div className="col-span-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-linear-bg text-linear-text-muted border border-linear-border flex items-center justify-center text-[8px] font-black">4</span>
              <span className="text-[10px] font-bold text-white">Detached</span>
            </div>
            <div className="text-right text-[10px] font-black text-rose-400">+1.2%</div>
            <div className="text-right text-[10px] font-bold text-white">+6.1%</div>
          </div>

          {/* Insight */}
          <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp size={12} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-linear-text-muted leading-relaxed">
                <span className="text-white font-bold">Studio/1-Bed leads alpha </span>
                vs Detached. Best risk-adjusted opportunity in current market.
                <Link to="/rates" className="text-blue-400 ml-1 hover:text-blue-300">View full analysis →</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
