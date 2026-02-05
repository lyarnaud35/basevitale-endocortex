/**
 * GHOST PROTOCOL v999 - Types
 * 
 * Types TypeScript partagés pour le SDK Frontend.
 * Ces types correspondent aux structures envoyées par le Backend via SSE.
 */

/**
 * État d'une machine Ghost
 */
export interface GhostMachineState<TContext = Record<string, any>> {
  /** État actuel (nom de l'état) */
  value: string;
  /** Contexte (données de la machine) */
  context: TContext;
  /** Timestamp de dernière mise à jour (ISO string) */
  updatedAt: string;
}

/**
 * Événement générique envoyé à une machine
 */
export interface GhostEvent {
  type: string;
  payload?: Record<string, unknown>;
}

/**
 * Options pour le hook useGhostMachine
 */
export interface UseGhostMachineOptions {
  /** URL de base de l'API (par défaut: /api) */
  apiBaseUrl?: string;
  /** Délai de reconnexion en cas de déconnexion (ms) */
  reconnectDelay?: number;
  /** Nombre maximum de tentatives de reconnexion */
  maxReconnectAttempts?: number;
}
