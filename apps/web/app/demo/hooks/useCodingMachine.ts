'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CodingMachineState, CodingContext } from '@basevitale/shared';

const DEFAULT_STATE: CodingMachineState = {
  value: 'IDLE',
  context: {
    lastInput: '',
    suggestions: [],
  },
  updatedAt: new Date().toISOString(),
};

function normalizeState(data: unknown): CodingMachineState {
  if (data && typeof data === 'object' && 'value' in data) {
    const d = data as Record<string, unknown>;
    const context = (d.context && typeof d.context === 'object' ? d.context : {}) as Record<string, unknown>;
    return {
      value: (d.value === 'IDLE' || d.value === 'ANALYZING' || d.value === 'SILENT' || d.value === 'SUGGESTING'
        ? d.value
        : 'IDLE') as CodingMachineState['value'],
      context: {
        lastInput: typeof context.lastInput === 'string' ? context.lastInput : '',
        suggestions: Array.isArray(context.suggestions)
          ? context.suggestions.map((s: unknown) => {
              const item = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
              return {
                code: typeof item.code === 'string' ? item.code : '',
                label: typeof item.label === 'string' ? item.label : '',
                confidence: typeof item.confidence === 'number' ? item.confidence : 0,
              };
            })
          : [],
      } as CodingContext,
      updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
    };
  }
  return DEFAULT_STATE;
}

function getApiBase(): string {
  return typeof window !== 'undefined' ? '' : '';
}

const STREAM_PATH = '/api/coding/stream';
const ANALYZE_PATH = '/api/coding/analyze';
const STATE_PATH = '/api/coding/state';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface UseCodingMachineReturn {
  /** État complet de la machine (synchronisé serveur). */
  state: CodingMachineState | null;
  /** Envoyer un texte à analyser (POST /api/coding/analyze). */
  analyzeText: (text: string) => Promise<void>;
  /** Connexion SSE active. */
  isConnected: boolean;
  /** Dernière erreur (flux ou POST). */
  error: string | null;
}

/**
 * useCodingMachine — Client Ghost Protocol pour la CodingMachine (Le Stratège).
 * Connexion SSE vers GET /api/coding/stream, action via POST /api/coding/analyze.
 * Reconnexion automatique en cas de coupure du flux.
 */
export function useCodingMachine(): UseCodingMachineReturn {
  const [state, setState] = useState<CodingMachineState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    const base = getApiBase();
    const url = `${base}${STREAM_PATH}`;
    const es = new EventSource(url);

    es.onopen = () => {
      reconnectAttempts.current = 0;
      setIsConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState(normalizeState(data));
      } catch (_) {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        setError('Connexion perdue, reconnexion…');
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
      } else {
        setError('Impossible de se connecter au flux.');
      }
    };

    eventSourceRef.current = es;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();
    fetch(`${base}${STATE_PATH}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data != null) setState(normalizeState(data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  const analyzeText = useCallback(async (text: string) => {
    const t = text?.trim();
    if (!t) return;
    setError(null);
    const base = getApiBase();
    try {
      const res = await fetch(`${base}${ANALYZE_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (res.ok) setState(normalizeState(data));
      else setError((data?.message as string) || `HTTP ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    }
  }, []);

  return { state, analyzeText, isConnected, error };
}
