import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingRulesService } from './billing-rules.service';
import { Public } from '../common';

/**
 * Admin – Rechargement des règles de facturation sans redémarrage (Data over Code).
 */
@ApiTags('Admin')
@Controller('admin')
export class BillingAdminController {
  constructor(private readonly billingRulesService: BillingRulesService) {}

  @Post('rules/reload')
  @Public()
  @ApiOperation({ summary: 'Recharger les règles depuis la DB', description: 'Vide le cache et recharge les règles. Permet de mettre à jour les tarifs sans redéploiement.' })
  @ApiResponse({ status: 200, description: 'Règles rechargées' })
  async reloadRules() {
    return this.billingRulesService.reloadRules();
  }
}
