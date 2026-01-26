import { Injectable, Logger } from '@nestjs/common';
// Prisma namespace via client généré
// eslint-disable-next-line @typescript-eslint/no-namespace
import type { Prisma } from '../../prisma/client';

/**
 * QueryOptimizerService
 * 
 * Service pour optimiser les requêtes Prisma
 * - Select spécifiques pour éviter N+1 queries
 * - Pagination optimisée
 * - Cache des requêtes fréquentes
 * 
 * Version BaseVitale Optimisée
 */
@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);

  /**
   * Créer un select optimisé pour les patients (sans relations lourdes)
   */
  createPatientSelect(): Prisma.PatientSelect {
    return {
      id: true,
      insToken: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      email: true,
      phone: true,
      city: true,
      createdAt: true,
      updatedAt: true,
      // Ne pas inclure les relations par défaut pour optimiser
    };
  }

  /**
   * Créer un select optimisé pour les consultations
   */
  createConsultationSelect(includePatient: boolean = false): Prisma.ConsultationSelect {
    const select: Prisma.ConsultationSelect = {
      id: true,
      patientId: true,
      consultationDate: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    };

    if (includePatient) {
      select.patient = {
        select: this.createPatientSelect(),
      };
    }

    return select;
  }

  /**
   * Créer une pagination optimisée
   */
  createPaginationParams(page: number = 1, limit: number = 20): {
    skip: number;
    take: number;
  } {
    // Limiter la taille max de page pour éviter les surcharges
    const maxLimit = 100;
    const safeLimit = Math.min(limit, maxLimit);
    const safePage = Math.max(1, page);

    return {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  }

  /**
   * Optimiser une requête avec select spécifique
   */
  optimizeQuery<T>(
    query: any,
    select?: any,
  ): any {
    if (select) {
      query.select = select;
    }

    return query;
  }

  /**
   * Créer un select pour les nœuds sémantiques (sans embedding par défaut)
   */
  createSemanticNodeSelect(includeEmbedding: boolean = false): Prisma.SemanticNodeSelect {
    return {
      id: true,
      nodeType: true,
      label: true,
      description: true,
      cim10Code: true,
      cim11Code: true,
      consultationId: true,
      patientId: true,
      createdAt: true,
      // Embedding exclu par défaut (trop lourd)
      ...(includeEmbedding && { embedding: true }),
    };
  }

  /**
   * Créer un select pour les relations sémantiques
   */
  createSemanticRelationSelect(includeNodes: boolean = false): Prisma.SemanticRelationSelect {
    const select: any = {
      id: true,
      relationType: true,
      strength: true,
      sourceNodeId: true,
      targetNodeId: true,
      createdAt: true,
    };

    if (includeNodes) {
      select.sourceNode = {
        select: this.createSemanticNodeSelect(),
      };
      select.targetNode = {
        select: this.createSemanticNodeSelect(),
      };
    }

    return select;
  }
}
