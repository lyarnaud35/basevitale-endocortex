import { Injectable, Logger, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { CodingAssistantMachine } from './coding-assistant.machine';
import type { CodingAssistantMachineState } from './coding-assistant-machine.schema';
import type { PatientContextMachineState } from '../oracle/patient-context-machine.schema';
import { OracleGhostService } from '../oracle/oracle-ghost.service';

/**
 * GHOST PROTOCOL - CodingAssistantService (Semaine 3 - Le Stratège)
 * Observateur : écoute l'Oracle. Dès que READY, envoie ORACLE_READY à la CodingAssistantMachine.
 */
@Injectable()
export class CodingAssistantService implements OnModuleDestroy {
  private readonly logger = new Logger(CodingAssistantService.name);
  private readonly machines = new Map<string, CodingAssistantMachine>();
  private readonly subscriptions = new Map<string, Subscription>();

  constructor(
    @Inject(forwardRef(() => OracleGhostService))
    private readonly oracleGhostService: OracleGhostService,
  ) {}

  /**
   * Démarre l'observation de l'Oracle pour ce patient.
   * Dès que l'Oracle émet READY, le contexte est envoyé à la CodingAssistantMachine.
   */
  startWatching(patientId: string): void {
    if (this.subscriptions.has(patientId)) {
      this.logger.debug(`[${patientId}] CodingAssistant already watching`);
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
          this.logger.debug(
            `[${patientId}] Oracle READY → CodingAssistant ${machine.value}`,
          );
          // Scénario B "L'Incertitude" : confiance basse → SILENT, suggestions vides.
          // (Pour SUGGESTING : mettre confidenceHigh: true et suggestions non vides.)
          const MOCK_DELAY_MS = 2000;
          setTimeout(() => {
            machine.send({
              type: 'ANALYSIS_DONE',
              payload: { suggestions: [], confidenceHigh: false },
            });
            this.logger.debug(`[${patientId}] CodingAssistant mock → SILENT (aucune suggestion)`);
          }, MOCK_DELAY_MS);
        }
      },
      error: (err) =>
        this.logger.warn(`[${patientId}] Oracle stream error (CodingAssistant)`, err),
    });
    this.subscriptions.set(patientId, sub);
    this.logger.debug(`[${patientId}] CodingAssistant watching Oracle`);
  }

  stopWatching(patientId: string): void {
    const sub = this.subscriptions.get(patientId);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(patientId);
    }
  }

  getOrCreateMachine(patientId: string): CodingAssistantMachine {
    if (!this.machines.has(patientId)) {
      this.machines.set(patientId, new CodingAssistantMachine({ patientId: '' }));
    }
    return this.machines.get(patientId)!;
  }

  getState(patientId: string): CodingAssistantMachineState {
    return this.getOrCreateMachine(patientId).getState();
  }

  onModuleDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
