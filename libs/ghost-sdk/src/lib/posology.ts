import { useQuery } from '@tanstack/react-query';
import { getBaseUrl } from './generated/base-vitale';

export interface PosologyTemplate {
  unit: string;
  default: string;
  max?: string;
  instructions?: string;
}

/**
 * GET /api/drugs/:cis/template — Template de posologie (unité, défaut, instructions).
 */
export async function getPosologyTemplate(cis: string): Promise<PosologyTemplate> {
  const c = (cis || '').trim();
  if (!c) {
    return { unit: '—', default: 'Selon avis médical', instructions: 'Selon avis médical' };
  }
  const base = getBaseUrl();
  const url = `${base}/api/drugs/${encodeURIComponent(c)}/template`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Posology template failed');
  const body = await res.json();
  const data = body?.data ?? body;
  return {
    unit: data?.unit ?? '—',
    default: data?.default ?? 'Selon avis médical',
    max: data?.max,
    instructions: data?.instructions,
  };
}

export const getPosologyTemplateQueryKey = (cis: string) => ['drugs', 'posology', cis] as const;

/**
 * Hook : template de posologie pour un CIS donné.
 * Se déclenche uniquement quand un cis est fourni (non vide).
 */
export function usePosologyTemplate(cis: string | null | undefined) {
  const c = (cis ?? '').trim();
  return useQuery({
    queryKey: getPosologyTemplateQueryKey(c),
    queryFn: () => getPosologyTemplate(c),
    enabled: c.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
