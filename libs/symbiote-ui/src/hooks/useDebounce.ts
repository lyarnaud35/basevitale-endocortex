import { useCallback, useEffect, useRef } from 'react';

/**
 * Callback debounced : exécuté après ms sans nouvel appel.
 * Cleanup à l'unmount. Aucune dépendance Next.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  ms: number
): T {
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
    [ms]
  );
}
