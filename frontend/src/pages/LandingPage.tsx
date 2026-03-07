import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3, Map as MapIcon } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[600px] w-[600px] rounded-full bg-blue-50 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[600px] w-[600px] rounded-full bg-blue-50 opacity-50 blur-3xl"></div>
        
        <div className="relative px-6 mx-auto max-w-7xl">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                Prime London Property Data
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-8 tracking-tight">
                Institutional Grade <br />
                <span className="text-blue-900">Property Acquisition</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 max-w-xl leading-relaxed">
                Unlock high-precision property data for London's prime markets. 
                Our multi-agent system filters, analyzes, and scores every property 
                to find your next 💎 Value Buy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/dashboard" className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 active:scale-95">
                  Launch Dashboard
                  <ArrowRight size={18} />
                </Link>
                <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 transition-all active:scale-95">
                  View Demo Data
                </button>
              </div>
              <div className="mt-12 flex items-center gap-8 text-slate-400">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">50+</span>
                  <span className="text-sm">Daily Analyzed</span>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">£35M+</span>
                  <span className="text-sm">Total Assets</span>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">9.2</span>
                  <span className="text-sm">Avg Alpha Score</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block lg:col-span-5 relative">
              <div className="relative z-10 p-4 bg-white rounded-2xl shadow-2xl border border-slate-100 rotate-2">
                <div className="h-64 rounded-xl bg-slate-100 animate-pulse mb-4 flex items-center justify-center text-slate-300">
                   <BarChart3 size={48} />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-10 w-full bg-blue-900/5 rounded-lg border border-blue-900/10"></div>
                </div>
              </div>
              <div className="absolute -bottom-10 -left-10 z-20 p-4 bg-white rounded-2xl shadow-2xl border border-slate-100 -rotate-3 w-64">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <ShieldCheck size={24} />
                  </div>
                  <span className="font-bold text-slate-900">Alpha Score 9.4</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-emerald-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Precision Engineering for Real Estate</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Built on institutional standards, immoSearch provides the density of a Bloomberg Terminal with the usability of modern SaaS.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Alpha Score™ Logic</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Proprietary 0-10 scoring system based on tenure, efficiency, and micro-location transport links.
              </p>
            </div>
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <MapIcon size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Spatial Analysis</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Real-time geospatial visualization of prime London assets with localized pricing heatmaps.
              </p>
            </div>
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Negotiation Engine</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Automated bidding strategies based on Days on Market (DoM) and pricing delta analysis.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
