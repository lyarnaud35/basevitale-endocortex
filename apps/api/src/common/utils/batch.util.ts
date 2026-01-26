/**
 * Batch Utilities
 * 
 * Utilitaires pour traiter des données par lots
 */

/**
 * Traiter un tableau par lots avec une fonction asynchrone
 */
export async function processBatch<T, R>(
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

/**
 * Traiter un tableau par lots en parallèle
 */
export async function processBatchParallel<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  maxConcurrency: number = 3,
): Promise<R[]> {
  const batches: T[][] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  const results: R[] = [];
  
  // Traiter les batches en parallèle avec limite de concurrence
  for (let i = 0; i < batches.length; i += maxConcurrency) {
    const concurrentBatches = batches.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(
      concurrentBatches.map((batch) => processor(batch)),
    );
    results.push(...batchResults.flat());
  }

  return results;
}

/**
 * Chunk un tableau en groupes de taille fixe
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
