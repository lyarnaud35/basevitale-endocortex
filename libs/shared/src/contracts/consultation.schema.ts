import { z } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaLib } from 'zod-to-json-schema';

/**
 * Consultation Schema - Phase 2: Ossification des Contrats
 * 
 * Schema Zod pour les consultations médicales.
 * Ce schéma sert de contrat pour l'IA et garantit la structure des données.
 * 
 * Law I: Contract-First Intelligence
 * - Ce schéma est la source de vérité unique
 * - Utilisé pour valider les entrées/sorties de l'IA
 * - Généré en JSON Schema pour Python/instructor
 * 
 * Phase 2: Structure complète pour ConsultationDraft
 */
export const ConsultationSchema = z.object({
  patientId: z.string().min(1, 'L\'identifiant du patient est requis'),
  transcript: z
    .string()
    .min(1, 'Le transcript (texte brut) est requis')
    .describe('Transcription brute de la consultation (audio ou texte)'),
  symptoms: z
    .array(z.string().min(1, 'Chaque symptôme doit être non vide'))
    .min(1, 'Au moins un symptôme est requis')
    .describe('Liste des symptômes rapportés par le patient'),
  diagnosis: z
    .array(
      z.object({
        code: z.string().min(1, 'Le code de diagnostic est requis'),
        confidence: z
          .number()
          .min(0, 'Le score de confiance doit être entre 0 et 1')
          .max(1, 'Le score de confiance doit être entre 0 et 1'),
        label: z.string().min(1, 'Le libellé du diagnostic est requis'),
      }),
    )
    .min(1, 'Au moins un diagnostic est requis')
    .describe('Liste des diagnostics suggérés'),
  medications: z
    .array(
      z.object({
        name: z.string().min(1, 'Le nom du médicament est requis'),
        dosage: z.string().min(1, 'Le dosage est requis (ex: "500mg", "10ml")'),
        duration: z
          .string()
          .min(1, 'La durée est requise (ex: "7 jours", "2 semaines")'),
      }),
    )
    .default([])
    .describe('Liste des médicaments prescrits'),
  /** Actes facturables (CCAM/NGAP) – mentionnés ou déduits de la consultation. */
  billingCodes: z
    .array(
      z.object({
        code: z.string().min(1, 'Le code acte est requis'),
        label: z.string().min(1, 'Le libellé est requis'),
        confidence: z
          .number()
          .min(0, 'Confiance entre 0 et 1')
          .max(1, 'Confiance entre 0 et 1'),
      }),
    )
    .default([])
    .describe('Codes actes facturables (CCAM/NGAP)'),
  /** Ordonnance médicamenteuse structurée (drug, dosage, duration). */
  prescription: z
    .array(
      z.object({
        drug: z.string().min(1, 'Le médicament est requis'),
        dosage: z.string().min(1, 'Le dosage est requis'),
        duration: z.string().min(1, 'La durée est requise'),
      }),
    )
    .default([])
    .describe('Ordonnance : médicaments prescrits (drug, dosage, duration)'),
  /** Alertes sécurité (Mini-Vidal / C+ Gardien) : contre-indications non bloquantes. */
  alerts: z.array(z.string()).optional().describe('Alertes de vérification médicamenteuse'),
});

/**
 * Type TypeScript dérivé du schéma Zod
 */
export type Consultation = z.infer<typeof ConsultationSchema>;

/**
 * Helper function pour convertir un schéma Zod en JSON Schema
 * Utilisé pour envoyer le schéma au sidecar Python qui utilisera instructor
 * 
 * @param schema - Schéma Zod à convertir
 * @returns JSON Schema compatible avec instructor/Pydantic
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, any> {
  try {
    // @ts-ignore - Type instantiation peut être trop profonde pour certains schémas complexes
    return zodToJsonSchemaLib(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    }) as Record<string, any>;
  } catch (error) {
    // Fallback si le schéma est trop complexe
    return {
      type: 'object',
      description: 'Complex schema - conversion skipped',
    };
  }
}

/**
 * Code CIM10 Schema (pour référence, utilisé ailleurs)
 */
const CIM10CodeSchema = z
  .string()
  .regex(
    /^[A-Z][0-9]{2}(\.[0-9])?$/,
    'Le code CIM10 doit suivre le format A00.0 (lettre majuscule, 2 chiffres, point optionnel, 1 chiffre optionnel)'
  );

/**
 * Diagnosis Schema (pour référence, utilisé ailleurs)
 */
const DiagnosisSchema = z.object({
  code: CIM10CodeSchema,
  confidence: z
    .number()
    .min(0, 'Le score de confiance doit être entre 0 et 1')
    .max(1, 'Le score de confiance doit être entre 0 et 1'),
  description: z.string().optional().describe('Description optionnelle du diagnostic'),
});

/**
 * Prescription Item Schema (pour référence, utilisé ailleurs)
 */
const PrescriptionItemSchema = z.object({
  medication: z.string().min(1, 'Le nom du médicament est requis'),
  dosage: z.string().min(1, 'Le dosage est requis (ex: "500mg", "10ml")'),
  frequency: z.string().min(1, 'La fréquence est requise (ex: "2 fois par jour", "toutes les 8h")'),
  duration: z.string().optional().describe('Durée du traitement (ex: "7 jours", "2 semaines")'),
});

/**
 * Type Diagnosis extrait du schéma (pour référence)
 */
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

/**
 * Type PrescriptionItem extrait du schéma (pour référence)
 */
export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;
