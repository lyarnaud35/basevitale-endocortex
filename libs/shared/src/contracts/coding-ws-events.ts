import { z } from 'zod';

/**
 * CONTRAT DIAMANT – WebSocket namespace /coding (Stratège).
 * Source de vérité unique Backend ↔ Frontend. Ne pas dupliquer ces types.
 */

/** Une suggestion de code CIM-10 avec confiance. */
export const CodingSuggestionSchema = z.object({
  code: z.string(),
  label: z.string(),
  confidence: z.number().min(0).max(1),
});

/** Contexte exposé par la machine (state_updated). */
export const CodingStateContextSchema = z.object({
  currentInput: z.string(),
  suggestions: z.array(CodingSuggestionSchema),
  lastError: z.string().optional(),
});

/**
 * Payload de l’événement `state_updated` (Backend → Frontend) – namespace /coding.
 * Nom distinct de CodingMachineState (coding-machine.schema) pour éviter conflit d’export.
 */
export const CodingStrategistWsStateSchema = z.object({
  value: z.string(),
  context: CodingStateContextSchema,
  shouldDisplay: z.boolean(),
});

export type CodingStrategistWsState = z.infer<typeof CodingStrategistWsStateSchema>;

/**
 * Payload de l’événement `text_input` (Frontend → Backend).
 * Envoyé à chaque saisie utilisateur (debounce côté machine).
 */
export const CodingInputPayloadSchema = z.object({
  text: z.string(),
});

export type CodingInputPayload = z.infer<typeof CodingInputPayloadSchema>;
