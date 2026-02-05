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
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SecurityGhostService } from './security-ghost.service';
import { Public } from '../common/decorators/public.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { Timeout } from '../common/decorators/timeout.decorator';
import { ZodError } from 'zod';
import type { SecurityEvent, SecurityMachineState } from '@basevitale/shared';
import { SecurityEventSchema } from '@basevitale/shared';
import { SecurityResponseDto } from './security.dto';

@ApiTags('Security-C-Verification-prescription')
@Controller('ghost-security')
export class SecurityGhostController {
  private readonly logger = new Logger(SecurityGhostController.name);

  constructor(private readonly securityGhostService: SecurityGhostService) {}

  @Public()
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ping du module Security' })
  @ApiResponse({ status: 200, description: 'Module actif' })
  ping(): { ok: true; message: string } {
    return { ok: true, message: 'SecurityGhostController is active' };
  }

  @Public()
  @SkipTransform()
  @Timeout(0)
  @Sse('stream')
  @ApiOperation({ summary: 'Flux SSE de l’état de la SecurityMachine' })
  @ApiResponse({ status: 200, description: 'Stream Server-Sent Events (SecurityMachineState)' })
  streamState(): Observable<MessageEvent> {
    const stateStream = this.securityGhostService.getStream();
    return stateStream.pipe(
      map((state: SecurityMachineState) => ({
        data: JSON.stringify(state),
      } as MessageEvent))
    );
  }

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier une prescription ou envoyer un événement (check-prescription : type CHECK_DRUG)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'payload'],
      properties: {
        type: { type: 'string', enum: ['CHECK_DRUG', 'RESET', 'REQUEST_OVERRIDE'] },
        payload: { type: 'object' },
      },
      example: {
        type: 'CHECK_DRUG',
        payload: { drug: 'Amoxicilline' },
      },
    },
  })
  @ApiResponse({ status: 200, type: SecurityResponseDto, description: 'État de la machine (SAFE | LOCKED | OVERRIDE_APPROVED)' })
  @ApiResponse({ status: 400, description: 'Payload invalide (validation Zod)' })
  async send(@Body() body: unknown): Promise<SecurityMachineState> {
    let event: SecurityEvent;
    try {
      event = SecurityEventSchema.parse(body) as SecurityEvent;
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
        throw new BadRequestException({ message: 'Validation failed', errors });
      }
      throw new BadRequestException('Invalid event payload');
    }
    try {
      this.logger.log(`Received event: ${event.type}`);
      if (event.type === 'CHECK_DRUG') {
        return await this.securityGhostService.sendEventAndWaitStable(event);
      }
      return await this.securityGhostService.sendEvent(event);
    } catch (error) {
      this.logger.error('Error processing security event', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to process event'
      );
    }
  }

  @Public()
  @Get('state')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtenir l’état courant de la SecurityMachine' })
  @ApiResponse({ status: 200, type: SecurityResponseDto })
  getState(): SecurityMachineState {
    return this.securityGhostService.getState();
  }
}
