import { z } from 'zod';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';

/**
 * GHOST PROTOCOL v999 - ScribeMachine Schemas
 * 
 * Contrats Zod pour les événements et le contexte de la State Machine.
 * Source de vérité unique pour la communication Backend ↔ Frontend.
 */

/**
 * États possibles de la ScribeMachine (Finite State Machine)
 */
export const ScribeStateSchema = z.enum([
  'IDLE',
  'RECORDING',
  'PROCESSING_NLP',
  'REVIEW',
  'SAVED',
]);

export type ScribeState = z.infer<typeof ScribeStateSchema>;

/**
 * Contexte de la machine (données persistées pendant le cycle de vie)
 */
export const ScribeContextSchema = z.object({
  /** Identifiant patient (externalPatientId) */
  patientId: z.string().min(1),
  /** Texte transcrit (peut être vide en IDLE) */
  transcript: z.string().default(''),
  /** Consultation structurée (résultat NLP, disponible après PROCESSING_NLP) */
  consultation: ConsultationSchema.nullable().default(null),
  /** Draft ID (créé après PROCESSING_NLP) */
  draftId: z.string().nullable().default(null),
  /** Erreurs éventuelles */
  error: z.string().nullable().default(null),
  /** Métadonnées additionnelles */
  metadata: z.record(z.unknown()).optional(),
});

export type ScribeContext = z.infer<typeof ScribeContextSchema>;

/**
 * ÉVÉNEMENTS Zod (intentions envoyées par le Frontend)
 */

/** START_RECORD : Démarrer l'enregistrement (micro) */
export const StartRecordEventSchema = z.object({
  type: z.literal('START_RECORD'),
  payload: z.object({
    patientId: z.string().min(1),
  }),
});

export type StartRecordEvent = z.infer<typeof StartRecordEventSchema>;

/** STOP_RECORD : Arrêter l'enregistrement et déclencher l'analyse NLP */
export const StopRecordEventSchema = z.object({
  type: z.literal('STOP_RECORD'),
  payload: z.object({
    transcript: z.string().min(1, 'Le transcript ne peut pas être vide'),
  }),
});

export type StopRecordEvent = z.infer<typeof StopRecordEventSchema>;

/** UPDATE_TEXT : Mise à jour manuelle du texte (pendant RECORDING ou REVIEW) */
export const UpdateTextEventSchema = z.object({
  type: z.literal('UPDATE_TEXT'),
  payload: z.object({
    text: z.string(),
  }),
});

export type UpdateTextEvent = z.infer<typeof UpdateTextEventSchema>;

/** CONFIRM : Confirmer et valider le draft (transition REVIEW -> SAVED) */
export const ConfirmEventSchema = z.object({
  type: z.literal('CONFIRM'),
  payload: z.object({
    /** Données corrigées (optionnel, si l'utilisateur a modifié) */
    structuredData: ConsultationSchema.partial().optional(),
  }).optional(),
});

export type ConfirmEvent = z.infer<typeof ConfirmEventSchema>;

/**
 * Union de tous les événements
 */
export const ScribeEventSchema = z.discriminatedUnion('type', [
  StartRecordEventSchema,
  StopRecordEventSchema,
  UpdateTextEventSchema,
  ConfirmEventSchema,
]);

export type ScribeEvent = z.infer<typeof ScribeEventSchema>;

/**
 * État complet de la machine (pour le Frontend)
 */
export const ScribeMachineStateSchema = z.object({
  /** État actuel */
  value: ScribeStateSchema,
  /** Contexte (données) */
  context: ScribeContextSchema,
  /** Timestamp de dernière mise à jour */
  updatedAt: z.string().datetime(),
});

export type ScribeMachineState = z.infer<typeof ScribeMachineStateSchema>;
