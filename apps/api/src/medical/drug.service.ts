import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';

export interface DrugSearchMolecule {
  name: string;
  dosage: string;
}

/** Pack (conditionnement) – CIP7/CIP13, facturation Ghost. */
export interface DrugSearchPack {
  cip7: string;
  cip13: string;
  libelle?: string;
  prix?: number | null;
  tauxRemboursement?: number | null;
}

/** Contexte de sécurité pour un médicament (si patientId fourni). */
export interface DrugSearchSafety {
  status: 'SAFE' | 'WARNING' | 'BLOCKED';
  reason?: string | null;
}

export interface DrugSearchHit {
  /** CIS ou code (identifiant stable). */
  id: string;
  /** Dénomination / nom commercial ou substance. */
  label: string;
  /** "Brand" = médicament trouvé directement, "Generic" = remonté via molécule. */
  type?: 'Brand' | 'Generic';
  /** Pour compatibilité API existante. */
  cis?: string;
  denomination?: string;
  formePharmaceutique?: string;
  /** SYNAPSE v201 : "Contient : Paracétamol (500mg)" quand includeMolecules=true. */
  molecules?: DrugSearchMolecule[];
  /** Packs (boîtes) pour facturation – quand includePacks=true. */
  packs?: DrugSearchPack[];
  /** Contexte sécurité (patientId fourni) – rempli côté controller. */
  safety?: DrugSearchSafety;
}

const MEDICAL_SEARCH_INDEX = 'medical_search';

/**
 * Service de recherche de médicaments (BDPM / ontologie Neo4j).
 * Deep Roots : Full-Text hybride (Drug + Molecule), fuzzy, < 50ms.
 */
@Injectable()
export class DrugService implements OnModuleInit {
  private readonly logger = new Logger(DrugService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    try {
      await this.ensureSearchIndex();
    } catch (e: any) {
      this.logger.warn('Index fulltext medical_search non créé (Neo4j peut être indisponible):', (e as Error)?.message);
    }
  }

  /**
   * Crée l'index fulltext hybride Drug|Molecule sur n.name (une fois).
   */
  private async ensureSearchIndex(): Promise<void> {
    await this.neo4j.executeQuery(`
      CREATE FULLTEXT INDEX ${MEDICAL_SEARCH_INDEX} IF NOT EXISTS
      FOR (n:Drug|Molecule)
      ON EACH [n.name]
    `);
    this.logger.log('Index fulltext medical_search OK');
  }

  /**
   * Recherche hybride : nom commercial (Drug) ou substance (Molecule).
   * Fuzzy (ex. "Doliplane" → Doliprane). Si includeMolecules, remplit molecules ; si includePacks, remplit packs (CIP).
   */
  async searchDrugs(
    query: string,
    limit = 20,
    options?: { includeMolecules?: boolean; includePacks?: boolean },
  ): Promise<DrugSearchHit[]> {
    const q = (query || '').trim();
    if (!q || q.length < 3) return [];

    const limitInt = Math.max(1, Math.min(50, Math.floor(Number(limit)) || 20));
    const cleanQuery = q
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `${term}~`)
      .join(' AND ');

    const queryPrefix = q.slice(0, 20).trim().toLowerCase();
    const cypher = `
      CALL db.index.fulltext.queryNodes("${MEDICAL_SEARCH_INDEX}", $cleanQuery)
      YIELD node, score
      WHERE score > 0.3
      CALL {
        WITH node
        MATCH (node:Drug)
        RETURN node AS result, "Brand" AS type
        UNION
        WITH node
        MATCH (node:Molecule)<-[:CONTIENT]-(d:Drug)
        RETURN d AS result, "Generic" AS type
      }
      WITH result, type, score, toLower(result.name) AS labelLower
      RETURN DISTINCT result.cisId AS id, result.name AS label, type, score,
             CASE WHEN labelLower STARTS WITH $queryPrefix THEN 0 ELSE 1 END AS startMatch,
             CASE WHEN labelLower CONTAINS $queryPrefix THEN 0 ELSE 1 END AS containMatch
      ORDER BY startMatch ASC, containMatch ASC, score DESC, label ASC
      LIMIT $limit
    `;
    try {
      const result = await this.neo4j.executeQuery(cypher, {
        cleanQuery,
        queryPrefix: queryPrefix || q.toLowerCase(),
        limit: neo4j.int(limitInt),
      });

      const hits: DrugSearchHit[] = result.records.map((r) => ({
        id: String(r.get('id') ?? ''),
        label: String(r.get('label') ?? ''),
        type: r.get('type') === 'Generic' ? ('Generic' as const) : ('Brand' as const),
        cis: String(r.get('id') ?? ''),
        denomination: String(r.get('label') ?? ''),
      }));

      if (options?.includeMolecules && hits.length > 0) {
        const cisIds = [...new Set(hits.map((h) => h.id))];
        const moleculesByCis = await this.getMoleculesByCisIds(cisIds);
        for (const hit of hits) {
          hit.molecules = moleculesByCis.get(hit.id) ?? [];
        }
      }

      return hits;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('searchDrugs Neo4j error', msg);
      throw new Error(`Recherche BDPM impossible : ${msg}`);
    }
  }

  /**
   * Récupère les molécules (substances actives) par liste de CIS en une requête.
   */
  private async getMoleculesByCisIds(cisIds: string[]): Promise<Map<string, DrugSearchMolecule[]>> {
    if (cisIds.length === 0) return new Map();
    const cypher = `
      MATCH (d:Drug)-[r:CONTIENT]->(m:Molecule)
      WHERE d.cisId IN $cisIds
      RETURN d.cisId AS cisId, m.name AS name, r.dosage AS dosage
    `;
    const result = await this.neo4j.executeQuery(cypher, { cisIds });
    const map = new Map<string, DrugSearchMolecule[]>();
    for (const record of result.records) {
      const cisId = String(record.get('cisId') ?? '');
      const name = String(record.get('name') ?? '');
      const dosage = String(record.get('dosage') ?? '');
      const list = map.get(cisId) ?? [];
      list.push({ name, dosage });
      map.set(cisId, list);
    }
    return map;
  }

  /**
   * Récupère les Packs (CIP7/CIP13) par liste de CIS – facturation Ghost.
   */
  async getPacksByCisIds(cisIds: string[]): Promise<Map<string, DrugSearchPack[]>> {
    if (cisIds.length === 0) return new Map();
    const cypher = `
      MATCH (d:Drug)-[:VENDU_SOUS]->(p:Pack)
      WHERE d.cisId IN $cisIds
      RETURN d.cisId AS cisId, p.cip7 AS cip7, p.cip13 AS cip13, p.libelle AS libelle, p.prix AS prix, p.tauxRemboursement AS taux
    `;
    try {
      const result = await this.neo4j.executeQuery(cypher, { cisIds });
      const map = new Map<string, DrugSearchPack[]>();
      for (const record of result.records) {
        const cisId = String(record.get('cisId') ?? '');
        const list = map.get(cisId) ?? [];
        const rawPrix = record.get('prix');
        const rawTaux = record.get('taux');
        list.push({
          cip7: String(record.get('cip7') ?? ''),
          cip13: String(record.get('cip13') ?? ''),
          libelle: record.get('libelle') != null ? String(record.get('libelle')) : undefined,
          prix: rawPrix != null && typeof rawPrix === 'number' ? rawPrix : null,
          tauxRemboursement: rawTaux != null && typeof rawTaux === 'number' ? rawTaux : null,
        });
        map.set(cisId, list);
      }
      return map;
    } catch (err) {
      this.logger.warn('getPacksByCisIds Neo4j error', err instanceof Error ? err.message : String(err));
      return new Map();
    }
  }

  /**
   * Retourne les molécules (substances actives) d'un médicament par CIS ou par nom.
   * Ontologie : Drug -[:CONTIENT]-> Molecule.
   */
  async getMoleculesForMedication(medicationNameOrCis: string): Promise<{ codeSubstance: string; designation: string }[]> {
    const s = (medicationNameOrCis || '').trim();
    if (!s) return [];

    const isCis = /^\d{7,8}$/.test(s);
    const cypher = isCis
      ? `
      MATCH (d:Drug {cisId: $value})-[:CONTIENT]->(m:Molecule)
      RETURN m.code AS codeSubstance, m.name AS designation
    `
      : `
      MATCH (d:Drug)-[:CONTIENT]->(m:Molecule)
      WHERE toLower(d.name) CONTAINS toLower($value) OR toLower($value) CONTAINS toLower(d.name)
      RETURN DISTINCT m.code AS codeSubstance, m.name AS designation
    `;
    try {
      const result = await this.neo4j.executeQuery(cypher, { value: s });
      return result.records.map((record) => ({
        codeSubstance: String(record.get('codeSubstance') ?? ''),
        designation: String(record.get('designation') ?? ''),
      }));
    } catch (err) {
      this.logger.warn('getMoleculesForMedication Neo4j error', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  /**
   * Template de posologie par CIS (heuristique selon forme pharmaceutique).
   * Utilise le champ `form` du Drug en base (BDPM).
   */
  async getPosologyTemplate(cis: string): Promise<{
    unit: string;
    default: string;
    max?: string;
    instructions?: string;
  }> {
    const c = (cis || '').trim();
    if (!c) {
      return { unit: '—', default: 'Selon avis médical', instructions: 'Selon avis médical' };
    }

    let form = '';
    try {
      const result = await this.neo4j.executeQuery(
        'MATCH (d:Drug {cisId: $cis}) RETURN d.form AS form LIMIT 1',
        { cis: c }
      );
      if (result.records.length > 0) {
        form = String(result.records[0].get('form') ?? '').toLowerCase();
      }
    } catch (err) {
      this.logger.warn('getPosologyTemplate Neo4j error', (err as Error)?.message);
    }

    if (form.includes('comprimé') || form.includes('gélule') || form.includes('capsule')) {
      return {
        unit: 'cp',
        default: '1 matin, 1 soir',
        max: '4/j',
        instructions: 'À prendre au repas si besoin.',
      };
    }
    if (form.includes('sirop') || form.includes('solution buvable') || form.includes('suspension')) {
      return {
        unit: 'c.à.s',
        default: '1 c.à.s 3 fois par jour',
        instructions: 'Mesurer avec la cuillère doseuse fournie.',
      };
    }
    if (form.includes('pommade') || form.includes('crème') || form.includes('gel') || form.includes('émulsion')) {
      return {
        unit: 'application',
        default: '1 application locale',
        instructions: 'Appliquer en couche fine sur la zone concernée.',
      };
    }
    if (form.includes('collyre') || form.includes('gouttes')) {
      return {
        unit: 'goutte(s)',
        default: '1 goutte par œil',
        instructions: 'Instiller dans le(s) œil(s) concerné(s).',
      };
    }
    if (form.includes('suppositoire')) {
      return {
        unit: 'suppositoire',
        default: '1 le soir',
        instructions: 'Voie rectale.',
      };
    }

    return {
      unit: '—',
      default: 'Selon avis médical',
      instructions: 'Selon avis médical',
    };
  }
}
