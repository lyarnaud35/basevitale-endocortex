/**
 * GHOST PROTOCOL - Historique des ordonnances validées (timeline patient).
 * Boucle de rétroaction : après validation, le médecin voit l'ordonnance dans cette liste.
 */
import { useQuery } from '@tanstack/react-query';
import { getBaseUrl } from './lib/generated/base-vitale';

export interface PrescriptionHistoryDrugItem {
  cisId: string;
  name: string;
  posologie: string;
}

export interface PrescriptionHistoryItem {
  id: string;
  date: string;
  status: string;
  drugs: PrescriptionHistoryDrugItem[];
}

export interface PrescriptionHistoryResponse {
  prescriptions: PrescriptionHistoryItem[];
}

export const getPrescriptionHistoryQueryKey = (patientId: string) =>
  ['prescription-history', patientId] as const;

function unwrap<T>(raw: T | { success?: boolean; data?: T }): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { success?: boolean }).success === true) {
    return (raw as { data: T }).data as T;
  }
  return raw as T;
}

async function fetchPrescriptionHistory(patientId: string): Promise<PrescriptionHistoryResponse> {
  const base = getBaseUrl();
  const url = `${base}/api/draft/prescriptions-history?patientId=${encodeURIComponent(patientId)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Prescription history failed');
  const raw = await res.json();
  return unwrap<PrescriptionHistoryResponse>(raw);
}

/**
 * Hook : dernières 5 ordonnances validées du patient.
 * Invalider avec queryClient.invalidateQueries({ queryKey: getPrescriptionHistoryQueryKey(patientId) })
 * après une validation pour rafraîchir la liste.
 */
export function usePatientPrescriptionHistory(patientId: string) {
  const query = useQuery({
    queryKey: getPrescriptionHistoryQueryKey(patientId),
    queryFn: () => fetchPrescriptionHistory(patientId),
    enabled: !!patientId,
  });
  return {
    prescriptions: query.data?.prescriptions ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
