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

  /**
   * Projection Neo4j pour la validation finale (transaction distribuée simulée).
   * Structure: Patient, Consultation, REVEALED (c→Symptom), HAS_SYMPTOM (p→Symptom),
   * CONCLUDED (c→Diagnosis), HAS_CONDITION (p→Diagnosis). MERGE partout pour éviter doublons.
   *
   * @param draftId – ID du draft / consultation
   * @param patientId – ID du patient
   * @param data – Consultation validée (ConsultationSchema)
   * @returns Nombre de relations créées (pour métriques)
   */
  async projectValidation(
    draftId: string,
    patientId: string,
    data: Consultation,
  ): Promise<number> {
    if (!patientId?.trim()) {
      this.logger.warn('[GRAPH] projectValidation ignorée: patientId manquant');
      return 0;
    }

    const queries: Array<{ query: string; parameters: Record<string, unknown> }> = [];

    // 1. MERGE Patient
    queries.push({
      query: `MERGE (p:Patient {id: $patientId}) RETURN p`,
      parameters: { patientId },
    });

    // 2. CREATE Consultation + MERGE (p)-[:HAS_CONSULTATION]->(c)
    queries.push({
      query: `
        MATCH (p:Patient {id: $patientId})
        CREATE (c:Consultation {id: $draftId, date: datetime()})
        MERGE (p)-[:HAS_CONSULTATION]->(c)
        RETURN c
      `,
      parameters: { patientId, draftId },
    });

    // 3. Pour chaque symptôme: MERGE (s:Symptom {name}), (c)-[:REVEALED]->(s), (p)-[:HAS_SYMPTOM {since}]->
    // Normalisation: lowercase pour unicité ("Fièvre" et "fièvre" → même nœud). label = forme originale pour affichage.
    for (const s of data.symptoms ?? []) {
      const raw = typeof s === 'string' ? s.trim() : '';
      if (!raw) continue;
      const name = raw.toLowerCase();
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId}), (c:Consultation {id: $draftId})
          MERGE (s:Symptom {name: $name})
          ON CREATE SET s.label = $label
          ON MATCH SET s.label = CASE WHEN s.label IS NULL OR s.label = '' THEN $label ELSE s.label END
          MERGE (c)-[:REVEALED]->(s)
          MERGE (p)-[r:HAS_SYMPTOM]->(s)
          ON CREATE SET r.since = datetime()
          ON MATCH SET r.since = datetime()
          RETURN r
        `,
        parameters: { patientId, draftId, name, label: raw },
      });
    }

    // 4. Pour chaque diagnostic: MERGE (d:Diagnosis {code}), (c)-[:CONCLUDED]->(d), (p)-[:HAS_CONDITION]->
    //    Si label = "Allergie à X" → (p)-[:HAS_ALLERGY]->(Allergy {name}) pour la boucle de feedback (C+ Gardien)
    for (const d of data.diagnosis ?? []) {
      if (!d?.code?.trim()) continue;
      const label = (d.label ?? '').trim();
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId}), (c:Consultation {id: $draftId})
          MERGE (d:Diagnosis {code: $code})
          ON CREATE SET d.label = $label
          ON MATCH SET d.label = $label
          MERGE (c)-[:CONCLUDED]->(d)
          MERGE (p)-[:HAS_CONDITION]->(d)
          RETURN d
        `,
        parameters: {
          patientId,
          draftId,
          code: d.code,
          label,
        },
      });

      const allergyMatch = /allergie\s+[aà]\s+(.+)/i.exec(label);
      if (allergyMatch) {
        const substance = allergyMatch[1].trim();
        if (substance) {
          const name = substance.toLowerCase();
          queries.push({
            query: `
              MATCH (p:Patient {id: $patientId})
              MERGE (a:Allergy {name: $name})
              ON CREATE SET a.label = $label
              ON MATCH SET a.label = CASE WHEN a.label IS NULL OR a.label = '' THEN $label ELSE a.label END
              MERGE (p)-[:HAS_ALLERGY]->(a)
              RETURN a
            `,
            parameters: { patientId, name, label: substance },
          });
        }
      }
    }

    if (queries.length <= 2) {
      this.logger.debug('[GRAPH] projectValidation: aucun symptôme/diagnostic à lier');
    }

    try {
      const results = await this.neo4j.executeTransaction(queries);
      let total = 0;
      for (const r of results ?? []) {
        try {
          const summary = await Promise.resolve((r as { summary?: () => { counters?: { relationshipsCreated?: () => number } } }).summary?.());
          const cnt = summary?.counters?.relationshipsCreated?.();
          if (typeof cnt === 'number') total += cnt;
        } catch {
          /* un résultat inattendu ne doit pas faire échouer la projection */
        }
      }
      this.logger.log(`[GRAPH] projectValidation terminée : ${queries.length} opérations, ${total} relations.`);
      return total;
    } catch (err) {
      this.logger.error(
        '[GRAPH] Neo4j projection failed',
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }
}
