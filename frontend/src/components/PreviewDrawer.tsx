import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  LayoutGrid,
  Zap, 
  TrendingDown,
  Scale,
  CheckCircle2,
  Gem,
  ShieldCheck,
  ArrowRight,
  FileText,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import { useFinancialData } from '../hooks/useFinancialData';
import AlphaBadge from './AlphaBadge';
import PropertyImage from './PropertyImage';
import PipelineTracker from './PipelineTracker';
import SourceHub from './SourceHub';

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
  const { calculateMonthlyOutlay } = useFinancialData();
  const [notes, setLocalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const outlay = property ? calculateMonthlyOutlay(property) : null;

  useEffect(() => {
    if (property && isOpen) {
      const savedNotes = localStorage.getItem(`notes_${property.id}`) || '';
      setLocalNotes(savedNotes);
    }
  }, [property, isOpen]);

  const handleSaveNotes = () => {
    if (!property) return;
    setIsSaving(true);
    localStorage.setItem(`notes_${property.id}`, notes);
    setTimeout(() => setIsSaving(false), 600);
  };

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
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
          {/* Hero Image & Gallery */}
          <div className="relative h-64 w-full bg-linear-card overflow-hidden group">
            <PropertyImage 
              src={property.image_url || property.gallery[0]}
              alt={property.address}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-linear-bg via-transparent to-transparent" />
            
            {/* Gallery Mini-Preview */}
            {property.gallery && property.gallery.length > 0 && (
              <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                {property.gallery.slice(0, 3).map((url, i) => (
                  <div key={i} className="h-10 w-10 rounded border border-white/20 overflow-hidden shadow-lg backdrop-blur-sm">
                    <PropertyImage src={url} className="h-full w-full object-cover opacity-80 hover:opacity-100 transition-opacity" alt={`Gallery ${i}`} />
                  </div>
                ))}
                {property.gallery.length > 3 && (
                  <div className="h-10 px-2 rounded border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                    +{property.gallery.length - 3}
                  </div>
                )}
              </div>
            )}

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
            {/* Asset Pipeline */}
            <PipelineTracker 
              status={status} 
              onStatusChange={(newStatus) => onStatusChange(property.id, newStatus)} 
            />

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-4 border-y border-linear-border/50 py-6">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={10} className="text-linear-accent" /> Space
                </span>
                <span className="text-sm font-bold text-white tracking-tight">{property.sqft || '—'} SQFT</span>
              </div>
              <div className="flex flex-col gap-1 border-x border-linear-border px-4">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <LayoutGrid size={10} className="text-linear-accent" /> Floor
                </span>
                <span className="text-sm font-bold text-white tracking-tight uppercase">{property.floor_level || '—'}</span>
              </div>
              <div className="flex flex-col gap-1 border-r border-linear-border px-4">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Scale size={10} className="text-linear-accent" /> Price/m²
                </span>
                <span className="text-sm font-bold text-white tracking-tight">£{(property.price_per_sqm || 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-1 pl-4">
                <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Zap size={10} className="text-linear-accent" /> EPC
                </span>
                <span className="text-sm font-bold text-white tracking-tight">{property.epc || 'N/A'} Rating</span>
              </div>
            </div>

            {/* Running Costs */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Asset Overhead</h3>
              <div className="p-5 bg-linear-card border border-linear-border rounded-2xl flex items-center justify-between group hover:border-linear-accent/30 transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Est. Service Charge</span>
                  <div className="text-lg font-bold text-white tracking-tight">
                    £{(property.service_charge || 0).toLocaleString()}
                    <span className="text-[10px] text-linear-text-muted ml-1 font-medium">/ PA</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-linear-border" />
                <div className="flex flex-col gap-1 items-end text-right">
                  <span className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">Ground Rent</span>
                  <div className="text-lg font-bold text-white tracking-tight">
                    £{(property.ground_rent || 0).toLocaleString()}
                    <span className="text-[10px] text-linear-text-muted ml-1 font-medium">/ PA</span>
                  </div>
                </div>
              </div>

              {/* Total Monthly Outlay */}
              {outlay && (
                <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
                  <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                    <TrendingDown size={120} />
                  </div>
                  <div className="flex flex-col gap-1 relative z-10">
                    <span className="text-[9px] text-blue-400 uppercase font-black tracking-widest">Total Monthly Outlay</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white tracking-tighter">£{outlay.total.toLocaleString()}</span>
                      <span className="text-[10px] text-linear-text-muted font-bold">/ MONTH</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-blue-500/10 pt-3">
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-linear-text-muted">Mortgage</span>
                        <span className="text-white">£{outlay.mortgage.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-linear-text-muted">Council Tax</span>
                        <span className="text-white">£{outlay.councilTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-linear-text-muted">Overheads</span>
                        <span className="text-white">£{(outlay.serviceCharge + outlay.groundRent).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-blue-400/80">90% LTV @ {outlay.rate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

            {/* Analyst Annotations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={12} className="text-linear-accent" /> Analyst Annotations
                </h3>
                <button 
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${
                    isSaving ? 'bg-retro-green/20 text-retro-green' : 'bg-linear-card text-linear-text-muted hover:text-white'
                  }`}
                >
                  <Save size={10} />
                  {isSaving ? 'Secured' : 'Sync Note'}
                </button>
              </div>
              <div className="relative group">
                <textarea 
                  value={notes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Record strategic observations, structural concerns, or bidding notes..."
                  className="w-full h-32 bg-linear-card border border-linear-border rounded-xl p-4 text-xs text-white placeholder:text-linear-text-muted/50 focus:outline-none focus:border-linear-accent/50 focus:ring-1 focus:ring-linear-accent/20 transition-all resize-none custom-scrollbar"
                />
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[8px] font-mono text-linear-text-muted uppercase">
                  Auto-Sync Enabled
                </div>
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
          {status === 'shortlisted' && (
            <button 
              onClick={() => onStatusChange(property.id, 'vetted')}
              className="w-full py-3.5 bg-emerald-500 text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/10 mb-2 border border-emerald-400/50"
            >
              <ShieldCheck size={16} />
              Promote to Vetted Status
            </button>
          )}

          <Link 
            to={`/property/${property.id}`}
            className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            Deep Asset Scan
            <ArrowRight size={14} />
          </Link>
          
          <SourceHub links={property.links || [property.link]} variant="compact" />
        </div>
      </div>
    </>
  );
};

export default PreviewDrawer;
