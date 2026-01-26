import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import {
  CreateFeedbackEventSchema,
  CodingFeedbackSchema,
} from '@basevitale/shared';
import { CurrentUserId, ZodValidationPipe } from '../common';
import { AuthGuard } from '../common/guards/auth.guard';
import { z } from 'zod';

/**
 * FeedbackController - Module L (Feedback & Apprentissage)
 * 
 * Version Cabinet - Sprint 4: Boucle de Feedback & Outpass
 * 
 * Endpoints pour capturer les corrections et améliorer le système
 */
@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Enregistrer un événement de feedback
   * POST /api/feedback/events
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createFeedback(
    @Body(new ZodValidationPipe(CreateFeedbackEventSchema))
    feedbackData: z.infer<typeof CreateFeedbackEventSchema>,
    @CurrentUserId() correctedBy: string,
  ) {
    return this.feedbackService.createFeedbackEvent({
      ...feedbackData,
      correctedBy,
    });
  }

  /**
   * Enregistrer une correction de codage
   * POST /api/feedback/coding
   */
  @Post('coding')
  @HttpCode(HttpStatus.CREATED)
  async recordCodingCorrection(
    @Body(new ZodValidationPipe(CodingFeedbackSchema))
    codingFeedback: z.infer<typeof CodingFeedbackSchema>,
    @CurrentUserId() correctedBy: string,
  ) {
    return this.feedbackService.recordCodingCorrection(
      codingFeedback,
      correctedBy,
    );
  }

  /**
   * Obtenir les feedbacks pour une entité
   * GET /api/feedback/entities/:entityId
   */
  @Get('entities/:entityId')
  async getEntityFeedbacks(@Param('entityId') entityId: string) {
    return this.feedbackService.getFeedbacksForEntity(entityId);
  }

  /**
   * Obtenir les statistiques de feedback
   * GET /api/feedback/stats
   */
  @Get('stats')
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }
}
