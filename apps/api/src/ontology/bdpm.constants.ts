/**
 * Constantes BDPM (ANSM) – Deep Roots / Ontologie pharmaceutique.
 * Référence : document « Contenu et format des fichiers téléchargeables dans la BDM » (ANSM).
 */

export const BDPM_BASE_URL = 'https://bdpmt.ansm.sante.fr/download/file';

/** Fichiers nécessaires pour (Medicament)-[:A_POUR_SUBSTANCE]->(Molecule) */
export const BDPM_FILES = {
  /** Spécialités : CIS, dénomination, forme pharmaceutique, statut… */
  CIS: 'CIS_bdpm.txt',
  /** Compositions : CIS, code substance, désignation, dosage, nature (SA/FT) */
  CIS_COMPO: 'CIS_COMPO_bdpm.txt',
} as const;

/**
 * Indices des colonnes (fichiers TSV sans en-tête).
 * À valider / adapter selon le PDF officiel ANSM (Contenu_et_format_des_fichiers_telechargeables_dans_la_BDM_v4.pdf).
 */
export const CIS_COLUMNS = {
  CODE_CIS: 0,
  DENOMINATION: 1,
  FORME_PHARMACEUTIQUE: 2,
  VOIES_ADMINISTRATION: 3,
  STATUT_AUTORISATION: 4,
  TYPE_PROCEDURE: 5,
  ETAT_COMMERCIALISATION: 6,
  DATE_AMM: 7,
  NUMERO_AUTORISATION: 8,
  TITULAIRE: 9,
} as const;

/** CIS_COMPO : colonne 1 = forme du composant, puis code/désignation/dosage/réf/nature. */
export const CIS_COMPO_COLUMNS = {
  CODE_CIS: 0,
  CODE_SUBSTANCE: 2,
  DESIGNATION_SUBSTANCE: 3,
  DOSAGE: 4,
  REFERENCE_DOSAGE: 5,
  /** SA = substance active, FT = fraction thérapeutique, etc. */
  NATURE_COMPOSANT: 6,
} as const;

/** Valeur "nature du composant" = substance active (principe actif) */
export const NATURE_SUBSTANCE_ACTIVE = 'SA';
