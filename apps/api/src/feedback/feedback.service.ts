import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import {
  CreateFeedbackEventSchema,
  FeedbackEventSchema,
  CreateFeedbackEvent,
  FeedbackEvent,
  CodingFeedback,
} from '@basevitale/shared';
import { z } from 'zod';

/**
 * FeedbackService - Module L (Feedback & Apprentissage)
 * 
 * Version Cabinet - Sprint 4: Boucle de Feedback & Outpass
 * 
 * Capture les corrections pour amélioration continue
 * Concept "Antifragile" : le système s'améliore grâce aux erreurs
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Enregistrer un événement de feedback
   * 
   * Capture une correction effectuée par le médecin
   * pour amélioration future du système
   * 
   * @param feedbackData - Données du feedback
   * @returns Événement de feedback créé
   */
  async createFeedbackEvent(
    feedbackData: CreateFeedbackEvent,
  ): Promise<FeedbackEvent> {
    // Validation avec Zod
    const validatedData = CreateFeedbackEventSchema.parse(feedbackData);

    try {
      const feedbackEvent = await this.prisma.feedbackEvent.create({
        data: {
          entityType: validatedData.entityType,
          entityId: validatedData.entityId,
          originalValue: validatedData.originalValue,
          correctedValue: validatedData.correctedValue,
          correctionReason: validatedData.correctionReason || null,
          correctedBy: validatedData.correctedBy,
        },
      });

      this.logger.log(
        `Feedback event created: ${feedbackEvent.id} (${validatedData.entityType})`,
      );

      // Enregistrer métriques
      this.metricsService.incrementCounter('feedback.events.created');
      this.metricsService.incrementCounter(`feedback.events.created.${validatedData.entityType.toLowerCase()}`);

      // Analyser le feedback pour apprentissage
      await this.analyzeFeedback(feedbackEvent);

      return this.mapToFeedbackEvent(feedbackEvent);
    } catch (error) {
      this.logger.error('Error creating feedback event', error);
      throw error;
    }
  }

  /**
   * Enregistrer une correction de codage
   * 
   * Spécialisé pour les corrections de codes CIM
   * 
   * @param codingFeedback - Correction de codage
   * @returns Événement créé
   */
  async recordCodingCorrection(
    codingFeedback: CodingFeedback,
    correctedBy: string,
  ): Promise<FeedbackEvent> {
    // Trouver l'entité originale (nœud DIAGNOSIS probablement)
    const originalNode = await this.prisma.semanticNode.findUnique({
      where: { id: codingFeedback.entityId },
      select: { cim10Code: true, cim11Code: true, label: true, confidence: true },
    });

    if (!originalNode) {
      throw new Error(`Node ${codingFeedback.entityId} not found`);
    }

    // Créer le feedback
    return this.createFeedbackEvent({
      entityType: 'CODING',
      entityId: codingFeedback.entityId,
      originalValue: {
        code: codingFeedback.originalCode,
        label: originalNode.label,
        confidence: codingFeedback.originalConfidence || originalNode.confidence,
      },
      correctedValue: {
        code: codingFeedback.correctedCode,
        label: codingFeedback.correctedLabel,
      },
      correctionReason: codingFeedback.correctionReason,
      correctedBy,
      context: {
        consultationId: codingFeedback.consultationId,
        patientId: codingFeedback.patientId,
      },
    });
  }

  /**
   * Analyser un feedback pour apprentissage
   * 
   * Identifie les patterns de correction pour améliorer
   * les suggestions futures
   * 
   * @private
   */
  private async analyzeFeedback(event: any): Promise<void> {
    // TODO: Implémenter l'analyse des patterns
    // - Identifier les corrections fréquentes
    // - Ajuster les poids des modèles locaux
    // - Créer des règles d'apprentissage

    this.logger.debug(`Analyzing feedback event ${event.id} for learning patterns`);
    
    // Pour l'instant, on stocke juste le feedback
    // L'analyse sera implémentée dans le Sprint 4 complet
  }

  /**
   * Obtenir les feedbacks pour une entité
   * 
   * @param entityId - ID de l'entité
   * @returns Liste des feedbacks
   */
  async getFeedbacksForEntity(entityId: string): Promise<FeedbackEvent[]> {
    const events = await this.prisma.feedbackEvent.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });

    return events.map((event) => this.mapToFeedbackEvent(event));
  }

  /**
   * Obtenir les statistiques de feedback
   * 
   * Utile pour comprendre les patterns de correction
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byEntityType: Record<string, number>;
    recent: number;
  }> {
    const total = await this.prisma.feedbackEvent.count();

    const events = await this.prisma.feedbackEvent.findMany({
      select: { entityType: true, createdAt: true },
    });

    const byEntityType: Record<string, number> = {};
    events.forEach((event) => {
      byEntityType[event.entityType] = (byEntityType[event.entityType] || 0) + 1;
    });

    const recent = events.filter(
      (event) =>
        event.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
    ).length;

    return {
      total,
      byEntityType,
      recent,
    };
  }

  /**
   * Mapper un événement Prisma vers FeedbackEvent
   */
  private mapToFeedbackEvent(event: any): FeedbackEvent {
    return {
      id: event.id,
      entityType: event.entityType,
      entityId: event.entityId,
      originalValue: event.originalValue,
      correctedValue: event.correctedValue,
      correctionReason: event.correctionReason || undefined,
      context: undefined,
      createdAt: event.createdAt,
      correctedBy: event.correctedBy,
      usedForTraining: false,
    };
  }
}
