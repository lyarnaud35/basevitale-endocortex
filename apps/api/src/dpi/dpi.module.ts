import { Module } from '@nestjs/common';
import { DPIService } from './dpi.service';
import { DPIController } from './dpi.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * DPIModule
 * 
 * Module pour le Dossier Patient Informatisé (DPI)
 * Centralise toutes les informations médicales du patient
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [PrismaModule],
  controllers: [DPIController],
  providers: [DPIService, MetricsService],
  exports: [DPIService],
})
export class DPIModule {}
