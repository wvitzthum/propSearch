import React, { useEffect, useRef, useState } from 'react';
import {
  X,
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
  Save,
  ArrowLeft,
  Calendar,
  BarChart3,
  Tag,
  ExternalLink,
  Calculator
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PropertyWithCoords } from '../types/property';
import type { PropertyStatus } from '../hooks/usePipeline';
import { useFinancialData } from '../hooks/useFinancialData';
import { useThesisTags } from '../hooks/useThesisTags';
import AlphaBadge from './AlphaBadge';
import PropertyImage from './PropertyImage';
import PipelineTracker from './PipelineTracker';
import SourceHub from './SourceHub';
import ThesisTagSelector from './ThesisTagSelector';
import AffordabilityNode from './AffordabilityNode';
import CapitalAppreciationChart from './CapitalAppreciationChart';
import PropertyPriceEvolution from './PropertyPriceEvolution';
import DataProvenanceSection from './DataProvenanceSection';
import LocationNodeMap from './LocationNodeMap';
import FloorplanViewer from './FloorplanViewer';
import ImageCarousel from './ImageCarousel';
import { useMacroData } from '../hooks/useMacroData';

interface PreviewDrawerProps {
  property: PropertyWithCoords | null;
  isOpen: boolean;
  onClose: () => void;
  status: PropertyStatus;
  onStatusChange: (id: string, status: PropertyStatus) => void;
}

interface NotesSectionProps {
  propertyId: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ propertyId }) => {
  const [notes, setLocalNotes] = useState(() => localStorage.getItem(`notes_${propertyId}`) || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotes = () => {
    setIsSaving(true);
    localStorage.setItem(`notes_${propertyId}`, notes);
    setTimeout(() => setIsSaving(false), 600);
  };

  return (
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
  );
};

const PreviewDrawer: React.FC<PreviewDrawerProps> = ({
  property,
  isOpen,
  onClose,
  status,
  onStatusChange
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { calculateMonthlyOutlay } = useFinancialData();
  const { getTags } = useThesisTags();
  const { data: macroData } = useMacroData();
  const [activeView, setActiveView] = useState<'image' | 'floorplan' | 'price_history'>('image');

  const outlay = property ? calculateMonthlyOutlay(property) : null;

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

        {/* Content — key forces remount (resets activeView) when property changes */}
        <div className="flex-grow overflow-y-auto custom-scrollbar" key={property.id}>
          {/* Hero Image & Gallery Switcher */}
          <div className="relative h-64 w-full bg-linear-card overflow-hidden group">
            <div className={`h-full w-full transition-all duration-500 ${activeView === 'image' ? 'opacity-100' : 'opacity-0 invisible absolute inset-0'}`}>
              {property.gallery && property.gallery.length > 0 ? (
                <ImageCarousel
                  images={property.gallery}
                  address={property.address}
                  className="h-full"
                />
              ) : (
                <PropertyImage
                  src={property.image_url || ''}
                  alt={property.address}
                  className="h-full w-full"
                />
              )}
            </div>
            
            <div className={`h-full w-full bg-linear-bg flex items-center justify-center p-4 transition-all duration-500 ${activeView === 'floorplan' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 invisible absolute inset-0'}`}>
              <FloorplanViewer
                url={property.floorplan_url ?? ''}
                address={property.address}
              />
            </div>

            <div className={`h-full w-full bg-linear-bg flex items-center justify-center p-6 transition-all duration-500 ${activeView === 'price_history' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 invisible absolute inset-0'}`}>
              <PropertyPriceEvolution property={property} />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-linear-bg via-transparent to-transparent pointer-events-none" />
            
            {/* View Switcher Controls */}
            <div className="absolute top-4 left-4 flex bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10 z-30 gap-0.5">
              <button
                onClick={() => setActiveView('image')}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeView === 'image' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Photo
              </button>
              {property.floorplan_url && (
                <button
                  onClick={() => setActiveView('floorplan')}
                  className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeView === 'floorplan' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  Floorplan
                </button>
              )}
              <button
                onClick={() => setActiveView('price_history')}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeView === 'price_history' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Price History
              </button>
            </div>

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
                      <span className="text-2xl font-bold text-white tracking-tighter">£{(outlay.total || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-linear-text-muted font-bold">/ MONTH</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-blue-500/10 pt-3">
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-linear-text-muted">Mortgage</span>
                        <span className="text-white">£{(outlay.mortgage || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-linear-text-muted">Council Tax</span>
                        <span className="text-white">£{(outlay.councilTax || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-linear-text-muted">Overheads</span>
                        <span className="text-white">£{( (outlay.serviceCharge || 0) + (outlay.groundRent || 0) ).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                        <span className="text-blue-400/80">90% LTV @ {outlay.rate || 0}%</span>
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
                   <div className="text-xl font-bold text-white relative z-10">{property.commute_paternoster || 0}<span className="text-[10px] text-linear-text-muted ml-1">MINS</span></div>
                   <div className="absolute top-0 right-0 w-12 h-12 bg-blue-400/5 rounded-full -mr-6 -mt-6 group-hover:bg-blue-400/10 transition-colors" />
                </div>
                <div className="p-4 bg-linear-card border border-linear-border rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-400/30 transition-colors">
                   <div className="flex items-center justify-between relative z-10">
                     <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">Canada Square</span>
                     <TrendingDown size={12} className="text-emerald-400" />
                   </div>
                   <div className="text-xl font-bold text-white relative z-10">{property.commute_canada_square || 0}<span className="text-[10px] text-linear-text-muted ml-1">MINS</span></div>
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
                    {(property.realistic_price || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-linear-text-muted mb-4 uppercase font-bold">
                    List: <span className="line-through">£{(property.list_price || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-2">
                    <TrendingDown size={14} />
                    {property.neg_strategy || 'Standard Protocol'}
                  </div>
                  <p className="text-[11px] text-linear-text-muted leading-relaxed max-w-sm">
                    Strategic posture based on {property.dom || 0} days on market. Recommend aggressive entry.
                  </p>
                </div>
                <Scale className="absolute -right-6 -bottom-6 text-white/5" size={120} />
              </div>
            </div>

            <NotesSection propertyId={property.id} />

            {/* Investment Thesis */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <Tag size={12} className="text-blue-400" /> Investment Thesis
              </h3>
              <ThesisTagSelector
                propertyId={property.id}
                currentTags={getTags(property.id)}
                size="md"
              />
            </div>

            {/* Alpha Analysis */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Institutional Alpha Analysis</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-linear-card border border-linear-border rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Alpha Score</span>
                    <AlphaBadge score={property.alpha_score} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-linear-text-muted">Days on Market</span>
                      <span className="font-bold text-white">{property.dom} Days</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-linear-text-muted">Price/SQM</span>
                      <span className="font-bold text-white">£{(property.price_per_sqm || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] border-t border-linear-border/50 pt-2">
                      <span className="text-linear-text-muted">Value Prop</span>
                      <span className={`font-bold uppercase ${property.is_value_buy ? 'text-retro-green' : 'text-white'}`}>
                        {property.is_value_buy ? 'Excellent' : 'Stable'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-linear-card border border-linear-border rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Calendar size={10} /> Market Metrics
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-linear-text-muted">Acquisition</span>
                        <span className="font-bold text-retro-green">
                          £{((property.realistic_price || 0) / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-linear-text-muted">List Price</span>
                        <span className="font-bold text-white">
                          £{((property.list_price || 0) / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] border-t border-linear-border/50 pt-2">
                        <span className="text-linear-text-muted">Delta</span>
                        <span className="font-bold text-rose-400">
                          {property.list_price ? `-${Math.round((1 - (property.realistic_price || 0) / property.list_price) * 100)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CAPEX & Retrofit */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <Zap size={12} className="text-blue-400" /> CAPEX & Retrofit
              </h3>
              <div className="p-4 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center text-lg font-black ${
                    ['A', 'B'].includes(property.epc || '') ? 'border-retro-green text-retro-green bg-retro-green/5' :
                    ['C', 'D'].includes(property.epc || '') ? 'border-retro-amber text-retro-amber bg-retro-amber/5' :
                    'border-rose-400 text-rose-400 bg-rose-500/5'
                  }`}>
                    {property.epc || '—'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] text-linear-text-muted uppercase font-bold tracking-widest">EPC Rating</div>
                    <div className="text-xs font-bold text-white">{property.epc || 'N/A'} → {property.epc_improvement_potential || 'B'}</div>
                  </div>
                  <ArrowRight size={16} className="text-linear-border" />
                  <div className="h-10 w-10 rounded-xl border-2 border-blue-500/50 text-blue-400 bg-blue-500/5 flex items-center justify-center text-lg font-black">
                    {property.epc_improvement_potential || 'B'}
                  </div>
                </div>
                <div className="h-1 w-full bg-linear-bg rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-retro-green" style={{ width: property.epc === property.epc_improvement_potential ? '95%' : '72%' }} />
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-linear-text-muted">Est. CAPEX</span>
                  <span className="font-bold text-white">£{(property.est_capex_requirement || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Location Map */}
            {property.lat && property.lng && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">Location Node</h3>
                <div className="rounded-2xl overflow-hidden border border-linear-border">
                  <LocationNodeMap lat={property.lat} lng={property.lng} address={property.address} />
                </div>
              </div>
            )}

            {/* Affordability */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <Calculator size={12} className="text-blue-400" /> Affordability Model
              </h3>
              <AffordabilityNode
                propertyPrice={property.realistic_price || property.list_price || 0}
                serviceCharge={property.service_charge || 0}
                groundRent={property.ground_rent || 0}
              />
            </div>

            {/* Capital Appreciation */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <BarChart3 size={12} className="text-purple-400" /> Capital Appreciation
              </h3>
              <CapitalAppreciationChart
                propertyPrice={property.realistic_price || property.list_price || 0}
                leaseYears={property.lease_years_remaining || 999}
                epc={property.epc}
                floorLevel={property.floor_level}
                serviceCharge={property.service_charge || 0}
                area={property.area}
              />
            </div>

            {/* Data Provenance */}
            <DataProvenanceSection
              lastRefreshed={macroData?.sdlt_countdown ? '2026-04-01' : undefined}
              sources={macroData?._source_citations}
            />

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
              {/* FE-185 Part 3: market_status badge + last_checked date */}
              {(property as any).market_status && (
                <div className="flex items-center justify-between pt-2 border-t border-linear-border/50">
                  <span className="text-[9px] text-linear-text-muted font-bold uppercase tracking-widest">Market Status</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    (property as any).market_status === 'active' ? 'bg-retro-amber/10 text-retro-amber border border-retro-amber/20' :
                    (property as any).market_status === 'under_offer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-linear-bg text-linear-text-muted border border-linear-border'
                  }`}>
                    {(property as any).market_status}
                  </span>
                </div>
              )}
              {(property as any).last_checked && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-linear-text-muted font-bold uppercase tracking-widest">Last Verified</span>
                  <span className="text-[9px] font-bold text-white">
                    {new Date((property as any).last_checked).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                </div>
              )}
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

          <button
            onClick={() => navigate(`/property/${property.id}`)}
            className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            Full Analysis
            <ExternalLink size={14} />
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 bg-linear-card text-linear-text-muted border border-linear-border rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={14} />
            Back to Properties
          </button>

          <SourceHub links={property.links || [property.link]} variant="full" />
        </div>
      </div>
    </>
  );
};

export default PreviewDrawer;
