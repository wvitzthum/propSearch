import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  ShieldAlert,
  Maximize2,
  Gem,
  FileText,
  Save,
  BarChart3,
  TrendingUp,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  Settings,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  CirclePercent,
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { useFinancialData } from '../hooks/useFinancialData';
import LoadingNode from '../components/LoadingNode';
import PropertyImage from '../components/PropertyImage';
import LocationNodeMap from '../components/LocationNodeMap';
import PropertyLifecycleBar from '../components/PropertyLifecycleBar';
import SourceHub from '../components/SourceHub';
import type { PropertyWithCoords } from '../types/property';
import { usePipeline } from '../hooks/usePipeline';

import FloorplanViewer from '../components/FloorplanViewer';

// UX-97: Shared freshness computation — same logic as DataProvenanceSection
function computeFreshness(lastRefreshed?: string): { color: string; bg: string; label: string } {
  if (!lastRefreshed) return { color: '#a1a1aa', bg: 'bg-zinc-600', label: 'UNKNOWN' };
  const refreshed = new Date(lastRefreshed);
  const now = new Date();
  const daysDiff = (now.getTime() - refreshed.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) return { color: '#22c55e', bg: 'bg-emerald-500/20', label: 'CURRENT' };
  if (daysDiff <= 30) return { color: '#f59e0b', bg: 'bg-amber-500/20', label: 'STALE' };
  return { color: '#ef4444', bg: 'bg-red-500/20', label: 'OUTDATED' };
}

function daysAgo(dateStr: string): number {
  const then = new Date(dateStr);
  return Math.floor((new Date().getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}
import ThesisTagSelector from '../components/ThesisTagSelector';
import RentalYieldVsGiltChartWithRent from '../components/RentalYieldVsGiltChartWithRent';
import CapitalAppreciationChart from '../components/CapitalAppreciationChart';
import DataProvenanceSection from '../components/DataProvenanceSection';
import PropertyPriceEvolution from '../components/PropertyPriceEvolution';
import NeighbourhoodSection from '../components/NeighbourhoodSection';
import { useThesisTags } from '../hooks/useThesisTags';
import { useMacroData } from '../hooks/useMacroData';
import { fmtPrice, fmtNum } from '../utils/format';
import { showToast } from '../utils/toast';
import { buildNegotiationTiers } from '../utils/negotiationTiers';
import { useAffordability } from '../hooks/useAffordability';
import AcquisitionStrategy from '../components/AcquisitionStrategy';
import EnrichmentModal from '../components/EnrichmentModal';
import PriceAssessment from '../components/PriceAssessment';

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { properties, loading, recheckProperty } = usePropertyContext();
  const { calculateMonthlyOutlay } = useFinancialData();
  const { calculateSDLT, getLTVMatchScore } = useAffordability();
  const { getStatus, setStatus } = usePipeline();
  const { getTags } = useThesisTags();
  const { data: macroData } = useMacroData();
  const [activeTab, setActiveTab] = useState<'gallery' | 'floorplan' | 'price_history'>('gallery');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [notes, setLocalNotes] = useState(() => {
    if (!id) return '';
    return localStorage.getItem(`notes_${id}`) || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false); // FE-231: recheck button loading state
  const [showEnrichmentModal, setShowEnrichmentModal] = useState(false); // FE-237: enrichment modal
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [showAppreciation, setShowAppreciation] = useState(false); // UX-119
  const [showMarketContext, setShowMarketContext] = useState(false); // UX-120
  const [showLocationContext, setShowLocationContext] = useState(false); // UX-125
  const [showTagSelector, setShowTagSelector] = useState(false); // UX-123: tag selector toggle

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
  const ltvScore = property ? getLTVMatchScore(property.realistic_price) : null;

  const handleSaveNotes = () => {
    if (!id) return;
    setIsSaving(true);
    localStorage.setItem(`notes_${id}`, notes);
    setTimeout(() => setIsSaving(false), 600);
  };

  // FE-231+FE-232: Recheck property via context — async with toasts
  // recheckProperty handles optimistic update internally and rolls back on error
  const handleRecheck = async () => {
    if (!id) return;
    setIsRechecking(true);
    try {
      await recheckProperty(id);
      const today = new Date().toISOString().split('T')[0];
      showToast(`Listing verified — active on ${today}`, 'success');
    } catch {
      showToast('Recheck failed — please try again', 'error');
    } finally {
      setIsRechecking(false);
    }
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
            {allImages[activeImageIndex] ? (
              <img
                src={allImages[activeImageIndex]}
                alt="Gallery Zoom"
                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
              />
            ) : (
              <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-linear-card rounded-lg">
                <span className="text-linear-text-muted text-sm">Image unavailable</span>
              </div>
            )}
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
          ← Back to Dashboard
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

            <h1 className="text-4xl font-bold text-white mb-6 leading-tight tracking-tight">
              {property.address}
            </h1>

            {/* UX-57: PriceAssessment hero — top of content, above pipeline */}
            <div className="mb-8">
              <PriceAssessment property={property as PropertyWithCoords} />
            </div>

            {/* UX-123: Collapsed lifecycle bar — Pipeline + Thesis Tags in one compact card */}
            <div className="mb-6">
              <PropertyLifecycleBar
                status={status}
                onStatusChange={(newStatus) => setStatus(property.id, newStatus)}
                tags={getTags(property.id)}
                onAddTag={() => setShowTagSelector(v => !v)}
                lastCheckedDaysAgo={property.last_checked ? daysAgo(property.last_checked) : undefined}
                verifiedColor={property.last_checked ? computeFreshness(property.last_checked).color : undefined}
              />
              {/* ThesisTagSelector shown as inline expanded panel below bar */}
              {showTagSelector && (
                <div className="mt-2 p-3 bg-linear-card border border-linear-border rounded-2xl">
                  <ThesisTagSelector
                    propertyId={property.id}
                    currentTags={getTags(property.id)}
                    size="md"
                    onTagChange={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Gallery & Floorplan Tabs */}
            <div className="mb-8">
              <div className="flex items-center gap-6 border-b border-linear-border mb-6">
                <button 
                  onClick={() => setActiveTab('gallery')}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'gallery' ? 'text-white' : 'text-linear-text-muted hover:text-white'}`}
                >
                  Gallery
                  {activeTab === 'gallery' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-accent" />}
                </button>
                <button
                  onClick={() => setActiveTab('floorplan')}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'floorplan' ? 'text-white' : 'text-linear-text-muted hover:text-white'}`}
                >
                  Spatial Blueprint
                  {activeTab === 'floorplan' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-accent" />}
                </button>
                <button
                  onClick={() => setActiveTab('price_history')}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'price_history' ? 'text-white' : 'text-linear-text-muted hover:text-white'}`}
                >
                  Price Evolution
                  {activeTab === 'price_history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
                </button>
              </div>

              {activeTab === 'gallery' ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div
                    onClick={() => setShowLightbox(true)}
                    className="relative aspect-[16/9] w-full bg-linear-card rounded-2xl overflow-hidden group border border-linear-border/50 cursor-zoom-in"
                  >
                    <PropertyImage
                      src={allImages[activeImageIndex] ?? ''}
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
                          className={`aspect-[16/9] rounded-xl overflow-hidden border transition-all cursor-pointer relative group ${
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
              ) : activeTab === 'price_history' ? (
                <div className="animate-in fade-in duration-500">
                  <PropertyPriceEvolution
                    property={property}
                    onRequestEnrichment={() => setShowEnrichmentModal(true)}
                  />
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

            {/* UX-118: Financial Summary — unified card replacing Asset Overhead + Institutional Ownership Model + AffordabilityNode */}
            <div className="mb-12">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-blue-400" />
                    <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Financial Summary</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Affordability signal — inline badge */}
                    {ltvScore && (() => {
                      const colorMap: Record<string, string> = {
                        'text-retro-green': 'text-retro-green bg-retro-green/10 border-retro-green/20',
                        'text-amber-400': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                        'text-rose-400': 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                      };
                      const cls = colorMap[ltvScore.color] ?? 'text-white bg-white/5 border-white/10';
                      return (
                        <span className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${cls}`}>
                          {ltvScore.band}
                        </span>
                      );
                    })()}
                    <span className="text-[11px] font-black text-linear-text-muted uppercase tracking-widest">
                      {outlay?.rate ?? 3.75}% Fixed
                    </span>
                  </div>
                </div>

                {/* Key figures row */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-linear-card border border-white/5 rounded-xl px-4 py-3">
                    <div className="text-[8px] text-linear-text-muted uppercase font-black tracking-widest mb-1">Monthly Outlay</div>
                    <div className="text-2xl font-bold text-white tracking-tight">
                      £{outlay?.total.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div className="bg-linear-card border border-white/5 rounded-xl px-4 py-3">
                    <div className="text-[8px] text-linear-text-muted uppercase font-black tracking-widest mb-1">Mortgage P&I</div>
                    <div className="text-2xl font-bold text-white tracking-tight">
                      £{outlay?.mortgage.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div className="bg-linear-card border border-white/5 rounded-xl px-4 py-3">
                    <div className="text-[8px] text-linear-text-muted uppercase font-black tracking-widest mb-1">SDLT + All-In</div>
                    <div className="text-2xl font-bold text-white tracking-tight">
                      {(() => {
                        const sdlt = calculateSDLT(property.list_price, JSON.parse(localStorage.getItem('propSearch_ftb') ?? 'false'), false).sdlt;
                        const allIn = property.realistic_price + sdlt;
                        if (allIn >= 1_000_000) return `£${(allIn/1_000_000).toFixed(1)}M+`;
                        return `£${Math.round(allIn/1000)}K+`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="border-t border-blue-500/10 pt-4">
                  <div className="grid sm:grid-cols-4 gap-x-4 gap-y-2">
                    {[
                      { label: 'Council Tax', value: `£${outlay?.councilTax.toLocaleString() ?? '—'}/mo`, note: property.council_tax_band ? `Band ${property.council_tax_band}` : null },
                      { label: 'Service Charge', value: property.service_charge ? `£${property.service_charge.toLocaleString()}/yr` : '—', note: null },
                      { label: 'Ground Rent', value: property.ground_rent ? `£${property.ground_rent.toLocaleString()}/yr` : '—', note: null },
                      { label: 'Stamp Duty', value: (() => { const s = calculateSDLT(property.list_price, JSON.parse(localStorage.getItem('propSearch_ftb') ?? 'false'), false).sdlt; return s >= 1_000_000 ? `£${(s/1_000_000).toFixed(2)}M` : `£${Math.round(s/1000)}K`; })(), note: null },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-baseline">
                        <span className="text-[10px] text-linear-text-muted">{row.label}{row.note ? ` (${row.note})` : ''}</span>
                        <span className="text-[10px] font-bold text-white">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Year Capital Appreciation — collapsed by default (UX-119) */}
            <div className="mb-12">
              <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowAppreciation(v => !v)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-retro-green" />
                    <h2 className="text-[10px] font-black text-white uppercase tracking-widest">
                      5-Year Market Outlook
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {!showAppreciation && (
                      <span className="text-[9px] text-linear-text-muted italic">
                        tap to expand
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={`text-linear-text-muted transition-transform ${showAppreciation ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {showAppreciation && (
                  <div className="px-5 pb-5 border-t border-linear-border/50">
                    <CapitalAppreciationChart
                      propertyPrice={property.realistic_price}
                      leaseYears={property.lease_years_remaining}
                      epc={property.epc}
                      floorLevel={property.floor_level}
                      serviceCharge={property.service_charge}
                      area={property.area}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Data Provenance */}
            <DataProvenanceSection lastRefreshed={macroData?.last_refreshed} sources={macroData?._source_citations} />

            {/* ── Bid Strategy (UX-119: merged AcquisitionStrategy + alpha header) ── */}
            <AcquisitionStrategy
              property={property as PropertyWithCoords}
              onRequestEnrichment={() => setShowEnrichmentModal(true)}
            />

            {/* ── Market Context — collapsible (UX-120) ── */}
            <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowMarketContext(v => !v)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CirclePercent size={14} className="text-retro-green" />
                  <h2 className="text-[10px] font-black text-white uppercase tracking-widest">
                    Market Context
                  </h2>
                </div>
                {!showMarketContext && (
                  <span className="text-[9px] text-linear-text-muted italic">tap to expand</span>
                )}
                <ChevronDown size={14} className={`text-linear-text-muted transition-transform ${showMarketContext ? 'rotate-180' : ''}`} />
              </button>
              {showMarketContext && (
                <div className="px-5 pb-5 border-t border-linear-border/50">
                  <RentalYieldVsGiltChartWithRent property={property as PropertyWithCoords} />
                </div>
              )}
            </div>

            {/* ── Location Context — collapsible (UX-125: commute + map merged) ── */}
            <div className="bg-linear-card border border-linear-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowLocationContext(v => !v)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-blue-400" />
                  <h2 className="text-[10px] font-black text-white uppercase tracking-widest">
                    Location Context
                  </h2>
                  {property.area && (
                    <span className="text-[9px] text-linear-text-muted normal-case font-normal tracking-normal">
                      · {property.area}
                    </span>
                  )}
                </div>
                {!showLocationContext && (
                  <span className="text-[9px] text-linear-text-muted italic">tap to expand</span>
                )}
                <ChevronDown size={14} className={`text-linear-text-muted transition-transform ${showLocationContext ? 'rotate-180' : ''}`} />
              </button>
              {showLocationContext && (
                <div className="border-t border-linear-border/50">
                  {/* Commute cards */}
                  <div className="grid grid-cols-2 gap-3 p-5">
                    <div className="p-4 bg-linear-bg border border-white/5 rounded-xl">
                      <div className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest mb-1">Paternoster Sq</div>
                      <div className="text-2xl font-bold text-white tracking-tight">{property.commute_paternoster ?? '—'}<span className="text-sm text-linear-text-muted ml-1 font-bold">min</span></div>
                    </div>
                    <div className="p-4 bg-linear-bg border border-white/5 rounded-xl">
                      <div className="text-[9px] text-linear-text-muted uppercase font-black tracking-widest mb-1">Canada Square</div>
                      <div className="text-2xl font-bold text-white tracking-tight">{property.commute_canada_square ?? '—'}<span className="text-sm text-linear-text-muted ml-1 font-bold">min</span></div>
                    </div>
                  </div>
                  {/* Map */}
                  {property && (
                    <div className="px-5 pb-5">
                      <LocationNodeMap lat={property.lat} lng={property.lng} address={property.address} />
                    </div>
                  )}
                  {/* FE-277: Neighbourhood — amenity distances, walkability score, mini-map */}
                  {property?.lat && property?.lng && (
                    <div className="px-5 pb-5">
                      <NeighbourhoodSection
                        lat={property.lat}
                        lng={property.lng}
                        address={property.address}
                        crimeRate={undefined}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-linear-card border border-linear-border rounded-2xl shadow-2xl p-6 sticky top-24 hidden lg:block backdrop-blur-md">
              <div className="mb-8">
                <span className="text-[10px] text-linear-text-muted block uppercase font-bold tracking-[0.2em] mb-3">Institutional Target</span>
                <div className="text-4xl font-bold text-white tracking-tighter mb-1 flex items-baseline gap-1">
                  <span className="text-2xl text-linear-accent font-medium">£</span>
                  {fmtNum(property.realistic_price)}
                </div>
                <div className="text-xs text-linear-text-muted">
                  List Price: <span className="line-through opacity-50">£{fmtPrice(property.list_price)}</span>
                  {property.list_price && property.realistic_price ? (
                    <span className="ml-2 text-rose-400 font-bold">-{Math.round((1 - property.realistic_price / property.list_price) * 100)}% Delta</span>
                  ) : null}
                </div>
              </div>

              {/* UX-98/UX-93: Negotiation tiers + SDLT from shared utilities */}
              <div className="pt-4 pb-1 flex items-center gap-2">
                <Target size={10} className="text-amber-400" />
                <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">
                  Negotiation Range
                </span>
              </div>
              <div className="space-y-2 mb-6">
                {buildNegotiationTiers(property.list_price).map(tier => (
                  <div key={tier.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-[10px] text-linear-text-muted">{tier.label.split(' (')[0]}</span>
                    <span className={`text-[10px] font-medium ${tier.colorClass}`}>{tier.range}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-[10px] text-linear-text-muted">SDLT estimate</span>
                  <span className="text-[10px] font-medium text-white">
                    {(() => {
                      const sdltValue = calculateSDLT(property.list_price, JSON.parse(localStorage.getItem('propSearch_ftb') ?? 'false'), false).sdlt;
                      if (sdltValue >= 1_000_000) return `£${(sdltValue / 1_000_000).toFixed(2)}M`;
                      return `£${Math.round(sdltValue / 1000)}K`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">All-in estimate</span>
                  <span className="text-[11px] font-black text-white">
                    ~{(() => {
                      const sdltValue = calculateSDLT(property.list_price, JSON.parse(localStorage.getItem('propSearch_ftb') ?? 'false'), false).sdlt;
                      const allIn = property.realistic_price + sdltValue;
                      if (allIn >= 1_000_000) return `£${(allIn / 1_000_000).toFixed(2)}M+`;
                      return `£${Math.round(allIn / 1000)}K+`;
                    })()}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <SourceHub links={property.links || [property.link]} variant="full" />
                <button
                  disabled
                  className="w-full py-3.5 bg-linear-card text-white/40 border border-linear-border rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-not-allowed"
                  title="PDF Export — coming soon"
                >
                  <FileText size={12} className="opacity-40" />
                  PDF Export — TBD
                </button>

                {/* FE-238: DATA ACTIONS — section header */}
                <div className="pt-4 pb-1 flex items-center gap-2">
                  <Settings size={10} className="text-linear-text-muted" />
                  <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">
                    Data Actions
                  </span>
                </div>

                {/* FE-234 entry point: Edit Data */}
                <Link to={`/property/${property.id}/edit`}>
                  <button className="w-full py-3 bg-linear-card text-white border border-linear-border rounded-xl font-bold hover:bg-linear-accent/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                    <Edit3 size={12} />
                    Edit Data
                  </button>
                </Link>

                {/* FE-231: Recheck button — updates last_checked via POST /api/properties/:id/check */}
                <button
                  onClick={handleRecheck}
                  disabled={isRechecking}
                  title="Verify the listing is still active on the market and updates the last_checked timestamp"
                  className="w-full py-3 bg-retro-green/10 text-retro-green border border-retro-green/20 rounded-xl font-bold hover:bg-retro-green/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRechecking ? 'animate-spin' : ''} />
                  {isRechecking ? 'Verifying Live...' : 'Verify Listing'}
                </button>

                {/* FE-237: Request Enrichment button */}
                <button
                  onClick={() => setShowEnrichmentModal(true)}
                  className="w-full py-3 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-xl font-bold hover:bg-amber-400/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                  title="Request analyst enrichment: lease years remaining, ground rent, SDLT breakdown, lease extension costs"
                >
                  <RefreshCw size={12} />
                  Request Enrichment
                </button>
              </div>

              <EnrichmentModal
                propertyId={property.id}
                propertyAddress={property.address}
                isOpen={showEnrichmentModal}
                onClose={() => setShowEnrichmentModal(false)}
              />

              {/* Analyst Annotations — FE-255: collapsible supplementary panel */}
              <div className="mt-8 pt-8 border-t border-linear-border space-y-4">
                <button
                  onClick={() => setNotesPanelOpen(v => !v)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText size={12} className="text-linear-accent" /> Analyst Notes
                    {notes && notes.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-retro-green inline-block ml-1" />
                    )}
                  </h3>
                  <span className="text-linear-text-muted group-hover:text-white transition-colors">
                    {notesPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>
                {notesPanelOpen && (
                  <div className="animate-in fade-in duration-200">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={handleSaveNotes}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
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
                        className="w-full h-40 bg-linear-bg border border-linear-border rounded-xl p-4 text-xs text-white placeholder:text-linear-text-muted/40 focus:outline-none focus:border-linear-accent/50 focus:ring-1 focus:ring-linear-accent/10 transition-all resize-none custom-scrollbar"
                      />
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[8px] font-mono text-linear-text-muted uppercase">
                        Local Persistence
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Asset Source Hub — always visible, no hover required (UX-122) */}
              <div className="pt-6 border-t border-linear-border space-y-3">
                <div className="flex items-center gap-2">
                  <ExternalLink size={12} className="text-blue-400" />
                  <h3 className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.2em]">
                    Asset Source Hub
                  </h3>
                </div>
                <SourceHub links={property.links || [property.link]} variant="full" />
              </div>

              {/* Location Insight — always visible */}
              <div className="pt-6 border-t border-linear-border">
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

      {/* UX-121: Mobile sticky action bar — accessible on all mobile viewports */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-linear-card border-t border-linear-border px-4 py-3 flex items-center gap-2 shadow-[0_-4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
        {/* Verify Listing */}
        <button
          onClick={handleRecheck}
          disabled={isRechecking}
          className="flex-1 py-2.5 bg-retro-green/20 text-retro-green border border-retro-green/20 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <RefreshCw size={11} className={isRechecking ? 'animate-spin' : ''} />
          Verify
        </button>
        {/* Request Enrichment */}
        <button
          onClick={() => setShowEnrichmentModal(true)}
          className="flex-1 py-2.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <RefreshCw size={11} />
          Enrich
        </button>
        {/* Source Hub links */}
        <SourceHub links={property.links || [property.link]} variant="compact" />
      </div>
    </div>
  );
};

export default PropertyDetail;
