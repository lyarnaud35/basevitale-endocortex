import { Injectable, Logger } from '@nestjs/common';
import { PrescriptionGuardService } from '../security/prescription-guard.service';
import type { SecurityGuardWsState } from '@basevitale/shared';

/**
 * États du cycle de vie de la consultation (Machine à États – Module O).
 * L'Orchestrateur ne fait pas le travail : il décide QUI joue et QUAND.
 */
export type ConsultationState =
  | 'IDLE'
  | 'IN_PROGRESS'
  | 'BLOCKED_BY_SECURITY'
  | 'READY_TO_SIGN';

export interface PrescribeIntent {
  type: 'PRESCRIBE';
  drugId: string;
  patientContext?: Record<string, unknown>;
}

export interface PrescribeResult {
  state: ConsultationState;
  message: string;
  securityDetails?: SecurityGuardWsState;
}

/**
 * Cerveau Central – Chef d'Orchestre de la visite patient.
 * Interroge les organes (Sécurité, puis Coding plus tard), décide de l'état global.
 * Ne code pas, ne vérifie pas les allergies : il délègue et agrège.
 */
@Injectable()
export class ConsultationOrchestratorService {
  private readonly logger = new Logger(ConsultationOrchestratorService.name);

  private currentState: ConsultationState = 'IDLE';

  constructor(private readonly guard: PrescriptionGuardService) {}

  /**
   * Reçoit une intention (ex: PRESCRIBE), interroge la Sécurité, met à jour l'état global.
   * Utilise une session éphémère pour le gardien, puis la détruit (pas de fuite).
   */
  async processIntent(intent: PrescribeIntent): Promise<PrescribeResult> {
    const { type, drugId, patientContext } = intent;
    this.logger.log(`Processing intent: ${type} for ${drugId}`);

    const sessionId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const securityCheck = this.guard.checkPrescription(sessionId, {
        drugId,
        patientContext,
      });

      if (securityCheck.value === 'LOCKED') {
        this.currentState = 'BLOCKED_BY_SECURITY';
        this.guard.destroySession(sessionId);
        return {
          state: this.currentState,
          message: 'Action bloquée par le protocole de sécurité.',
          securityDetails: securityCheck,
        };
      }

      this.currentState = 'IN_PROGRESS';
      this.guard.destroySession(sessionId);
      return {
        state: this.currentState,
        message: 'Prescription validée. Suggestion de codage en cours...',
        securityDetails: securityCheck,
      };
    } finally {
      this.guard.destroySession(sessionId);
    }
  }

  getCurrentState(): ConsultationState {
    return this.currentState;
  }

  /** Remet l'état à IDLE (ex: nouvelle consultation). */
  reset(): void {
    this.currentState = 'IDLE';
  }
}
