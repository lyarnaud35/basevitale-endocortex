import { z } from 'zod';

/**
 * CONTRAT DIAMANT – WebSocket namespace /security (Gardien de prescription).
 * Source de vérité unique Backend ↔ Frontend. Pattern cloné du module Coding.
 */

/** États du Gardien. LOCKED = blocage total ; seule REQUEST_OVERRIDE est acceptée. */
export const SecurityGuardStateSchema = z.enum([
  'IDLE',
  'ANALYZING',
  'SECURE',
  'LOCKED',
  'OVERRIDE_PENDING',
]);

export type SecurityGuardState = z.infer<typeof SecurityGuardStateSchema>;

/** Contexte exposé par la machine (state_updated). */
export const SecurityGuardContextSchema = z.object({
  drugId: z.string().nullable(),
  blockReason: z.string().nullable(),
  patientContext: z.record(z.unknown()).nullable().optional(),
  overrideReason: z.string().nullable().optional(),
});

/**
 * Payload de l’événement `state_updated` (Backend → Frontend) – namespace /security.
 * Nom distinct de SecurityMachineState (security-machine.schema) pour éviter conflit d’export.
 */
export const SecurityGuardWsStateSchema = z.object({
  value: SecurityGuardStateSchema,
  context: SecurityGuardContextSchema,
  canSubmit: z.boolean(),
});

export type SecurityGuardWsState = z.infer<typeof SecurityGuardWsStateSchema>;

/**
 * Payload de l’événement `check_prescription` (Frontend → Backend).
 * Vérification d’un médicament dans le contexte patient.
 */
export const SecurityInputPayloadSchema = z.object({
  drugId: z.string(),
  patientContext: z.record(z.unknown()).optional(),
});

export type SecurityInputPayload = z.infer<typeof SecurityInputPayloadSchema>;

/**
 * Payload de l’événement `request_override` (Frontend → Backend).
 * En état LOCKED uniquement : demande de dérogation avec justification.
 */
export const OverridePayloadSchema = z.object({
  reason: z.string().min(1, 'La justification est requise'),
});

export type OverridePayload = z.infer<typeof OverridePayloadSchema>;
