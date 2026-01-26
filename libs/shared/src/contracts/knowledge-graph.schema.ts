import { z } from 'zod';

/**
 * Knowledge Graph Schemas - Version Cabinet
 * 
 * INVARIANT: Ne jamais stocker de texte "mort"
 * Tout doit être transformé en nœud sémantique avant stockage
 * 
 * Les nœuds représentent des entités médicales (symptômes, diagnostics, médicaments, etc.)
 * Les relations représentent des liens causaux, temporels ou sémantiques
 */

/**
 * Types de nœuds sémantiques
 */
export const SemanticNodeTypeSchema = z.enum([
  'SYMPTOM',
  'DIAGNOSIS',
  'MEDICATION',
  'PROCEDURE',
  'ANTECEDENT',
  'CONSTANT',
  'ACT',
  'LAB_RESULT',
  'IMAGING_RESULT',
  'OTHER',
]);

/**
 * Types de relations sémantiques
 */
export const SemanticRelationTypeSchema = z.enum([
  'CAUSES',
  'PRECEDES',
  'ASSOCIATED_WITH',
  'OCCURS_IN',
  'RELATES_TO',
  'CONTRAINDICATES',
  'TREATS',
  'MEASURES',
  'INDICATES',
]);

/**
 * Schéma pour un nœud sémantique
 * Représente une entité médicale dans le Knowledge Graph
 */
export const SemanticNodeSchema = z.object({
  id: z.string().cuid().optional(),
  
  // Type de nœud
  nodeType: SemanticNodeTypeSchema,
  
  // Classification standardisée
  snomedCtCode: z.string().optional().describe('Code SNOMED CT si disponible'),
  cim10Code: z.string().optional().describe('Code CIM-10 si applicable'),
  cim11Code: z.string().optional().describe('Code CIM-11 si applicable'),
  
  // Libellé
  label: z.string().min(1, 'Le libellé est requis'),
  description: z.string().optional(),
  
  // Embedding vectoriel (pour recherche sémantique)
  // Note: Stocké en JSON dans Prisma, idéalement utiliser pgvector directement
  embedding: z.array(z.number()).optional().describe('Vecteur d\'embedding pour recherche sémantique'),
  
  // Valeurs (pour constantes, résultats labo, etc.)
  value: z.union([
    z.number(),
    z.string(),
    z.boolean(),
    z.coerce.date(),
  ]).optional(),
  unit: z.string().optional().describe('Unité de mesure si applicable'),
  
  // Métadonnées
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Score de confiance (0-1) si généré par IA'),
  
  // Relations
  // Note: patientId et consultationId peuvent être n'importe quel identifiant
  // (pas forcément CUID) car ils peuvent venir de systèmes externes ou être générés différemment
  patientId: z.string().min(1).optional(),
  consultationId: z.string().min(1).optional(),
});

/**
 * Schéma pour créer un nœud sémantique (sans ID)
 */
export const CreateSemanticNodeSchema = SemanticNodeSchema.omit({ id: true });

/**
 * Schéma pour une relation sémantique
 * Représente un lien entre deux nœuds dans le Knowledge Graph
 */
export const SemanticRelationSchema = z.object({
  id: z.string().cuid().optional(),
  
  // Nœuds source et cible
  sourceNodeId: z.string().cuid(),
  targetNodeId: z.string().cuid(),
  
  // Type de relation
  relationType: SemanticRelationTypeSchema,
  
  // Attributs de la relation
  strength: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Force de la relation (0-1)'),
  evidence: z.string().optional().describe('Preuve de la relation (texte ou référence)'),
  
  // Métadonnées
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Score de confiance si généré par IA'),
});

/**
 * Schéma pour créer une relation sémantique (sans ID)
 */
export const CreateSemanticRelationSchema = SemanticRelationSchema.omit({ id: true });

/**
 * Schéma pour un graphe complet (nœuds + relations)
 * Utilisé lors de l'extraction depuis une transcription
 */
export const KnowledgeGraphSchema = z.object({
  nodes: z.array(CreateSemanticNodeSchema).min(1, 'Au moins un nœud est requis'),
  relations: z.array(CreateSemanticRelationSchema).default([]),
});

/**
 * Types TypeScript dérivés
 */
export type SemanticNodeType = z.infer<typeof SemanticNodeTypeSchema>;
export type SemanticRelationType = z.infer<typeof SemanticRelationTypeSchema>;
export type SemanticNode = z.infer<typeof SemanticNodeSchema>;
export type CreateSemanticNode = z.infer<typeof CreateSemanticNodeSchema>;
export type SemanticRelation = z.infer<typeof SemanticRelationSchema>;
export type CreateSemanticRelation = z.infer<typeof CreateSemanticRelationSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
