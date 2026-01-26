import { Module } from '@nestjs/common';
import { CodingService } from './coding.service';
import { CodingController } from './coding.controller';
import { ScribeModule } from '../scribe/scribe.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * CodingModule - Module B+ (Codage)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * Gère le codage automatique CIM-10/11 avec scores de confiance
 */
@Module({
  imports: [PrismaModule, ScribeModule],
  controllers: [CodingController],
  providers: [CodingService, MetricsService],
  exports: [CodingService],
})
export class CodingModule {}
