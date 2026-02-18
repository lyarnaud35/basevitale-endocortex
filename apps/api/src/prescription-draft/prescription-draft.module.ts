import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { PrescriptionDraftService } from './prescription-draft.service';
import { PrescriptionDraftController } from './prescription-draft.controller';

/**
 * Moteur transactionnel du brouillon d'ordonnance (Ghost Protocol Phase 4).
 * Stockage temporaire en mémoire ; à chaque add/remove, recalcul de la sécurité
 * (allergies + doublons de molécules) via GuardianService.analyzeDraft.
 */
@Module({
  imports: [Neo4jModule, KnowledgeGraphModule],
  controllers: [PrescriptionDraftController],
  providers: [PrescriptionDraftService],
  exports: [PrescriptionDraftService],
})
export class PrescriptionDraftModule {}
