import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { BdpmDownloadService } from './bdpm-download.service';
import { BdpmIngestService } from './bdpm-ingest.service';

/**
 * Module Ontologie pharmaceutique (Deep Roots).
 * BDPM → Neo4j : (Medicament)-[:A_POUR_SUBSTANCE]->(Molecule).
 */
@Module({
  imports: [Neo4jModule],
  providers: [BdpmDownloadService, BdpmIngestService],
  exports: [BdpmDownloadService, BdpmIngestService],
})
export class OntologyModule {}
