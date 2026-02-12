import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { SecurityGuardMachine } from './security-guard.machine';
import type {
  SecurityGuardMachineState,
  SecurityGuardContext,
} from './security-guard-machine.schema';
import type { PatientContextMachineState } from '../oracle/patient-context-machine.schema';
import { OracleGhostService } from '../oracle/oracle-ghost.service';

/**
 * GHOST PROTOCOL - SecurityGuardService (Semaine 2)
 * Observateur : écoute l'état de l'Oracle. Dès que READY, récupère le patientContext
 * et envoie ORACLE_READY à la SecurityGuardMachine (→ DEFCON_3 si allergie critique).
 */
@Injectable()
export class SecurityGuardService implements OnModuleDestroy {
  private readonly logger = new Logger(SecurityGuardService.name);
  private readonly machines = new Map<string, SecurityGuardMachine>();
  private readonly subscriptions = new Map<string, Subscription>();

  constructor(private readonly oracleGhostService: OracleGhostService) {}

  /**
   * Démarre l'observation de l'Oracle pour ce patient.
   * Dès que l'Oracle émet READY, le contexte est envoyé à la SecurityGuardMachine.
   */
  startWatching(patientId: string): void {
    if (this.subscriptions.has(patientId)) {
      this.logger.debug(`[${patientId}] Already watching`);
      return;
    }
    const machine = this.getOrCreateMachine(patientId);
    const sub = this.oracleGhostService.getStream(patientId).subscribe({
      next: (state: PatientContextMachineState) => {
        if (state.value === 'READY' && state.context.patientId) {
          machine.send({
            type: 'ORACLE_READY',
            payload: {
              patientId: state.context.patientId,
              context: {
                patientId: state.context.patientId,
                timeline: state.context.timeline,
                alertes: state.context.alertes,
              },
            },
          });
          this.logger.log(
            `[${patientId}] Oracle READY → SecurityGuard ${machine.value}`,
          );
        }
      },
      error: (err) => this.logger.warn(`[${patientId}] Oracle stream error`, err),
    });
    this.subscriptions.set(patientId, sub);
    this.logger.log(`[${patientId}] SecurityGuard watching Oracle`);
  }

  stopWatching(patientId: string): void {
    const sub = this.subscriptions.get(patientId);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(patientId);
    }
  }

  getOrCreateMachine(patientId: string): SecurityGuardMachine {
    if (!this.machines.has(patientId)) {
      this.machines.set(patientId, new SecurityGuardMachine({ patientId: '' }));
    }
    return this.machines.get(patientId)!;
  }

  getState(patientId: string): SecurityGuardMachineState {
    return this.getOrCreateMachine(patientId).getState();
  }

  /**
   * Envoie OVERRIDE_REQUEST à la machine (DEFCON_3 → OVERRIDE_ACTIVE).
   * À appeler depuis le frontend quand l'utilisateur force le passage.
   * @param reason Justification pour l'audit (Module L - Feedback).
   */
  sendOverride(
    patientId: string,
    reason?: string,
  ): SecurityGuardMachineState {
    const machine = this.getOrCreateMachine(patientId);
    return machine.send({
      type: 'OVERRIDE_REQUEST',
      payload: reason ? { reason } : undefined,
    });
  }

  /**
   * Envoie VALIDATE_PRESCRIPTION (OVERRIDE_ACTIVE → SUBMITTED).
   * Déclenche logAuditTrail (Module L) puis état terminal succès.
   */
  sendValidatePrescription(patientId: string): SecurityGuardMachineState {
    const machine = this.getOrCreateMachine(patientId);
    return machine.send({ type: 'VALIDATE_PRESCRIPTION' });
  }

  /**
   * Envoie RESET (SUBMITTED → IDLE) pour une nouvelle prescription.
   */
  sendReset(patientId: string): SecurityGuardMachineState {
    const machine = this.getOrCreateMachine(patientId);
    return machine.send({ type: 'RESET' });
  }

  onModuleDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
