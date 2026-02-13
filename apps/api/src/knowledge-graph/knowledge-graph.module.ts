import { Module, forwardRef } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { GraphProjectorService } from './graph-projector.service';
import { GuardianService } from './guardian.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MedicalModule } from '../medical/medical.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * KnowledgeGraphModule
 *
 * Module pour la gestion du Knowledge Graph (nœuds sémantiques et relations).
 * GraphProjectorService : projection Consultation → Neo4j (MERGE).
 * GuardianService (C+ Gardien) : médicaments vs allergies via graphe Drug→Molecule (SYNAPSE v201).
 */
@Module({
  imports: [PrismaModule, Neo4jModule, forwardRef(() => MedicalModule)],
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService, GraphProjectorService, GuardianService, MetricsService],
  exports: [KnowledgeGraphService, GraphProjectorService, GuardianService],
})
export class KnowledgeGraphModule {}
