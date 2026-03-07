import React, { useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  Zap, 
  TrendingDown,
  Scale,
  CheckCircle2,
  Bookmark,
  Archive,
  RotateCcw,
  Gem,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PropertyWithCoords } from '../hooks/useProperties';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from './AlphaBadge';

interface PreviewDrawerProps {
  property: PropertyWithCoords | null;
  isOpen: boolean;
  onClose: () => void;
  status: PropertyStatus;
  onStatusChange: (id: string, status: PropertyStatus) => void;
}

const PreviewDrawer: React.FC<PreviewDrawerProps> = ({ 
  property, 
  isOpen, 
  onClose,
  status,
  onStatusChange
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!property) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 w-full max-w-xl bg-linear-bg border-l border-linear-border z-[70] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-linear-border bg-linear-card/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest bg-linear-bg px-2 py-1 rounded border border-linear-border">
              Asset Preview
            </span>
            <span className="text-[10px] font-mono text-linear-accent uppercase">ID:{property.id.slice(0, 8)}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-linear-text-muted hover:text-white hover:bg-linear-card rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {/* Hero Image */}
          <div className="relative h-64 w-full bg-linear-card overflow-hidden">
            <img 
              src={`https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80&sig=${property.id.slice(0, 4)}`}
              alt={property.address}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-linear-bg via-transparent to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-linear-card/80 backdrop-blur-md text-linear-text-muted text-[10px] font-bold uppercase rounded border border-linear-border">
                  {property.area}
                </span>
                {property.is_value_buy && (
                  <span className="px-2 py-0.5 bg-emerald-500/90 backdrop-blur-md text-black text-[10px] font-black uppercase rounded flex items-center gap-1 border border-emerald-400">
                    <Gem size={10} />
                    Value Buy
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{property.address}</h2>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onStatusChange(property.id, status === 'shortlisted' ? 'discovered' : 'shortlisted')}
                className={`flex-grow flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                  status === 'shortlisted' 
                    ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-white hover:border-linear-accent'
                }`}
              >
                <Bookmark size={14} fill={status === 'shortlisted' ? 'currentColor' : 'none'} />
                {status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
              </button>
              <button 
                onClick={() => onStatusChange(property.id, status === 'archived' ? 'discovered' : 'archived')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                  status === 'archived' 
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 shadow-lg' 
                    : 'bg-linear-card border-linear-border text-linear-text-muted hover:text-rose-400 hover:border-rose-500/20'
                }`}
              >
                {status === 'archived' ? <RotateCcw size={14} /> : <Archive size={14} />}
              </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-4 border-y border-linear-border/50 py-6">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={10} className="text-linear-accent" /> Space
                </span>
                <span className="text-sm font-bold text-white tracking-tight">{property.sqft} SQFT</span>
              </div>
              <div className="flex flex-col gap-1 border-x border-linear-border px-4">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Scale size={10} className="text-linear-accent" /> Price/m²
                </span>
                <span className="text-sm font-bold text-white tracking-tight">£{property.price_per_sqm.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-1 pl-4">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Zap size={10} className="text-linear-accent" /> EPC
                </span>
                <span className="text-sm font-bold text-white tracking-tight">{property.epc} Rating</span>
              </div>
            </div>

            {/* Commute Grid */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Institutional Access</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-linear-card border border-linear-border rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:border-blue-400/30 transition-colors">
                   <div className="flex items-center justify-between relative z-10">
                     <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Paternoster Sq</span>
                     <TrendingDown size={12} className="text-blue-400" />
                   </div>
                   <div className="text-xl font-bold text-white relative z-10">{property.commute_paternoster}<span className="text-[10px] text-linear-text-muted ml-1">MINS</span></div>
                   <div className="absolute top-0 right-0 w-12 h-12 bg-blue-400/5 rounded-full -mr-6 -mt-6 group-hover:bg-blue-400/10 transition-colors" />
                </div>
                <div className="p-4 bg-linear-card border border-linear-border rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-400/30 transition-colors">
                   <div className="flex items-center justify-between relative z-10">
                     <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Canada Square</span>
                     <TrendingDown size={12} className="text-emerald-400" />
                   </div>
                   <div className="text-xl font-bold text-white relative z-10">{property.commute_canada_square}<span className="text-[10px] text-linear-text-muted ml-1">MINS</span></div>
                   <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-400/5 rounded-full -mr-6 -mt-6 group-hover:bg-emerald-400/10 transition-colors" />
                </div>
              </div>
            </div>

            {/* Strategy */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Acquisition Target</h3>
                <AlphaBadge score={property.alpha_score} />
              </div>
              <div className="p-5 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-white tracking-tighter mb-1">
                    <span className="text-xl text-linear-accent mr-1">£</span>
                    {property.realistic_price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-linear-text-muted mb-4 uppercase font-bold">
                    List: <span className="line-through">£{property.list_price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-2">
                    <TrendingDown size={14} />
                    {property.neg_strategy}
                  </div>
                  <p className="text-[11px] text-linear-text-muted leading-relaxed max-w-sm">
                    Strategic posture based on {property.dom} days on market. Recommend aggressive entry.
                  </p>
                </div>
                <Scale className="absolute -right-6 -bottom-6 text-white/5" size={120} />
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Verification Status</h3>
              {[
                'Verified Title Deeds',
                'No Outstanding Service Charges',
                'Institutional Grade Asset'
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px] text-linear-text-muted">
                  <div className="h-4 w-4 rounded-full bg-retro-green/10 flex items-center justify-center text-retro-green">
                    <CheckCircle2 size={10} />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-linear-border bg-linear-card/30 space-y-3">
          <Link 
            to={`/property/${property.id}`}
            className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            Deep Asset Scan
            <ArrowRight size={14} />
          </Link>
          <a 
            href={property.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-linear-card text-white border border-linear-border rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-linear-accent transition-all active:scale-95"
          >
            Go to Source
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </>
  );
};

export default PreviewDrawer;
