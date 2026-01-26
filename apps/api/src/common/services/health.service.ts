import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * HealthService
 * 
 * Service pour vérifier la santé de l'application
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifier la santé de l'application
   */
  async checkHealth(): Promise<{
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
  }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  /**
   * Vérifier la santé de la base de données
   */
  async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    message: string;
    latency?: number;
  }> {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        message: 'Database connection successful',
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        message: 'Database connection failed',
      };
    }
  }

  /**
   * Vérifier tous les composants
   */
  async checkAll(): Promise<{
    application: any;
    database: any;
    overall: 'ok' | 'error';
  }> {
    const [application, database] = await Promise.all([
      this.checkHealth(),
      this.checkDatabase(),
    ]);

    const overall =
      application.status === 'ok' && database.status === 'ok' ? 'ok' : 'error';

    return {
      application,
      database,
      overall,
    };
  }
}
