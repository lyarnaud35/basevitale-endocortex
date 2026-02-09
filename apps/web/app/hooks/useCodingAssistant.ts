'use client';

import { useQuery } from '@tanstack/react-query';
import type { CodingStrategistState } from '@basevitale/cortex-sdk';

const POLLING_INTERVAL = 1000;

/**
 * Hook "Ghost" – Polling du Cortex Stratège (GET /api/coding/strategist/state).
 * Le front n'a pas d'état local : il obéit au backend (shouldDisplay → afficher ou disparaître).
 */
export function useCodingAssistant() {
  return useQuery<CodingStrategistState>({
    queryKey: ['coding-strategist-state'],
    queryFn: async () => {
      const res = await fetch('/api/coding/strategist/state');
      if (!res.ok) throw new Error('Cortex disconnected');
      const json = await res.json();
      return (json?.data ?? json) as CodingStrategistState;
    },
    refetchInterval: POLLING_INTERVAL,
  });
}
