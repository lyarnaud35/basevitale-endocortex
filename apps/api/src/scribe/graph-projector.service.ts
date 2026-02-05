import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { ConsultationDraft } from '../prisma/client';

/** Structure attendue de draft.structuredData (JSONB, conforme ConsultationSchema). */
interface StructuredData {
  symptoms?: string[];
  diagnosis?: Array< { code: string; label: string; confidence?: number } >;
  medications?: Array< { name: string; dosage: string; duration?: string } >;
}

/**
 * GraphProjectorService (Scribe)
 *
 * Transforme un ConsultationDraft validé (Postgres JSONB) en nœuds durables Neo4j.
 * Utilise une transaction WRITE unique : Patient, Consultation, REVEALS, DIAGNOSES, PRESCRIBES, etc.
 *
 * Law IV: Data Safety – Write Postgres, sync to Neo4j on validation.
 */
@Injectable()
export class ScribeGraphProjectorService {
  private readonly logger = new Logger(ScribeGraphProjectorService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Projette un draft validé dans Neo4j.
   * - MERGE Patient, CREATE Consultation, HAS_CONSULTATION
   * - Symptômes → REVEALS (c→Symptom)
   * - Diagnostics → Condition, DIAGNOSES {confidence}, HAS_CONDITION {since}
   * - Médicaments → PRESCRIBES {dosage}, TREATED_WITH (p→Medication)
   *
   * Gestion d'erreurs : Try/Catch, log puis rethrow. La transaction Neo4j WRITE est rollback
   * automatiquement par le driver en cas d'échec (aucune écriture partielle).
   * @returns Nombre d'opérations graphe exécutées (pour graphNodesCreated).
   */
  async projectDraft(draft: ConsultationDraft): Promise<number> {
    const { id: draftId, patientId, createdAt, structuredData } = draft;
    if (!patientId?.trim()) {
      this.logger.warn('[GRAPH] projectDraft ignoré: patientId manquant');
      return 0;
    }

    const data = structuredData as StructuredData;
    const since = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);

    const queries: Array<{ query: string; parameters: Record<string, unknown> }> = [];

    // 1. MERGE Patient
    queries.push({
      query: `MERGE (p:Patient {id: $patientId}) RETURN p`,
      parameters: { patientId },
    });

    // 2. CREATE Consultation + MERGE (p)-[:HAS_CONSULTATION]->(c)
    // date/since en ISO string pour éviter erreurs parsing Neo4j datetime()
    queries.push({
      query: `
        MATCH (p:Patient {id: $patientId})
        CREATE (c:Consultation {id: $draftId, date: $createdAt})
        MERGE (p)-[:HAS_CONSULTATION]->(c)
        RETURN c
      `,
      parameters: { patientId, draftId, createdAt: since },
    });

    // 3. Symptômes : MERGE (s:Symptom {name}), (c)-[:REVEALS]->(s)
    for (const symptom of data.symptoms ?? []) {
      const name = typeof symptom === 'string' ? symptom.trim() : '';
      if (!name) continue;
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId}), (c:Consultation {id: $draftId})
          MERGE (s:Symptom {name: $name})
          MERGE (c)-[:REVEALS]->(s)
          RETURN s
        `,
        parameters: { patientId, draftId, name },
      });
    }

    // 4. Diagnostics : MERGE (d:Condition {code}), SET d.name = label, DIAGNOSES {confidence}, HAS_CONDITION {since}
    for (const d of data.diagnosis ?? []) {
      if (!d?.code?.trim()) continue;
      const label = (d.label ?? '').trim();
      const confidence = typeof d.confidence === 'number' ? d.confidence : 0;
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId}), (c:Consultation {id: $draftId})
          MERGE (d:Condition {code: $code})
          ON CREATE SET d.name = $label
          ON MATCH SET d.name = $label
          MERGE (c)-[dx:DIAGNOSES]->(d)
          ON CREATE SET dx.confidence = $confidence
          ON MATCH SET dx.confidence = $confidence
          MERGE (p)-[hc:HAS_CONDITION]->(d)
          ON CREATE SET hc.since = $since
          ON MATCH SET hc.since = $since
          RETURN d
        `,
        parameters: { patientId, draftId, code: d.code, label, confidence, since },
      });
    }

    // 5. Médicaments : MERGE (m:Medication {name}), (c)-[:PRESCRIBES {dosage}]->(m), (p)-[:TREATED_WITH]->(m)
    for (const m of data.medications ?? []) {
      const name = (m?.name ?? '').trim();
      if (!name) continue;
      const dosage = (m?.dosage ?? '').trim();
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId}), (c:Consultation {id: $draftId})
          MERGE (m:Medication {name: $name})
          MERGE (c)-[pr:PRESCRIBES]->(m)
          ON CREATE SET pr.dosage = $dosage
          ON MATCH SET pr.dosage = $dosage
          MERGE (p)-[:TREATED_WITH]->(m)
          RETURN m
        `,
        parameters: { patientId, draftId, name, dosage },
      });
    }

    try {
      await this.neo4j.executeTransaction(queries);
      this.logger.log(
        `[GRAPH] projectDraft terminé : draft=${draftId}, ${queries.length} opérations.`,
      );
      return queries.length;
    } catch (err) {
      this.logger.error(
        '[GRAPH] projectDraft échec (transaction rollback)',
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }
}
