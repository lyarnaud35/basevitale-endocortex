/**
 * Billing – Contrat POST /billing/simulate (Réacteur Fiscal).
 * Ghost Protocol : le backend décide (règles NGAP), le front affiche.
 */

import { z } from 'zod';

export const BillingBreakdownLineSchema = z.object({
  label: z.string(),
  amount: z.number(),
  ruleId: z.string().optional(),
});
export type BillingBreakdownLine = z.infer<typeof BillingBreakdownLineSchema>;

/** Réponse de simulation (total, répartition AMO/AMC/patient, règles appliquées). */
export const BillingSimulateResponseSchema = z.object({
  total: z.number(),
  breakdown: z.array(BillingBreakdownLineSchema),
  amo: z.number(),
  amc: z.number(),
  amount_patient: z.number(),
  rulesApplied: z.array(z.string()).default([]),
  message: z.string().optional(),
  patient_context: z
    .object({
      patientId: z.string(),
      age: z.number(),
      coverage: z.number().optional(),
    })
    .optional(),
});
export type BillingSimulateResponse = z.infer<typeof BillingSimulateResponseSchema>;

export interface CreateBillingEvent {}

export interface BillingEvent {}

export interface BillingValidation {}

export interface ClinicalEvidence {}

export type GHMCode = string;
export type CCAMCode = string;
export type ActType = string;
export type BillingStatus = string;
