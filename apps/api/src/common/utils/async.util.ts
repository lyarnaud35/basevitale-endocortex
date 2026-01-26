/**
 * Async Utilities
 * 
 * Utilitaires pour gérer les opérations asynchrones
 */

/**
 * Retry une fonction avec backoff exponentiel
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  backoff: boolean = true,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Timeout pour une promesse
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Débouncer une fonction asynchrone
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let pending: Promise<ReturnType<T>> | null = null;

  return async function executedFunction(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeout) {
      clearTimeout(timeout);
    }

    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeout = setTimeout(async () => {
        timeout = null;
        try {
          const result = await func(...args);
          pending = null;
          resolve(result);
        } catch (error) {
          pending = null;
          reject(error);
        }
      }, wait);
    });
  };
}

/**
 * Exécuter des promesses en parallèle avec limite de concurrence
 */
export async function pLimit<T>(
  limit: number,
  items: (() => Promise<T>)[],
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = item().then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Batch des opérations
 */
export async function batch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}
