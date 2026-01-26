import { z } from 'zod';

/**
 * Outpass Schemas - Module L (Mécanisme d'Outpass)
 * 
 * Version Cabinet - Sprint 4: Boucle de Feedback & Outpass
 * 
 * Permet au médecin de contourner une règle contre justification causale
 */

/**
 * Type de règle contournée
 */
export const OutpassRuleTypeSchema = z.enum([
  'PRESCRIPTION_BLOCKED',      // Prescription bloquée par sécurité
  'BILLING_BLOCKED',           // Facturation bloquée (pas de preuve)
  'CODING_WARNING',            // Avertissement de codage
  'ALLERGY_WARNING',           // Avertissement d'allergie
  'INTERACTION_WARNING',       // Avertissement d'interaction
  'PROTOCOL_DEVIATION',        // Déviation de protocole
  'OTHER',
]);

/**
 * Schéma pour une demande d'outpass
 */
export const OutpassRequestSchema = z.object({
  ruleType: OutpassRuleTypeSchema,
  ruleId: z.string().optional().describe('ID de la règle contournée'),
  entityId: z.string().cuid().describe('ID de l\'entité concernée'),
  
  // Justification causale (OBLIGATOIRE)
  justification: z.string().min(10, 'La justification doit contenir au moins 10 caractères'),
  
  // Contexte
  context: z.record(z.any()).optional(),
  
  // Métadonnées
  requestedBy: z.string().describe('User ID du médecin'),
});

/**
 * Schéma pour un outpass approuvé
 */
export const OutpassSchema = z.object({
  id: z.string().cuid(),
  
  ruleType: OutpassRuleTypeSchema,
  entityId: z.string().cuid(),
  justification: z.string(),
  
  // Statut
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  
  // Approbation
  approvedBy: z.string().optional(),
  approvedAt: z.coerce.date().optional(),
  rejectionReason: z.string().optional(),
  
  // Métadonnées
  createdAt: z.coerce.date(),
  requestedBy: z.string(),
});

/**
 * Types TypeScript dérivés
 */
export type OutpassRuleType = z.infer<typeof OutpassRuleTypeSchema>;
export type OutpassRequest = z.infer<typeof OutpassRequestSchema>;
export type Outpass = z.infer<typeof OutpassSchema>;
