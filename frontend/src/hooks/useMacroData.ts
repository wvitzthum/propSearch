import { useState, useEffect } from 'react';
import type { MacroTrend } from '../types/macro';

export const useMacroData = () => {
  const [data, setData] = useState<MacroTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/macro_trend.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch macro data: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((macroData: MacroTrend) => {
        setData(macroData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Macro data loading error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
};
