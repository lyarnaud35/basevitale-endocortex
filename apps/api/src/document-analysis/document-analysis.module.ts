import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentAnalysisController } from './document-analysis.controller';
import { MetricsService } from '../common/services/metrics.service';
import { PDFExtractionModule } from '../pdf-extraction/pdf-extraction.module';
import { ScribeModule } from '../scribe/scribe.module';

/**
 * DocumentAnalysisModule
 * 
 * Module pour l'analyse de documents PDF (notamment ECOSYSTEME BASEVITALE.pdf)
 * Version BaseVitale Révolutionnaire
 */
@Module({
  imports: [HttpModule, PDFExtractionModule, ScribeModule],
  controllers: [DocumentAnalysisController],
  providers: [DocumentAnalysisService, MetricsService],
  exports: [DocumentAnalysisService],
})
export class DocumentAnalysisModule {}
