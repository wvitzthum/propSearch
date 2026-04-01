import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  Maximize2,
  LayoutGrid,
  Home,
  Zap,
  Gem,
  TrendingDown,
  Clock,
  Scale,
  FileText,
  Save,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Tag
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { useFinancialData } from '../hooks/useFinancialData';
import AlphaBadge from '../components/AlphaBadge';
import LoadingNode from '../components/LoadingNode';
import PropertyImage from '../components/PropertyImage';
import LocationNodeMap from '../components/LocationNodeMap';
import PipelineTracker from '../components/PipelineTracker';
import SourceHub from '../components/SourceHub';
import type { PropertyWithCoords } from '../types/property';
import { usePipeline } from '../hooks/usePipeline';

import FloorplanViewer from '../components/FloorplanViewer';
import ThesisTagSelector from '../components/ThesisTagSelector';
import AffordabilityNode from '../components/AffordabilityNode';
import CapitalAppreciationChart from '../components/CapitalAppreciationChart';
import DataProvenanceSection from '../components/DataProvenanceSection';
import { useThesisTags } from '../hooks/useThesisTags';
import { useMacroData } from '../hooks/useMacroData';

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { properties, loading } = usePropertyContext();
  const { calculateMonthlyOutlay } = useFinancialData();
  const { getStatus, setStatus } = usePipeline();
  const { getTags } = useThesisTags();
  const { data: macroData } = useMacroData();
  const [activeTab, setActiveTab] = useState<'gallery' | 'floorplan'>('gallery');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [notes, setLocalNotes] = useState(() => {
    if (!id) return '';
    return localStorage.getItem(`notes_${id}`) || '';
  });
  const [isSaving, setIsSaving] = useState(false);

  const property = useMemo(() => {
    return properties.find(p => p.id === id) as PropertyWithCoords | undefined;
  }, [properties, id]);

  const allImages = useMemo(() => {
    if (!property) return [];
    const images = [property.image_url, ...(property.gallery || [])].filter(Boolean);
    return Array.from(new Set(images)) as string[];
  }, [property]);

  const outlay = property ? calculateMonthlyOutlay(property) : null;
  const status = property ? getStatus(property.id) : 'discovered';

  const handleSaveNotes = () => {
    if (!id) return;
    setIsSaving(true);
    localStorage.setItem(`notes_${id}`, notes);
    setTimeout(() => setIsSaving(false), 600);
  };

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
      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300">
          <button 
            onClick={() => setShowLightbox(false)}
            className="absolute top-8 right-8 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[110]"
          >
            <X size={32} />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
            }}
            className="absolute left-8 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[110]"
          >
            <ChevronLeft size={48} />
          </button>
          
          <div className="relative max-w-[85vw] max-h-[85vh] select-none">
            <img 
              src={allImages[activeImageIndex]} 
              alt="Gallery Zoom"
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
            />
            <div className="absolute -bottom-12 left-0 right-0 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Institutional Perspective {activeImageIndex + 1} of {allImages.length}
              </span>
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
            }}
            className="absolute right-8 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[110]"
          >
            <ChevronRight size={48} />
          </button>
        </div>
      )}

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

            {/* Asset Pipeline */}
            <div className="mb-12 p-8 bg-linear-card border border-linear-border rounded-3xl shadow-xl">
              <PipelineTracker
                status={status}
                onStatusChange={(newStatus) => setStatus(property.id, newStatus)}
              />
            </div>

            {/* Investment Thesis Tags */}
            <div className="mb-12 p-6 bg-linear-card border border-linear-border rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Tag size={14} className="text-blue-400" />
                  Investment Thesis
                </h3>
              </div>
              <ThesisTagSelector
                propertyId={property.id}
                currentTags={getTags(property.id)}
                size="lg"
              />
            </div>

            {/* Gallery & Floorplan Tabs */}
            <div className="mb-12">
              <div className="flex items-center gap-6 border-b border-linear-border mb-6">
                <button 
                  onClick={() => setActiveTab('gallery')}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'gallery' ? 'text-white' : 'text-linear-text-muted hover:text-white'}`}
                >
                  Gallery Stream
                  {activeTab === 'gallery' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-accent" />}
                </button>
                <button 
                  onClick={() => setActiveTab('floorplan')}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'floorplan' ? 'text-white' : 'text-linear-text-muted hover:text-white'}`}
                >
                  Spatial Blueprint
                  {activeTab === 'floorplan' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-accent" />}
                </button>
              </div>

              {activeTab === 'gallery' ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div 
                    onClick={() => setShowLightbox(true)}
                    className="relative aspect-[16/9] w-full bg-linear-card rounded-2xl overflow-hidden group border border-linear-border/50 cursor-zoom-in"
                  >
                    <PropertyImage 
                      src={allImages[activeImageIndex]}
                      alt={property.address}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-linear-bg/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                      <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10 uppercase tracking-widest flex items-center gap-2">
                        <Maximize2 size={12} />
                        Launch High-Res Scanner
                      </span>
                    </div>
                  </div>
                  
                  {allImages.length > 1 && (
                    <div className="grid grid-cols-5 gap-4">
                      {allImages.map((url, i) => (
                        <div 
                          key={i} 
                          onClick={() => setActiveImageIndex(i)}
                          className={`aspect-[4/3] rounded-xl overflow-hidden border transition-all cursor-pointer relative group ${
                            i === activeImageIndex ? 'border-linear-accent ring-2 ring-linear-accent/20 scale-95' : 'border-linear-border hover:border-white/40'
                          }`}
                        >
                          <PropertyImage 
                            src={url} 
                            className={`h-full w-full object-cover transition-all duration-500 ${
                              i === activeImageIndex ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'
                            }`} 
                            alt={`Gallery ${i}`} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-in fade-in duration-500 h-[600px]">
                  {property.floorplan_url ? (
                    <FloorplanViewer 
                      url={property.floorplan_url} 
                      address={property.address} 
                    />
                  ) : (
                    <div className="py-20 h-full bg-linear-card/30 border border-dashed border-linear-border rounded-2xl flex flex-col items-center justify-center text-center px-8">
                       <div className="h-16 w-16 bg-linear-card text-linear-text-muted rounded-2xl flex items-center justify-center mb-6 border border-linear-border">
                          <Layers size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Spatial Data Missing</h2>
                        <p className="text-linear-text-muted text-xs uppercase tracking-widest font-bold opacity-70 max-w-xs">
                          No floorplan was detected during the automated scan of this asset. Spatial volume assessment limited to on-site inspection.
                        </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-12 py-8 border-y border-linear-border">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={12} className="text-linear-accent" /> Space
                </span>
                <span className="text-lg font-bold text-white tracking-tight">{property.sqft} SQFT</span>
              </div>
              <div className="flex flex-col gap-1 border-x border-linear-border px-4">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <LayoutGrid size={12} className="text-linear-accent" /> Floor
                </span>
                <span className="text-lg font-bold text-white tracking-tight uppercase">{property.floor_level || '—'}</span>
              </div>
              <div className="flex flex-col gap-1 border-r border-linear-border px-4">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Home size={12} className="text-linear-accent" /> Tenure
                </span>
                <span className="text-lg font-bold text-white tracking-tight leading-tight">{property.tenure}</span>
              </div>
              <div className="flex flex-col gap-1 pl-4">
                <span className="text-[10px] text-linear-text-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Zap size={12} className="text-linear-accent" /> EPC
                </span>
                <span className="text-lg font-bold text-white tracking-tight">{property.epc} Rating</span>
              </div>
            </div>

            {/* Asset Overhead */}
            <div className="mb-12">
              <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingDown size={14} className="text-retro-green" />
                Asset Overhead & Costs
              </h2>
              <div className="p-8 bg-linear-card border border-linear-border rounded-3xl grid sm:grid-cols-2 gap-12 group hover:border-linear-accent/20 transition-colors">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] text-linear-text-muted uppercase font-black tracking-widest">Est. Service Charge</span>
                  <div className="text-4xl font-bold text-white tracking-tighter">
                    £{property.service_charge.toLocaleString()}
                    <span className="text-sm text-linear-text-muted ml-1 uppercase font-black">/ Per Year</span>
                  </div>
                  <div className="h-1 w-full bg-linear-bg rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-linear-accent/30 w-[45%]" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:border-l sm:border-linear-border sm:pl-12">
                  <span className="text-[10px] text-linear-text-muted uppercase font-black tracking-widest">Ground Rent</span>
                  <div className="text-4xl font-bold text-white tracking-tighter">
                    £{property.ground_rent.toLocaleString()}
                    <span className="text-sm text-linear-text-muted ml-1 uppercase font-black">/ Per Year</span>
                  </div>
                  <div className="h-1 w-full bg-linear-bg rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-linear-accent/10 w-[15%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Monthly Outlay */}
            {outlay && (
              <div className="mb-12">
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <TrendingUp size={14} />
                  Institutional Ownership Model
                </h2>
                <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-3xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
                  <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                    <BarChart3 size={300} />
                  </div>
                  
                  <div className="relative z-10 grid sm:grid-cols-2 gap-12">
                    <div>
                      <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest block mb-2">Total Monthly Outlay</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white tracking-tighter">£{outlay.total.toLocaleString()}</span>
                        <span className="text-sm text-linear-text-muted font-black uppercase">/ Month</span>
                      </div>
                      <p className="mt-4 text-xs text-linear-text-muted leading-relaxed max-w-xs">
                        Aggregate carry cost including mortgage servicing (90% LTV), council tax, and institutional overheads.
                      </p>
                    </div>
                    
                    <div className="flex flex-col justify-center space-y-4 sm:border-l sm:border-blue-500/10 sm:pl-12">
                      <div className="flex justify-between items-center group/item">
                        <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-wider group-hover/item:text-white transition-colors">Mortgage (Principal & Interest)</span>
                        <span className="text-sm font-bold text-white tracking-tight">£{outlay.mortgage.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-wider group-hover/item:text-white transition-colors">Estimated Council Tax</span>
                        <span className="text-sm font-bold text-white tracking-tight">£{outlay.councilTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-wider group-hover/item:text-white transition-colors">Service Charge & Ground Rent</span>
                        <span className="text-sm font-bold text-white tracking-tight">£{(outlay.serviceCharge + outlay.groundRent).toLocaleString()}</span>
                      </div>
                      <div className="pt-4 mt-2 border-t border-blue-500/10 flex items-center justify-between">
                        <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Financing: 90% LTV @ {outlay.rate}% Fixed</span>
                        <span className="text-[9px] font-mono text-linear-text-muted">ID: FIN-OUT-{property.id.slice(0, 4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Affordability Node */}
            <div className="mb-12">
              <AffordabilityNode
                propertyPrice={property.realistic_price}
                serviceCharge={property.service_charge}
                groundRent={property.ground_rent}
              />
            </div>

            {/* 5-Year Capital Appreciation Model */}
            <div className="mb-12">
              <CapitalAppreciationChart
                propertyPrice={property.realistic_price}
                leaseYears={property.lease_years_remaining}
                epc={property.epc}
                floorLevel={property.floor_level}
                serviceCharge={property.service_charge}
                area={property.area}
              />
            </div>

            {/* Data Provenance */}
            <DataProvenanceSection lastRefreshed={macroData?.sdlt_countdown ? '2026-04-01' : undefined} sources={macroData?._source_citations} />

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
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-linear-card border border-linear-border rounded-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 text-white font-bold mb-3">
                        <Scale size={20} className="text-blue-400" />
                        {property.neg_strategy || 'Default Protocol'}
                      </div>
                      <p className="text-linear-text-muted text-sm leading-relaxed max-w-lg">
                        Based on a market duration of {property.dom} days, we recommend an {(property.neg_strategy || '').toLowerCase().includes('aggressive') ? 'aggressive bidding posture' : 'entry at market value'}. 
                        The Realistic Price of £{property.realistic_price.toLocaleString()} represents a target entry point for immediate equity capture.
                      </p>
                    </div>
                    <TrendingDown className="absolute -right-8 -bottom-8 text-white/5 group-hover:text-blue-500/10 transition-colors" size={200} />
                  </div>

                  {/* Negotiation Buffer Visualization */}
                  <div className="p-6 bg-linear-card border border-linear-border rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <Zap size={14} className="text-retro-green" />
                          Negotiation Buffer
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          property.dom > 90 ? 'text-retro-green border-retro-green/20 bg-retro-green/10' :
                          property.dom > 30 ? 'text-blue-400 border-blue-400/20 bg-blue-400/10' :
                          'text-linear-text-muted border-linear-border bg-linear-bg'
                        }`}>
                          {property.dom > 90 ? 'Aggressive' : property.dom > 30 ? 'Moderate' : 'Conservative'}
                        </span>
                      </div>

                      <div className="space-y-6">
                        <div className="relative pt-2">
                          <div className="h-1.5 w-full bg-linear-bg rounded-full overflow-hidden flex">
                            <div className="h-full bg-linear-accent opacity-20" style={{ width: '70%' }} />
                            <div className="h-full bg-retro-green" style={{ width: '15%' }} />
                            <div className="h-full bg-linear-bg" style={{ width: '15%' }} />
                          </div>
                          <div className="absolute top-0 left-[70%] h-5 w-px bg-white/20" />
                          <div className="absolute top-0 left-[85%] h-5 w-px bg-white/20" />
                          
                          <div className="flex justify-between mt-3 text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">
                            <span>Target Bid</span>
                            <span>Realistic</span>
                            <span>List Price</span>
                          </div>
                          <div className="flex justify-between mt-1 font-mono text-[10px]">
                            <span className="text-retro-green font-black">£{Math.round(property.realistic_price * 0.95).toLocaleString()}</span>
                            <span className="text-white">£{property.realistic_price.toLocaleString()}</span>
                            <span className="text-linear-text-muted opacity-60">£{property.list_price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-linear-border flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Max Capture</span>
                        <span className="text-xs font-bold text-retro-green tracking-tight">£{Math.round(property.list_price - (property.realistic_price * 0.95)).toLocaleString()}</span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest">Post-90d Delta</span>
                        <span className="text-xs font-bold text-white tracking-tight">-5.0%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-4">Institutional Alpha Analysis</h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
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

                {/* CAPEX & Retrofit Node */}
                <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-4">CAPEX & Retrofit Modeling</h2>
                <div className="p-8 bg-linear-card border border-linear-border rounded-3xl relative overflow-hidden group shadow-2xl">
                  <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Zap size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight">EPC Optimization Path</h3>
                          <p className="text-xs text-linear-text-muted">Mandatory efficiency upgrades for institutional grade liquidity.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 mb-8">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest mb-2">Current</span>
                          <div className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${
                            ['A', 'B'].includes(property.epc) ? 'border-retro-green text-retro-green bg-retro-green/5' :
                            ['C', 'D'].includes(property.epc) ? 'border-retro-amber text-retro-amber bg-retro-amber/5' :
                            'border-rose-500 text-rose-400 bg-rose-500/5'
                          }`}>
                            {property.epc}
                          </div>
                        </div>
                        <ArrowRight size={24} className="text-linear-border mt-4" />
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Potential</span>
                          <div className="h-14 w-14 rounded-2xl border-2 border-blue-500/50 text-blue-400 bg-blue-500/5 flex items-center justify-center text-2xl font-black shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            {property.epc_improvement_potential || 'B'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-linear-text-muted">Efficiency Gain</span>
                          <span className="text-retro-green font-bold">
                            +{property.epc === property.epc_improvement_potential ? '0' : 
                              (property.epc < (property.epc_improvement_potential || 'B') ? '15' : '22')}% Thermal Retention
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-linear-bg rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-retro-green transition-all duration-1000" 
                            style={{ width: property.epc === property.epc_improvement_potential ? '95%' : '75%' }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-linear-bg/50 border border-linear-border rounded-2xl p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-[9px] font-black text-linear-text-muted uppercase tracking-widest block mb-1">Est. CAPEX Requirement</span>
                          <div className="text-3xl font-bold text-white tracking-tighter">
                            £{(property.est_capex_requirement || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase">
                          {property.est_capex_requirement ? 'Class 1 Quote' : 'Estimate Needed'}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {property.est_capex_requirement ? (
                          <>
                            <div className="flex items-center gap-3 text-[11px] text-linear-text-muted">
                              <CheckCircle2 size={14} className="text-retro-green" />
                              <span>Optimization target: {property.epc_improvement_potential} Rating</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-linear-text-muted">
                              <CheckCircle2 size={14} className="text-retro-green" />
                              <span>Retrofit scope including thermal retention upgrades</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-linear-text-muted">
                              <CheckCircle2 size={14} className="text-retro-green" />
                              <span>Smart HVAC & LED institutional standard sync</span>
                            </div>
                          </>
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-[10px] text-linear-text-muted uppercase font-bold italic">No active CAPEX quotes for this asset.</p>
                          </div>
                        )}
                      </div>

                      <button 
                        disabled={!property.est_capex_requirement}
                        className={`w-full mt-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                          property.est_capex_requirement 
                            ? 'bg-linear-accent text-white hover:brightness-110 shadow-linear-accent/10' 
                            : 'bg-linear-card text-linear-text-muted border border-linear-border cursor-not-allowed'
                        }`}
                      >
                        {property.est_capex_requirement ? 'View Detailed CAPEX Breakdown' : 'Request Retrofit Quote'}
                      </button>
                    </div>
                  </div>
                  <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                    <TrendingUp size={400} />
                  </div>
                </div>
              </div>

              {/* Location Node Mini-Map */}
              {property && (
                <div>
                  <h2 className="text-xs font-bold text-linear-text-muted uppercase tracking-widest mb-4">Location Node Context</h2>
                  <LocationNodeMap lat={property.lat} lng={property.lng} address={property.address} />
                </div>
              )}
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
                <SourceHub links={property.links || [property.link]} variant="full" />
                <button className="w-full py-3.5 bg-linear-card text-white border border-linear-border rounded-xl font-bold hover:bg-linear-accent transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                  Generate PDF Report
                </button>
              </div>

              {/* Analyst Annotations */}
              <div className="mt-8 pt-8 border-t border-linear-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText size={12} className="text-linear-accent" /> Analyst Notes
                  </h3>
                  <button 
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${
                      isSaving ? 'bg-retro-green/20 text-retro-green' : 'bg-linear-card text-linear-text-muted hover:text-white'
                    }`}
                  >
                    <Save size={10} />
                    {isSaving ? 'Secured' : 'Sync'}
                  </button>
                </div>
                <div className="relative group">
                  <textarea 
                    value={notes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Strategic observations..."
                    className="w-full h-40 bg-linear-bg border border-linear-border rounded-xl p-4 text-xs text-white placeholder:text-linear-text-muted/40 focus:outline-none focus:border-linear-accent/50 focus:ring-1 focus:ring-linear-accent/10 transition-all resize-none custom-scrollbar"
                  />
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[8px] font-mono text-linear-text-muted uppercase">
                    Local Persistence
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-linear-border">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-lg bg-linear-bg border border-linear-border flex items-center justify-center text-linear-accent shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="text-[10px] leading-relaxed text-linear-text-muted">
                    Positioned in <span className="text-white font-bold">Prime {(property.area || 'Unknown').split(' (')[0]}</span>. High rental demand zone with strong historical capital appreciation.
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
