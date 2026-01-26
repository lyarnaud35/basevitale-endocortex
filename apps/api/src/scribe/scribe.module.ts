import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GpuLockModule } from '../common/services/gpu-lock.module';

import { ScribeService } from './scribe.service';
import { ScribeController } from './scribe.controller';
import { ScribeHealthService } from './scribe.health.service';
import { ScribeProcessor } from './scribe.processor';
import { MetricsService } from '../common/services/metrics.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 300000, // 5 min — AI-Cortex peut mettre jusqu'à 300s (inférence CPU)
      maxRedirects: 5,
    }),
    CommonModule, // Pour ConfigService
    KnowledgeGraphModule,
    PrismaModule,
    GpuLockModule,
    // Queue pour traitement asynchrone (Phase C)
    BullModule.registerQueue({
      name: 'scribe-consultation',
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600, // Garder 1h
          count: 1000, // Max 1000 jobs
        },
        removeOnFail: {
          age: 86400, // Garder 24h pour debug
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [ScribeController],
  providers: [ScribeService, ScribeHealthService, ScribeProcessor, MetricsService],
  exports: [ScribeService, ScribeHealthService],
})
export class ScribeModule {}
