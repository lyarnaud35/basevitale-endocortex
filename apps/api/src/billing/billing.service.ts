import { Injectable } from '@nestjs/common';

/**
 * BillingService – Squelette (coquille vide).
 * Module E+ Facturation. Logique à implémenter plus tard.
 */
@Injectable()
export class BillingService {
  ping(): { status: string; module: string } {
    return { status: 'ok', module: 'billing' };
  }
}
