import { Logger } from '@nestjs/common';
import { createMachine, createActor } from 'xstate';
import { z } from 'zod';

/**
 * Interface minimale pour l'interprète/acteur XState (v4 ou v5).
 */
interface GhostInterpreterLike {
  send: (event: any) => void;
  getSnapshot: () => { value: any; context: any };
  stop?: () => void;
  start?: () => void;
  subscribe?: (listener: (snapshot: any) => void) => { unsubscribe: () => void };
  onTransition?: (listener: (state: any) => void) => void;
}

/**
 * GHOST PROTOCOL v999 - GhostMachine (Abstract)
 *
 * Classe abstraite que toutes les machines métier doivent étendre.
 * Compatible XState v4 et v5.
 */
export abstract class GhostMachine<
  TContext extends Record<string, any>,
  TEvent extends { type: string },
  TStateSchema extends { value: string },
> {
  protected readonly logger: Logger;
  protected interpreter: GhostInterpreterLike | null = null;
  protected machineId: string;
  protected initialContext: Partial<TContext>;
  protected currentState: any = null;

  abstract readonly contextSchema: z.ZodType<TContext>;

  /** Config machine (utilisée seulement si la classe fille n'override pas initializeMachine) */
  abstract readonly machineConfig: any;

  constructor(machineId: string, initialContext: Partial<TContext> = {}) {
    this.machineId = machineId;
    this.initialContext = initialContext;
    this.logger = new Logger(this.constructor.name);
    this.initializeMachine();
  }

  protected initializeMachine(): void {
    const validatedContext = this.contextSchema.parse(this.initialContext);

    const machine = createMachine({
      ...this.machineConfig,
      context: validatedContext,
    } as any);

    const actor = createActor(machine);
    this.interpreter = actor as unknown as GhostInterpreterLike;

    if (actor.subscribe) {
      actor.subscribe((snapshot: any) => {
        this.currentState = snapshot;
        this.logger.debug(`[${this.machineId}] State transition: ${snapshot.value}`);
      });
    }

    if (actor.start) {
      actor.start();
    }
    this.currentState = actor.getSnapshot();

    this.logger.log(`[${this.machineId}] Machine initialized`);
  }

  send(event: TEvent): { value: string; context: TContext; updatedAt: string } {
    if (!this.interpreter) {
      throw new Error('Machine not initialized');
    }

    this.logger.debug(`[${this.machineId}] Received event: ${(event as any).type}`);

    this.interpreter.send(event);

    const snapshot = this.interpreter.getSnapshot();

    return {
      value: String(snapshot.value),
      context: snapshot.context as TContext,
      updatedAt: new Date().toISOString(),
    };
  }

  getState(): { value: string; context: TContext; updatedAt: string } {
    if (!this.interpreter) {
      throw new Error('Machine not initialized');
    }

    const snapshot = this.interpreter.getSnapshot();

    return {
      value: String(snapshot.value),
      context: snapshot.context as TContext,
      updatedAt: new Date().toISOString(),
    };
  }

  getContext(): TContext {
    return this.getState().context;
  }

  reset(): void {
    if (this.interpreter?.stop) {
      this.interpreter.stop();
    }
    this.initializeMachine();
    this.logger.log(`[${this.machineId}] Machine reset to initial state`);
  }

  stop(): void {
    if (this.interpreter) {
      this.interpreter.stop?.();
      this.interpreter = null;
      this.currentState = null;
      this.logger.log(`[${this.machineId}] Machine stopped`);
    }
  }

  abstract setError(error: string): void;
}
