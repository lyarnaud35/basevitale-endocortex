import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Neo4jService } from '../neo4j/neo4j.service';
import { GuardianService, type DraftSafetyReport } from '../knowledge-graph/guardian.service';
import type {
  PrescriptionDraftState,
  DraftDrugItem,
  PrescriptionHistoryItem,
  PrescriptionHistoryResponse,
} from './prescription-draft.types';

interface DraftLine {
  cisId: string;
  posology?: string;
}

interface StoredDraft {
  patientId: string;
  items: DraftLine[];
}

/**
 * Moteur transactionnel du brouillon d'ordonnance (Ghost Protocol).
 * Stockage temporaire en mémoire (une entrée par patientId).
 * À chaque add/remove : recalcul immédiat de la sécurité globale (allergies + doublons molécules).
 */
@Injectable()
export class PrescriptionDraftService {
  private readonly logger = new Logger(PrescriptionDraftService.name);
  private readonly store = new Map<string, StoredDraft>();

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly guardian: GuardianService,
  ) {}

  /**
   * Ajoute un CIS au brouillon du patient (avec posologie optionnelle). Recalcule la sécurité globale.
   */
  async addDrug(patientId: string, cisId: string, posology?: string): Promise<PrescriptionDraftState> {
    const key = this.key(patientId);
    let draft = this.store.get(key);
    if (!draft) {
      draft = { patientId, items: [] };
      this.store.set(key, draft);
    }
    const trimmed = (cisId ?? '').trim();
    const existing = draft.items.find((i) => i.cisId === trimmed);
    if (trimmed && !existing) {
      draft.items = [...draft.items, { cisId: trimmed, posology: (posology ?? '').trim() || undefined }];
    } else if (existing && (posology ?? '').trim()) {
      existing.posology = (posology ?? '').trim();
    }
    return this.buildState(draft);
  }

  /**
   * Retire un CIS du brouillon.
   */
  async removeDrug(patientId: string, cisId: string): Promise<PrescriptionDraftState> {
    const key = this.key(patientId);
    const draft = this.store.get(key);
    if (!draft) {
      return this.emptyState(patientId);
    }
    const trimmed = (cisId ?? '').trim();
    draft.items = draft.items.filter((i) => i.cisId !== trimmed);
    if (draft.items.length === 0) this.store.delete(key);
    return this.buildState(draft);
  }

  /**
   * Retourne l'état complet du brouillon (drugs + global_safety).
   */
  async getCurrent(patientId: string): Promise<PrescriptionDraftState> {
    const key = this.key(patientId);
    const draft = this.store.get(key);
    if (!draft) return this.emptyState(patientId);
    return this.buildState(draft);
  }

  /**
   * Cristallisation : écrit le brouillon en Neo4j (nœud Prescription + relations), vide la RAM.
   * Refuse si brouillon vide ou si safetyReport.status === 'CRITICAL'.
   */
  async validate(patientId: string): Promise<{ prescriptionId: string }> {
    const key = this.key(patientId);
    const draft = this.store.get(key);
    if (!draft || draft.items.length === 0) {
      throw new BadRequestException('Brouillon vide : impossible de valider.');
    }
    const state = await this.buildState(draft);
    if (state.safetyReport.status === 'CRITICAL') {
      throw new ForbiddenException(
        'Ordonnance non validable : sécurité CRITICAL (allergie ou doublon de molécule). Corrigez avant de valider.',
      );
    }

    const prescriptionId = randomUUID();
    const date = new Date().toISOString();
    const drugs = draft.items.map((i) => ({ cisId: i.cisId, posology: i.posology ?? '' }));

    const cypher = `
      MERGE (p:Patient {id: $patientId})
      CREATE (o:Prescription {id: $prescriptionId, date: $date, status: 'VALIDATED'})
      MERGE (p)-[:A_DOSSIER_CLINIQUE]->(o)
      WITH o
      UNWIND $drugs AS item
      MERGE (d:Drug {cisId: item.cisId})
      CREATE (o)-[:PRESCROIT {posologie: item.posology}]->(d)
      RETURN o.id AS id
    `;
    await this.neo4j.executeTransaction([
      {
        query: cypher,
        parameters: { patientId: draft.patientId, prescriptionId, date, drugs },
      },
    ]);

    this.store.delete(key);
    this.logger.log(`Prescription ${prescriptionId} cristallisée pour patient ${draft.patientId} (${draft.items.length} ligne(s)).`);
    return { prescriptionId };
  }

  /**
   * Historique des ordonnances validées (timeline patient).
   * Dernières 5 ordonnances avec médicaments et posologies.
   */
  async getPrescriptionHistory(patientId: string): Promise<PrescriptionHistoryResponse> {
    const pid = (patientId ?? '').trim();
    if (!pid) return { prescriptions: [] };
    try {
      const result = await this.neo4j.executeQuery(
        `
        MATCH (p:Patient {id: $patientId})-[:A_DOSSIER_CLINIQUE]->(o:Prescription)
        OPTIONAL MATCH (o)-[r:PRESCROIT]->(d:Drug)
        WITH o, collect({ cisId: d.cisId, name: d.name, posologie: r.posologie }) AS rawDrugs
        RETURN o.id AS id, o.date AS date, o.status AS status, rawDrugs AS drugs
        ORDER BY o.date DESC
        LIMIT 5
        `,
        { patientId: pid },
      );
      const prescriptions: PrescriptionHistoryItem[] = result.records.map((r) => {
        const id = String(r.get('id') ?? '');
        const date = String(r.get('date') ?? '');
        const status = String(r.get('status') ?? 'VALIDATED');
        const raw = (r.get('drugs') as Array<{ cisId?: string; name?: string; posologie?: string }>) ?? [];
        const drugs = raw
          .filter((x) => x?.cisId)
          .map((x) => ({
            cisId: String(x!.cisId),
            name: String(x!.name ?? ''),
            posologie: String(x!.posologie ?? ''),
          }));
        return { id, date, status, drugs };
      });
      return { prescriptions };
    } catch (err) {
      this.logger.warn(
        'getPrescriptionHistory Neo4j error',
        err instanceof Error ? err.message : String(err),
      );
      return { prescriptions: [] };
    }
  }

  private key(patientId: string): string {
    return (patientId ?? '').trim() || '_anonymous';
  }

  private emptyState(patientId: string): PrescriptionDraftState {
    const safetyReport: DraftSafetyReport = {
      status: 'OK',
      alerts: [],
      allergyConflicts: [],
      duplicateMolecules: [],
    };
    return {
      patientId: (patientId ?? '').trim(),
      cisIds: [],
      drugs: [],
      safetyReport,
      updatedAt: new Date().toISOString(),
    };
  }

  private async buildState(draft: StoredDraft): Promise<PrescriptionDraftState> {
    const cisIds = draft.items.map((i) => i.cisId);
    const posologyByCis = new Map(draft.items.map((i) => [i.cisId, i.posology]));
    const drugs = await this.fetchDrugsByCisIds(draft.items);
    const safetyReport = await this.guardian.analyzeDraft(draft.patientId, cisIds);
    return {
      patientId: draft.patientId,
      cisIds: [...cisIds],
      drugs: drugs.map((d) => ({ ...d, posology: posologyByCis.get(d.cisId) ?? d.posology })),
      safetyReport,
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchDrugsByCisIds(items: DraftLine[]): Promise<DraftDrugItem[]> {
    const cisIds = items.map((i) => i.cisId);
    if (cisIds.length === 0) return [];
    try {
      const result = await this.neo4j.executeQuery(
        `MATCH (d:Drug) WHERE d.cisId IN $cisIds
         RETURN d.cisId AS cisId, d.name AS name, d.form AS form`,
        { cisIds },
      );
      const byCis = new Map<string, Omit<DraftDrugItem, 'posology'>>();
      for (const record of result.records) {
        const cisId = String(record.get('cisId') ?? '');
        byCis.set(cisId, {
          cisId,
          name: String(record.get('name') ?? ''),
          form: String(record.get('form') ?? ''),
        });
      }
      return items.map((item) => {
        const base = byCis.get(item.cisId) ?? { cisId: item.cisId, name: '', form: '' };
        return { ...base, posology: item.posology };
      });
    } catch (err) {
      this.logger.warn('fetchDrugsByCisIds Neo4j error', err instanceof Error ? err.message : String(err));
      return items.map((item) => ({ cisId: item.cisId, name: '', form: '', posology: item.posology }));
    }
  }
}
