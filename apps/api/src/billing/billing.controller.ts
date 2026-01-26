import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import {
  CreateBillingEventSchema,
  CreateBillingEvent,
} from '@basevitale/shared';
import { CurrentUserId, ZodValidationPipe } from '../common';
import { AuthGuard } from '../common/guards/auth.guard';
import { z } from 'zod';

/**
 * BillingController - Module E+ (Facturation)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * Endpoints REST pour la gestion de la facturation
 * 
 * RÈGLE INVARIANTE: "Pas de Preuve = Pas de Facture"
 */
@Controller('billing')
@UseGuards(AuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Créer un événement de facturation
   * POST /api/billing/events
   * 
   * Valide automatiquement les preuves cliniques avant création
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createBillingEvent(
    @Body(new ZodValidationPipe(CreateBillingEventSchema))
    createBillingDto: CreateBillingEvent,
  ) {
    return this.billingService.createBillingEvent(createBillingDto);
  }

  /**
   * Valider un événement de facturation
   * POST /api/billing/events/:id/validate
   * 
   * Vérifie à nouveau les preuves et marque comme VALIDATED
   */
  @Post('events/:id/validate')
  @HttpCode(HttpStatus.OK)
  async validateBillingEvent(@Param('id') id: string) {
    return this.billingService.validateBillingEvent(id);
  }

  /**
   * Marquer un événement comme transmis
   * POST /api/billing/events/:id/transmit
   * 
   * Marque l'événement comme TRANSMITTED (prêt pour télétransmission)
   */
  @Post('events/:id/transmit')
  @HttpCode(HttpStatus.OK)
  async transmitBillingEvent(@Param('id') id: string) {
    return this.billingService.markAsTransmitted(id);
  }

  /**
   * Obtenir tous les événements d'une consultation
   * GET /api/billing/consultations/:consultationId/events
   */
  @Get('consultations/:consultationId/events')
  async getConsultationEvents(@Param('consultationId') consultationId: string) {
    return this.billingService.getBillingEventsByConsultation(consultationId);
  }

  /**
   * Obtenir un événement de facturation par ID
   * GET /api/billing/events/:id
   */
  @Get('events/:id')
  async getBillingEventById(@Param('id') id: string) {
    return this.billingService.getBillingEventById(id);
  }
}
