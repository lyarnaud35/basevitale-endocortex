import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { DrugService } from './drug.service';

/** Résultat de la validation Mini-Vidal (Strategy : remplaçable par API Vidal). */
export interface ValidationResult {
  authorized: boolean;
  reason: string;
}

/**
 * Familles d'allergies → radicaux de molécules à considérer comme contre-indiqués.
 * Permet de matcher "pénicilline" avec des spécialités contenant amoxicilline, ampicilline, etc.
 */
const ALLERGY_FAMILY_TO_MOLECULE_STEMS: Record<string, string[]> = {
  pénicilline: ['amoxicilline', 'ampicilline', 'penicillin', 'pénicilline', 'benzylpénicilline'],
  penicillin: ['amoxicilline', 'ampicilline', 'penicillin', 'pénicilline'],
  penicilline: ['amoxicilline', 'ampicilline', 'penicillin', 'pénicilline'],
  aspirine: ['aspirine', 'acide acétylsalicylique', 'salicylate'],
  salicyle: ['aspirine', 'acide acétylsalicylique', 'salicylate'],
  salicylés: ['aspirine', 'acide acétylsalicylique', 'salicylate'],
  ains: ['ibuprofène', 'ketoprofène', 'diclofenac', 'naproxène', 'aspirine'],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/**
 * Module C+ (Security Guardian) – Deep Roots.
 * Vérification des contre-indications : allergies patient (Neo4j) × molécules du médicament (ontologie BDPM).
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly drugService: DrugService,
  ) {}

  /**
   * Valide une prescription : allergies patient (Neo4j) × molécules du médicament (ontologie Neo4j).
   */
  async validatePrescription(
    medicationName: string,
    patientId: string,
  ): Promise<ValidationResult> {
    const allergies = await this.getPatientAllergies(patientId);
    if (allergies.length === 0) {
      return { authorized: true, reason: '' };
    }

    const molecules = await this.drugService.getMoleculesForMedication(medicationName);
    if (molecules.length === 0) {
      return { authorized: true, reason: '' };
    }

    const moleculeDesignationsNorm = molecules.map((m) => normalize(m.designation));

    for (const allergy of allergies) {
      const allergyNorm = normalize(allergy);
      const stems = ALLERGY_FAMILY_TO_MOLECULE_STEMS[allergyNorm] ?? [allergyNorm];

      for (const designNorm of moleculeDesignationsNorm) {
        for (const stem of stems) {
          if (designNorm.includes(stem) || stem.includes(designNorm)) {
            const reason = `Médication "${medicationName}" contre-indiquée : allergie à "${allergy}" (substance : ${designNorm}).`;
            this.logger.warn(`[Security] ${reason}`);
            return { authorized: false, reason };
          }
        }
      }
    }

    return { authorized: true, reason: '' };
  }

  private async getPatientAllergies(patientId: string): Promise<string[]> {
    if (!patientId?.trim()) return [];

    const query = `
      MATCH (p:Patient {id: $patientId})-[:HAS_ALLERGY]->(a:Allergy)
      RETURN DISTINCT a.name AS name
    `;

    try {
      const result = await this.neo4j.executeQuery(query, { patientId });
      const names: string[] = [];
      for (const record of result.records) {
        const raw = record.get('name');
        const name = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        if (name.trim()) names.push(name.toLowerCase().trim());
      }
      return [...new Set(names)];
    } catch (err) {
      this.logger.warn(
        '[Security] Neo4j indisponible, impossible de charger les allergies',
        err instanceof Error ? err.message : String(err),
      );
      return [];
    }
  }
}
