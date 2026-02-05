/**
 * GHOST PROTOCOL v999 - Ghost SDK
 * 
 * SDK Frontend pour interagir avec les machines Ghost.
 * 
 * Exports :
 * - useGhostMachine : Hook React pour se connecter à une machine via SSE
 * - Types : Types TypeScript pour les états et événements
 */

export { useGhostMachine } from './useGhostMachine';
export type {
  GhostMachineState,
  GhostEvent,
  UseGhostMachineOptions,
} from './types';
