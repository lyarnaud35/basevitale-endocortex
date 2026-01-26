import { z } from 'zod';

/**
 * Billing Schemas - Module E+ (Facturation)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * INVARIANT: "Pas de Preuve = Pas de Facture"
 * Toute facturation doit être justifiée par des preuves cliniques dans le Knowledge Graph
 */

/**
 * Code GHM (Groupe Homogène de Malades)
 */
export const GHMCodeSchema = z
  .string()
  .regex(/^\d{2}[A-Z]\d{2}$/, 'Code GHM doit suivre le format 02A01');

/**
 * Code CCAM (Classification Commune des Actes Médicaux)
 */
export const CCAMCodeSchema = z
  .string()
  .regex(/^[A-Z]{4}\d{3}$/, 'Code CCAM doit suivre le format ABCD123');

/**
 * Type d'acte médical
 */
export const ActTypeSchema = z.enum([
  'CONSULTATION',
  'VISITE',
  'ACTE_TECHNIQUE',
  'INTERVENTION',
  'EXAMEN',
  'SOIN',
  'HOSPITALISATION',
  'OTHER',
]);

/**
 * Statut de facturation
 */
export const BillingStatusSchema = z.enum([
  'PENDING',      // En attente de validation
  'VALIDATED',    // Validé (preuve clinique vérifiée)
  'TRANSMITTED',  // Transmis à l'Assurance Maladie
  'REJECTED',     // Rejeté (manque de preuve)
  'CANCELLED',    // Annulé
]);

/**
 * Preuve clinique justificative
 * Référence à un ou plusieurs nœuds sémantiques du Knowledge Graph
 */
export const ClinicalEvidenceSchema = z.object({
  nodeIds: z.array(z.string().cuid()).min(1, 'Au moins une preuve est requise'),
  evidenceType: z.enum([
    'CONSULTATION_NOTE',    // Note de consultation
    'OPERATIVE_REPORT',     // Compte-rendu opératoire
    'LAB_RESULT',          // Résultat de laboratoire
    'IMAGING_RESULT',      // Résultat d'imagerie
    'CLINICAL_CONSTANT',   // Constante clinique
    'PROCEDURE',           // Acte médical effectué
    'DIAGNOSIS',           // Diagnostic posé
  ]),
  description: z.string().optional(),
});

/**
 * Schéma pour créer un événement de facturation
 */
export const CreateBillingEventSchema = z.object({
  consultationId: z.string().cuid(),
  
  // Codes facturation
  ghmCode: GHMCodeSchema.optional(),
  actCode: CCAMCodeSchema.optional(),
  actType: ActTypeSchema,
  
  // Preuve clinique (OBLIGATOIRE)
  evidence: ClinicalEvidenceSchema,
  
  // Métadonnées
  description: z.string().optional(),
  amount: z.number().positive().optional(), // Montant en centimes
});

/**
 * Schéma pour un événement de facturation complet
 */
export const BillingEventSchema = CreateBillingEventSchema.extend({
  id: z.string().cuid(),
  status: BillingStatusSchema,
  createdAt: z.coerce.date(),
  transmittedAt: z.coerce.date().optional(),
  rejectionReason: z.string().optional(),
});

/**
 * Schéma pour la validation de facturation
 * Vérifie que les preuves cliniques existent dans le Knowledge Graph
 */
export const BillingValidationSchema = z.object({
  billingEventId: z.string().cuid(),
  validated: z.boolean(),
  validationMessage: z.string().optional(),
  missingEvidence: z.array(z.string()).optional(),
});

/**
 * Types TypeScript dérivés
 */
export type GHMCode = z.infer<typeof GHMCodeSchema>;
export type CCAMCode = z.infer<typeof CCAMCodeSchema>;
export type ActType = z.infer<typeof ActTypeSchema>;
export type BillingStatus = z.infer<typeof BillingStatusSchema>;
export type ClinicalEvidence = z.infer<typeof ClinicalEvidenceSchema>;
export type CreateBillingEvent = z.infer<typeof CreateBillingEventSchema>;
export type BillingEvent = z.infer<typeof BillingEventSchema>;
export type BillingValidation = z.infer<typeof BillingValidationSchema>;
