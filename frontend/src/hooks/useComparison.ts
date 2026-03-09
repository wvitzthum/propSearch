import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'propsearch_comparison_basket';

export const useComparison = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  const toggleComparison = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) {
        // Limit to 4 for high-density matrix readability
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const clearComparison = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isInComparison = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  return {
    selectedIds,
    toggleComparison,
    clearComparison,
    isInComparison,
    count: selectedIds.length
  };
};
