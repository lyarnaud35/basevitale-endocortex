import {
  Controller,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ESBService } from './esb.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * ESBController
 * 
 * Endpoints pour l'Enterprise Service Bus
 * Réception de messages de systèmes externes
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('esb')
export class ESBController {
  constructor(private readonly esbService: ESBService) {}

  /**
   * Recevoir un message d'un système externe
   * POST /esb/receive
   * 
   * Accepte: HL7, FHIR, JSON, XML, CSV
   */
  @Post('receive')
  @Public() // Authentification spéciale pour systèmes externes
  async receiveMessage(
    @Body() body: any,
    @Query('source') source: string,
    @Headers('content-type') contentType?: string,
  ) {
    const result = await this.esbService.processIncomingMessage(body, source || 'unknown');

    // Router automatiquement
    const routing = await this.esbService.routeMessage(result.transformed, source || 'unknown');

    return {
      success: true,
      data: {
        ...result,
        routing,
      },
    };
  }
}
