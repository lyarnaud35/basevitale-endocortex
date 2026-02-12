import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getBaseUrl } from './generated/base-vitale';

export interface DrugSearchHit {
  cis: string;
  denomination: string;
  formePharmaceutique?: string;
}

/**
 * GET /api/drugs/search?q=… — Recherche de médicaments (BDPM).
 */
export async function searchDrugs(query: string, limit = 50): Promise<DrugSearchHit[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const base = getBaseUrl();
  const url = `${base}/api/drugs/search?q=${encodeURIComponent(q)}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Drug search failed');
  const body = await res.json();
  return Array.isArray(body) ? body : (body?.data ?? []);
}

export const getDrugSearchQueryKey = (query: string, limit?: number) =>
  ['drugs', 'search', query, limit] as const;

/**
 * Hook React Query : recherche de médicaments par dénomination.
 * Usage : const { data } = useDrugSearch('Doliprane');
 */
export function useDrugSearch(
  query: string,
  options?: Omit<
    UseQueryOptions<DrugSearchHit[], Error, DrugSearchHit[], ReturnType<typeof getDrugSearchQueryKey>>,
    'queryKey' | 'queryFn'
  > & { limit?: number }
) {
  const limit = options?.limit ?? 50;
  return useQuery({
    queryKey: getDrugSearchQueryKey(query, limit),
    queryFn: () => searchDrugs(query, limit),
    enabled: (query || '').trim().length > 0,
    ...options,
  });
}
