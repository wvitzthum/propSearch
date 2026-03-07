import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar, 
  Maximize2, 
  Home,
  Zap,
  Gem,
  TrendingDown,
  Clock,
  Scale
} from 'lucide-react';
import { useProperties } from '../hooks/useProperties';
import AlphaBadge from '../components/AlphaBadge';
import LoadingNode from '../components/LoadingNode';

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { properties, loading } = useProperties();

  const property = useMemo(() => {
    return properties.find(p => p.id === id);
  }, [properties, id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingNode label="Syncing Asset..." />
    </div>
  );

  if (!property) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center bg-linear-bg text-white">
      <div className="h-20 w-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
        <ShieldAlert size={40} />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Property Not Found</h1>
      <p className="text-linear-text-muted mb-8 max-w-md">The asset you are looking for does not exist in our institutional database or has been removed.</p>
      <Link to="/dashboard" className="px-8 py-3 bg-white text-black rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors">
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>
    </div>
  );

  return (
    <div className="bg-linear-bg text-white">
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-bold text-linear-text-muted hover:text-white uppercase tracking-wider transition-colors mb-8 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Terminal
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-2 py-0.5 bg-linear-card text-linear-text-muted text-[10px] font-bold uppercase rounded border border-linear-border">
                {property.area}
              </span>
              {property.is_value_buy && (
                <span className="px-2 py-0.5 bg-retro-green/10 text-retro-green text-[10px] font-bold uppercase rounded border border-retro-green/30 flex items-center gap-1">
                  <Gem size={10} />
                  Value Buy
                </span>
              )}
              <span className="px-2 py-0.5 bg-linear-bg text-linear-accent text-[10px] font-mono font-bold uppercase rounded border border-linear-border">
                ID:{property.id.slice(0, 8)}
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-8 leading-tight tracking-tight">
              {property.address}
            </h1>

            <div className="grid grid-cols-3 gap-4 mb-12 py-8 border-y border-linear-border">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={12} className="text-linear-accent" /> Space
                </span>
                <span className="text-lg font-bold text-white tracking-tight">{property.sqft} SQFT</span>
              </div>
              <div className="flex flex-col gap-1 border-x border-linear-border px-4">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Home size={12} className="text-linear-accent" /> Tenure
                </span>
                <span className="text-lg font-bold text-white tracking-tight">{property.tenure}</span>
              </div>
              <div className="flex flex-col gap-1 pl-4">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Zap size={12} className="text-linear-accent" /> EPC
                </span>
                <span className="text-lg font-bold text-white tracking-tight">{property.epc} Rating</span>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-4">Institutional Connectivity</h2>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group hover:border-blue-400/30 transition-colors">
                      <div className="flex flex-col gap-1 relative z-10">
                        <span className="text-[10px] text-linear-text-muted uppercase font-black tracking-widest">Paternoster Sq</span>
                        <div className="text-3xl font-bold text-white tracking-tighter">{property.commute_paternoster}<span className="text-sm text-linear-text-muted ml-1 uppercase font-bold">Mins</span></div>
                      </div>
                      <Clock className="absolute -right-6 -bottom-6 text-blue-400/5 group-hover:text-blue-400/10 transition-colors" size={100} />
                   </div>
                   <div className="p-6 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group hover:border-emerald-400/30 transition-colors">
                      <div className="flex flex-col gap-1 relative z-10">
                        <span className="text-[10px] text-linear-text-muted uppercase font-black tracking-widest">Canada Square</span>
                        <div className="text-3xl font-bold text-white tracking-tighter">{property.commute_canada_square}<span className="text-sm text-linear-text-muted ml-1 uppercase font-bold">Mins</span></div>
                      </div>
                      <Clock className="absolute -right-6 -bottom-6 text-emerald-400/5 group-hover:text-emerald-400/10 transition-colors" size={100} />
                   </div>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-4">Acquisition Strategy</h2>
                <div className="p-6 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 text-white font-bold mb-3">
                      <Scale size={20} className="text-blue-400" />
                      {property.neg_strategy}
                    </div>
                    <p className="text-linear-text-muted text-sm leading-relaxed max-w-lg">
                      Based on a market duration of {property.dom} days, we recommend an {property.neg_strategy.toLowerCase().includes('aggressive') ? 'aggressive bidding posture' : 'entry at market value'}. 
                      The Realistic Price of £{property.realistic_price.toLocaleString()} represents a target entry point for immediate equity capture.
                    </p>
                  </div>
                  <TrendingDown className="absolute -right-8 -bottom-8 text-white/5 group-hover:text-blue-500/10 transition-colors" size={200} />
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-4">Institutional Alpha Analysis</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-5 border border-linear-border bg-linear-card rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Alpha Score</span>
                      <AlphaBadge score={property.alpha_score} className="scale-125 origin-right" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-linear-text-muted">Location Score</span>
                        <span className="font-bold text-white uppercase tracking-tighter">Prime / High</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-linear-border/50 pt-3">
                        <span className="text-linear-text-muted">Value Prop</span>
                        <span className={`font-bold uppercase tracking-tighter ${property.is_value_buy ? 'text-retro-green' : 'text-white'}`}>
                          {property.is_value_buy ? 'Excellent' : 'Stable'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-linear-border/50 pt-3">
                        <span className="text-linear-text-muted">Liquidity Rating</span>
                        <span className="font-bold text-white uppercase tracking-tighter text-blue-400">AA+</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border border-linear-border bg-linear-bg/50 rounded-2xl">
                    <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Calendar size={14} className="text-linear-accent" />
                      Market Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-linear-text-muted">
                          <Clock size={12} />
                          Days on Market
                        </div>
                        <span className="font-bold text-white">{property.dom} Days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-linear-border/50 pt-3">
                        <div className="flex items-center gap-2 text-linear-text-muted">
                          <Scale size={12} />
                          Price/SQM
                        </div>
                        <span className="font-bold text-white">£{property.price_per_sqm.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-linear-border/50 pt-3">
                        <div className="flex items-center gap-2 text-linear-text-muted">
                          <Clock size={12} />
                          Last Verified
                        </div>
                        <span className="text-[10px] font-bold text-retro-green uppercase">Live / Today</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-linear-card border border-linear-border rounded-2xl shadow-2xl p-6 sticky top-24 backdrop-blur-md">
              <div className="mb-8">
                <span className="text-[10px] text-linear-text-muted block uppercase font-bold tracking-[0.2em] mb-3">Institutional Target</span>
                <div className="text-4xl font-bold text-white tracking-tighter mb-1 flex items-baseline gap-1">
                  <span className="text-2xl text-linear-accent font-medium">£</span>
                  {property.realistic_price.toLocaleString()}
                </div>
                <div className="text-xs text-linear-text-muted">
                  List Price: <span className="line-through opacity-50">£{property.list_price.toLocaleString()}</span>
                  <span className="ml-2 text-rose-400 font-bold">-{Math.round((1 - property.realistic_price / property.list_price) * 100)}% Delta</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-xs text-linear-text-muted group">
                  <div className="h-5 w-5 rounded-full bg-retro-green/10 border border-retro-green/20 flex items-center justify-center text-retro-green">
                    <CheckCircle2 size={12} />
                  </div>
                  Verified Title Deeds
                </div>
                <div className="flex items-center gap-3 text-xs text-linear-text-muted group">
                  <div className="h-5 w-5 rounded-full bg-retro-green/10 border border-retro-green/20 flex items-center justify-center text-retro-green">
                    <CheckCircle2 size={12} />
                  </div>
                  Clean Service History
                </div>
                <div className="flex items-center gap-3 text-xs text-linear-text-muted group">
                  <div className="h-5 w-5 rounded-full bg-retro-green/10 border border-retro-green/20 flex items-center justify-center text-retro-green">
                    <CheckCircle2 size={12} />
                  </div>
                  Institutional Grade Asset
                </div>
              </div>

              <div className="space-y-3">
                <a 
                  href={property.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                >
                  Go to Source
                  <ExternalLink size={16} />
                </a>
                <button className="w-full py-3.5 bg-linear-card text-white border border-linear-border rounded-xl font-bold hover:bg-linear-accent transition-all active:scale-95 flex items-center justify-center gap-2">
                  Generate PDF
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-linear-border">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="text-[10px] leading-relaxed text-linear-text-muted">
                    Positioned in <span className="text-white font-bold">Prime {property.area.split(' (')[0]}</span>. High rental demand zone with strong historical capital appreciation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
