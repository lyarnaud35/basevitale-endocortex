import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * StaffModule
 * 
 * Module pour la gestion des équipes (ERP RH)
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [PrismaModule],
  controllers: [StaffController],
  providers: [StaffService, MetricsService],
  exports: [StaffService],
})
export class StaffModule {}
