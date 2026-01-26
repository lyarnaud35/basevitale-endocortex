import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from '../common/services/metrics.service';
import { Public } from '../common/decorators/public.decorator';
import { RoleGuard, Role } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * MetricsController
 * 
 * Expose les métriques de l'application
 * 
 * Endpoints protégés (admin seulement)
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Obtenir toutes les métriques
   * GET /api/metrics
   * 
   * Requiert le rôle ADMIN
   */
  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(RoleGuard)
  async getMetrics() {
    return {
      success: true,
      data: this.metricsService.getMetrics(),
    };
  }

  /**
   * Health check avec métriques basiques
   * GET /api/metrics/health
   * 
   * Public (pour monitoring externe)
   */
  @Get('health')
  @Public()
  async getHealthMetrics() {
    const metrics = this.metricsService.getMetrics();
    return {
      success: true,
      data: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        counters: metrics.counters,
      },
    };
  }
}
