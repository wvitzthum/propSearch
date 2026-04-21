/**
 * nearbyAmenities.ts — FE-277
 * Haversine distance computation and POI analysis for NeighbourhoodSection.
 * POI data is loaded lazily and cached at module level.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type POICategory = 'transport' | 'supermarket' | 'school' | 'gym' | 'cafe' | 'park';

export interface POIRecord {
  id: string;
  lat: number;
  lng: number;
  category: POICategory;
  name: string;
}

export interface NearbyAmenityResult {
  nearestByCategory: Partial<Record<POICategory, { name: string; distanceM: number }>>;
  countsByCategory: Partial<Record<POICategory, number>>;
  walkabilityScore: number; // 0-100
}

// ─── Haversine distance (metres) ─────────────────────────────────────────────

const EARTH_RADIUS_M = 6371000;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}

// ─── POI cache (loaded once, reused across all calls) ────────────────────────

let cachedPois: POIRecord[] | null = null;
let poisLoadError = false;

async function loadPois(): Promise<POIRecord[]> {
  if (cachedPois !== null) return cachedPois;
  if (poisLoadError) return [];

  try {
    const resp = await fetch('/data/london_pois.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as { pois?: POIRecord[]; features?: Array<{ properties: POIRecord; geometry: { coordinates: [number, number] } }> };

    // Support GeoJSON Feature format or flat array
    if (Array.isArray(data.pois)) {
      cachedPois = data.pois;
    } else if (Array.isArray(data.features)) {
      cachedPois = data.features.map((f) => ({
        ...f.properties,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
    } else if (Array.isArray(data)) {
      cachedPois = data as POIRecord[];
    } else {
      throw new Error('Unknown POI data format');
    }
  } catch (e) {
    console.warn('[nearbyAmenities] Could not load POI data:', e);
    poisLoadError = true;
    cachedPois = [];
  }
  return cachedPois ?? [];
}

// ─── Walkability score ────────────────────────────────────────────────────────
// Weighted count of amenities within 800m radius
// Weights: transport(×3), supermarket(×2), school(×2), gym(×1.5), cafe(×1), park(×1)
const WALKABILITY_WEIGHTS: Partial<Record<POICategory, number>> = {
  transport: 3,
  supermarket: 2,
  school: 2,
  gym: 1.5,
  cafe: 1,
  park: 1,
};

function computeWalkabilityScore(pois: POIRecord[], lat: number, lng: number): number {
  const radius = 800;
  const nearby = pois.filter(p => haversineDistance(lat, lng, p.lat, p.lng) <= radius);
  const rawScore = nearby.reduce((sum, p) => sum + (WALKABILITY_WEIGHTS[p.category] ?? 1), 0);
  // Normalise to 0-100 (empirical max ≈ 40 weighted points → scale to 100)
  return Math.min(100, Math.round((rawScore / 40) * 100));
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function computeNearbyAmenities(
  lat: number,
  lng: number,
  radiusMeters = 800
): Promise<NearbyAmenityResult> {
  const pois = await loadPois();

  const categories: POICategory[] = ['transport', 'supermarket', 'school', 'gym', 'cafe', 'park'];

  const nearestByCategory: Partial<Record<POICategory, { name: string; distanceM: number }>> = {};
  const countsByCategory: Partial<Record<POICategory, number>> = {};

  for (const cat of categories) {
    const catPois = pois.filter(p => p.category === cat);
    
    // Efficient nearest: pre-filter to radiusM*2 to avoid computing Haversine on all POIs
    const candidates = catPois.filter(p => haversineDistance(lat, lng, p.lat, p.lng) <= radiusMeters * 2);
    
    // Exact Haversine to find nearest
    let nearest: POIRecord | null = null;
    let nearestDist = Infinity;
    for (const p of candidates) {
      const d = haversineDistance(lat, lng, p.lat, p.lng);
      if (d <= radiusMeters && d < nearestDist) {
        nearest = p;
        nearestDist = d;
      }
    }
    
    if (nearest) {
      nearestByCategory[cat] = { name: nearest.name, distanceM: Math.round(nearestDist) };
    }

    // Count all within radius
    const withinRadius = catPois.filter(p => haversineDistance(lat, lng, p.lat, p.lng) <= radiusMeters);
    countsByCategory[cat] = withinRadius.length;
  }

  const walkabilityScore = computeWalkabilityScore(pois, lat, lng);

  return { nearestByCategory, countsByCategory, walkabilityScore };
}

// ─── Walking time labels ─────────────────────────────────────────────────────

export function distanceToWalkingLabel(distanceM: number): string {
  if (distanceM < 300) return '1 min walk';
  if (distanceM < 600) return '3 min walk';
  if (distanceM < 1000) return '7 min walk';
  if (distanceM < 1500) return '12 min walk';
  return '> 15 min walk';
}

// ─── Walkability label bands ─────────────────────────────────────────────────

export function walkabilityLabel(score: number): string {
  if (score >= 75) return "Walker's Neighbourhood";
  if (score >= 45) return "Commuter's Neighbourhood";
  return "Car-Dependent";
}

export function walkabilityColor(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) return 'green';
  if (score >= 45) return 'amber';
  return 'red';
}
