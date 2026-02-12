import type { SecurityGuardWsState, SecurityGuardState } from '@basevitale/shared';

/** Mots-clés d'allergie simulés → passage en LOCKED. */
const ALLERGY_KEYWORDS = ['pénicilline', 'penicilline', 'penicillin', 'amoxicilline'];

type Context = {
  drugId: string | null;
  blockReason: string | null;
  patientContext: Record<string, unknown> | null;
  overrideReason: string | null;
};

/**
 * Machine du Gardien (prescription) – session-scoped.
 * Règle critique : en LOCKED, seule REQUEST_OVERRIDE est acceptée.
 */
export class PrescriptionGuardMachine {
  private state: SecurityGuardState = 'IDLE';
  private context: Context = {
    drugId: null,
    blockReason: null,
    patientContext: null,
    overrideReason: null,
  };

  private buildSnapshot(): SecurityGuardWsState {
    const canSubmit =
      this.state === 'SECURE' || this.state === 'OVERRIDE_PENDING';
    return {
      value: this.state,
      context: {
        drugId: this.context.drugId,
        blockReason: this.context.blockReason,
        patientContext: this.context.patientContext,
        overrideReason: this.context.overrideReason ?? undefined,
      },
      canSubmit,
    };
  }

  /** Vérification d’un médicament : IDLE → ANALYZING → SECURE ou LOCKED. */
  checkPrescription(drugId: string, patientContext?: Record<string, unknown>): SecurityGuardWsState {
    if (this.state !== 'IDLE' && this.state !== 'SECURE' && this.state !== 'OVERRIDE_PENDING') {
      return this.buildSnapshot();
    }

    this.state = 'ANALYZING';
    this.context.drugId = drugId;
    this.context.patientContext = patientContext ?? null;
    this.context.blockReason = null;
    this.context.overrideReason = null;

    const text = [drugId, JSON.stringify(patientContext ?? {})].join(' ').toLowerCase();
    const hasAllergy = ALLERGY_KEYWORDS.some((kw) => text.includes(kw));

    if (hasAllergy) {
      this.state = 'LOCKED';
      this.context.blockReason = 'Allergie connue aux bêtalactamines';
    } else {
      this.state = 'SECURE';
    }

    return this.buildSnapshot();
  }

  /** Demande de dérogation : acceptée uniquement en LOCKED. */
  requestOverride(reason: string): SecurityGuardWsState {
    if (this.state !== 'LOCKED') {
      return this.buildSnapshot();
    }
    this.state = 'OVERRIDE_PENDING';
    this.context.overrideReason = reason;
    return this.buildSnapshot();
  }

  getSnapshot(): SecurityGuardWsState {
    return this.buildSnapshot();
  }
}
