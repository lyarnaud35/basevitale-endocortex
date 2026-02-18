/**
 * GHOST PROTOCOL - Hook "Panier Vivant".
 * Branche l'UI sur le moteur transactionnel du brouillon (Backend = source de vérité).
 * Ben n'a pas à gérer l'état du panier : il affiche ce que le serveur renvoie.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBaseUrl } from './lib/generated/base-vitale';

// Types alignés sur l'API /api/draft/*
export interface DraftDrugItem {
  cisId: string;
  name: string;
  form: string;
  posology?: string;
}

export interface DraftSafetyReport {
  status: 'OK' | 'WARNING' | 'CRITICAL';
  alerts: string[];
  allergyConflicts: Array<{ cisId: string; drugName: string; reason: string }>;
  duplicateMolecules: Array<{ moleculeName: string; drugNames: string[] }>;
}

export interface PrescriptionDraftSession {
  patientId: string;
  cisIds: string[];
  drugs: DraftDrugItem[];
  safetyReport: DraftSafetyReport;
  global_safety: DraftSafetyReport;
  updatedAt: string;
}

const getPrescriptionDraftQueryKey = (patientId: string) =>
  ['prescription-draft', patientId] as const;

/** Déballage de l'enveloppe API { success, data, timestamp } si présente */
function unwrapDraftResponse<T>(raw: T | { success?: boolean; data?: T }): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { success?: boolean }).success === true) {
    return (raw as { data: T }).data as T;
  }
  return raw as T;
}

async function fetchDraftCurrent(patientId: string): Promise<PrescriptionDraftSession> {
  const base = getBaseUrl();
  const url = `${base}/api/draft/current?patientId=${encodeURIComponent(patientId)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText || 'Draft current failed');
  const raw = await res.json();
  return unwrapDraftResponse<PrescriptionDraftSession>(raw);
}

async function addToDraft(
  patientId: string,
  payload: { cisId: string; posology?: string }
): Promise<PrescriptionDraftSession> {
  const base = getBaseUrl();
  const url = `${base}/api/draft/add`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ patientId, cisId: payload.cisId, posology: payload.posology }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Draft add failed');
  const raw = await res.json();
  return unwrapDraftResponse<PrescriptionDraftSession>(raw);
}

async function removeFromDraft(
  patientId: string,
  cisId: string
): Promise<PrescriptionDraftSession> {
  const base = getBaseUrl();
  const url = `${base}/api/draft/remove`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ patientId, cisId }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Draft remove failed');
  const raw = await res.json();
  return unwrapDraftResponse<PrescriptionDraftSession>(raw);
}

export interface ValidatePrescriptionResponse {
  prescriptionId: string;
}

async function validateDraft(patientId: string): Promise<ValidatePrescriptionResponse> {
  const base = getBaseUrl();
  const url = `${base}/api/draft/validate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ patientId }),
  });
  if (!res.ok) throw new Error(res.statusText || 'Draft validate failed');
  const raw = await res.json();
  return unwrapDraftResponse<ValidatePrescriptionResponse>(raw);
}

const emptySafetyReport: DraftSafetyReport = {
  status: 'OK',
  alerts: [],
  allergyConflicts: [],
  duplicateMolecules: [],
};

const defaultSession = (patientId: string): PrescriptionDraftSession => ({
  patientId,
  cisIds: [],
  drugs: [],
  safetyReport: emptySafetyReport,
  global_safety: emptySafetyReport,
  updatedAt: new Date().toISOString(),
});

/**
 * Hook ultime : session de prescription pilotée par le backend.
 * - draft : liste des médicaments (affichable)
 * - safetyReport : feu tricolore (OK / WARNING / CRITICAL) + alerts / duplicateMolecules
 * - addDrug(cisId, posology?) / removeDrug(cisId)
 * - isChecking : true pendant le Matrix Check après un ajout
 */
export function usePrescriptionSession(patientId: string) {
  const queryClient = useQueryClient();
  const queryKey = getPrescriptionDraftQueryKey(patientId);

  const { data: session, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchDraftCurrent(patientId),
    placeholderData: defaultSession(patientId),
    enabled: !!patientId,
  });

  const addMutation = useMutation({
    mutationFn: (payload: { cisId: string; posology?: string }) =>
      addToDraft(patientId, payload),
    onSuccess: (newData) => {
      queryClient.setQueryData(queryKey, newData);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (cisId: string) => removeFromDraft(patientId, cisId),
    onSuccess: (newData) => {
      queryClient.setQueryData(queryKey, newData);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validateDraft(patientId),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, defaultSession(patientId));
      queryClient.invalidateQueries({ queryKey: ['prescription-history', patientId] });
    },
  });

  const draft = session?.drugs ?? [];
  const safetyReport = session?.safetyReport ?? emptySafetyReport;

  return {
    draft,
    safetyReport,
    isLoading,
    addDrug: addMutation.mutate,
    removeDrug: removeMutation.mutate,
    validatePrescription: validateMutation.mutate,
    validatePrescriptionAsync: validateMutation.mutateAsync,
    isChecking: addMutation.isPending,
    isValidating: validateMutation.isPending,
    addDrugAsync: addMutation.mutateAsync,
    removeDrugAsync: removeMutation.mutateAsync,
  };
}

export { getPrescriptionDraftQueryKey };
