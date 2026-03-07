import { useState, useEffect } from 'react';
import type { Property } from '../types/property';

export interface PropertyWithCoords extends Property {
  lat: number;
  lng: number;
}

const AREA_COORDS: Record<string, [number, number]> = {
  'Islington (N1)': [51.5465, -0.1034],
  'Islington (N7)': [51.5540, -0.1150],
  'Bayswater (W2)': [51.5123, -0.1877],
  'Belsize Park (NW3)': [51.5471, -0.1652],
  'West Hampstead (NW6)': [51.5477, -0.1901],
};

export const useProperties = () => {
  const [properties, setProperties] = useState<PropertyWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Fetching master.json...');
    fetch('/data/master.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch master registry: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data: Property[]) => {
        console.log('Master registry loaded:', data.length, 'properties');
        
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
