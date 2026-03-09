import { useState, useEffect } from 'react';
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

export const useProperties = () => {
  const [properties, setProperties] = useState<PropertyWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Fetching properties from DuckDB API...');
    fetch('/api/properties')
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data: Property[]) => {
        console.log('Properties loaded from DB:', data.length);
        
        const propertiesWithCoords = data.map(p => {
          const coords = AREA_COORDS[p.area] || AREA_COORDS['Islington (N1)'];
          const [lat, lng] = coords;
          return {
            ...p,
            lat: lat + (Math.random() - 0.5) * 0.01,
            lng: lng + (Math.random() - 0.5) * 0.01,
          } as PropertyWithCoords;
        });
        
        setProperties(propertiesWithCoords);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Data loading error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { properties, loading, error };
};
