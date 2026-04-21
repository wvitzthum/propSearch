import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import {
  Maximize2, Minimize2, Layers, Filter, X, TrendingUp,
  ExternalLink, Bookmark, Archive, Star, Palette, ArrowRight
} from 'lucide-react';
import { usePropertyContext } from '../hooks/PropertyContext';
import { usePipeline } from '../hooks/usePipeline';
import type { PropertyStatus } from '../hooks/usePipeline';
import type { PropertyWithCoords } from '../types/property';
import type { MarketStatus } from '../types/property';
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
// FE-251: Enhanced with alphaColorMode support for smooth gradient colour mode
const createPropertyIcon = (
  score: number,
  status: PropertyStatus = 'discovered',
  alphaColorMode: boolean = false
) => {
  // FE-251: Compute dot fill colour — either status-driven (default) or alpha-gradient
  let color: string;
  if (alphaColorMode) {
    // Smooth 3-stop gradient interpolation
    if (score >= 8) {
      color = '#10b981'; // emerald
    } else if (score >= 5) {
      // Interpolate between amber (5.0) and emerald (8.0)
      const t = (score - 5) / 3; // 0 at 5.0, 1 at 8.0
      color = interpolateColor('#f59e0b', '#10b981', t); // amber → emerald
    } else {
      // Interpolate between red (0) and amber (5.0)
      const t = score / 5; // 0 at 0, 1 at 5.0
      color = interpolateColor('#ef4444', '#f59e0b', t); // red → amber
    }
  } else {
    color = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  }

  const isShortlisted = status === 'shortlisted';
  const isVetted = status === 'vetted';
  // FE-251: Status colour (glow/border) always driven by pipeline status, independent of alpha mode
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

// FE-251: Linear interpolation between two hex colours
const interpolateColor = (from: string, to: string, t: number): string => {
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const r = lerp(r1, r2, t);
  const g = lerp(g1, g2, t);
  const b = lerp(b1, b2, t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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

// FE-275: Choropleth colour constants
const CHOROPLETH_COLORS: Record<'income' | 'density' | 'crime', string[]> = {
  income: ['#eff6ff', '#93c5fd', '#3b82f6', '#1e3a8a'],
  density: ['#fff7ed', '#fdba74', '#f97316', '#7c2d12'],
  crime: ['#22c55e', '#fafafa', '#ef4444', '#991b1b'],
};
const CHOROPLETH_BREAKS = [0, 0.25, 0.5, 0.75, 1.0];

const choroplethStyle = (feature: GeoJSON.Feature | undefined, mode: 'income' | 'density' | 'crime') => {
  const val = feature?.properties?.lsoa_value ?? 0.5; // 0–1 normalized value
  return {
    fillColor: getChoroplethColor(mode, val),
    fillOpacity: 0.35,
    color: '#1e293b',
    weight: 0.3,
    opacity: 0.2,
  };
};

// FE-275: Choropleth colour computation — uses existing interpolateColor from FE-251
const getChoroplethColor = (mode: 'income' | 'density' | 'crime', t: number): string => {
  const palette = CHOROPLETH_COLORS[mode];
  const idx = Math.min(Math.floor(t * 4), 3);
  const t0 = CHOROPLETH_BREAKS[idx];
  const t1 = CHOROPLETH_BREAKS[idx + 1];
  const localT = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
  return interpolateColor(palette[idx], palette[idx + 1], localT);
};

// FE-275: POI CircleMarker colours
const POI_COLORS: Record<string, string> = {
  transport: '#6366f1',
  supermarket: '#f59e0b',
  convenience: '#d97706',
  school: '#22c55e',
  gym: '#ef4444',
  cafe: '#8b5cf6',
  park: '#10b981',
};

// Auto-fit bounds when properties change
const AutoFitBounds: React.FC<{ properties: PropertyWithCoords[] }> = ({ properties }) => {
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
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoords | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [greenspaceData, setGreenspaceData] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [riversData, setRiversData] = useState<GeoJSON.GeoJsonObject | null>(null);
  // FE-275: Choropleth overlay state (LSOA GeoJSON + demographic mode)
  const [choroplethData, setChoroplethData] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [choroplethMode, setChoroplethMode] = useState<'income' | 'density' | 'crime' | null>(null);
  // FE-275: POI overlay state (point-of-interest markers)
  const [poiData, setPoiData] = useState<Array<{ id: string; lat: number; lng: number; category: string; name: string }>>([]);
  const [poiCategoryFilter, setPoiCategoryFilter] = useState<Set<string>>(new Set(['transport', 'supermarket', 'school', 'gym', 'cafe', 'park']));
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [alphaThreshold, setAlphaThreshold] = useState(0);
  // FE-252: Multi-select status filter — Set<PropertyStatus>
  const [statusFilter, setStatusFilter] = useState<Set<PropertyStatus>>(new Set());
  // FE-251: Alpha colour mode toggle
  const [alphaColorMode, setAlphaColorMode] = useState(false);
  // FE-252: Market status filter (analyst-owned axis — withdrawn/sold by default in Map)
  const [marketStatusFilter, setMarketStatusFilter] = useState<MarketStatus | 'all'>('all');
  const [layers, setLayers] = useState({ properties: true, metro: true, greenspace: false, rivers: false });
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    // FE-275: Fetch LSOA choropleth data
    fetch('/data/lsoa_choropleth_london.geojson')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setChoroplethData(d))
      .catch(() => {});
    // FE-275: Fetch POI data
    fetch('/data/london_pois.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        // Support GeoJSON FeatureCollection or flat array
        if (d.features && Array.isArray(d.features)) {
          setPoiData(d.features.map((f: { geometry: { coordinates: [number, number] }; properties: { id: string; category: string; name: string } }) => ({
            id: f.properties.id,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            category: f.properties.category,
            name: f.properties.name,
          })));
        } else if (Array.isArray(d)) {
          setPoiData(d as Array<{ id: string; lat: number; lng: number; category: string; name: string }>);
        }
      })
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
      // FE-252: Multi-select status filter — empty set means 'all' (show everything)
      if (statusFilter.size > 0) {
        const s = getStatus(p.id);
        if (!statusFilter.has(s)) return false;
      }
      // FE-252: Market status filter — analyst-owned axis; by default hides withdrawn/sold
      if (marketStatusFilter !== 'all') {
        if (p.market_status !== marketStatusFilter) return false;
      }
      return true;
    });
  }, [properties, areaFilter, alphaThreshold, statusFilter, getStatus, marketStatusFilter]);

  // FE-252: Derived active filter count (for badge on Filters button)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (areaFilter !== 'All Areas') count++;
    if (alphaThreshold > 0) count++;
    if (statusFilter.size > 0) count++;
    if (marketStatusFilter !== 'all') count++;
    return count;
  }, [areaFilter, alphaThreshold, statusFilter, marketStatusFilter]);

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

        {/* FE-275: Choropleth overlay (LSOA polygons) */}
        {choroplethMode && choroplethData && (
          <GeoJSON
            data={choroplethData}
            style={(feature) => choroplethStyle(feature, choroplethMode)}
            onEachFeature={(feature, layer) => {
              if (feature?.properties) {
                const props = feature.properties;
                const label = props.lsoa_name || props.name || 'LSOA';
                const value = props.lsoa_value != null
                  ? props.lsoa_value.toFixed(0)
                  : props.income ? `£${Number(props.income).toLocaleString()}`
                  : props.crime_rate ? `${props.crime_rate.toFixed(0)}/1k`
                  : 'N/A';
                layer.bindTooltip(`${label}: ${value}`, {
                  className: 'bg-linear-card border border-linear-border text-white text-[10px] rounded-lg px-2 py-1',
                  sticky: true,
                });
              }
            }}
          />
        )}

        {/* FE-275: POI markers */}
        {poiData
          .filter(p => poiCategoryFilter.has(p.category))
          .map(poi => (
            <CircleMarker
              key={poi.id}
              center={[poi.lat, poi.lng]}
              radius={4}
              pathOptions={{
                color: POI_COLORS[poi.category] ?? '#ffffff',
                fillColor: POI_COLORS[poi.category] ?? '#ffffff',
                fillOpacity: 0.7,
                weight: 0,
              }}
              eventHandlers={{
                click: () => {
                  // POI popup handled inline
                },
              }}
            >
              <Popup>
                <div className="bg-linear-card border border-linear-border rounded-xl p-2 text-[10px] min-w-[150px]">
                  <div className="font-bold text-white truncate">{poi.name}</div>
                  <div className="text-linear-text-muted capitalize">{poi.category}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Property markers */}
        {layers.properties && filteredProperties.map(p => {
          const status = getStatus(p.id);
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createPropertyIcon(p.alpha_score, status, alphaColorMode)}
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

        {/* FE-275: Choropleth + POI Overlays */}
        <div className="bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-2 space-y-1.5 shadow-2xl">
          <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest px-1 mb-0.5">Overlays</div>
          {/* Choropleth modes */}
          <div className="space-y-1">
            {(['income', 'density', 'crime'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setChoroplethMode(m => m === mode ? null : mode)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  choroplethMode === mode
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-linear-text-muted hover:text-white border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-sm`} style={{
                  background: mode === 'income' ? '#3b82f6' : mode === 'density' ? '#f97316' : '#ef4444',
                }} />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <div className="border-t border-linear-border/40 pt-1 space-y-0.5">
            <div className="text-[8px] font-black text-linear-text-muted/60 uppercase tracking-widest px-1">Amenities</div>
            {Object.entries(POI_COLORS).map(([cat, color]) => (
              <button
                key={cat}
                onClick={() => setPoiCategoryFilter(s => {
                  const next = new Set(s);
                  if (next.has(cat)) next.delete(cat); else next.add(cat);
                  return next;
                })}
                className={`flex items-center gap-2 w-full px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  poiCategoryFilter.has(cat)
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-linear-text-muted/40 hover:text-white border border-transparent'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="capitalize">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FE-251: Alpha Colour toggle */}
        <div className="bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-2 shadow-2xl">
          <button
            onClick={() => setAlphaColorMode(m => !m)}
            title="Colour markers by Alpha Score"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all w-full ${
              alphaColorMode
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-linear-text-muted hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Palette size={12} />
              <span>Alpha Colour</span>
              {/* Colour dot indicator */}
              <span className="flex items-center gap-0.5 ml-0.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              </span>
            </div>
          </button>
        </div>

        {/* Filter toggle */}
        <div className="bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-2 shadow-2xl">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              isFilterOpen ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-linear-text-muted hover:text-white border border-transparent'
            }`}
          >
            <Filter size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[7px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
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

      {/* FE-275: Choropleth Legend — bottom-left, shows when overlay is active */}
      {choroplethMode && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-linear-card/95 backdrop-blur-md border border-linear-border rounded-xl p-3 shadow-2xl">
          <div className="text-[8px] font-black text-linear-text-muted uppercase tracking-widest mb-2">
            {choroplethMode === 'income' ? 'Income' : choroplethMode === 'density' ? 'Density' : 'Crime Rate'}
          </div>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(i => {
              const t = i / 4;
              return (
                <div key={i} className="w-6 h-4 rounded-sm" style={{ background: getChoroplethColor(choroplethMode, t) }} />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[8px] text-linear-text-muted">
            {choroplethMode === 'income' ? (
              <><span>Low</span><span>High</span></>
            ) : choroplethMode === 'density' ? (
              <><span>Low</span><span>High</span></>
            ) : (
              <><span>Safe</span><span>High</span></>
            )}
          </div>
        </div>
      )}

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
            {/* FE-252: Multi-select status filter — checkbox-style chips */}
            <div>
              <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1.5">Status</div>
              <div className="flex flex-wrap gap-1">
                {/* 'All' chip — clears the set (resets to 'all' behaviour) */}
                <button
                  key="all"
                  onClick={() => setStatusFilter(new Set())}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    statusFilter.size === 0
                      ? 'bg-linear-bg text-white border border-blue-500/30 ring-1 ring-blue-500/20'
                      : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
                  }`}
                >
                  All
                </button>
                {/* Per-status chips — toggle membership in the set */}
                {(['discovered', 'shortlisted', 'vetted', 'archived'] as const).map(s => {
                  const isActive = statusFilter.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(prev => {
                          const next = new Set(prev);
                          if (next.has(s)) {
                            next.delete(s);
                          } else {
                            next.add(s);
                          }
                          return next;
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                        isActive
                          ? s === 'archived' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 ring-1 ring-rose-500/20'
                            : s === 'vetted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ring-1 ring-emerald-500/20'
                            : s === 'shortlisted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 ring-1 ring-blue-500/20'
                            : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 ring-1 ring-zinc-500/20'
                          : 'bg-linear-bg text-linear-text-muted border border-linear-border hover:text-white'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center transition-colors ${
                        isActive ? 'bg-blue-500 border-blue-500' : 'border-linear-border bg-transparent'
                      }`}>
                        {isActive && (
                          <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                            <path d="M1 3L2.5 4.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {s}
                    </button>
                  );
                })}
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
            {/* Market Status Filter */}
            <div>
              <div className="text-[9px] font-bold text-linear-text-muted uppercase tracking-widest mb-1.5">Market</div>
              <select
                value={marketStatusFilter}
                onChange={e => setMarketStatusFilter(e.target.value as MarketStatus | 'all')}
                className="w-full bg-linear-bg border border-linear-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">All Active</option>
                <option value="active">Active</option>
                <option value="under_offer">Under Offer</option>
                <option value="sold_stc">Sold STC</option>
                <option value="sold_completed">Sold</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-3 pt-3 border-t border-linear-border flex items-center justify-between">
            <span className="text-[9px] text-linear-text-muted">
              Showing <span className="font-bold text-white">{filteredProperties.length}</span> of <span className="font-bold text-white">{properties.length}</span> properties
            </span>
            <button
              onClick={() => { setAreaFilter('All Areas'); setAlphaThreshold(0); setStatusFilter(new Set()); setMarketStatusFilter('all'); }}
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
                {/* FE-253: View Property — navigate to full detail page */}
                <button
                  onClick={() => navigate(`/property/${selectedProperty.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all"
                >
                  <span>View Property</span>
                  <ArrowRight size={12} />
                </button>
              </div>
              {/* Property Details */}
              <div className="space-y-1.5">
                {[
                  ['EPC', selectedProperty.epc],
                  ['Tenure', selectedProperty.tenure],
                  ['DOM', `${selectedProperty.dom ?? 0}d`],
                  ['Service Charge', selectedProperty.service_charge != null ? `£${selectedProperty.service_charge.toLocaleString()}/yr` : 'N/A'],
                  ['Ground Rent', selectedProperty.ground_rent != null ? `£${selectedProperty.ground_rent.toLocaleString()}/yr` : 'N/A'],
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
