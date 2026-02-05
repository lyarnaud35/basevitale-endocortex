import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import {
  PatientMedicalProfileSchema,
  type PatientMedicalProfile,
  type ConsultationTimelineItem,
  type ConditionTimelineItem,
  type MedicationTimelineItem,
} from '@basevitale/shared';

/**
 * GraphReaderService (Total Recall)
 *
 * Lit le graphe Neo4j (Patient, Consultation, Condition, Medication, Symptom)
 * et restitue un "Profil Médical" pour l’affichage dans l’app hôte (ex. Ben).
 *
 * Law IV: Data Safety — Read: Neo4j (Projected Views).
 */
@Injectable()
export class GraphReaderService {
  private readonly logger = new Logger(GraphReaderService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Retourne le profil médical du patient (consultations, conditions, médicaments, symptômes récurrents).
   * Utilisé par GET /scribe/patient/:patientId/profile.
   */
  async getPatientMedicalProfile(patientId: string): Promise<PatientMedicalProfile> {
    if (!patientId?.trim()) {
      throw new NotFoundException('patientId est requis');
    }

    const pid = patientId.trim();

    try {
      this.neo4j.getDriver();
    } catch {
      this.logger.warn('[GraphReader] Neo4j indisponible');
      throw new ServiceUnavailableException('Neo4j indisponible');
    }

    const exists = await this.checkPatientExists(pid);
    if (!exists) {
      throw new NotFoundException(`Patient ${pid} introuvable dans le graphe`);
    }

    const [consultations, conditions, medications, symptomsRecurrent] = await Promise.all([
      this.fetchConsultations(pid),
      this.fetchConditions(pid),
      this.fetchMedications(pid),
      this.fetchSymptomsRecurrent(pid),
    ]);

    const profile: PatientMedicalProfile = {
      patientId: pid,
      consultations,
      conditions,
      medications,
      symptomsRecurrent,
    };

    return PatientMedicalProfileSchema.parse(profile);
  }

  private async checkPatientExists(patientId: string): Promise<boolean> {
    const result = await this.neo4j.executeQuery(
      `MATCH (p:Patient {id: $patientId}) RETURN p LIMIT 1`,
      { patientId },
    );
    return result.records.length > 0;
  }

  private async fetchConsultations(patientId: string): Promise<ConsultationTimelineItem[]> {
    const result = await this.neo4j.executeQuery(
      `
      MATCH (p:Patient {id: $patientId})-[:HAS_CONSULTATION]->(c:Consultation)
      RETURN c.id AS id, c.date AS date
      ORDER BY c.date DESC
      `,
      { patientId },
    );

    return result.records.map((r) => {
      const id = r.get('id');
      const date = r.get('date');
      return {
        id: typeof id === 'string' ? id : String(id ?? ''),
        date: date != null ? String(date) : null,
      };
    });
  }

  private async fetchConditions(patientId: string): Promise<ConditionTimelineItem[]> {
    const result = await this.neo4j.executeQuery(
      `
      MATCH (p:Patient {id: $patientId})-[r:HAS_CONDITION]->(c:Condition)
      RETURN c.code AS code, c.name AS name, r.since AS since
      `,
      { patientId },
    );

    return result.records.map((r) => ({
      code: String(r.get('code') ?? ''),
      name: String(r.get('name') ?? ''),
      since: r.get('since') != null ? String(r.get('since')) : null,
    }));
  }

  private async fetchMedications(patientId: string): Promise<MedicationTimelineItem[]> {
    const result = await this.neo4j.executeQuery(
      `
      MATCH (p:Patient {id: $patientId})-[:HAS_CONSULTATION]->(cons:Consultation)-[pr:PRESCRIBES]->(m:Medication)
      RETURN DISTINCT m.name AS name, pr.dosage AS dosage, cons.date AS d
      ORDER BY d DESC
      `,
      { patientId },
    );

    const byName = new Map<string, string | null>();
    for (const r of result.records) {
      const name = String(r.get('name') ?? '');
      if (byName.has(name)) continue;
      const dosage = r.get('dosage');
      byName.set(name, dosage != null && typeof dosage === 'string' ? dosage : null);
    }
    const withDosage = Array.from(byName.entries()).map(([name, dosage]) => ({
      name,
      dosage,
    }));

    if (withDosage.length > 0) return withDosage;

    const fallback = await this.neo4j.executeQuery(
      `
      MATCH (p:Patient {id: $patientId})-[:TREATED_WITH]->(m:Medication)
      RETURN DISTINCT m.name AS name
      `,
      { patientId },
    );
    return fallback.records.map((r) => ({
      name: String(r.get('name') ?? ''),
      dosage: null,
    }));
  }

  private async fetchSymptomsRecurrent(patientId: string): Promise<string[]> {
    const result = await this.neo4j.executeQuery(
      `
      MATCH (p:Patient {id: $patientId})-[:HAS_CONSULTATION]->(c:Consultation)-[:REVEALS]->(s:Symptom)
      RETURN DISTINCT s.name AS name
      ORDER BY s.name
      `,
      { patientId },
    );

    return result.records
      .map((r) => r.get('name'))
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
  }
}
