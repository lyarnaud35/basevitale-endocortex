'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Appelle callback après ms de délai depuis le dernier appel.
 * Reset du timer à chaque invocation. Cleanup à l’unmount.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  ms: number,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, ms);
    }) as T,
    [ms],
  );
}
