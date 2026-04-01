import { useState, useCallback, useEffect } from 'react';

export type ThesisTag = 
  | 'moat-play'
  | 'yield-hunt'
  | 'value-add'
  | 'turnkey'
  | 'off-market'
  | 'development-potential'
  | 'cashflow-play'
  | 'legacy-hold'
  | 'distressed'
  | 'neglected-gem';

export const THESIS_TAG_CONFIG: Record<ThesisTag, { label: string; color: string; description: string }> = {
  'moat-play': { 
    label: 'Moat Play', 
    color: '#3b82f6',
    description: 'Long-term hold with sustainable competitive advantages'
  },
  'yield-hunt': { 
    label: 'Yield Hunt', 
    color: '#10b981',
    description: 'Primary focus on rental yield and cash-on-cash returns'
  },
  'value-add': { 
    label: 'Value Add', 
    color: '#f59e0b',
    description: 'Requires renovation/enhancement to unlock value'
  },
  'turnkey': { 
    label: 'Turnkey', 
    color: '#8b5cf6',
    description: 'Ready to go, minimal intervention required'
  },
  'off-market': { 
    label: 'Off-Market', 
    color: '#ec4899',
    description: 'Acquired outside public listings'
  },
  'development-potential': { 
    label: 'Development', 
    color: '#06b6d4',
    description: 'Potential for extension, conversion, or redevelopment'
  },
  'cashflow-play': { 
    label: 'Cashflow', 
    color: '#22c55e',
    description: 'Strong rental income potential with low vacancy risk'
  },
  'legacy-hold': { 
    label: 'Legacy Hold', 
    color: '#a1a1aa',
    description: 'Multi-generational wealth preservation focus'
  },
  'distressed': { 
    label: 'Distressed', 
    color: '#ef4444',
    description: 'Motivated seller, potential discount below market'
  },
  'neglected-gem': { 
    label: 'Neglected Gem', 
    color: '#fbbf24',
    description: 'Undervalued due to condition, cosmetic opportunity'
  },
};

const STORAGE_KEY = 'propSearch_thesis_tags';

interface ThesisTagStore {
  [propertyId: string]: ThesisTag[];
}

export const useThesisTags = () => {
  const [tags, setTags] = useState<ThesisTagStore>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  }, [tags]);

  const getTags = useCallback((propertyId: string): ThesisTag[] => {
    return tags[propertyId] || [];
  }, [tags]);

  const addTag = useCallback((propertyId: string, tag: ThesisTag) => {
    setTags(prev => {
      const currentTags = prev[propertyId] || [];
      if (currentTags.includes(tag)) return prev;
      return {
        ...prev,
        [propertyId]: [...currentTags, tag]
      };
    });
  }, []);

  const removeTag = useCallback((propertyId: string, tag: ThesisTag) => {
    setTags(prev => {
      const currentTags = prev[propertyId] || [];
      return {
        ...prev,
        [propertyId]: currentTags.filter(t => t !== tag)
      };
    });
  }, []);

  const toggleTag = useCallback((propertyId: string, tag: ThesisTag) => {
    setTags(prev => {
      const currentTags = prev[propertyId] || [];
      if (currentTags.includes(tag)) {
        return {
          ...prev,
          [propertyId]: currentTags.filter(t => t !== tag)
        };
      }
      return {
        ...prev,
        [propertyId]: [...currentTags, tag]
      };
    });
  }, []);

  const setPropertyTags = useCallback((propertyId: string, newTags: ThesisTag[]) => {
    setTags(prev => ({
      ...prev,
      [propertyId]: newTags
    }));
  }, []);

  const clearTags = useCallback((propertyId: string) => {
    setTags(prev => {
      const { [propertyId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Batch operations
  const batchAddTag = useCallback((propertyIds: string[], tag: ThesisTag) => {
    setTags(prev => {
      const updated = { ...prev };
      propertyIds.forEach(id => {
        const currentTags = updated[id] || [];
        if (!currentTags.includes(tag)) {
          updated[id] = [...currentTags, tag];
        }
      });
      return updated;
    });
  }, []);

  const batchRemoveTag = useCallback((propertyIds: string[], tag: ThesisTag) => {
    setTags(prev => {
      const updated = { ...prev };
      propertyIds.forEach(id => {
        const currentTags = updated[id] || [];
        updated[id] = currentTags.filter(t => t !== tag);
      });
      return updated;
    });
  }, []);

  const batchClearTags = useCallback((propertyIds: string[]) => {
    setTags(prev => {
      const updated = { ...prev };
      propertyIds.forEach(id => {
        delete updated[id];
      });
      return updated;
    });
  }, []);

  // Get properties by tag
  const getPropertiesByTag = useCallback((tag: ThesisTag): string[] => {
    return Object.entries(tags)
      .filter(([_, propertyTags]) => propertyTags.includes(tag))
      .map(([id]) => id);
  }, [tags]);

  // Get all unique tags used
  const getUsedTags = useCallback((): ThesisTag[] => {
    const tagSet = new Set<ThesisTag>();
    Object.values(tags).forEach(propertyTags => {
      propertyTags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [tags]);

  return {
    tags,
    getTags,
    addTag,
    removeTag,
    toggleTag,
    setPropertyTags,
    clearTags,
    batchAddTag,
    batchRemoveTag,
    batchClearTags,
    getPropertiesByTag,
    getUsedTags,
  };
};
