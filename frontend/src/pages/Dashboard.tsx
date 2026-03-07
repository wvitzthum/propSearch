import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Filter, 
  ArrowUpDown, 
  TrendingUp, 
  ExternalLink,
  Map as MapIcon,
  LayoutGrid,
  Gem,
  Search,
  ShieldAlert,
  Clock,
  Table as TableIcon,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useProperties } from '../hooks/useProperties';
import type { PropertyWithCoords } from '../hooks/useProperties';
import PropertyTable from '../components/PropertyTable';

// Fix Leaflet marker icons with a custom "Retro" style
const createRetroIcon = (color: string) => {
  return L.divIcon({
    className: 'retro-marker',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const AlphaBadge: React.FC<{ score: number }> = ({ score }) => {
  let colorClass = "text-rose-400 border-rose-400/20 bg-rose-400/10";
  if (score >= 8) colorClass = "text-emerald-400 border-emerald-400/20 bg-emerald-400/10";
  else if (score >= 5) colorClass = "text-amber-400 border-amber-400/20 bg-amber-400/10";

  return (
    <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${colorClass}`}>
      {score.toFixed(1)}
    </div>
  );
};

const PropertyCard: React.FC<{ property: PropertyWithCoords }> = ({ property }) => {
  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden hover:border-linear-accent transition-all group flex flex-col h-full relative glow-border">
      <Link to={`/property/${property.id}`} className="p-5 flex-grow cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-linear-text-muted uppercase tracking-widest">{property.area.split(' (')[0]}</span>
               {property.metadata.is_new && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
            </div>
            <h3 className="font-semibold text-white leading-tight group-hover:text-blue-400 transition-colors text-sm">{property.address}</h3>
          </div>
          <AlphaBadge score={property.alpha_score} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <span className="text-[9px] text-linear-text-muted block uppercase tracking-tighter">Realistic Target</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-white tracking-tight">£{property.realistic_price.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[9px] text-linear-text-muted block uppercase tracking-tighter">Efficiency</span>
            <span className={`text-xs font-bold ${property.is_value_buy ? 'text-emerald-400' : 'text-white'}`}>£{property.price_per_sqm.toLocaleString()}/m²</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {['tenure', 'epc', 'sqft'].map((key) => (
            <span key={key} className="px-2 py-0.5 bg-linear-bg text-linear-text-muted rounded text-[10px] font-medium border border-linear-border capitalize">
               {property[key as keyof PropertyWithCoords] as string} {key === 'sqft' ? 'SQFT' : ''}
            </span>
          ))}
        </div>

        <div className="px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-center justify-between">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Neg Strategy</span>
          <span className="text-[10px] font-bold text-blue-100">{property.neg_strategy}</span>
        </div>
      </Link>
      
      <div className="px-5 py-3 bg-linear-bg/50 border-t border-linear-border flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2 text-[10px] text-linear-text-muted font-medium">
          <Activity size={12} className="text-emerald-500" />
          {property.dom}d on market
        </div>
        <a 
          href={property.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-white hover:text-blue-400 flex items-center gap-1 transition-colors uppercase tracking-widest"
        >
          Source
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { properties, loading, error } = useProperties();
  const [filterValueBuys, setFilterValueBuys] = useState(false);
  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [sortBy, setSortBy] = useState<'alpha' | 'price' | 'sqm'>('alpha');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('grid');

  const filteredProperties = useMemo(() => {
    let result = [...properties];
    if (filterValueBuys) result = result.filter(p => p.is_value_buy);
    if (filterNewOnly) result = result.filter(p => p.metadata.is_new);
    if (areaFilter !== 'All Areas') result = result.filter(p => p.area.includes(areaFilter));

    result.sort((a, b) => {
      if (sortBy === 'alpha') return b.alpha_score - a.alpha_score;
      if (sortBy === 'price') return a.realistic_price - b.realistic_price;
      if (sortBy === 'sqm') return a.price_per_sqm - b.price_per_sqm;
      return 0;
    });

    return result;
  }, [properties, filterValueBuys, filterNewOnly, areaFilter, sortBy]);

  const stats = useMemo(() => {
    if (properties.length === 0) return { total: 0, avgAlpha: 0, valueBuys: 0 };
    return {
      total: properties.length,
      avgAlpha: (properties.reduce((acc, p) => acc + p.alpha_score, 0) / properties.length).toFixed(1),
      valueBuys: properties.filter(p => p.is_value_buy).length
    };
  }, [properties]);

  const areas = useMemo(() => {
    const uniqueAreas = new Set(properties.map(p => p.area.split(' (')[0]));
    return ['All Areas', ...Array.from(uniqueAreas)];
  }, [properties]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-6">
        <div className="h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-linear-text-muted text-xs font-bold uppercase tracking-widest">Syncing Prime Assets...</p>
      </div>
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
      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-linear-card p-6 rounded-xl border border-linear-border flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-linear-text-muted z-10">
            <LayoutGrid size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Inventory</span>
          </div>
          <div className="text-3xl font-bold text-white tracking-tighter z-10">{stats.total}</div>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <LayoutGrid size={80} strokeWidth={1} />
          </div>
        </div>
        <div className="bg-linear-card p-6 rounded-xl border border-linear-border flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-linear-text-muted z-10">
            <TrendingUp size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Alpha Avg</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 tracking-tighter z-10">{stats.avgAlpha}</div>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={80} strokeWidth={1} />
          </div>
        </div>
        <div className="bg-linear-card p-6 rounded-xl border border-linear-border flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-linear-text-muted z-10">
            <Gem size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Value Buys</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tighter z-10">{stats.valueBuys}</div>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Gem size={80} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="flex bg-linear-card p-1 rounded-lg border border-linear-border shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-linear-accent text-white shadow-inner' : 'text-linear-text-muted hover:text-white'}`}
            >
              <LayoutGrid size={12} />
              Grid
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-linear-accent text-white shadow-inner' : 'text-linear-text-muted hover:text-white'}`}
            >
              <TableIcon size={12} />
              Table
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-linear-accent text-white shadow-inner' : 'text-linear-text-muted hover:text-white'}`}
            >
              <MapIcon size={12} />
              Map
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterValueBuys} 
                onChange={(e) => setFilterValueBuys(e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filterValueBuys ? 'bg-emerald-500' : 'bg-linear-accent'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${filterValueBuys ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[11px] font-semibold text-linear-text-muted group-hover:text-white">Value Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filterNewOnly} 
                onChange={(e) => setFilterNewOnly(e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filterNewOnly ? 'bg-blue-500' : 'bg-linear-accent'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${filterNewOnly ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
              <span className="text-[11px] font-semibold text-linear-text-muted group-hover:text-white">Fresh</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-linear-text-muted">
              <Filter size={12} />
            </div>
            <select 
              value={areaFilter} 
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-linear-card border border-linear-border rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none hover:border-linear-accent transition-colors"
            >
              {areas.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-linear-text-muted">
              <ArrowUpDown size={12} />
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-linear-card border border-linear-border rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none hover:border-linear-accent transition-colors"
            >
              <option value="alpha">Alpha Score</option>
              <option value="price">Price (L-H)</option>
              <option value="sqm">Price/m² (L-H)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main View */}
      <div className="mt-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
            {filteredProperties.length === 0 && (
              <div className="col-span-full py-32 text-center bg-linear-card/30 rounded-2xl border border-dashed border-linear-border">
                <div className="inline-flex items-center justify-center h-12 w-12 bg-linear-card rounded-xl text-linear-text-muted mb-4 border border-linear-border">
                  <Search size={20} />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">No matching assets found</h3>
                <p className="text-xs text-linear-text-muted mt-1">Try adjusting the filters or expanding your area search.</p>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="animate-in fade-in duration-500">
            <PropertyTable properties={filteredProperties} />
          </div>
        ) : (
          <div className="h-[70vh] rounded-2xl overflow-hidden border border-linear-border relative z-0 retro-map animate-in fade-in zoom-in-95 duration-700 shadow-2xl shadow-black/50">
            <MapContainer center={[51.54, -0.15]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {filteredProperties.map(property => (
                <Marker 
                  key={property.id} 
                  position={[property.lat, property.lng]}
                  icon={createRetroIcon(property.alpha_score >= 8 ? '#10b981' : property.alpha_score >= 5 ? '#f59e0b' : '#3b82f6')}
                >
                  <Popup className="property-popup">
                    <div className="w-64">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-xs m-0 tracking-tight">{property.address}</h4>
                        <AlphaBadge score={property.alpha_score} />
                      </div>
                      <div className="text-[10px] text-linear-text-muted mb-3 uppercase tracking-widest">{property.area}</div>
                      <div className="flex justify-between items-end border-t border-linear-border pt-2 mt-2">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-linear-text-muted uppercase">Target Price</span>
                           <span className="text-sm font-bold text-white leading-none">£{property.realistic_price.toLocaleString()}</span>
                        </div>
                        <Link 
                          to={`/property/${property.id}`}
                          className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors uppercase"
                        >
                          Deep Scan <ChevronRight size={12} />
                        </Link>
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
