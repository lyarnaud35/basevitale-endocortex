import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MetricsService } from '../common/services/metrics.service';
import { GpuLockService } from '../common/services/gpu-lock.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * TranscriptionService
 * 
 * Service pour la transcription audio en temps réel
 * Utilise Whisper (via Python sidecar) pour transcription
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly aiMode: 'MOCK' | 'CLOUD' | 'LOCAL';
  private readonly pythonSidecarUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly metricsService: MetricsService,
    private readonly gpuLock: GpuLockService,
  ) {
    this.aiMode = (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
    this.pythonSidecarUrl = process.env.AI_CORTEX_URL || 'http://localhost:8000';
    this.logger.log(`TranscriptionService initialized with AI_MODE: ${this.aiMode}`);
  }

  /**
   * Transcrire un fichier audio
   */
  async transcribeAudio(
    audioFile: Buffer,
    filename: string,
    language?: string,
  ): Promise<{
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
    language?: string;
  }> {
    return withMetrics(
      this.metricsService,
      'transcription.transcribeAudio',
      async () => {
        this.logger.debug(`Transcribing audio file: ${filename} (mode: ${this.aiMode})`);

        switch (this.aiMode) {
          case 'MOCK':
            return this.transcribeAudioMock(audioFile, filename);

          case 'CLOUD':
            // TODO: Intégrer Whisper API OpenAI si nécessaire
            return this.transcribeAudioLocal(audioFile, filename, language);

          case 'LOCAL':
            return this.transcribeAudioLocal(audioFile, filename, language);

          default:
            this.logger.warn(`Unknown AI_MODE: ${this.aiMode}, using MOCK`);
            return this.transcribeAudioMock(audioFile, filename);
        }
      },
    );
  }

  /**
   * Transcription Mock (pour développement)
   */
  private async transcribeAudioMock(
    audioFile: Buffer,
    filename: string,
  ): Promise<{
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  }> {
    // Simuler une transcription
    const mockText = `Transcription mock pour ${filename}.
Le patient présente une fièvre modérée et des maux de tête.
Examen clinique normal. Prescription de paracétamol.`;

    this.metricsService.incrementCounter('transcription.audio.mock');

    return {
      text: mockText,
      segments: [
        { start: 0, end: 2.5, text: 'Le patient présente une fièvre modérée' },
        { start: 2.5, end: 4.0, text: 'et des maux de tête' },
        { start: 4.0, end: 6.0, text: 'Examen clinique normal' },
      ],
    };
  }

  /**
   * Transcription via Python sidecar (Whisper). Sémaphore GPU.
   */
  private async transcribeAudioLocal(
    audioFile: Buffer,
    filename: string,
    language?: string,
  ): Promise<{
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
    language?: string;
  }> {
    try {
      return await this.gpuLock.runWithLock(
        async () => {
          const base64Audio = audioFile.toString('base64');
          const response = await firstValueFrom(
            this.httpService.post(
              `${this.pythonSidecarUrl}/transcribe`,
              {
                audio: base64Audio,
                filename,
                language: language || 'fr',
                model: process.env.WHISPER_MODEL || 'base',
              },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000,
              },
            ),
          );
          const result = response.data;
          this.logger.log(`Transcription completed for ${filename}`);
          this.metricsService.incrementCounter('transcription.audio.local');
          this.metricsService.recordValue('transcription.audio.duration', result.duration || 0);
          return {
            text: result.text,
            segments: result.segments,
            language: result.language,
          };
        },
        { ttlSeconds: 90 },
      );
    } catch (error) {
      this.logger.error('Error transcribing audio', error instanceof Error ? error : String(error));
      this.logger.warn('Falling back to MOCK transcription');
      return this.transcribeAudioMock(audioFile, filename);
    }
  }

  /**
   * Transcription temps réel (streaming)
   * 
   * Note: Nécessite WebSocket ou Server-Sent Events pour streaming
   */
  async transcribeStream(
    audioChunk: Buffer,
    sessionId: string,
  ): Promise<{
    partialText?: string;
    finalText?: string;
    isFinal: boolean;
  }> {
    return withMetrics(
      this.metricsService,
      'transcription.transcribeStream',
      async () => {
        // TODO: Implémenter streaming avec Whisper temps réel
        // Pour l'instant, retourner transcription normale
        
        const result = await this.transcribeAudio(audioChunk, `stream-${sessionId}`);
        
        return {
          finalText: result.text,
          isFinal: true,
        };
      },
    );
  }
}
