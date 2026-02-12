import { Injectable, Logger } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';

export interface DrugSearchHit {
  cis: string;
  denomination: string;
  formePharmaceutique?: string;
}

/**
 * Service de recherche de médicaments (BDPM / ontologie Neo4j).
 * Deep Roots : données réelles, pas de mock.
 */
@Injectable()
export class DrugService {
  private readonly logger = new Logger(DrugService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Recherche des spécialités par dénomination (CONTAINS, insensible à la casse).
   */
  async searchDrugs(query: string, limit = 50): Promise<DrugSearchHit[]> {
    const q = (query || '').trim();
    if (!q) return [];

    const limitInt = Math.max(0, Math.min(100, Math.floor(Number(limit)) || 50));
    const cypher = `
      MATCH (m:Medicament)
      WHERE toLower(m.denomination) CONTAINS toLower($query)
      RETURN m.cis AS cis, m.denomination AS denomination, m.formePharmaceutique AS formePharmaceutique
      ORDER BY m.denomination
      LIMIT $limit
    `;
    try {
      const result = await this.neo4j.executeQuery(cypher, { query: q, limit: neo4j.int(limitInt) });
      return result.records.map((record) => ({
        cis: String(record.get('cis') ?? ''),
        denomination: String(record.get('denomination') ?? ''),
        formePharmaceutique: record.get('formePharmaceutique') != null ? String(record.get('formePharmaceutique')) : undefined,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('searchDrugs Neo4j error', msg);
      throw new Error(`Recherche BDPM impossible : ${msg}`);
    }
  }

  /**
   * Retourne les molécules (substances actives) d'un médicament par CIS ou par dénomination.
   */
  async getMoleculesForMedication(medicationNameOrCis: string): Promise<{ codeSubstance: string; designation: string }[]> {
    const s = (medicationNameOrCis || '').trim();
    if (!s) return [];

    const isCis = /^\d{7}$/.test(s);
    const cypher = isCis
      ? `
      MATCH (m:Medicament { cis: $value })-[:A_POUR_SUBSTANCE]->(mol:Molecule)
      RETURN mol.codeSubstance AS codeSubstance, mol.designation AS designation
    `
      : `
      MATCH (m:Medicament)-[:A_POUR_SUBSTANCE]->(mol:Molecule)
      WHERE toLower(m.denomination) CONTAINS toLower($value) OR toLower($value) CONTAINS toLower(m.denomination)
      RETURN DISTINCT mol.codeSubstance AS codeSubstance, mol.designation AS designation
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
}
