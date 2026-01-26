import { Module } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { GraphProjectorService } from './graph-projector.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * KnowledgeGraphModule
 *
 * Module pour la gestion du Knowledge Graph (nœuds sémantiques et relations).
 * GraphProjectorService : projection Consultation → Neo4j (MERGE).
 */
@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService, GraphProjectorService, MetricsService],
  exports: [KnowledgeGraphService, GraphProjectorService],
})
export class KnowledgeGraphModule {}
