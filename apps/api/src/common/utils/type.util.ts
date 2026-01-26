/**
 * Type Utilities
 * 
 * Utilitaires pour vérifier et manipuler les types
 */

/**
 * Vérifier si une valeur est définie (non null et non undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Vérifier si une valeur est un objet (pas null, pas array)
 */
export function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Vérifier si une valeur est un tableau non vide
 */
export function isNonEmptyArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Vérifier si une valeur est une chaîne non vide
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Obtenir une valeur ou un défaut
 */
export function getOrDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue;
}

/**
 * Obtenir une valeur ou lancer une erreur si undefined
 */
export function getOrThrow<T>(
  value: T | null | undefined,
  errorMessage: string = 'Value is required',
): T {
  if (!isDefined(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * Type guard pour vérifier qu'un objet a une propriété
 */
export function hasProperty<T extends string>(
  obj: any,
  prop: T,
): obj is Record<T, any> {
  return obj !== null && obj !== undefined && prop in obj;
}
