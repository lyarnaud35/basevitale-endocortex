import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBaseUrl } from './generated/base-vitale';

/**
 * Une ligne du détail de facturation (libellé + montant).
 * @property ruleId - Si présent, la ligne a été ajoutée automatiquement par le moteur (ex: MEG majoration enfant).
 */
export interface BreakdownLine {
  label: string;
  amount: number;
  ruleId?: string;
}

/**
 * Résultat d'une simulation de facturation (NGAP).
 * @property total - Montant total TTC (€).
 * @property breakdown - Détail des lignes (actes + majorations).
 * @property amo - Part Sécu (AMO).
 * @property amc - Part Mutuelle (AMC).
 * @property amount_patient - Reste à charge patient.
 * @property rulesApplied - Règles appliquées (ex: "ALD 100%", "Tarif Conventionné Secteur 1").
 */
export interface FiscalPredictionResult {
  total: number;
  breakdown: BreakdownLine[];
  amo: number;
  amc: number;
  amount_patient: number;
  rulesApplied: string[];
  message?: string;
  patient_context?: { patientId: string; age: number; coverage?: number };
}

/**
 * POST /api/billing/simulate – Simulation facturation (NGAP).
 * ald=true → 100 % Sécu (tiers payant ALD/CMU), 0 € reste à charge.
 */
export async function simulateBilling(
  acts: string[],
  patientId?: string,
  patientAge?: number,
  ald?: boolean,
): Promise<FiscalPredictionResult> {
  const base = getBaseUrl();
  const url = `${base}/api/billing/simulate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ acts, patientId, patientAge, ald }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Billing simulate failed');
  const body = await res.json();
  return body?.data ?? body;
}

export const getFiscalPredictionQueryKey = (
  acts: string[],
  patientId?: string,
  patientAge?: number,
  ald?: boolean,
) => ['billing', 'simulate', acts, patientId ?? null, patientAge ?? null, ald ?? null] as const;

// =============================================================================
// Prédiction depuis le contexte clinique (actes du jour dans le graphe)
// =============================================================================

export interface FiscalPredictionFromContextResult extends FiscalPredictionResult {
  actsFromContext: string[];
}

export interface FiscalPredictionContextOverrides {
  age?: number;
  ald?: boolean;
}

export async function fetchFiscalPredictionFromContext(
  patientId: string,
  overrides?: FiscalPredictionContextOverrides,
): Promise<FiscalPredictionFromContextResult> {
  const base = getBaseUrl();
  const params = new URLSearchParams();
  if (overrides?.age != null) params.set('age', String(overrides.age));
  if (overrides?.ald === true) params.set('ald', 'true');
  const qs = params.toString();
  const url = `${base}/api/billing/prediction/${encodeURIComponent(patientId)}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Billing prediction failed');
  const body = await res.json();
  return body?.data ?? body;
}

export const getFiscalPredictionFromContextQueryKey = (
  patientId: string | null,
  overrides?: FiscalPredictionContextOverrides,
) => ['billing', 'prediction', patientId ?? '', overrides?.age ?? null, overrides?.ald ?? null] as const;

/**
 * Prédiction fiscale déduite des actes du jour (Procedure) pour le patient.
 * Reflète le montant qui sera facturé si on valide sans modifier les actes.
 *
 * @param patientId - ID du patient (actes du jour récupérés depuis le graphe).
 * @param options - `age` : âge simulé (ex: 4 pour enfant) ; `ald` : true = 100 % Sécu ; `enabled` : activer la requête.
 * @returns Résultat de useQuery : data (FiscalPredictionFromContextResult), isLoading, error, refetch.
 *          Invalider la query (getFiscalPredictionFromContextQueryKey) après add/remove procedure pour mise à jour temps réel.
 */
export function useFiscalPredictionFromContext(
  patientId: string | null,
  options?: {
    age?: number;
    ald?: boolean;
    enabled?: boolean;
  } & Omit<
    UseQueryOptions<
      FiscalPredictionFromContextResult,
      Error,
      FiscalPredictionFromContextResult,
      ReturnType<typeof getFiscalPredictionFromContextQueryKey>
    >,
    'queryKey' | 'queryFn'
  >,
) {
  const { age, ald, enabled = true, ...rest } = options ?? {};
  const overrides = age !== undefined || ald === true ? { age, ald } : undefined;
  return useQuery({
    queryKey: getFiscalPredictionFromContextQueryKey(patientId, overrides),
    queryFn: () => fetchFiscalPredictionFromContext(patientId!, overrides),
    enabled: enabled && !!patientId,
    ...rest,
  });
}

/** POST /billing/patient/:patientId/procedures – Ajouter un acte du jour. */
export async function addPatientProcedure(
  patientId: string,
  code: string,
  name?: string,
): Promise<{ ok: boolean }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/billing/patient/${encodeURIComponent(patientId)}/procedures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, name }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Add procedure failed');
  const body = await res.json();
  return body?.data ?? body;
}

/** DELETE /billing/patient/:patientId/procedures/:code – Retirer un acte du jour. */
export async function removePatientProcedure(
  patientId: string,
  code: string,
): Promise<{ ok: boolean }> {
  const base = getBaseUrl();
  const res = await fetch(
    `${base}/api/billing/patient/${encodeURIComponent(patientId)}/procedures/${encodeURIComponent(code)}`,
    { method: 'DELETE', headers: { Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(res.statusText || 'Remove procedure failed');
  const body = await res.json();
  return body?.data ?? body;
}

// =============================================================================
// Validation facture + Activité du jour
// =============================================================================

/**
 * Facture créée après validation (POST /billing/validate).
 * @property status - 'VALIDATED' signifie que la facture est figée et comptabilisée (CA Journée).
 * @property createdAt - Date ISO de création.
 */
export interface ValidateInvoiceResult {
  id: string;
  patientId: string | null;
  totalAmount: number;
  /** 'VALIDATED' = facture figée et comptabilisée. */
  status: string;
  createdAt: string;
}

export async function validateInvoice(
  patientId: string,
  overrides?: FiscalPredictionContextOverrides,
): Promise<ValidateInvoiceResult> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/billing/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ patientId, age: overrides?.age, ald: overrides?.ald }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (Array.isArray(body?.message) ? body.message[0] : body?.message) ??
      body?.error ??
      res.statusText ??
      'Validate invoice failed';
    throw new Error(msg);
  }
  const data = body?.data ?? body;
  return {
    ...data,
    createdAt: data.createdAt != null ? new Date(data.createdAt).toISOString() : data.createdAt,
  };
}

export interface DailyActivityItem {
  id: string;
  patientId: string | null;
  totalAmount: number;
  status: string;
  acts: string[];
  createdAt: string;
}

export interface DailyActivityResponse {
  invoices: DailyActivityItem[];
  totalAmount: number;
}

export const getDailyActivityQueryKey = () => ['billing', 'daily-activity'] as const;

export async function fetchDailyActivity(): Promise<DailyActivityResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/billing/daily-activity`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Daily activity failed');
  const body = await res.json();
  const data = body?.data ?? body;
  return {
    invoices: (data.invoices ?? []).map((inv: { createdAt?: string | Date }) => ({
      ...inv,
      createdAt: typeof inv.createdAt === 'string' ? inv.createdAt : inv.createdAt?.toISOString?.() ?? '',
    })),
    totalAmount: data.totalAmount ?? 0,
  };
}

/**
 * Valide la simulation actuelle et l'enregistre en base (facture VALIDATED).
 * Invalide automatiquement le cache du dashboard (daily-activity) au succès.
 *
 * @param options - `onSuccess(data)` : appelé avec la facture créée ; `onError(error)` : appelé en cas d'échec (réseau, 400, etc.).
 * @returns Résultat de useMutation : mutate({ patientId, overrides }), isPending, isError, error, data.
 *          Utiliser disabled={isPending} sur le bouton "Valider" pour éviter le double-clic.
 */
export function useValidateInvoice(options?: {
  onSuccess?: (data: ValidateInvoiceResult) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, overrides }: { patientId: string; overrides?: FiscalPredictionContextOverrides }) =>
      validateInvoice(patientId, overrides),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getDailyActivityQueryKey() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDailyActivity(
  options?: Omit<
    UseQueryOptions<DailyActivityResponse, Error, DailyActivityResponse, ReturnType<typeof getDailyActivityQueryKey>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: getDailyActivityQueryKey(),
    queryFn: fetchDailyActivity,
    ...options,
  });
}

/**
 * Prédiction fiscale pour une liste d'actes (POST /billing/simulate). Utile pour la cotation manuelle.
 * @param acts - Codes NGAP/CCAM. @param options - patientId, patientAge, ald, enabled.
 * @returns useQuery : data, isLoading, error.
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
  const { patientId, patientAge, ald, enabled = true, ...rest } = options ?? {};
  return useQuery({
    queryKey: getFiscalPredictionQueryKey(acts, patientId, patientAge, ald),
    queryFn: () => simulateBilling(acts, patientId, patientAge, ald),
    enabled: enabled && Array.isArray(acts),
    ...rest,
  });
}

/**
 * Alias orienté produit pour la simulation : total, part Sécu, part Mutuelle, reste à charge.
 * Idéal pour un ticket de cotation (checkboxes actes + switch ALD). Se met à jour quand acts, patientId, patientAge ou ald change.
 *
 * @param acts - Liste des codes actes (ex: ['C', 'MD']).
 * @param options - patientId, patientAge, ald, enabled.
 * @returns { total, partSecu, partMutuelle, partPatient, rulesApplied, loading, error, data, refetch }.
 */
export function useBillingSimulation(
  acts: string[],
  options?: { patientId?: string; patientAge?: number; ald?: boolean; enabled?: boolean },
) {
  const query = useFiscalPrediction(acts, options);
  const data = query.data;
  return {
    total: data?.total ?? 0,
    partSecu: data?.amo,
    partMutuelle: data?.amc,
    partPatient: data?.amount_patient,
    rulesApplied: data?.rulesApplied ?? [],
    loading: query.isLoading,
    error: query.error,
    data: query.data,
    refetch: query.refetch,
  };
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
