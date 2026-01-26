import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { Consultation } from '@basevitale/shared';

/**
 * GraphProjectorService – Mémoire sémantique (Neo4j)
 *
 * Projette les données structurées (ConsultationDraft) dans le graphe Neo4j.
 * Utilise MERGE pour idempotence (relances sans duplication).
 *
 * Law IV: Data Safety – Write Postgres, sync to Neo4j on projection.
 */
@Injectable()
export class GraphProjectorService {
  private readonly logger = new Logger(GraphProjectorService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Projette une consultation vers Neo4j.
   * En cas d'erreur (ex. Neo4j éteint), logue un warning et ne fait pas crasher la requête HTTP.
   *
   * @param patientId – Identifiant du patient
   * @param data – Consultation conforme à ConsultationSchema
   */
  async projectConsultation(patientId: string, data: Consultation): Promise<void> {
    if (!patientId?.trim()) {
      this.logger.warn('[GRAPH] Projection ignorée: patientId manquant');
      return;
    }

    const queries: Array<{ query: string; parameters: Record<string, unknown> }> = [];

    // 1. MERGE Patient
    queries.push({
      query: `MERGE (p:Patient {id: $patientId}) RETURN p`,
      parameters: { patientId },
    });

    // 2. Symptômes: MERGE (:Symptom {name}), (Patient)-[:HAS_SYMPTOM {detectedAt}]->
    for (const s of data.symptoms ?? []) {
      const name = typeof s === 'string' ? s.trim() : '';
      if (!name) continue;
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId})
          MERGE (s:Symptom {name: $name})
          MERGE (p)-[r:HAS_SYMPTOM]->(s)
          ON CREATE SET r.detectedAt = datetime()
          ON MATCH SET r.detectedAt = datetime()
          RETURN r
        `,
        parameters: { patientId, name },
      });
    }

    // 3. Diagnostics: MERGE (:Diagnosis {code, label}), (Patient)-[:HAS_CONDITION {confidence}]->
    for (const d of data.diagnosis ?? []) {
      if (!d?.code?.trim()) continue;
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId})
          MERGE (d:Diagnosis {code: $code, label: $label})
          MERGE (p)-[r:HAS_CONDITION]->(d)
          ON CREATE SET r.confidence = $confidence
          ON MATCH SET r.confidence = $confidence
          RETURN r
        `,
        parameters: {
          patientId,
          code: d.code,
          label: d.label ?? '',
          confidence: d.confidence ?? 0,
        },
      });
    }

    if (queries.length === 0) {
      this.logger.debug('[GRAPH] Aucun nœud à créer');
      return;
    }

    try {
      await this.neo4j.executeTransaction(queries);
      this.logger.log(`[GRAPH] Projection terminée : ${queries.length} opérations.`);
    } catch (err) {
      this.logger.warn(
        '[GRAPH] Neo4j indisponible, projection ignorée (requête HTTP non impactée)',
        err instanceof Error ? err.message : String(err),
      );
      // Ne pas relancer : le client reçoit son JSON.
    }
  }
}
