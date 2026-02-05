import { Module } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { GraphProjectorService } from './graph-projector.service';
import { GuardianService } from './guardian.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * KnowledgeGraphModule
 *
 * Module pour la gestion du Knowledge Graph (nœuds sémantiques et relations).
 * GraphProjectorService : projection Consultation → Neo4j (MERGE).
 * GuardianService (C+ Gardien) : vérification médicaments vs allergies (boucle de feedback).
 */
@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService, GraphProjectorService, GuardianService, MetricsService],
  exports: [KnowledgeGraphService, GraphProjectorService, GuardianService],
})
export class KnowledgeGraphModule {}
