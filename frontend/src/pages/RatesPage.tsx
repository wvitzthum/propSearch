import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Activity
} from 'lucide-react';
import SwapRateSignal from '../components/SwapRateSignal';
import BoERatePathChart from '../components/BoERatePathChart';
import AreaPerformanceTable from '../components/AreaPerformanceTable';

const RatesPage: React.FC = () => {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Market Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rates & Scenarios</h1>
          <p className="text-sm text-linear-text-muted mt-1 max-w-xl">
            BoE rate path consensus, swap rate signals, and macro scenario modeling for London prime market.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <Activity size={12} className="text-purple-400" />
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* Swap Rate Signal — top banner */}
      <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-purple-400" />
          <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Swap Rate Signals</h2>
        </div>
        <SwapRateSignal />
      </div>

      {/* BoE Rate Path + Area Performance — main grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* BoE Rate Path */}
        <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-blue-400" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">BoE Rate Path Scenarios</h2>
          </div>
          <BoERatePathChart />
        </div>

        {/* Area Performance Table */}
        <div className="bg-linear-card border border-linear-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-retro-green" />
            <h2 className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Area Performance</h2>
          </div>
          <AreaPerformanceTable />
        </div>
      </div>
    </div>
  );
};

export default RatesPage;
