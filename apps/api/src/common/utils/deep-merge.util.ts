/**
 * Deep Merge Utilities
 * 
 * Utilitaires pour fusionner des objets en profondeur
 */

/**
 * Fusionner deux objets en profondeur
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // Fusionner récursivement les objets
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Remplacer par la valeur source
        output[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return output;
}

/**
 * Fusionner plusieurs objets en profondeur
 */
export function deepMergeAll<T extends Record<string, any>>(
  ...objects: Partial<T>[]
): T {
  if (objects.length === 0) {
    return {} as T;
  }

  if (objects.length === 1) {
    return objects[0] as T;
  }

  return objects.reduce((result, current) => {
    return deepMerge(result, current);
  }, {} as T) as T;
}
