/**
 * Retry Decorator
 * 
 * Permet de réessayer automatiquement une méthode en cas d'échec
 * 
 * Note: Implémentation basique, pour production utiliser une bibliothèque dédiée
 */

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

/**
 * Decorator pour réessayer automatiquement
 * 
 * @param options - Options de retry
 * 
 * @example
 * @Retry({ maxAttempts: 3, delay: 1000 })
 * async fetchData() {
 *   return this.httpService.get('...');
 * }
 */
export function Retry(options: RetryOptions = {}) {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxAttempts) {
            const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
