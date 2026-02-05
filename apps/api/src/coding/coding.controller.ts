import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Sse,
  MessageEvent,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../common';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { Timeout } from '../common/decorators/timeout.decorator';
import { ZodError } from 'zod';
import {
  CodingEventSchema,
  type CodingEvent,
  type CodingMachineState,
} from '@basevitale/shared';
import { CodingService } from './coding.service';
import { CodingGhostService } from './coding-ghost.service';
import { CodingResponseDto, AnalyzeTextBodyDto } from './coding.dto';

/**
 * CodingController – Ghost Protocol (SSE + analyse CIM-10).
 * GET /coding/stream (SSE), POST /coding/analyze (suggest), POST /coding/send, GET /coding/state.
 */
@ApiTags('Coding-CIM-10')
@Controller('coding')
export class CodingController {
  private readonly logger = new Logger(CodingController.name);

  constructor(
    private readonly codingService: CodingService,
    private readonly codingGhostService: CodingGhostService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Ping du module Coding' })
  @ApiResponse({ status: 200, description: 'Module actif' })
  ping() {
    return this.codingService.ping();
  }

  @Public()
  @SkipTransform()
  @Timeout(0)
  @Sse('stream')
  @ApiOperation({ summary: 'Flux SSE de l’état de la machine de codage' })
  @ApiResponse({ status: 200, description: 'Stream Server-Sent Events (CodingMachineState)' })
  streamState(): Observable<MessageEvent> {
    const stateStream = this.codingGhostService.getStream();
    return stateStream.pipe(
      map((state: CodingMachineState) => ({
        data: JSON.stringify(state),
      } as MessageEvent))
    );
  }

  @Public()
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyser un texte et obtenir des suggestions CIM-10 (suggest)' })
  @ApiBody({
    type: AnalyzeTextBodyDto,
    examples: {
      fracture: {
        summary: 'Fracture (→ S82, SUGGESTING)',
        value: { text: 'Le patient présente une fracture du tibia droit.' },
      },
      ventre: {
        summary: 'Douleur ventre (→ R10, SILENT)',
        value: { text: 'Mal au ventre depuis ce matin.' },
      },
    },
  })
  @ApiResponse({ status: 200, type: CodingResponseDto, description: 'État de la machine après analyse (IDLE | ANALYZING | SUGGESTING | SILENT)' })
  @ApiResponse({ status: 400, description: 'Texte manquant ou invalide' })
  async analyze(@Body() body: AnalyzeTextBodyDto | { text?: string }): Promise<CodingMachineState> {
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      throw new BadRequestException({ message: 'Le texte à analyser est requis (body.text)' });
    }
    const event: CodingEvent = {
      type: 'ANALYZE_TEXT',
      payload: { text },
    };
    try {
      this.logger.log('Analyze requested');
      return await this.codingGhostService.sendEventAndWaitStable(event);
    } catch (error) {
      this.logger.error('Error processing analyze', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to analyze'
      );
    }
  }

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer un événement à la machine (ANALYZE_TEXT, ACCEPT_CODE, RESET)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'payload'],
      properties: {
        type: { type: 'string', enum: ['ANALYZE_TEXT', 'ACCEPT_CODE', 'RESET'] },
        payload: { type: 'object' },
      },
      example: { type: 'RESET', payload: {} },
      examples: {
        analyze: {
          summary: 'Analyser un texte',
          value: { type: 'ANALYZE_TEXT', payload: { text: 'Le patient présente une fracture du tibia.' } },
        },
        acceptCode: {
          summary: 'Accepter un code suggéré',
          value: { type: 'ACCEPT_CODE', payload: { code: 'S82', label: 'Fracture de la jambe' } },
        },
        reset: {
          summary: 'Réinitialiser la machine',
          value: { type: 'RESET', payload: {} },
        },
      },
    },
  })
  @ApiResponse({ status: 200, type: CodingResponseDto, description: 'État de la machine après traitement' })
  @ApiResponse({ status: 400, description: 'Payload invalide (validation Zod)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    })
  )
  async send(@Body() body: unknown): Promise<CodingMachineState> {
    const raw = body != null && typeof body === 'object' ? body as Record<string, unknown> : {};
    if (raw.type === 'RESET' && !('payload' in raw)) (raw as Record<string, unknown>).payload = {};
    let event: CodingEvent;
    try {
      event = CodingEventSchema.parse(raw) as CodingEvent;
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          path: e.path.join('.') || 'body',
          message: e.message,
        }));
        throw new BadRequestException({
          message: 'Validation failed',
          errors,
          hint: 'Body must be { type: "ANALYZE_TEXT"|"ACCEPT_CODE"|"RESET", payload: { ... } }. Use an example in Swagger.',
        });
      }
      throw new BadRequestException('Invalid event payload');
    }
    try {
      this.logger.log(`Received event: ${event.type}`);
      return await this.codingGhostService.sendEvent(event);
    } catch (error) {
      this.logger.error('Error processing coding event', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to process event'
      );
    }
  }

  @Public()
  @Get('state')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtenir l’état courant de la machine de codage' })
  @ApiResponse({ status: 200, type: CodingResponseDto })
  getState(): CodingMachineState {
    return this.codingGhostService.getState();
  }
}
