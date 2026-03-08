import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { 
  Filter, 
  ArrowUpDown, 
  TrendingUp, 
  ExternalLink,
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
  Gem
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
import PropertyImage from '../components/PropertyImage';
import { Bookmark, Archive, RotateCcw } from 'lucide-react';

// Fix Leaflet marker icons with a custom "Linear" style
const createPropertyIcon = (score: number, status: PropertyStatus = 'discovered') => {
  const color = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  const isShortlisted = status === 'shortlisted';
  const isVetted = status === 'vetted';
  
  let statusColor = color;
  let glowClass = isShortlisted ? 'opacity-80 scale-150' : 'opacity-40';
  let borderClass = isShortlisted ? 'border-blue-400 ring-2 ring-blue-500/50' : 'border-white';
  
  if (isShortlisted) {
    statusColor = '#3b82f6';
  } else if (isVetted) {
    statusColor = '#10b981';
    glowClass = 'opacity-90 scale-[1.75]';
    borderClass = 'border-emerald-400 ring-4 ring-emerald-500/30';
  }

  return L.divIcon({
    className: 'property-marker',
    html: `<div class="group relative flex items-center justify-center">
             <div class="absolute inset-0 rounded-full blur-[6px] ${glowClass} group-hover:opacity-80 transition-all duration-500" style="background-color: ${statusColor}"></div>
             <div class="relative w-3.5 h-3.5 rounded-full border-[1.5px] ${borderClass} shadow-xl flex items-center justify-center transition-all duration-500 group-hover:scale-125" style="background-color: ${color}">
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
  'DLR': '#00afad'
};

const MetroOverlay: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Note: In a real Vite app, these assets should be in /public or handled by the server
    fetch('/data/london_metro.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load metro data:', err));
  }, []);

  if (!geoData) return null;

  return (
    <GeoJSON 
      data={geoData} 
      style={(feature) => {
        const lineName = feature?.properties?.lines?.[0]?.name;
        const color = METRO_COLORS[lineName] || '#475569';
        return {
          color,
          weight: 2.5,
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
      isSelected ? 'ring-2 ring-blue-500/50 border-blue-500/50' : 
      status === 'shortlisted' ? 'border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-linear-border'
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
          {property.is_value_buy && (
            <div className="px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-black uppercase rounded shadow-lg flex items-center gap-1 border border-emerald-400">
              <Gem size={10} />
              Value Buy
            </div>
          )}
          {property.metadata.is_new && (
            <div className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded shadow-lg border border-blue-400">
              Fresh
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 z-20">
          <AlphaBadge score={property.alpha_score} />
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => onPreview(property)}>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-0.5">
              {(property.area || 'Unknown').split(' (')[0]}
              {property.metadata.discovery_count > 1 && (
                <span className="ml-2 text-linear-accent">×{property.metadata.discovery_count}</span>
              )}
            </span>
            <h3 className="font-bold text-white leading-tight group-hover:text-blue-400 transition-colors text-sm tracking-tight truncate w-[180px]">{property.address}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 flex-grow">
          <div className="space-y-0.5">
            <span className="text-[8px] text-linear-text-muted block uppercase tracking-tighter font-bold opacity-60">Acquisition</span>
            <div className="text-sm font-bold text-white tracking-tight">£{property.realistic_price.toLocaleString()}</div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[8px] text-linear-text-muted block uppercase tracking-tighter font-bold opacity-60">Price/SQM</span>
            <span className={`text-xs font-bold ${property.is_value_buy ? 'text-retro-green' : 'text-zinc-400'}`}>£{property.price_per_sqm.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 border-y border-linear-border/50 mb-4">
          <div className="flex items-center gap-1.5">
            <Maximize2 size={10} className="text-linear-accent" />
            <span className="text-[10px] font-bold text-white tracking-tighter">{property.sqft}</span>
          </div>
          <div className="h-2 w-px bg-linear-border" />
          {property.floor_level && (
            <>
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={10} className="text-linear-accent" />
                <span className="text-[10px] font-bold text-white tracking-tighter uppercase">{property.floor_level}</span>
              </div>
              <div className="h-2 w-px bg-linear-border" />
            </>
          )}
          <div className="flex items-center gap-1.5">
            <Zap size={10} className="text-linear-accent" />
            <span className="text-[10px] font-bold text-white tracking-tighter">{property.epc}</span>
          </div>
          <div className="h-2 w-px bg-linear-border" />
          <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-tighter truncate">{(property.tenure || 'N/A').split(' ')[0]}</span>
        </div>

        <div className="px-2.5 py-1.5 bg-blue-500/5 border border-blue-500/10 rounded flex items-center justify-between group-hover:bg-blue-500/10 transition-colors">
          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Protocol</span>
          <span className="text-[10px] font-bold text-blue-100">{(property.neg_strategy || 'Default: 0% bid').split(':')[0]}</span>
        </div>
      </div>
      
      <div className="px-4 py-2.5 bg-linear-bg/50 border-t border-linear-border flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => toggleComparison(property.id)}
            className={`p-1 rounded transition-all hover:scale-110 ${
              isSelected ? 'text-blue-400 bg-blue-400/10' : 'text-linear-accent hover:text-white'
            }`}
            title="Add to Comparison"
          >
            <Zap size={14} fill={isSelected ? 'currentColor' : 'none'} />
          </button>
          <div className="w-px h-4 bg-linear-border mx-0.5"></div>
          <button 
            onClick={() => onStatusChange(property.id, status === 'shortlisted' ? 'discovered' : 'shortlisted')}
            className={`p-1 rounded transition-all hover:scale-110 ${
              status === 'shortlisted' ? 'text-blue-400' : 'text-linear-accent hover:text-white'
            }`}
            title="Shortlist"
          >
            <Bookmark size={14} fill={status === 'shortlisted' ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => onStatusChange(property.id, status === 'vetted' ? 'shortlisted' : 'vetted')}
            className={`p-1 rounded transition-all hover:scale-110 ${
              status === 'vetted' ? 'text-emerald-400' : 'text-linear-accent hover:text-white'
            }`}
            title="Mark as Vetted"
          >
            <ShieldCheck size={14} fill={status === 'vetted' ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => onStatusChange(property.id, status === 'archived' ? 'discovered' : 'archived')}
            className={`p-1 rounded transition-all hover:scale-110 ${
              status === 'archived' ? 'text-rose-400' : 'text-linear-accent hover:text-rose-400'
            }`}
            title="Archive"
          >
            {status === 'archived' ? <RotateCcw size={14} /> : <Archive size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to={`/property/${property.id}`}
            className="text-[9px] font-black text-linear-accent hover:text-white transition-colors uppercase tracking-[0.1em]"
          >
            Details
          </Link>
          <div className="relative group/hub">
            <button 
              className="text-[9px] font-black text-white hover:text-blue-400 flex items-center gap-1 transition-colors uppercase tracking-[0.1em]"
            >
              Links
              <ChevronDown size={10} />
            </button>
            <div className="absolute bottom-full right-0 pb-1 mb-0 opacity-0 translate-y-1 pointer-events-none group-hover/hub:opacity-100 group-hover/hub:translate-y-0 group-hover/hub:pointer-events-auto transition-all z-50 min-w-[120px]">
              <div className="bg-linear-card border border-linear-border rounded-lg shadow-2xl p-1.5">
                <div className="flex flex-col gap-0.5">
                  {(property.links || [property.link]).map((url, i) => (
                    <a 
                      key={i}
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-[8px] font-bold text-linear-text-muted hover:text-white hover:bg-linear-bg rounded-md transition-all flex items-center justify-between group/link uppercase tracking-tighter"
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
  const { properties, loading, error } = usePropertyContext();
  const { pipeline, setStatus, getStatus } = usePipeline();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filterValueBuys, setFilterValueBuys] = useState(false);
  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [filterShortlisted, setFilterShortlisted] = useState(false);
  const [filterVetted, setFilterVetted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [sortBy, setSortBy] = useState<'alpha_score' | 'realistic_price' | 'price_per_sqm' | 'value_gap' | 'commute_utility' | 'appreciation'>('alpha_score');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('table');
  
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

  // Handle URL area parameter
  useEffect(() => {
    const area = searchParams.get('area');
    if (area) {
      setAreaFilter(area);
    } else {
      setAreaFilter('All Areas');
    }
  }, [searchParams]);

  const filteredProperties = useMemo(() => {
    let result = [...properties];
    
    // Status Filter (Archived logic)
    if (showArchived) {
      result = result.filter(p => getStatus(p.id) === 'archived');
    } else {
      result = result.filter(p => getStatus(p.id) !== 'archived');
    }

    if (filterShortlisted) result = result.filter(p => getStatus(p.id) === 'shortlisted');
    if (filterVetted) result = result.filter(p => getStatus(p.id) === 'vetted');
    if (filterValueBuys) result = result.filter(p => p.is_value_buy);
    if (filterNewOnly) result = result.filter(p => p.metadata.is_new);
    if (areaFilter !== 'All Areas') result = result.filter(p => p.area.includes(areaFilter));

    // Precision Filters
    result = result.filter(p => p.realistic_price <= maxPrice);
    result = result.filter(p => p.sqft >= minSqft);

    result.sort((a, b) => {
      if (sortBy === 'alpha_score') return b.alpha_score - a.alpha_score;
      if (sortBy === 'realistic_price') return a.realistic_price - b.realistic_price;
      if (sortBy === 'price_per_sqm') return a.price_per_sqm - b.price_per_sqm;
      if (sortBy === 'value_gap') return (b.list_price - b.realistic_price) - (a.list_price - a.realistic_price);
      if (sortBy === 'commute_utility') return (a.commute_paternoster + a.commute_canada_square) - (b.commute_paternoster + b.commute_canada_square);
      if (sortBy === 'appreciation') return b.appreciation_potential - a.appreciation_potential;
      return 0;
    });

    return result;
  }, [properties, filterValueBuys, filterNewOnly, areaFilter, sortBy, filterShortlisted, filterVetted, showArchived, getStatus, maxPrice, minSqft]);

  const stats = useMemo(() => {
    if (properties.length === 0) return { total: 0, avgAlpha: '0.0', shortlisted: 0, vetted: 0 };
    return {
      total: properties.length,
      shortlisted: Object.values(pipeline).filter(s => s === 'shortlisted').length,
      vetted: Object.values(pipeline).filter(s => s === 'vetted').length,
      avgAlpha: (properties.reduce((acc, p) => acc + p.alpha_score, 0) / (properties.length || 1)).toFixed(1)
    };
  }, [properties, pipeline]);

  const areas = useMemo(() => {
    const uniqueAreas = new Set(properties.map(p => p.area.split(' (')[0]));
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
        <div className="h-12 w-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center border border-rose-500/20">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Sync Failure</h2>
        <p className="text-linear-text-muted text-xs leading-relaxed">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-black rounded-lg font-bold text-xs hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
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
          className="text-blue-400"
          tooltip="The proprietary 0-10 composite rating representing the overall acquisition quality of all filtered assets."
          methodology="Weighted average of Tenure Quality (40%), Spatial Alpha (30%), and Price Efficiency (30%)."
        />
        <KPICard 
          label="Shortlisted" 
          value={stats.shortlisted} 
          icon={Bookmark} 
          className="text-retro-green"
          tooltip="Current volume of assets successfully moved from 'Discovered' to 'Shortlisted' status."
          methodology="User-defined filter status for assets marked for secondary vetting."
        />
        <KPICard 
          label="Vetted Assets" 
          value={stats.vetted} 
          icon={ShieldCheck} 
          className="text-emerald-400"
          tooltip="Assets that have passed rigorous structural, financial, and spatial vetting."
          methodology="Third-stage lifecycle status for assets ready for final acquisition protocols."
        />
      </div>

      {/* Market Pulse Widget */}
      <MarketPulse />

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-linear-card/50 p-4 rounded-2xl border border-linear-border">
        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="flex bg-linear-bg p-1 rounded-lg border border-linear-border shadow-inner">
            <button 
              onClick={() => { setViewMode('grid'); setShowArchived(false); }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-wider ${viewMode === 'grid' && !showArchived ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
            >
              <LayoutGrid size={12} />
              GRID
            </button>
            <button 
              onClick={() => { setViewMode('table'); setShowArchived(false); }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-wider ${viewMode === 'table' && !showArchived ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
            >
              <TableIcon size={12} />
              TABLE
            </button>
            <button 
              onClick={() => { setViewMode('map'); setShowArchived(false); }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-wider ${viewMode === 'map' && !showArchived ? 'bg-linear-accent text-white shadow-lg' : 'text-linear-text-muted hover:text-white'}`}
            >
              <MapIcon size={12} />
              MAP
            </button>
            <div className="w-px h-4 bg-linear-border mx-1 self-center"></div>
            <button 
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-wider ${showArchived ? 'bg-rose-500/20 text-rose-400 shadow-lg border border-rose-500/30' : 'text-linear-text-muted hover:text-rose-400'}`}
            >
              <Archive size={12} />
              ARCHIVED
            </button>
          </div>
          
          <div className="flex items-center gap-6 ml-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterShortlisted} 
                onChange={(e) => setFilterShortlisted(e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filterShortlisted ? 'bg-blue-500' : 'bg-linear-accent'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${filterShortlisted ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-linear-text-muted group-hover:text-white transition-colors">Shortlist</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterVetted} 
                onChange={(e) => setFilterVetted(e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filterVetted ? 'bg-emerald-500' : 'bg-linear-accent'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${filterVetted ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-linear-text-muted group-hover:text-white transition-colors">Vetted</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterValueBuys} 
                onChange={(e) => setFilterValueBuys(e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filterValueBuys ? 'bg-retro-green' : 'bg-linear-accent'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${filterValueBuys ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-linear-text-muted group-hover:text-white transition-colors">Value Only</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterNewOnly} 
                onChange={(e) => setFilterNewOnly(e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filterNewOnly ? 'bg-indigo-500' : 'bg-linear-accent'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${filterNewOnly ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-linear-text-muted group-hover:text-white transition-colors">Fresh</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
          <button 
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`p-2 rounded-lg border transition-all ${isFilterPanelOpen ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-linear-bg border-linear-border text-linear-text-muted hover:border-linear-accent hover:text-white'}`}
          >
            <Filter size={16} />
          </button>

          <div className="relative group">
            <select 
              value={areaFilter} 
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'All Areas') {
                  searchParams.delete('area');
                } else {
                  searchParams.set('area', val);
                }
                setSearchParams(searchParams);
              }}
              className="bg-linear-bg border border-linear-border rounded-lg pl-8 pr-8 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none hover:border-linear-accent transition-all cursor-pointer uppercase tracking-widest"
            >
              {areas.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-linear-accent pointer-events-none" />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-linear-accent group-hover:text-blue-400 transition-colors">
              <ArrowUpDown size={12} />
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-linear-bg border border-linear-border rounded-lg pl-8 pr-8 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none hover:border-linear-accent transition-all cursor-pointer uppercase tracking-widest"
            >
              <option value="alpha_score">Alpha Score (H-L)</option>
              <option value="realistic_price">Target Price (L-H)</option>
              <option value="price_per_sqm">Efficiency (L-H)</option>
              <option value="value_gap">Value Gap (H-L)</option>
              <option value="commute_utility">Commute (L-H)</option>
              <option value="appreciation">Appreciation (H-L)</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-linear-accent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Precision Filter Panel */}
      {isFilterPanelOpen && (
        <div className="bg-linear-card border border-linear-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Max Target Price</span>
              <span className="text-sm font-bold text-white tracking-tight">£{maxPrice.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="400000" 
              max="1500000" 
              step="50000" 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full h-1.5 bg-linear-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[9px] font-bold text-linear-accent uppercase">
              <span>£400k</span>
              <span>£1.5M</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">Min Interior Space</span>
              <span className="text-sm font-bold text-white tracking-tight">{minSqft} SQFT</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1500" 
              step="50" 
              value={minSqft} 
              onChange={(e) => setMinSqft(parseInt(e.target.value))}
              className="w-full h-1.5 bg-linear-bg rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[9px] font-bold text-linear-accent uppercase">
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
                <h3 className="text-sm font-bold text-white tracking-tight">No matching assets found</h3>
                <p className="text-[10px] text-linear-text-muted mt-1 uppercase tracking-widest font-bold">Try expanding your search parameters</p>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="animate-in fade-in duration-500">
            <PropertyTable 
              properties={filteredProperties} 
              onSortChange={(key) => setSortBy(key as any)} 
              currentSort={sortBy}
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
                    <div className="w-64">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-xs m-0 tracking-tight">{property.address}</h4>
                        <AlphaBadge score={property.alpha_score} />
                      </div>
                      <div className="text-[10px] text-linear-text-muted mb-3 uppercase tracking-widest font-bold">{property.area}</div>
                      
                      <div className="flex gap-4 py-2 border-y border-linear-border/30 mb-2">
                         <div className="flex flex-col">
                            <span className="text-[8px] text-linear-text-muted uppercase font-bold">St Pauls</span>
                            <span className="text-[10px] font-black text-blue-400">{property.commute_paternoster} min</span>
                         </div>
                         <div className="flex flex-col border-l border-linear-border/30 pl-3">
                            <span className="text-[8px] text-linear-text-muted uppercase font-bold">Canary Wharf</span>
                            <span className="text-[10px] font-black text-emerald-400">{property.commute_canada_square} min</span>
                         </div>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-linear-text-muted uppercase font-bold">Target Price</span>
                           <span className="text-sm font-bold text-white leading-none">£{property.realistic_price.toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={() => handlePreview(property)}
                          className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors uppercase tracking-widest"
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
