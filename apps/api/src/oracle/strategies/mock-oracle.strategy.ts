import type { PatientContextData } from '../patient-context-machine.schema';
import { PatientContextDataSchema } from '../patient-context-machine.schema';
import type { OracleContextStrategy } from './oracle-context.strategy';

/**
 * Données fictives complètes (conformes PatientContextDataSchema).
 * Piège DEFCON_3 : "Allergie à la Pénicilline" pour tester Security + bouton Override (Phase 3).
 * (Patient Sain : remplacer par une alerte sans "pénicilline" pour Security IDLE.)
 */
function buildMockPatientContextData(patientId: string): PatientContextData {
  const raw = {
    patientId,
    timeline: [
      { date: '2024-01-15', type: 'consultation', summary: 'Consultation cardiologie – bilan hypertension' },
      { date: '2024-02-20', type: 'consultation', summary: 'Suivi tension – adaptation traitement' },
      { date: '2024-03-10', type: 'consultation', summary: 'ECG de contrôle – RAS' },
      { date: '2023-06-01', type: 'diagnostic', summary: 'Hypertension essentielle (I10)' },
      { date: '2022-01-15', type: 'diagnostic', summary: 'Diabète de type 2 (E11)' },
    ],
    alertes: [
      { level: 'HIGH' as const, message: 'Allergie à la Pénicilline – ne pas prescrire' },
      { level: 'MEDIUM' as const, message: 'Interaction possible AINS / antihypertenseur – surveiller' },
      { level: 'MEDIUM' as const, message: 'Dernière HbA1c 7.2% – objectif < 7%' },
    ],
  };
  return PatientContextDataSchema.parse(raw);
}

/**
 * Strategy MOCK : retourne instantanément un contexte patient fictif valide.
 */
export class MockOracleStrategy implements OracleContextStrategy {
  async fetchContext(patientId: string): Promise<PatientContextData> {
    return Promise.resolve(buildMockPatientContextData(patientId));
  }
}
