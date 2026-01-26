import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { MetricsService } from '../common/services/metrics.service';
import {
  CreatePatientSchema,
  SearchPatientSchema,
  PatientSchema,
  Patient,
} from '@basevitale/shared';
import { z } from 'zod';
import * as crypto from 'crypto';
import { getOrSetCache, generateCacheKey } from '../common/utils/cache.helper';
import { withMetrics } from '../common/utils/metrics.util';
import { sha256 } from '../common/utils/crypto.util';

/**
 * IdentityService - Module C+ (Identité/INS)
 * 
 * Version Cabinet - Sprint 1: Fondation Invariante
 * 
 * INVARIANT: Un patient = Un Token unique (INS)
 * - Gère l'identification unique selon les normes INS
 * - Prévention du dédoublonnage
 * - Sécurité par Construction
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Créer un hash INS pour le dédoublonnage
   * Utilise SHA-256 pour créer un hash unique à partir du token INS
   */
  private createINSHash(insToken: string): string {
    return sha256(insToken);
  }

  /**
   * Créer un nouveau patient
   * 
   * Vérifie d'abord qu'aucun patient avec le même INS n'existe déjà
   * (dédoublonnage strict)
   * 
   * @param createPatientData - Données du patient à créer
   * @param createdBy - ID de l'utilisateur qui crée le patient
   * @returns Patient créé
   */
  async createPatient(
    createPatientData: z.infer<typeof CreatePatientSchema>,
    createdBy: string,
  ): Promise<Patient> {
    // Validation avec Zod
    const validatedData = CreatePatientSchema.parse(createPatientData);

    // Créer le hash INS
    const insHash = this.createINSHash(validatedData.insToken);

    // Vérifier qu'aucun patient avec ce token INS n'existe déjà
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { insToken: validatedData.insToken },
          { insHash },
        ],
      },
    });

    if (existingPatient) {
      this.logger.warn(
        `Attempt to create duplicate patient with INS token: ${validatedData.insToken}`,
      );
      throw new ConflictException(
        'Un patient avec ce token INS existe déjà. Utilisez la recherche pour le trouver.',
      );
    }

    // Créer le patient
    try {
      const patient = await this.prisma.patient.create({
        data: {
          insToken: validatedData.insToken,
          insHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          birthDate: validatedData.birthDate,
          birthPlace: validatedData.birthPlace,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          addressLine1: validatedData.address?.addressLine1 || null,
          addressLine2: validatedData.address?.addressLine2 || null,
          city: validatedData.address?.city || null,
          postalCode: validatedData.address?.postalCode || null,
          country: validatedData.address?.country || 'FR',
          createdBy,
        },
      });

      this.logger.log(`Patient created: ${patient.id} (INS: ${patient.insToken})`);

      // Enregistrer métriques
      this.metricsService.incrementCounter('patients.created');

      // Invalider le cache des recherches
      this.cacheService.delete(generateCacheKey('patients', 'search'));

      // Convertir en type Patient (avec validation Zod)
      // Convertir les dates et retourner
      const patientResult = {
        ...patient,
        birthDate: patient.birthDate,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        address: {
          addressLine1: patient.addressLine1 || undefined,
          addressLine2: patient.addressLine2 || undefined,
          city: patient.city || undefined,
          postalCode: patient.postalCode || undefined,
          country: patient.country,
        },
      } as Patient;

      // Mettre en cache le patient créé
      this.cacheService.set(
        generateCacheKey('patient', patient.id),
        patientResult,
        3600 * 1000, // 1 heure
      );

      return patientResult;
    } catch (error) {
      this.logger.error('Error creating patient', error);
      this.metricsService.incrementCounter('patients.created.errors');
      throw error;
    }
  }

  /**
   * Rechercher un patient par token INS
   * 
   * @param insToken - Token INS du patient
   * @returns Patient trouvé ou null
   */
  async findPatientByINS(insToken: string): Promise<Patient | null> {
    return withMetrics(
      this.metricsService,
      'identity.findPatientByINS',
      async () => {
        const cacheKey = generateCacheKey('patient', 'by-ins', insToken);

        return getOrSetCache(
          this.cacheService,
          cacheKey,
          async () => {
            const patient = await this.prisma.patient.findUnique({
              where: { insToken },
            });

            if (!patient) {
              return null;
            }

            // Convertir au format Patient
            return {
              ...patient,
              address: {
                addressLine1: patient.addressLine1 || undefined,
                addressLine2: patient.addressLine2 || undefined,
                city: patient.city || undefined,
                postalCode: patient.postalCode || undefined,
                country: patient.country,
              },
            } as Patient;
          },
          1800 * 1000, // 30 minutes
        );
      },
    );
  }

  /**
   * Rechercher des patients selon plusieurs critères
   * 
   * @param searchCriteria - Critères de recherche
   * @returns Liste des patients correspondants
   */
  async searchPatients(
    searchCriteria: z.infer<typeof SearchPatientSchema>,
    skip: number = 0,
    take: number = 50,
  ): Promise<Patient[]> {
    // Validation
    const validatedCriteria = SearchPatientSchema.parse(searchCriteria);

    // Construire la requête
    const where: any = {};

    if (validatedCriteria.firstName) {
      where.firstName = { contains: validatedCriteria.firstName, mode: 'insensitive' };
    }

    if (validatedCriteria.lastName) {
      where.lastName = { contains: validatedCriteria.lastName, mode: 'insensitive' };
    }

    if (validatedCriteria.birthDate) {
      where.birthDate = validatedCriteria.birthDate;
    }

    if (validatedCriteria.insToken) {
      where.insToken = validatedCriteria.insToken;
    }

    const patients = await this.prisma.patient.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((p) => ({
      ...p,
      address: {
        addressLine1: p.addressLine1 || undefined,
        addressLine2: p.addressLine2 || undefined,
        city: p.city || undefined,
        postalCode: p.postalCode || undefined,
        country: p.country,
      },
    })) as Patient[];
  }

  /**
   * Obtenir un patient par ID
   * 
   * @param id - ID du patient
   * @returns Patient trouvé
   * @throws NotFoundException si le patient n'existe pas
   */
  async getPatientById(id: string): Promise<Patient> {
    return withMetrics(
      this.metricsService,
      'identity.getPatientById',
      async () => {
        const cacheKey = generateCacheKey('patient', id);

        return getOrSetCache(
          this.cacheService,
          cacheKey,
          async () => {
            // Optimisation : select spécifique pour éviter de charger des relations lourdes
            const patient = await this.prisma.patient.findUnique({
              where: { id },
              select: {
                id: true,
                insToken: true,
                insHash: true,
                firstName: true,
                lastName: true,
                birthDate: true,
                birthPlace: true,
                email: true,
                phone: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                postalCode: true,
                country: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
              },
            });

            if (!patient) {
              this.metricsService.incrementCounter('patients.getById.notFound');
              throw new NotFoundException(`Patient with ID ${id} not found`);
            }

            // Convertir au format Patient
            return {
              ...patient,
              address: {
                addressLine1: patient.addressLine1 || undefined,
                addressLine2: patient.addressLine2 || undefined,
                city: patient.city || undefined,
                postalCode: patient.postalCode || undefined,
                country: patient.country,
              },
            } as Patient;
          },
          3600 * 1000, // 1 heure
        );
      },
    );
  }
}
