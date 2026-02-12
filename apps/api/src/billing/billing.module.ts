import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingAdminController } from './billing-admin.controller';
import { BillingService } from './billing.service';
import { BillingRulesService } from './billing-rules.service';
import { PatientContextService } from './patient-context.service';

/**
 * BillingModule – Moteur d’inférence contextuelle (Réacteur Fiscal).
 * Module E+ Facturation. Contexte patient + règles NGAP.
 */
@Module({
  controllers: [BillingController, BillingAdminController],
  providers: [BillingService, BillingRulesService, PatientContextService],
  exports: [BillingService, BillingRulesService],
})
export class BillingModule {}
