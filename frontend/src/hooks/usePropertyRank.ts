/**
 * usePropertyRank.ts — UX-034 Pattern A
 * Manages user-defined priority ranking for properties.
 * Persists to localStorage as primary store; syncs to SQLite backend via PATCH rank API.
 * 
 * Rank is scoped to pipeline status: each status group can have its own ranking.
 * Ranks are integers where 1 = highest priority within that pipeline group.
 */

import { useState, useEffect, useCallback } from 'react';

const RANK_STORAGE_KEY = 'propsearch_property_ranks';

// Debounce map for rank sync calls
const rankDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function debounceRank(propertyId: string, fn: () => void, delay = 300) {
  if (rankDebounceTimers[propertyId]) clearTimeout(rankDebounceTimers[propertyId]);
  rankDebounceTimers[propertyId] = setTimeout(() => {
    delete rankDebounceTimers[propertyId];
    fn();
  }, delay);
}

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 z-[9999] px-4 py-3 bg-blue-500/90 text-white text-xs font-bold rounded-xl shadow-2xl border border-blue-400/30 flex items-center gap-2 max-w-sm';
  toast.innerHTML = `<span>📋</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export const usePropertyRank = () => {
  const [ranks, setRanks] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(RANK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(ranks));
  }, [ranks]);

  /**
   * Set the rank for a property (1 = highest priority).
   * Calling setRank(id, rank) where rank is null/undefined removes the rank.
   */
  const setRank = useCallback((id: string, rank: number | null) => {
    if (rank === null || rank === undefined) {
      setRanks(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // Sync removal to backend
      debounceRank(id, () => {
        fetch(`/api/properties/${id}/rank`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rank: null }),
        }).catch(() => {/* silent fail for rank removal */});
      }, 300);
      return;
    }

    // Optimistic local update
    setRanks(prev => ({ ...prev, [id]: rank }));

    // Sync to backend (debounced)
    debounceRank(id, () => {
      fetch(`/api/properties/${id}/rank`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rank }),
      }).catch(() => showToast(`Rank save failed for property`));
    }, 300);
  }, []);

  /**
   * Get the rank for a property. Returns undefined if not ranked.
   */
  const getRank = useCallback((id: string): number | undefined => {
    return ranks[id];
  }, [ranks]);

  /**
   * Move a property to a new rank position, shifting others.
   * When reordering within a pipeline status group, insert at position.
   */
  const reorderRank = useCallback((propertyId: string, newRank: number) => {
    setRanks(prev => {
      const next = { ...prev };
      // Find all properties currently ranked
      const rankedIds = Object.entries(next)
        .sort(([, a], [, b]) => a - b)
        .map(([id]) => id);

      if (rankedIds.includes(propertyId)) {
        // Reorder existing ranked item — remove it first, then insert at new position
        const others = rankedIds.filter(id => id !== propertyId);
        const insertIdx = Math.min(newRank - 1, others.length);
        const updated = [...others.slice(0, insertIdx), propertyId, ...others.slice(insertIdx)];
        updated.forEach((id, idx) => { next[id] = idx + 1; });
      } else {
        // New item being ranked for the first time — assign rank and shift existing ranks
        const insertRank = Math.max(1, newRank);
        // Shift any items at or after insertRank
        for (const [id, r] of Object.entries(next)) {
          if (r >= insertRank) next[id] = r + 1;
        }
        next[propertyId] = insertRank;
      }
      return next;
    });
  }, []);

  /**
   * Remove rank for a property.
   */
  const removeRank = useCallback((id: string) => {
    setRanks(prev => {
      const next = { ...prev };
      const removedRank = next[id];
      delete next[id];
      // Shift ranks above the removed rank down by 1
      if (removedRank !== undefined) {
        for (const [propId, r] of Object.entries(next)) {
          if (r > removedRank) next[propId] = r - 1;
        }
      }
      return next;
    });
    debounceRank(id, () => {
      fetch(`/api/properties/${id}/rank`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rank: null }),
      }).catch(() => {/* silent fail */});
    }, 300);
  }, []);

  /**
   * Hydrate ranks from API response — server-side ranks overwrite localStorage
   * only if the property has no local rank (preserves user-set values).
   */
  const hydrateFromProperties = useCallback((properties: Array<{ id: string; property_rank?: number | null }>) => {
    setRanks(prev => {
      const next = { ...prev };
      let changed = false;
      for (const prop of properties) {
        if (prop.property_rank !== null && prop.property_rank !== undefined) {
          if (!next[prop.id]) {
            next[prop.id] = prop.property_rank;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, []);

  /**
   * Sort an array of properties by user-defined rank.
   * Unranked properties appear at the end.
   */
  const sortByRank = useCallback(<T extends { id: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const rankA = ranks[a.id];
      const rankB = ranks[b.id];
      if (rankA === undefined && rankB === undefined) return 0;
      if (rankA === undefined) return 1;
      if (rankB === undefined) return -1;
      return rankA - rankB;
    });
  }, [ranks]);

  return { ranks, setRank, getRank, reorderRank, removeRank, hydrateFromProperties, sortByRank };
};
