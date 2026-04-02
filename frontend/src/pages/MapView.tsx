import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import {
  Maximize2, Minimize2, Layers, Filter, X, TrendingUp,
  ExternalLink, Bookmark, Archive, Star
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import type { PropertyStatus } from '../hooks/usePipeline';
import AlphaBadge from '../components/AlphaBadge';
import PropertyImage from '../components/PropertyImage';

// FE-183: Metro line style — consistent with Dashboard MetroOverlay
const METRO_COLORS: Record<string, string> = {
  'District': '#00782a', 'Piccadilly': '#003688', 'Victoria': '#00a1e4',
  'London Overground': '#e8630a', 'Elizabeth line': '#6950a1', 'Metropolitan': '#9b0056',
  'Northern': '#000000', 'Central': '#e32017', 'Jubilee': '#a0a5a9',
  'Bakerloo': '#b36305', 'Hammersmith & City': '#f3a9bb', 'Circle': '#ffd010',
  'DLR': '#00afad', 'Thameslink': '#ffb000', 'Tramlink': '#84b817',
  'Waterloo & City': '#95cdba', 'IFS Cloud Cable Car': '#e21836'
};

// FE-178: Reuse the same marker icon factory from Dashboard.tsx
const createPropertyIcon = (score: number, status: PropertyStatus = 'discovered') => {
  const color = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  const isShortlisted = status === 'shortlisted';
  const isVetted = status === 'vetted';
  let statusColor = color;
  let glowClass = isShortlisted ? 'opacity-80 scale-150' : 'opacity-40';
  let borderClass = isShortlisted ? 'border-linear-accent-blue ring-2 ring-linear-accent-blue/50' : 'border-white';
  if (isShortlisted) { statusColor = '#3b82f6'; } 
  else if (isVetted) { statusColor = '#10b981'; glowClass = 'opacity-90 scale-[1.75]'; borderClass = 'border-linear-accent-emerald ring-4 ring-linear-accent-emerald/30'; }
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

// Metro GeoJSON style — FE-183 weight 2.5, opacity 0.45, Overground dash
const getMetroStyle = () => ({
  color: '#475569',
  weight: 2.5,
  opacity: 0.45,
  lineJoin: 'round' as const,
});

const getMetroStyleWithDash = () => ({
  color: '#475569',
  weight: 2.5,
  opacity: 0.45,
  lineJoin: 'round' as const,
  dashArray: '4, 4' as string,
});

// Auto-fit bounds when properties change
const AutoFitBounds: React.FC<{ properties: any[] }> = ({ properties }) => {
  const map = useMap();
  useEffect(() => {
    if (!properties || properties.length === 0) return;
    const bounds = L.latLngBounds(properties.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true, duration: 0.5 });
  }, [properties, map]);
  return null;
};

const MapView: React.FC = () => {
  const { properties } = usePropertyContext();
  const { getStatus, setStatus } = usePipeline();
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [greenspaceData, setGreenspaceData] = useState<any>(null);
  const [riversData, setRiversData] = useState<any>(null);
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [alphaThreshold, setAlphaThreshold] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [layers, setLayers] = useState({ properties: true, metro: true, greenspace: false, rivers: false });
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch GeoJSON layers
  useEffect(() => {
    fetch('/api/london-metro')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setGeoData(d))
      .catch(() => {});
    fetch('/data/london_greenspace.geojson')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setGreenspaceData(d))
      .catch(() => {});
    fetch('/data/london_rivers.geojson')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setRiversData(d))
      .catch(() => {});
  }, []);

  // Fullscreen API
  const toggleFullscreen = () => {
    if (!mapRef.current) return;
    if (!document.fullscreenElement) {
      mapRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p => {
      const areaName = (p.area || '').split(' (')[0];
      if (areaFilter !== 'All Areas' && areaName !== areaFilter) return false;
      if (alphaThreshold > 0 && p.alpha_score < alphaThreshold) return false;
      if (statusFilter !== 'all') {
        const s = getStatus(p.id);
        if (s !== statusFilter) return false;
      }
      return true;
    });
  }, [properties, areaFilter, alphaThreshold, statusFilter, getStatus]);

  // Unique areas
  const availableAreas = useMemo(() => {
    if (!properties) return [];
    return Array.from(new Set(properties.map(p => (p.area || '').split(' (')[0]))).sort();
  }, [properties]);

  const nextStatus = (s: PropertyStatus) =>
    s === 'discovered' ? 'shortlisted' : s === 'shortlisted' ? 'vetted' : 'archived';

  return (
    <div ref={mapRef} className="fixed inset-0 top-12 bg-linear-bg z-0">
      {/* Map */}
      <MapContainer
        center={[51.547, -0.140]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <AutoFitBounds properties={filteredProperties} />

        {/* Metro lines */}
        {layers.metro && geoData && (
          <GeoJSON
            data={geoData}
            style={(feature) => {
              const lines = feature?.properties?.lines || [];
              const primaryLine = lines[0]?.name || feature?.properties?.name || '';
              const isOverground = primaryLine.toLowerCase().includes('overground');
              const color = feature?.properties?.color || METRO_COLORS[primaryLine.replace(' Line', '')] || '#475569';
              return { ...(isOverground ? getMetroStyleWithDash() : getMetroStyle()), color };
            }}
          />
        )}

        {/* FE-184: Greenspace polygons */}
        {layers.greenspace && greenspaceData && (
          <GeoJSON
            data={greenspaceData}
            style={() => ({
              fillColor: '#4ade80',
              fillOpacity: 0.18,
              color: '#4ade80',
              weight: 0.5,
              opacity: 0.3,
            })}
          />
        )}

        {/* FE-184: River/canal lines */}
        {layers.rivers && riversData && (
          <GeoJSON
            data={riversData}
            style={(feature) => ({
              color: '#60a5fa',
              weight: feature?.properties?.type === 'river' ? 3 : 2,
              opacity: 0.6,
              fillColor: '#60a5fa',
              fillOpacity: feature?.properties?.type === 'river' ? 0.12 : 0.08,
            })}
          />
        )}

        {/* Property markers */}
        {layers.properties && filteredProperties.map(p => {
          const status = getStatus(p.id);
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createPropertyIcon(p.alpha_score, status)}
              eventHandlers={{ click: () => setSelectedProperty(p) }}
            >
              <Popup className="leaflet-popup-linear">
                <div className="bg-linear-card border border-linear-border rounded-xl p-3 min-w-[200px]">
                  <PropertyImage src={p.image_url} alt={p.address} className="w-full h-24 object-cover rounded-lg mb-2" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white truncate">{p.address}</p>
                    <p className="text-[10px] text-linear-text-muted">{(p.area || '').split(' (')[0]}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <AlphaBadge score={p.alpha_score} className="text-[8px]" />
                      <span className="text-[10px] font-bold text-blue-400">£{(p.realistic_price / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* FE-178: Controls Overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Layer toggles */}
        <div className="bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-2 space-y-1.5 shadow-2xl">
          {[
            { key: 'properties', label: 'Properties', icon: <Star size={12} /> },
            { key: 'metro', label: 'Metro', icon: <Layers size={12} /> },
            { key: 'greenspace', label: 'Greenspace', icon: <svg width="12" height="12" viewBox="0 0 12 12" className="text-emerald-400"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="6" r="2.5" fill="currentColor" opacity="0.4"/></svg> },
            { key: 'rivers', label: 'Rivers', icon: <svg width="12" height="12" viewBox="0 0 12 12" className="text-blue-400"><path d="M2 10 Q4 6 6 7 Q8 8 10 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setLayers(l => ({ ...l, [key]: !l[key as keyof typeof layers] }))}
              className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                layers[key as keyof typeof layers]
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-linear-text-muted hover:text-white border border-transparent'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <div className="bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-2 shadow-2xl">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              isFilterOpen ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-linear-text-muted hover:text-white border border-transparent'
            }`}
          >
            <Filter size={12} />Filters
          </button>
        </div>

        {/* Fullscreen toggle */}
        <div className="bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-2 shadow-2xl">
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-8 h-8 text-linear-text-muted hover:text-white transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-4 shadow-2xl min-w-[500px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Map Filters</span>
            <button onClick={() => setIsFilterOpen(false)} className="text-linear-text-muted hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* Area Filter */}
            <div>
              <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1.5">Area</div>
              <select
                value={areaFilter}
                onChange={e => setAreaFilter(e.target.value)}
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="All Areas">All Areas</option>
                {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {/* Status Filter */}
            <div>
              <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1.5">Status</div>
              <div className="flex flex-wrap gap-1">
                {(['all', 'discovered', 'shortlisted', 'vetted', 'archived'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                      statusFilter === s
                        ? s === 'archived' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : s === 'vetted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : s === 'shortlisted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-linear-bg text-white border border-linear-border'
                        : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Alpha Threshold */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Alpha Min</span>
                <span className="text-[10px] font-bold text-blue-400">{alphaThreshold}+</span>
              </div>
              <input
                type="range"
                min="0" max="10" step="1"
                value={alphaThreshold}
                onChange={e => setAlphaThreshold(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
          {/* Stats */}
          <div className="mt-3 pt-3 border-t border-linear-border flex items-center justify-between">
            <span className="text-[9px] text-linear-text-muted">
              Showing <span className="font-bold text-white">{filteredProperties.length}</span> of <span className="font-bold text-white">{properties.length}</span> properties
            </span>
            <button
              onClick={() => { setAreaFilter('All Areas'); setAlphaThreshold(0); setStatusFilter('all'); }}
              className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* FE-178: Slide-in Property Detail Panel */}
      {selectedProperty && (
        <>
          <div className="fixed inset-0 z-[900] bg-black/30 backdrop-blur-sm" onClick={() => setSelectedProperty(null)} />
          <div className="fixed top-12 right-0 bottom-0 w-96 z-[950] bg-linear-card/95 backdrop-blur-xl border-l border-linear-border shadow-2xl overflow-y-auto custom-scrollbar animate-slide-in-right">
            <div className="sticky top-0 z-10 bg-linear-card/95 backdrop-blur-md border-b border-linear-border px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Property Detail</span>
              <button onClick={() => setSelectedProperty(null)} className="text-linear-text-muted hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Image */}
              <div className="relative h-48 bg-linear-bg rounded-xl overflow-hidden">
                <PropertyImage src={selectedProperty.image_url} alt={selectedProperty.address} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <AlphaBadge score={selectedProperty.alpha_score} className="text-[8px]" />
                </div>
                {selectedProperty.is_value_buy && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-emerald-500/90 rounded text-[8px] font-black text-white uppercase tracking-wider">VALUE BUY</div>
                )}
              </div>
              {/* Address */}
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">{selectedProperty.address}</h2>
                <p className="text-[10px] text-linear-text-muted mt-0.5">{selectedProperty.area}</p>
              </div>
              {/* Price KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-linear-bg rounded-lg p-3 border border-linear-border">
                  <div className="text-[8px] text-linear-text-muted uppercase tracking-widest">Target Price</div>
                  <div className="text-lg font-bold text-white tracking-tight">£{(selectedProperty.realistic_price / 1000).toFixed(0)}K</div>
                </div>
                <div className="bg-linear-bg rounded-lg p-3 border border-linear-border">
                  <div className="text-[8px] text-linear-text-muted uppercase tracking-widest">List Price</div>
                  <div className="text-lg font-bold text-blue-400 tracking-tight">£{(selectedProperty.list_price / 1000).toFixed(0)}K</div>
                </div>
              </div>
              {/* Alpha metrics */}
              <div className="bg-linear-bg rounded-xl p-3 border border-linear-border space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className="text-blue-400" />
                  <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest">Acquisition Metrics</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-[8px] text-linear-text-muted">Alpha</div><div className="text-sm font-bold text-white">{selectedProperty.alpha_score?.toFixed(1) ?? '—'}</div></div>
                  <div><div className="text-[8px] text-linear-text-muted">Price/SQM</div><div className="text-sm font-bold text-white">£{selectedProperty.price_per_sqm?.toLocaleString() ?? '—'}</div></div>
                  <div><div className="text-[8px] text-linear-text-muted">SQFT</div><div className="text-sm font-bold text-white">{selectedProperty.sqft?.toLocaleString() ?? '—'}</div></div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const s = getStatus(selectedProperty.id);
                      setStatus(selectedProperty.id, nextStatus(s));
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-[10px] font-bold text-blue-400 hover:bg-blue-500/30 transition-all"
                  >
                    <Bookmark size={12} />
                    Advance Status
                  </button>
                  {selectedProperty.link && (
                    <a
                      href={selectedProperty.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-linear-bg border border-linear-border rounded-xl text-[10px] font-bold text-linear-text-muted hover:text-white transition-all"
                    >
                      <ExternalLink size={12} />Portal
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus(selectedProperty.id, 'archived')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                  >
                    <Archive size={12} />Archive
                  </button>
                </div>
              </div>
              {/* Property Details */}
              <div className="space-y-1.5">
                {[
                  ['EPC', selectedProperty.epc],
                  ['Tenure', selectedProperty.tenure],
                  ['DOM', `${selectedProperty.dom ?? 0}d`],
                  ['Service Charge', `£${selectedProperty.service_charge?.toLocaleString() ?? 0}/yr`],
                  ['Ground Rent', `£${selectedProperty.ground_rent?.toLocaleString() ?? 0}/yr`],
                  ['Lease Remaining', `${selectedProperty.lease_years_remaining ?? 0}yr`],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between py-1.5 border-b border-linear-border/30 last:border-0">
                    <span className="text-[9px] text-linear-text-muted">{label}</span>
                    <span className="text-[9px] font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MapView;
