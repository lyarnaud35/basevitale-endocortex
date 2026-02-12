import { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeFullContext } from './lib/generated/base-vitale';
import type { CodingSuggestionItem } from '@basevitale/shared';

const DEBOUNCE_MS = 500;

/** État de sécurité exposé au UI (dérivé du Gardien C+). */
export type SecurityStatus = 'SAFE' | 'BLOCKED' | 'UNKNOWN';

function toSecurityStatus(value: string | undefined): SecurityStatus {
  if (value === 'LOCKED') return 'BLOCKED';
  if (value === 'SECURE') return 'SAFE';
  return 'UNKNOWN';
}

export interface UseConsultationScannerOptions {
  /** Délai de debounce en ms avant d'appeler l'API (défaut 500). */
  debounceMs?: number;
  /** Identifiant patient optionnel pour le Gardien. */
  patientId?: string;
  /** Désactiver les appels (ex: texte vide). */
  enabled?: boolean;
}

export interface UseConsultationScannerResult {
  /** État dérivé du Gardien : SAFE (vert), BLOCKED (rouge), UNKNOWN (gris). */
  securityState: SecurityStatus;
  /** Liste des codes CIM-10 suggérés par le Stratège (B+). */
  suggestions: CodingSuggestionItem[];
  /** true pendant l'appel API (debounce terminé, requête en cours). */
  isScanning: boolean;
  /** Erreur réseau ou API. */
  error: Error | null;
  /** true si la dernière requête a échoué (backend éteint, réseau, etc.). Pour affichage UI. */
  isError: boolean;
  /** Message d'erreur lisible (chaîne vide si pas d'erreur). */
  errorMessage: string;
  /** Dernière réponse brute (security + suggestions) pour affichage avancé. */
  data: { security: { value: string; canSubmit?: boolean }; suggestions: CodingSuggestionItem[] } | null;
}

/**
 * Hook "Scanner de Consultation" – Consommation du Cerveau Unifié (C+ et B+).
 * Debounce sur le texte, un seul appel API, états dérivés pour l'UI.
 * Usage : const { securityState, suggestions, isScanning } = useConsultationScanner(text);
 */
export function useConsultationScanner(
  text: string,
  options: UseConsultationScannerOptions = {}
): UseConsultationScannerResult {
  const { debounceMs = DEBOUNCE_MS, patientId, enabled = true } = options;
  const [data, setData] = useState<UseConsultationScannerResult['data']>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runScan = useCallback(async (value: string) => {
    const t = value.trim();
    if (!t) {
      setData(null);
      setError(null);
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      const result = await analyzeFullContext({ text: t, patientId });
      setData({
        security: result.security ?? { value: 'UNKNOWN' },
        suggestions: result.suggestions ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(null);
    } finally {
      setIsScanning(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setData(null);
      setError(null);
      setIsScanning(false);
      return;
    }
    const t = (text ?? '').trim();
    if (!t) {
      setData(null);
      setError(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setIsScanning(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      runScan(text);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs, enabled, runScan]);

  const securityState = data?.security?.value != null
    ? toSecurityStatus(data.security.value)
    : ('UNKNOWN' as SecurityStatus);
  const suggestions = data?.suggestions ?? [];

  return {
    securityState,
    suggestions,
    isScanning,
    error,
    isError: error != null,
    errorMessage: error?.message ?? '',
    data,
  };
}
