import { setup, assign, fromPromise } from 'xstate';
import {
  ScribeContext,
  ScribeEvent,
  ScribeState,
  ScribeContextSchema,
} from '@basevitale/shared';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';

/** ID Patient Zéro (aligné avec libs/shared/mocks/patient-zero.ts) — évite dépendance runtime au build shared. */
const PATIENT_ZERO_ID = 'PATIENT_ZERO';

/**
 * GHOST PROTOCOL v999 - ScribeMachine (XState v5)
 * 
 * Machine à états finis pour le module Scribe.
 * Utilise XState v5 avec setup() pour un typage strict.
 * 
 * LOI I : SOUVERAINETÉ DE L'ÉTAT
 * - Le Backend est l'UNIQUE source de vérité
 * - Les transitions sont strictes et définies par la machine
 * 
 * LOI II : TRANSITIONS STRICTES
 * - IDLE -> RECORDING (START)
 * - RECORDING -> PROCESSING (STOP)
 * - PROCESSING -> REVIEW (auto après analyse)
 * - REVIEW -> SAVED (CONFIRM)
 * 
 * LOI III : TYPAGE INVIOLABLE
 * - Tous les types sont inférés depuis les schémas Zod
 * - TypeScript valide les transitions à la compilation
 */

/** Payload de charge cognitive fixe pour les tests (Charge Cognitive / Patient Zéro) */
const MOCK_CONSULTATION_PAYLOAD = {
  transcription: 'Le patient signale une forte fièvre et des douleurs thoraciques.',
  symptoms: ['Fièvre', 'Douleur thoracique'],
  suspectedDiagnosis: 'Infection pulmonaire',
  patientId: PATIENT_ZERO_ID,
} as const;

/**
 * Simulation de l'appel IA (mock robuste — charge cognitive fixe pour test)
 * 
 * Retourne systématiquement un payload riche pour valider la circulation des données.
 * Simule un délai de 2 secondes.
 */
const simulateNlpAnalysis = fromPromise<
  { entities: string[]; consultation: Consultation },
  { transcript: string; patientId: string }
>(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const transcript =
    (input.transcript && input.transcript.trim()) || MOCK_CONSULTATION_PAYLOAD.transcription;
  const patientId = input.patientId?.trim() || PATIENT_ZERO_ID;

  const entities = [...MOCK_CONSULTATION_PAYLOAD.symptoms];

  const consultation: Consultation = {
    patientId,
    transcript,
    symptoms: [...MOCK_CONSULTATION_PAYLOAD.symptoms],
    diagnosis: [
      {
        code: 'J18.9',
        label: MOCK_CONSULTATION_PAYLOAD.suspectedDiagnosis,
        confidence: 0.9,
      },
    ],
    medications: [],
    billingCodes: [],
    prescription: [],
  };

  return {
    entities,
    consultation,
  };
});

/**
 * Machine XState v5 avec setup() pour typage strict
 * 
 * Utilise setup() pour garantir que :
 * - Les types de contexte correspondent à ScribeContext
 * - Les types d'événements correspondent à ScribeEvent
 * - Les transitions sont validées à la compilation
 */
const scribeSetup = setup({
  types: {} as {
    context: ScribeContext;
    events: { type: string } & ScribeEvent;
  },
  actors: {
    simulateNlpAnalysis,
  },
  actions: {
    /**
     * Initialise le patientId lors du START
     */
    assignPatientId: assign({
      patientId: ({ event }) => {
        if (event.type === 'START') {
          return event.payload.patientId;
        }
        return '';
      },
      status: 'recording',
      metadata: ({ context, event }) => {
        if (event.type === 'START') {
          return {
            ...context.metadata,
            startedAt: new Date().toISOString(),
            source: 'microphone' as const,
          };
        }
        return context.metadata;
      },
    }),

    /**
     * Met à jour le transcript lors de UPDATE_TEXT
     */
    assignTranscript: assign({
      transcript: ({ event }) => {
        if (event.type === 'UPDATE_TEXT') {
          return event.payload.text;
        }
        return '';
      },
    }),

    /**
     * Assigne le transcript final lors du STOP
     */
    assignFinalTranscript: assign({
      transcript: ({ event }) => {
        if (event.type === 'STOP') {
          return event.payload.transcript;
        }
        return '';
      },
      status: 'processing',
      metadata: ({ context }) => ({
        ...context.metadata,
        stoppedAt: new Date().toISOString(),
      }),
    }),

    /**
     * Assigne les résultats de l'analyse NLP
     */
    assignNlpResults: assign({
      entities: ({ event }) => {
        const e = event as { type: string; output?: { entities: string[]; consultation: Consultation } };
        if (e.type === 'xstate.done.actor.simulateNlpAnalysis' && e.output) {
          return e.output.entities;
        }
        return [];
      },
      consultation: ({ event }) => {
        const e = event as { type: string; output?: { entities: string[]; consultation: Consultation } };
        if (e.type === 'xstate.done.actor.simulateNlpAnalysis' && e.output) {
          return e.output.consultation;
        }
        return null;
      },
      status: 'review',
      metadata: ({ context }) => ({
        ...context.metadata,
        processedAt: new Date().toISOString(),
      }),
    }),

    /**
     * Gère les erreurs lors de l'analyse NLP
     */
    assignError: assign({
      error: ({ event }) => {
        const e = event as { type: string; error?: { message?: string } };
        if (e.type === 'xstate.error.actor.simulateNlpAnalysis' && e.error) {
          return e.error?.message || 'Erreur lors de l\'analyse NLP';
        }
        return null;
      },
      status: 'idle',
    }),

    /**
     * Réinitialise le contexte lors du RESET
     */
    resetContext: assign({
      transcript: '',
      entities: [],
      consultation: null,
      draftId: null,
      error: null,
      status: 'idle',
      metadata: undefined,
    }),

    /**
     * Finalise la consultation lors du CONFIRM
     */
    assignConfirmation: assign({
      status: 'saved',
      consultation: ({ context, event }) => {
        if (event.type === 'CONFIRM' && event.payload?.structuredData) {
          // Fusionner les corrections avec la consultation existante
          return {
            ...context.consultation!,
            ...event.payload.structuredData,
          } as Consultation;
        }
        return context.consultation;
      },
    }),
  },
});

const defaultContext: ScribeContext = {
  patientId: PATIENT_ZERO_ID,
  transcript: '',
  entities: [],
  status: 'idle',
  consultation: null,
  draftId: null,
  error: null,
  metadata: undefined,
};

const scribeMachineConfig = {
  id: 'scribeMachine',
  initial: 'IDLE' as const,
  context: defaultContext,
  states: {
    IDLE: {
      on: {
        START: {
          target: 'RECORDING',
          actions: ['assignPatientId'],
        },
        RESET: {
          actions: ['resetContext'],
        },
      },
    },
    RECORDING: {
      on: {
        UPDATE_TEXT: {
          actions: ['assignTranscript'],
        },
        STOP: {
          target: 'PROCESSING',
          actions: ['assignFinalTranscript'],
        },
        RESET: {
          target: 'IDLE',
          actions: ['resetContext'],
        },
      },
    },
    PROCESSING: {
      invoke: {
        id: 'simulateNlpAnalysis',
        src: 'simulateNlpAnalysis',
        input: ({ context }) => ({
          transcript: context.transcript,
          patientId: context.patientId,
        }),
        onDone: {
          target: 'REVIEW',
          actions: ['assignNlpResults'],
        },
        onError: {
          target: 'IDLE',
          actions: ['assignError'],
        },
      },
      on: {
        RESET: {
          target: 'IDLE',
          actions: ['resetContext'],
        },
      },
    },
    REVIEW: {
      on: {
        UPDATE_TEXT: {
          actions: ['assignTranscript'],
        },
        CONFIRM: {
          target: 'SAVED',
          actions: ['assignConfirmation'],
        },
        RESET: {
          target: 'IDLE',
          actions: ['resetContext'],
        },
      },
    },
    SAVED: {
      type: 'final',
      on: {
        RESET: {
          target: 'IDLE',
          actions: ['resetContext'],
        },
      },
    },
  },
};

/** Machine par défaut (contexte vide) */
export const scribeMachineSetup = scribeSetup.createMachine(scribeMachineConfig as any);

/**
 * Crée une instance de la machine avec le contexte initial donné.
 * Utilisé par ScribeGhostMachine pour chaque session.
 */
export function createScribeMachineWithContext(initialContext: ScribeContext) {
  return scribeSetup.createMachine({
    ...scribeMachineConfig,
    context: initialContext,
  } as any);
}

export type ScribeMachineType = ReturnType<typeof createScribeMachineWithContext>;
