import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * CacheService
 * 
 * Service de cache simple pour BaseVitale
 * 
 * Note: En production, utiliser Redis via BullMQ
 * Pour l'instant, cache en mémoire (suffisant pour MVP)
 */
@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private readonly defaultTTL = 3600 * 1000; // 1 heure par défaut

  onModuleInit() {
    // Nettoyer le cache toutes les minutes
    setInterval(() => this.cleanExpired(), 60 * 1000);
    this.logger.log('CacheService initialized');
  }

  /**
   * Obtenir une valeur du cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Définir une valeur dans le cache
   */
  set(key: string, value: any, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const expiry = Date.now() + ttl;
    
    this.cache.set(key, { value, expiry });
  }

  /**
   * Supprimer une valeur du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Vider le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Vérifier si une clé existe dans le cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Obtenir la taille du cache
   */
  size(): number {
    return this.cache.size;
  }
}
