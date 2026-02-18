import { Module, forwardRef } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { SecurityService } from './security.service';
import { DrugService } from './drug.service';
import { DrugsController } from './drugs.controller';

/**
 * Module C+ (Security Guardian) – Deep Roots.
 * Ontologie BDPM (DrugService) + Packs (CIP) + validation allergies (Guardian, SecurityService).
 * GET /drugs/search est exposé par DrugsModule (index drugSearch).
 */
@Module({
  imports: [Neo4jModule, forwardRef(() => KnowledgeGraphModule)],
  controllers: [DrugsController],
  providers: [SecurityService, DrugService],
  exports: [SecurityService, DrugService],
})
export class MedicalModule {}
