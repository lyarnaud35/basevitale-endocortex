'use client';

import { useState, useCallback } from 'react';

/** État global de la consultation (Module O – Cerveau Central). */
export type ConsultationState =
  | 'IDLE'
  | 'IN_PROGRESS'
  | 'BLOCKED_BY_SECURITY'
  | 'READY_TO_SIGN';

/** État exposé à Ben (procédure Cerveau Central). */
export type BrainState = 'IDLE' | 'ANALYZING' | 'SECURE' | 'BLOCKED';

/** Payload retourné par l'orchestrateur (prescription + sécurité). */
export interface PrescribeResult {
  state: ConsultationState;
  message: string;
  status?: BrainState;
  feedback?: string;
  securityDetails?: {
    value: string;
    context?: { blockReason?: string | null };
    canSubmit?: boolean;
  };
  securityData?: PrescribeResult['securityDetails'];
}

/** Enveloppe standard Nest (TransformInterceptor). */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

/** URL de l'API : même que le curl qui fonctionne (port 3000). En navigateur on appelle l'API directement pour éviter les coupures proxy. */
const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';
  }
  return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';
};

const FETCH_TIMEOUT_MS = 8000;

function normalizeBrainState(data: PrescribeResult): BrainState {
  if (data.status) return data.status;
  if (data.state === 'BLOCKED_BY_SECURITY') return 'BLOCKED';
  if (data.state === 'IN_PROGRESS') return 'SECURE';
  return 'IDLE';
}

/**
 * Hook unifié "Cerveau Central" – Un seul point d’entrée pour Ben.
 * Un appel prescribe(drugName) déclenche toute la chaîne : Orchestrateur → Sécurité → état global.
 * Pas besoin d’appeler useSecurity + useCoding + usePatient séparément.
 */
export function useDoctorBrain() {
  const [globalState, setGlobalState] = useState<ConsultationState>('IDLE');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<PrescribeResult | null>(null);

  const prescribe = useCallback(async (drugName: string) => {
    const url = `${getApiBase()}/api/orchestrator/prescribe`;
    setLoading(true);
    setFeedback('Vérification…');
    setLastResult(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugName, drugId: drugName }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const raw = await response.json().catch((parseErr) => {
        console.error('[useDoctorBrain] Erreur parsing JSON:', parseErr);
        return {};
      });

      // Ouverture de l'enveloppe Nest { success, data, timestamp }
      const envelope = raw as ApiResponse<PrescribeResult>;
      const data: PrescribeResult = envelope?.data ?? (raw as PrescribeResult);

      if (!response.ok) {
        const errMsg = (data as { message?: string }).message ?? `Erreur ${response.status}`;
        setFeedback(errMsg);
        setLastResult(null);
        return null;
      }

      if (data.state) setGlobalState(data.state);
      setFeedback(data.feedback ?? data.message ?? '');
      setLastResult(data);
      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      const isTimeout = e instanceof Error && e.name === 'AbortError';
      if (!isTimeout) console.error('[useDoctorBrain] Erreur:', e);
      setFeedback(
        isTimeout
          ? 'Délai dépassé (8 s). Vérifiez que l’API tourne : npm run clean-api'
          : 'Erreur de connexion au système central.',
      );
      setGlobalState('IDLE');
      setLastResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const base = getApiBase();
      await fetch(`${base}/api/orchestrator/reset`, { method: 'POST', signal: controller.signal });
      clearTimeout(timeoutId);
      setGlobalState('IDLE');
      setFeedback('');
      setLastResult(null);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('Reset failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const brainState: BrainState = lastResult ? normalizeBrainState(lastResult) : (globalState === 'BLOCKED_BY_SECURITY' ? 'BLOCKED' : globalState === 'IN_PROGRESS' ? 'SECURE' : 'IDLE');
  const brainMessage = feedback || 'Prêt.';
  const brainDetails = lastResult?.securityData ?? lastResult?.securityDetails ?? null;

  return {
    state: globalState,
    feedback,
    loading,
    lastResult,
    brainState,
    brainMessage,
    brainDetails,
    actions: {
      prescribe,
      reset,
      /** Alias procédure : retourne true si SECURE, false sinon. */
      check: async (drugName: string) => {
        const result = await prescribe(drugName);
        return normalizeBrainState(result ?? { state: 'IDLE', message: '' }) === 'SECURE';
      },
    },
  };
}
