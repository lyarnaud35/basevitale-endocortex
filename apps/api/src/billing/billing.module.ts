import { Module } from '@nestjs/common';
import { BillingValidationService } from './billing-validation.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * BillingModule
 * 
 * Module complet pour le Module E+ (Facturation)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * RÈGLE INVARIANTE: "Pas de Preuve = Pas de Facture"
 */
@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingValidationService, BillingService, MetricsService],
  exports: [BillingValidationService, BillingService],
})
export class BillingModule {}
