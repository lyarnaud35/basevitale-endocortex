import { z } from 'zod';
import type { PatientContextData } from '../oracle/patient-context-machine.schema';
import { PatientContextDataSchema } from '../oracle/patient-context-machine.schema';
import { CodingSuggestionItemSchema } from '@basevitale/shared';

/**
 * GHOST PROTOCOL - CodingAssistantMachine (Semaine 3 - Le Stratège)
 * Observateur : s'abonne à l'Oracle ; dès que READY → ANALYZING → SUGGESTING ou SILENT.
 * Pas de logique LLM ici : squelette et câblage événementiel uniquement.
 */

/** États de la CodingAssistantMachine. */
export const CodingAssistantStateSchema = z.enum([
  'IDLE',
  'ANALYZING',
  'SUGGESTING',
  'SILENT',
]);
export type CodingAssistantState = z.infer<typeof CodingAssistantStateSchema>;

/** Contexte : dernier patientContext reçu + suggestions (remplies en SUGGESTING). */
export const CodingAssistantContextSchema = z.object({
  patientId: z.string().default(''),
  patientContext: PatientContextDataSchema.nullable().default(null),
  suggestions: z.array(CodingSuggestionItemSchema).default([]),
});
export type CodingAssistantContext = z.infer<
  typeof CodingAssistantContextSchema
>;

/** Événement : Oracle est READY, contexte patient disponible. */
export const CodingAssistantOracleReadyEventSchema = z.object({
  type: z.literal('ORACLE_READY'),
  payload: z.object({
    patientId: z.string().min(1),
    context: PatientContextDataSchema,
  }),
});
export type CodingAssistantOracleReadyEvent = z.infer<
  typeof CodingAssistantOracleReadyEventSchema
>;

/** Événement interne : analyse terminée (placeholder, sans LLM). */
export const AnalysisDoneEventSchema = z.object({
  type: z.literal('ANALYSIS_DONE'),
  payload: z.object({
    suggestions: z.array(CodingSuggestionItemSchema),
    confidenceHigh: z.boolean(),
  }),
});
export type AnalysisDoneEvent = z.infer<typeof AnalysisDoneEventSchema>;

export const CodingAssistantEventSchema = z.discriminatedUnion('type', [
  CodingAssistantOracleReadyEventSchema,
  AnalysisDoneEventSchema,
]);
export type CodingAssistantEvent = z.infer<typeof CodingAssistantEventSchema>;

/** État complet (pour stream / dashboard). */
export const CodingAssistantMachineStateSchema = z.object({
  value: CodingAssistantStateSchema,
  context: CodingAssistantContextSchema,
  updatedAt: z.string().datetime(),
});
export type CodingAssistantMachineState = z.infer<
  typeof CodingAssistantMachineStateSchema
>;
