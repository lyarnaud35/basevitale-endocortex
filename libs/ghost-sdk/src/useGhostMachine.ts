import { useState, useEffect, useCallback, useRef } from 'react';
import { GhostMachineState, GhostEvent, UseGhostMachineOptions } from './types';

/**
 * GHOST PROTOCOL v999 - useGhostMachine Hook
 * 
 * Hook React générique pour se connecter à une machine Ghost via SSE.
 * 
 * LOI I : SOUVERAINETÉ DE L'ÉTAT
 * - L'état vient UNIQUEMENT du serveur via SSE
 * - Le hook ne maintient qu'une copie locale synchronisée
 * 
 * LOI III : TYPAGE INVIOLABLE
 * - Le hook est strictement typé avec TypeScript
 * - Les types correspondent aux schémas Zod du Backend
 * 
 * @param machineId - Identifiant unique de la machine
 * @param options - Options de configuration (apiBaseUrl, reconnectDelay, etc.)
 * @returns { state, send, isConnected, error }
 */
export function useGhostMachine<TContext = Record<string, any>>(
  machineId: string,
  options: UseGhostMachineOptions = {},
): {
  state: GhostMachineState<TContext> | null;
  send: (event: GhostEvent) => Promise<void>;
  isConnected: boolean;
  error: Error | null;
} {
  const {
    apiBaseUrl = '/api',
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
  } = options;

  const [state, setState] = useState<GhostMachineState<TContext> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Se connecte au stream SSE
   */
  const connect = useCallback(() => {
    // Nettoyer la connexion précédente si elle existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Nettoyer le timeout de reconnexion
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const url = `${apiBaseUrl}/ghost/stream/${machineId}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const newState = JSON.parse(event.data) as GhostMachineState<TContext>;
          setState(newState);
          setError(null);
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          setError(err instanceof Error ? err : new Error('Failed to parse state'));
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        setIsConnected(false);
        setError(new Error('SSE connection error'));

        // Tentative de reconnexion
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttemptsRef.current); // Backoff exponentiel
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create EventSource'));
      setIsConnected(false);
    }
  }, [machineId, apiBaseUrl, reconnectDelay, maxReconnectAttempts]);

  /**
   * Envoie un événement à la machine
   */
  const send = useCallback(
    async (event: GhostEvent) => {
      try {
        const response = await fetch(`${apiBaseUrl}/ghost/machine/${machineId}/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          throw new Error(`Failed to send event: ${response.statusText}`);
        }

        // L'état sera mis à jour via SSE, mais on peut aussi le récupérer ici si nécessaire
        const newState = (await response.json()) as GhostMachineState<TContext>;
        setState(newState);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send event'));
        throw err;
      }
    },
    [machineId, apiBaseUrl],
  );

  // Se connecter au montage et se déconnecter au démontage
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    state,
    send,
    isConnected,
    error,
  };
}
