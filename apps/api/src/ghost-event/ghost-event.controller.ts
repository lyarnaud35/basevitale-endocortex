import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SecurityGuardService } from '../security/security-guard.service';
import type { SecurityGuardMachineState } from '../security/security-guard-machine.schema';
import { GhostEventBodyDto } from './ghost-event.dto';

/**
 * GHOST PROTOCOL - L'Interrupteur Quantique (State Mutation)
 * Une seule route pour envoyer une intention et recevoir le nouvel état.
 * Le Frontend ne décide jamais ; il envoie une intention, le Backend évalue et répond.
 */
@ApiTags('Ghost')
@Controller('ghost')
export class GhostEventController {
  private readonly logger = new Logger(GhostEventController.name);

  constructor(private readonly securityGuardService: SecurityGuardService) {}

  /**
   * POST /api/ghost/event
   * Envoie une intention à une machine et reçoit le nouvel état complet.
   */
  @Public()
  @Post('event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoyer une intention (événement) à une machine',
    description:
      'Bidirectionnalité : le frontend envoie une intention (ex. OVERRIDE_REQUEST), ' +
      'le backend évalue, applique la transition et renvoie le nouvel état.',
  })
  @ApiBody({ type: GhostEventBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Nouvel état complet de la machine (value, context, updatedAt)',
  })
  @ApiResponse({ status: 400, description: 'Body invalide ou machine/event inconnu' })
  sendEvent(
    @Body() body: GhostEventBodyDto,
  ): SecurityGuardMachineState | Record<string, unknown> {
    const { machineId, eventType, payload } = body;

    if (!machineId || !eventType) {
      throw new BadRequestException('machineId et eventType requis');
    }

    if (machineId === 'security' && eventType === 'OVERRIDE_REQUEST') {
      const patientId = payload?.patientId as string | undefined;
      if (!patientId || typeof patientId !== 'string') {
        throw new BadRequestException('payload.patientId requis pour OVERRIDE_REQUEST');
      }
      const reason = (payload?.reason as string) || undefined;
      this.logger.log(
        `[ghost/event] security OVERRIDE_REQUEST patientId=${patientId} reason=${reason ?? 'non précisée'}`,
      );
      const newState = this.securityGuardService.sendOverride(patientId, reason);
      return newState;
    }

    if (machineId === 'security' && eventType === 'VALIDATE_PRESCRIPTION') {
      const patientId = payload?.patientId as string | undefined;
      if (!patientId || typeof patientId !== 'string') {
        throw new BadRequestException('payload.patientId requis pour VALIDATE_PRESCRIPTION');
      }
      this.logger.log(`[ghost/event] security VALIDATE_PRESCRIPTION patientId=${patientId}`);
      return this.securityGuardService.sendValidatePrescription(patientId);
    }

    if (machineId === 'security' && eventType === 'RESET') {
      const patientId = payload?.patientId as string | undefined;
      if (!patientId || typeof patientId !== 'string') {
        throw new BadRequestException('payload.patientId requis pour RESET');
      }
      this.logger.log(`[ghost/event] security RESET patientId=${patientId}`);
      return this.securityGuardService.sendReset(patientId);
    }

    throw new BadRequestException(
      `Machine ou événement non géré: machineId=${machineId} eventType=${eventType}`,
    );
  }
}
