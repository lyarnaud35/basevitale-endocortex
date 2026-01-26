/**
 * Health Check Utilities
 * 
 * Utilitaires pour les vérifications de santé du système
 * Version BaseVitale Optimisée
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  timestamp: string;
}

export interface SystemHealth {
  database: HealthCheckResult;
  redis: HealthCheckResult;
  neo4j?: HealthCheckResult;
  minio?: HealthCheckResult;
  nats?: HealthCheckResult;
  aiCortex?: HealthCheckResult;
}

/**
 * Mesurer le temps d'exécution d'une fonction
 */
export async function measureLatency<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; latency: number }> {
  const start = Date.now();
  const result = await fn();
  const latency = Date.now() - start;
  return { result, latency };
}

/**
 * Créer un résultat de health check
 */
export function createHealthResult(
  status: 'healthy' | 'degraded' | 'unhealthy',
  latency?: number,
  message?: string,
): HealthCheckResult {
  return {
    status,
    latency,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Déterminer le statut global du système
 */
export function determineOverallStatus(health: SystemHealth): 'healthy' | 'degraded' | 'unhealthy' {
  const checks = [
    health.database,
    health.redis,
    health.neo4j,
    health.minio,
    health.nats,
    health.aiCortex,
  ].filter(Boolean);

  const unhealthyCount = checks.filter((c) => c?.status === 'unhealthy').length;
  const degradedCount = checks.filter((c) => c?.status === 'degraded').length;

  if (unhealthyCount > 0) {
    return 'unhealthy';
  }
  if (degradedCount > 0) {
    return 'degraded';
  }
  return 'healthy';
}
