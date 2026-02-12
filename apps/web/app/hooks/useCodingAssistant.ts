'use client';

import { useState, useCallback } from 'react';

/** Suggestion CIM-10 (contrat partagé avec l'Orchestrateur). */
export interface CodingSuggestion {
  code: string;
  label: string;
  confidence: number;
}

/** Enveloppe standard Nest (TransformInterceptor). */
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  timestamp?: string;
}

const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';
  }
  return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';
};

const FETCH_TIMEOUT_MS = 10000;

/**
 * Hook Module B+ – Analyse de symptômes via l'Orchestrateur.
 * Un seul point d'entrée : analyzeSymptoms(text) → suggestions CIM-10 (mock puis LLM).
 */
export function useCodingAssistant() {
  const [suggestions, setSuggestions] = useState<CodingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeSymptoms = useCallback(async (text: string) => {
    const url = `${getApiBase()}/api/orchestrator/analyze-symptoms`;
    setLoading(true);
    setError(null);
    setSuggestions([]);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text || '' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const raw = await response.json().catch((parseErr) => {
        console.error('[useCodingAssistant] Erreur parsing JSON:', parseErr);
        return {};
      });

      const envelope = raw as ApiResponse<{ suggestions: CodingSuggestion[] }>;
      const data = envelope?.data ?? raw;
      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];

      if (!response.ok) {
        const errMsg = (data as { message?: string })?.message ?? `Erreur ${response.status}`;
        setError(errMsg);
        setSuggestions([]);
        return [];
      }

      setSuggestions(list);
      return list;
    } catch (e) {
      clearTimeout(timeoutId);
      const isTimeout = e instanceof Error && e.name === 'AbortError';
      if (!isTimeout) console.error('[useCodingAssistant] Erreur:', e);
      setError(
        isTimeout
          ? 'Délai dépassé. Vérifiez que l\'API tourne.'
          : 'Connexion au système central impossible.',
      );
      setSuggestions([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    suggestions,
    loading,
    error,
    analyzeSymptoms,
  };
}
