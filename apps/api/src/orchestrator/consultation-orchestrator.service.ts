import { Injectable, Logger } from '@nestjs/common';
import { PrescriptionGuardService } from '../security/prescription-guard.service';
import type { CodingSuggestionItem } from '@basevitale/shared';
import { CodingSimulatorService } from '../coding/coding-simulator.service';
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

  constructor(
    private readonly guard: PrescriptionGuardService,
    private readonly codingSimulator: CodingSimulatorService,
  ) {}

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

  /**
   * Module B+ – Analyse de symptômes (texte) → suggestions de codes CIM-10.
   * Passe toujours par l'Orchestrateur (Cerveau Central), pas d'appel direct au Coding.
   */
  async analyzeSymptoms(text: string): Promise<{ suggestions: CodingSuggestionItem[] }> {
    this.logger.log(`Analyze symptoms: "${(text || '').slice(0, 60)}..."`);
    const suggestions = this.codingSimulator.suggestCodes(text || '');
    return { suggestions };
  }

  /**
   * Fusion des hémisphères – Analyse complète en un appel.
   * Lance en parallèle : Gardien (C+) et Stratège (B+). Ne modifie pas l'état global de la consultation.
   */
  async analyzeText(
    text: string,
    patientId?: string,
  ): Promise<{ security: SecurityGuardWsState; suggestions: CodingSuggestionItem[] }> {
    const t = (text || '').trim();
    this.logger.log(`Analyze full context: "${t.slice(0, 60)}..."`);
    const sessionId = `analyze-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const drugId = this.extractDrugFromText(t);
    const patientContext = patientId != null ? { patientId } : undefined;

    try {
      const [suggestions, security] = await Promise.all([
        Promise.resolve(this.codingSimulator.suggestCodes(t)),
        Promise.resolve(
          this.guard.checkPrescription(sessionId, { drugId, patientContext }),
        ),
      ]);
      return { security, suggestions };
    } finally {
      this.guard.destroySession(sessionId);
    }
  }

  /** Mock : extrait un médicament depuis le texte pour le Gardien (C+). */
  private extractDrugFromText(text: string): string {
    const lower = text.toLowerCase();
    if (/\b(penicilline|pénicilline|amoxicilline|penicillin)\b/.test(lower))
      return 'Pénicilline';
    if (/\b(doliprane|paracetamol|paracétamol)\b/.test(lower)) return 'Doliprane';
    return '';
  }
}
