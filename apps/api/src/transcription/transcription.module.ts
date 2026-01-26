import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GpuLockModule } from '../common/services/gpu-lock.module';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { MetricsService } from '../common/services/metrics.service';

/**
 * TranscriptionModule
 *
 * Module pour la transcription audio (Whisper via Python).
 * Utilise GpuLock pour réguler les appels IA en mode LOCAL.
 */
@Module({
  imports: [HttpModule, GpuLockModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService, MetricsService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
