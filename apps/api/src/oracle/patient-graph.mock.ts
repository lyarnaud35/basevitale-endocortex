/**
 * Mock sémantique du graphe patient (simulation Neo4j).
 * Retourne une structure JSON complexe (Timeline brute + données patient) après un délai artificiel.
 * Permet de valider la FSM et le flux Oracle avant de brancher le driver Neo4j.
 */

export interface RawConsultationEntry {
  id: string;
  date: string | null;
  type: string;
  summary: string;
}

export interface RawConditionEntry {
  code: string;
  name: string;
  since: string | null;
}

export interface RawMedicationEntry {
  name: string;
  dosage?: string | null;
}

export interface RawPatientGraphData {
  patientId: string;
  consultations: RawConsultationEntry[];
  conditions: RawConditionEntry[];
  medications: RawMedicationEntry[];
  symptomsRecurrent: string[];
  /** Données brutes additionnelles (notes, alertes non structurées) */
  rawNotes?: string;
}

const MOCK_DELAY_MS = 400;

/**
 * Simule un délai réseau/DB (Neo4j).
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Génère des données patient mockées pour un patientId.
 */
function generateMockData(patientId: string): RawPatientGraphData {
  return {
    patientId,
    consultations: [
      { id: 'c1', date: '2024-01-15', type: 'consultation', summary: 'Consultation cardiologie – bilan hypertension' },
      { id: 'c2', date: '2024-02-20', type: 'consultation', summary: 'Suivi tension – adaptation traitement' },
      { id: 'c3', date: '2024-03-10', type: 'consultation', summary: 'ECG de contrôle – RAS' },
    ],
    conditions: [
      { code: 'I10', name: 'Hypertension essentielle', since: '2023-06-01' },
      { code: 'E11', name: 'Diabète de type 2', since: '2022-01-15' },
    ],
    medications: [
      { name: 'Amlodipine', dosage: '5 mg' },
      { name: 'Metformine', dosage: '1000 mg' },
    ],
    symptomsRecurrent: ['Céphalées', 'Vertiges matinaux'],
    rawNotes:
      'Patient sous traitement antihypertenseur et antidiabétique. Dernière HbA1c 7.2%. ' +
      'À surveiller: interaction possible avec AINS. Allergie pénicilline connue.',
  };
}

/**
 * Récupère le contexte patient "brut" (simulation Neo4j).
 * Délai artificiel pour simuler un appel base.
 */
export async function getRawPatientContext(
  patientId: string,
  delayMs: number = MOCK_DELAY_MS,
): Promise<RawPatientGraphData> {
  await delay(delayMs);
  return generateMockData(patientId);
}
