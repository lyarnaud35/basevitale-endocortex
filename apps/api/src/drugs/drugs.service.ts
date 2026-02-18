import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

const INDEX_NAME = 'drugSearch';

export interface DrugSearchResultItem {
  code: string;
  label: string;
  forme: string;
  substances: string[];
  score: number;
  price?: number | null;
  currency: string;
  refundRate?: number | null;
  isGeneric: boolean;
}

/**
 * Service de recherche médicaments (Full-Text Lucene).
 * Index drugSearch sur Drug|Molecule. Boosting : préfixe > contient > fuzzy.
 */
@Injectable()
export class DrugsService {
  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Recherche hybride : nom commercial (Drug) ou substance (Molecule).
   * Sniper : "Paracéta" met PARACÉTAMOL en premier, pas PIRACÉTAM.
   */
  async search(query: string): Promise<DrugSearchResultItem[]> {
    const q = (query || '').trim();
    if (!q || q.length < 3) return [];

    const clean = q.replace(/[^a-zA-Z0-9À-ÿ]/g, '');
    if (clean.length < 2) return [];

    const escaped = escapeLucene(clean);
    // Boosting : préfixe x3 > contient x1 > fuzzy (edit dist 1)
    const luceneQuery = `name:${escaped}*^3 OR name:*${escaped}*^1 OR name:${escaped}~1`;
    const cypher = `
      CALL db.index.fulltext.queryNodes("${INDEX_NAME}", $q)
      YIELD node, score
      WHERE score > 0.5
      OPTIONAL MATCH (node:Drug)-[:CONTIENT]->(mol:Molecule)
      OPTIONAL MATCH (node:Molecule)<-[:CONTIENT]-(parentDrug:Drug)
      WITH coalesce(parentDrug, node) AS drug, score, collect(DISTINCT mol.name) AS substanceList
      WITH drug, score, [x IN substanceList WHERE x IS NOT NULL] AS substances
      OPTIONAL MATCH (drug)-[:VENDU_SOUS]->(p:Pack)
      WITH drug, score, substances,
           head(collect({ prix: p.prix, taux: p.tauxRemboursement })) AS packInfo
      RETURN DISTINCT
        drug.cisId AS code,
        drug.name AS label,
        drug.form AS forme,
        substances,
        score,
        packInfo.prix AS price,
        packInfo.taux AS refundRate
      ORDER BY score DESC
      LIMIT 10
    `;
    try {
      const result = await this.neo4j.executeQuery(cypher, { q: luceneQuery });
      return result.records.map((r) => {
        const label = String(r.get('label') ?? '');
        const rawPrix = r.get('price');
        const rawTaux = r.get('refundRate');
        return {
          code: String(r.get('code') ?? ''),
          label,
          forme: String(r.get('forme') ?? ''),
          substances: (r.get('substances') as string[]) ?? [],
          score: Number(r.get('score') ?? 0),
          price: hasValidPrice(rawPrix) ? rawPrix : null,
          currency: 'EUR',
          refundRate: hasValidRate(rawTaux) ? rawTaux : null,
          isGeneric: isGenericLabel(label),
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Index') && msg.includes('not found')) {
        return [];
      }
      throw err;
    }
  }
}

/** Prix connu : non null et > 0. 0 = prix inconnu → null. */
function hasValidPrice(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}
/** Taux connu : non null et > 0. 0 = non remboursé ou inconnu → null. */
function hasValidRate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}
/** Heuristique : médicament générique (GENERIQUE, ARROW, BIOGARAN, etc.). */
function isGenericLabel(label: string): boolean {
  const u = label.toUpperCase();
  return (
    u.includes('GENERIQUE') ||
    /\b(ARROW|BIOGARAN|MYLAN|TEVA|EG|ZENTIVA|SANDOZ|ACT)\b/.test(u)
  );
}

/** Échappe les caractères spéciaux Lucene. */
function escapeLucene(s: string): string {
  return s.replace(/[+\-&|!(){}\[\]^"~*?:\\]/g, '\\$&').trim();
}
