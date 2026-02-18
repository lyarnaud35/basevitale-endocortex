import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingService, SimulateBillingResult, type InvoiceAction } from './billing.service';
import { PatientContextService } from './patient-context.service';
import { SimulateBillingDto } from './dto/simulate-billing.dto';
import { InvoiceStatusActionDto } from './dto/invoice-status.dto';
import { ValidateBillingDto } from './dto/validate-billing.dto';
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

  @Get('prediction/:patientId')
  @Public()
  @ApiOperation({
    summary: 'Prédiction financière depuis le contexte clinique',
    description: 'Actes du jour (Procedure) → simulate. Query ?age=&ald= pour simuler un profil (Enfant, ALD) sans changer le patient.',
  })
  @ApiResponse({ status: 200, description: 'Résultat simulation + actsFromContext + breakdown détaillé' })
  async getPrediction(
    @Param('patientId') patientId: string,
    @Query('age') ageStr?: string,
    @Query('ald') aldStr?: string,
  ): Promise<SimulateBillingResult & { actsFromContext: string[] }> {
    const age = ageStr !== undefined && ageStr !== '' ? parseInt(ageStr, 10) : undefined;
    const ald = aldStr === 'true' || aldStr === '1';
    const overrides =
      age !== undefined || ald
        ? { age: Number.isNaN(age) ? undefined : age, ald: ald || undefined }
        : undefined;
    return this.billingService.predictFromContext(patientId, overrides);
  }

  @Post('patient/:patientId/procedures')
  @Public()
  @ApiOperation({ summary: 'Ajouter un acte du jour (démo / fusion clinique)' })
  @ApiBody({ schema: { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' } }, required: ['code'] } })
  @ApiResponse({ status: 201, description: 'Acte enregistré' })
  async addProcedure(
    @Param('patientId') patientId: string,
    @Body() body: { code: string; name?: string },
  ): Promise<{ ok: boolean }> {
    await this.billingService.addProcedureForToday(patientId, body.code, body.name);
    return { ok: true };
  }

  @Delete('patient/:patientId/procedures/:code')
  @Public()
  @ApiOperation({ summary: 'Retirer un acte du jour (démo)' })
  @ApiResponse({ status: 200, description: 'Acte retiré' })
  async removeProcedure(
    @Param('patientId') patientId: string,
    @Param('code') code: string,
  ): Promise<{ ok: boolean }> {
    await this.billingService.removeProcedureForToday(patientId, code);
    return { ok: true };
  }

  @Post('simulate')
  @Public()
  @ApiOperation({ summary: 'Simuler la facturation', description: 'Retourne total, répartition AMO/AMC et règles appliquées.' })
  @ApiBody({ type: SimulateBillingDto })
  @ApiResponse({ status: 200, description: 'Résultat de la simulation' })
  simulate(@Body() dto: SimulateBillingDto): SimulateBillingResult {
    return this.billingService.simulate(dto.acts, dto.patientId, dto.patientAge, dto.ald);
  }

  @Post('validate')
  @Public()
  @ApiOperation({
    summary: 'Valider la facture en un clic',
    description: 'Prédiction actuelle (actes du jour + contexte) → facture persistée avec statut VALIDATED. Montant enregistré = montant affiché.',
  })
  @ApiBody({ type: ValidateBillingDto })
  @ApiResponse({ status: 201, description: 'Facture validée (id, totalAmount, createdAt)' })
  async validateInvoice(@Body() dto: ValidateBillingDto) {
    const overrides =
      dto.age !== undefined || dto.ald === true
        ? { age: dto.age, ald: dto.ald }
        : undefined;
    return this.billingService.createAndValidateFromContext(dto.patientId, overrides);
  }

  @Get('daily-activity')
  @Public()
  @ApiOperation({
    summary: 'Activité du jour',
    description: 'Liste des factures créées aujourd’hui + CA total (chiffre d’affaires journée).',
  })
  @ApiResponse({ status: 200, description: 'invoices[] + totalAmount' })
  async getDailyActivity() {
    return this.billingService.getDailyActivity();
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
