import { Injectable } from '@nestjs/common';

/**
 * Contexte patient pour le Réacteur Fiscal (POC).
 * Résout patientId → âge, couverture (mock). À brancher sur Neo4j / Identity plus tard.
 */
export interface PatientContextData {
  age: number;
  label: string;
  coverage?: number; // 0–1 (1 = 100 % CMU/C2S → tiers payant)
}

/** Scénarios démo (sync ScenarioSelector) : Jean = ALD 100%, Paul = standard 70%, Marie = standard. */
const DEMO_SCENARIO_COVERAGE: Record<string, number> = {
  'scenario-jean-peuplu': 1,   // ALD → Part Sécu 100%, Part Patient 0%
  'scenario-paul-normal': 0,   // Standard → 70% / 30%
  'scenario-marie-enceinte': 0,
};

@Injectable()
export class PatientContextService {
  private readonly mockPatients: Record<string, PatientContextData> = {
    patient_a: { age: 35, label: 'Patient A (Adulte)', coverage: 0 },
    patient_b: { age: 4, label: 'Patient B (Enfant)', coverage: 0 },
    patient_c: { age: 52, label: 'Patient C (CMU/C2S)', coverage: 1 },
    'scenario-jean-peuplu': { age: 60, label: 'Jean Peuplu (M. Allergique)', coverage: 1 },
    'scenario-paul-normal': { age: 45, label: 'Paul Normal (M. Standard)', coverage: 0 },
    'scenario-marie-enceinte': { age: 32, label: 'Marie Enceinte', coverage: 0 },
  };

  getAge(patientId: string): number | undefined {
    return this.mockPatients[patientId]?.age;
  }

  getContext(patientId: string): PatientContextData | undefined {
    return this.mockPatients[patientId];
  }

  /** Contexte pour le moteur de règles (patient.age, patient.coverage). Scénarios démo résolus comme les autres. */
  getEngineContext(patientId: string): { age?: number; coverage?: number } | undefined {
    const p = this.mockPatients[patientId];
    if (!p) return undefined;
    const coverage = p.coverage ?? DEMO_SCENARIO_COVERAGE[patientId] ?? 0;
    return { age: p.age, coverage };
  }

  listForDemo(): Array<{ id: string; label: string; age: number; coverage?: number }> {
    return Object.entries(this.mockPatients).map(([id, v]) => ({
      id,
      label: v.label,
      age: v.age,
      coverage: v.coverage,
    }));
  }
}
