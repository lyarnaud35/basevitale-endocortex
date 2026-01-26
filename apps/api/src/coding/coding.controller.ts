import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CodingService } from './coding.service';
import { CodingRequestSchema } from '@basevitale/shared';
import { ZodValidationPipe } from '../common';
import { AuthGuard } from '../common/guards/auth.guard';
import { z } from 'zod';

/**
 * CodingController - Module B+ (Codage)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * Endpoints REST pour le codage automatique CIM-10/11
 */
@Controller('coding')
@UseGuards(AuthGuard)
export class CodingController {
  constructor(private readonly codingService: CodingService) {}

  /**
   * Suggérer des codes CIM pour une consultation ou un texte
   * POST /api/coding/suggest
   */
  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async suggestCodes(
    @Body(new ZodValidationPipe(CodingRequestSchema)) request: z.infer<typeof CodingRequestSchema>,
  ) {
    return this.codingService.suggestCodes(request);
  }

  /**
   * Obtenir les codes CIM d'une consultation existante
   * GET /api/coding/consultations/:consultationId
   */
  @Get('consultations/:consultationId')
  async getConsultationCodes(
    @Param('consultationId') consultationId: string,
    @Query('minConfidence') minConfidence?: string,
  ) {
    const confidence = minConfidence ? parseFloat(minConfidence) : 0.4;
    return this.codingService.getCodesFromConsultation(consultationId, confidence);
  }
}
