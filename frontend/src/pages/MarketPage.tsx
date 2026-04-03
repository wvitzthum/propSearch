import React from 'react';
import {
  Map,
  Activity,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import MicroMarketVelocityMap from '../components/MicroMarketVelocityMap';
import AreaPerformanceTable from '../components/AreaPerformanceTable';
import PropertyTypePerformanceChart from '../components/PropertyTypePerformanceChart';

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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-retro-green/10 border border-retro-green/20 rounded-lg">
            <Activity size={12} className="text-retro-green" />
            <span className="text-[9px] font-black text-retro-green uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* Velocity Heat Map */}
      <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Map size={14} className="text-retro-green" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Micro-Market Velocity Heat Map</h2>
          </div>
          <p className="text-[10px] text-linear-text-muted/60">
            Composite signal strength across London prime postcodes. Higher scores indicate faster velocity markets.
          </p>
        </div>
        <MicroMarketVelocityMap />
      </div>

      {/* Area Performance */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-blue-400" />
          <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Area Performance Data</h2>
        </div>
        <AreaPerformanceTable />
      </div>

      {/* FE-189: Property Type Performance */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} className="text-blue-400" />
          <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Property Type Segment Performance</h2>
        </div>
        <PropertyTypePerformanceChart />
      </div>
    </div>
  );
};

export default MarketPage;
