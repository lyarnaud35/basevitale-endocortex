import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrchestratorService } from './orchestrator.service';
import {
  HighPriorityProcessor,
  NormalPriorityProcessor,
  LowPriorityProcessor,
} from './orchestrator.processor';
import { WebSocketsModule } from '../websockets/websockets.module';

/**
 * OrchestratorModule - Module O
 * 
 * Orchestration des workflows et priorités
 * Version BaseVitale V112
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'high-priority' },
      { name: 'normal-priority' },
      { name: 'low-priority' },
    ),
    WebSocketsModule,
  ],
  providers: [
    OrchestratorService,
    HighPriorityProcessor,
    NormalPriorityProcessor,
    LowPriorityProcessor,
  ],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
