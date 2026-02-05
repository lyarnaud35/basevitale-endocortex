import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GhostMachineService } from './ghost-machine.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { ZodValidationPipe } from '../common';
import { z } from 'zod';
import { EventObject } from 'xstate';

/**
 * GHOST PROTOCOL v999 - GhostController
 * 
 * Controller générique pour le streaming d'état des machines via SSE.
 * 
 * Endpoints :
 * - GET /api/ghost/stream/:machineId : Stream SSE de l'état de la machine
 * - POST /api/ghost/machine/:machineId/event : Envoie un événement à la machine
 * - GET /api/ghost/machine/:machineId/state : Récupère l'état actuel
 * - POST /api/ghost/machine/:machineId/reset : Réinitialise la machine
 */

const EventSchema = z.object({
  type: z.string(),
  payload: z.record(z.unknown()).optional(),
});

@ApiTags('Ghost')
@Controller('ghost')
@UseGuards(AuthGuard)
export class GhostController {
  private readonly logger = new Logger(GhostController.name);

  constructor(private readonly ghostMachineService: GhostMachineService) {}

  /**
   * GET /api/ghost/stream/:machineId
   * 
   * Stream Server-Sent Events (SSE) de l'état de la machine.
   * Le client se connecte et reçoit les mises à jour en temps réel.
   */
  @ApiOperation({
    summary: 'Streamer l\'état d\'une machine via SSE (GHOST PROTOCOL)',
    description:
      'Ouvre une connexion SSE et envoie les mises à jour d\'état en temps réel. ' +
      'Le client doit envoyer des événements via POST /api/ghost/machine/:machineId/event',
  })
  @ApiResponse({ status: 200, description: 'Stream SSE actif' })
  @ApiResponse({ status: 404, description: 'Machine introuvable' })
  @Get('stream/:machineId')
  @HttpCode(HttpStatus.OK)
  async streamMachineState(
    @Param('machineId') machineId: string,
    @Res() res: Response,
  ): Promise<void> {
    // Vérifier que la machine existe
    try {
      this.ghostMachineService.getMachine(machineId);
    } catch (error) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    // Configurer les en-têtes SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Désactiver le buffering Nginx

    // Envoyer l'état initial
    const initialState = this.ghostMachineService.getState(machineId);
    res.write(`data: ${JSON.stringify(initialState)}\n\n`);

    // S'abonner aux mises à jour
    const unsubscribe = this.ghostMachineService.subscribe(machineId, (state) => {
      try {
        res.write(`data: ${JSON.stringify(state)}\n\n`);
      } catch (error) {
        this.logger.error(`Error writing SSE data for ${machineId}`, error);
        unsubscribe();
        res.end();
      }
    });

    // Gérer la déconnexion du client
    res.on('close', () => {
      this.logger.log(`SSE connection closed for machine ${machineId}`);
      unsubscribe();
      res.end();
    });

    // Envoyer un ping périodique pour maintenir la connexion
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (error) {
        clearInterval(pingInterval);
        unsubscribe();
        res.end();
      }
    }, 30000); // Ping toutes les 30 secondes

    // Nettoyer lors de la fermeture
    res.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  /**
   * POST /api/ghost/machine/:machineId/event
   * 
   * Envoie un événement à la machine.
   * Retourne le nouvel état de la machine.
   */
  @ApiOperation({
    summary: 'Envoyer un événement à une machine (GHOST PROTOCOL)',
    description:
      'Envoie une intention (événement) à la machine et reçoit le nouvel état. ' +
      'Les événements invalides sont ignorés par la machine.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nouvel état de la machine (value, context, updatedAt)',
  })
  @ApiResponse({ status: 400, description: 'Événement invalide' })
  @ApiResponse({ status: 404, description: 'Machine introuvable' })
  @Post('machine/:machineId/event')
  @HttpCode(HttpStatus.OK)
  async sendMachineEvent(
    @Param('machineId') machineId: string,
    @Body(new ZodValidationPipe(EventSchema)) event: EventObject,
  ) {
    try {
      this.logger.log(`[${machineId}] Received event: ${event.type}`);
      const newState = await this.ghostMachineService.sendEvent(machineId, event);
      return newState;
    } catch (error) {
      this.logger.error(`[${machineId}] Error processing event`, error);
      throw error;
    }
  }

  /**
   * GET /api/ghost/machine/:machineId/state
   * 
   * Récupère l'état actuel de la machine.
   */
  @ApiOperation({
    summary: 'Récupérer l\'état actuel d\'une machine',
    description: 'Retourne l\'état complet (value, context, updatedAt)',
  })
  @ApiResponse({ status: 200, description: 'État actuel de la machine' })
  @ApiResponse({ status: 404, description: 'Machine introuvable' })
  @Get('machine/:machineId/state')
  @HttpCode(HttpStatus.OK)
  async getMachineState(@Param('machineId') machineId: string) {
    return this.ghostMachineService.getState(machineId);
  }

  /**
   * POST /api/ghost/machine/:machineId/reset
   * 
   * Réinitialise la machine à son état initial.
   */
  @ApiOperation({
    summary: 'Réinitialiser une machine',
    description: 'Remet la machine à son état initial',
  })
  @ApiResponse({ status: 200, description: 'Machine réinitialisée' })
  @ApiResponse({ status: 404, description: 'Machine introuvable' })
  @Post('machine/:machineId/reset')
  @HttpCode(HttpStatus.OK)
  async resetMachine(@Param('machineId') machineId: string) {
    this.ghostMachineService.resetMachine(machineId);
    return { success: true };
  }
}
