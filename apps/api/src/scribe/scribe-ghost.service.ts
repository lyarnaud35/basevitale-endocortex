import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, share } from 'rxjs/operators';
import { ScribeGhostMachine } from './scribe-ghost-machine';
import {
  ScribeEvent,
  ScribeContext,
  ScribeMachineState,
} from '@basevitale/shared';
import { GhostMachineService } from '../core-ghost/ghost-machine.service';

type ScribeStateValue = ScribeMachineState['value'];

/**
 * Produit un état sérialisable en JSON (sans références circulaires, sans propriétés non énumérables).
 * Critique pour SSE : évite que JSON.stringify() lance ou produise un JSON invalide.
 */
function toSerializableState(state: { value: string; context: ScribeContext; updatedAt: string }): ScribeMachineState {
  try {
    const context = state.context as Record<string, unknown>;
    const cleanedContext = JSON.parse(JSON.stringify(context ?? {})) as ScribeContext;
    return {
      value: state.value as ScribeStateValue,
      context: cleanedContext,
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
  } catch (err) {
    return {
      value: state.value as ScribeStateValue,
      context: {
        patientId: (state.context as any)?.patientId ?? '',
        transcript: (state.context as any)?.transcript ?? '',
        entities: Array.isArray((state.context as any)?.entities) ? (state.context as any).entities : [],
        status: (state.context as any)?.status ?? 'idle',
        consultation: null,
        draftId: (state.context as any)?.draftId ?? null,
        error: (state.context as any)?.error ?? null,
        metadata: undefined,
      },
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
  }
}

/**
 * GHOST PROTOCOL v999 - ScribeGhostService
 * 
 * Service qui gère les instances de ScribeGhostMachine et expose des Observables
 * pour le streaming d'état via SSE.
 * 
 * Responsabilités :
 * - Créer/maintenir les instances de ScribeGhostMachine par sessionId
 * - Exposer un Observable pour chaque machine (streaming d'état)
 * - Forwarder les événements vers les machines
 * - Gérer le cycle de vie des machines
 */
@Injectable()
export class ScribeGhostService {
  private readonly logger = new Logger(ScribeGhostService.name);
  private readonly machines = new Map<string, ScribeGhostMachine>();
  private readonly stateStreams = new Map<string, Subject<ScribeMachineState>>();

  constructor(private readonly ghostMachineService: GhostMachineService) {}

  /**
   * Crée ou récupère une machine pour une session
   */
  getOrCreateMachine(
    sessionId: string,
    initialContext?: Partial<ScribeContext>,
  ): ScribeGhostMachine {
    if (!this.machines.has(sessionId)) {
      this.logger.log(`Creating new ScribeGhostMachine for session ${sessionId}`);
      // Contexte initial valide pour le schéma Zod (patientId requis min 1)
      const ctx: Partial<ScribeContext> = {
        patientId: (initialContext?.patientId ?? sessionId) || 'default',
        ...initialContext,
      };
      const machine = new ScribeGhostMachine(sessionId, ctx);
      
      // Enregistrer dans le GhostMachineService (pour compatibilité avec le système global)
      this.ghostMachineService.registerMachine(sessionId, machine);
      
      // Créer le Subject pour le streaming
      const stateSubject = new BehaviorSubject<ScribeMachineState>(
        toSerializableState(machine.getState()),
      );
      this.stateStreams.set(sessionId, stateSubject);
      
      // Écouter les changements d'état de la machine
      // Note: Pour l'instant, on poll l'état. Dans une version optimisée,
      // on pourrait utiliser les callbacks XState pour émettre directement.
      this.setupStateListener(sessionId, machine, stateSubject);
      
      this.machines.set(sessionId, machine);
      this.logger.log(`ScribeGhostMachine ${sessionId} created and registered`);
    }
    
    return this.machines.get(sessionId)!;
  }

  /**
   * Configure l'écoute des changements d'état de la machine
   * 
   * Utilise le callback setStateChangeCallback() pour écouter les transitions XState.
   */
  private setupStateListener(
    sessionId: string,
    machine: ScribeGhostMachine,
    subject: Subject<ScribeMachineState>,
  ): void {
    // Configurer le callback pour émettre les changements d'état dans le Subject
    machine.setStateChangeCallback((state) => {
      const normalized = toSerializableState(state);
      subject.next(normalized);
      this.logger.debug(`[${sessionId}] State emitted to stream: ${state.value}`);
    });
  }

  /**
   * Récupère une machine existante (lance NotFoundException si absente)
   */
  getMachine(sessionId: string): ScribeGhostMachine {
    const machine = this.machines.get(sessionId);
    if (!machine) {
      throw new NotFoundException(`ScribeGhostMachine for session ${sessionId} not found`);
    }
    return machine;
  }

  /**
   * Retourne un Observable qui émet les changements d'état de la machine
   * 
   * Utilisé par l'endpoint SSE pour streamer les états en temps réel.
   */
  getStream(sessionId: string): Observable<ScribeMachineState> {
    // Créer la machine si elle n'existe pas
    this.getOrCreateMachine(sessionId);
    
    const subject = this.stateStreams.get(sessionId);
    if (!subject) {
      throw new NotFoundException(`State stream for session ${sessionId} not found`);
    }
    
    // Retourner un Observable partagé (plusieurs subscribers peuvent s'abonner)
    return subject.asObservable().pipe(
      map((state) => ({
        ...state,
        updatedAt: new Date().toISOString(),
      })),
      share(),
    );
  }

  /**
   * Envoie un événement à la machine et émet le nouvel état dans le stream
   */
  async sendEvent(sessionId: string, event: ScribeEvent): Promise<ScribeMachineState> {
    const machine = this.getOrCreateMachine(sessionId);
    
    this.logger.log(`[${sessionId}] Sending event: ${event.type}`);
    // Body validé par ZodValidationPipe ; cast pour satisfaire le typage strict de send()
    const newState = machine.send(event as unknown as ScribeEvent & { type: string });
    const serializable = toSerializableState(newState as { value: string; context: ScribeContext; updatedAt: string });

    // Émettre le nouvel état (déjà sérialisable) dans le stream
    const subject = this.stateStreams.get(sessionId);
    if (subject) {
      subject.next(serializable);
    }

    this.logger.debug(`[${sessionId}] State updated: ${newState.value}`);

    return serializable;
  }

  /**
   * Récupère l'état actuel d'une machine (sérialisable pour JSON/SSE)
   */
  getState(sessionId: string): ScribeMachineState {
    const machine = this.getMachine(sessionId);
    return toSerializableState(machine.getState());
  }

  /**
   * Réinitialise une machine à son état initial
   */
  resetMachine(sessionId: string): void {
    const machine = this.getMachine(sessionId);
    machine.reset();
    
    const newState = machine.getState();
    const serializable = toSerializableState(newState as { value: string; context: ScribeContext; updatedAt: string });
    const subject = this.stateStreams.get(sessionId);
    if (subject) {
      subject.next(serializable);
    }

    this.logger.log(`[${sessionId}] Machine reset to IDLE`);
  }

  /**
   * Supprime une machine (nettoyage)
   */
  deleteMachine(sessionId: string): void {
    if (this.machines.has(sessionId)) {
      const machine = this.machines.get(sessionId);
      if (machine) {
        machine.stop();
      }
      
      // Compléter et supprimer le stream
      const subject = this.stateStreams.get(sessionId);
      if (subject) {
        subject.complete();
      }
      
      this.machines.delete(sessionId);
      this.stateStreams.delete(sessionId);
      this.ghostMachineService.deleteMachine(sessionId);
      
      this.logger.log(`Deleted ScribeGhostMachine for session ${sessionId}`);
    }
  }

  /**
   * Liste toutes les sessions actives (pour debug)
   */
  listActiveSessions(): string[] {
    return Array.from(this.machines.keys());
  }
}
