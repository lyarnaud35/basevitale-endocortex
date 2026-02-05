import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { Consultation } from '@basevitale/shared';

/**
 * Gardien Causal (Module C+) – Scribe
 *
 * Interroge le graphe Neo4j (:Condition, :Medication, BELONGS_TO_CLASS) pour sécuriser les prescriptions.
 * checkSafety : alertes non bloquantes, logique transitive via le graphe (pas de comparaison string en JS).
 */

@Injectable()
export class ScribeGuardianService {
  private readonly logger = new Logger(ScribeGuardianService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Vérifie le draft contre les allergies du patient (Neo4j), de façon transitive.
   * 1. Allergies directes (HAS_CONDITION → Condition).
   * 2. Conflit si médicament = allergie OU (Medication)-[:BELONGS_TO_CLASS]->(classe)
   *    et allergie liée à la classe (égalité ou "Allergie X" CONTAINS "X").
   * Message démo : "Attention : Allergie Pénicilline détectée (via classe médicamenteuse)."
   */
  async checkSafety(patientId: string, draft: Consultation): Promise<{ alerts: string[] }> {
    const alerts: string[] = [];
    const meds = draft.medications ?? [];

    if (meds.length === 0) return { alerts };

    try {
      for (const m of meds) {
        const drugName = (m?.name ?? '').trim();
        if (!drugName) continue;

        const conflict = await this.getAllergyConflict(patientId, drugName);
        if (conflict) {
          const msg = conflict.viaClass
            ? `Attention : ${conflict.allergyName} détectée (via classe médicamenteuse).`
            : `Attention : ${conflict.allergyName} détectée (médicament contre-indiqué).`;
          alerts.push(msg);
        }
      }
    } catch (err) {
      this.logger.warn(
        '[Gardien] checkSafety: Neo4j indisponible, pas d’alertes',
        err instanceof Error ? err.message : String(err),
      );
    }

    return { alerts };
  }

  /**
   * Requête Cypher transitive : conflit médicament ↔ allergies du patient.
   * - Direct : allergie.name = $drugName.
   * - Via classe : (Medication)-[:BELONGS_TO_CLASS]->(classe), allergie.name = classe.name
   *   OU allergie.name CONTAINS classe.name (ex. "Allergie Pénicilline" + "Pénicilline").
   * @returns { allergyName, viaClass } ou null.
   */
  private async getAllergyConflict(
    patientId: string,
    drugName: string,
  ): Promise<{ allergyName: string; viaClass: boolean } | null> {
    const query = `
      MATCH (p:Patient {id: $patientId})-[:HAS_CONDITION]->(allergie:Condition)
      WHERE allergie.name IS NOT NULL
      OPTIONAL MATCH (med:Medication {name: $drugName})-[:BELONGS_TO_CLASS]->(classe)
      WITH allergie, classe,
        (allergie.name = $drugName) AS directMatch,
        (classe IS NOT NULL AND (allergie.name = classe.name OR allergie.name CONTAINS classe.name)) AS viaClassMatch
      WHERE directMatch OR viaClassMatch
      RETURN DISTINCT allergie.name AS allergyName, viaClassMatch AS viaClass
      LIMIT 1
    `;
    const result = await this.neo4j.executeQuery(query, { patientId, drugName });
    if (result.records.length === 0) return null;
    const r = result.records[0];
    const rawName = r.get('allergyName');
    const rawVia = r.get('viaClass');
    const name = typeof rawName === 'string' ? rawName : rawName != null ? String(rawName) : '';
    if (!name.trim()) return null;
    const viaClass = rawVia === true || rawVia === 'true';
    return { allergyName: name.trim(), viaClass };
  }
}
