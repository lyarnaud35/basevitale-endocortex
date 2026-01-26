/**
 * Circuit Breaker Utility
 * 
 * Pattern Circuit Breaker pour prévenir les cascades de défaillances
 * Version BaseVitale Optimisée
 */

export interface CircuitBreakerOptions {
  failureThreshold: number; // Nombre d'échecs avant ouverture
  successThreshold: number; // Nombre de succès pour fermer
  timeout: number; // Timeout en ms
  resetTimeout: number; // Temps avant tentative de reset en ms
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 5000,
      resetTimeout: options.resetTimeout || 30000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Vérifier si on peut passer en HALF_OPEN
      if (this.canAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.options.timeout),
        ),
      ]);

      // Succès
      this.onSuccess();
      return result;
    } catch (error) {
      // Échec
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private canAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false;
    }

    const timeSinceLastFailure =
      Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.options.resetTimeout;
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}
