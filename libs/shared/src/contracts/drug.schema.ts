import { z } from 'zod';

/**
 * GHOST PROTOCOL — Drug Search (Deep Roots)
 * Contrat Backend GET /api/drugs/search ↔ Frontend.
 */

/** SYNAPSE v201 : molécule (substance active) + dosage pour "Contient : Paracétamol (500mg)". */
export const DrugSearchMoleculeSchema = z.object({
  name: z.string(),
  dosage: z.string(),
});
export type DrugSearchMolecule = z.infer<typeof DrugSearchMoleculeSchema>;

/** Statut sécurité (Smart Search avec patientId). */
export const DrugSearchSafetySchema = z.object({
  status: z.enum(['SAFE', 'WARNING', 'BLOCKED']),
  reason: z.string().nullable().optional(),
});
export type DrugSearchSafety = z.infer<typeof DrugSearchSafetySchema>;

/** Pack (conditionnement) pour facturation. */
export const DrugSearchPackSchema = z.object({
  cip7: z.string(),
  cip13: z.string(),
  libelle: z.string().optional(),
  prix: z.number().nullable().optional(),
  tauxRemboursement: z.number().nullable().optional(),
});
export type DrugSearchPack = z.infer<typeof DrugSearchPackSchema>;

export const DrugSearchResultSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['Brand', 'Generic']),
  cis: z.string().optional(),
  denomination: z.string().optional(),
  molecules: z.array(DrugSearchMoleculeSchema).optional(),
  safety: DrugSearchSafetySchema.optional(),
  packs: z.array(DrugSearchPackSchema).optional(),
});

export type DrugSearchResult = z.infer<typeof DrugSearchResultSchema>;
