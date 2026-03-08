import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  Map as MapIcon, 
  TrendingUp, 
  Target,
  ChevronRight
} from 'lucide-react';
import MarketSituationRoom from '../components/MarketSituationRoom';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-linear-bg text-white min-h-screen">
      {/* Hero Section - Institutional Entry */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-48 border-b border-linear-border">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[800px] w-[800px] rounded-full bg-blue-500/5 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[800px] w-[800px] rounded-full bg-indigo-500/5 opacity-50 blur-3xl"></div>
        
        {/* Animated Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]"></div>

        <div className="relative px-6 mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-linear-card/80 backdrop-blur-md text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-linear-border shadow-xl">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]"></span>
              Live Market Intelligence Protocol v2.6
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.9] mb-10 tracking-tighter">
              PRECISION <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">ACQUISITION</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-linear-text-muted mb-12 max-w-2xl leading-relaxed font-medium">
              Institutional-grade property discovery and macro-timing engine. 
              Built for the private buyer who demands Bloomberg-density intelligence 
              and Linear-precision execution.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 items-center">
              <Link to="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 text-xs">
                Enter Command Center
                <ArrowRight size={18} />
              </Link>
              <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-linear-card/50 backdrop-blur-md text-white border border-linear-border rounded-xl font-black uppercase tracking-widest hover:bg-linear-accent transition-all active:scale-95 text-xs">
                Protocol Overview
              </button>
            </div>

            <div className="mt-20 flex flex-wrap items-center gap-12 border-t border-linear-border/30 pt-10">
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-black text-white tracking-tighter italic">500+</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-linear-text-muted opacity-60">Assets Indexed</span>
              </div>
              <div className="h-10 w-px bg-linear-border"></div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-black text-white tracking-tighter italic">£1.8M</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-linear-text-muted opacity-60">Avg Entry PCL</span>
              </div>
              <div className="h-10 w-px bg-linear-border"></div>
              <div className="flex flex-col gap-1 text-emerald-400">
                <span className="text-3xl font-black tracking-tighter italic">7.4%</span>
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Avg Neg Delta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Situation Room Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <MarketSituationRoom />
        </div>
      </section>

      {/* Features - Institutional Modules */}
      <section className="py-32 bg-linear-card/20 border-t border-linear-border relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"></div>
        
        <div className="px-6 relative mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-[10px] font-black text-linear-accent uppercase tracking-[0.3em] mb-6">Core Modules</h2>
              <h3 className="text-4xl lg:text-5xl font-bold text-white tracking-tighter leading-tight">
                Automated Intelligence <br />
                For High-Stakes Decisions.
              </h3>
            </div>
            <p className="text-linear-text-muted max-w-sm text-sm leading-relaxed font-medium">
              Built on institutional data schemas, immoSearch provides high-density visualization for rapid asset verification.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-10 bg-linear-card/50 backdrop-blur-md rounded-3xl border border-linear-border shadow-sm hover:border-blue-500/30 transition-all group relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 text-white/5 group-hover:text-blue-500/10 transition-colors">
                 <Target size={180} />
              </div>
              <div className="h-14 w-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Alpha Score™</h3>
              <p className="text-linear-text-muted leading-relaxed text-sm font-medium">
                Proprietary 0-10 scoring system based on tenure, efficiency, and micro-location transport links.
              </p>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Module Active <ChevronRight size={12} />
              </div>
            </div>

            <div className="p-10 bg-linear-card/50 backdrop-blur-md rounded-3xl border border-linear-border shadow-sm hover:border-purple-500/30 transition-all group relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 text-white/5 group-hover:text-purple-500/10 transition-colors">
                 <MapIcon size={180} />
              </div>
              <div className="h-14 w-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mb-8 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <MapIcon size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Geospatial Intel</h3>
              <p className="text-linear-text-muted leading-relaxed text-sm font-medium">
                Real-time visualization of prime London assets with localized pricing heatmaps and transport proximity nodes.
              </p>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Module Active <ChevronRight size={12} />
              </div>
            </div>

            <div className="p-10 bg-linear-card/50 backdrop-blur-md rounded-3xl border border-linear-border shadow-sm hover:border-emerald-500/30 transition-all group relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 text-white/5 group-hover:text-emerald-500/10 transition-colors">
                 <Activity size={180} />
              </div>
              <div className="h-14 w-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Bidding Protocol</h3>
              <p className="text-linear-text-muted leading-relaxed text-sm font-medium">
                Automated negotiation strategies calculated from Days on Market (DoM) and historical pricing delta.
              </p>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Module Active <ChevronRight size={12} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-20 px-6 border-t border-linear-border">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 bg-white text-black rounded font-black flex items-center justify-center text-xl tracking-tighter">i</div>
               <span className="text-lg font-black text-white tracking-tighter uppercase">immoSearch // 2026</span>
            </div>
            <div className="flex gap-8 text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">
               <span className="hover:text-white cursor-pointer transition-colors">Private Instance</span>
               <span className="hover:text-white cursor-pointer transition-colors">System Status: Optimal</span>
               <span className="hover:text-white cursor-pointer transition-colors">Encrypted Connection</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
