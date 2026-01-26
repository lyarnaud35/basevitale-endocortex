import { Module } from '@nestjs/common';
import { ESBService } from './esb.service';
import { ESBController } from './esb.controller';
import { NatsModule } from '../nats/nats.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * ESBModule
 * 
 * Module pour l'Enterprise Service Bus avec IA
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [NatsModule],
  controllers: [ESBController],
  providers: [ESBService, MetricsService],
  exports: [ESBService],
})
export class ESBModule {}
