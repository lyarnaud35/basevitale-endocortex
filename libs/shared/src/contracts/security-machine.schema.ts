import { z } from 'zod';

/**
 * GHOST PROTOCOL — SecurityMachine (Le Gardien Silencieux)
 * Contrats partagés Backend ↔ Frontend.
 */

export const SecurityStateSchema = z.enum([
  'IDLE',
  'ANALYZING',
  'SAFE',
  'LOCKED',
  'OVERRIDE_APPROVED',
]);

export type SecurityState = z.infer<typeof SecurityStateSchema>;

export const RiskLevelSchema = z.enum(['NONE', 'HIGH']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const SecurityContextSchema = z.object({
  currentDrug: z.string().nullable(),
  riskLevel: RiskLevelSchema.default('NONE'),
  blockReason: z.string().nullable(),
  /** Justification enregistrée lors d'une dérogation (REQUEST_OVERRIDE). */
  auditTrail: z.string().nullable().default(null),
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;

export const SecurityMachineStateSchema = z.object({
  value: SecurityStateSchema,
  context: SecurityContextSchema,
  updatedAt: z.string().datetime(),
});

export type SecurityMachineState = z.infer<typeof SecurityMachineStateSchema>;

/** Événement CHECK_DRUG : le frontend envoie l'intention, le backend décide. */
export const CheckDrugEventSchema = z.object({
  type: z.literal('CHECK_DRUG'),
  payload: z.object({
    drug: z.string().min(1, 'Le nom du médicament est requis'),
  }),
});

export type CheckDrugEvent = z.infer<typeof CheckDrugEventSchema>;

const SecurityResetEventSchema = z.object({
  type: z.literal('RESET'),
  payload: z.record(z.unknown()).optional(),
});

/** Dérogation (Outpass) : demande de forcer la prescription avec justification (min 10 caractères). */
export const RequestOverrideEventSchema = z.object({
  type: z.literal('REQUEST_OVERRIDE'),
  payload: z.object({
    justification: z.string().min(10, 'La justification doit contenir au moins 10 caractères'),
  }),
});

export type RequestOverrideEvent = z.infer<typeof RequestOverrideEventSchema>;

export const SecurityEventSchema = z.union([
  CheckDrugEventSchema,
  SecurityResetEventSchema,
  RequestOverrideEventSchema,
]);

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;
