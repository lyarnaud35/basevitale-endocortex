import { z } from 'zod';

/**
 * Feedback Schemas - Module L (Feedback & Apprentissage)
 * 
 * Version Cabinet - Sprint 4: Boucle de Feedback & Outpass
 * 
 * Capture des corrections pour amélioration continue
 * Mécanisme "Antifragile" : le système s'améliore grâce aux erreurs
 */

/**
 * Type d'entité pouvant être corrigée
 */
export const FeedbackEntityTypeSchema = z.enum([
  'CODING',        // Correction d'un code CIM
  'TRANSCRIPTION', // Correction d'une transcription
  'DIAGNOSIS',     // Correction d'un diagnostic
  'PRESCRIPTION',  // Correction d'une prescription
  'NODE',          // Correction d'un nœud sémantique
  'RELATION',      // Correction d'une relation
  'OTHER',
]);

/**
 * Schéma pour un événement de feedback
 */
export const FeedbackEventSchema = z.object({
  id: z.string().cuid().optional(),
  
  // Contexte de la correction
  entityType: FeedbackEntityTypeSchema,
  entityId: z.string().cuid().describe('ID de l\'entité corrigée'),
  
  // Correction
  originalValue: z.any().describe('Valeur originale (code CIM, transcription, etc.)'),
  correctedValue: z.any().describe('Valeur corrigée par le médecin'),
  correctionReason: z.string().optional().describe('Raison de la correction'),
  
  // Contexte additionnel
  context: z.record(z.any()).optional().describe('Contexte additionnel (patient, consultation, etc.)'),
  
  // Métadonnées
  createdAt: z.coerce.date().optional(),
  correctedBy: z.string().describe('User ID du médecin qui corrige'),
  
  // Pour apprentissage
  usedForTraining: z.boolean().default(false).optional(),
});

/**
 * Schéma pour créer un événement de feedback
 */
export const CreateFeedbackEventSchema = FeedbackEventSchema.omit({
  id: true,
  createdAt: true,
});

/**
 * Schéma pour un événement de feedback spécifique au codage
 */
export const CodingFeedbackSchema = z.object({
  entityType: z.literal('CODING'),
  entityId: z.string().cuid(),
  
  originalCode: z.string(),
  originalConfidence: z.number().min(0).max(1).optional(),
  
  correctedCode: z.string(),
  correctedLabel: z.string(),
  correctionReason: z.string().optional(),
  
  consultationId: z.string().cuid().optional(),
  patientId: z.string().cuid().optional(),
});

/**
 * Schéma pour un événement de feedback spécifique à la transcription
 */
export const TranscriptionFeedbackSchema = z.object({
  entityType: z.literal('TRANSCRIPTION'),
  entityId: z.string().cuid(), // ID du nœud sémantique ou de la consultation
  
  originalText: z.string(),
  correctedText: z.string(),
  correctionReason: z.string().optional(),
  
  nodeId: z.string().cuid().optional(),
  consultationId: z.string().cuid().optional(),
});

/**
 * Types TypeScript dérivés
 */
export type FeedbackEntityType = z.infer<typeof FeedbackEntityTypeSchema>;
export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;
export type CreateFeedbackEvent = z.infer<typeof CreateFeedbackEventSchema>;
export type CodingFeedback = z.infer<typeof CodingFeedbackSchema>;
export type TranscriptionFeedback = z.infer<typeof TranscriptionFeedbackSchema>;
