import { CacheService } from '../services/cache.service';

/**
 * Cache Helper Utilities
 * 
 * Helpers pour simplifier l'utilisation du cache
 */

/**
 * Wrapper pour obtenir ou mettre en cache une valeur
 */
export async function getOrSetCache<T>(
  cacheService: CacheService,
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000, // 5 minutes par défaut
): Promise<T> {
  // Vérifier le cache
  const cached = cacheService.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Récupérer la valeur
  const value = await fetchFn();

  // Mettre en cache
  cacheService.set(key, value, ttlMs);

  return value;
}

/**
 * Invalider plusieurs clés de cache avec un préfixe
 */
export function invalidateCacheByPrefix(
  cacheService: CacheService,
  prefix: string,
): void {
  // Note: Cette implémentation nécessiterait d'exposer les clés du cache
  // Pour l'instant, on utilise simplement delete() avec la clé complète
  // En production avec Redis, on pourrait utiliser SCAN avec pattern
}

/**
 * Générer une clé de cache à partir de paramètres
 */
export function generateCacheKey(
  prefix: string,
  ...params: (string | number)[]
): string {
  const paramString = params
    .map((p) => String(p))
    .join(':')
    .replace(/[^a-zA-Z0-9:-]/g, '_');
  return `cache:${prefix}:${paramString}`;
}
