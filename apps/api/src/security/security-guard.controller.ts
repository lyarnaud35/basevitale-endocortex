import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SecurityGuardService } from './security-guard.service';
import type { SecurityGuardMachineState } from './security-guard-machine.schema';

/** Body optionnel pour l'override (justification pour l'audit). */
class OverrideBodyDto {
  reason?: string;
}

/**
 * GHOST PROTOCOL - SecurityGuardController (Semaine 2 - La Loi Martiale)
 * Observateur : écoute l'Oracle ; après POST watch, dès que l'Oracle est READY,
 * la SecurityGuardMachine reçoit le contexte et passe en DEFCON_3 si allergie critique.
 */
@ApiTags('Security Guard')
@Controller('security-guard')
export class SecurityGuardController {
  constructor(private readonly securityGuardService: SecurityGuardService) {}

  /**
   * Démarre l'observation de l'Oracle pour ce patient.
   * À appeler après ou avant POST /oracle/:patientId/start.
   */
  @Public()
  @Post(':patientId/watch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Démarrer l’observation Oracle pour ce patient' })
  @ApiResponse({ status: 200, description: 'Watch démarré' })
  startWatch(@Param('patientId') patientId: string): { success: true; patientId: string } {
    this.securityGuardService.startWatching(patientId);
    return { success: true, patientId };
  }

  /**
   * État actuel de la SecurityGuardMachine pour ce patient.
   */
  @Public()
  @Get(':patientId/state')
  @ApiOperation({ summary: 'État de la SecurityGuard (IDLE | DEFCON_3)' })
  @ApiResponse({ status: 200, description: 'value, context, updatedAt' })
  getState(@Param('patientId') patientId: string): SecurityGuardMachineState {
    return this.securityGuardService.getState(patientId);
  }

  /**
   * Forcer le passage (override) : DEFCON_3 → IDLE.
   * Le frontend appelle ce endpoint quand l'utilisateur clique sur "Forcer le passage".
   * Body optionnel : { reason } pour l'audit (Module L - Feedback).
   */
  @Public()
  @Post(':patientId/override')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override : forcer le passage (DEFCON_3 → IDLE)' })
  @ApiBody({ type: OverrideBodyDto, required: false })
  @ApiResponse({ status: 200, description: 'Nouvel état de la machine' })
  override(
    @Param('patientId') patientId: string,
    @Body() body?: OverrideBodyDto,
  ): SecurityGuardMachineState {
    return this.securityGuardService.sendOverride(patientId, body?.reason);
  }
}
