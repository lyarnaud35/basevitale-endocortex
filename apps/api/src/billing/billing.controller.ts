import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingService, SimulateBillingResult, type InvoiceAction } from './billing.service';
import { PatientContextService } from './patient-context.service';
import { SimulateBillingDto } from './dto/simulate-billing.dto';
import { InvoiceStatusActionDto } from './dto/invoice-status.dto';
import { Public } from '../common';

/**
 * BillingController – Moteur d’inférence contextuelle (Réacteur Fiscal).
 * Module E+ Facturation. Simulation NGAP + contexte patient.
 */
@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly patientContext: PatientContextService,
  ) {}

  @Get()
  @Public()
  ping() {
    return this.billingService.ping();
  }

  @Get('patients-demo')
  @Public()
  @ApiOperation({ summary: 'Liste des patients de démo (A/B)' })
  listPatientsDemo() {
    return this.patientContext.listForDemo();
  }

  @Post('simulate')
  @Public()
  @ApiOperation({ summary: 'Simuler la facturation', description: 'Retourne total, répartition AMO/AMC et règles appliquées.' })
  @ApiBody({ type: SimulateBillingDto })
  @ApiResponse({ status: 200, description: 'Résultat de la simulation' })
  simulate(@Body() dto: SimulateBillingDto): SimulateBillingResult {
    return this.billingService.simulate(dto.acts, dto.patientId, dto.patientAge);
  }

  @Post('invoice')
  @Public()
  @ApiOperation({ summary: 'Créer une facture (cristallisation)', description: 'Calcule puis persiste en base avec status DRAFT et rulesVersion.' })
  @ApiBody({ type: SimulateBillingDto })
  @ApiResponse({ status: 201, description: 'Facture créée' })
  async createInvoice(@Body() dto: SimulateBillingDto) {
    return this.billingService.createInvoice(dto.acts, dto.patientId, dto.patientAge);
  }

  @Get('invoice/:id')
  @Public()
  @ApiOperation({ summary: 'Détail d\'une facture' })
  @ApiResponse({ status: 200, description: 'Facture' })
  async getInvoice(@Param('id') id: string) {
    return this.billingService.getInvoice(id);
  }

  @Get('invoice/:id/lifecycle')
  @Public()
  @ApiOperation({ summary: 'Cycle de vie (statut + actions autorisées)', description: 'Pour useInvoiceLifecycle : le backend dit au front quels boutons afficher.' })
  @ApiResponse({ status: 200, description: 'Facture + availableActions' })
  async getInvoiceLifecycle(@Param('id') id: string) {
    return this.billingService.getInvoiceLifecycle(id);
  }

  @Patch('invoice/:id/status')
  @Public()
  @ApiOperation({ summary: 'Transition FSM (Valider, Télétransmettre, etc.)' })
  @ApiBody({ type: InvoiceStatusActionDto })
  @ApiResponse({ status: 200, description: 'Facture mise à jour' })
  async transitionInvoiceStatus(@Param('id') id: string, @Body() dto: InvoiceStatusActionDto) {
    return this.billingService.transitionInvoice(id, dto.action as InvoiceAction);
  }
}
