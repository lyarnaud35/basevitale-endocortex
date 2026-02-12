/**
 * Règles NGAP (POC) – Le Législateur.
 * Une règle = une condition sur les actes + contexte patient → prix et répartition.
 * Évoluera vers json-rules-engine ou fichier JSON externe.
 */

export interface NgapRuleResult {
  code: string;
  label: string;
  price: number;
  part_secu: number; // 0–1, part prise en charge sécu (AMO)
}

export interface NgapRule {
  condition: (ctx: { acts: string[]; patientAge?: number }) => boolean;
  result: NgapRuleResult;
}

/** Constitution POC : Consultation + Majoration Enfant (MEG) si âge < 6. */
export const NGAP_RULES: NgapRule[] = [
  {
    condition: (ctx) => ctx.acts.includes('C'),
    result: {
      code: 'C',
      label: 'Consultation médecine générale',
      price: 26.5,
      part_secu: 0.7,
    },
  },
  {
    condition: (ctx) =>
      ctx.acts.includes('C') &&
      ctx.patientAge != null &&
      ctx.patientAge < 6,
    result: {
      code: 'MEG',
      label: 'Majoration Enfant Généraliste',
      price: 5.0,
      part_secu: 1.0, // 100 % sécu pour enfant
    },
  },
];
