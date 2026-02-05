import { z } from 'zod';
import { ConsultationSchema, type Consultation } from './consultation.schema';

/**
 * GHOST PROTOCOL v999 - ScribeMachine Schemas
 * 
 * Contrats Zod partagés pour la communication Backend ↔ Frontend.
 * Source de vérité unique pour la ScribeMachine.
 * 
 * LOI III : TYPAGE INVIOLABLE
 * - Tous les échanges reposent sur ces schémas Zod
 * - Les types TypeScript sont inférés automatiquement
 */

/**
 * États possibles de la ScribeMachine (Finite State Machine)
 * 
 * LOI II : TRANSITIONS STRICTES
 * - IDLE : Machine au repos, attend START
 * - RECORDING : Enregistrement en cours, reçoit UPDATE_TEXT
 * - PROCESSING : Analyse NLP en cours (backend)
 * - REVIEW : Consultation prête pour validation
 * - SAVED : Consultation validée et sauvegardée (état final)
 */
export const ScribeStateSchema = z.enum([
  'INITIALIZING',
  'IDLE',
  'RECORDING',
  'PROCESSING',
  'REVIEW',
  'SAVED',
]);

export type ScribeState = z.infer<typeof ScribeStateSchema>;

/**
 * Statut de l'enregistrement (pour le contexte)
 */
export const RecordingStatusSchema = z.enum([
  'idle',
  'recording',
  'processing',
  'review',
  'saved',
]);

export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;

/**
 * Contexte de la ScribeMachine
 * 
 * Données persistées pendant le cycle de vie de la machine.
 * Le contexte est validé avec Zod à chaque transition.
 */
export const ScribeContextSchema = z.object({
  /** Identifiant patient (externalPatientId) */
  patientId: z.string().min(1, 'Le patientId est requis'),
  
  /** Texte transcrit (peut être vide en IDLE) */
  transcript: z.string().default(''),
  
  /** Entités extraites du transcript (symptômes, diagnostics, médicaments, etc.) */
  entities: z.array(z.string()).default([]),
  
  /** Statut de l'enregistrement (synchrone avec l'état de la machine) */
  status: RecordingStatusSchema.default('idle'),
  
  /** Consultation structurée (résultat NLP, disponible après PROCESSING) */
  consultation: ConsultationSchema.nullable().default(null),
  
  /** Draft ID (créé après PROCESSING) */
  draftId: z.string().nullable().default(null),
  
  /** Erreurs éventuelles */
  error: z.string().nullable().default(null),
  
  /** Métadonnées additionnelles (timestamps, source, etc.) */
  metadata: z
    .object({
      startedAt: z.string().datetime().optional(),
      stoppedAt: z.string().datetime().optional(),
      processedAt: z.string().datetime().optional(),
      source: z.enum(['microphone', 'manual', 'import']).optional(),
    })
    .optional(),
});

export type ScribeContext = z.infer<typeof ScribeContextSchema>;

/**
 * ÉVÉNEMENTS Zod (intentions envoyées par le Frontend)
 * 
 * LOI I : SOUVERAINETÉ DE L'ÉTAT
 * - Le Frontend envoie des INTENTIONS (événements)
 * - Le Backend décide des transitions valides
 */

/**
 * START : Démarrer l'enregistrement (micro)
 * Transition : IDLE -> RECORDING
 */
export const StartEventSchema = z.object({
  type: z.literal('START'),
  payload: z.object({
    patientId: z.string().min(1, 'Le patientId est requis'),
  }),
});

export type StartEvent = z.infer<typeof StartEventSchema>;

/**
 * STOP : Arrêter l'enregistrement et déclencher l'analyse NLP
 * Transition : RECORDING -> PROCESSING
 */
export const StopEventSchema = z.object({
  type: z.literal('STOP'),
  payload: z.object({
    transcript: z.string().min(1, 'Le transcript ne peut pas être vide'),
  }),
});

export type StopEvent = z.infer<typeof StopEventSchema>;

/**
 * UPDATE_TEXT : Mise à jour manuelle du texte
 * Accepté dans les états : RECORDING, REVIEW
 * Ne change pas l'état, met seulement à jour le contexte
 */
export const UpdateTextEventSchema = z.object({
  type: z.literal('UPDATE_TEXT'),
  payload: z.object({
    text: z.string(),
  }),
});

export type UpdateTextEvent = z.infer<typeof UpdateTextEventSchema>;

/**
 * RESET : Réinitialiser la machine à IDLE
 * Accepté dans tous les états (sauf peut-être SAVED selon la logique métier)
 * Transition : * -> IDLE
 */
export const ResetEventSchema = z.object({
  type: z.literal('RESET'),
  payload: z.object({}).optional(),
});

export type ResetEvent = z.infer<typeof ResetEventSchema>;

/**
 * CONFIRM : Confirmer et valider le draft
 * Transition : REVIEW -> SAVED
 */
export const ConfirmEventSchema = z.object({
  type: z.literal('CONFIRM'),
  payload: z
    .object({
      /** Données corrigées (optionnel, si l'utilisateur a modifié) */
      structuredData: ConsultationSchema.partial().optional(),
    })
    .optional(),
});

export type ConfirmEvent = z.infer<typeof ConfirmEventSchema>;

/**
 * Union discriminée de tous les événements
 * 
 * Utilise une union discriminée pour un typage strict en TypeScript.
 * Le Frontend peut envoyer n'importe lequel de ces événements.
 */
export const ScribeEventSchema = z.discriminatedUnion('type', [
  StartEventSchema,
  StopEventSchema,
  UpdateTextEventSchema,
  ResetEventSchema,
  ConfirmEventSchema,
]);

export type ScribeEvent = z.infer<typeof ScribeEventSchema>;

/**
 * État complet de la machine (pour le Frontend)
 * 
 * Cette structure est envoyée via SSE à chaque changement d'état.
 * Le Frontend doit utiliser cette structure pour afficher l'UI.
 */
export const ScribeMachineStateSchema = z.object({
  /** État actuel de la machine */
  value: ScribeStateSchema,
  
  /** Contexte (données) de la machine */
  context: ScribeContextSchema,
  
  /** Timestamp de dernière mise à jour (ISO string) */
  updatedAt: z.string().datetime(),
});

export type ScribeMachineState = z.infer<typeof ScribeMachineStateSchema>;
