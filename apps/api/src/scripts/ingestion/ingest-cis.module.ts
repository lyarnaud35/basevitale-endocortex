import { Module } from '@nestjs/common';
import { Neo4jModule } from '../../neo4j/neo4j.module';

/**
 * Contexte minimal pour le script ingest-cis (pas d'API, pas de @basevitale/shared).
 */
@Module({
  imports: [Neo4jModule],
})
export class IngestCisModule {}
