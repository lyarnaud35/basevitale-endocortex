/**
 * Patient Zéro — Profil statique pour tests et démo (Semaine 2 : Sécurité / Allergies).
 * Utilisé par le Scribe pour valider la charge cognitive et les alertes (ex. AMOXICILLINE).
 */
export const PATIENT_ZERO = {
  id: 'PATIENT_ZERO',
  nom: 'Jean Test',
  allergies: ['AMOXICILLINE'],
} as const;

export type PatientZero = typeof PATIENT_ZERO;
