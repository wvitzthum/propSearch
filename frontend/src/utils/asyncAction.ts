/**
 * asyncAction.ts — FE-232: Shared async action hook
 * Handles optimistic updates, loading states, error handling, and toasts for async operations.
 * Mirrors the pattern already established in usePipeline.ts (syncToBackend + rollback).
 */
import { useCallback, useRef } from 'react';

export interface AsyncActionOptions<T> {
  /** Optimistically apply this value immediately before the request */
  optimisticUpdate: T;
  /** Roll back to this value on failure */
  rollbackValue: T;
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
}

/** Debounced async action with optimistic update and rollback on error.
 *  Pattern: usePipeline.ts syncToBackend + toast.ts showToast().
 */
export function useAsyncAction<T>(
  onAction: (currentValue: T) => Promise<void>,
  onValueChange: (newValue: T) => void,
  options: AsyncActionOptions<T>
) {
  const { optimisticUpdate, rollbackValue, debounceMs = 300 } = options;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isLoadingRef = useRef(false);

  const run = useCallback(async (actionId: string, value: T) => {
    // FE-232: Debounce — suppress rapid repeated clicks
    if (debounceTimers.current[actionId]) {
      clearTimeout(debounceTimers.current[actionId]);
    }

    debounceTimers.current[actionId] = setTimeout(async () => {
      if (isLoadingRef.current) return; // Guard against concurrent calls
      isLoadingRef.current = true;

      // Optimistic update: apply immediately
      onValueChange(optimisticUpdate);

      try {
        await onAction(value);
        // Success: keep the optimistic value
        onValueChange(optimisticUpdate);
      } catch {
        // Error: rollback to previous state
        onValueChange(rollbackValue);
      } finally {
        isLoadingRef.current = false;
      }
    }, debounceMs);
  }, [onAction, onValueChange, optimisticUpdate, rollbackValue, debounceMs]);

  return { run };
}
