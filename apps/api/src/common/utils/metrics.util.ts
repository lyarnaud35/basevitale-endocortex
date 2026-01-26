import { MetricsService } from '../services/metrics.service';

/**
 * Metrics Helper Utilities
 * 
 * Helpers pour simplifier l'enregistrement de métriques
 */

/**
 * Enregistrer une métrique de timing avec wrapper automatique
 */
export async function withMetrics<T>(
  metricsService: MetricsService,
  metricName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    metricsService.recordTiming(`${metricName}.success`, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    metricsService.recordTiming(`${metricName}.error`, duration);
    metricsService.incrementCounter(`${metricName}.errors`);
    throw error;
  } finally {
    metricsService.incrementCounter(`${metricName}.total`);
  }
}

/**
 * Enregistrer un compteur pour une opération
 */
export function recordOperation(
  metricsService: MetricsService,
  operationName: string,
  success: boolean = true,
): void {
  metricsService.incrementCounter(`operations.${operationName}.total`);
  
  if (success) {
    metricsService.incrementCounter(`operations.${operationName}.success`);
  } else {
    metricsService.incrementCounter(`operations.${operationName}.error`);
  }
}
