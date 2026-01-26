import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../prisma/client';

/**
 * PrismaService
 * 
 * Service global pour accéder à Prisma Client
 * Gère la connexion et la déconnexion automatique
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Construire DATABASE_URL à partir des variables d'environnement ou utiliser la valeur par défaut
    const databaseUrl = 
      process.env.DATABASE_URL || 
      `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'basevitale'}`;
    
    // Valider que l'URL est définie
    if (!databaseUrl || databaseUrl.includes('undefined')) {
      throw new Error(`DATABASE_URL is invalid: ${databaseUrl}. Please check your .env file.`);
    }
    
    super({
      log: ['error', 'warn'],
      // Optimisation connection pooling
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  /**
   * Obtenir des statistiques de connexion
   */
  async getConnectionStats() {
    // Note: Prisma ne expose pas directement les stats de pool
    // Mais on peut monitorer via les métriques
    return {
      connected: true,
      timestamp: new Date().toISOString(),
    };
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Prisma Client', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected');
  }
}
