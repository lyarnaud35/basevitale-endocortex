import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScribeGhostService } from './scribe-ghost.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { Timeout } from '../common/decorators/timeout.decorator';
import { ZodError } from 'zod';
import {
  ScribeEventSchema,
  ScribeEvent,
  ScribeMachineState,
} from '@basevitale/shared';

/**
 * GHOST PROTOCOL v999 - ScribeGhostController
 *
 * Controller pour le streaming SSE et l'envoi d'événements à la ScribeMachine.
 * Préfixe racine /ghost-scribe pour garantir l'enregistrement des routes (aucun conflit avec /scribe).
 *
 * Endpoints :
 * - GET  /api/ghost-scribe/ping
 * - GET  /api/ghost-scribe/stream/:sessionId
 * - POST /api/ghost-scribe/events/:sessionId
 * - GET  /api/ghost-scribe/state/:sessionId
 * - POST /api/ghost-scribe/reset/:sessionId
 */
@ApiTags('Scribe Ghost')
@Controller('ghost-scribe')
@UseGuards(AuthGuard)
export class ScribeGhostController {
  private readonly logger = new Logger(ScribeGhostController.name);

  constructor(private readonly scribeGhostService: ScribeGhostService) {}

  /**
   * GET /api/ghost-scribe/ping
   * Vérifie que le controller Ghost est bien enregistré.
   */
  @Public()
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  ping(): { ok: true; message: string } {
    return { ok: true, message: 'ScribeGhostController is active' };
  }

  /**
   * GET /api/scribe/stream/:sessionId
   * 
   * Stream Server-Sent Events (SSE) de l'état de la machine.
   * Le client se connecte et reçoit les mises à jour en temps réel.
   * 
   * Format SSE : `data: {JSON}\n\n`
   */
  @ApiOperation({
    summary: 'Streamer l\'état de la ScribeMachine via SSE (GHOST PROTOCOL)',
    description:
      'Ouvre une connexion SSE et envoie les mises à jour d\'état en temps réel. ' +
      'Le client doit envoyer des événements via POST /api/scribe/events/:sessionId',
  })
  @ApiResponse({ status: 200, description: 'Stream SSE actif' })
  @ApiResponse({ status: 404, description: 'Session introuvable' })
  @SkipTransform()
  @Timeout(0)
  @Sse('stream/:sessionId')
  streamMachineState(@Param('sessionId') sessionId: string): Observable<MessageEvent> {
    try {
      // Créer la machine si elle n'existe pas (avec contexte par défaut)
      this.scribeGhostService.getOrCreateMachine(sessionId);
      
      // Récupérer le stream Observable
      const stateStream = this.scribeGhostService.getStream(sessionId);
      
      // Transformer en format SSE (MessageEvent) ; état déjà sanitized côté service
      return stateStream.pipe(
        map((state: ScribeMachineState) => {
          let data: string;
          try {
            data = JSON.stringify(state);
          } catch (err) {
            this.logger.error('SSE serialization failed', err);
            data = JSON.stringify({
              value: String(state?.value ?? 'UNKNOWN'),
              context: {},
              updatedAt: new Date().toISOString(),
              _error: 'Serialization failed',
            });
          }
          return { data } as MessageEvent;
        }),
      );
    } catch (error) {
      this.logger.error(`Error creating SSE stream for ${sessionId}`, error);
      throw error instanceof NotFoundException
        ? error
        : new NotFoundException(`Failed to create stream for session ${sessionId}`);
    }
  }

  /**
   * POST /api/scribe/events/:sessionId
   * 
   * Envoie un événement à la machine.
   * Retourne le nouvel état de la machine.
   * 
   * Les événements sont validés avec le schéma Zod ScribeEventSchema.
   */
  @ApiOperation({
    summary: 'Envoyer un événement à la ScribeMachine (GHOST PROTOCOL)',
    description:
      'Envoie une intention (START, STOP, UPDATE_TEXT, CONFIRM, RESET) et reçoit le nouvel état. ' +
      'Les événements invalides sont ignorés par la machine.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nouvel état de la machine (value, context, updatedAt)',
  })
  @Public()
  @ApiResponse({ status: 400, description: 'Événement invalide' })
  @ApiResponse({ status: 404, description: 'Session introuvable' })
  @Post('events/:sessionId')
  @HttpCode(HttpStatus.OK)
  async sendEvent(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ): Promise<ScribeMachineState> {
    let event: ScribeEvent;
    try {
      event = ScribeEventSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
        throw new BadRequestException({ message: 'Validation failed', errors });
      }
      throw new BadRequestException('Invalid event payload');
    }
    try {
      this.logger.log(`[${sessionId}] Received event: ${event.type}`);
      
      const newState = await this.scribeGhostService.sendEvent(sessionId, event);
      
      return newState;
    } catch (error) {
      this.logger.error(`[${sessionId}] Error processing event`, error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to process event',
      );
    }
  }

  /**
   * GET /api/scribe/state/:sessionId
   * 
   * Récupère l'état actuel de la machine.
   */
  @ApiOperation({
    summary: 'Récupérer l\'état actuel de la ScribeMachine',
    description: 'Retourne l\'état complet (value, context, updatedAt)',
  })
  @ApiResponse({ status: 200, description: 'État actuel de la machine' })
  @ApiResponse({ status: 404, description: 'Session introuvable' })
  @Get('state/:sessionId')
  @HttpCode(HttpStatus.OK)
  async getState(@Param('sessionId') sessionId: string): Promise<ScribeMachineState> {
    return this.scribeGhostService.getState(sessionId);
  }

  /**
   * POST /api/scribe/reset/:sessionId
   * 
   * Réinitialise la machine à son état initial (IDLE).
   */
  @ApiOperation({
    summary: 'Réinitialiser la ScribeMachine',
    description: 'Remet la machine à l\'état IDLE pour un nouveau cycle',
  })
  @ApiResponse({ status: 200, description: 'Machine réinitialisée' })
  @ApiResponse({ status: 404, description: 'Session introuvable' })
  @Post('reset/:sessionId')
  @HttpCode(HttpStatus.OK)
  async resetMachine(@Param('sessionId') sessionId: string): Promise<{ success: true }> {
    this.scribeGhostService.resetMachine(sessionId);
    return { success: true };
  }
}
