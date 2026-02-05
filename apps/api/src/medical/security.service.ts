import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { DRUG_DB, ALLERGY_TO_CLASSES } from './drug-db.mock';

/** Résultat de la validation Mini-Vidal (Strategy : remplaçable par API Vidal). */
export interface ValidationResult {
  authorized: boolean;
  reason: string;
}

/**
 * Module C+ (Security Guardian) – Preuve de concept Mini-Vidal.
 * Vérification des contre-indications via référentiel local (DRUG_DB).
 * Plus tard : remplacer par appel API Vidal sans changer la logique d’intégration.
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Valide une prescription : allergies patient (Neo4j) × classes du médicament (DRUG_DB).
   */
  async validatePrescription(
    medicationName: string,
    patientId: string,
  ): Promise<ValidationResult> {
    const allergies = await this.getPatientAllergies(patientId);
    if (allergies.length === 0) {
      return { authorized: true, reason: '' };
    }

    const drugEntry = this.resolveDrug(medicationName);
    if (!drugEntry) {
      return { authorized: true, reason: '' };
    }

    const drugClasses = new Set(drugEntry.classes);

    for (const allergy of allergies) {
      const ac = ALLERGY_TO_CLASSES[allergy] ?? this.inferAllergyClasses(allergy);
      for (const c of ac) {
        if (drugClasses.has(c)) {
          const reason = `Médication "${medicationName}" contre-indiquée : allergie à "${allergy}" (classe ${c}).`;
          this.logger.warn(`[Security] ${reason}`);
          return { authorized: false, reason };
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

  /** Trouve l’entrée DRUG_DB pour un nom de médicament (exact ou partiel). */
  private resolveDrug(medicationName: string): { classes: string[] } | null {
    const n = medicationName.toLowerCase().trim();
    if (DRUG_DB[n]) return DRUG_DB[n];
    for (const [key, entry] of Object.entries(DRUG_DB)) {
      if (n.includes(key) || key.includes(n)) return entry;
    }
    return null;
  }

  /** Heuristique : déduire des classes à partir du libellé d’allergie. */
  private inferAllergyClasses(allergy: string): string[] {
    const a = allergy.toLowerCase();
    if (/p[eé]nicill|penicillin/.test(a)) return ['PENICILLINE'];
    if (/aspirin|salicyl|ains/.test(a)) return ['SALICYLE', 'AINS'];
    return [];
  }
}
