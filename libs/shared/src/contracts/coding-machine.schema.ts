import { z } from 'zod';

/**
 * GHOST PROTOCOL — CodingMachine (Le Stratège)
 * Contrats partagés Backend ↔ Frontend.
 * Semaine 3 : Monde probabiliste + Silence Attentionnel (seuil de confiance).
 */

/** États possibles de la machine de codage CIM-10. */
export const CodingStateSchema = z.enum([
  'IDLE',
  'ANALYZING',
  'SILENT',      // Confiance trop basse → ne pas montrer de suggestions ("Chut")
  'SUGGESTING',  // Confiance haute → afficher les codes proposés
]);

export type CodingState = z.infer<typeof CodingStateSchema>;

/** Une suggestion de code (CIM-10) avec score de confiance 0.0–1.0. */
export const CodingSuggestionItemSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  label: z.string().min(1, 'Le libellé est requis'),
  confidence: z
    .number()
    .min(0, 'La confiance doit être entre 0 et 1')
    .max(1, 'La confiance doit être entre 0 et 1'),
});

export type CodingSuggestionItem = z.infer<typeof CodingSuggestionItemSchema>;

/** Contexte de la machine : texte analysé + suggestions (remplies en ANALYZING, interprétation selon l'état). */
export const CodingContextSchema = z.object({
  /** Dernier texte soumis à l'analyse. */
  lastInput: z.string().default(''),
  /** Résultats du moteur (toujours présents après analyse, mais affichés seulement en SUGGESTING). */
  suggestions: z.array(CodingSuggestionItemSchema).default([]),
});

export type CodingContext = z.infer<typeof CodingContextSchema>;

/** État complet de la machine (stream / API). */
export const CodingMachineStateSchema = z.object({
  value: CodingStateSchema,
  context: CodingContextSchema,
  updatedAt: z.string().datetime(),
});

export type CodingMachineState = z.infer<typeof CodingMachineStateSchema>;

/** Événement : analyser un texte (ex. sortie Scribe) pour proposer des codes CIM-10. */
export const AnalyzeTextEventSchema = z.object({
  type: z.literal('ANALYZE_TEXT'),
  payload: z.object({
    text: z.string().min(1, 'Le texte à analyser est requis'),
  }),
});

export type AnalyzeTextEvent = z.infer<typeof AnalyzeTextEventSchema>;

/** Événement : validation humaine d’un code suggéré. */
export const AcceptCodeEventSchema = z.object({
  type: z.literal('ACCEPT_CODE'),
  payload: z.object({
    code: z.string().min(1, 'Le code accepté est requis'),
    label: z.string().optional(),
  }),
});

export type AcceptCodeEvent = z.infer<typeof AcceptCodeEventSchema>;

const CodingResetEventSchema = z.object({
  type: z.literal('RESET'),
  payload: z.record(z.unknown()).optional(),
});

/** Union des événements de la CodingMachine. */
export const CodingEventSchema = z.union([
  AnalyzeTextEventSchema,
  AcceptCodeEventSchema,
  CodingResetEventSchema,
]);

export type CodingEvent = z.infer<typeof CodingEventSchema>;
