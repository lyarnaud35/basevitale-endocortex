import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GhostMachine } from './ghost-machine.abstract';
import { EventObject } from 'xstate';

/**
 * Type pour l'état d'une machine Ghost
 */
export interface GhostMachineState {
  value: string;
  context: Record<string, any>;
  updatedAt: string;
}

/**
 * GHOST PROTOCOL v999 - GhostMachineService
 * 
 * Service générique pour gérer les instances de machines Ghost.
 * Chaque machine est identifiée par un machineId unique.
 * 
 * Responsabilités :
 * - Créer/détruire des machines
 * - Router les événements vers la bonne machine
 * - Gérer le cycle de vie des machines
 */
@Injectable()
export class GhostMachineService {
  private readonly logger = new Logger(GhostMachineService.name);
  private readonly machines = new Map<string, GhostMachine<any, any, any>>();
  private readonly subscribers = new Map<string, Set<(state: GhostMachineState) => void>>();

  /**
   * Enregistre une machine dans le service
   */
  registerMachine<T extends GhostMachine<any, any, any>>(
    machineId: string,
    machine: T,
  ): void {
    if (this.machines.has(machineId)) {
      this.logger.warn(`Machine ${machineId} already exists, replacing...`);
      // Arrêter l'ancienne machine
      const oldMachine = this.machines.get(machineId);
      if (oldMachine) {
        oldMachine.stop();
      }
    }
    this.machines.set(machineId, machine);
    this.logger.log(`Registered machine: ${machineId}`);
  }

  /**
   * Crée ou récupère une machine
   * Note: Pour l'instant, les machines doivent être créées manuellement
   * Cette méthode sera étendue pour supporter la création automatique
   */
  getMachine<T extends GhostMachine<any, any, any>>(machineId: string): T {
    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new NotFoundException(`GhostMachine ${machineId} not found`);
    }
    return machine as T;
  }

  /**
   * Envoie un événement à une machine et retourne le nouvel état
   */
  async sendEvent<TEvent extends EventObject>(
    machineId: string,
    event: TEvent,
  ): Promise<GhostMachineState> {
    const machine = this.getMachine(machineId);
    const newState = machine.send(event);
    
    // Notifier les abonnés SSE
    this.notifySubscribers(machineId, newState);
    
    return newState;
  }

  /**
   * Récupère l'état actuel d'une machine
   */
  getState(machineId: string): GhostMachineState {
    const machine = this.getMachine(machineId);
    return machine.getState();
  }

  /**
   * Supprime une machine (nettoyage)
   */
  deleteMachine(machineId: string): void {
    if (this.machines.has(machineId)) {
      this.machines.delete(machineId);
      this.subscribers.delete(machineId);
      this.logger.log(`Deleted machine: ${machineId}`);
    }
  }

  /**
   * Réinitialise une machine à son état initial
   */
  resetMachine(machineId: string): void {
    const machine = this.getMachine(machineId);
    machine.reset();
    const newState = machine.getState();
    this.notifySubscribers(machineId, newState);
    this.logger.log(`Reset machine: ${machineId}`);
  }

  /**
   * S'abonne aux mises à jour d'état d'une machine (pour SSE)
   */
  subscribe(machineId: string, callback: (state: GhostMachineState) => void): () => void {
    if (!this.subscribers.has(machineId)) {
      this.subscribers.set(machineId, new Set());
    }
    this.subscribers.get(machineId)!.add(callback);

    // Retourner une fonction de désabonnement
    return () => {
      const subs = this.subscribers.get(machineId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(machineId);
        }
      }
    };
  }

  /**
   * Notifie tous les abonnés d'une machine
   */
  private notifySubscribers(machineId: string, state: GhostMachineState): void {
    const subs = this.subscribers.get(machineId);
    if (subs) {
      subs.forEach((callback) => {
        try {
          callback(state);
        } catch (error) {
          this.logger.error(`Error notifying subscriber for ${machineId}`, error);
        }
      });
    }
  }

  /**
   * Liste toutes les machines actives (pour debug)
   */
  listActiveMachines(): string[] {
    return Array.from(this.machines.keys());
  }
}
