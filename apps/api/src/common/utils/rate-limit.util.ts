/**
 * Rate Limit Utilities
 * 
 * Utilitaires simples pour le rate limiting
 * Note: Pour la production, utiliser un système dédié (Redis, etc.)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class SimpleRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly windowMs: number = 60000, // 1 minute par défaut
    private readonly maxRequests: number = 100, // 100 requêtes par fenêtre
  ) {
    // Nettoyer les entrées expirées toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Vérifier si une clé a dépassé la limite
   */
  isLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      // Nouvelle fenêtre ou fenêtre expirée
      this.store.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return false;
    }

    if (entry.count >= this.maxRequests) {
      return true; // Limite dépassée
    }

    // Incrémenter le compteur
    entry.count++;
    return false;
  }

  /**
   * Obtenir le nombre de requêtes restantes
   */
  getRemaining(key: string): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Obtenir le temps avant reset (en ms)
   */
  getResetTime(key: string): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      return this.windowMs;
    }
    return Math.max(0, entry.resetAt - Date.now());
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Réinitialiser une clé
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Arrêter le nettoyage automatique
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Instance globale du rate limiter
 * Configuration : 100 requêtes par minute par IP
 */
export const globalRateLimiter = new SimpleRateLimiter(60000, 100);

/**
 * Rate limiter pour les endpoints de création (plus restrictif)
 * Configuration : 10 requêtes par minute
 */
export const creationRateLimiter = new SimpleRateLimiter(60000, 10);
