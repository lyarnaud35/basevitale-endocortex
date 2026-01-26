import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * DPIService
 * 
 * Service pour le Dossier Patient Informatisé (DPI)
 * Centralise toutes les informations médicales du patient
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class DPIService {
  private readonly logger = new Logger(DPIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Obtenir le DPI complet d'un patient
   * Toutes les informations centralisées : ordonnances, comptes rendus, résultats
   */
  async getPatientDPI(patientId: string) {
    return withMetrics(
      this.metricsService,
      'dpi.getPatientDPI',
      async () => {
        const patient = await this.prisma.patient.findUnique({
          where: { id: patientId },
          include: {
            medicalDocuments: {
              orderBy: { documentDate: 'desc' },
              include: {
                attachments: true,
              },
            },
            prescriptions: {
              orderBy: { createdAt: 'desc' },
            },
            medicalReports: {
              orderBy: { reportDate: 'desc' },
            },
            laboratoryResults: {
              orderBy: { testDate: 'desc' },
            },
            medicalImages: {
              orderBy: { acquisitionDate: 'desc' },
            },
            consultations: {
              orderBy: { consultationDate: 'desc' },
              take: 50, // Dernières 50 consultations
            },
          },
        });

        if (!patient) {
          throw new NotFoundException(`Patient ${patientId} not found`);
        }

        return {
          patient: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            insToken: patient.insToken,
          },
          dpi: {
            documents: patient.medicalDocuments,
            prescriptions: patient.prescriptions,
            reports: patient.medicalReports,
            laboratoryResults: patient.laboratoryResults,
            medicalImages: patient.medicalImages,
            consultations: patient.consultations.map((c) => ({
              id: c.id,
              date: c.consultationDate,
              status: c.status,
            })),
          },
          summary: {
            totalDocuments: patient.medicalDocuments.length,
            totalPrescriptions: patient.prescriptions.length,
            totalReports: patient.medicalReports.length,
            totalLabResults: patient.laboratoryResults.length,
            totalImages: patient.medicalImages.length,
            totalConsultations: patient.consultations.length,
          },
        };
      },
    );
  }

  /**
   * Rechercher dans le DPI
   * Recherche intelligente dans tous les documents
   */
  async searchDPI(patientId: string, query: string) {
    return withMetrics(
      this.metricsService,
      'dpi.searchDPI',
      async () => {
        // Recherche dans les documents
        const documents = await this.prisma.medicalDocument.findMany({
          where: {
            patientId,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { rawContent: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: { documentDate: 'desc' },
          take: 50,
        });

        // Recherche dans les comptes rendus
        const reports = await this.prisma.medicalReport.findMany({
          where: {
            patientId,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { chiefComplaint: { contains: query, mode: 'insensitive' } },
              { history: { contains: query, mode: 'insensitive' } },
              { assessment: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: { reportDate: 'desc' },
          take: 50,
        });

        return {
          documents,
          reports,
          totalResults: documents.length + reports.length,
        };
      },
    );
  }

  /**
   * Créer un document médical dans le DPI
   */
  async createMedicalDocument(data: {
    patientId: string;
    documentType: string;
    title: string;
    content: any;
    rawContent?: string;
    documentDate: Date;
    consultationId?: string;
    createdBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'dpi.createMedicalDocument',
      async () => {
        const document = await this.prisma.medicalDocument.create({
          data: {
            patientId: data.patientId,
            documentType: data.documentType,
            title: data.title,
            content: data.content,
            rawContent: data.rawContent,
            documentDate: data.documentDate,
            consultationId: data.consultationId,
            createdBy: data.createdBy,
          },
          include: {
            attachments: true,
          },
        });

        this.logger.log(
          `Created medical document ${document.id} for patient ${data.patientId}`,
        );

        this.metricsService.incrementCounter('dpi.documents.created');
        return document;
      },
    );
  }

  /**
   * Créer un compte rendu médical
   */
  async createMedicalReport(data: {
    patientId: string;
    reportType: string;
    title: string;
    chiefComplaint?: string;
    history?: string;
    examination?: string;
    assessment?: string;
    plan?: string;
    reportDate: Date;
    consultationId?: string;
    createdBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'dpi.createMedicalReport',
      async () => {
        // Créer le document DPI associé
        const document = await this.createMedicalDocument({
          patientId: data.patientId,
          documentType: 'COMPTE_RENDU',
          title: data.title,
          content: {
            reportType: data.reportType,
            chiefComplaint: data.chiefComplaint,
            history: data.history,
            examination: data.examination,
            assessment: data.assessment,
            plan: data.plan,
          },
          rawContent: [
            data.chiefComplaint,
            data.history,
            data.examination,
            data.assessment,
            data.plan,
          ]
            .filter(Boolean)
            .join('\n\n'),
          documentDate: data.reportDate,
          consultationId: data.consultationId,
          createdBy: data.createdBy,
        });

        // Créer le compte rendu
        const report = await this.prisma.medicalReport.create({
          data: {
            patientId: data.patientId,
            reportType: data.reportType,
            title: data.title,
            chiefComplaint: data.chiefComplaint,
            history: data.history,
            examination: data.examination,
            assessment: data.assessment,
            plan: data.plan,
            reportDate: data.reportDate,
            consultationId: data.consultationId,
            documentId: document.id,
            createdBy: data.createdBy,
          },
        });

        this.logger.log(
          `Created medical report ${report.id} for patient ${data.patientId}`,
        );

        this.metricsService.incrementCounter('dpi.reports.created');
        return report;
      },
    );
  }
}
