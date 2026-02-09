import { z } from 'zod';

/**
 * SEMaine 3 - Le Stratège (Cortex SDK)
 * Topologie des états – contrat Zod défini AVANT toute logique.
 * Machine de codage probabiliste : découplée de la SecurityGuardMachine.
 */

// 1. LE CONTEXTE (La Mémoire de Travail)
export const CodingContextSchema = z.object({
  currentInput: z.string().default(''),
  minConfidenceThreshold: z.number().min(0).max(1).default(0.4),
  suggestions: z
    .array(
      z.object({
        code: z.string(),
        label: z.string(),
        confidence: z.number().min(0).max(1),
        reasoning: z.string().optional(),
      })
    )
    .default([]),
  lastError: z.string().optional(),
});

export type CodingContext = z.infer<typeof CodingContextSchema>;

// 2. LES ÉTATS (La Carte Topologique)
export const CodingStateSchema = z.enum([
  'IDLE',
  'DEBOUNCING',
  'ANALYZING',
  'SUGGESTING',
  'SILENT',
  'FAILURE',
]);

export type CodingState = z.infer<typeof CodingStateSchema>;

// 3. LES ÉVÉNEMENTS (Les Triggers)
export const CodingEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INPUT_UPDATED'), text: z.string() }),
  z.object({ type: z.literal('TRIGGER_ANALYSIS') }),
  z.object({
    type: z.literal('ANALYSIS_COMPLETE'),
    data: z.array(
      z.object({
        code: z.string(),
        label: z.string(),
        confidence: z.number(),
      })
    ),
  }),
  z.object({ type: z.literal('ANALYSIS_FAILED'), error: z.string() }),
]);

export type CodingEvent = z.infer<typeof CodingEventSchema>;

/** Réponse GET /api/coding/strategist/state (contrat Frontend ↔ Backend). */
export const CodingStrategistStateSchema = z.object({
  value: z.string(),
  context: z.object({
    currentInput: z.string(),
    suggestions: z.array(
      z.object({
        code: z.string(),
        label: z.string(),
        confidence: z.number(),
      })
    ),
    lastError: z.string().optional(),
  }),
  shouldDisplay: z.boolean(),
});
export type CodingStrategistState = z.infer<typeof CodingStrategistStateSchema>;
