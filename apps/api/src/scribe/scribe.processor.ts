import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConsultationSchema } from '@basevitale/shared';
import { MetricsService } from '../common/services/metrics.service';
import { GpuLockService } from '../common/services/gpu-lock.service';
import { ConfigService } from '../common/services/config.service';

/**
 * ScribeProcessor
 *
 * Processor Bull pour traiter les consultations de manière asynchrone.
 * Appelle le sidecar Python via Redis Queue.
 * Concurrency 1 + sémaphore GPU : un seul job IA à la fois.
 *
 * Phase C : L'Intelligence Réelle
 * Flux : NestJS -> Redis Queue -> Python -> Redis -> NestJS
 * 
 * Law III: Universal Worker - Utilise /process-generic
 */
@Injectable()
@Processor('scribe-consultation')
export class ScribeProcessor {
  private readonly logger = new Logger(ScribeProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly metricsService: MetricsService,
    private readonly gpuLock: GpuLockService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('ScribeProcessor initialized (concurrency=1, GPU lock)');
  }

  /**
   * Traiter une consultation via Python sidecar.
   * Concurrency 1 : un seul job à la fois (sémaphore naturel Bull).
   * runWithLock : verrou GPU avant appel IA, libération dans finally.
   *
   * @param job - Job Bull contenant { text, patientId, jsonSchema }
   * @returns Données structurées selon ConsultationSchema
   */
  @Process({ name: 'analyze-consultation', concurrency: 1 })
  async handleAnalyzeConsultation(
    job: Job<{
      text: string;
      patientId?: string;
      jsonSchema: any;
      system_prompt?: string;
    }>,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `[Job ${job.id}] Processing consultation (text length: ${job.data.text.length})`,
    );

    // Mettre à jour la progression
    await job.progress(10);

    try {
      const { text, jsonSchema } = job.data;

      const aiServiceUrl = this.configService.aiServiceUrl;
      const endpoint = `${aiServiceUrl}/process-generic`;
      const timeoutMs = this.configService.aiCortexTimeoutMs;
      
      this.logger.debug(`[Job ${job.id}] Calling Python sidecar (GPU lock): ${endpoint}`);
      await job.progress(30);

      const consultation = await this.gpuLock.runWithLock(
        async () => {
          const response = await firstValueFrom(
            this.httpService.post<{ data: any }>(
              endpoint,
              { text, schema: jsonSchema },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: timeoutMs,
              },
            ),
          );
          await job.progress(70);
          const structuredData = response.data?.data;
          if (!structuredData) {
            throw new Error('No structured data in response from Python sidecar');
          }
          this.logger.debug(`[Job ${job.id}] Validating with Zod`);
          return ConsultationSchema.parse(structuredData);
        },
        { ttlSeconds: 120 },
      );

      await job.progress(90);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Job ${job.id}] ✅ Completed in ${duration}ms: ${consultation.symptoms.length} symptoms, ${consultation.diagnosis.length} diagnoses, ` +
          `${consultation.medications.length} medications, ${consultation.billingCodes?.length ?? 0} billingCodes, ${consultation.prescription?.length ?? 0} prescription`,
      );
      this.metricsService.incrementCounter('scribe.job.completed');
      this.metricsService.recordTiming('scribe.job.duration', duration);

      await job.progress(100);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[Job ${job.id}] ❌ Error after ${duration}ms (attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3})`,
        error,
      );

      // Métriques d'erreur
      this.metricsService.incrementCounter('scribe.job.failed');
      
      // Si c'est une erreur de validation Zod, ne pas retry
      if (error instanceof Error && error.name === 'ZodError') {
        this.logger.error(
          `[Job ${job.id}] Zod validation error - marking as failed permanently`,
        );
        this.metricsService.incrementCounter('scribe.job.validation.error');
        throw error; // Ne pas retry les erreurs de validation
      }

      // Pour les autres erreurs, BullMQ retry automatique
      throw error;
    }
  }
}
