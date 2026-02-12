import { Controller, Post, Body, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CodingStrategistService } from './coding-strategist.service';

const DEFAULT_SESSION_ID = 'default';

/**
 * Laboratoire Déterministe – Contrôleur du Stratège multi-tenant (v200).
 * POST /coding/strategist/input → envoie du texte pour une session (déclenche DEBOUNCING → ANALYZING).
 * GET /coding/strategist/state → état courant de la session + shouldDisplay (true seulement en SUGGESTING).
 */
@ApiTags('Coding-Stratège')
@Controller('coding/strategist')
export class CodingStrategistController {
  constructor(private readonly codingStrategistService: CodingStrategistService) {}

  @Public()
  @Post('input')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Envoyer du texte à analyser (déclenche debounce puis analyse)',
    description:
      'Exemples : "grippe" → SUGGESTING ; "fatigue" ou "mal" → SILENT ; "error" → FAILURE. sessionId optionnel (défaut: "default").',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        sessionId: { type: 'string', description: 'ID de session (multi-tenant)' },
        text: { type: 'string' },
      },
      example: { sessionId: 'default', text: 'Le patient présente une grippe sévère' },
    },
  })
  @ApiResponse({ status: 200, description: 'Texte reçu' })
  updateText(
    @Body('sessionId') sessionId: string | undefined,
    @Body('text') text: string,
  ) {
    const sid = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : DEFAULT_SESSION_ID;
    const value = typeof text === 'string' ? text : '';
    this.codingStrategistService.updateInput(sid, value);
    return { status: 'Received', sessionId: sid, text: value };
  }

  @Public()
  @Get('state')
  @ApiOperation({
    summary: 'État actuel de la machine Stratège pour une session',
    description:
      'shouldDisplay = true uniquement en SUGGESTING. sessionId en query (défaut: "default").',
  })
  @ApiQuery({ name: 'sessionId', required: false, description: 'ID de session' })
  @ApiResponse({ status: 200, description: 'state, context, shouldDisplay' })
  getState(@Query('sessionId') sessionId?: string) {
    const sid = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : DEFAULT_SESSION_ID;
    return this.codingStrategistService.getSnapshot(sid);
  }
}
