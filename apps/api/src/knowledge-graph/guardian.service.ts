import { Injectable, Logger } from '@nestjs/common';
import type { Consultation } from '@basevitale/shared';
import { Neo4jService } from '../neo4j/neo4j.service';

/**
 * Module C+ Gardien – Boucle de feedback (Wow Effect)
 *
 * Utilise le graphe Neo4j (allergies du patient) pour bloquer ou alerter
 * lorsqu'une médication proposée est contre-indiquée (ex. Amoxicilline + allergie Pénicilline).
 */

/** Médicament → allergènes (famille). Normalisation lowercase. */
const DRUG_TO_ALLERGENS: Record<string, string[]> = {
  amoxicilline: ['pénicilline', 'penicillin'],
  amoxicillin: ['pénicilline', 'penicillin'],
  ampicilline: ['pénicilline', 'penicillin'],
  ampicillin: ['pénicilline', 'penicillin'],
  penicillin: ['pénicilline', 'penicillin'],
  pénicilline: ['pénicilline', 'penicillin'],
  augmentin: ['pénicilline', 'penicillin', 'amoxicilline'],
  coamoxiclav: ['pénicilline', 'penicillin', 'amoxicilline'],
};

export interface MedicationInput {
  name?: string;
  dosage?: string;
  duration?: string;
}

export interface GuardianConflict {
  medication: string;
  allergy: string;
  reason: string;
}

export interface GuardianResult {
  safe: boolean;
  conflicts: GuardianConflict[];
}

@Injectable()
export class GuardianService {
  private readonly logger = new Logger(GuardianService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Récupère les allergies connues du patient.
   * - HAS_ALLERGY → Allergy.name (extraction diagnostics "Allergie à X")
   * - HAS_CONDITION → Condition.name lorsque type allergie (vérité terrain, ex. "Allergie Pénicilline")
   */
  async getPatientAllergies(patientId: string): Promise<string[]> {
    if (!patientId?.trim()) return [];

    const names: string[] = [];

    try {
      const allergyQuery = `
        MATCH (p:Patient {id: $patientId})-[:HAS_ALLERGY]->(a:Allergy)
        RETURN DISTINCT a.name AS name
      `;
      const allergyResult = await this.neo4j.executeQuery(allergyQuery, { patientId });
      for (const record of allergyResult.records) {
        const raw = record.get('name');
        const name = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        if (name.trim()) names.push(name.toLowerCase().trim());
      }

      const conditionQuery = `
        MATCH (p:Patient {id: $patientId})-[:HAS_CONDITION]->(c:Condition)
        WHERE c.name IS NOT NULL AND toLower(toString(c.name)) CONTAINS 'allergie'
        RETURN DISTINCT c.name AS name
      `;
      const conditionResult = await this.neo4j.executeQuery(conditionQuery, { patientId });
      for (const record of conditionResult.records) {
        const raw = record.get('name');
        const str = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        const extracted = this.extractAllergenFromCondition(str);
        if (extracted) names.push(extracted);
      }

      return [...new Set(names)];
    } catch (err) {
      this.logger.warn(
        '[Gardien] Neo4j indisponible, impossible de charger les allergies',
        err instanceof Error ? err.message : String(err),
      );
      return [];
    }
  }

  /**
   * Extrait la substance allergène depuis un libellé Condition (ex. "Allergie Pénicilline" → "pénicilline").
   */
  private extractAllergenFromCondition(label: string): string | null {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/allergie\s+(?:à\s+(?:la\s+)?|a\s+(?:la\s+)?)?(.+)/i);
    const substance = (m ? m[1] : trimmed).trim();
    return substance ? substance.toLowerCase() : null;
  }

  /**
   * Vérifie les médicaments proposés contre les allergies du patient.
   * Retourne { safe: false, conflicts } si au moins un conflit.
   */
  async checkMedicationsAgainstAllergies(
    patientId: string,
    medications: MedicationInput[],
  ): Promise<GuardianResult> {
    const allergies = await this.getPatientAllergies(patientId);
    if (allergies.length === 0) {
      return { safe: true, conflicts: [] };
    }

    const conflicts: GuardianConflict[] = [];

    const seen = new Set<string>();
    for (const med of medications ?? []) {
      const name = (med.name ?? '').trim();
      if (!name) continue;

      const normalized = name.toLowerCase();

      // Correspondance directe (MVP) : médicament = allergie ou l’un contient l’autre
      for (const a of allergies) {
        const match =
          a === normalized ||
          a.includes(normalized) ||
          normalized.includes(a);
        if (!match) continue;
        const key = `${normalized}|${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({
          medication: name,
          allergy: a,
          reason: `Médication contre-indiquée : ${name} (allergie connue : ${a})`,
        });
      }

      // Via familles (DRUG_TO_ALLERGENS) : ex. Amoxicilline → Pénicilline
      const drugAllergens = this.getAllergensForDrug(normalized);
      for (const allergen of drugAllergens) {
        const matches = allergies.some(
          (a) => a === allergen || a.includes(allergen) || allergen.includes(a),
        );
        if (!matches) continue;
        const key = `${normalized}|${allergen}`;
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({
          medication: name,
          allergy: allergen,
          reason: `Médication contre-indiquée : ${name} (allergie connue : ${allergen})`,
        });
      }
    }

    return {
      safe: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Retourne les allergènes potentiels pour un médicament (normalisé).
   */
  private getAllergensForDrug(normalized: string): string[] {
    const out = new Set<string>();

    if (DRUG_TO_ALLERGENS[normalized]) {
      DRUG_TO_ALLERGENS[normalized].forEach((a) => out.add(a));
    }

    for (const [drug, allergens] of Object.entries(DRUG_TO_ALLERGENS)) {
      if (normalized.includes(drug) || drug.includes(normalized)) {
        allergens.forEach((a) => out.add(a));
      }
    }

    return [...out];
  }

  /**
   * Gardien Causal (MVP) – Alertes non bloquantes.
   * Interroge Neo4j (:Condition) du patient, compare aux médicaments du draft.
   * Si "Pénicilline" dans les conditions et "Amoxicilline" ou "Pénicilline" dans le draft → ALERTE.
   * Les alertes sont injectées dans le draft avant sauvegarde.
   */
  async checkSafety(patientId: string, draft: Consultation): Promise<{ alerts: string[] }> {
    const alerts: string[] = [];

    try {
      const query = `
        MATCH (p:Patient {id: $patientId})-[:HAS_CONDITION]->(c:Condition)
        WHERE c.name IS NOT NULL
        RETURN DISTINCT c.name AS name
      `;
      const result = await this.neo4j.executeQuery(query, { patientId });
      const conditions: string[] = [];
      for (const record of result.records) {
        const raw = record.get('name');
        const str = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        if (str.trim()) conditions.push(str.toLowerCase().trim());
      }

      const allergicToPenicillin = conditions.some(
        (c) => c.includes('pénicilline') || c.includes('penicilline'),
      );
      if (!allergicToPenicillin) return { alerts };

      const meds = draft.medications ?? [];
      for (const m of meds) {
        const name = (m?.name ?? '').trim();
        if (!name) continue;
        const n = name.toLowerCase();
        const isPenicillinType =
          n.includes('amoxicilline') || n.includes('amoxicillin') ||
          n.includes('pénicilline') || n.includes('penicilline') ||
          n.includes('ampicilline') || n.includes('ampicillin');
        if (isPenicillinType) {
          alerts.push(
            `Contre-indication : ${name} (allergie Pénicilline connue). Vérifier avant prescription.`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        '[Gardien] checkSafety: Neo4j indisponible, pas d’alertes Condition',
        err instanceof Error ? err.message : String(err),
      );
    }

    return { alerts };
  }
}
