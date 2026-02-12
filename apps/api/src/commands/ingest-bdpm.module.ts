import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { OntologyModule } from '../ontology/ontology.module';
import { BdpmIngestService } from '../ontology/bdpm-ingest.service';

/**
 * Module minimal pour exécuter la commande d'ingestion BDPM (sans API, Redis, Prisma).
 */
@Module({
  imports: [Neo4jModule, OntologyModule],
})
export class CommandModule {}
