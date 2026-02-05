'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type { ConsultationAnalysis, ConsultationData } from '../types/consultation-result';
import type { ScribeConfig } from '../config';
import { processDictation, validateDraftAlt, patchDraft, formatApiError } from '../api/scribe-client';
import { usePatientIntelligence } from './usePatientIntelligence';
import { useSpeechRecognition } from './useSpeechRecognition';

export type ScribePhase = 'input' | 'analyzing' | 'correction' | 'validating';

export interface PrescriptionRow {
  drug: string;
  dosage: string;
  duration: string;
}

export interface BillingRow {
  code: string;
  label: string;
  confidence: number;
}

function apiBaseFromBackendUrl(backendUrl: string): string {
  const u = backendUrl.replace(/\/$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}

function consultationToPrescription(c: ConsultationData): PrescriptionRow[] {
  const pr = (c?.prescription ?? []).filter(Boolean);
  if (pr.length) {
    return pr.map((p) => ({
      drug: String(p?.drug ?? '').trim() || '—',
      dosage: String(p?.dosage ?? '').trim(),
      duration: String(p?.duration ?? '').trim(),
    }));
  }
  const meds = (c?.medications ?? []).filter(Boolean);
  return meds.map((m) => ({
    drug: String(m?.name ?? '').trim() || '—',
    dosage: String(m?.dosage ?? '').trim(),
    duration: String(m?.duration ?? '').trim(),
  }));
}

function consultationToBilling(c: ConsultationData): BillingRow[] {
  const bc = (c?.billingCodes ?? []).filter(Boolean);
  return bc.map((b) => ({
    code: String(b?.code ?? '').trim() || '—',
    label: String(b?.label ?? '').trim() || '—',
    confidence: typeof b?.confidence === 'number' ? b.confidence : 0.9,
  }));
}

export interface UseScribeLogicOptions {
  /** URL du backend (ex. http://localhost:3001 ou http://localhost:3001/api). */
  backendUrl: string;
  /** Token pour l'auth API (Bearer). */
  token: string;
  /** Identifiant patient (externalPatientId). */
  patientId: string;
  onComplete: (data: ConsultationAnalysis) => void;
  onCancel?: () => void;
}

export interface UseScribeLogicReturn {
  // Config dérivée (pour affichage erreur)
  apiBase: string;

  // Intelligence patient (GET /patient/:id/intelligence)
  intelligence: {
    data: ReturnType<typeof usePatientIntelligence>['data'];
    loading: boolean;
    error: string | null;
    disconnected: boolean;
  };

  // Workflow
  phase: ScribePhase;
  textInput: string;
  setTextInput: (v: string) => void;
  displayTranscript: string;
  textToAnalyze: string;
  canAnalyze: boolean;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  draftId: string | null;
  consultation: ConsultationData | null;
  prescription: PrescriptionRow[];
  billingCodes: BillingRow[];
  validating: boolean;
  symptoms: string[];
  diagnosis: Array<{ code?: string; label?: string; confidence?: number }>;

  handleAnalyze: () => Promise<void>;
  handleValidate: () => Promise<void>;
  handleCancel: () => void;
  updatePrescription: (i: number, field: keyof PrescriptionRow, value: string) => void;
  addPrescriptionRow: () => void;
  removePrescriptionRow: (i: number) => void;
  updateBilling: (i: number, field: keyof BillingRow, value: string | number) => void;
  addBillingRow: () => void;
  removeBillingRow: (i: number) => void;

  speech: {
    supported: boolean;
    isListening: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
  };
}

/**
 * Hook headless : toute la logique Scribe (state, API, reconnaissance vocale).
 * Aucune UI. Permet à Ben de brancher sa propre UI sans casser la logique.
 * WebSocket : peut être ajouté ici plus tard (état connexion + messages).
 */
export function useScribeLogic(options: UseScribeLogicOptions): UseScribeLogicReturn {
  const { backendUrl, token, patientId, onComplete, onCancel = () => {} } = options;
  const apiBase = useMemo(() => apiBaseFromBackendUrl(backendUrl), [backendUrl]);
  const config: ScribeConfig = useMemo(
    () => ({
      apiBaseUrl: apiBase,
      getToken: () => token,
    }),
    [apiBase, token],
  );

  const intelligence = usePatientIntelligence(patientId, config);
  const speech = useSpeechRecognition('fr-FR');

  const [phase, setPhase] = useState<ScribePhase>('input');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionRow[]>([]);
  const [billingCodes, setBillingCodes] = useState<BillingRow[]>([]);
  const [validating, setValidating] = useState(false);
  const editedRef = useRef(false);

  const displayTranscript = speech.supported
    ? (speech.transcript + (speech.interimTranscript ? ` ${speech.interimTranscript}` : '')).trim()
    : '';
  const textToAnalyze = speech.supported ? (speech.transcript || textInput).trim() : textInput.trim();
  const canAnalyze = textToAnalyze.length > 0;

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) {
      setError('Saisissez ou dictez le texte de la consultation.');
      return;
    }
    const text = textToAnalyze;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setPhase('analyzing');
    try {
      const res = await processDictation(config, { text, patientId });
      const data = (res as { data?: { draft?: { id: string }; draftId?: string; consultation?: ConsultationData } }).data ?? res;
      const id = (data as { draft?: { id: string }; draftId?: string }).draft?.id ?? (data as { draftId?: string }).draftId;
      const cons = (data as { consultation?: ConsultationData }).consultation ?? null;
      if (!id || !cons) {
        setError('Réponse API invalide (draftId ou consultation manquant).');
        setPhase('input');
        return;
      }
      setDraftId(id);
      setConsultation(cons);
      setPrescription(consultationToPrescription(cons));
      setBillingCodes(consultationToBilling(cons));
      editedRef.current = false;
      setPhase('correction');
    } catch (err: unknown) {
      const e = err as Error & { message?: string };
      let msg: string;
      if (e.name === 'TypeError' && e.message?.includes('fetch')) {
        msg = `Connexion impossible : vérifiez le backend (${apiBase}/scribe/health).`;
      } else if (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch')) {
        msg = `Réseau : ${e.message}`;
      } else {
        msg = formatApiError(err);
      }
      setError(msg);
      setPhase('input');
    } finally {
      setLoading(false);
    }
  }, [config, patientId, apiBase, textToAnalyze, canAnalyze]);

  const handleValidate = useCallback(async () => {
    if (!draftId || !consultation) return;
    setValidating(true);
    setError(null);
    setErrorStatus(null);
    setPhase('validating');
    try {
      let payload: ConsultationData = consultation;
      if (editedRef.current) {
        const pr = prescription
          .filter((p) => (p.drug !== '—' && p.drug.trim()) || p.dosage.trim() || p.duration.trim())
          .map((p) => ({
            drug: (p.drug === '—' ? '' : p.drug.trim()) || '—',
            dosage: p.dosage.trim(),
            duration: p.duration.trim(),
          }));
        const bc = billingCodes
          .filter((b) => ((b.code !== '—' && b.code.trim()) || (b.label !== '—' && b.label.trim())))
          .map((b) => ({
            code: (b.code === '—' ? '' : b.code.trim()) || '—',
            label: (b.label === '—' ? '' : b.label.trim()) || '—',
            confidence: b.confidence,
          }));
        const updated: ConsultationData = {
          ...consultation,
          prescription: pr.length ? pr : consultation.prescription ?? [],
          billingCodes: bc.length ? bc : consultation.billingCodes ?? [],
        };
        await patchDraft(config, draftId, updated);
        payload = updated;
      }
      await validateDraftAlt(config, draftId);
      onComplete({ draftId, consultation: payload });
      setDraftId(null);
      setConsultation(null);
      setPrescription([]);
      setBillingCodes([]);
      setTextInput('');
      editedRef.current = false;
      speech.reset();
      setPhase('input');
    } catch (err: unknown) {
      const apiErr = err as Error & { status?: number };
      setError(apiErr instanceof Error ? apiErr.message : formatApiError(err));
      setErrorStatus(apiErr?.status ?? null);
    } finally {
      setValidating(false);
      setPhase('correction');
    }
  }, [config, draftId, consultation, prescription, billingCodes, onComplete, speech]);

  const updatePrescription = useCallback((i: number, field: keyof PrescriptionRow, value: string) => {
    setPrescription((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], [field]: value };
      editedRef.current = true;
      return next;
    });
  }, []);

  const addPrescriptionRow = useCallback(() => {
    setPrescription((prev) => [...prev, { drug: '', dosage: '', duration: '' }]);
    editedRef.current = true;
  }, []);

  const removePrescriptionRow = useCallback((i: number) => {
    setPrescription((prev) => prev.filter((_, j) => j !== i));
    editedRef.current = true;
  }, []);

  const updateBilling = useCallback((i: number, field: keyof BillingRow, value: string | number) => {
    setBillingCodes((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], [field]: value };
      editedRef.current = true;
      return next;
    });
  }, []);

  const addBillingRow = useCallback(() => {
    setBillingCodes((prev) => [...prev, { code: '', label: '', confidence: 0.9 }]);
    editedRef.current = true;
  }, []);

  const removeBillingRow = useCallback((i: number) => {
    setBillingCodes((prev) => prev.filter((_, j) => j !== i));
    editedRef.current = true;
  }, []);

  const handleCancel = useCallback(() => {
    if (speech.supported && speech.isListening) speech.stop();
    setPhase('input');
    setError(null);
    setErrorStatus(null);
    setDraftId(null);
    setConsultation(null);
    setPrescription([]);
    setBillingCodes([]);
    setTextInput('');
    onCancel();
  }, [onCancel, speech]);

  const symptoms = (consultation?.symptoms ?? []).filter(Boolean);
  const diagnosis = (consultation?.diagnosis ?? []).filter(Boolean);

  return {
    apiBase,
    intelligence: {
      data: intelligence.data,
      loading: intelligence.loading,
      error: intelligence.error,
      disconnected: intelligence.disconnected,
    },
    phase,
    textInput,
    setTextInput,
    displayTranscript,
    textToAnalyze,
    canAnalyze,
    loading,
    error,
    errorStatus,
    draftId,
    consultation,
    prescription,
    billingCodes,
    validating,
    symptoms,
    diagnosis,
    handleAnalyze,
    handleValidate,
    handleCancel,
    updatePrescription,
    addPrescriptionRow,
    removePrescriptionRow,
    updateBilling,
    addBillingRow,
    removeBillingRow,
    speech: {
      supported: speech.supported,
      isListening: speech.isListening,
      start: speech.start,
      stop: speech.stop,
      reset: speech.reset,
    },
  };
}
