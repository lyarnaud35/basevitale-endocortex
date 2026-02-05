import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

/**
 * BillingModule – Squelette (coquille vide).
 * Module E+ Facturation. Tuyaux posés, logique à brancher plus tard.
 */
@Module({
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
