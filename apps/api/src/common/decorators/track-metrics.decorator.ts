import { Inject, forwardRef } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { withMetrics } from '../utils/metrics.util';

/**
 * Decorator pour tracker automatiquement les métriques d'une méthode
 * 
 * @example
 * class MyService {
 *   constructor(private readonly metrics: MetricsService) {}
 * 
 *   @TrackMetrics('fetch.users')
 *   async fetchUsers() {
 *     return this.repository.findAll();
 *   }
 * }
 */
export function TrackMetrics(metricName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Chercher MetricsService dans les dépendances
      const metricsService = this.metricsService || 
                            this['metrics'] || 
                            this.constructor.prototype.metricsService;

      if (!metricsService) {
        // Si pas de MetricsService, exécuter sans métriques
        return originalMethod.apply(this, args);
      }

      const fullMetricName = `${metricName}.${propertyKey}`;
      return withMetrics(metricsService, fullMetricName, () =>
        originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
