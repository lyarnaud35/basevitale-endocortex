import type { PatientContextData } from '../patient-context-machine.schema';

/**
 * Strategy pour la récupération du contexte patient (Oracle).
 * MOCK = données fictives conformes au schéma Zod.
 * LIVE = Mock Graph + appel xAI.
 */
export interface OracleContextStrategy {
  fetchContext(patientId: string): Promise<PatientContextData>;
}
