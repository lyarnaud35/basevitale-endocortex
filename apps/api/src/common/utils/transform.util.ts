/**
 * Transform Utilities
 * 
 * Utilitaires pour transformer les données
 */

/**
 * Mapper un objet selon une fonction
 */
export function mapObject<T, R>(
  obj: Record<string, T>,
  mapper: (value: T, key: string) => R,
): Record<string, R> {
  const result: Record<string, R> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = mapper(obj[key], key);
    }
  }
  return result;
}

/**
 * Transformer un objet en omettant certaines clés
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

/**
 * Transformer un objet en ne gardant que certaines clés
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Transformer les valeurs null en undefined
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Transformer les valeurs undefined en null
 */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Nettoyer un objet en supprimant les valeurs null/undefined
 */
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
