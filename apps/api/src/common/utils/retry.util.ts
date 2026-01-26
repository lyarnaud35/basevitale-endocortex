/**
 * Retry Utility
 * 
 * Utilitaires pour retry avec backoff exponentiel
 * Version BaseVitale Optimisée
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: Array<new (...args: any[]) => Error>;
}

/**
 * Retry une fonction avec backoff exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffMultiplier = 2,
    retryableErrors = [],
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Vérifier si l'erreur est retryable
      const isRetryable =
        retryableErrors.length === 0 ||
        retryableErrors.some((ErrorClass) => error instanceof ErrorClass);

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );

      // Attendre avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry conditionnel selon une fonction
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  maxAttempts: number = 3,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(lastError, attempt) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw lastError!;
}
