import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CodingStrategistService } from './coding-strategist.service';

/**
 * Laboratoire Déterministe – Contrôleur de test du Stratège (Semaine 3).
 * POST /coding/strategist/input → envoie du texte (déclenche DEBOUNCING → ANALYZING).
 * GET /coding/strategist/state → état courant + shouldDisplay (true seulement en SUGGESTING).
 */
@ApiTags('Coding-Stratège')
@Controller('coding/strategist')
export class CodingStrategistController {
  constructor(private readonly codingStrategistService: CodingStrategistService) {}

  @Public()
  @Post('input')
  @ApiOperation({
    summary: 'Envoyer du texte à analyser (déclenche debounce puis analyse)',
    description:
      'Exemples : "grippe" → SUGGESTING ; "fatigue" ou "mal" → SILENT ; "error" → FAILURE.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: { text: { type: 'string' } },
      example: { text: 'Le patient présente une grippe sévère' },
    },
  })
  @ApiResponse({ status: 200, description: 'Texte reçu' })
  updateText(@Body('text') text: string) {
    const value = typeof text === 'string' ? text : '';
    this.codingStrategistService.updateInput(value);
    return { status: 'Received', text: value };
  }

  @Public()
  @Get('state')
  @ApiOperation({
    summary: 'État actuel de la machine Stratège',
    description:
      'shouldDisplay = true uniquement en SUGGESTING. En SILENT, le contexte peut contenir des suggestions (score bas) mais le front ne doit rien afficher.',
  })
  @ApiResponse({ status: 200, description: 'state, context, shouldDisplay' })
  getState() {
    return this.codingStrategistService.getSnapshot();
  }
}
