import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

interface LocationNodeMapProps {
  lat: number;
  lng: number;
  address: string;
}

const miniMarkerIcon = L.divIcon({
  className: 'mini-property-marker',
  html: `<div class="relative flex items-center justify-center">
           <div class="absolute inset-0 rounded-full blur-[4px] opacity-60 bg-linear-accent"></div>
           <div class="relative w-2.5 h-2.5 rounded-full border border-white bg-linear-accent shadow-lg"></div>
         </div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const LocationNodeMap: React.FC<LocationNodeMapProps> = ({ lat, lng, address }) => {
  return (
    <div className="h-48 w-full bg-linear-card border border-linear-border rounded-2xl overflow-hidden relative group">
      <MapContainer 
        center={[lat, lng]} 
        zoom={14} 
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        style={{ height: '100%', width: '100%', filter: 'grayscale(0.5) contrast(1.2) brightness(0.8)' }}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[lat, lng]} icon={miniMarkerIcon} />
      </MapContainer>
      
      <div className="absolute inset-0 bg-gradient-to-t from-linear-bg/80 via-transparent to-transparent pointer-events-none" />
      
      <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-linear-accent uppercase tracking-[0.2em]">Spatial Context</span>
          <span className="text-[10px] font-bold text-white truncate max-w-[180px]">{address}</span>
        </div>
        <div className="px-2 py-1 bg-black/40 backdrop-blur-md rounded border border-white/10 text-[8px] font-mono text-white uppercase">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
};

export default LocationNodeMap;
