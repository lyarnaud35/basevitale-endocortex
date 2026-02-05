import { Logger } from '@nestjs/common';
import { createActor } from 'xstate';
import { GhostMachine } from '../core-ghost/ghost-machine.abstract';
import {
  ScribeContext,
  ScribeEvent,
  ScribeContextSchema,
  ScribeState,
} from '@basevitale/shared';
import { createScribeMachineWithContext } from './scribe.machine';

/**
 * GHOST PROTOCOL v999 - ScribeGhostMachine
 *
 * Classe concrète qui étend GhostMachine pour le module Scribe.
 * Utilise la machine XState créée avec setup().
 */
export class ScribeGhostMachine extends GhostMachine<
  ScribeContext,
  ScribeEvent & { type: string },
  { value: ScribeState }
> {
  readonly contextSchema = ScribeContextSchema;

  readonly machineConfig = {} as any;

  constructor(machineId: string, initialContext: Partial<ScribeContext> = {}) {
    super(machineId, initialContext);
  }

  private stateChangeCallback: ((state: { value: string; context: ScribeContext; updatedAt: string }) => void) | null = null;

  setStateChangeCallback(callback: (state: { value: string; context: ScribeContext; updatedAt: string }) => void): void {
    this.stateChangeCallback = callback;
  }

  protected override initializeMachine(): void {
    // Construire le contexte sans dépendre de contextSchema.parse() (évite undefined au runtime)
    const validatedContext: ScribeContext = {
      patientId: (this.initialContext.patientId as string)?.trim() || 'default',
      transcript: (this.initialContext.transcript as string) ?? '',
      entities: Array.isArray(this.initialContext.entities) ? this.initialContext.entities : [],
      status: (this.initialContext.status as ScribeContext['status']) ?? 'idle',
      consultation: this.initialContext.consultation ?? null,
      draftId: this.initialContext.draftId ?? null,
      error: this.initialContext.error ?? null,
      metadata: this.initialContext.metadata,
    };

    const machine = createScribeMachineWithContext(validatedContext);

    const actor = createActor(machine);
    (this as any).interpreter = actor;

    actor.subscribe((snapshot) => {
      (this as any).currentState = snapshot;
      this.logger.debug(`[${this.machineId}] State transition: ${snapshot.value}`);

      if (this.stateChangeCallback) {
        this.stateChangeCallback(this.getState());
      }
    });

    actor.start();
    (this as any).currentState = actor.getSnapshot();

    this.logger.log(`[${this.machineId}] ScribeGhostMachine initialized`);
  }

  /**
   * Définit une erreur dans le contexte (sans changer d'état)
   */
  setError(error: string): void {
    const context = this.getContext();
    context.error = error;
    // Note: Pour mettre à jour l'erreur dans XState, on devrait utiliser assign
    // Pour l'instant, on log l'erreur et elle sera visible dans le contexte
    this.logger.warn(`[${this.machineId}] Error set: ${error}`);
  }
}
