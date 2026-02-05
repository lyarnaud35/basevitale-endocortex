import { setup, assign, fromPromise } from 'xstate';
import type { CodingContext, CodingSuggestionItem } from '@basevitale/shared';

const THRESHOLD = 0.6;

const defaultContext: CodingContext = {
  lastInput: '',
  suggestions: [],
};

export type AnalyzeFn = (text: string) => Promise<CodingSuggestionItem[]>;

function createAnalyzeActor(analyzeFn: AnalyzeFn) {
  return fromPromise<{ suggestions: CodingSuggestionItem[] }, { text: string }>(
    async ({ input }) => {
      const suggestions = await analyzeFn(input.text);
      return { suggestions };
    }
  );
}

export function createCodingMachine(analyzeFn: AnalyzeFn) {
  const analyzeActor = createAnalyzeActor(analyzeFn);

  type DoneAnalyzeEvent = {
    type: 'xstate.done.actor.analyze';
    output: { suggestions: CodingSuggestionItem[] };
  };

  const codingSetup = setup({
    types: {} as {
      context: CodingContext;
      events:
        | { type: 'ANALYZE_TEXT'; payload: { text: string } }
        | { type: 'ACCEPT_CODE'; payload: { code: string; label?: string } }
        | { type: 'RESET'; payload?: unknown }
        | DoneAnalyzeEvent;
    },
    actors: { analyze: analyzeActor },
    guards: {
      hasHighConfidence: ({ event }) => {
        if (event.type !== 'xstate.done.actor.analyze' || !event.output?.suggestions) return false;
        const best = Math.max(
          ...event.output.suggestions.map((s) => s.confidence),
          0
        );
        return best >= THRESHOLD;
      },
    },
    actions: {
      assignLastInput: assign({
        lastInput: ({ event }) =>
          event.type === 'ANALYZE_TEXT' ? event.payload.text : '',
      }),
      assignSuggestions: assign({
        suggestions: ({ event }) => {
          if (event.type === 'xstate.done.actor.analyze' && event.output?.suggestions) {
            return event.output.suggestions;
          }
          return [];
        },
      }),
      resetContext: assign({
        lastInput: '',
        suggestions: [],
      }),
    },
  });

  const config = {
    id: 'codingMachine',
    initial: 'IDLE' as const,
    context: defaultContext,
    states: {
      IDLE: {
        on: {
          ANALYZE_TEXT: {
            target: 'ANALYZING',
            actions: ['assignLastInput'],
          },
          RESET: { actions: ['resetContext'] },
        },
      },
      ANALYZING: {
        invoke: {
          id: 'analyze',
          src: 'analyze',
          input: ({ context }) => ({ text: context.lastInput || '' }),
          onDone: [
            {
              guard: 'hasHighConfidence',
              target: 'SUGGESTING',
              actions: ['assignSuggestions'],
            },
            {
              target: 'SILENT',
              actions: ['assignSuggestions'],
            },
          ],
          onError: {
            target: 'IDLE',
            actions: ['resetContext'],
          },
        },
        on: {
          RESET: { target: 'IDLE', actions: ['resetContext'] },
        },
      },
      SUGGESTING: {
        on: {
          ANALYZE_TEXT: {
            target: 'ANALYZING',
            actions: ['assignLastInput'],
          },
          ACCEPT_CODE: { actions: [] },
          RESET: { target: 'IDLE', actions: ['resetContext'] },
        },
      },
      SILENT: {
        on: {
          ANALYZE_TEXT: {
            target: 'ANALYZING',
            actions: ['assignLastInput'],
          },
          RESET: { target: 'IDLE', actions: ['resetContext'] },
        },
      },
    },
  };

  return codingSetup.createMachine(config as any);
}

export type CodingMachineType = ReturnType<typeof createCodingMachine>;
