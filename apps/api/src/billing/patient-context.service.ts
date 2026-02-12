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

@Injectable()
export class PatientContextService {
  private readonly mockPatients: Record<string, PatientContextData> = {
    patient_a: { age: 35, label: 'Patient A (Adulte)', coverage: 0 },
    patient_b: { age: 4, label: 'Patient B (Enfant)', coverage: 0 },
    patient_c: { age: 52, label: 'Patient C (CMU/C2S)', coverage: 1 },
  };

  getAge(patientId: string): number | undefined {
    return this.mockPatients[patientId]?.age;
  }

  getContext(patientId: string): PatientContextData | undefined {
    return this.mockPatients[patientId];
  }

  /** Contexte pour le moteur de règles (patient.age, patient.coverage). */
  getEngineContext(patientId: string): { age?: number; coverage?: number } | undefined {
    const p = this.mockPatients[patientId];
    if (!p) return undefined;
    return { age: p.age, coverage: p.coverage ?? 0 };
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
