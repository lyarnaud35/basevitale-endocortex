import { setup, assign, fromPromise } from 'xstate';
import type { SecurityContext, RiskLevel } from '@basevitale/shared';

/** Profil Patient Zéro (aligné avec libs/shared/mocks/patient-zero.ts) */
const PATIENT_ZERO = {
  id: 'PATIENT_ZERO',
  nom: 'Jean Test',
  allergies: ['AMOXICILLINE'],
} as const;

/**
 * Résultat du moteur de règles (mock).
 * HIGH = contre-indication (ex. allergie) -> LOCKED.
 */
export type RuleResult = { riskLevel: RiskLevel; blockReason: string | null };

/**
 * Mock : SI patient.allergies contient PENICILLINE/AMOXICILLINE ET drug == AMOXICILLINE -> HIGH.
 * Sinon -> SAFE.
 */
function checkDrugRule(drug: string): RuleResult {
  const normalized = drug.trim().toUpperCase();
  const allergies = [...PATIENT_ZERO.allergies].map((a) => String(a).toUpperCase());

  const isAmoxicillin = normalized.includes('AMOXICILLINE') || normalized === 'AMOXICILLINE';
  const hasPenicillinAllergy = allergies.some(
    (a) => a.includes('PENICILLINE') || a.includes('PÉNICILLINE') || a.includes('AMOXICILLINE')
  );

  if (isAmoxicillin && hasPenicillinAllergy) {
    return {
      riskLevel: 'HIGH',
      blockReason: `Contre-indication : le patient (${PATIENT_ZERO.nom}) est allergique à l'amoxicilline / pénicilline.`,
    };
  }
  return { riskLevel: 'NONE', blockReason: null };
}

const analyzeDrug = fromPromise<RuleResult, { drug: string }>(async ({ input }) => {
  await new Promise((r) => setTimeout(r, 400));
  return checkDrugRule(input.drug);
});

const defaultContext: SecurityContext = {
  currentDrug: null,
  riskLevel: 'NONE',
  blockReason: null,
  auditTrail: null,
};

const securitySetup = setup({
  types: {} as {
    context: SecurityContext;
    events:
      | { type: 'CHECK_DRUG'; payload: { drug: string } }
      | { type: 'RESET'; payload?: unknown }
      | { type: 'REQUEST_OVERRIDE'; payload: { justification: string } };
  },
  actors: { analyzeDrug },
  guards: {
    /** Preuve de conscience : justification obligatoire (min 10 caractères). */
    hasValidJustification: ({ event }) => {
      if (event.type !== 'REQUEST_OVERRIDE') return false;
      const j = event.payload?.justification?.trim() ?? '';
      return j.length >= 10;
    },
  },
  actions: {
    setDrug: assign({
      currentDrug: ({ event }) =>
        event.type === 'CHECK_DRUG' ? event.payload.drug : null,
    }),
    setSafe: assign({
      riskLevel: 'NONE',
      blockReason: null,
    }),
    setLocked: assign({
      riskLevel: ({ event }) => {
        const e = event as { type: string; output?: RuleResult };
        return e.output?.riskLevel ?? 'HIGH';
      },
      blockReason: ({ event }) => {
        const e = event as { type: string; output?: RuleResult };
        return e.output?.blockReason ?? 'Risque identifié.';
      },
    }),
    assignAuditTrail: assign({
      auditTrail: ({ event }) =>
        event.type === 'REQUEST_OVERRIDE' ? event.payload.justification : null,
    }),
    resetContext: assign({
      currentDrug: null,
      riskLevel: 'NONE',
      blockReason: null,
      auditTrail: null,
    }),
  },
});

const config = {
  id: 'securityMachine',
  initial: 'IDLE' as const,
  context: defaultContext,
  states: {
    IDLE: {
      on: {
        CHECK_DRUG: {
          target: 'ANALYZING',
          actions: ['setDrug'],
        },
        RESET: { actions: ['resetContext'] },
      },
    },
    ANALYZING: {
      invoke: {
        id: 'analyzeDrug',
        src: 'analyzeDrug',
        input: ({ context }) => ({ drug: context.currentDrug ?? '' }),
        onDone: [
          {
            guard: ({ event }) => event.output?.riskLevel === 'HIGH',
            target: 'LOCKED',
            actions: ['setLocked'],
          },
          {
            target: 'SAFE',
            actions: ['setSafe'],
          },
        ],
        onError: {
          target: 'SAFE',
          actions: ['setSafe'],
        },
      },
      on: {
        RESET: { target: 'IDLE', actions: ['resetContext'] },
      },
    },
    SAFE: {
      on: {
        CHECK_DRUG: {
          target: 'ANALYZING',
          actions: ['setDrug'],
        },
        RESET: { target: 'IDLE', actions: ['resetContext'] },
      },
    },
    LOCKED: {
      on: {
        REQUEST_OVERRIDE: [
          {
            guard: 'hasValidJustification',
            target: 'OVERRIDE_APPROVED',
            actions: ['assignAuditTrail'],
          },
          // Si la guard échoue, l'événement est ignoré → reste LOCKED
        ],
        RESET: { target: 'IDLE', actions: ['resetContext'] },
        CHECK_DRUG: {
          target: 'ANALYZING',
          actions: ['setDrug'],
        },
      },
    },
    OVERRIDE_APPROVED: {
      entry: () => {
        // Audit : context.auditTrail et context.currentDrug sont disponibles pour
        // enregistrement côté SecurityGhostService ou couche persistance (ex. log structuré).
      },
      on: {
        RESET: { target: 'IDLE', actions: ['resetContext'] },
        CHECK_DRUG: {
          target: 'ANALYZING',
          actions: ['setDrug'],
        },
      },
    },
  },
};

export const securityMachine = securitySetup.createMachine(config as any);

export function createSecurityMachineWithContext(
  initialContext: SecurityContext
): ReturnType<typeof securitySetup.createMachine> {
  return securitySetup.createMachine({
    ...config,
    context: initialContext,
  } as any);
}

export type SecurityMachineType = ReturnType<typeof createSecurityMachineWithContext>;
