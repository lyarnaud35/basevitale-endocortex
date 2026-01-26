import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MetricsService } from '../common/services/metrics.service';
import { GpuLockService } from '../common/services/gpu-lock.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * PDFExtractionService
 * 
 * Service pour l'extraction de texte et métadonnées depuis des PDFs médicaux
 * Intégré avec le Python sidecar pour extraction avancée
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class PDFExtractionService {
  private readonly logger = new Logger(PDFExtractionService.name);
  private readonly aiMode: 'MOCK' | 'CLOUD' | 'LOCAL';
  private readonly pythonSidecarUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly metricsService: MetricsService,
    private readonly gpuLock: GpuLockService,
  ) {
    this.aiMode = (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
    this.pythonSidecarUrl = process.env.AI_CORTEX_URL || 'http://localhost:8000';
    this.logger.log(`PDFExtractionService initialized with AI_MODE: ${this.aiMode}`);
  }

  /**
   * Extraire le texte et métadonnées d'un PDF
   */
  async extractPDF(
    pdfBuffer: Buffer,
    filename?: string,
    options?: {
      extractTables?: boolean;
      extractImages?: boolean;
    },
  ): Promise<{
    text: string;
    pages: Array<{
      page_number: number;
      text: string;
      char_count: number;
      tables_count?: number;
    }>;
    metadata: {
      filename?: string;
      total_pages: number;
      text_length: number;
      tables_count?: number;
      extraction_date?: string;
      [key: string]: any;
    };
    tables?: Array<{
      page: number;
      table_index: number;
      rows: any[][];
      row_count: number;
      col_count: number;
    }>;
    imagesCount: number;
  }> {
    return withMetrics(
      this.metricsService,
      'pdf_extraction.extract',
      async () => {
        this.logger.debug(`Extracting PDF: ${filename} (mode: ${this.aiMode})`);

        switch (this.aiMode) {
          case 'MOCK':
            return this.extractPDFMock(pdfBuffer, filename);

          case 'CLOUD':
            // Pour l'instant, utiliser LOCAL même en mode CLOUD pour PDF
            return this.extractPDFLocal(pdfBuffer, filename, options);

          case 'LOCAL':
            return this.extractPDFLocal(pdfBuffer, filename, options);

          default:
            this.logger.warn(`Unknown AI_MODE: ${this.aiMode}, using MOCK`);
            return this.extractPDFMock(pdfBuffer, filename);
        }
      },
    );
  }

  /**
   * Extraction Mock (pour développement)
   */
  private async extractPDFMock(
    pdfBuffer: Buffer,
    filename?: string,
  ): Promise<{
    text: string;
    pages: Array<{
      page_number: number;
      text: string;
      char_count: number;
    }>;
    metadata: {
      filename?: string;
      total_pages: number;
      text_length: number;
      extraction_date: string;
    };
    imagesCount: number;
  }> {
    const mockText = `Document PDF: ${filename || 'unknown.pdf'}
    
Rapport médical extrait (simulation)
Date: ${new Date().toISOString()}
Patient: [Nom du patient]
Diagnostic: [Diagnostic principal]
Observations: Le patient présente des symptômes compatibles avec...

Page 1: Informations générales
Page 2: Résultats d'examens
Page 3: Prescriptions et recommandations`;

    this.metricsService.incrementCounter('pdf_extraction.extract.mock');

    return {
      text: mockText,
      pages: [
        {
          page_number: 1,
          text: mockText.split('\n').slice(0, 5).join('\n'),
          char_count: 200,
        },
      ],
      metadata: {
        filename: filename || 'unknown.pdf',
        total_pages: 1,
        text_length: mockText.length,
        extraction_date: new Date().toISOString(),
      },
      imagesCount: 0,
    };
  }

  /**
   * Extraction via Python sidecar. Sémaphore GPU.
   */
  private async extractPDFLocal(
    pdfBuffer: Buffer,
    filename?: string,
    options?: {
      extractTables?: boolean;
      extractImages?: boolean;
    },
  ): Promise<{
    text: string;
    pages: Array<{
      page_number: number;
      text: string;
      char_count: number;
      tables_count?: number;
    }>;
    metadata: any;
    tables?: Array<{
      page: number;
      table_index: number;
      rows: any[][];
      row_count: number;
      col_count: number;
    }>;
    imagesCount: number;
  }> {
    try {
      return await this.gpuLock.runWithLock(
        async () => {
          const base64Pdf = pdfBuffer.toString('base64');
          const response = await firstValueFrom(
            this.httpService.post(
              `${this.pythonSidecarUrl}/extract-pdf/extract`,
              {
                pdf_base64: base64Pdf,
                filename: filename || 'document.pdf',
                extract_tables: options?.extractTables ?? true,
                extract_images: options?.extractImages ?? false,
              },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000,
              },
            ),
          );
          const result = response.data;
          this.logger.log(`PDF extraction completed for ${filename}`);
          this.metricsService.incrementCounter('pdf_extraction.extract.local');
          this.metricsService.recordValue(
            'pdf_extraction.extract.pages_count',
            result.metadata?.pages_count || result.pages?.length || 0,
          );
          this.metricsService.recordValue(
            'pdf_extraction.extract.text_length',
            result.text?.length || 0,
          );
          return {
            text: result.text || '',
            pages: result.pages || [],
            metadata: result.metadata || {},
            tables: result.tables || undefined,
            imagesCount: result.images_count || 0,
          };
        },
        { ttlSeconds: 150 },
      );
    } catch (error: unknown) {
      this.logger.error('Error extracting PDF', error instanceof Error ? error : String(error));
      this.logger.warn('Falling back to MOCK PDF extraction');
      return this.extractPDFMock(pdfBuffer, filename);
    }
  }

  /**
   * Extraire uniquement le texte (méthode simplifiée)
   */
  async extractTextOnly(pdfBuffer: Buffer, filename?: string): Promise<string> {
    const result = await this.extractPDF(pdfBuffer, filename, {
      extractTables: false,
      extractImages: false,
    });
    return result.text;
  }
}
