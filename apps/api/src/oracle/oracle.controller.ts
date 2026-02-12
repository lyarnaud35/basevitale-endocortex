import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { Timeout } from '../common/decorators/timeout.decorator';
import { OracleGhostService } from './oracle-ghost.service';
import type { PatientContextMachineState } from './patient-context-machine.schema';

/**
 * GHOST PROTOCOL - OracleController (L'Oracle)
 *
 * Expose l'Oracle (PatientContextMachine) via SSE.
 * - POST /api/oracle/:patientId/start : initialise la machine et lance le traitement (Mock + xAI).
 * - GET  /api/oracle/:patientId/stream : stream SSE des états en temps réel.
 */
@ApiTags('Oracle')
@Controller('oracle')
export class OracleController {
  private readonly logger = new Logger(OracleController.name);

  constructor(private readonly oracleGhostService: OracleGhostService) {}

  /**
   * POST /api/oracle/:patientId/start
   * Initialise la machine pour le patient et démarre le flux (INITIALIZE -> FETCHING_CONTEXT -> READY | ERROR).
   */
  @Public()
  @Post(':patientId/start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Démarrer l'Oracle pour un patient",
    description:
      "Crée ou réinitialise la machine, envoie INITIALIZE + START_FETCH, puis exécute Mock + xAI en arrière-plan. " +
      "Connectez-vous au stream GET /oracle/:patientId/stream pour recevoir les états en temps réel.",
  })
  @ApiResponse({ status: 201, description: 'Démarrage lancé' })
  async start(@Param('patientId') patientId: string): Promise<{ success: true; patientId: string }> {
    return this.oracleGhostService.start(patientId);
  }

  /**
   * GET /api/oracle/:patientId/stream
   * Stream Server-Sent Events de l'état de la PatientContextMachine.
   */
  @Public()
  @SkipTransform()
  @Timeout(0)
  @Sse(':patientId/stream')
  @ApiOperation({
    summary: "Stream SSE de l'état de l'Oracle",
    description: 'Ouvre une connexion SSE et reçoit les mises à jour (value, context, updatedAt) en temps réel.',
  })
  @ApiResponse({ status: 200, description: 'Stream SSE actif' })
  @ApiResponse({ status: 404, description: 'Patient non trouvé' })
  streamState(@Param('patientId') patientId: string): Observable<MessageEvent> {
    try {
      const stateStream = this.oracleGhostService.getStream(patientId);
      return stateStream.pipe(
        map((state: PatientContextMachineState) => {
          const data = JSON.stringify(state);
          return { data } as MessageEvent;
        }),
      );
    } catch (error) {
      this.logger.error(`SSE stream error for patient ${patientId}`, error);
      throw error instanceof NotFoundException
        ? error
        : new NotFoundException(`Failed to create stream for patient ${patientId}`);
    }
  }

  /**
   * GET /api/oracle/:patientId/state
   * État actuel de la machine (sans stream).
   */
  @Public()
  @Get(':patientId/state')
  @ApiOperation({ summary: "État actuel de l'Oracle" })
  @ApiResponse({ status: 200, description: 'État (value, context, updatedAt)' })
  @ApiResponse({ status: 404, description: 'Patient non trouvé' })
  getState(@Param('patientId') patientId: string): PatientContextMachineState {
    return this.oracleGhostService.getState(patientId);
  }
}
