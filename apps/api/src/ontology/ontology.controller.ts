import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DrugsUpdateWorker } from './drugs-update.worker';
import { DrugService } from '../medical/drug.service';
import type { DrugSearchHit } from '../medical/drug.service';

/**
 * Ontologie & recherche médicaments (SYNAPSE v201).
 * - POST bdpm-sync : déclenchement manuel du heartbeat (cron 03h00 en production).
 * - GET drugs/search : recherche fulltext fuzzy (alias du moteur médical).
 */
@ApiTags('Ontology')
@Controller('ontology')
export class OntologyController {
  constructor(
    private readonly worker: DrugsUpdateWorker,
    private readonly drugService: DrugService,
  ) {}

  /**
   * Lance immédiatement : download BDPM → hash → ingest si changé.
   */
  @Post('bdpm-sync')
  @ApiOperation({ summary: 'Déclencher la sync BDPM (download + ingest si hash modifié)' })
  async triggerBdpmSync(): Promise<{ ingested: boolean; message: string }> {
    return this.worker.runNow();
  }

  /**
   * Recherche fulltext fuzzy sur Drug|Molecule (index Lucene).
   * "Doliplane" → Doliprane ; min 3 caractères. Option molecules=1 pour afficher "Contient : X (dosage)".
   */
  @Get('drugs/search')
  @ApiOperation({
    summary: 'Recherche médicaments (fuzzy, < 50ms)',
    description: 'Fulltext sur noms commerciaux et substances. Paramètre molecules=1 pour inclure les substances (Contient : Paracétamol 500mg).',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Terme de recherche (ex. Doli, Amoxi, Paracéta)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre max de résultats (défaut 20, max 50)' })
  @ApiQuery({ name: 'molecules', required: false, description: '1 pour inclure les molécules par médicament' })
  @ApiResponse({ status: 200, description: 'Liste { id, label, type, molecules? }' })
  async searchDrugs(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('molecules') molecules?: string,
  ): Promise<DrugSearchHit[]> {
    if (!q || (q && q.trim().length < 3)) return [];
    const limitNum = limit ? Math.min(50, parseInt(limit, 10) || 20) : 20;
    const includeMolecules = molecules === '1' || molecules === 'true';
    return this.drugService.searchDrugs(q.trim(), limitNum, { includeMolecules });
  }
}
