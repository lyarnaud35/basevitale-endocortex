import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CodingAssistantService } from './coding-assistant.service';
import type { CodingAssistantMachineState } from './coding-assistant-machine.schema';

/**
 * GHOST PROTOCOL - CodingAssistantController (Semaine 3 - Le Stratège)
 * Observateur : écoute l'Oracle ; dès que READY, la machine passe ANALYZING → SUGGESTING | SILENT.
 */
@ApiTags('Coding Assistant')
@Controller('coding-assistant')
export class CodingAssistantController {
  constructor(private readonly codingAssistantService: CodingAssistantService) {}

  @Public()
  @Get(':patientId/state')
  @ApiOperation({ summary: 'État de la CodingAssistantMachine (IDLE | ANALYZING | SUGGESTING | SILENT)' })
  @ApiResponse({ status: 200, description: 'value, context, updatedAt' })
  getState(@Param('patientId') patientId: string): CodingAssistantMachineState {
    return this.codingAssistantService.getState(patientId);
  }
}
