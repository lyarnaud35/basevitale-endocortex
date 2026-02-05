import { Controller, Get } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Public } from '../common';

/**
 * BillingController – Squelette (coquille vide).
 * Module E+ Facturation. Endpoints à définir ensuite.
 */
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @Public()
  ping() {
    return this.billingService.ping();
  }
}
