import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { PropertyWithCoords, Property } from '../types/property';
import type { PropertyStatus } from './usePipeline';

export interface PropertyFilters {
  area?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  is_value_buy?: boolean;
  vetted?: boolean;
  archived?: boolean;
  // ADR-017: Dual-axis filtering — pipeline (user) and market (analyst)
  pipeline_status?: PropertyStatus;
  market_status?: string;
}

interface PropertyContextType {
  properties: PropertyWithCoords[];
  loading: boolean;
  error: string | null;
  filters: PropertyFilters;
  updateFilters: (newFilters: Partial<PropertyFilters>) => void;
  refreshProperties: () => Promise<void>;
  // FE-181: Bridge to usePipeline so archived filter works via client-side pipeline state
  registerPipeline: (getStatus: (id: string) => PropertyStatus) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

const AREA_COORDS: Record<string, [number, number]> = {
  'Islington (N1)': [51.5465, -0.1034],
  'Islington (N7)': [51.5540, -0.1150],
  'Bayswater (W2)': [51.5123, -0.1877],
  'Belsize Park (NW3)': [51.5471, -0.1652],
  'West Hampstead (NW6)': [51.5477, -0.1901],
  'Chelsea (SW3/SW10)': [51.4884, -0.1728],
  'Chelsea (SW3)': [51.4912, -0.1634],
  'Chelsea (SW10)': [51.4856, -0.1823],
  'Primrose Hill (NW1)': [51.5410, -0.1550],
};

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const API_BASE = IS_DEMO ? '/data' : '/api';

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<PropertyWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // FE-181: Bridge to usePipeline — stored as a ref so PropertyContext can filter
  // by pipeline status without creating a circular import dependency.
  const pipelineGetStatusRef = useRef<((id: string) => PropertyStatus) | null>(null);

  const registerPipeline = useCallback((getStatus: (id: string) => PropertyStatus) => {
    pipelineGetStatusRef.current = getStatus;
  }, []);

  const [filters, setFilters] = useState<PropertyFilters>({
    limit: 100,
    offset: 0,
    sortBy: 'alpha_score',
    sortOrder: 'DESC'
  });

  const fetchProperties = useCallback(async (currentFilters: PropertyFilters) => {
    try {
      let url = `${API_BASE}/properties`;
      const params = new URLSearchParams();
      
      if (IS_DEMO) {
        url = `${API_BASE}/demo_master.json`;
      } else {
        if (currentFilters.area && currentFilters.area !== 'All Areas') params.set('area', currentFilters.area);
        if (currentFilters.limit) params.set('limit', currentFilters.limit.toString());
        if (currentFilters.offset) params.set('offset', currentFilters.offset.toString());
        if (currentFilters.sortBy) params.set('sortBy', currentFilters.sortBy);
        if (currentFilters.sortOrder) params.set('sortOrder', currentFilters.sortOrder);
        if (currentFilters.is_value_buy) params.set('is_value_buy', 'true');
        if (currentFilters.vetted) params.set('vetted', 'true');
        // Always fetch all records (active + archived) — frontend filters by pipeline status client-side
        params.set('archived', 'true');
        if (params.toString()) url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'API Unavailable' }));
        throw new Error(errorData.error || 'Failed to fetch properties');
      }
      const data: Property[] = await res.json();

      let finalData = data;
      
      // Client-side filtering for demo mode
      if (IS_DEMO) {
        if (currentFilters.area && currentFilters.area !== 'All Areas') {
          finalData = finalData.filter(p => p.area?.includes(currentFilters.area!) ?? false);
        }
        if (currentFilters.is_value_buy) {
          finalData = finalData.filter(p => p.is_value_buy);
        }
        if (currentFilters.vetted) {
          finalData = finalData.filter(p => p.vetted);
        }
      }

      // FE-181: archived filter — pipeline status is client-side only; bridge via registerPipeline
      if (currentFilters.archived && pipelineGetStatusRef.current) {
        finalData = finalData.filter(p => pipelineGetStatusRef.current!(p.id) === 'archived');
      }

      const propertiesWithCoords = finalData.map(p => {
        const areaName = p.area?.includes('Islington') ? 'Islington (N1)' : (p.area ?? '');
        const coords = AREA_COORDS[areaName] || AREA_COORDS['Islington (N1)'];
        const [lat, lng] = coords;
        // FE-181: Ensure metadata exists with defaults so PropertyTable doesn't crash on is_new
        const metadata = p.metadata ?? {
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          discovery_count: 1,
          is_new: true, // newly-imported demo properties are "new" by default
        };
        // FE-181: Normalize all optional fields to prevent .map() crashes on demo data
        // Demo data often lacks gallery, image_url, link, streetview_url, floorplan_url
        const links = Array.isArray(p.links) ? p.links : (p.link ? [p.link] : []);
        return {
          ...p,
          // Normalize missing fields to safe defaults
          metadata,
          links,
          gallery: Array.isArray(p.gallery) ? p.gallery : [],
          image_url: p.image_url || '',
          link: p.link || links[0] || '',
          streetview_url: p.streetview_url || '',
          floorplan_url: p.floorplan_url || '',
          lat: lat + (Math.random() - 0.5) * 0.01,
          lng: lng + (Math.random() - 0.5) * 0.01,
        } as PropertyWithCoords;
      });

      setProperties(propertiesWithCoords);
      setError(null);
    } catch (err: unknown) {
      console.error('Property loading error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(filters);
  }, [filters, fetchProperties]);

  const updateFilters = useCallback((newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshProperties = useCallback(() => fetchProperties(filters), [filters, fetchProperties]);

  return (
    <PropertyContext.Provider value={{
      properties,
      loading,
      error,
      filters,
      updateFilters,
      refreshProperties,
      registerPipeline
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};
