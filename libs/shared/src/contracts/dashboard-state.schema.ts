import { z } from 'zod';
import {
  IntelligenceTimelineItemSchema,
  IntelligenceAlertSchema,
} from './intelligence.schema';
import { CodingSuggestionItemSchema } from './coding-machine.schema';

/**
 * GHOST PROTOCOL - Dashboard State (Contrat de Sang Backend ↔ Frontend)
 * GET /api/patient/:id/dashboard-state — source unique de vérité pour Ben.
 * Défini dans shared pour que le Frontend importe depuis @basevitale/shared.
 */

/** Données patient exposées quand l'Oracle est READY. */
export const DashboardOracleDataSchema = z.object({
  patientId: z.string(),
  timeline: z.array(IntelligenceTimelineItemSchema),
  alertes: z.array(IntelligenceAlertSchema),
});
export type DashboardOracleData = z.infer<typeof DashboardOracleDataSchema>;

/** État Oracle pour le dashboard. */
export const DashboardOracleStateSchema = z.object({
  state: z.enum([
    'IDLE',
    'INITIALIZING',
    'FETCHING_CONTEXT',
    'ANALYZING',
    'READY',
    'ERROR',
  ]),
  data: DashboardOracleDataSchema.nullable(),
});
export type DashboardOracleState = z.infer<typeof DashboardOracleStateSchema>;

/** Actions autorisées par le Backend selon l'état (Server-Driven UI). */
export const DashboardSecurityAllowedActionsSchema = z.array(
  z.enum(['OVERRIDE', 'ACKNOWLEDGE', 'VALIDATE_PRESCRIPTION', 'RESET']),
);
export type DashboardSecurityAllowedActions = z.infer<
  typeof DashboardSecurityAllowedActionsSchema
>;

/** Dérogation active (état Orange — preuve visible). */
export const DashboardActiveOverrideSchema = z.object({
  reason: z.string(),
  at: z.string(),
  author: z.string().optional(),
});
export type DashboardActiveOverride = z.infer<
  typeof DashboardActiveOverrideSchema
>;

/** État Security pour le dashboard (SecurityGuardMachine). */
export const DashboardSecurityStateSchema = z.object({
  status: z.enum(['IDLE', 'DEFCON_3', 'OVERRIDE_ACTIVE', 'SUCCESS']),
  blocking_reasons: z.array(z.string()),
  allowed_actions: DashboardSecurityAllowedActionsSchema,
  active_override: DashboardActiveOverrideSchema.optional(),
  /** Message de confirmation après engagement (état SUCCESS). */
  confirmation_message: z.string().optional(),
});
export type DashboardSecurityState = z.infer<
  typeof DashboardSecurityStateSchema
>;

/** État Coding Assistant pour le dashboard (CodingAssistantMachine). */
export const DashboardCodingStateSchema = z.object({
  status: z.enum(['IDLE', 'ANALYZING', 'SUGGESTING', 'SILENT']),
  suggestions: z.array(CodingSuggestionItemSchema),
});
export type DashboardCodingState = z.infer<typeof DashboardCodingStateSchema>;

/** Réponse agrégée : une seule source de vérité pour le frontend (3 piliers). */
export const PatientDashboardStateSchema = z.object({
  oracle: DashboardOracleStateSchema,
  security: DashboardSecurityStateSchema,
  coding: DashboardCodingStateSchema,
});
export type PatientDashboardState = z.infer<
  typeof PatientDashboardStateSchema
>;
