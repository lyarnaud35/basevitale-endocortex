import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';
import { WebSocketsModule } from '../websockets/websockets.module';

/**
 * MessagingModule
 * 
 * Module pour la messagerie interne sécurisée
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [PrismaModule, WebSocketsModule],
  controllers: [MessagingController],
  providers: [MessagingService, MetricsService],
  exports: [MessagingService],
})
export class MessagingModule {}
