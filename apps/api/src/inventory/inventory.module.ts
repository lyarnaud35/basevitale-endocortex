import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * InventoryModule
 * 
 * Module pour la gestion des stocks (ERP Hospitalier)
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, MetricsService],
  exports: [InventoryService],
})
export class InventoryModule {}
