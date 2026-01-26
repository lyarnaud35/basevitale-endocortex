import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from '../common/services/health.service';

/**
 * HealthController
 * 
 * Endpoints de health check pour monitoring
 * 
 * Routes publiques (pas d'authentification requise)
 */
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health check simple
   * GET /api/health
   */
  @Get()
  async health() {
    const health = await this.healthService.checkHealth();
    return {
      success: true,
      data: health,
    };
  }

  /**
   * Health check avec vérification base de données
   * GET /api/health/db
   */
  @Get('db')
  async healthDb() {
    const dbHealth = await this.healthService.checkDatabase();
    return {
      success: true,
      data: dbHealth,
    };
  }

  /**
   * Health check complet
   * GET /api/health/all
   */
  @Get('all')
  async healthAll() {
    const allHealth = await this.healthService.checkAll();
    const statusCode = allHealth.overall === 'ok' ? 200 : 503;
    
    return {
      success: allHealth.overall === 'ok',
      data: allHealth,
      statusCode,
    };
  }
}
