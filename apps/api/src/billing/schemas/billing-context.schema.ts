import { z } from 'zod';

/**
 * Schéma strict pour le contexte facturation.
 * Règle d'or : une donnée critique manquante ou invalide → erreur explicite, pas de crash.
 */

const AGE_MAX = 120;
const COVERAGE_MIN = 0;
const COVERAGE_MAX = 1;

/** Contexte patient (âge, couverture) pour le moteur. */
export const patientContextSchema = z
  .object({
    age: z
      .number()
      .int('patient.age doit être un entier')
      .min(0, 'patient.age ne peut pas être négatif')
      .max(AGE_MAX, `patient.age ne peut pas dépasser ${AGE_MAX}`)
      .optional(),
    coverage: z
      .number()
      .min(COVERAGE_MIN, 'patient.coverage doit être entre 0 et 1')
      .max(COVERAGE_MAX, 'patient.coverage doit être entre 0 et 1')
      .optional(),
  })
  .strict();

/** Contexte complet passé au moteur de règles. */
export const billingContextSchema = z.object({
  acts: z.array(z.string()).min(0).max(500),
  patient: patientContextSchema.optional(),
});

/** Entrée brute de l'API simulate (avant résolution patientId → contexte). */
export const simulateInputSchema = z.object({
  acts: z.array(z.string()).min(0).max(500),
  patientId: z.string().min(1).optional(),
  patientAge: z
    .number()
    .int()
    .min(0, 'patientAge ne peut pas être négatif')
    .max(AGE_MAX, `patientAge ne peut pas dépasser ${AGE_MAX}`)
    .optional(),
});

export type PatientContextValidated = z.infer<typeof patientContextSchema>;
export type BillingContextValidated = z.infer<typeof billingContextSchema>;
export type SimulateInputValidated = z.infer<typeof simulateInputSchema>;

/** Codes d'erreur explicites pour le front (Ben). */
export const BillingErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  MISSING_CONTEXT: 'MISSING_CONTEXT',
} as const;

export type BillingErrorCode = (typeof BillingErrorCodes)[keyof typeof BillingErrorCodes];

/** Structure d'erreur renvoyée par l'API (4xx). */
export interface BillingValidationError {
  code: BillingErrorCode;
  field?: string;
  message: string;
  details?: unknown;
}
