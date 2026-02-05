import { Logger } from '@nestjs/common';
import { createActor } from 'xstate';
import { GhostMachine } from '../core-ghost/ghost-machine.abstract';
import type { SecurityContext, SecurityEvent } from '@basevitale/shared';
import { createSecurityMachineWithContext } from './security.machine';

/**
 * GHOST PROTOCOL — SecurityGhostMachine (Le Gardien Silencieux)
 * Wrapper autour de la machine XState pour intégration NestJS.
 */
export class SecurityGhostMachine extends GhostMachine<
  SecurityContext,
  SecurityEvent & { type: string },
  { value: string }
> {
  readonly contextSchema = null as any;
  readonly machineConfig = {} as any;

  private stateChangeCallback: ((state: {
    value: string;
    context: SecurityContext;
    updatedAt: string;
  }) => void) | null = null;

  constructor(machineId: string, initialContext: Partial<SecurityContext> = {}) {
    super(machineId, initialContext);
  }

  setStateChangeCallback(
    callback: (state: { value: string; context: SecurityContext; updatedAt: string }) => void
  ): void {
    this.stateChangeCallback = callback;
  }

  setError(_error: string): void {
    this.logger.warn(`[${this.machineId}] Error set: ${_error}`);
  }

  protected override initializeMachine(): void {
    const ctx: SecurityContext = {
      currentDrug: this.initialContext.currentDrug ?? null,
      riskLevel: (this.initialContext.riskLevel as SecurityContext['riskLevel']) ?? 'NONE',
      blockReason: this.initialContext.blockReason ?? null,
      auditTrail: this.initialContext.auditTrail ?? null,
    };
    const machine = createSecurityMachineWithContext(ctx);
    const actor = createActor(machine);
    (this as any).interpreter = actor;

    actor.subscribe((snapshot) => {
      (this as any).currentState = snapshot;
      this.logger.debug(`[${this.machineId}] State: ${snapshot.value}`);
      if (this.stateChangeCallback) {
        this.stateChangeCallback({
          value: String(snapshot.value),
          context: snapshot.context as SecurityContext,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    actor.start();
    (this as any).currentState = actor.getSnapshot();
    this.logger.log(`[${this.machineId}] SecurityGhostMachine initialized`);
  }
}
