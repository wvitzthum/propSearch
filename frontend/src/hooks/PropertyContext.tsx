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
  // updateFiltersWithoutFetch — update sort state without triggering a re-fetch of properties
  updateFiltersWithoutFetch: (newFilters: Partial<PropertyFilters>) => void;
  refreshProperties: () => Promise<void>;
  // FE-181: Bridge to usePipeline so archived filter works via client-side pipeline state
  registerPipeline: (getStatus: (id: string) => PropertyStatus) => void;
  // FE-222: Bridge to usePipeline — hydrate pipeline state from API response after fetch
  registerHydrate: (fn: (props: Array<{ id: string; pipeline_status?: string }>) => void) => void;
  // FE-231: Trigger a re-check of a property — POST /api/properties/:id/check
  recheckProperty: (id: string) => Promise<void>;
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
  'Pimlico (SW1)': [51.4893, -0.1400],
  'Bermondsey (SE1)': [51.5016, -0.0711],
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
  // FE-222: Bridge to usePipeline — hydrate function to push API data into pipeline state
  const pipelineHydrateRef = useRef<((props: Array<{ id: string; pipeline_status?: string }>) => void) | null>(null);

  const registerPipeline = useCallback((getStatus: (id: string) => PropertyStatus) => {
    pipelineGetStatusRef.current = getStatus;
  }, []);

  // FE-222: Register the hydrate function from usePipeline
  const registerHydrate = useCallback((fn: (props: Array<{ id: string; pipeline_status?: string }>) => void) => {
    pipelineHydrateRef.current = fn;
  }, []);

  const [filters, setFilters] = useState<PropertyFilters>({
    limit: 300,
    offset: 0,
    sortBy: 'alpha_score',
    sortOrder: 'DESC'
  });

  // DE-241: Update filters without triggering a fetch. Used by PropertiesPage URL init
  // to sync sort params from URL without racing with the initial fetch.
  const updateFiltersWithoutFetch = useCallback((newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

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
        // BUG-006: No silent defaults for financial fields. service_charge and ground_rent
        // must remain undefined if not sourced — fabrication violates DATA_GUARDRAILS.md Rule 1.
        // Display layer handles undefined gracefully (shows "N/A" or "—").
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
          // service_charge and ground_rent passed through as-is (may be undefined)
          lat: lat + (Math.random() - 0.5) * 0.01,
          lng: lng + (Math.random() - 0.5) * 0.01,
        } as PropertyWithCoords;
      });

      // FE-222: Hydrate pipeline state from API response so server-side statuses
      // are available to usePipeline before any user interaction occurs.
      if (!IS_DEMO && pipelineHydrateRef.current) {
        pipelineHydrateRef.current(data);
      }

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

  // FE-231: Re-check a property — POST /api/properties/:id/check updates last_checked in DB
  const recheckProperty = useCallback(async (id: string) => {
    if (IS_DEMO) return; // No API in demo mode
    try {
      const res = await fetch(`/api/properties/${id}/check`, { method: 'POST' });
      if (!res.ok) throw new Error('Recheck failed');
      const today = new Date().toISOString().split('T')[0];
      // Optimistically update the property's last_checked in local state
      setProperties(prev => prev.map(p =>
        p.id === id ? { ...p, last_checked: today } : p
      ));
    } catch {
      // Re-fetch on failure to get server truth
      await fetchProperties(filters);
    }
  }, [filters, fetchProperties]);

  return (
    <PropertyContext.Provider value={{
      properties,
      loading,
      error,
      filters,
      updateFilters,
      updateFiltersWithoutFetch,
      refreshProperties,
      registerPipeline,
      registerHydrate,
      recheckProperty,
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
