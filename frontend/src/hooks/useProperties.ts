import { useState, useEffect, useCallback } from 'react';
import type { Property, PropertyWithCoords } from '../types/property';

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

export interface PropertyFilters {
  area?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  is_value_buy?: boolean;
  vetted?: boolean;
}

export const useProperties = (initialFilters: PropertyFilters = {}) => {
  const [properties, setProperties] = useState<PropertyWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);

  const fetchProperties = useCallback(async (currentFilters: PropertyFilters) => {
    try {
      setLoading(true);
      console.log('Fetching properties from SQLite API (Server-side optimized)...');
      
      const params = new URLSearchParams();
      if (currentFilters.area && currentFilters.area !== 'All Areas') params.set('area', currentFilters.area);
      if (currentFilters.limit) params.set('limit', currentFilters.limit.toString());
      if (currentFilters.offset) params.set('offset', currentFilters.offset.toString());
      if (currentFilters.sortBy) params.set('sortBy', currentFilters.sortBy);
      if (currentFilters.sortOrder) params.set('sortOrder', currentFilters.sortOrder);
      if (currentFilters.is_value_buy) params.set('is_value_buy', 'true');
      if (currentFilters.vetted) params.set('vetted', 'true');

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
      
      const data: Property[] = await res.json();
      console.log('Properties loaded from DB:', data.length);
      
      const propertiesWithCoords = data.map(p => {
        const areaName = p.area?.includes('Islington') ? 'Islington (N1)' : (p.area ?? '');
        const coords = AREA_COORDS[areaName] || AREA_COORDS['Islington (N1)'];
        const [lat, lng] = coords;
        return {
          ...p,
          lat: lat + (Math.random() - 0.5) * 0.01,
          lng: lng + (Math.random() - 0.5) * 0.01,
        } as PropertyWithCoords;
      });
      
      setProperties(propertiesWithCoords);
      setError(null);
    } catch (err: any) {
      console.error('Data loading error:', err);
      setError(err.message);
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

  return { properties, loading, error, filters, updateFilters, refresh: () => fetchProperties(filters) };
};
