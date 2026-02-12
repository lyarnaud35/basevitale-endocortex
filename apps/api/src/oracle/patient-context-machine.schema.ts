import { z } from 'zod';
import {
  IntelligenceTimelineItemSchema,
  IntelligenceAlertSchema,
} from '@basevitale/shared';

/**
 * GHOST PROTOCOL v999 - PatientContextMachine (L'Oracle)
 *
 * Contrats Zod pour le contexte patient : Timeline + Alertes.
 * Source de vérité pour la machine à états PatientContext.
 */

/** Élément de timeline (réutilise le schéma Intelligence). */
export const PatientContextTimelineItemSchema = IntelligenceTimelineItemSchema;
export type PatientContextTimelineItem = z.infer<
  typeof PatientContextTimelineItemSchema
>;

/** Alerte active (réutilise le schéma Intelligence). */
export const PatientContextAlertSchema = IntelligenceAlertSchema;
export type PatientContextAlert = z.infer<typeof PatientContextAlertSchema>;

/** Contexte patient (données exposées en READY). */
export const PatientContextDataSchema = z.object({
  patientId: z.string().min(1),
  timeline: z.array(PatientContextTimelineItemSchema),
  alertes: z.array(PatientContextAlertSchema),
});
export type PatientContextData = z.infer<typeof PatientContextDataSchema>;

/** États de la PatientContextMachine (FSM). */
export const PatientContextStateSchema = z.enum([
  'IDLE',
  'INITIALIZING',
  'FETCHING_CONTEXT',
  'ANALYZING',
  'READY',
  'ERROR',
]);
export type PatientContextState = z.infer<typeof PatientContextStateSchema>;

/** Contexte interne de la machine (état + données + erreur). */
export const PatientContextMachineContextSchema = z.object({
  patientId: z.string().default(''),
  timeline: z.array(PatientContextTimelineItemSchema).default([]),
  alertes: z.array(PatientContextAlertSchema).default([]),
  error: z.string().nullable().default(null),
});
export type PatientContextMachineContext = z.infer<
  typeof PatientContextMachineContextSchema
>;

/** Événement : démarrer l'oracle pour un patient */
export const InitializeEventSchema = z.object({
  type: z.literal('INITIALIZE'),
  payload: z.object({
    patientId: z.string().min(1),
  }),
});
export type InitializeEvent = z.infer<typeof InitializeEventSchema>;

/** Événement : contexte chargé avec succès */
export const ContextLoadedEventSchema = z.object({
  type: z.literal('CONTEXT_LOADED'),
  payload: PatientContextDataSchema,
});
export type ContextLoadedEvent = z.infer<typeof ContextLoadedEventSchema>;

/** Événement : échec du chargement */
export const FetchFailedEventSchema = z.object({
  type: z.literal('FETCH_FAILED'),
  payload: z.object({
    message: z.string(),
  }),
});
export type FetchFailedEvent = z.infer<typeof FetchFailedEventSchema>;

/** Événement interne : démarrage du fetch (INITIALIZING -> FETCHING_CONTEXT) */
export const StartFetchEventSchema = z.object({
  type: z.literal('START_FETCH'),
});
export type StartFetchEvent = z.infer<typeof StartFetchEventSchema>;

/** Événement interne : démarrage de l'analyse LLM (FETCHING_CONTEXT -> ANALYZING) */
export const StartAnalyzingEventSchema = z.object({
  type: z.literal('START_ANALYZING'),
});
export type StartAnalyzingEvent = z.infer<typeof StartAnalyzingEventSchema>;

/** Union des événements */
export const PatientContextEventSchema = z.discriminatedUnion('type', [
  InitializeEventSchema,
  StartFetchEventSchema,
  StartAnalyzingEventSchema,
  ContextLoadedEventSchema,
  FetchFailedEventSchema,
]);
export type PatientContextEvent = z.infer<typeof PatientContextEventSchema>;

/** État complet de la machine (pour le Frontend / SSE). */
export const PatientContextMachineStateSchema = z.object({
  value: PatientContextStateSchema,
  context: PatientContextMachineContextSchema,
  updatedAt: z.string().datetime(),
});
export type PatientContextMachineState = z.infer<
  typeof PatientContextMachineStateSchema
>;
