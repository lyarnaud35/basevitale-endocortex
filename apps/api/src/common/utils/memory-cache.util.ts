/**
 * Memory Cache Utility
 * 
 * Cache en mémoire simple pour optimiser les performances
 * Version BaseVitale Optimisée
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTtl: number;

  constructor(defaultTtl: number = 60000) {
    // TTL par défaut : 60 secondes
    this.defaultTtl = defaultTtl;
  }

  /**
   * Obtenir une valeur du cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Vérifier expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Définir une valeur dans le cache
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Supprimer une clé du cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Vérifier si une clé existe
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Nettoyer les entrées expirées
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Vider le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtenir la taille du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Obtenir toutes les clés
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
