import { z } from 'zod';
import type { PatientContextData } from '../oracle/patient-context-machine.schema';
import { PatientContextDataSchema } from '../oracle/patient-context-machine.schema';

/**
 * GHOST PROTOCOL - SecurityGuardMachine (Semaine 2 - La Loi Martiale)
 * Observateur : réagit à l'état de l'Oracle (READY), ne demande pas les données.
 */

/** États de la SecurityGuardMachine. IDLE=ras, DEFCON_3=danger, OVERRIDE_ACTIVE=orange, SUBMITTED=engagement enregistré. */
export const SecurityGuardStateSchema = z.enum([
  'IDLE',
  'DEFCON_3',
  'OVERRIDE_ACTIVE',
  'SUBMITTED',
]);
export type SecurityGuardState = z.infer<typeof SecurityGuardStateSchema>;

/** Dernière dérogation (audit Module L - Feedback). */
export const LastOverrideSchema = z.object({
  at: z.string().datetime(),
  reason: z.string(),
});
export type LastOverride = z.infer<typeof LastOverrideSchema>;

/** Dérogation active en cours (preuve visible, état Orange). */
export const ActiveOverrideSchema = z.object({
  reason: z.string(),
  at: z.string().datetime(),
  author: z.string().optional(),
});
export type ActiveOverride = z.infer<typeof ActiveOverrideSchema>;

/** Contexte : patientContext + dernière dérogation (audit) + dérogation active (preuve). */
export const SecurityGuardContextSchema = z.object({
  patientId: z.string().default(''),
  patientContext: PatientContextDataSchema.nullable().default(null),
  lastOverride: LastOverrideSchema.optional(),
  activeOverride: ActiveOverrideSchema.optional(),
});
export type SecurityGuardContext = z.infer<typeof SecurityGuardContextSchema>;

/** Événement : Oracle est READY, contexte patient disponible. */
export const OracleReadyEventSchema = z.object({
  type: z.literal('ORACLE_READY'),
  payload: z.object({
    patientId: z.string().min(1),
    context: PatientContextDataSchema,
  }),
});
export type OracleReadyEvent = z.infer<typeof OracleReadyEventSchema>;

/** Événement : l'humain force le passage (override) malgré DEFCON_3. */
export const OverrideRequestEventSchema = z.object({
  type: z.literal('OVERRIDE_REQUEST'),
  payload: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});
export type OverrideRequestEvent = z.infer<typeof OverrideRequestEventSchema>;

/** Événement : confirmation de l'ordonnance sous dérogation (engagement). */
export const ValidatePrescriptionEventSchema = z.object({
  type: z.literal('VALIDATE_PRESCRIPTION'),
  payload: z.record(z.unknown()).optional(),
});
export type ValidatePrescriptionEvent = z.infer<typeof ValidatePrescriptionEventSchema>;

/** Événement : reset pour nouvelle prescription (SUBMITTED → IDLE). */
export const ResetEventSchema = z.object({
  type: z.literal('RESET'),
  payload: z.record(z.unknown()).optional(),
});
export type ResetEvent = z.infer<typeof ResetEventSchema>;

export const SecurityGuardEventSchema = z.discriminatedUnion('type', [
  OracleReadyEventSchema,
  OverrideRequestEventSchema,
  ValidatePrescriptionEventSchema,
  ResetEventSchema,
]);
export type SecurityGuardEvent = z.infer<typeof SecurityGuardEventSchema>;

/** État complet (pour SSE / frontend). */
export const SecurityGuardMachineStateSchema = z.object({
  value: SecurityGuardStateSchema,
  context: SecurityGuardContextSchema,
  updatedAt: z.string().datetime(),
});
export type SecurityGuardMachineState = z.infer<
  typeof SecurityGuardMachineStateSchema
>;

/**
 * MODULE L - Contrat d'événement d'audit (log JSON structuré).
 * Consommé par les pipelines de logs et la future IA d'apprentissage (Semaine 6+).
 * Un seul objet JSON par ligne pour parsing (grep, ELK, etc.).
 */
export const SecurityAuditEventSchema = z.object({
  event_type: z.literal('SECURITY_OVERRIDE'),
  severity: z.enum(['HIGH', 'MEDIUM']),
  timestamp: z.string().datetime(),
  context: z.object({
    patient_id: z.string(),
    rule_broken: z.string(),
    drug_id: z.string().optional(),
  }),
  decision: z.object({
    author: z.string(),
    justification: z.string(),
    outcome: z.literal('SUBMITTED'),
  }),
});
export type SecurityAuditEvent = z.infer<typeof SecurityAuditEventSchema>;
