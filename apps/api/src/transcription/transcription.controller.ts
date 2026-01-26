import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranscriptionService } from './transcription.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';

/**
 * TranscriptionController
 * 
 * Endpoints pour la transcription audio
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('transcription')
@UseGuards(AuthGuard, RoleGuard)
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  /**
   * Transcrire un fichier audio
   * POST /transcription/audio
   */
  @Post('audio')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeAudio(
    @CurrentUserId() userId: string,
    @UploadedFile() file: any,
    @Body('language') language?: string,
  ) {
    if (!file) {
      throw new Error('Audio file is required');
    }

    const result = await this.transcriptionService.transcribeAudio(
      file.buffer,
      file.originalname,
      language,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Transcription streaming (temps réel)
   * POST /transcription/stream
   */
  @Post('stream')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async transcribeStream(
    @Body() body: { audio: string; sessionId: string }, // base64 audio
    @CurrentUserId() userId: string,
  ) {
    const audioBuffer = Buffer.from(body.audio, 'base64');

    const result = await this.transcriptionService.transcribeStream(
      audioBuffer,
      body.sessionId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
