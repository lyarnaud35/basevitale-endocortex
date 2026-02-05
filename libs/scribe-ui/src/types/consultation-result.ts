/**
 * Structure de la consultation retournée par l'IA.
 * Utilisé par le widget et le Host.
 */
export interface ConsultationData {
  transcript?: string;
  symptoms?: string[];
  diagnosis?: Array<{ code?: string; label?: string; confidence?: number }>;
  medications?: Array<{ name?: string; dosage?: string; duration?: string }>;
  billingCodes?: Array<{ code?: string; label?: string; confidence?: number }>;
  prescription?: Array<{ drug?: string; dosage?: string; duration?: string }>;
  alerts?: string[];
}

/**
 * Données envoyées au Host via onComplete après validation finale.
 * Cahier des charges Golden Master : draftId + consultation.
 */
export interface ConsultationAnalysis {
  draftId: string;
  consultation: ConsultationData;
}
