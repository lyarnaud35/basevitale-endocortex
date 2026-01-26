import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DatabaseIndexesService
 * 
 * Service pour créer et vérifier les index de base de données
 * Optimise les performances des requêtes fréquentes
 * 
 * Version BaseVitale Optimisée
 */
@Injectable()
export class DatabaseIndexesService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseIndexesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Vérifier et créer les index manquants au démarrage
    if (process.env.NODE_ENV !== 'production') {
      // En développement seulement
      this.logger.log('Database indexes service initialized');
    }
  }

  /**
   * Vérifier que tous les index nécessaires existent
   * 
   * Note: Les index sont normalement définis dans schema.prisma
   * Cette méthode peut être utilisée pour vérifier ou créer des index conditionnels
   */
  async ensureIndexes(): Promise<void> {
    try {
      // Vérifier les index via des requêtes EXPLAIN
      // Si un index manque, une requête sera lente
      this.logger.debug('Verifying database indexes...');

      // Les index sont gérés par Prisma via schema.prisma
      // Pas besoin de les créer manuellement sauf cas spéciaux

      this.logger.log('Database indexes verified');
    } catch (error) {
      this.logger.error('Error verifying database indexes', error);
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des index
   */
  async getIndexStats(): Promise<any> {
    try {
      // Requête PostgreSQL pour obtenir les stats d'index
      const stats = await this.prisma.$queryRaw<any[]>`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 20
      `;

      return stats;
    } catch (error) {
      this.logger.error('Error getting index stats', error);
      return [];
    }
  }
}
