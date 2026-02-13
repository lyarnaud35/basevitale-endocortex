import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { MedicalModule } from '../medical/medical.module';
import { BdpmDownloadService } from './bdpm-download.service';
import { BdpmSyncService } from './bdpm-sync.service';
import { BdpmIngestService } from './bdpm-ingest.service';
import { DrugsUpdateWorker } from './drugs-update.worker';
import { OntologyController } from './ontology.controller';

/**
 * Module Ontologie pharmaceutique (Deep Roots).
 * BDPM → Neo4j : (Medicament)-[:A_POUR_SUBSTANCE]->(Molecule) et Drug -[:CONTIENT]-> Molecule.
 * Worker : cron 03h00 (PANACÉE v200). Recherche fuzzy /ontology/drugs/search (SYNAPSE v201).
 */
@Module({
  imports: [Neo4jModule, ScheduleModule.forRoot(), MedicalModule],
  controllers: [OntologyController],
  providers: [BdpmDownloadService, BdpmSyncService, BdpmIngestService, DrugsUpdateWorker],
  exports: [BdpmDownloadService, BdpmSyncService, BdpmIngestService, DrugsUpdateWorker],
})
export class OntologyModule {}
