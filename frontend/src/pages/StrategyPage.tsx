import React from 'react';
import { ShieldCheck, TrendingUp, Target, BarChart3, Clock, ArrowUpRight } from 'lucide-react';
import KPICard from '../components/KPICard';

const StrategyPage: React.FC = () => {
  return (
    <div className="bg-linear-bg text-white">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Acquisition Strategy</h1>
        <p className="text-linear-text-muted text-sm">Institutional-grade bidding protocols and market analysis for March 2026.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <KPICard 
          label="Target Yield" 
          value="4.2%" 
          icon={TrendingUp} 
          trend={{ value: '+0.3%', isPositive: true }}
        />
        <KPICard 
          label="Max Entry Delta" 
          value="-12.5%" 
          icon={Target} 
        />
        <KPICard 
          label="Market Posture" 
          value="Aggressive" 
          icon={ShieldCheck} 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="p-8 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="text-blue-400" size={24} />
              Bidding Protocol v4.0
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent font-mono text-xs shrink-0">
                  01
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Initial Engagement</h3>
                  <p className="text-xs text-linear-text-muted leading-relaxed">
                    Target properties with {'>'}45 Days on Market (DoM). Initial offer at 15% below list price to establish anchor.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent font-mono text-xs shrink-0">
                  02
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Due Diligence Sprint</h3>
                  <p className="text-xs text-linear-text-muted leading-relaxed">
                    48-hour window for structural review and tenure validation. No offers without Alpha Score {'>'} 7.5.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent font-mono text-xs shrink-0">
                  03
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Closing Momentum</h3>
                  <p className="text-xs text-linear-text-muted leading-relaxed">
                    Cash-buyer status leveraged for 14-day exchange timeline. Target realistic price as hard ceiling.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <BarChart3 className="absolute -right-12 -bottom-12 text-white/5 group-hover:text-blue-500/10 transition-colors" size={240} />
        </div>

        <div className="space-y-6">
          <div className="p-6 border border-linear-border bg-linear-bg rounded-2xl">
            <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-6">Market Micro-Indicators</h2>
            <div className="space-y-4">
              {[
                { label: 'Islington Prime', status: 'Heating Up', trend: 'up' },
                { label: 'Bayswater Regency', status: 'Stable', trend: 'neutral' },
                { label: 'Marylebone Mews', status: 'Value Trap', trend: 'down' },
                { label: 'Chelsea Waterfront', status: 'Correction', trend: 'down' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-linear-card/50 border border-linear-border/50 hover:border-linear-accent transition-colors">
                  <span className="text-sm font-bold">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-linear-text-muted">{item.status}</span>
                    <ArrowUpRight size={14} className={item.trend === 'up' ? 'text-retro-green' : item.trend === 'down' ? 'text-rose-400' : 'text-linear-accent'} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border border-linear-border bg-linear-card rounded-2xl relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">System Update</h3>
                <p className="text-xs text-linear-text-muted">Next alpha re-calculation scheduled for 08:00 GMT.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyPage;
