import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBaseUrl } from './generated/base-vitale';

export interface BreakdownLine {
  label: string;
  amount: number;
  ruleId?: string;
}

export interface FiscalPredictionResult {
  total: number;
  breakdown: BreakdownLine[];
  amo: number;
  amc: number;
  amount_patient: number;
  message?: string;
  patient_context?: { patientId: string; age: number; coverage?: number };
}

/**
 * POST /api/billing/simulate – Simulation facturation (NGAP).
 */
export async function simulateBilling(
  acts: string[],
  patientId?: string,
  patientAge?: number,
): Promise<FiscalPredictionResult> {
  const base = getBaseUrl();
  const url = `${base}/api/billing/simulate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ acts, patientId, patientAge }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Billing simulate failed');
  const body = await res.json();
  return body?.data ?? body;
}

export const getFiscalPredictionQueryKey = (
  acts: string[],
  patientId?: string,
  patientAge?: number,
) => ['billing', 'simulate', acts, patientId, patientAge] as const;

/**
 * Hook React Query : prédiction fiscale (total, AMO/AMC) pour une liste d’actes.
 * Se met à jour automatiquement quand acts (ou patientId/patientAge) change.
 */
export function useFiscalPrediction(
  acts: string[],
  options?: {
    patientId?: string;
    patientAge?: number;
    enabled?: boolean;
  } & Omit<
    UseQueryOptions<
      FiscalPredictionResult,
      Error,
      FiscalPredictionResult,
      ReturnType<typeof getFiscalPredictionQueryKey>
    >,
    'queryKey' | 'queryFn'
  >,
) {
  const { patientId, patientAge, enabled = true, ...rest } = options ?? {};
  return useQuery({
    queryKey: getFiscalPredictionQueryKey(acts, patientId, patientAge),
    queryFn: () => simulateBilling(acts, patientId, patientAge),
    enabled: enabled && Array.isArray(acts),
    ...rest,
  });
}

// =============================================================================
// Cycle de vie facture (FSM – Server-Driven UI)
// =============================================================================

export type InvoiceAction = 'VALIDATE' | 'TRANSMIT' | 'MARK_PAID' | 'REJECT';

export interface InvoiceIntegrityCheck {
  ok: boolean;
  reason?: string;
}

export interface InvoiceLifecycleResponse {
  id: string;
  patientId: string | null;
  totalAmount: number;
  breakdown: BreakdownLine[];
  amo: number;
  amc: number;
  amount_patient: number;
  status: string;
  rulesVersion: string;
  fseToken: string | null;
  fseGeneratedAt?: string | null;
  acts: string[];
  createdAt: string;
  updatedAt: string;
  availableActions: InvoiceAction[];
  integrityCheck?: InvoiceIntegrityCheck;
}

export function getInvoiceLifecycleQueryKey(invoiceId: string | null) {
  return ['billing', 'invoice', 'lifecycle', invoiceId] as const;
}

export async function fetchInvoiceLifecycle(invoiceId: string): Promise<InvoiceLifecycleResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/billing/invoice/${invoiceId}/lifecycle`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(res.statusText || 'Invoice lifecycle failed');
  const body = await res.json();
  return body?.data ?? body;
}

export async function transitionInvoiceStatus(
  invoiceId: string,
  action: InvoiceAction,
): Promise<InvoiceLifecycleResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/billing/invoice/${invoiceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Transition failed');
  const body = await res.json();
  return body?.data ?? body;
}

/**
 * Hook "Hook de Vérité" : état de la facture + actions autorisées par le backend.
 * Ben n'affiche que les boutons dans availableActions ; transition(action) déclenche la mise à jour.
 * TanStack Query : refetch automatique si le backend change le statut (ex. rejet).
 */
export function useInvoiceLifecycle(
  invoiceId: string | null,
  options?: {
    enabled?: boolean;
  } & Omit<
    UseQueryOptions<
      InvoiceLifecycleResponse,
      Error,
      InvoiceLifecycleResponse,
      ReturnType<typeof getInvoiceLifecycleQueryKey>
    >,
    'queryKey' | 'queryFn'
  >,
) {
  const { enabled = true, ...rest } = options ?? {};
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: getInvoiceLifecycleQueryKey(invoiceId),
    queryFn: () => fetchInvoiceLifecycle(invoiceId!),
    enabled: enabled && !!invoiceId,
    ...rest,
  });

  const mutation = useMutation({
    mutationFn: (action: InvoiceAction) => transitionInvoiceStatus(invoiceId!, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getInvoiceLifecycleQueryKey(invoiceId) });
    },
  });

  const availableActions = query.data?.availableActions ?? [];
  const canValidate = availableActions.includes('VALIDATE');

  return {
    ...query,
    status: query.data?.status,
    availableActions,
    canValidate,
    integrityCheck: query.data?.integrityCheck,
    transition: mutation.mutate,
    transitionAsync: mutation.mutateAsync,
    isTransitioning: mutation.isPending,
  };
}
