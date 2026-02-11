import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrchestratorService } from './orchestrator.service';
import {
  HighPriorityProcessor,
  NormalPriorityProcessor,
  LowPriorityProcessor,
} from './orchestrator.processor';
import { WebSocketsModule } from '../websockets/websockets.module';
import { SecurityModule } from '../security/security.module';
import { ConsultationOrchestratorService } from './consultation-orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';

/**
 * OrchestratorModule - Module O
 *
 * - Queues (priorités) : OrchestratorService + processors.
 * - Cerveau Central (consultation) : ConsultationOrchestratorService + OrchestratorController.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'high-priority' },
      { name: 'normal-priority' },
      { name: 'low-priority' },
    ),
    WebSocketsModule,
    SecurityModule,
  ],
  controllers: [OrchestratorController],
  providers: [
    OrchestratorService,
    ConsultationOrchestratorService,
    HighPriorityProcessor,
    NormalPriorityProcessor,
    LowPriorityProcessor,
  ],
  exports: [OrchestratorService, ConsultationOrchestratorService],
})
export class OrchestratorModule {}
