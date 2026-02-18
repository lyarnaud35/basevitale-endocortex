import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';

/**
 * Module Drugs – Recherche Full-Text (index drugSearch).
 * GET /api/drugs/search?q=… pour autocomplétion type Google.
 */
@Module({
  imports: [Neo4jModule],
  controllers: [DrugsController],
  providers: [DrugsService],
  exports: [DrugsService],
})
export class DrugsModule {}
