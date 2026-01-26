'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/**
 * Hook pour les WebSockets
 * 
 * Gère la connexion Socket.io et les événements temps réel
 * Version BaseVitale V112
 */
export function useWebSocket(namespace: string = '/ws') {
  const { token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Créer la connexion
    const newSocket = io(`${WS_URL}${namespace}`, {
      auth: {
        token: token || 'test-token',
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Gestionnaires d'événements
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    newSocket.on('connected', (data) => {
      console.log('WebSocket confirmed:', data);
    });

    // Cleanup
    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [namespace, token]);

  /**
   * Rejoindre une room
   */
  const joinRoom = (room: string, userId?: string) => {
    if (socket) {
      socket.emit('join-room', { room, userId });
    }
  };

  /**
   * Quitter une room
   */
  const leaveRoom = (room: string) => {
    if (socket) {
      socket.emit('leave-room', { room });
    }
  };

  /**
   * S'abonner aux alertes de monitorage
   */
  const subscribeMonitoring = (patientId?: string, roomId?: string) => {
    if (socket) {
      socket.emit('subscribe-monitoring', { patientId, roomId });
    }
  };

  /**
   * Écouter un événement
   */
  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
      return () => {
        socket.off(event, callback);
      };
    }
    return () => {};
  };

  /**
   * Arrêter d'écouter un événement
   */
  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  return {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    subscribeMonitoring,
    on,
    off,
  };
}
