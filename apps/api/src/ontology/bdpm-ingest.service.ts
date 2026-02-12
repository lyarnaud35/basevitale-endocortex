import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { Neo4jService } from '../neo4j/neo4j.service';
import { BdpmDownloadService } from './bdpm-download.service';
import {
  BDPM_FILES,
  CIS_COLUMNS,
  CIS_COMPO_COLUMNS,
  NATURE_SUBSTANCE_ACTIVE,
} from './bdpm.constants';
import type { BdpmMedicamentRow, BdpmCompoRow, BdpmIngestStats } from './bdpm.types';
import { BDPM_DEFAULT_DOWNLOAD_DIR } from './bdpm-download.service';

const BATCH_SIZE = 500;
const SOURCE_BDPM = 'BDPM';

@Injectable()
export class BdpmIngestService {
  private readonly logger = new Logger(BdpmIngestService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly download: BdpmDownloadService,
  ) {}

  /**
   * Crée les contraintes et index pour l'ontologie (Medicament, Molecule, A_POUR_SUBSTANCE).
   */
  async ensureSchema(): Promise<void> {
    const queries = [
      'CREATE CONSTRAINT medicament_cis IF NOT EXISTS FOR (m:Medicament) REQUIRE m.cis IS UNIQUE',
      'CREATE CONSTRAINT molecule_code IF NOT EXISTS FOR (m:Molecule) REQUIRE m.codeSubstance IS UNIQUE',
      'CREATE INDEX medicament_denomination IF NOT EXISTS FOR (m:Medicament) ON (m.denomination)',
      'CREATE INDEX molecule_designation IF NOT EXISTS FOR (m:Molecule) ON (m.designation)',
    ];
    for (const q of queries) {
      try {
        await this.neo4j.executeQuery(q);
        this.logger.debug(`Schema: ${q.substring(0, 50)}...`);
      } catch (e: any) {
        if (!e?.message?.includes('already exists')) this.logger.warn(e?.message || e);
      }
    }
  }

  /**
   * Parse une ligne CIS (tab-separated).
   */
  parseCisLine(line: string): BdpmMedicamentRow | null {
    const cols = line.split('\t');
    const cis = cols[CIS_COLUMNS.CODE_CIS]?.trim();
    const denomination = cols[CIS_COLUMNS.DENOMINATION]?.trim();
    if (!cis || !denomination) return null;
    return {
      cis,
      denomination,
      formePharmaceutique: cols[CIS_COLUMNS.FORME_PHARMACEUTIQUE]?.trim() ?? '',
      statutAutorisation: cols[CIS_COLUMNS.STATUT_AUTORISATION]?.trim() ?? '',
    };
  }

  /**
   * Parse une ligne CIS_COMPO (tab-separated). Retourne null si pas SA.
   */
  parseCompoLine(line: string): BdpmCompoRow | null {
    const cols = line.split('\t');
    const nature = cols[CIS_COMPO_COLUMNS.NATURE_COMPOSANT]?.trim() ?? '';
    if (nature !== NATURE_SUBSTANCE_ACTIVE) return null;
    const cis = cols[CIS_COMPO_COLUMNS.CODE_CIS]?.trim();
    const codeSubstance = cols[CIS_COMPO_COLUMNS.CODE_SUBSTANCE]?.trim();
    const designationSubstance = cols[CIS_COMPO_COLUMNS.DESIGNATION_SUBSTANCE]?.trim();
    if (!cis || !codeSubstance || !designationSubstance) return null;
    return {
      cis,
      codeSubstance,
      designationSubstance,
      dosage: cols[CIS_COMPO_COLUMNS.DOSAGE]?.trim() ?? '',
      referenceDosage: cols[CIS_COMPO_COLUMNS.REFERENCE_DOSAGE]?.trim() ?? '',
      natureComposant: nature,
    };
  }

  /**
   * Ingère les fichiers BDPM déjà présents dans dataDir (CIS_bdpm.txt, CIS_COMPO_bdpm.txt).
   */
  async ingestFromDirectory(dataDir: string = BDPM_DEFAULT_DOWNLOAD_DIR): Promise<BdpmIngestStats> {
    const start = Date.now();
    const errors: string[] = [];
    const { readTsvLines } = this.download;

    const cisPath = join(dataDir, BDPM_FILES.CIS);
    const compoPath = join(dataDir, BDPM_FILES.CIS_COMPO);

    let cisLines: string[];
    let compoLines: string[];
    try {
      cisLines = await readTsvLines(cisPath);
      compoLines = await readTsvLines(compoPath);
    } catch (e: any) {
      throw new Error(`Cannot read BDPM files from ${dataDir}: ${e?.message}. Run download first.`);
    }

    await this.ensureSchema();

    const medicaments: BdpmMedicamentRow[] = [];
    for (const line of cisLines) {
      const row = this.parseCisLine(line);
      if (row) medicaments.push(row);
    }
    this.logger.log(`Parsed ${medicaments.length} medicaments from CIS`);

    const compositions: BdpmCompoRow[] = [];
    for (const line of compoLines) {
      const row = this.parseCompoLine(line);
      if (row) compositions.push(row);
    }
    this.logger.log(`Parsed ${compositions.length} substance-active compositions (SA)`);

    const updatedAt = new Date().toISOString();

    // 1) MERGE Medicament (batch)
    for (let i = 0; i < medicaments.length; i += BATCH_SIZE) {
      const batch = medicaments.slice(i, i + BATCH_SIZE);
      const query = `
        UNWIND $rows AS row
        MERGE (m:Medicament { cis: row.cis })
        SET m.denomination = row.denomination,
            m.formePharmaceutique = row.formePharmaceutique,
            m.statutAutorisation = row.statutAutorisation,
            m.source = $source,
            m.updatedAt = $updatedAt
      `;
      try {
        await this.neo4j.executeQuery(query, {
          rows: batch,
          source: SOURCE_BDPM,
          updatedAt,
        });
      } catch (e: any) {
        errors.push(`Medicament batch ${i}-${i + batch.length}: ${e?.message}`);
      }
    }
    const medicamentsCreated = medicaments.length;

    // 2) MERGE Molecule (unique codeSubstance) from compositions
    const moleculeRows = Array.from(
      new Map(compositions.map((c) => [c.codeSubstance, { codeSubstance: c.codeSubstance, designation: c.designationSubstance }])).values(),
    );
    for (let i = 0; i < moleculeRows.length; i += BATCH_SIZE) {
      const batch = moleculeRows.slice(i, i + BATCH_SIZE);
      const query = `
        UNWIND $rows AS row
        MERGE (m:Molecule { codeSubstance: row.codeSubstance })
        SET m.designation = row.designation,
            m.source = $source,
            m.updatedAt = $updatedAt
      `;
      try {
        await this.neo4j.executeQuery(query, {
          rows: batch,
          source: SOURCE_BDPM,
          updatedAt,
        });
      } catch (e: any) {
        errors.push(`Molecule batch ${i}-${i + batch.length}: ${e?.message}`);
      }
    }
    const moleculesCreated = moleculeRows.length;

    // 3) MERGE (Medicament)-[:A_POUR_SUBSTANCE]->(Molecule)
    for (let i = 0; i < compositions.length; i += BATCH_SIZE) {
      const batch = compositions.slice(i, i + BATCH_SIZE);
      const query = `
        UNWIND $rows AS row
        MATCH (med:Medicament { cis: row.cis })
        MATCH (mol:Molecule { codeSubstance: row.codeSubstance })
        MERGE (med)-[r:A_POUR_SUBSTANCE]->(mol)
        SET r.dosage = row.dosage,
            r.referenceDosage = row.referenceDosage,
            r.createdAt = $updatedAt
      `;
      try {
        await this.neo4j.executeQuery(query, {
          rows: batch,
          updatedAt,
        });
      } catch (e: any) {
        errors.push(`Relation batch ${i}-${i + batch.length}: ${e?.message}`);
      }
    }
    const relationsCreated = compositions.length;

    const durationMs = Date.now() - start;
    this.logger.log(
      `Ingest done: ${medicamentsCreated} Medicament, ${moleculesCreated} Molecule, ${relationsCreated} A_POUR_SUBSTANCE in ${durationMs}ms`,
    );
    if (errors.length) this.logger.warn(`Errors: ${errors.length}`, errors);

    return {
      medicamentsCreated,
      moleculesCreated,
      relationsCreated,
      errors,
      durationMs,
    };
  }

  /**
   * Télécharge les fichiers BDPM puis ingère dans Neo4j.
   */
  async downloadAndIngest(dataDir: string = BDPM_DEFAULT_DOWNLOAD_DIR): Promise<BdpmIngestStats> {
    await this.download.downloadAll(dataDir);
    return this.ingestFromDirectory(dataDir);
  }
}
