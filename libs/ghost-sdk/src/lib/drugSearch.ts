import { useState, useEffect, useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { DrugSearchResult } from '@basevitale/shared';
import { getBaseUrl } from './generated/base-vitale';

/**
 * Affiche le prix : connu → "1.15€", inconnu → "Prix libre".
 */
export function formatDrugPrice(price: number | null | undefined): string {
  return price != null && price > 0 ? `${price.toFixed(2)}€` : 'Prix libre';
}

/**
 * Affiche le taux : connu → "Remb. 65%", inconnu → "Non remb.".
 */
export function formatDrugRefundRate(rate: number | null | undefined): string {
  return rate != null && rate > 0 ? `Remb. ${Math.round(rate * 100)}%` : 'Non remb.';
}

/** Contrat GET /api/drugs/search — objet riche (autocomplétion + facturation). */
export type DrugResult = {
  code: string;
  label: string;
  forme: string;
  substances: string[];
  score?: number;
  price?: number | null;
  currency?: string;
  refundRate?: number | null;
  isGeneric?: boolean;
};

/** @deprecated Préférer DrugSearchResult de @basevitale/shared */
export type DrugSearchHit = DrugSearchResult;

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;
const STALE_TIME_MS = 60 * 60 * 1000; // 1h — les médicaments changent peu

/**
 * GET /api/drugs/search?q=… — Recherche Full-Text (index drugSearch, < 50ms).
 * Retourne code, label, forme, substances. Ne tire pas si query.length < 3.
 */
export async function searchDrugs(
  query: string,
  _limit = 20,
  _options?: { includeMolecules?: boolean; patientId?: string; includePacks?: boolean },
): Promise<DrugResult[]> {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  const base = getBaseUrl();
  const url = `${base}/api/drugs/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Drug search failed');
  const body = await res.json();
  const raw = Array.isArray(body) ? body : body?.data ?? [];
  return Array.isArray(raw) ? (raw as DrugResult[]) : [];
}

export const getDrugSearchQueryKey = (query: string) =>
  ['drugs', 'search', query] as const;

/**
 * Hook React Query : recherche par query directe (sans debounce).
 * Usage : const { data } = useDrugSearchByQuery('Doliprane');
 */
export function useDrugSearchByQuery(
  query: string,
  options?: Omit<
    UseQueryOptions<DrugResult[], Error, DrugResult[], ReturnType<typeof getDrugSearchQueryKey>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: getDrugSearchQueryKey(query),
    queryFn: () => searchDrugs(query),
    enabled: (query || '').trim().length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    ...options,
  });
}

/**
 * Hook headless pour barre de recherche type Google.
 * Ne tire pas tant que l'utilisateur n'a pas tapé au moins 3 caractères.
 *
 * @returns { search, results, isLoading, error, options } — prêt pour input + liste / Select
 */
export function useDrugSearch(options?: { debounceMs?: number }) {
  const debounceMs = options?.debounceMs ?? DEBOUNCE_MS;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: getDrugSearchQueryKey(debouncedQuery),
    queryFn: () => searchDrugs(debouncedQuery),
    enabled: debouncedQuery.trim().length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
  });

  const search = useCallback((term: string) => {
    setQuery(String(term ?? ''));
  }, []);

  const results: DrugResult[] = data ?? [];

  return {
    search,
    query,
    debouncedQuery,
    results,
    isLoading,
    error: isError ? error : null,
    /** Pour composants Select : { value: code, label } */
    options: results.map((r) => ({ value: r.code, label: r.label })),
  };
}
