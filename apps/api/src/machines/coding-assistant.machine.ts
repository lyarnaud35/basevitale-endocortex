import { setup, assign, fromPromise } from 'xstate';
import type { CodingContext, CodingEvent, CodingState } from '@basevitale/cortex-sdk';

/**
 * SEMaine 3 - Le Stratège (CodingAssistantMachine)
 * Machine probabiliste découplée de la SecurityGuardMachine.
 * Factory injectant le simulateur (ou futur LLM) pour invoker l'analyse en ANALYZING.
 */

const defaultContext: CodingContext = {
  currentInput: '',
  minConfidenceThreshold: 0.4,
  suggestions: [],
};

export type CodingSimulatorLike = {
  analyzeText(text: string): Promise<CodingEvent>;
};

/** Événement "done" de l'acteur invoqué (output = CodingEvent). */
type DoneEvent = { output: CodingEvent };

export function createCodingMachine(simulator: CodingSimulatorLike) {
  const analyzeActor = fromPromise(
    async ({ input }: { input: { text: string } }) => simulator.analyzeText(input.text),
  );

  // TODO: Refactor types for strict compliance (XState + TS strict in E2E)
  const codingSetup = setup({
    types: {} as { context: CodingContext; events: CodingEvent; tags: never },
    actors: { analyzeContent: analyzeActor },
    guards: {
      isAnalysisFailed: ({ event }: any) =>
        event?.output?.type === 'ANALYSIS_FAILED',
      belowConfidenceThreshold: ({ context, event }: any) => {
        const out = event?.output;
        if (out?.type !== 'ANALYSIS_COMPLETE' || !out.data?.length) return true;
        const best = Math.max(...out.data.map((d: { confidence: number }) => d.confidence), 0);
        return best < context.minConfidenceThreshold;
      },
    },
    actions: {
      assignInput: assign({
        currentInput: ({ event }: any) =>
          event?.type === 'INPUT_UPDATED' ? event.text : '',
      }),
      assignSuggestionsFromOutput: assign({
        suggestions: ({ event }: any) =>
          event?.output?.type === 'ANALYSIS_COMPLETE'
            ? event.output.data.map((d: { code: string; label: string; confidence: number }) => ({
                code: d.code,
                label: d.label,
                confidence: d.confidence,
              }))
            : [],
      }),
      assignErrorFromOutput: assign({
        lastError: ({ event }: any) =>
          event?.output?.type === 'ANALYSIS_FAILED' ? event.output.error : undefined,
      }),
      assignErrorFromError: assign({
        lastError: ({ event }: any) =>
          event?.error != null ? String(event.error) : undefined,
      }),
    },
  } as any);

  const config = {
    id: 'codingAssistant',
    initial: 'IDLE' as CodingState,
    context: defaultContext,
    states: {
      IDLE: {
        on: {
          INPUT_UPDATED: {
            target: 'DEBOUNCING',
            actions: ['assignInput'],
          },
        },
      },
      DEBOUNCING: {
        after: {
          500: { target: 'ANALYZING' },
        },
        on: {
          INPUT_UPDATED: {
            target: 'DEBOUNCING',
            actions: ['assignInput'],
          },
        },
      },
      ANALYZING: {
        invoke: {
          id: 'analyzeContent',
          src: 'analyzeContent',
          input: ({ context }: { context: CodingContext }) => ({ text: context.currentInput }),
          onDone: [
            {
              guard: 'isAnalysisFailed',
              target: 'FAILURE',
              actions: ['assignErrorFromOutput'],
            },
            {
              guard: 'belowConfidenceThreshold',
              target: 'SILENT',
              actions: ['assignSuggestionsFromOutput'],
            },
            {
              target: 'SUGGESTING',
              actions: ['assignSuggestionsFromOutput'],
            },
          ],
          onError: {
            target: 'FAILURE',
            actions: ['assignErrorFromError'],
          },
        },
      },
      SUGGESTING: {
        on: {
          INPUT_UPDATED: {
            target: 'DEBOUNCING',
            actions: ['assignInput'],
          },
        },
      },
      SILENT: {
        on: {
          INPUT_UPDATED: {
            target: 'DEBOUNCING',
            actions: ['assignInput'],
          },
        },
      },
      FAILURE: {
        on: {
          INPUT_UPDATED: {
            target: 'DEBOUNCING',
            actions: ['assignInput'],
          },
        },
      },
    },
  };
  // TODO: Refactor types for strict compliance
  return codingSetup.createMachine(config as any);
}

export type CodingAssistantMachineType = ReturnType<typeof createCodingMachine>;
