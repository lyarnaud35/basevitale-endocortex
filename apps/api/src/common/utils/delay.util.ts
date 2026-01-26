/**
 * Delay Utilities
 * 
 * Utilitaires pour gérer les délais et timeouts
 */

/**
 * Créer un délai (promise qui se résout après X ms)
 */
export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Alias pour delayMs (pour compatibilité)
 */
export const delay = delayMs;

/**
 * Créer un timeout qui rejette après X ms
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = `Operation timed out after ${ms}ms`,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    }),
  ]);
}

/**
 * Retry avec délai exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T> {
  let lastError: Error | undefined;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        await delayMs(Math.min(currentDelay, maxDelay));
        currentDelay *= 2; // Backoff exponentiel
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
