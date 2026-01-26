import { z } from 'zod';

/**
 * Coding Schemas - Module B+ (Codage)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * Suggestion automatique de codes CIM-10/11 avec scores de confiance
 * Calibration stricte pour éviter les "erreurs confiantes"
 */

/**
 * Code CIM-10
 */
export const CIM10CodeSchema = z
  .string()
  .regex(
    /^[A-Z][0-9]{2}(\.[0-9])?$/,
    'Le code CIM-10 doit suivre le format A00.0 (lettre majuscule, 2 chiffres, point optionnel, 1 chiffre optionnel)',
  );

/**
 * Code CIM-11
 */
export const CIM11CodeSchema = z
  .string()
  .regex(
    /^[A-Z]{2}[0-9]{2}(\.[0-9]+)?$/,
    'Le code CIM-11 doit suivre le format AB12.3',
  );

/**
 * Suggestion de codage avec confiance
 */
export const CodingSuggestionSchema = z.object({
  // Code suggéré
  code: z.union([CIM10CodeSchema, CIM11CodeSchema]),
  codeType: z.enum(['CIM10', 'CIM11']),
  
  // Libellé
  label: z.string().min(1, 'Le libellé est requis'),
  description: z.string().optional(),
  
  // Score de confiance (OBLIGATOIRE)
  confidence: z
    .number()
    .min(0, 'La confiance doit être entre 0 et 1')
    .max(1, 'La confiance doit être entre 0 et 1'),
  
  // Données manquantes qui réduisent la confiance
  missingData: z
    .array(z.string())
    .optional()
    .describe('Liste des données manquantes qui affectent la confiance'),
  
  // Alternative si confiance faible
  alternatives: z
    .array(
      z.object({
        code: z.union([CIM10CodeSchema, CIM11CodeSchema]),
        label: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .optional(),
});

/**
 * Schéma pour une demande de codage
 */
export const CodingRequestSchema = z.object({
  consultationId: z.string().cuid().optional(),
  patientId: z.string().cuid().optional(),
  
  // Contexte pour le codage
  // Peut être du texte libre ou une référence au Knowledge Graph
  context: z.union([
    z.string().describe('Texte libre à analyser'),
    z.object({
      nodeIds: z.array(z.string().cuid()).describe('IDs des nœuds sémantiques à analyser'),
    }),
  ]),
  
  // Seuil de confiance minimum (optionnel)
  minConfidence: z.number().min(0).max(1).default(0.4).optional(),
});

/**
 * Schéma pour une réponse de codage
 */
export const CodingResponseSchema = z.object({
  // Suggestions principales (confiance >= minConfidence)
  suggestions: z.array(CodingSuggestionSchema).min(1),
  
  // Warnings si confiance faible
  warnings: z
    .array(z.string())
    .optional()
    .describe('Avertissements sur la qualité des suggestions'),
  
  // Données recommandées pour améliorer la confiance
  recommendedData: z
    .array(z.string())
    .optional()
    .describe('Données supplémentaires recommandées pour améliorer le codage'),
});

/**
 * Schéma pour la validation/correction d'un codage
 * Utilisé par le Module L (Feedback) pour apprendre des corrections
 */
export const CodingCorrectionSchema = z.object({
  originalSuggestion: CodingSuggestionSchema,
  correctedCode: z.union([CIM10CodeSchema, CIM11CodeSchema]),
  correctedLabel: z.string(),
  correctionReason: z.string().optional(),
  correctedBy: z.string().describe('User ID du médecin qui corrige'),
});

/**
 * Types TypeScript dérivés
 */
export type CIM10Code = z.infer<typeof CIM10CodeSchema>;
export type CIM11Code = z.infer<typeof CIM11CodeSchema>;
export type CodingSuggestion = z.infer<typeof CodingSuggestionSchema>;
export type CodingRequest = z.infer<typeof CodingRequestSchema>;
export type CodingResponse = z.infer<typeof CodingResponseSchema>;
export type CodingCorrection = z.infer<typeof CodingCorrectionSchema>;
