import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingValidationService } from './billing-validation.service';
import { MetricsService } from '../common/services/metrics.service';
import {
  CreateBillingEventSchema,
  BillingEventSchema,
  CreateBillingEvent,
  BillingEvent,
  BillingStatus,
} from '@basevitale/shared';
import { z } from 'zod';

/**
 * BillingService - Module E+ (Facturation)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * RÈGLE INVARIANTE: "Pas de Preuve = Pas de Facture"
 * 
 * Gère la création et validation des événements de facturation
 * avec vérification automatique des preuves cliniques
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingValidation: BillingValidationService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Créer un événement de facturation
   * 
   * Valide automatiquement que les preuves cliniques existent
   * avant de créer l'événement
   * 
   * @param createBillingData - Données de facturation
   * @returns Événement de facturation créé
   */
  async createBillingEvent(
    createBillingData: CreateBillingEvent,
  ): Promise<BillingEvent> {
    // Validation avec Zod
    const validatedData = CreateBillingEventSchema.parse(createBillingData);

    // Vérifier que la consultation existe
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: validatedData.consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(
        `Consultation ${validatedData.consultationId} not found`,
      );
    }

    // Vérifier que la consultation peut être facturée
    // RÈGLE: Pas de Preuve = Pas de Facture
    const validation = await this.billingValidation.validateClinicalEvidence(
      validatedData.evidence,
      validatedData.consultationId,
    );

    if (!validation.valid) {
      this.logger.warn(
        `Billing event creation blocked: ${validation.message}`,
      );
      throw new BadRequestException({
        message: 'Impossible de créer l\'événement de facturation',
        reason: validation.message,
        missingEvidence: validation.missingNodeIds,
      });
    }

    // Vérifier également avec la méthode canBillAct
    const canBill = await this.billingValidation.canBillAct(
      validatedData.consultationId,
      validatedData.actType,
    );

    if (!canBill.allowed) {
      throw new BadRequestException({
        message: canBill.message,
        actType: validatedData.actType,
      });
    }

    // Créer l'événement de facturation
    try {
      const billingEvent = await this.prisma.billingEvent.create({
        data: {
          consultationId: validatedData.consultationId,
          ghmCode: validatedData.ghmCode || null,
          actCode: validatedData.actCode || null,
          actType: validatedData.actType,
          status: 'PENDING',
          evidenceNodeIds: validatedData.evidence.nodeIds,
        },
      });

      this.logger.log(
        `Billing event created: ${billingEvent.id} for consultation ${validatedData.consultationId}`,
      );

      // Enregistrer métriques
      this.metricsService.incrementCounter('billing.events.created');
      this.metricsService.incrementCounter(`billing.events.created.${validatedData.actType.toLowerCase()}`);

      return await this.mapToBillingEvent(billingEvent);
    } catch (error) {
      this.logger.error('Error creating billing event', error);
      throw new BadRequestException('Failed to create billing event');
    }
  }

  /**
   * Valider un événement de facturation
   * 
   * Change le statut de PENDING à VALIDATED
   * Vérifie à nouveau les preuves cliniques
   * 
   * @param billingEventId - ID de l'événement
   * @returns Événement validé
   */
  async validateBillingEvent(billingEventId: string): Promise<BillingEvent> {
    const billingEvent = await this.prisma.billingEvent.findUnique({
      where: { id: billingEventId },
      include: { consultation: true },
    });

    if (!billingEvent) {
      throw new NotFoundException(`Billing event ${billingEventId} not found`);
    }

    if (billingEvent.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot validate billing event with status ${billingEvent.status}`,
      );
    }

    // Vérifier à nouveau les preuves (elles peuvent avoir changé)
    const nodes = await this.prisma.semanticNode.findMany({
      where: {
        id: { in: billingEvent.evidenceNodeIds },
        consultationId: billingEvent.consultationId,
      },
    });

    if (nodes.length !== billingEvent.evidenceNodeIds.length) {
      throw new BadRequestException(
        'Certaines preuves cliniques ne sont plus valides',
      );
    }

    // Marquer comme validé
    const updated = await this.prisma.billingEvent.update({
      where: { id: billingEventId },
      data: { status: 'VALIDATED' },
    });

    this.logger.log(`Billing event validated: ${billingEventId}`);

    // Enregistrer métriques
    this.metricsService.incrementCounter('billing.events.validated');

    return await this.mapToBillingEvent(updated);
  }

  /**
   * Obtenir tous les événements de facturation d'une consultation
   * 
   * @param consultationId - ID de la consultation
   * @returns Liste des événements de facturation
   */
  async getBillingEventsByConsultation(
    consultationId: string,
  ): Promise<BillingEvent[]> {
    const events = await this.prisma.billingEvent.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(events.map((event) => this.mapToBillingEvent(event)));
  }

  /**
   * Obtenir un événement de facturation par ID
   * 
   * @param id - ID de l'événement
   * @returns Événement de facturation
   */
  async getBillingEventById(id: string): Promise<BillingEvent> {
    const event = await this.prisma.billingEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Billing event ${id} not found`);
    }

    return await this.mapToBillingEvent(event);
  }

  /**
   * Marquer un événement comme transmis
   * 
   * @param billingEventId - ID de l'événement
   * @returns Événement mis à jour
   */
  async markAsTransmitted(billingEventId: string): Promise<BillingEvent> {
    const event = await this.prisma.billingEvent.findUnique({
      where: { id: billingEventId },
    });

    if (!event) {
      throw new NotFoundException(`Billing event ${billingEventId} not found`);
    }

    if (event.status !== 'VALIDATED') {
      throw new BadRequestException(
        'Seuls les événements validés peuvent être transmis',
      );
    }

    const updated = await this.prisma.billingEvent.update({
      where: { id: billingEventId },
      data: {
        status: 'TRANSMITTED',
        transmittedAt: new Date(),
      },
    });

    this.logger.log(`Billing event transmitted: ${billingEventId}`);

    // Enregistrer métriques
    this.metricsService.incrementCounter('billing.events.transmitted');

    return await this.mapToBillingEvent(updated);
  }

  /**
   * Mapper un événement Prisma vers BillingEvent
   */
  private mapToBillingEvent(event: any): BillingEvent {
    return {
      id: event.id,
      consultationId: event.consultationId,
      ghmCode: event.ghmCode || undefined,
      actCode: event.actCode || undefined,
      actType: event.actType,
      evidence: {
        nodeIds: event.evidenceNodeIds,
        evidenceType: 'CONSULTATION_NOTE', // À déterminer depuis les nœuds
      },
      status: event.status as BillingStatus,
      createdAt: event.createdAt,
      transmittedAt: event.transmittedAt || undefined,
      description: undefined,
      rejectionReason: undefined,
    };
  }
}
