'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  SecurityMachineState,
  SecurityInputPayload,
  OverridePayload,
  SecurityGuardState,
} from '@basevitale/shared';

const getWsBase = (): string =>
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';

function makeSessionId(): string {
  return `sec-${Math.random().toString(36).slice(2, 10)}`;
}

export type SecurityConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * Hook "Gardien" – Connexion WebSocket au namespace /security.
 * Contrat partagé : SecurityGuardWsState (state_updated), check_prescription, request_override.
 * En LOCKED, le frontend ne doit autoriser que requestOverride (pas de submit).
 */
export function useSecurityGuard(sessionId?: string | null) {
  const sid = useMemo(
    () => (typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : makeSessionId()),
    [sessionId]
  );

  const [machineState, setMachineState] = useState<SecurityMachineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<SecurityConnectionStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);

  const checkPrescription = useCallback((payload: SecurityInputPayload) => {
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('check_prescription', payload);
    }
  }, []);

  const requestOverride = useCallback((payload: OverridePayload) => {
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('request_override', payload);
    }
  }, []);

  useEffect(() => {
    setConnectionStatus('connecting');
    const socket = io(`${getWsBase()}/security`, {
      query: { sessionId: sid },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setIsLoading(false);
    });

    socket.on('state_updated', (data: SecurityGuardWsState) => {
      setMachineState(data);
      setIsLoading(false);
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
      setIsLoading(false);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('error');
    });

    return () => {
      socket.off('connect');
      socket.off('state_updated');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sid]);

  const status: SecurityGuardState | undefined = machineState?.value;

  return {
    data: machineState,
    status,
    isLoading,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    checkPrescription,
    requestOverride,
    canSubmit: machineState?.canSubmit ?? false,
    isLocked: machineState?.value === 'LOCKED',
    sessionId: sid,
  };
}
