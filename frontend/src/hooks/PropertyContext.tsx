import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { PropertyWithCoords, Property } from '../types/property';

interface PropertyContextType {
  properties: PropertyWithCoords[];
  loading: boolean;
  error: string | null;
  refreshProperties: () => Promise<void>;
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

const API_BASE = 'http://localhost:3001/api';

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<PropertyWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/properties`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'API Unavailable' }));
        throw new Error(errorData.error || 'Failed to fetch properties');
      }
      const data: Property[] = await res.json();

      const propertiesWithCoords = data.map(p => {
        const areaName = p.area.includes('Islington') ? 'Islington (N1)' : p.area;
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
      console.error('Property loading error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <PropertyContext.Provider value={{ properties, loading, error, refreshProperties: fetchProperties }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};
