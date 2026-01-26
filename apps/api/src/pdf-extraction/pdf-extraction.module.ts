import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GpuLockModule } from '../common/services/gpu-lock.module';
import { PDFExtractionService } from './pdf-extraction.service';
import { PDFExtractionController } from './pdf-extraction.controller';
import { MetricsService } from '../common/services/metrics.service';

/**
 * PDFExtractionModule
 *
 * Module pour l'extraction de PDFs (Python sidecar).
 * Utilise GpuLock pour réguler les appels IA en mode LOCAL.
 */
@Module({
  imports: [HttpModule, GpuLockModule],
  controllers: [PDFExtractionController],
  providers: [PDFExtractionService, MetricsService],
  exports: [PDFExtractionService],
})
export class PDFExtractionModule {}
