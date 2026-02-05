'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ScribeMachineState,
  ScribeContext,
  ScribeState,
  ScribeEvent,
} from '@basevitale/shared';

/** Payload par type d'événement (contrat Ghost) */
type ScribeEventPayloadMap = {
  START: { patientId: string };
  STOP: { transcript: string };
  UPDATE_TEXT: { text: string };
  RESET: Record<string, never>;
  CONFIRM: { structuredData?: Record<string, unknown> };
};

export type ScribeEventType = keyof ScribeEventPayloadMap;

const DEFAULT_STATE: ScribeMachineState = {
  value: 'IDLE',
  context: {
    patientId: '',
    transcript: '',
    entities: [],
    status: 'idle',
    consultation: null,
    draftId: null,
    error: null,
  },
  updatedAt: new Date().toISOString(),
};

export interface UseGhostScribeOptions {
  /** Session ID (ex: "default", identifiant patient, etc.) */
  sessionId: string;
  /** Base URL de l'API (sans /api). Vide = même origine (rewrites Next). */
  baseUrl?: string;
  /** Activer la reconnexion automatique en cas de coupure SSE */
  reconnect?: boolean;
  /** Délai (ms) avant reconnexion. Default 3000 */
  reconnectDelayMs?: number;
  /** Log les changements d'état en console (debug) */
  debug?: boolean;
}

export interface UseGhostScribeReturn {
  /** État courant de la machine (value) */
  state: ScribeState;
  /** Contexte complet (patientId, transcript, entities, etc.) */
  context: ScribeContext;
  /** État complet brut (value + context + updatedAt) */
  machineState: ScribeMachineState;
  /** Envoyer une intention au backend (La Voix) */
  send: <T extends ScribeEventType>(
    type: T,
    payload?: ScribeEventPayloadMap[T]
  ) => Promise<void>;
  /** Connexion SSE active (point vert/rouge) */
  isConnected: boolean;
  /** Dernière erreur réseau ou backend */
  lastError: string | null;
}

function getStreamUrl(baseUrl: string, sessionId: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const prefix = base ? `${base}/api` : '/api';
  return `${prefix}/ghost-scribe/stream/${encodeURIComponent(sessionId)}`;
}

function getEventsUrl(baseUrl: string, sessionId: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const prefix = base ? `${base}/api` : '/api';
  return `${prefix}/ghost-scribe/events/${encodeURIComponent(sessionId)}`;
}

/**
 * useGhostScribe — Neuro-Link Client (Ghost Protocol)
 *
 * L'Oreille : SSE → state local synchronisé avec le backend.
 * La Voix   : send(type, payload) → POST vers le backend.
 *
 * @see .cursorrules LOI I (Souveraineté de l'état), LOI III (Typage)
 */
export function useGhostScribe(
  options: UseGhostScribeOptions
): UseGhostScribeReturn {
  const {
    sessionId,
    baseUrl = '',
    reconnect = true,
    reconnectDelayMs = 3000,
    debug = false,
  } = options;

  const [machineState, setMachineState] =
    useState<ScribeMachineState>(DEFAULT_STATE);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const streamUrl = getStreamUrl(baseUrl, sessionId);
  const eventsUrl = getEventsUrl(baseUrl, sessionId);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setLastError(null);
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (mountedRef.current) setIsConnected(true);
      if (debug) console.log('[useGhostScribe] SSE connected', streamUrl);
    };

    es.onmessage = (event: MessageEvent<string>) => {
      if (!mountedRef.current) return;
      if ((event as MessageEvent & { type?: string }).type === 'error') {
        setLastError(event.data || 'SSE error');
        if (debug) console.warn('[useGhostScribe] SSE server error', event.data);
        return;
      }
      try {
        const data = JSON.parse(event.data) as ScribeMachineState;
        if (data && typeof data.value === 'string' && data.context) {
          setMachineState({
            value: data.value as ScribeState,
            context: data.context,
            updatedAt: data.updatedAt ?? new Date().toISOString(),
          });
          if (debug) console.log('[useGhostScribe] state', data.value, data.context);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid SSE data';
        setLastError(msg);
        if (debug) console.warn('[useGhostScribe] parse error', err);
      }
    };

    es.onerror = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;
      if (reconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, reconnectDelayMs);
      }
    };
  }, [
    streamUrl,
    reconnect,
    reconnectDelayMs,
    debug,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  const send = useCallback(
    async <T extends ScribeEventType>(
      type: T,
      payload?: ScribeEventPayloadMap[T]
    ): Promise<void> => {
      setLastError(null);
      const body: ScribeEvent = {
        type,
        payload: payload ?? ({} as ScribeEventPayloadMap[T]),
      } as ScribeEvent;

      try {
        const res = await fetch(eventsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            (data as { error?: string })?.error ??
            (data as { message?: string })?.message ??
            `HTTP ${res.status}`;
          setLastError(message);
          if (debug) console.warn('[useGhostScribe] send error', message);
          return;
        }

        const state = (data as { data?: ScribeMachineState })?.data ?? data;
        if (state && typeof state.value === 'string' && state.context) {
          setMachineState({
            value: state.value as ScribeState,
            context: state.context,
            updatedAt: state.updatedAt ?? new Date().toISOString(),
          });
          if (debug) console.log('[useGhostScribe] send ok', state.value);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        setLastError(message);
        if (debug) console.warn('[useGhostScribe] send exception', err);
      }
    },
    [eventsUrl, debug]
  );

  return {
    state: machineState.value,
    context: machineState.context,
    machineState,
    send,
    isConnected,
    lastError,
  };
}
