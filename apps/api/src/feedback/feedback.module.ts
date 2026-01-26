import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * FeedbackModule - Module L (Feedback & Apprentissage)
 * 
 * Version Cabinet - Sprint 4: Boucle de Feedback & Outpass
 * 
 * Gère la capture des corrections pour amélioration continue
 */
@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, MetricsService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
