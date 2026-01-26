import { Module } from '@nestjs/common';
import { LISService } from './lis.service';
import { LISController } from './lis.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';
import { WebSocketsModule } from '../websockets/websockets.module';

/**
 * LISModule
 * 
 * Module pour le Laboratory Information System (LIS)
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [PrismaModule, WebSocketsModule],
  controllers: [LISController],
  providers: [LISService, MetricsService],
  exports: [LISService],
})
export class LISModule {}
