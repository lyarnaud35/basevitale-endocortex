import { Logger } from '@nestjs/common';
import type {
  SecurityGuardState,
  SecurityGuardContext,
  SecurityGuardEvent,
  SecurityGuardMachineState,
  OracleReadyEvent,
  SecurityAuditEvent,
} from './security-guard-machine.schema';
import type { PatientContextData } from '../oracle/patient-context-machine.schema';

/** Mots-clés d'allergies critiques déclenchant DEFCON_3 (vigilance accrue). */
const CRITICAL_ALLERGY_KEYWORDS = ['pénicilline', 'penicilline', 'penicillin', 'amoxicilline'];

/** Règle dérivée des alertes pour l'audit Module L (ex. ALLERGY_PENICILLIN). */
function deriveRuleBroken(patientContext: PatientContextData | null): string {
  if (!patientContext?.alertes?.length) return 'UNKNOWN_RULE';
  const firstHigh = patientContext.alertes.find((a) => a.level === 'HIGH');
  const msg = (firstHigh?.message ?? patientContext.alertes[0].message).toLowerCase();
  if (msg.includes('pénicilline') || msg.includes('penicillin') || msg.includes('amoxicilline'))
    return 'ALLERGY_PENICILLIN';
  return 'ALLERGY_OR_VIGILANCE';
}

function hasCriticalAllergy(context: PatientContextData): boolean {
  const text = [
    ...context.alertes.map((a) => a.message),
    ...context.timeline.map((t) => t.summary),
  ]
    .join(' ')
    .toLowerCase();
  return CRITICAL_ALLERGY_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * GHOST PROTOCOL - SecurityGuardMachine (Semaine 2 - La Loi Martiale)
 * Observateur : écoute l'Oracle ; dès que READY, récupère le patientContext.
 * Si allergie critique (ex. Pénicilline) → DEFCON_3 (vigilance accrue).
 */
export class SecurityGuardMachine {
  private readonly logger = new Logger(SecurityGuardMachine.name);
  private state: SecurityGuardState = 'IDLE';
  private context: SecurityGuardContext;
  private updatedAt: Date = new Date();

  constructor(initialContext: Partial<SecurityGuardContext> = {}) {
    this.context = {
      patientId: initialContext.patientId ?? '',
      patientContext: initialContext.patientContext ?? null,
    };
  }

  send(event: SecurityGuardEvent): SecurityGuardMachineState {
    this.logger.debug(`[${this.state}] Received event: ${event.type}`);

    if (this.state === 'IDLE' && event.type === 'ORACLE_READY') {
      const { patientId, context } = (event as OracleReadyEvent).payload;
      this.context.patientId = patientId;
      this.context.patientContext = context;
      this.updatedAt = new Date();
      if (hasCriticalAllergy(context)) {
        this.state = 'DEFCON_3';
        this.logger.warn(`[${patientId}] DEFCON_3: allergie critique détectée`);
      }
      return this.getState();
    }

    if (this.state === 'DEFCON_3' && event.type === 'OVERRIDE_REQUEST') {
      const reason =
        (event as { type: 'OVERRIDE_REQUEST'; payload?: { reason?: string } }).payload?.reason ??
        'Non précisée';
      this.logger.warn(
        `[AUDIT] Dérogation activée par médecin. Raison: ${reason}`,
      );
      this.updatedAt = new Date();
      this.context.lastOverride = {
        at: this.updatedAt.toISOString(),
        reason,
      };
      this.context.activeOverride = {
        reason,
        at: this.updatedAt.toISOString(),
        author: 'Dr. House', // Simulé pour l'instant
      };
      this.state = 'OVERRIDE_ACTIVE';
      this.logger.warn(
        `[${this.context.patientId}] OVERRIDE_REQUEST → OVERRIDE_ACTIVE (dérogation active, danger toujours présent)`,
      );
      return this.getState();
    }

    if (this.state === 'OVERRIDE_ACTIVE' && event.type === 'VALIDATE_PRESCRIPTION') {
      this.logAuditTrail();
      this.updatedAt = new Date();
      this.state = 'SUBMITTED';
      this.context.activeOverride = undefined;
      this.logger.log(
        `[${this.context.patientId}] VALIDATE_PRESCRIPTION → SUBMITTED (ordonnance transmise, trace Module L)`,
      );
      return this.getState();
    }

    if (this.state === 'SUBMITTED' && event.type === 'RESET') {
      this.state = 'IDLE';
      this.updatedAt = new Date();
      this.logger.log(`[${this.context.patientId}] RESET → IDLE (nouvelle prescription)`);
      return this.getState();
    }

    return this.getState();
  }

  /**
   * Module L – Audit structuré (JSON pur, une ligne par événement).
   * Consommable par pipelines de logs et future IA d'apprentissage (Semaine 6+).
   */
  private logAuditTrail(): void {
    const ov = this.context.activeOverride ?? this.context.lastOverride;
    const reason = ov?.reason ?? 'Non précisée';
    const author = this.context.activeOverride?.author ?? 'Médecin';
    const auditEvent: SecurityAuditEvent = {
      event_type: 'SECURITY_OVERRIDE',
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      context: {
        patient_id: this.context.patientId,
        rule_broken: deriveRuleBroken(this.context.patientContext ?? null),
        drug_id: 'AMOXICILLINE', // Idéalement dynamique (ordonnance réelle, Semaine 6+)
      },
      decision: {
        author,
        justification: reason,
        outcome: 'SUBMITTED',
      },
    };
    this.logger.log(JSON.stringify(auditEvent));
  }

  getState(): SecurityGuardMachineState {
    return {
      value: this.state,
      context: { ...this.context },
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  get value(): SecurityGuardState {
    return this.state;
  }

  get ctx(): SecurityGuardContext {
    return { ...this.context };
  }
}
