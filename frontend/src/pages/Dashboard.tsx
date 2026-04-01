import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { 
  Filter, 
  ArrowUpDown, 
  TrendingUp, 
  Map as MapIcon,
  LayoutGrid,
  Search,
  ShieldAlert,
  ShieldCheck,
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  Zap,
  Maximize2,
  Gem,
  ExternalLink
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import type { PropertyWithCoords } from '../types/property';
import { usePipeline } from '../hooks/usePipeline';
import type { PropertyStatus } from '../hooks/usePipeline';
import { useComparison } from '../hooks/useComparison';
import PropertyTable from '../components/PropertyTable';
import AlphaBadge from '../components/AlphaBadge';
import KPICard from '../components/KPICard';
import LoadingNode from '../components/LoadingNode';
import PreviewDrawer from '../components/PreviewDrawer';
import MarketPulse from '../components/MarketPulse';
import MarketConditionsBar from '../components/MarketConditionsBar';
import AreaPerformanceTable from '../components/AreaPerformanceTable';
import SwapRateSignal from '../components/SwapRateSignal';
import BoERatePathChart from '../components/BoERatePathChart';
import PropertyImage from '../components/PropertyImage';
import ThesisTagFilter from '../components/ThesisTagFilter';
import { useThesisTags, type ThesisTag } from '../hooks/useThesisTags';
import { Bookmark, Archive, RotateCcw } from 'lucide-react';

// Fix Leaflet marker icons with a custom "Linear" style
const createPropertyIcon = (score: number, status: PropertyStatus = 'discovered') => {
  const color = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  const isShortlisted = status === 'shortlisted';
  const isVetted = status === 'vetted';
  
  let statusColor = color;
  let glowClass = isShortlisted ? 'opacity-80 scale-150' : 'opacity-40';
  let borderClass = isShortlisted ? 'border-linear-accent-blue ring-2 ring-linear-accent-blue/50' : 'border-white';
  
  if (isShortlisted) {
    statusColor = '#3b82f6';
  } else if (isVetted) {
    statusColor = '#10b981';
    glowClass = 'opacity-90 scale-[1.75]';
    borderClass = 'border-linear-accent-emerald ring-4 ring-linear-accent-emerald/30';
  }

  return L.divIcon({
    className: 'property-marker',
    html: `<div class="group relative flex items-center justify-center">
             <div class="absolute inset-0 rounded-full blur-[4px] ${glowClass} group-hover:opacity-80 transition-all duration-500" style="background-color: ${statusColor}"></div>
             <div class="relative w-3 h-3 rounded-full border-[1.5px] ${borderClass} shadow-xl flex items-center justify-center transition-all duration-500 group-hover:scale-125" style="background-color: ${color}">
               <div class="w-1 h-1 bg-white/40 rounded-full"></div>
             </div>
           </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const createNodeIcon = (type: 'hub' | 'park' | 'station', label: string) => {
  const iconColor = type === 'hub' ? '#60a5fa' : type === 'park' ? '#34d399' : '#94a3b8';
  return L.divIcon({
    className: 'node-marker',
    html: `<div class="flex items-center gap-2 bg-black/80 backdrop-blur-xl px-2.5 py-1.5 rounded-lg border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
             <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${iconColor}; box-shadow: 0 0 12px ${iconColor}"></div>
             <span class="text-[10px] font-black text-white uppercase tracking-[0.1em] whitespace-nowrap">${label}</span>
           </div>`,
    iconSize: [120, 30],
    iconAnchor: [15, 15]
  });
};

const INSTITUTIONAL_NODES = [
  { name: 'Paternoster Sq', coords: [51.5147, -0.0988], type: 'hub' },
  { name: 'Canada Square', coords: [51.5050, -0.0195], type: 'hub' }
] as const;

const SPATIAL_CONTEXT = [
  { name: 'Hyde Park', coords: [51.5073, -0.1657], type: 'park' },
  { name: 'Regent\'s Park', coords: [51.5313, -0.1569], type: 'park' },
  { name: 'King\'s Cross', coords: [51.5309, -0.1233], type: 'station' },
  { name: 'Waterloo', coords: [51.5033, -0.1123], type: 'station' },
  { name: 'Green Park', coords: [51.5040, -0.1418], type: 'park' },
  { name: 'Victoria', coords: [51.4952, -0.1441], type: 'station' }
] as const;

const METRO_COLORS: Record<string, string> = {
  'District': '#00782a',
  'Piccadilly': '#003688',
  'Victoria': '#00a1e4',
  'London Overground': '#e8630a',
  'Elizabeth line': '#6950a1',
  'Metropolitan': '#9b0056',
  'Northern': '#000000',
  'Central': '#e32017',
  'Jubilee': '#a0a5a9',
  'Bakerloo': '#b36305',
  'Hammersmith & City': '#f3a9bb',
  'Circle': '#ffd010',
  'DLR': '#00afad',
  'Thameslink': '#ffb000',
  'Tramlink': '#84b817',
  'Waterloo & City': '#95cdba',
  'IFS Cloud Cable Car': '#e21836'
};

const MetroOverlay: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Note: In a real Vite app, these assets should be in /public or handled by the server
    fetch('/api/london-metro')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load metro data:', err));
  }, []);

  if (!geoData) return null;

  return (
    <GeoJSON 
      data={geoData} 
      style={(feature) => {
        const lines = feature?.properties?.lines || [];
        const primaryLine = lines[0]?.name || feature?.properties?.name || '';
        const color = feature?.properties?.color || METRO_COLORS[primaryLine.replace(' Line', '')] || '#475569';
        return {
          color,
          weight: 4.5,
          opacity: 0.75,
          lineJoin: 'round'
        };
      }}
    />
  );
};

const AutoFitBounds: React.FC<{ properties: PropertyWithCoords[] }> = ({ properties }) => {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length === 0) return;
    
    const bounds = L.latLngBounds(properties.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 1 });
  }, [properties, map]);
  
  return null;
};

const PropertyCard: React.FC<{ 
  property: PropertyWithCoords; 
  status: PropertyStatus;
  onStatusChange: (id: string, status: PropertyStatus) => void;
  onPreview: (property: PropertyWithCoords) => void;
}> = ({ property, status, onStatusChange, onPreview }) => {
  const { toggleComparison, isInComparison } = useComparison();
  const isSelected = isInComparison(property.id);

  return (
    <div className={`bg-linear-card border rounded-xl overflow-hidden hover:border-linear-accent transition-all group flex flex-col h-full relative glow-border ${
      isSelected ? 'ring-2 ring-linear-accent-blue/50 border-linear-accent-blue/50' : 
      status === 'vetted' ? 'border-linear-accent-emerald/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-linear-accent-emerald/30' :
      status === 'shortlisted' ? 'border-linear-accent-blue/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-linear-border'
    }`}>
      {/* Thumbnail */}
      <div 
        onClick={() => onPreview(property)}
        className="relative h-40 w-full overflow-hidden bg-linear-bg flex items-center justify-center group-hover:opacity-90 transition-opacity cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <PropertyImage 
          src={property.image_url || property.gallery[0]}
          alt={property.address}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges on Image */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          {status === 'vetted' && (
            <div className="px-2 py-0.5 bg-linear-accent-emerald text-black text-[9px] font-bold uppercase rounded shadow-lg flex items-center gap-1 border border-linear-accent-emerald/50 animate-in zoom-in-90 duration-300">
              <ShieldCheck size={10} />
              Vetted Asset
            </div>
          )}
          {property.is_value_buy && status !== 'vetted' && (
            <div className="px-2 py-0.5 bg-linear-accent-emerald/80 backdrop-blur-md text-black text-[9px] font-bold uppercase rounded shadow-lg flex items-center gap-1 border border-linear-accent-emerald/50">
              <Gem size={10} />
              Value Buy
            </div>
          )}
          {property.metadata.is_new && (
            <div className="px-2 py-0.5 bg-linear-accent-blue text-linear-text-primary text-[9px] font-bold uppercase rounded shadow-lg border border-linear-accent-blue/50">
              Fresh
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 z-20 scale-90 origin-bottom-left">
          <AlphaBadge score={property.alpha_score} />
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => onPreview(property)}>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-[0.15em] mb-0.5">
              {(property.area || 'Unknown').split(' (')[0]}
              {property.metadata.discovery_count > 1 && (
                <span className="ml-2 text-linear-accent">×{property.metadata.discovery_count}</span>
              )}
            </span>
            <h3 className="font-bold text-linear-text-primary leading-tight group-hover:text-linear-accent-blue transition-colors text-sm tracking-tight truncate w-[180px]">{property.address}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 flex-grow">
          <div className="space-y-0.5">
            <span className="text-[8px] text-linear-text-muted block uppercase tracking-tighter font-bold opacity-60">Acquisition</span>
            <div className="text-sm font-bold text-linear-text-primary tracking-tight">£{property.realistic_price.toLocaleString()}</div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[8px] text-linear-text-muted block uppercase tracking-tighter font-bold opacity-60">Price/SQM</span>
            <span className={`text-xs font-bold ${property.is_value_buy ? 'text-retro-green' : 'text-linear-text-muted'}`}>£{property.price_per_sqm.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 border-y border-linear-border/50 mb-4">
          <div className="flex items-center gap-1.5">
            <Maximize2 size={10} className="text-linear-accent" />
            <span className="text-[10px] font-bold text-linear-text-primary tracking-tighter">{property.sqft}</span>
          </div>
          <div className="h-2 w-px bg-linear-border" />
          {property.floor_level && (
            <>
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={10} className="text-linear-accent" />
                <span className="text-[10px] font-bold text-linear-text-primary tracking-tighter uppercase">{property.floor_level}</span>
              </div>
              <div className="h-2 w-px bg-linear-border" />
            </>
          )}
          <div className="flex items-center gap-1.5">
            <Zap size={10} className="text-linear-accent" />
            <span className="text-[10px] font-bold text-linear-text-primary tracking-tighter">{property.epc}</span>
          </div>
          <div className="h-2 w-px bg-linear-border" />
          <span className="text-[9px] font-medium text-linear-text-muted uppercase tracking-tighter truncate">{(property.tenure || 'N/A').split(' ')[0]}</span>
        </div>

        <div className="px-2.5 py-1.5 bg-linear-accent-blue/5 border border-linear-accent-blue/10 rounded flex items-center justify-between group-hover:bg-linear-accent-blue/10 transition-colors">
          <span className="text-[8px] font-bold text-linear-accent-blue uppercase tracking-widest">Protocol</span>
          <span className="text-[10px] font-bold text-linear-text-primary">{(property.neg_strategy || 'Default: 0% bid').split(':')[0]}</span>
        </div>
      </div>
      
      <div className="px-4 py-2.5 bg-linear-bg/50 border-t border-linear-border flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => toggleComparison(property.id)}
            className={`p-1 rounded transition-all hover:scale-110 ${
              isSelected ? 'text-linear-accent-blue bg-linear-accent-blue/10' : 'text-linear-accent hover:text-linear-text-primary'
            }`}
            title="Add to Comparison"
          >
            <Zap size={14} fill={isSelected ? 'currentColor' : 'none'} />
          </button>
          <div className="w-px h-4 bg-linear-border mx-0.5"></div>
          <button 
            onClick={() => onStatusChange(property.id, status === 'shortlisted' ? 'discovered' : 'shortlisted')}
            className={`p-1 rounded transition-all hover:scale-110 ${
              status === 'shortlisted' ? 'text-linear-accent-blue' : 'text-linear-accent hover:text-linear-text-primary'
            }`}
            title="Shortlist"
          >
            <Bookmark size={14} fill={status === 'shortlisted' ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => onStatusChange(property.id, status === 'vetted' ? 'shortlisted' : 'vetted')}
            className={`p-1 rounded transition-all hover:scale-110 ${
              status === 'vetted' ? 'text-linear-accent-emerald' : 'text-linear-accent hover:text-linear-text-primary'
            }`}
            title="Mark as Vetted"
          >
            <ShieldCheck size={14} fill={status === 'vetted' ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => onStatusChange(property.id, status === 'archived' ? 'discovered' : 'archived')}
            className={`p-1 rounded transition-all hover:scale-110 ${
              status === 'archived' ? 'text-linear-accent-rose' : 'text-linear-accent hover:text-linear-accent-rose'
            }`}
            title="Archive"
          >
            {status === 'archived' ? <RotateCcw size={14} /> : <Archive size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to={`/property/${property.id}`}
            className="text-[9px] font-bold text-linear-accent hover:text-linear-text-primary transition-colors uppercase tracking-[0.15em]"
          >
            Details
          </Link>
          <div className="relative group/hub">
            <button 
              className="text-[9px] font-bold text-linear-text-primary hover:text-linear-accent-blue flex items-center gap-1 transition-colors uppercase tracking-[0.15em]"
            >
              Links
              <ChevronDown size={10} />
            </button>
            <div className="absolute bottom-full right-0 pb-1 mb-0 opacity-0 translate-y-1 pointer-events-none group-hover/hub:opacity-100 group-hover/hub:translate-y-0 group-hover/hub:pointer-events-auto transition-all z-50 min-w-[120px]">
              <div className="bg-linear-card border border-linear-border rounded-lg shadow-2xl p-1.5 backdrop-blur-xl">
                <div className="flex flex-col gap-0.5">
                  {(property.links || [property.link]).map((url, i) => (
                    <a 
                      key={i}
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-[9px] font-bold text-linear-text-muted hover:text-linear-text-primary hover:bg-linear-bg rounded-md transition-all flex items-center justify-between group/link uppercase tracking-tighter"
                    >
                      <span>{url.includes('rightmove') ? 'Rightmove' : url.includes('zoopla') ? 'Zoopla' : 'Portal'}</span>
                      <ExternalLink size={8} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { properties, loading, error, filters, updateFilters } = usePropertyContext();
  const { pipeline, setStatus, getStatus } = usePipeline();
  const { getTags } = useThesisTags();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [filterShortlisted, setFilterShortlisted] = useState(false);
  const [filterVetted, setFilterVetted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('table');
  const [thesisTagFilter, setThesisTagFilter] = useState<ThesisTag[]>([]);

  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoords | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Precision Filters
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [minSqft, setMinSqft] = useState<number>(0);

  const handlePreview = (property: PropertyWithCoords) => {
    setSelectedProperty(property);
    setIsPreviewOpen(true);
  };

  // Derived state from URL
  const areaFilter = searchParams.get('area') || 'All Areas';
  
  const handleAreaChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val === 'All Areas') {
      nextParams.delete('area');
    } else {
      nextParams.set('area', val);
    }
    setSearchParams(nextParams);
    updateFilters({ area: val });
  };

  const filteredProperties = useMemo(() => {
    const safeProperties = properties ?? [];
    let result = [...safeProperties];
    
    // Status Filter (Archived logic)
    if (showArchived) {
      result = result.filter(p => getStatus(p.id) === 'archived');
    } else {
      result = result.filter(p => getStatus(p.id) !== 'archived');
      
      // Additional status filters (only when not showing archived)
      if (filterShortlisted) {
        result = result.filter(p => getStatus(p.id) === 'shortlisted' || getStatus(p.id) === 'vetted');
      }
      if (filterVetted) {
        result = result.filter(p => getStatus(p.id) === 'vetted');
      }
    }

    if (filterNewOnly) result = result.filter(p => p.metadata.is_new);
    
    // Area filter is now server-side, but we keep it here as a fallback or for All Areas logic
    if (areaFilter !== 'All Areas') result = result.filter(p => p.area.includes(areaFilter));

    // Precision Filters
    result = result.filter(p => p.realistic_price <= maxPrice);
    result = result.filter(p => p.sqft >= minSqft);

    // Thesis Tag Filter
    if (thesisTagFilter.length > 0) {
      result = result.filter(p => {
        const propTags = getTags(p.id);
        return thesisTagFilter.some(tag => propTags.includes(tag));
      });
    }

    // Sorting: Some sorting is server-side, but if we have client-side only sorts, we keep them here
    result.sort((a, b) => {
      const sortBy = filters.sortBy;
      if (sortBy === 'alpha_score') return b.alpha_score - a.alpha_score;
      if (sortBy === 'realistic_price') return a.realistic_price - b.realistic_price;
      if (sortBy === 'price_per_sqm') return a.price_per_sqm - b.price_per_sqm;
      // These might not be server-side yet
      if (sortBy === 'value_gap') return (b.list_price - b.realistic_price) - (a.list_price - a.realistic_price);
      if (sortBy === 'commute_utility') return (a.commute_paternoster + a.commute_canada_square) - (b.commute_paternoster + b.commute_canada_square);
      if (sortBy === 'appreciation') return b.appreciation_potential - a.appreciation_potential;
      return 0;
    });

    return result;
  }, [properties, filterNewOnly, filterShortlisted, filterVetted, areaFilter, filters.sortBy, showArchived, getStatus, maxPrice, minSqft, thesisTagFilter, getTags]);

  const stats = useMemo(() => {
    const safeProperties = properties ?? [];
    if (safeProperties.length === 0) return { total: 0, avgAlpha: '0.0', shortlisted: 0, vetted: 0 };
    return {
      total: safeProperties.length,
      shortlisted: Object.values(pipeline ?? {}).filter(s => s === 'shortlisted' || s === 'vetted').length,
      vetted: Object.values(pipeline ?? {}).filter(s => s === 'vetted').length,
      avgAlpha: (safeProperties.reduce((acc, p) => acc + p.alpha_score, 0) / (safeProperties.length || 1)).toFixed(1)
    };
  }, [properties, pipeline]);

  const areas = useMemo(() => {
    const safeProperties = properties ?? [];
    const uniqueAreas = new Set(safeProperties.map(p => (p.area || 'Unknown').split(' (')[0]));
    return ['All Areas', ...Array.from(uniqueAreas).sort()];
  }, [properties]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingNode />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <div className="h-12 w-12 bg-linear-accent-rose/10 text-linear-accent-rose rounded-full flex items-center justify-center border border-linear-accent-rose/20">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-linear-text-primary tracking-tight">Sync Failure</h2>
        <p className="text-linear-text-muted text-xs leading-relaxed">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-linear-text-primary text-linear-bg rounded-lg font-bold text-xs hover:bg-linear-text-secondary transition-all shadow-xl shadow-white/5"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      <PreviewDrawer 
        property={selectedProperty} 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)}
        status={selectedProperty ? getStatus(selectedProperty.id) : 'discovered'}
        onStatusChange={setStatus}
      />

      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard 
          label="Institutional Inventory" 
          value={stats.total} 
          icon={LayoutGrid} 
          tooltip="Total count of vetted, investment-grade properties currently in the active acquisition pipeline."
          methodology="Aggregated from Master DB after normalization and quality gate filtering."
        />
        <KPICard 
          label="Alpha Performance" 
          value={stats.avgAlpha} 
          icon={TrendingUp} 
          className="text-linear-accent-blue"
          tooltip="The proprietary 0-10 composite rating representing the overall acquisition quality of all filtered assets."
          methodology="Weighted average of Tenure Quality (40%), Spatial Alpha (30%), and Price Efficiency (30%)."
        />
        <KPICard 
          label="Active Pipeline" 
          value={stats.shortlisted} 
          icon={Bookmark} 
          className="text-retro-green"
          tooltip="Current volume of assets successfully moved from 'Discovered' to 'Shortlisted' or 'Vetted' status."
          methodology="User-defined filter status for assets marked for secondary vetting or final approval."
        />
        <KPICard 
          label="Vetted Assets" 
          value={stats.vetted} 
          icon={ShieldCheck} 
          className="text-linear-accent-emerald"
          tooltip="Assets that have passed rigorous structural, financial, and spatial vetting."
          methodology="Third-stage lifecycle status for assets ready for final acquisition protocols."
        />
      </div>

      {/* Market Pulse Widget */}
      <MarketPulse />

      {/* Market Conditions Bar — single-glance market favour verdict */}
      <MarketConditionsBar />

      {/* Market Intelligence Deep-Dive */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <AreaPerformanceTable />
        </div>
        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwapRateSignal />
          <BoERatePathChart />
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col gap-6 bg-linear-card/40 p-6 rounded-3xl border border-linear-border backdrop-blur-md shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
            <div className="flex bg-linear-bg p-1 rounded-xl border border-linear-border shadow-inner">
              <button 
                onClick={() => { setViewMode('grid'); setShowArchived(false); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-[0.15em] ${viewMode === 'grid' && !showArchived ? 'bg-linear-accent text-linear-text-primary shadow-lg shadow-linear-accent/20' : 'text-linear-text-muted hover:text-linear-text-primary'}`}
              >
                <LayoutGrid size={12} />
                Grid
              </button>
              <button 
                onClick={() => { setViewMode('table'); setShowArchived(false); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-[0.15em] ${viewMode === 'table' && !showArchived ? 'bg-linear-accent text-linear-text-primary shadow-lg shadow-linear-accent/20' : 'text-linear-text-muted hover:text-linear-text-primary'}`}
              >
                <TableIcon size={12} />
                Table
              </button>
              <button 
                onClick={() => { setViewMode('map'); setShowArchived(false); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-[0.15em] ${viewMode === 'map' && !showArchived ? 'bg-linear-accent text-linear-text-primary shadow-lg shadow-linear-accent/20' : 'text-linear-text-muted hover:text-linear-text-primary'}`}
              >
                <MapIcon size={12} />
                Map
              </button>
              <div className="w-px h-4 bg-linear-border mx-2 self-center"></div>
              <button 
                onClick={() => setShowArchived(true)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-[0.15em] ${showArchived ? 'bg-linear-accent-rose/20 text-linear-accent-rose border border-linear-accent-rose/30' : 'text-linear-text-muted hover:text-linear-accent-rose'}`}
              >
                <Archive size={12} />
                Archived
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
            <button 
              onClick={() => {
                setFilterNewOnly(false);
                setFilterShortlisted(false);
                setFilterVetted(false);
                setShowArchived(false);
                setMaxPrice(1500000);
                setMinSqft(0);
                handleAreaChange('All Areas');
                updateFilters({ sortBy: 'alpha_score', is_value_buy: false });
              }}
              className="p-2.5 rounded-xl border border-linear-border bg-linear-bg text-linear-text-muted hover:text-linear-text-primary hover:border-linear-accent-blue transition-all group shadow-sm"
              title="Reset All Parameters"
            >
              <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>

            <button 
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${isFilterPanelOpen ? 'bg-linear-accent-blue border-linear-accent-blue/50 text-linear-text-primary shadow-lg shadow-linear-accent-blue/20' : 'bg-linear-bg border-linear-border text-linear-text-muted hover:border-linear-accent-blue hover:text-linear-text-primary'}`}
            >
              <Filter size={14} />
              Precision
            </button>

            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-linear-accent group-hover:text-linear-accent-blue transition-colors">
                <MapIcon size={12} />
              </div>
              <select
                value={areaFilter}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="bg-linear-bg border border-linear-border rounded-xl pl-8 pr-10 py-2 text-[10px] font-bold text-linear-text-primary focus:outline-none focus:ring-1 focus:ring-linear-accent-blue/50 appearance-none hover:border-linear-accent-blue transition-all cursor-pointer uppercase tracking-[0.1em]"
              >
                {areas.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-linear-accent pointer-events-none" />
            </div>

            <ThesisTagFilter
              selectedTags={thesisTagFilter}
              onTagsChange={setThesisTagFilter}
            />

            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-linear-accent group-hover:text-linear-accent-blue transition-colors">
                <ArrowUpDown size={12} />
              </div>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                className="bg-linear-bg border border-linear-border rounded-xl pl-8 pr-10 py-2 text-[10px] font-bold text-linear-text-primary focus:outline-none focus:ring-1 focus:ring-linear-accent-blue/50 appearance-none hover:border-linear-accent-blue transition-all cursor-pointer uppercase tracking-[0.1em]"
              >
                <option value="alpha_score">Alpha Sort (H-L)</option>
                <option value="realistic_price">Target Price (L-H)</option>
                <option value="price_per_sqm">Efficiency (L-H)</option>
                <option value="value_gap">Value Gap (H-L)</option>
                <option value="commute_utility">Commute (L-H)</option>
                <option value="appreciation">Growth (H-L)</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-linear-accent pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-linear-border/30">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={filterShortlisted} 
              onChange={(e) => setFilterShortlisted(e.target.checked)}
              className="hidden"
            />
            <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${filterShortlisted ? 'bg-linear-accent-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${filterShortlisted ? 'left-5' : 'left-1'}`}></div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${filterShortlisted ? 'text-linear-text-primary' : 'text-linear-text-muted group-hover:text-zinc-400'}`}>Shortlist</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={filterVetted} 
              onChange={(e) => setFilterVetted(e.target.checked)}
              className="hidden"
            />
            <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${filterVetted ? 'bg-linear-accent-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${filterVetted ? 'left-5' : 'left-1'}`}></div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${filterVetted ? 'text-linear-text-primary' : 'text-linear-text-muted group-hover:text-zinc-400'}`}>Vetted Only</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={filters.is_value_buy || false} 
              onChange={(e) => updateFilters({ is_value_buy: e.target.checked })}
              className="hidden"
            />
            <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${filters.is_value_buy ? 'bg-retro-green shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-800'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${filters.is_value_buy ? 'left-5' : 'left-1'}`}></div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${filters.is_value_buy ? 'text-linear-text-primary' : 'text-linear-text-muted group-hover:text-zinc-400'}`}>Value Gap</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={filterNewOnly} 
              onChange={(e) => setFilterNewOnly(e.target.checked)}
              className="hidden"
            />
            <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${filterNewOnly ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-zinc-800'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${filterNewOnly ? 'left-5' : 'left-1'}`}></div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${filterNewOnly ? 'text-linear-text-primary' : 'text-linear-text-muted group-hover:text-zinc-400'}`}>Fresh Only</span>
          </label>
        </div>
      </div>

      {/* Precision Filter Panel */}
      {isFilterPanelOpen && (
        <div className="bg-linear-card border border-linear-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300 backdrop-blur-xl shadow-3xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.15em]">Max Target Price</span>
              <span className="text-sm font-bold text-linear-text-primary tracking-tight">£{maxPrice.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="400000" 
              max="1500000" 
              step="50000" 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full h-1 bg-linear-bg rounded-lg appearance-none cursor-pointer accent-linear-accent-blue"
            />
            <div className="flex justify-between text-[9px] font-medium text-linear-text-muted uppercase tracking-widest opacity-60">
              <span>£400k</span>
              <span>£1.5M</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-[0.15em]">Min Interior Space</span>
              <span className="text-sm font-bold text-linear-text-primary tracking-tight">{minSqft} SQFT</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1500" 
              step="50" 
              value={minSqft} 
              onChange={(e) => setMinSqft(parseInt(e.target.value))}
              className="w-full h-1 bg-linear-bg rounded-lg appearance-none cursor-pointer accent-linear-accent-blue"
            />
            <div className="flex justify-between text-[9px] font-medium text-linear-text-muted uppercase tracking-widest opacity-60">
              <span>0 SQFT</span>
              <span>1500 SQFT</span>
            </div>
          </div>
        </div>
      )}

      {/* Main View */}
      <div className="mt-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredProperties.map(property => (
              <PropertyCard 
                key={property.id} 
                property={property} 
                status={getStatus(property.id)}
                onStatusChange={setStatus}
                onPreview={handlePreview}
              />
            ))}
            {filteredProperties.length === 0 && (
              <div className="col-span-full py-32 text-center bg-linear-card/20 rounded-2xl border border-dashed border-linear-border">
                <div className="inline-flex items-center justify-center h-12 w-12 bg-linear-card rounded-xl text-linear-accent mb-4 border border-linear-border">
                  <Search size={20} />
                </div>
                <h3 className="text-sm font-bold text-linear-text-primary tracking-tight">No matching assets found</h3>
                <p className="text-[10px] text-linear-text-muted mt-1 uppercase tracking-widest font-bold">Try expanding your search parameters</p>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="animate-in fade-in duration-500">
            <PropertyTable 
              properties={filteredProperties} 
              onSortChange={(key) => updateFilters({ sortBy: key as any })} 
              currentSort={filters.sortBy}
              onPreview={handlePreview}
              onStatusChange={setStatus}
              getStatus={getStatus}
            />
          </div>
        ) : (
          <div className="h-[70vh] rounded-2xl overflow-hidden border border-linear-border relative z-0 retro-map animate-in fade-in zoom-in-95 duration-700 shadow-2xl shadow-black/50">
            <MapContainer center={[51.52, -0.12]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <AutoFitBounds properties={filteredProperties} />
              <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MetroOverlay />
              
              {/* Institutional Hubs */}
              {INSTITUTIONAL_NODES.map(node => (
                <Marker 
                  key={node.name} 
                  position={node.coords as [number, number]} 
                  icon={createNodeIcon('hub', node.name)}
                />
              ))}

              {/* Spatial Context (Parks/Stations) */}
              {SPATIAL_CONTEXT.map(node => (
                <Marker 
                  key={node.name} 
                  position={node.coords as [number, number]} 
                  icon={createNodeIcon(node.type as any, node.name)}
                />
              ))}

              {filteredProperties.map(property => (
                <Marker
                  key={property.id}
                  position={[property.lat, property.lng]}
                  icon={createPropertyIcon(property.alpha_score, getStatus(property.id))}
                  eventHandlers={{
                    click: () => handlePreview(property)
                  }}
                >                  <Popup className="property-popup">
                    <div className="w-64 p-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-linear-text-primary text-xs m-0 tracking-tight">{property.address}</h4>
                        <div className="scale-75 origin-top-right">
                          <AlphaBadge score={property.alpha_score} />
                        </div>
                      </div>
                      <div className="text-[9px] text-linear-text-muted mb-3 uppercase tracking-wider font-bold opacity-80">{property.area}</div>
                      
                      <div className="flex gap-4 py-2 border-y border-linear-border/30 mb-3">
                         <div className="flex flex-col">
                            <span className="text-[8px] text-linear-text-muted uppercase font-bold tracking-tighter">St Pauls</span>
                            <span className="text-[10px] font-bold text-linear-accent-blue">{property.commute_paternoster} min</span>
                         </div>
                         <div className="flex flex-col border-l border-linear-border/30 pl-3">
                            <span className="text-[8px] text-linear-text-muted uppercase font-bold tracking-tighter">Canary Wharf</span>
                            <span className="text-[10px] font-bold text-linear-accent-emerald">{property.commute_canada_square} min</span>
                         </div>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                           <span className="text-[8px] text-linear-text-muted uppercase font-bold tracking-widest opacity-60">Target Price</span>
                           <span className="text-sm font-bold text-linear-text-primary leading-none">£{property.realistic_price.toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={() => handlePreview(property)}
                          className="text-[10px] font-bold text-linear-accent-blue flex items-center gap-1 hover:text-linear-accent-blue/80 transition-colors uppercase tracking-widest"
                        >
                          Deep Scan <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
