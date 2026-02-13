import { useState, useEffect, useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { DrugSearchResult } from '@basevitale/shared';
import { getBaseUrl } from './generated/base-vitale';

/** @deprecated Préférer DrugSearchResult de @basevitale/shared */
export type DrugSearchHit = DrugSearchResult;

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

/**
 * GET /api/drugs/search?q=… — Recherche hybride (Full-Text Drug + Molecule).
 * includeMolecules=true → molecules: [{ name, dosage }].
 * patientId → safety: { status, reason } par médicament (Smart Search).
 * includePacks=true → packs: [{ cip7, cip13, prix?, tauxRemboursement? }].
 */
export async function searchDrugs(
  query: string,
  limit = 20,
  options?: { includeMolecules?: boolean; patientId?: string; includePacks?: boolean },
): Promise<DrugSearchResult[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const base = getBaseUrl();
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (options?.includeMolecules !== false) params.set('molecules', '1');
  if (options?.patientId) params.set('patientId', options.patientId);
  if (options?.includePacks) params.set('packs', '1');
  const url = `${base}/api/drugs/search?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Drug search failed');
  const body = await res.json();
  const raw = Array.isArray(body) ? body : body?.data ?? [];
  return Array.isArray(raw) ? (raw as DrugSearchResult[]) : [];
}

export const getDrugSearchQueryKey = (
  query: string,
  limit?: number,
  includeMolecules?: boolean,
  patientId?: string,
  includePacks?: boolean
) => ['drugs', 'search', query, limit, includeMolecules, patientId ?? null, includePacks ?? false] as const;

/**
 * Hook React Query : recherche par query directe (sans debounce).
 * Usage : const { data } = useDrugSearchByQuery('Doliprane');
 */
export function useDrugSearchByQuery(
  query: string,
  options?: Omit<
    UseQueryOptions<DrugSearchResult[], Error, DrugSearchResult[], ReturnType<typeof getDrugSearchQueryKey>>,
    'queryKey' | 'queryFn'
  > & { limit?: number; includeMolecules?: boolean; patientId?: string; includePacks?: boolean }
) {
  const limit = options?.limit ?? 20;
  const includeMolecules = options?.includeMolecules !== false;
  const patientId = options?.patientId;
  const includePacks = options?.includePacks ?? false;
  return useQuery({
    queryKey: getDrugSearchQueryKey(query, limit, includeMolecules, patientId, includePacks),
    queryFn: () => searchDrugs(query, limit, { includeMolecules, patientId, includePacks }),
    enabled: (query || '').trim().length >= MIN_QUERY_LENGTH,
    ...options,
  });
}

/**
 * Hook intelligent : recherche avec debounce (300ms), loading, erreur.
 * Pour saisie utilisateur : ne pas appeler l'API à chaque frappe.
 *
 * @returns { search, results, isLoading, error } — prêt pour input + liste / Select
 */
/** Toujours inclure les molécules par défaut. patientId → Smart Search (safety par médicament). */
export function useDrugSearch(options?: {
  limit?: number;
  debounceMs?: number;
  includeMolecules?: boolean;
  patientId?: string;
  includePacks?: boolean;
}) {
  const limit = options?.limit ?? 20;
  const debounceMs = options?.debounceMs ?? DEBOUNCE_MS;
  const includeMolecules = options?.includeMolecules !== false;
  const patientId = options?.patientId;
  const includePacks = options?.includePacks ?? false;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: getDrugSearchQueryKey(debouncedQuery, limit, includeMolecules, patientId, includePacks),
    queryFn: () => searchDrugs(debouncedQuery, limit, { includeMolecules, patientId, includePacks }),
    enabled: debouncedQuery.trim().length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });

  const search = useCallback((term: string) => {
    setQuery(String(term ?? ''));
  }, []);

  const results: DrugSearchResult[] = data ?? [];

  return {
    search,
    query,
    debouncedQuery,
    results,
    isLoading,
    error: isError ? error : null,
    /** Pour composants Select : { value: id, label } */
    options: results.map((r) => ({ value: r.id, label: r.label })),
  };
}
