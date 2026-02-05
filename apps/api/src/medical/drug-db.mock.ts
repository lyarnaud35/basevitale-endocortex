/**
 * Mini-Vidal – Référentiel local statique (Preuve de concept C+ Security Guardian).
 * Strategy Pattern : plus tard, remplaçable par appel API Vidal sans changer SecurityService.
 */

export interface DrugEntry {
  classes: string[];
}

/** Médicament (lowercase) → familles / classes d'allergie */
export const DRUG_DB: Record<string, DrugEntry> = {
  amoxicilline: { classes: ['PENICILLINE', 'ANTIBIOTIQUE'] },
  augmentin: { classes: ['PENICILLINE', 'ANTIBIOTIQUE'] },
  ampicilline: { classes: ['PENICILLINE', 'ANTIBIOTIQUE'] },
  aspirine: { classes: ['AINS', 'SALICYLE'] },
  ibuprofene: { classes: ['AINS'] },
  ketoprofene: { classes: ['AINS'] },
  doliprane: { classes: ['ANALGESIQUE'] },
  paracetamol: { classes: ['ANALGESIQUE'] },
  daflagan: { classes: ['ANALGESIQUE'] },
};

/** Substance allergène (lowercase) → classes. Utilisé pour croiser avec DRUG_DB. */
export const ALLERGY_TO_CLASSES: Record<string, string[]> = {
  pénicilline: ['PENICILLINE'],
  penicillin: ['PENICILLINE'],
  penicilline: ['PENICILLINE'],
  aspirine: ['SALICYLE', 'AINS'],
  salicyle: ['SALICYLE', 'AINS'],
  salicylés: ['SALICYLE', 'AINS'],
  ains: ['AINS'],
  ibuprofene: ['AINS'],
};
