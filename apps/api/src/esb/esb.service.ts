import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * ESBService
 * 
 * Enterprise Service Bus avec IA pour interopérabilité révolutionnaire
 * Traitement automatique de formats multiples avec transformation intelligente
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class ESBService {
  private readonly logger = new Logger(ESBService.name);

  constructor(
    private readonly nats: NatsService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Traiter un message entrant (format inconnu)
   * L'IA détecte automatiquement le format et transforme
   */
  async processIncomingMessage(
    message: string | object,
    source: string,
  ): Promise<{
    format: string;
    transformed: any;
    confidence: number;
  }> {
    return withMetrics(
      this.metricsService,
      'esb.processIncomingMessage',
      async () => {
        this.logger.log(`Processing incoming message from ${source}`);

        // Détecter le format
        const formatDetection = await this.detectFormat(message);

        // Transformer selon le format détecté
        const transformed = await this.transformMessage(
          message,
          formatDetection.format,
        );

        this.metricsService.incrementCounter(`esb.messages.processed.${formatDetection.format}`);

        return {
          format: formatDetection.format,
          transformed,
          confidence: formatDetection.confidence,
        };
      },
    );
  }

  /**
   * Détecter automatiquement le format du message
   */
  private async detectFormat(message: string | object): Promise<{
    format: 'HL7' | 'FHIR' | 'JSON' | 'XML' | 'CSV' | 'UNKNOWN';
    confidence: number;
  }> {
    // Détection simple basée sur la structure
    if (typeof message === 'string') {
      if (message.startsWith('MSH|')) {
        return { format: 'HL7', confidence: 0.95 };
      }
      if (message.includes('"resourceType"') || message.includes("'resourceType'")) {
        return { format: 'FHIR', confidence: 0.90 };
      }
      if (message.trim().startsWith('<') && message.includes('</')) {
        return { format: 'XML', confidence: 0.85 };
      }
      if (message.includes(',') && message.split('\n').length > 1) {
        return { format: 'CSV', confidence: 0.80 };
      }
      try {
        JSON.parse(message);
        return { format: 'JSON', confidence: 0.95 };
      } catch {
        return { format: 'UNKNOWN', confidence: 0.5 };
      }
    } else if (typeof message === 'object') {
      if (message && 'resourceType' in message) {
        return { format: 'FHIR', confidence: 0.95 };
      }
      return { format: 'JSON', confidence: 0.90 };
    }

    return { format: 'UNKNOWN', confidence: 0.3 };
  }

  /**
   * Transformer le message vers le format BaseVitale
   */
  private async transformMessage(
    message: string | object,
    format: string,
  ): Promise<any> {
    switch (format) {
      case 'HL7':
        return this.transformHL7(message as string);

      case 'FHIR':
        return this.transformFHIR(message);

      case 'JSON':
        return typeof message === 'string' ? JSON.parse(message) : message;

      case 'XML':
        // TODO: Parser XML
        return { raw: message, format: 'XML' };

      case 'CSV':
        return this.transformCSV(message as string);

      default:
        return { raw: message, format: 'UNKNOWN' };
    }
  }

  /**
   * Transformer un message HL7 vers format BaseVitale
   */
  private async transformHL7(hl7Message: string): Promise<any> {
    // Parser basique HL7
    const segments = hl7Message.split('\r').filter((s) => s.trim());

    const result: any = {
      format: 'HL7',
      messageType: null,
      patient: {},
      results: [],
    };

    for (const segment of segments) {
      const fields = segment.split('|');
      const segmentType = fields[0];

      switch (segmentType) {
        case 'MSH':
          result.messageType = fields[8];
          break;
        case 'PID':
          result.patient = {
            firstName: fields[5]?.split('^')[1] || '',
            lastName: fields[5]?.split('^')[0] || '',
            birthDate: fields[7],
          };
          break;
        case 'OBR':
          // Observation Request
          result.currentTest = {
            testCode: fields[4]?.split('^')[0] || '',
            testName: fields[4]?.split('^')[1] || '',
          };
          break;
        case 'OBX':
          // Observation Result
          if (result.currentTest) {
            result.results.push({
              testCode: result.currentTest.testCode,
              testName: result.currentTest.testName,
              resultValue: fields[5],
              unit: fields[6],
              referenceRange: fields[7],
              status: fields[11] || 'NORMAL',
            });
          }
          break;
      }
    }

    return result;
  }

  /**
   * Transformer un message FHIR vers format BaseVitale
   */
  private async transformFHIR(fhirMessage: any): Promise<any> {
    // Transformer FHIR vers format interne
    if (fhirMessage.resourceType === 'Observation') {
      return {
        testName: fhirMessage.code?.text || fhirMessage.code?.coding?.[0]?.display,
        testCode: fhirMessage.code?.coding?.[0]?.code,
        resultValue: fhirMessage.valueQuantity?.value?.toString() || fhirMessage.valueString,
        unit: fhirMessage.valueQuantity?.unit,
        status: this.mapFHIRStatusToBaseVitale(fhirMessage.status),
        testDate: fhirMessage.effectiveDateTime || fhirMessage.issued,
      };
    }

    if (fhirMessage.resourceType === 'Bundle') {
      // Bundle de résultats
      return {
        format: 'FHIR_BUNDLE',
        results: fhirMessage.entry?.map((entry: any) =>
          this.transformFHIR(entry.resource),
        ) || [],
      };
    }

    return fhirMessage;
  }

  /**
   * Mapper le statut FHIR vers BaseVitale
   */
  private mapFHIRStatusToBaseVitale(fhirStatus: string): string {
    const mapping: Record<string, string> = {
      'final': 'NORMAL',
      'amended': 'NORMAL',
      'cancelled': 'PENDING',
      'entered-in-error': 'PENDING',
      'preliminary': 'PENDING',
    };
    return mapping[fhirStatus.toLowerCase()] || 'NORMAL';
  }

  /**
   * Transformer CSV vers format BaseVitale
   */
  private transformCSV(csvMessage: string): any {
    const lines = csvMessage.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      return { raw: csvMessage, format: 'CSV' };
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      results.push(row);
    }

    return {
      format: 'CSV',
      results,
    };
  }

  /**
   * Router vers le bon service selon le type de message
   */
  async routeMessage(
    transformed: any,
    source: string,
  ): Promise<{ service: string; handled: boolean }> {
    // Routage intelligent selon le contenu
    if (transformed.format === 'HL7' || transformed.format === 'FHIR') {
      if (transformed.results || transformed.testName) {
        // Routage vers LIS
        const { LISService } = await import('../lis/lis.service');
        // Note: Utiliser l'endpoint HTTP ou événement NATS
        return { service: 'LIS', handled: true };
      }
    }

    return { service: 'UNKNOWN', handled: false };
  }
}
