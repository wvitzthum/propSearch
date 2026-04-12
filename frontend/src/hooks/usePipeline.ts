import { useState, useEffect, useCallback } from 'react';

export type PropertyStatus = 'discovered' | 'shortlisted' | 'vetted' | 'archived';

export interface PipelineState {
  [propertyId: string]: PropertyStatus;
}

// Debounce map to prevent rapid-fire PATCH calls on the same property
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function debouncePatch(propertyId: string, fn: () => void, delay = 300) {
  if (debounceTimers[propertyId]) {
    clearTimeout(debounceTimers[propertyId]);
  }
  debounceTimers[propertyId] = setTimeout(() => {
    delete debounceTimers[propertyId];
    fn();
  }, delay);
}

// Toast helper — creates a dismissible error notification
function showToast(message: string) {
  // Inject a simple toast element into the DOM
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 z-[9999] px-4 py-3 bg-rose-500/90 text-white text-xs font-bold rounded-xl shadow-2xl border border-rose-400/30 flex items-center gap-2 max-w-sm animate-fade-in';
  toast.innerHTML = `<span>⚠</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

const STORAGE_KEY = 'propsearch_pipeline';

export const usePipeline = () => {
  const [pipeline, setPipeline] = useState<PipelineState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  // FE-222: Sync pipeline status to SQLite backend on every change
  // Optimistic update: local state updated immediately, rollback on failure
  const syncToBackend = useCallback(async (id: string, status: PropertyStatus, rollback: PropertyStatus) => {
    try {
      const res = await fetch(`/api/properties/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_status: status }),
      });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`Pipeline sync failed for ${id}: ${err.message}. Rolling back to ${rollback}`);
      // Rollback: revert to previous status
      setPipeline(prev => ({ ...prev, [id]: rollback }));
      showToast(`Pipeline sync failed for property. Change reverted.`);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pipeline));
  }, [pipeline]);

  const setStatus = useCallback((id: string, status: PropertyStatus) => {
    const currentStatus = pipeline[id] || 'discovered';
    // Optimistic local update — backend sync follows
    setPipeline(prev => ({ ...prev, [id]: status }));
    // Debounce PATCH calls to avoid flooding the API on rapid clicks
    debouncePatch(id, () => syncToBackend(id, status, currentStatus), 300);
  }, [pipeline, syncToBackend]);

  const getStatus = useCallback((id: string): PropertyStatus => {
    return pipeline[id] || 'discovered';
  }, [pipeline]);

  // Hydrate pipeline state from API response — call this after fetching properties
  // so that server-side pipeline_status values are loaded into local state
  const hydrateFromProperties = useCallback((properties: Array<{ id: string; pipeline_status?: string }>) => {
    setPipeline(prev => {
      const next = { ...prev };
      for (const prop of properties) {
        if (prop.pipeline_status) {
          const validStatus = ['discovered', 'shortlisted', 'vetted', 'archived'].includes(prop.pipeline_status)
            ? prop.pipeline_status as PropertyStatus
            : 'discovered';
          // Only clobber localStorage values if we have server data for this ID
          // (preserves any locally-set values not yet synced)
          if (!next[prop.id] || next[prop.id] === 'discovered') {
            next[prop.id] = validStatus;
          }
        }
      }
      return next;
    });
  }, []);

  return { pipeline, setStatus, getStatus, hydrateFromProperties };
};
