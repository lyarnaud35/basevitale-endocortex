import { Module } from '@nestjs/common';
import { CacheModule } from './services/cache.module';
import { ConfigModule } from './services/config.module';
import { MetricsService } from './services/metrics.service';
import { HealthService } from './services/health.service';
import { CacheService } from './services/cache.service';
import { ConfigService } from './services/config.service';

/**
 * CommonModule
 * 
 * Module commun exportant les services partagés
 */
@Module({
  imports: [CacheModule, ConfigModule],
  providers: [MetricsService, HealthService, CacheService, ConfigService],
  exports: [CacheModule, ConfigModule, MetricsService, HealthService, CacheService, ConfigService],
})
export class CommonModule {}
