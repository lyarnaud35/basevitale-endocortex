import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';
import { WebSocketsGateway } from '../websockets/websockets.gateway';

/**
 * LISService
 * 
 * Service pour le Laboratory Information System (LIS)
 * Réception automatique des résultats de laboratoire
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class LISService {
  private readonly logger = new Logger(LISService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly websocketsGateway: WebSocketsGateway,
  ) {}

  /**
   * Réceptionner un résultat de laboratoire
   * Peut provenir d'un laboratoire externe via ESB
   */
  async receiveLaboratoryResult(data: {
    patientId: string;
    testName: string;
    testCode?: string; // Code LOINC
    resultValue: string;
    unit?: string;
    referenceRange?: string;
    status: 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'PENDING';
    testDate: Date;
    laboratoryName?: string;
    documentId?: string;
  }) {
    return withMetrics(
      this.metricsService,
      'lis.receiveLaboratoryResult',
      async () => {
        // Vérifier que le patient existe
        const patient = await this.prisma.patient.findUnique({
          where: { id: data.patientId },
        });

        if (!patient) {
          throw new BadRequestException(`Patient ${data.patientId} not found`);
        }

        // Créer le résultat de laboratoire
        const result = await this.prisma.laboratoryResult.create({
          data: {
            patientId: data.patientId,
            testName: data.testName,
            testCode: data.testCode,
            resultValue: data.resultValue,
            unit: data.unit,
            referenceRange: data.referenceRange,
            status: data.status,
            testDate: data.testDate,
            laboratoryName: data.laboratoryName,
            documentId: data.documentId,
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Créer document DPI si pas déjà lié
        if (!data.documentId) {
          const { DPIService } = await import('../dpi/dpi.service');
          // Note: Pour éviter dépendance circulaire, on crée directement le document
          await this.prisma.medicalDocument.create({
            data: {
              patientId: data.patientId,
              documentType: 'RESULTAT_LABO',
              title: `Résultat: ${data.testName}`,
              content: {
                testName: data.testName,
                resultValue: data.resultValue,
                unit: data.unit,
                status: data.status,
              },
              rawContent: `Test: ${data.testName}\nRésultat: ${data.resultValue} ${data.unit || ''}\nStatut: ${data.status}`,
              documentDate: data.testDate,
              createdBy: 'system',
            },
          });
        }

        // Notifier si résultat critique
        if (data.status === 'CRITICAL') {
          this.websocketsGateway.broadcastAlert({
            type: 'CRITICAL',
            message: `Résultat critique pour ${patient.firstName} ${patient.lastName}: ${data.testName} = ${data.resultValue}`,
            patientId: data.patientId,
            metadata: {
              resultId: result.id,
              testName: data.testName,
            },
          });

          this.logger.warn(
            `CRITICAL laboratory result received: ${data.testName} = ${data.resultValue} for patient ${data.patientId}`,
          );
        }

        this.logger.log(
          `Laboratory result received: ${data.testName} for patient ${data.patientId}`,
        );
        this.metricsService.incrementCounter('lis.results.received');
        
        if (data.status === 'CRITICAL') {
          this.metricsService.incrementCounter('lis.results.critical');
        }

        return result;
      },
    );
  }

  /**
   * Recevoir un batch de résultats (format HL7/FHIR)
   */
  async receiveBatchResults(results: Array<{
    patientId: string;
    testName: string;
    testCode?: string;
    resultValue: string;
    unit?: string;
    status: string;
    testDate: Date;
  }>) {
    return withMetrics(
      this.metricsService,
      'lis.receiveBatchResults',
      async () => {
        const created = await Promise.all(
          results.map((result) =>
            this.receiveLaboratoryResult({
              ...result,
              status: result.status as 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'PENDING',
            }),
          ),
        );

        this.logger.log(`Received batch of ${created.length} laboratory results`);
        return created;
      },
    );
  }

  /**
   * Obtenir les résultats d'un patient
   */
  async getPatientResults(
    patientId: string,
    options?: {
      testDateFrom?: Date;
      testDateTo?: Date;
      status?: string;
    },
  ) {
    const where: any = { patientId };

    if (options?.testDateFrom || options?.testDateTo) {
      where.testDate = {};
      if (options.testDateFrom) where.testDate.gte = options.testDateFrom;
      if (options.testDateTo) where.testDate.lte = options.testDateTo;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const results = await this.prisma.laboratoryResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
    });

    return results;
  }
}
