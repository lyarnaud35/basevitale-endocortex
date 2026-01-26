import { Injectable, Logger } from '@nestjs/common';

/**
 * Rate Limiter Service
 * 
 * Service de rate limiting intelligent avec sliding window
 * Version BaseVitale Optimisée
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly windows = new Map<
    string,
    { requests: number[]; maxRequests: number; windowMs: number }
  >();

  /**
   * Vérifier si une requête est autorisée
   */
  isAllowed(
    key: string,
    maxRequests: number = 100,
    windowMs: number = 60000, // 1 minute par défaut
  ): boolean {
    const now = Date.now();
    const window = this.windows.get(key) || {
      requests: [],
      maxRequests,
      windowMs,
    };

    // Nettoyer les requêtes hors de la fenêtre
    window.requests = window.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    // Vérifier la limite
    if (window.requests.length >= maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for key: ${key} (${window.requests.length}/${maxRequests})`,
      );
      return false;
    }

    // Ajouter la requête actuelle
    window.requests.push(now);
    this.windows.set(key, window);

    return true;
  }

  /**
   * Obtenir le nombre de requêtes restantes
   */
  getRemaining(
    key: string,
    maxRequests: number = 100,
    windowMs: number = 60000,
  ): number {
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window) {
      return maxRequests;
    }

    const validRequests = window.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    return Math.max(0, maxRequests - validRequests.length);
  }

  /**
   * Réinitialiser les compteurs pour une clé
   */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Nettoyer les fenêtres expirées
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, window] of this.windows.entries()) {
      window.requests = window.requests.filter(
        (timestamp) => now - timestamp < window.windowMs,
      );

      if (window.requests.length === 0) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.windows.delete(key));
  }
}
