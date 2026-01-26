/**
 * Batch Optimizer Utility
 * 
 * Utilitaires pour optimiser les opérations batch
 * Version BaseVitale Optimisée
 */

export interface BatchOptions {
  batchSize?: number;
  concurrency?: number;
  delayBetweenBatches?: number;
}

/**
 * Traiter un tableau d'éléments par batch avec concurrency limitée
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {},
): Promise<R[]> {
  const {
    batchSize = 10,
    concurrency = 3,
    delayBetweenBatches = 0,
  } = options;

  const results: R[] = [];
  const batches: T[][] = [];

  // Diviser en batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Traiter chaque batch avec concurrency limitée
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Traiter les items du batch avec concurrency limitée
    const batchResults = await processWithConcurrency(
      batch,
      processor,
      concurrency,
    );
    
    results.push(...batchResults);

    // Délai entre batches si spécifié
    if (delayBetweenBatches > 0 && i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Traiter un tableau avec limite de concurrency
 */
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Optimiser les requêtes Prisma avec batching intelligent
 */
export function optimizePrismaQueries<T>(
  items: T[],
  batchSize: number = 100,
): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}
