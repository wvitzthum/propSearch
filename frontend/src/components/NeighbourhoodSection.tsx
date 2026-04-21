/**
 * NeighbourhoodSection.tsx — FE-277
 * Shows nearest amenities, walkability score, and mini-map for a property's neighbourhood.
 * Falls back to skeleton loader if POI data is not yet available (FE-276 pending).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Train, ShoppingCart, GraduationCap, Dumbbell, Coffee, Trees, AlertTriangle } from 'lucide-react';
import {
  computeNearbyAmenities,
  distanceToWalkingLabel,
  walkabilityLabel,
  walkabilityColor,
  type POICategory,
} from '../utils/nearbyAmenities';

interface Props {
  lat: number;
  lng: number;
  address: string;
  crimeRate?: number | null; // crimes per 1,000 residents
}

const CATEGORY_META: Array<{
  category: POICategory;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  iconClass: string;
  badgeClass: string;
}> = [
  { category: 'transport', label: 'Transport', icon: Train, iconClass: 'text-blue-400', badgeClass: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  { category: 'supermarket', label: 'Supermarkets', icon: ShoppingCart, iconClass: 'text-emerald-400', badgeClass: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  { category: 'school', label: 'Schools', icon: GraduationCap, iconClass: 'text-violet-400', badgeClass: 'bg-violet-500/20 border-violet-500/30 text-violet-400' },
  { category: 'gym', label: 'Gyms', icon: Dumbbell, iconClass: 'text-rose-400', badgeClass: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
  { category: 'cafe', label: 'Cafes', icon: Coffee, iconClass: 'text-amber-400', badgeClass: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  { category: 'park', label: 'Parks', icon: Trees, iconClass: 'text-retro-green', badgeClass: 'bg-retro-green/20 border-retro-green/30 text-retro-green' },
];

export const POI_LOADING_ERROR = 'poi_load_error';

// Mini-map using a static map image approach (no Leaflet dependency in this component)
// Falls back gracefully — map is non-critical
function MiniMapPlaceholder({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const navigate = useNavigate();
  // OpenStreetMap tile coordinates from lat/lng
  const zoom = 15;
  const tileX = Math.floor((lng + 180) / 360 * 2 ** zoom);
  const tileY = Math.floor((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * 2 ** zoom);
  const imgUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <div className="relative h-[150px] rounded-xl overflow-hidden bg-linear-bg border border-linear-border">
      <img
        src={imgUrl}
        alt={`Map around ${address}`}
        className="w-full h-full object-cover opacity-70"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      {/* Pulsing blue dot for property */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
          <div className="relative w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-lg" />
        </div>
      </div>
      {/* View on Map button */}
      <button
        onClick={() => navigate(`/map?lat=${lat}&lng=${lng}&zoom=${zoom}`)}
        className="absolute bottom-2 right-2 px-2 py-1 text-[8px] font-black uppercase bg-linear-card/80 border border-white/20 text-white hover:bg-linear-card transition-colors rounded-md"
      >
        View on Map →
      </button>
    </div>
  );
}

const SkeletonLoader: React.FC = () => (
  <div className="bg-linear-card border border-linear-border rounded-2xl p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-16 h-16 rounded-full bg-linear-bg" />
      <div>
        <div className="h-4 w-40 bg-linear-bg rounded mb-2" />
        <div className="h-3 w-24 bg-linear-bg rounded" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-20 bg-linear-bg rounded-xl" />
      ))}
    </div>
  </div>
);

const CrimeRateBadge: React.FC<{ rate: number }> = ({ rate }) => {
  const colorClass = rate < 50 ? 'text-retro-green border-retro-green/30 bg-retro-green/10'
    : rate < 80 ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
    : 'text-rose-400 border-rose-400/30 bg-rose-400/10';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black ${colorClass}`}>
      <AlertTriangle size={9} />
      {rate.toFixed(0)} crimes/1k
    </div>
  );
};

const AmenityCard: React.FC<{
  meta: typeof CATEGORY_META[0];
  nearest: { name: string; distanceM: number } | null;
  count: number;
}> = ({ meta, nearest, count }) => {
  const Icon = meta.icon;
  const extraCount = Math.max(0, count - (nearest ? 1 : 0));

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border bg-linear-bg ${meta.badgeClass.replace('text-', 'bg-').replace('/20', '/5')}`}
      style={{ borderColor: meta.badgeClass.match(/border-(\w+-\d+\/\d+)/)?.[1] ?? 'white/10' }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className={meta.iconClass} />
        <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{meta.label}</span>
      </div>
      <div className="text-[11px] font-bold text-white leading-tight">
        {nearest ? (
          <>
            {distanceToWalkingLabel(nearest.distanceM)}
          </>
        ) : (
          <span className="text-linear-text-muted/50">No nearby</span>
        )}
      </div>
      <div className="text-[9px] text-linear-text-muted">
        {nearest ? (
          <span className="truncate max-w-[80px] block">{nearest.name}</span>
        ) : extraCount > 0 ? (
          <span>+{extraCount} in area</span>
        ) : null}
      </div>
      {extraCount > 0 && nearest && (
        <div className="text-[8px] font-bold text-linear-text-muted/60">+{extraCount} more</div>
      )}
    </div>
  );
};

const CircularScore: React.FC<{ score: number }> = ({ score }) => {
  const label = walkabilityLabel(score);
  const colorKey = walkabilityColor(score);
  const colors = { green: '#22c55e', amber: '#f59e0b', red: '#f43f5e' };
  const color = colors[colorKey];
  const circumference = 2 * Math.PI * 24; // r=24
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 56 56" className="-rotate-90 w-16 h-16">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#1e293b" strokeWidth="4" />
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[16px] font-black text-white tabular-nums">{score}</span>
        </div>
      </div>
      <span className="text-[8px] font-bold text-center leading-tight px-1" style={{ color }}>
        {label}
      </span>
    </div>
  );
};

const NeighbourhoodSection: React.FC<Props> = ({ lat, lng, address, crimeRate }) => {
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<Awaited<ReturnType<typeof computeNearbyAmenities>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingState('loading');
    setResult(null);

    computeNearbyAmenities(lat, lng)
      .then(data => {
        if (!cancelled) {
          setResult(data);
          setLoadingState('success');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingState('error');
      });

    return () => { cancelled = true; };
  }, [lat, lng]);

  if (loadingState === 'loading' && !result) {
    return <SkeletonLoader />;
  }

  const walkScore = result?.walkabilityScore ?? 0;

  return (
    <div className="bg-linear-card border border-linear-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-blue-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Neighbourhood</span>
        </div>
        <CircularScore score={walkScore} />
        {crimeRate != null && <CrimeRateBadge rate={crimeRate} />}
      </div>

      {/* Amenity grid — 3 cols × 2 rows */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {CATEGORY_META.map(meta => {
          const nearest = result?.nearestByCategory[meta.category] ?? null;
          const count = result?.countsByCategory[meta.category] ?? 0;
          return (
            <AmenityCard key={meta.category} meta={meta} nearest={nearest} count={count} />
          );
        })}
      </div>

      {/* POI loading error fallback */}
      {loadingState === 'error' && (
        <div className="text-[9px] text-linear-text-muted/60 italic mb-2 flex items-center gap-1">
          <AlertTriangle size={9} />
          Amenity data unavailable — POI layer pending
        </div>
      )}

      {/* Mini-map */}
      <MiniMapPlaceholder lat={lat} lng={lng} address={address} />
    </div>
  );
};

export default NeighbourhoodSection;
